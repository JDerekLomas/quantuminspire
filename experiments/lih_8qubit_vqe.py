#!/usr/bin/env python3
"""
LiH 8-Qubit VQE — CASCI(4,4) on QI Emulator
=============================================
Extends the successful 4-qubit LiH VQE (CASCI(2,2), max 1.5 mHa error)
to 8 qubits using CASCI(4,4) active space.

Key design choices:
  - CASCI(4,4): 4 electrons in 4 spatial orbitals → 8 spin-orbitals → 8 qubits (JW)
  - SU(2) hardware-efficient ansatz: Ry+Rz per qubit per layer + CNOT chain
  - Classical VQE optimization (scipy) to find optimal parameters
  - qxelarator verification of shot noise behavior
  - HF reference state determined by scanning candidate basis states

Lessons from H2O 8-qubit VQE:
  - Ry-only ansatz got stuck at HF energy (7.49 mHa barren plateau)
  - Full SU(2) (Ry+Rz) + multiple optimizer strategies needed for 8 qubits
  - L-BFGS-B with numerical gradients + COBYLA restarts is the winning combo
"""
import numpy as np
import json
import time
import sys
sys.stdout.reconfigure(line_buffering=True)  # flush on every newline

# =============================================================================
# Configuration
# =============================================================================

R_EQUILIBRIUM = 1.6  # Angstrom — LiH equilibrium bond distance
N_ACTIVE_ORBS = 4
N_ACTIVE_ELEC = 4
ANSATZ_DEPTH = 2      # 2 layers of [CNOT chain + Ry + Rz]
N_TRIALS = 30         # optimizer restarts
MAX_ITER_LBFGSB = 2000
MAX_ITER_COBYLA = 3000
SHOTS = 2048          # for qxelarator test (reduced for speed; 85 circuits)

print("=" * 72)
print("  LiH 8-Qubit VQE — CASCI(4,4)")
print("  Bond distance: R = {:.2f} A (equilibrium)".format(R_EQUILIBRIUM))
print("=" * 72)

# =============================================================================
# Step 1: Molecular Hamiltonian from PySCF + OpenFermion
# =============================================================================
print("\n--- Step 1: Computing Hamiltonian ---")

import pyscf
from pyscf import gto, scf, mcscf, fci as pyscf_fci, ao2mo as pyscf_ao2mo

from openfermion import InteractionOperator, get_fermion_operator
from openfermion.chem.molecular_data import spinorb_from_spatial
from openfermion.transforms import jordan_wigner
from openfermion.utils import count_qubits
from openfermion.linalg import get_sparse_operator

# Build molecule
mol = gto.M(
    atom=f"Li 0 0 0; H 0 0 {R_EQUILIBRIUM}",
    basis="sto-3g",
    verbose=0,
)

print(f"  Molecule: LiH (STO-3G)")
print(f"  Electrons: {mol.nelectron}, AO basis functions: {mol.nao}")

# Hartree-Fock
mf = scf.RHF(mol).run()
E_HF = float(mf.e_tot)
print(f"  E_HF = {E_HF:.6f} Ha")

# Full FCI for reference
fci_solver = pyscf_fci.FCI(mf)
E_FCI_full = float(fci_solver.kernel()[0])
print(f"  E_FCI (full space) = {E_FCI_full:.6f} Ha")
print(f"  Full correlation: {(E_HF - E_FCI_full)*1000:.1f} mHa")

# CASCI(4,4): freeze Li 1s, keep 4 orbitals (HOMO-1, HOMO, LUMO, LUMO+1)
mc = mcscf.CASCI(mf, ncas=N_ACTIVE_ORBS, nelecas=N_ACTIVE_ELEC)
mc.kernel()
E_CASCI = float(mc.e_tot)
print(f"\n  CASCI({N_ACTIVE_ELEC},{N_ACTIVE_ORBS}) energy: {E_CASCI:.6f} Ha")
corr_cas = (E_HF - E_CASCI) * 1000
corr_full = (E_HF - E_FCI_full) * 1000
print(f"  CASCI captures: {corr_cas:.1f} of {corr_full:.1f} mHa ({corr_cas/corr_full*100:.1f}%)")

# Active-space integrals
h1e_cas, ecore = mc.get_h1eff()
h2e_cas = pyscf_ao2mo.restore(1, mc.get_h2eff(), N_ACTIVE_ORBS)

print(f"  Core energy (frozen + nuclear): {ecore:.6f} Ha")

# PySCF chemist's notation → OpenFermion physicist's notation
h2e_of = np.asarray(h2e_cas.transpose(0, 2, 3, 1), order="C")
one_body, two_body = spinorb_from_spatial(h1e_cas, h2e_of)

active_h = InteractionOperator(ecore, one_body, 0.5 * two_body)
fermion_h = get_fermion_operator(active_h)
qubit_h = jordan_wigner(fermion_h)

n_qubits = count_qubits(qubit_h)
H_mat = get_sparse_operator(qubit_h).toarray()

# Verify: qubit Hamiltonian ground state = CASCI
eigenvalues = np.linalg.eigvalsh(H_mat)
E_qubit_gs = float(eigenvalues[0])
E_qubit_first_excited = float(eigenvalues[1])
gap = (E_qubit_first_excited - E_qubit_gs) * 1000

print(f"\n  Qubit Hamiltonian:")
print(f"    Qubits: {n_qubits}")
print(f"    Ground state: {E_qubit_gs:.6f} Ha")
print(f"    First excited: {E_qubit_first_excited:.6f} Ha")
print(f"    Gap: {gap:.1f} mHa")
print(f"    Match to CASCI: {abs(E_qubit_gs - E_CASCI)*1000:.3f} mHa")

# Extract Pauli terms
pauli_terms = {}
for term, coeff in qubit_h.terms.items():
    if abs(coeff) < 1e-10:
        continue
    pauli_str = ["I"] * n_qubits
    for qubit_idx, pauli_op in term:
        pauli_str[qubit_idx] = pauli_op
    key = "".join(pauli_str)
    pauli_terms[key] = pauli_terms.get(key, 0) + float(np.real(coeff))
pauli_terms = {k: v for k, v in pauli_terms.items() if abs(v) > 1e-10}

print(f"    Pauli terms: {len(pauli_terms)}")

# =============================================================================
# Step 2: Determine HF reference state
# =============================================================================
print("\n--- Step 2: Determining HF reference state ---")

# For CASCI(4,4) with 4 electrons, we need to find which 4-electron
# basis state has the lowest <psi|H|psi> energy.
# Generate all 8-choose-4 = 70 basis states with 4 electrons.
from itertools import combinations

best_hf_E = 1e10
hf_state_int = 0
n_candidates = 0

for occupied in combinations(range(n_qubits), N_ACTIVE_ELEC):
    state_int = sum(1 << q for q in occupied)
    v = np.zeros(2**n_qubits)
    v[state_int] = 1.0
    e = np.real(v @ H_mat @ v)
    n_candidates += 1
    if e < best_hf_E:
        best_hf_E = e
        hf_state_int = state_int

hf_bitstring = "".join(str((hf_state_int >> i) & 1) for i in range(n_qubits))
hf_occupied = [i for i in range(n_qubits) if (hf_state_int >> i) & 1]
print(f"  Scanned {n_candidates} candidate states")
print(f"  Best HF state: |{hf_bitstring}> (idx={hf_state_int})")
print(f"  Occupied qubits: {hf_occupied}")
print(f"  HF energy in qubit frame: {best_hf_E:.6f} Ha")
print(f"  HF - GS gap: {(best_hf_E - E_qubit_gs)*1000:.1f} mHa (correlation to recover)")

# =============================================================================
# Step 3: SU(2) Hardware-Efficient Ansatz
# =============================================================================
print("\n--- Step 3: SU(2) Ansatz ---")


def n_params_for_ansatz(n_q, depth):
    """Initial Ry layer + depth * (Ry + Rz per qubit)."""
    return n_q * (1 + 2 * depth)


n_params = n_params_for_ansatz(n_qubits, ANSATZ_DEPTH)
n_cnots = (n_qubits - 1) * ANSATZ_DEPTH
print(f"  Ansatz: SU(2) hardware-efficient")
print(f"  Structure: Ry layer + {ANSATZ_DEPTH} x [CNOT chain + Ry + Rz layer]")
print(f"  Parameters: {n_params}")
print(f"  CNOTs per circuit: {n_cnots}")
print(f"  HF reference: |{hf_bitstring}>")


def su2_ansatz_state(params, n_q=8, depth=2, hf_int=0):
    """SU(2) hardware-efficient ansatz (numpy-vectorized).

    |HF> -> [Ry layer] -> depth x [CNOT chain + Ry Rz layer]

    Uses tensor reshape for O(2^n) numpy ops instead of Python loops.
    """
    n = 2 ** n_q
    state = np.zeros(n, dtype=complex)
    state[hf_int] = 1.0

    def ry(theta):
        c, s = np.cos(theta / 2), np.sin(theta / 2)
        return np.array([[c, -s], [s, c]], dtype=complex)

    def rz(phi):
        return np.array([[np.exp(-1j * phi / 2), 0],
                         [0, np.exp(1j * phi / 2)]], dtype=complex)

    def apply_1q(st, gate, q, nq):
        """Apply single-qubit gate via tensor reshape — fully vectorized."""
        # Reshape state: (2^(nq-q-1), 2, 2^q) where axis 1 is the target qubit
        shape = (2**(nq - q - 1), 2, 2**q)
        t = st.reshape(shape)
        # Apply gate: new[..., b, ...] = sum_a gate[b,a] * old[..., a, ...]
        out = np.einsum('ba,iaj->ibj', gate, t)
        return out.reshape(-1)

    def apply_cnot(st, ctrl, tgt, nq):
        """Apply CNOT via index swapping — vectorized."""
        n = 2**nq
        indices = np.arange(n)
        # Flip target bit where control bit is set
        ctrl_mask = (indices >> ctrl) & 1
        flipped = indices ^ (1 << tgt)
        # Where control is 1, swap with flipped index
        out = st.copy()
        mask = ctrl_mask.astype(bool)
        out[indices[mask]] = st[flipped[mask]]
        return out

    idx = 0

    # Initial Ry layer
    for q in range(n_q):
        state = apply_1q(state, ry(params[idx]), q, n_q)
        idx += 1

    # Entangling blocks
    for _ in range(depth):
        for q in range(n_q - 1):
            state = apply_cnot(state, q, q + 1, n_q)
        for q in range(n_q):
            state = apply_1q(state, ry(params[idx]), q, n_q)
            idx += 1
            state = apply_1q(state, rz(params[idx]), q, n_q)
            idx += 1

    return state


# =============================================================================
# Step 4: Classical VQE Optimization
# =============================================================================
print("\n--- Step 4: Classical VQE Optimization ---")


def vqe_energy(params):
    psi = su2_ansatz_state(params, n_qubits, ANSATZ_DEPTH, hf_state_int)
    return float(np.real(psi.conj() @ H_mat @ psi))


def vqe_grad(params, eps=1e-5):
    """Numerical gradient for L-BFGS-B."""
    grad = np.zeros_like(params)
    e0 = vqe_energy(params)
    for i in range(len(params)):
        p_plus = params.copy()
        p_plus[i] += eps
        grad[i] = (vqe_energy(p_plus) - e0) / eps
    return grad


from scipy.optimize import minimize

np.random.seed(42)
best_E = 1e10
best_params = None
t0 = time.time()

# Track convergence history
trial_results = []

for trial in range(N_TRIALS):
    # Strategy: L-BFGS-B with small perturbations first, then COBYLA with larger
    if trial < N_TRIALS // 2:
        x0 = np.random.randn(n_params) * 0.1
        res = minimize(vqe_energy, x0, jac=vqe_grad, method="L-BFGS-B",
                       options={"maxiter": MAX_ITER_LBFGSB, "ftol": 1e-12})
    else:
        x0 = np.random.randn(n_params) * 0.5
        res = minimize(vqe_energy, x0, method="COBYLA",
                       options={"maxiter": MAX_ITER_COBYLA, "rhobeg": 0.3})

    trial_results.append({"trial": trial, "energy": float(res.fun),
                          "method": "L-BFGS-B" if trial < N_TRIALS // 2 else "COBYLA"})

    if res.fun < best_E:
        best_E = res.fun
        best_params = res.x.copy()
        err = abs(best_E - E_qubit_gs) * 1000
        print(f"  Trial {trial+1:3d}/{N_TRIALS}: E = {res.fun:.6f} Ha "
              f"(error: {err:.3f} mHa) [NEW BEST]")
    elif (trial + 1) % 10 == 0:
        err = abs(res.fun - E_qubit_gs) * 1000
        print(f"  Trial {trial+1:3d}/{N_TRIALS}: E = {res.fun:.6f} Ha "
              f"(error: {err:.3f} mHa)")

elapsed = time.time() - t0
vqe_error_mHa = abs(best_E - E_qubit_gs) * 1000

print(f"\n  Optimization done in {elapsed:.1f}s")
print(f"  VQE energy:      {best_E:.6f} Ha")
print(f"  Exact (CASCI):   {E_qubit_gs:.6f} Ha")
print(f"  VQE error:       {vqe_error_mHa:.3f} mHa")
print(f"  Chemical accuracy (<1.6 mHa)? {'YES' if vqe_error_mHa < 1.6 else 'NO'}")

# Check if stuck at HF (barren plateau)
hf_gap_mHa = (best_hf_E - E_qubit_gs) * 1000
# Barren plateau = stuck within 10% of HF energy (i.e., recovered < 10% of correlation)
correlation_recovered = (best_hf_E - best_E) / (best_hf_E - E_qubit_gs) if best_hf_E != E_qubit_gs else 1.0
at_hf = correlation_recovered < 0.10
if at_hf:
    print(f"\n  WARNING: VQE appears stuck at HF energy (barren plateau).")
    print(f"  HF-GS gap: {hf_gap_mHa:.1f} mHa — ansatz cannot capture correlation.")
    print(f"  Consider UCCSD or ADAPT-VQE ansatz for this system.")

# =============================================================================
# Step 5: Measurement Grouping and Circuit Generation
# =============================================================================
print("\n--- Step 5: Measurement Groups & Circuits ---")


def group_commuting_terms(terms):
    groups = {}
    for term, coeff in terms.items():
        basis = tuple((i, c) for i, c in enumerate(term) if c in ("X", "Y"))
        groups.setdefault(basis, []).append((term, coeff))
    return groups


groups = group_commuting_terms(pauli_terms)
print(f"  Measurement groups (circuits needed): {len(groups)}")

circuit_term_map = {}
for basis, terms in groups.items():
    name = "Z" if not basis else "_".join(f"q{i}{op}" for i, op in basis)
    circuit_term_map[name] = [t for t, _ in terms]


def gen_cqasm(params, n_q, depth, hf_int, measurement_rotations=None):
    """Generate cQASM 3.0 for the SU(2) ansatz."""
    cq = f"version 3.0\n\nqubit[{n_q}] q\nbit[{n_q}] b\n\n"

    # HF state preparation
    cq += "// HF state\n"
    for qb in range(n_q):
        if (hf_int >> qb) & 1:
            cq += f"X q[{qb}]\n"
    cq += "\n"

    idx = 0
    # Initial Ry layer
    cq += "// Initial Ry layer\n"
    for i in range(n_q):
        cq += f"Ry({params[idx]:.6f}) q[{i}]\n"
        idx += 1
    cq += "\n"

    # Entangling blocks
    for d in range(depth):
        cq += f"// Block {d+1}: CNOT chain + Ry Rz\n"
        for i in range(n_q - 1):
            cq += f"CNOT q[{i}], q[{i+1}]\n"
        for i in range(n_q):
            cq += f"Ry({params[idx]:.6f}) q[{i}]\n"
            idx += 1
            cq += f"Rz({params[idx]:.6f}) q[{i}]\n"
            idx += 1
        cq += "\n"

    # Measurement basis rotations
    if measurement_rotations:
        cq += "// Basis rotation\n"
        for qubit, basis in measurement_rotations:
            if basis == "X":
                cq += f"H q[{qubit}]\n"
            elif basis == "Y":
                cq += f"Sdag q[{qubit}]\nH q[{qubit}]\n"
        cq += "\n"

    cq += "b = measure q\n"
    return cq


# Generate all measurement circuits
cqasm_circuits = {}
for basis, terms in groups.items():
    rotations = list(basis) if basis else None
    name = "Z" if not basis else "_".join(f"q{i}{op}" for i, op in basis)
    cqasm_circuits[name] = gen_cqasm(best_params, n_qubits, ANSATZ_DEPTH,
                                      hf_state_int, rotations)

print(f"  Generated {len(cqasm_circuits)} cQASM 3.0 circuits")

# Count circuit depth (gates)
z_circuit = cqasm_circuits.get("Z", list(cqasm_circuits.values())[0])
gate_lines = [l for l in z_circuit.split("\n")
              if l.strip() and not l.startswith("//") and not l.startswith("version")
              and not l.startswith("qubit") and not l.startswith("bit")
              and not l.startswith("b =")]
print(f"  Gates per circuit (Z-basis): {len(gate_lines)}")

# =============================================================================
# Step 6: Ideal Pauli Expectations
# =============================================================================
print("\n--- Step 6: Ideal Pauli Expectations ---")

opt_state = su2_ansatz_state(best_params, n_qubits, ANSATZ_DEPTH, hf_state_int)

pauli_map = {
    "I": np.eye(2, dtype=complex),
    "X": np.array([[0, 1], [1, 0]], dtype=complex),
    "Y": np.array([[0, -1j], [1j, 0]], dtype=complex),
    "Z": np.array([[1, 0], [0, -1]], dtype=complex),
}

ideal_expectations = {}
energy_check = pauli_terms.get("I" * n_qubits, 0.0)

for term, coeff in pauli_terms.items():
    if term == "I" * n_qubits:
        continue
    op = pauli_map[term[0]]
    for i in range(1, n_qubits):
        op = np.kron(op, pauli_map[term[i]])
    exp_val = float(np.real(opt_state.conj() @ op @ opt_state))
    ideal_expectations[term] = exp_val
    energy_check += coeff * exp_val

print(f"  Energy from summed expectations: {energy_check:.6f} Ha")
print(f"  Direct state energy:             {best_E:.6f} Ha")
print(f"  Match: {abs(energy_check - best_E)*1000:.4f} mHa")

# Top contributing terms
contribs = [(t, pauli_terms[t], ideal_expectations[t],
             pauli_terms[t] * ideal_expectations[t])
            for t in ideal_expectations]
contribs.sort(key=lambda x: -abs(x[3]))
print(f"\n  Top 10 Pauli terms by |contribution|:")
for term, coeff, ev, contrib in contribs[:10]:
    print(f"    {term}: coeff={coeff:+.4f}, <P>={ev:+.4f}, contrib={contrib:+.4f}")

# =============================================================================
# Step 7: qxelarator Test (Z-basis only for speed)
# =============================================================================
print("\n--- Step 7: qxelarator Emulator Test ---")

try:
    import qxelarator

    # Run Z-basis circuit first as a quick sanity check
    z_circuit_name = "Z"
    if z_circuit_name in cqasm_circuits:
        z_cq = cqasm_circuits[z_circuit_name]
        print(f"  Running Z-basis circuit ({SHOTS} shots)...")
        t_emu = time.time()
        result = qxelarator.execute_string(z_cq, iterations=SHOTS)
        t_emu = time.time() - t_emu
        counts = result.results
        total = sum(counts.values())
        top5 = sorted(counts.items(), key=lambda x: -x[1])[:5]
        print(f"  Completed in {t_emu:.1f}s, {total} shots")
        for bs, c in top5:
            print(f"    {bs}: {c} ({c/total*100:.1f}%)")

    # Now run ALL circuits and reconstruct energy
    print(f"\n  Running all {len(cqasm_circuits)} measurement circuits...")
    all_counts = {}
    t_all = time.time()
    for name, circuit in cqasm_circuits.items():
        result = qxelarator.execute_string(circuit, iterations=SHOTS)
        all_counts[name] = result.results

    t_all = time.time() - t_all
    print(f"  All circuits completed in {t_all:.1f}s")

    # Reconstruct energy from shots
    # OpenFermion convention: qubit 0 = MSB of state vector index.
    # qxelarator MSB-first: bitstring[0] = highest-index physical qubit.
    # These align: Pauli label position i → bitstring[i] extracts
    # OpenFermion qubit i (= physical qubit n-1-i).
    def parity(bitstring, qubit_indices):
        p = 0
        for q in qubit_indices:
            p ^= int(bitstring[q])
        return p

    def expectation_from_counts(counts, pauli_label):
        active_qubits = [i for i, p in enumerate(pauli_label) if p != "I"]
        if not active_qubits:
            return 1.0
        total = sum(counts.values())
        exp_val = 0.0
        for bs, count in counts.items():
            p = parity(bs, active_qubits)
            exp_val += count * ((-1) ** p)
        return exp_val / total

    emulator_energy = 0.0
    var_energy = 0.0  # analytical shot noise variance
    for circuit_name, terms in circuit_term_map.items():
        counts = all_counts[circuit_name]
        n_shots = sum(counts.values())
        for term_label in terms:
            coeff = pauli_terms[term_label]
            if term_label == "I" * n_qubits:
                exp_val = 1.0
                term_var = 0.0
            else:
                exp_val = expectation_from_counts(counts, term_label)
                # Var(c*<P>) = c^2 * (1 - <P>^2) / N
                term_var = coeff**2 * (1 - exp_val**2) / n_shots
            emulator_energy += coeff * exp_val
            var_energy += term_var

    sigma_energy = var_energy**0.5
    emu_error = abs(emulator_energy - E_qubit_gs) * 1000

    print(f"\n  Emulator energy:   {emulator_energy:.6f} +/- {sigma_energy:.6f} Ha")
    print(f"  Ideal VQE energy:  {best_E:.6f} Ha")
    print(f"  Exact (CASCI):     {E_qubit_gs:.6f} Ha")
    print(f"  Emulator error:    {emu_error:.1f} mHa")
    print(f"  Shot noise (1σ):   {sigma_energy * 1000:.1f} mHa")
    print(f"  Error / sigma:     {emu_error / (sigma_energy * 1000):.2f}σ")

    # Post-selection: keep only bitstrings with correct electron count
    print(f"\n  --- Post-selection (N={N_ACTIVE_ELEC} electrons) ---")
    ps_energy = 0.0
    var_ps = 0.0
    ps_kept_frac = []
    for circuit_name, terms in circuit_term_map.items():
        counts = all_counts[circuit_name]
        ps_counts = {bs: c for bs, c in counts.items()
                     if bs.count("1") == N_ACTIVE_ELEC}
        kept = sum(ps_counts.values())
        total = sum(counts.values())
        ps_kept_frac.append(kept / total if total > 0 else 0)
        for term_label in terms:
            coeff = pauli_terms[term_label]
            if term_label == "I" * n_qubits:
                exp_val = 1.0
                term_var = 0.0
            elif ps_counts and kept > 0:
                exp_val = expectation_from_counts(ps_counts, term_label)
                term_var = coeff**2 * (1 - exp_val**2) / kept
            else:
                exp_val = 0.0
                term_var = coeff**2  # maximal uncertainty
            ps_energy += coeff * exp_val
            var_ps += term_var

    sigma_ps = var_ps**0.5
    ps_error = abs(ps_energy - E_qubit_gs) * 1000
    avg_kept = np.mean(ps_kept_frac) * 100
    print(f"  Post-selected energy: {ps_energy:.6f} +/- {sigma_ps:.6f} Ha")
    print(f"  Post-selected error:  {ps_error:.1f} mHa")
    print(f"  Shot noise (1σ):      {sigma_ps * 1000:.1f} mHa")
    print(f"  Average kept fraction: {avg_kept:.1f}%")

    # Bootstrap resampling — model-free cross-check
    print(f"\n  --- Bootstrap resampling (M=1000) ---")
    M_BOOT = 1000
    rng = np.random.default_rng(42)
    boot_energies = []
    boot_ps_energies = []
    for _ in range(M_BOOT):
        e_boot = 0.0
        e_ps_boot = 0.0
        for circuit_name, terms in circuit_term_map.items():
            counts = all_counts[circuit_name]
            bitstrings = list(counts.keys())
            freqs = np.array([counts[bs] for bs in bitstrings], dtype=float)
            n = int(freqs.sum())
            probs = freqs / freqs.sum()
            resampled = rng.multinomial(n, probs)
            rc = {bs: int(c) for bs, c in zip(bitstrings, resampled) if c > 0}
            rc_ps = {bs: c for bs, c in rc.items()
                     if bs.count("1") == N_ACTIVE_ELEC}
            n_ps = sum(rc_ps.values()) if rc_ps else 0
            for term_label in terms:
                coeff = pauli_terms[term_label]
                if term_label == "I" * n_qubits:
                    e_boot += coeff
                    e_ps_boot += coeff
                else:
                    e_boot += coeff * expectation_from_counts(rc, term_label)
                    if rc_ps and n_ps > 0:
                        e_ps_boot += coeff * expectation_from_counts(rc_ps, term_label)
        boot_energies.append(e_boot)
        boot_ps_energies.append(e_ps_boot)

    boot_sigma = np.std(boot_energies)
    boot_ps_sigma = np.std(boot_ps_energies)
    print(f"  Analytical σ:  {sigma_energy*1000:.2f} mHa  |  Bootstrap σ: {boot_sigma*1000:.2f} mHa  |  Ratio: {boot_sigma/sigma_energy:.3f}")
    print(f"  PS Analytical: {sigma_ps*1000:.2f} mHa  |  PS Bootstrap: {boot_ps_sigma*1000:.2f} mHa  |  Ratio: {boot_ps_sigma/sigma_ps:.3f}")

    emulator_results = {
        "energy": float(emulator_energy),
        "error_mHa": float(emu_error),
        "sigma_analytical_mHa": float(sigma_energy * 1000),
        "sigma_bootstrap_mHa": float(boot_sigma * 1000),
        "shots": SHOTS,
        "ps_energy": float(ps_energy),
        "ps_error_mHa": float(ps_error),
        "ps_sigma_analytical_mHa": float(sigma_ps * 1000),
        "ps_sigma_bootstrap_mHa": float(boot_ps_sigma * 1000),
        "ps_kept_pct": float(avg_kept),
        "runtime_s": float(t_all),
    }

except ImportError:
    print("  qxelarator not available — skipping emulator test")
    emulator_results = None
except Exception as e:
    print(f"  qxelarator error: {e}")
    emulator_results = None

# =============================================================================
# Step 8: Save Results
# =============================================================================
print("\n--- Step 8: Saving Results ---")

output = {
    "experiment": "LiH 8-qubit VQE — CASCI(4,4) on QI emulator",
    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
    "molecule": "LiH",
    "bond_distance_angstrom": R_EQUILIBRIUM,
    "basis_set": "STO-3G",
    "active_space": f"CASCI({N_ACTIVE_ELEC},{N_ACTIVE_ORBS})",
    "qubit_mapping": "Jordan-Wigner",
    "n_qubits": n_qubits,
    "ansatz": {
        "type": "SU(2) hardware-efficient",
        "structure": f"Ry layer + {ANSATZ_DEPTH} x [CNOT chain + Ry + Rz layer]",
        "depth": ANSATZ_DEPTH,
        "n_params": n_params,
        "n_cnots": n_cnots,
    },
    "hf_state": {
        "bitstring": hf_bitstring,
        "occupied_qubits": hf_occupied,
        "integer": hf_state_int,
        "energy": float(best_hf_E),
    },
    "energies": {
        "E_HF": E_HF,
        "E_CASCI": E_CASCI,
        "E_FCI_full": E_FCI_full,
        "E_qubit_gs": E_qubit_gs,
        "E_qubit_first_excited": E_qubit_first_excited,
        "gap_mHa": gap,
        "E_VQE": float(best_E),
        "VQE_error_mHa": float(vqe_error_mHa),
        "chemical_accuracy": bool(vqe_error_mHa < 1.6),
        "barren_plateau": bool(at_hf),
        "CASCI_correlation_pct": float(corr_cas / corr_full * 100),
    },
    "optimization": {
        "n_trials": N_TRIALS,
        "strategies": ["L-BFGS-B (small perturbation)", "COBYLA (larger perturbation)"],
        "elapsed_s": float(elapsed),
        "optimal_params": best_params.tolist(),
    },
    "hamiltonian": {
        "n_pauli_terms": len(pauli_terms),
        "n_measurement_circuits": len(cqasm_circuits),
        "pauli_terms": {k: float(v) for k, v in pauli_terms.items()},
    },
    "emulator": emulator_results,
    "circuits_cqasm": cqasm_circuits,
}

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        import numpy as np
        if isinstance(obj, (np.bool_, np.integer)):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)

outpath = "/Users/dereklomas/haiqu/experiments/results/lih-8qubit-vqe-emulator.json"
with open(outpath, "w") as f:
    json.dump(output, f, indent=2, cls=NumpyEncoder)

print(f"  Saved to {outpath}")

# =============================================================================
# Summary
# =============================================================================
print("\n" + "=" * 72)
print("  LiH 8-QUBIT VQE SUMMARY")
print("=" * 72)
print(f"  Molecule:          LiH (R = {R_EQUILIBRIUM} A, STO-3G)")
print(f"  Active space:      CASCI({N_ACTIVE_ELEC},{N_ACTIVE_ORBS}) = {n_qubits} qubits")
print(f"  CASCI correlation: {corr_cas:.1f} of {corr_full:.1f} mHa ({corr_cas/corr_full*100:.1f}%)")
print(f"  Pauli terms:       {len(pauli_terms)}")
print(f"  Circuits:          {len(cqasm_circuits)}")
print(f"  CNOTs/circuit:     {n_cnots}")
print(f"  Parameters:        {n_params}")
print(f"")
print(f"  Energies:")
print(f"    HF:           {E_HF:.6f} Ha")
print(f"    CASCI(4,4):   {E_CASCI:.6f} Ha")
print(f"    FCI (full):   {E_FCI_full:.6f} Ha")
print(f"    VQE:          {best_E:.6f} Ha")
print(f"    VQE error:    {vqe_error_mHa:.3f} mHa")
print(f"    Chem. acc.?   {'YES' if vqe_error_mHa < 1.6 else 'NO'}")
if at_hf:
    print(f"    STATUS:       BARREN PLATEAU (stuck at HF)")
elif vqe_error_mHa < 1.6:
    print(f"    STATUS:       CONVERGED (chemical accuracy)")
else:
    print(f"    STATUS:       PARTIAL ({vqe_error_mHa:.1f} mHa > 1.6 mHa)")
if emulator_results:
    print(f"")
    print(f"  Emulator (qxelarator, {SHOTS} shots):")
    print(f"    Energy:       {emulator_results['energy']:.6f} Ha")
    print(f"    Error:        {emulator_results['error_mHa']:.1f} mHa")
    print(f"    Post-sel:     {emulator_results['ps_error_mHa']:.1f} mHa "
          f"(kept {emulator_results['ps_kept_pct']:.0f}%)")
