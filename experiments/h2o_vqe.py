#!/usr/bin/env python3
"""
Hybrid VQE for H2O (Water) -- 8 qubits
=======================================
Uses PySCF for molecular integrals, OpenFermion for qubit mapping.
CASCI(4,4) active space: 4 electrons in 4 orbitals -> 8 qubits via Jordan-Wigner.

H2O at standard geometry: O-H = 0.96 A, angle = 104.5 degrees.
STO-3G basis.
"""
import numpy as np
import json
import sys
import time

print("=" * 70)
print("  H2O VQE: Computing Hamiltonian from First Principles")
print("=" * 70)

# === Step 1: Compute H2O Hamiltonian ===
import pyscf
from pyscf import gto, scf, mcscf, fci, ao2mo as pyscf_ao2mo

# H2O geometry: O at origin, H atoms at 0.96 A, 104.5 degree angle
R = 0.96  # O-H distance in Angstrom
angle = 104.5  # H-O-H angle in degrees
angle_rad = np.radians(angle)

# Compute H positions
hx = R * np.sin(angle_rad / 2)
hy = R * np.cos(angle_rad / 2)

mol = gto.M(
    atom=f"O 0 0 0; H {hx:.6f} {hy:.6f} 0; H {-hx:.6f} {hy:.6f} 0",
    basis="sto-3g",
    verbose=0,
)

print(f"\n  Molecule: H2O")
print(f"  O-H distance: {R} A")
print(f"  H-O-H angle: {angle} deg")
print(f"  Basis: sto-3g")
print(f"  Electrons: {mol.nelectron}")
print(f"  Orbitals: {mol.nao}")

# Hartree-Fock
mf = scf.RHF(mol).run()
print(f"\n  HF energy:  {mf.e_tot:.6f} Ha")

# Full FCI for reference (may be slow for larger basis sets)
fci_solver = fci.FCI(mf)
e_fci, ci_fci = fci_solver.kernel()
print(f"  FCI energy: {e_fci:.6f} Ha")
print(f"  Correlation energy: {(mf.e_tot - e_fci)*1000:.1f} mHa")

# === Active space: CASCI(4,4) ===
# H2O in STO-3G: 7 MOs, 10 electrons
# Core: O 1s (1 orbital, 2 electrons) -> always occupied
# Active: 4 orbitals, 4 electrons -> 8 spin-orbitals -> 8 qubits
# This captures bonding, antibonding, and lone pair physics

n_active_orbs = 4
n_active_elec = 4

print(f"\n  Active space: CASCI({n_active_elec},{n_active_orbs})")
print(f"  Spin-orbitals: {2 * n_active_orbs}")
print(f"  Qubits (JW): {2 * n_active_orbs}")

mc = mcscf.CASCI(mf, ncas=n_active_orbs, nelecas=n_active_elec)
mc.kernel()
print(f"  CASCI({n_active_elec},{n_active_orbs}) energy: {mc.e_tot:.6f} Ha")
print(f"  CASCI captures: {(mf.e_tot - mc.e_tot)/(mf.e_tot - e_fci)*100:.1f}% of correlation energy")

# Get active space integrals
h1e_cas, ecore = mc.get_h1eff()
h2e_cas = pyscf_ao2mo.restore(1, mc.get_h2eff(), n_active_orbs)  # restore to 4D

print(f"  Core energy (frozen electrons + nuclei): {ecore:.6f} Ha")

# === Step 2: Build qubit Hamiltonian via OpenFermion ===
from openfermion import InteractionOperator, get_fermion_operator
from openfermion.transforms import jordan_wigner
from openfermion.utils import count_qubits
from openfermion.linalg import get_sparse_operator

n_spin_orbs = 2 * n_active_orbs

# Use OpenFermion's own spinorb_from_spatial for correct convention.
# PySCF returns chemist's notation: h2e[i,j,k,l] = (ij|kl).
# OpenFermion expects transposed form: h2e_of[p,q,r,s] = h2e_chem[p,s,q,r] = (ps|qr).
from openfermion.chem.molecular_data import spinorb_from_spatial
h2e_of = np.asarray(h2e_cas.transpose(0, 2, 3, 1), order='C')
one_body, two_body = spinorb_from_spatial(h1e_cas, h2e_of)
active_h = InteractionOperator(ecore, one_body, 0.5 * two_body)
active_qubit_h = jordan_wigner(get_fermion_operator(active_h))

n_q = count_qubits(active_qubit_h)
n_terms = len(active_qubit_h.terms)

print(f"\n  Qubit Hamiltonian:")
print(f"    Qubits: {n_q}")
print(f"    Pauli terms: {n_terms}")

# Verify by diagonalizing
H_mat = get_sparse_operator(active_qubit_h).toarray()
eigenvalues = np.linalg.eigvalsh(H_mat)
E_fci_active = eigenvalues[0]
print(f"    Active space FCI (exact diag): {E_fci_active:.6f} Ha")
print(f"    PySCF CASCI energy:            {mc.e_tot:.6f} Ha")
print(f"    Match: {abs(E_fci_active - mc.e_tot)*1000:.3f} mHa")

# === Step 3: Extract and organize Pauli terms ===
pauli_terms = {}
for term, coeff in active_qubit_h.terms.items():
    if abs(coeff) < 1e-10:
        continue
    coeff = float(np.real(coeff))
    pauli_str = ["I"] * n_q
    for qubit_idx, pauli_op in term:
        pauli_str[qubit_idx] = pauli_op
    key = "".join(pauli_str)
    pauli_terms[key] = pauli_terms.get(key, 0) + coeff

pauli_terms = {k: v for k, v in pauli_terms.items() if abs(v) > 1e-10}

print(f"\n  Non-trivial Pauli terms: {len(pauli_terms)}")
print(f"  Top 10 by |coefficient|:")
for i, (term, coeff) in enumerate(sorted(pauli_terms.items(), key=lambda x: -abs(x[1]))):
    if i >= 10:
        break
    print(f"    {term}: {coeff:+.6f}")
if len(pauli_terms) > 10:
    print(f"    ... and {len(pauli_terms) - 10} more")

# Group commuting terms for measurement
def measurement_basis(term):
    return tuple((i, c) for i, c in enumerate(term) if c in ('X', 'Y'))

groups = {}
for term, coeff in pauli_terms.items():
    basis = measurement_basis(term)
    if basis not in groups:
        groups[basis] = []
    groups[basis].append((term, coeff))

print(f"\n  Measurement groups (circuits needed): {len(groups)}")

# === Step 4: Hardware-efficient ansatz for 8 qubits ===
print("\n" + "-" * 70)
print("  VQE ANSATZ (hardware-efficient, 8 qubits)")
print("-" * 70)

# HF state for H2O CASCI(4,4): 4 electrons in 4 active orbitals
# Must determine which qubit state corresponds to HF by checking energies
# PySCF CASCI orders orbitals as [occ, occ, vir, vir] but after spinorb_from_spatial
# the occupied orbitals map to higher-index spin-orbitals for this molecule
# Verify by finding computational basis state closest to HF energy
hf_candidates = [0b00001111, 0b11110000, 0b00111100, 0b11001100,
                  0b01010101, 0b10101010, 0b00110011, 0b11000011]
best_hf_E = 1e10
hf_state_int = 0b11110000  # default
for cand in hf_candidates:
    if bin(cand).count('1') == n_active_elec:
        v = np.zeros(2**n_q); v[cand] = 1.0
        e = np.real(v @ H_mat @ v)
        if e < best_hf_E:
            best_hf_E = e
            hf_state_int = cand
print(f"  Best HF basis state: |{''.join(str((hf_state_int>>i)&1) for i in range(n_q))}> "
      f"(idx={hf_state_int}, E={best_hf_E:.6f} Ha)")

# Ansatz: 2 layers of Ry + CNOT chain
# 8 qubits x 2 layers = 16 parameters
n_layers = 2
n_params = n_q * n_layers

print(f"  Ansatz: {n_layers}-layer Ry + CNOT chain")
print(f"  Parameters: {n_params}")
print(f"  HF reference: |{''.join(str((hf_state_int>>i)&1) for i in range(n_q))}> ({n_active_elec} electrons)")

def ansatz_state(params, n_qubits=8):
    """Hardware-efficient ansatz for 8 qubits."""
    n = 2**n_qubits
    state = np.zeros(n, dtype=complex)
    state[hf_state_int] = 1.0

    def ry_gate(theta):
        c, s = np.cos(theta/2), np.sin(theta/2)
        return np.array([[c, -s], [s, c]], dtype=complex)

    def apply_single(state, gate, qubit):
        new_state = np.zeros(len(state), dtype=complex)
        for i in range(len(state)):
            bit = (i >> qubit) & 1
            i0 = i & ~(1 << qubit)
            i1 = i0 | (1 << qubit)
            if bit == 0:
                new_state[i] = gate[0,0] * state[i0] + gate[0,1] * state[i1]
            else:
                new_state[i] = gate[1,0] * state[i0] + gate[1,1] * state[i1]
        return new_state

    def apply_cnot(state, control, target):
        new_state = state.copy()
        for i in range(len(state)):
            if (i >> control) & 1:
                j = i ^ (1 << target)
                new_state[i], new_state[j] = state[j], state[i]
        return new_state

    for layer in range(n_layers):
        # Ry rotations
        for q in range(n_qubits):
            state = apply_single(state, ry_gate(params[layer * n_qubits + q]), q)
        # CNOT chain
        for q in range(n_qubits - 1):
            state = apply_cnot(state, q, q + 1)

    return state

def vqe_energy(params):
    state = ansatz_state(params)
    return np.real(state.conj() @ H_mat @ state)

# === Step 5: Classical VQE optimization ===
print("\n  Optimizing VQE parameters...")
from scipy.optimize import minimize

np.random.seed(42)
best_E = E_fci_active + 100
best_params = None

# Numerical gradient for L-BFGS-B
def vqe_grad(params, eps=1e-5):
    grad = np.zeros_like(params)
    e0 = vqe_energy(params)
    for i in range(len(params)):
        p_plus = params.copy()
        p_plus[i] += eps
        grad[i] = (vqe_energy(p_plus) - e0) / eps
    return grad

# Strategy: L-BFGS-B from small perturbations near HF + COBYLA restarts
n_trials = 30
t0 = time.time()

for trial in range(n_trials):
    if trial < 15:
        x0 = np.random.randn(n_params) * 0.1
    else:
        x0 = np.random.randn(n_params) * 0.5

    if trial < 15:
        res = minimize(vqe_energy, x0, jac=vqe_grad, method='L-BFGS-B',
                       options={'maxiter': 3000, 'ftol': 1e-12})
    else:
        res = minimize(vqe_energy, x0, method='COBYLA',
                       options={'maxiter': 5000, 'rhobeg': 0.3})

    if res.fun < best_E:
        best_E = res.fun
        best_params = res.x
        print(f"    Trial {trial+1}/{n_trials}: E = {res.fun:.6f} Ha "
              f"(error: {abs(res.fun - E_fci_active)*1000:.2f} mHa) [NEW BEST]")
    elif trial % 10 == 0:
        print(f"    Trial {trial+1}/{n_trials}: E = {res.fun:.6f} Ha")

elapsed = time.time() - t0
print(f"\n  Optimization done in {elapsed:.1f}s")
print(f"  VQE optimized energy: {best_E:.6f} Ha")
print(f"  Exact FCI energy:    {E_fci_active:.6f} Ha")
print(f"  VQE error:           {abs(best_E - E_fci_active)*1000:.2f} mHa")
print(f"  Chemical accuracy?   {'YES' if abs(best_E - E_fci_active)*1000 < 1.6 else 'NO'}")

# === Step 6: Generate OpenQASM 2.0 circuits ===
print("\n" + "-" * 70)
print("  OPENQASM 2.0 CIRCUITS")
print("-" * 70)

def gen_h2o_qasm(params, n_qubits, measurement_rotations=None):
    """Generate OpenQASM 2.0 for H2O VQE ansatz."""
    qasm = 'OPENQASM 2.0;\ninclude "qelib1.inc";\n'
    qasm += f'qreg q[{n_qubits}];\ncreg c[{n_qubits}];\n\n'

    # Prepare HF state: X gates on occupied qubits
    qasm += '// Hartree-Fock state\n'
    for q in range(n_qubits):
        if (hf_state_int >> q) & 1:
            qasm += f'x q[{q}];\n'
    qasm += '\n'

    for layer in range(n_layers):
        qasm += f'// Layer {layer+1}: Ry rotations\n'
        for q in range(n_qubits):
            qasm += f'ry({params[layer * n_qubits + q]:.6f}) q[{q}];\n'
        qasm += '\n'
        qasm += f'// Layer {layer+1}: CNOT chain\n'
        for q in range(n_qubits - 1):
            qasm += f'cx q[{q}], q[{q+1}];\n'
        qasm += '\n'

    if measurement_rotations:
        qasm += '// Measurement basis rotation\n'
        for qubit, basis in measurement_rotations:
            if basis == 'X':
                qasm += f'h q[{qubit}];\n'
            elif basis == 'Y':
                qasm += f'sdg q[{qubit}];\nh q[{qubit}];\n'
        qasm += '\n'

    qasm += '// Measure all qubits\n'
    for q in range(n_qubits):
        qasm += f'measure q[{q}] -> c[{q}];\n'
    return qasm

circuits = {}
for i, (basis, terms) in enumerate(groups.items()):
    rotations = [(idx, op) for idx, op in basis]
    qasm = gen_h2o_qasm(best_params, n_q, rotations if rotations else None)
    group_name = "Z" if not basis else "_".join(f"q{idx}{op}" for idx, op in basis)
    circuits[group_name] = qasm

print(f"  Generated {len(circuits)} measurement circuits")

# === Step 7: Compute ideal expectations ===
print("\n" + "-" * 70)
print("  IDEAL PAULI EXPECTATIONS")
print("-" * 70)

opt_state = ansatz_state(best_params)

pauli_map = {
    "I": np.eye(2, dtype=complex),
    "X": np.array([[0,1],[1,0]], dtype=complex),
    "Y": np.array([[0,-1j],[1j,0]], dtype=complex),
    "Z": np.array([[1,0],[0,-1]], dtype=complex),
}

ideal_expectations = {}
energy_check = pauli_terms.get("I" * n_q, 0.0)

for term, coeff in sorted(pauli_terms.items(), key=lambda x: -abs(x[1])):
    if term == "I" * n_q:
        continue
    op = pauli_map[term[0]]
    for i in range(1, n_q):
        op = np.kron(op, pauli_map[term[i]])
    exp_val = np.real(opt_state.conj() @ op @ opt_state)
    ideal_expectations[term] = exp_val
    energy_check += coeff * exp_val

print(f"  Energy from summed expectations: {energy_check:.6f} Ha")
print(f"  Direct state energy:             {best_E:.6f} Ha")
print(f"  Match: {abs(energy_check - best_E)*1000:.4f} mHa")

# Show top terms
print(f"\n  Top 15 Pauli terms by |contribution|:")
contribs = [(t, pauli_terms[t], ideal_expectations[t], pauli_terms[t]*ideal_expectations[t])
            for t in ideal_expectations]
contribs.sort(key=lambda x: -abs(x[3]))
for term, coeff, ev, contrib in contribs[:15]:
    print(f"    {term}: coeff={coeff:+.4f}, <P>={ev:+.4f}, contrib={contrib:+.4f}")

# === Step 8: Generate cQASM 3.0 circuits for QI emulator ===
print("\n" + "-" * 70)
print("  cQASM 3.0 CIRCUITS FOR QI EMULATOR")
print("-" * 70)

def gen_h2o_cqasm(params, n_qubits, measurement_rotations=None):
    """Generate cQASM 3.0 for H2O VQE ansatz."""
    cqasm = 'version 3.0\n\n'
    cqasm += f'qubit[{n_qubits}] q\n'
    cqasm += f'bit[{n_qubits}] b\n\n'

    # HF state
    for qb in range(n_qubits):
        if (hf_state_int >> qb) & 1:
            cqasm += f'X q[{qb}]\n'
    cqasm += '\n'

    for layer in range(n_layers):
        for qb in range(n_qubits):
            cqasm += f'Ry({params[layer * n_qubits + qb]:.6f}) q[{qb}]\n'
        cqasm += '\n'
        for qb in range(n_qubits - 1):
            cqasm += f'CNOT q[{qb}], q[{qb+1}]\n'
        cqasm += '\n'

    if measurement_rotations:
        for qubit, basis in measurement_rotations:
            if basis == 'X':
                cqasm += f'H q[{qubit}]\n'
            elif basis == 'Y':
                # Sdg + H = Ry(-pi/2) for Y-basis measurement
                # In cQASM 3.0: Sdag then H
                cqasm += f'Sdag q[{qubit}]\n'
                cqasm += f'H q[{qubit}]\n'
        cqasm += '\n'

    cqasm += 'b = measure q\n'
    return cqasm

cqasm_circuits = {}
for i, (basis, terms) in enumerate(groups.items()):
    rotations = [(idx, op) for idx, op in basis]
    cqasm = gen_h2o_cqasm(best_params, n_q, rotations if rotations else None)
    group_name = "Z" if not basis else "_".join(f"q{idx}{op}" for idx, op in basis)
    cqasm_circuits[group_name] = cqasm

print(f"  Generated {len(cqasm_circuits)} cQASM 3.0 circuits")

# === Step 9: Save everything ===
output = {
    "molecule": "H2O",
    "geometry": {
        "O-H_distance_angstrom": R,
        "H-O-H_angle_degrees": angle,
        "atoms": [
            {"element": "O", "coords": [0, 0, 0]},
            {"element": "H", "coords": [float(hx), float(hy), 0]},
            {"element": "H", "coords": [float(-hx), float(hy), 0]},
        ],
    },
    "basis": "sto-3g",
    "active_space": f"CASCI({n_active_elec},{n_active_orbs})",
    "n_qubits": n_q,
    "n_params": n_params,
    "n_layers": n_layers,
    "n_pauli_terms": len(pauli_terms),
    "n_measurement_circuits": len(circuits),
    "optimal_params": best_params.tolist(),
    "energies": {
        "E_HF": float(mf.e_tot),
        "E_FCI": float(e_fci),
        "E_CASCI": float(mc.e_tot),
        "E_VQE_active_space": float(best_E),
        "E_FCI_active_space": float(E_fci_active),
        "VQE_error_mHa": float(abs(best_E - E_fci_active) * 1000),
        "CASCI_correlation_pct": float((mf.e_tot - mc.e_tot) / (mf.e_tot - e_fci) * 100),
    },
    "pauli_terms": pauli_terms,
    "ideal_expectations": ideal_expectations,
    "measurement_groups": {
        name: [{"term": t, "coeff": c} for t, c in terms]
        for (basis, terms), name in zip(
            groups.items(),
            ["Z" if not b else "_".join(f"q{idx}{op}" for idx, op in b)
             for b in groups.keys()]
        )
    },
    "circuits_openqasm": circuits,
    "circuits_cqasm": cqasm_circuits,
}

outpath = "/Users/dereklomas/haiqu/experiments/h2o_vqe_results.json"
with open(outpath, "w") as f:
    json.dump(output, f, indent=2)

print(f"\n  Saved to {outpath}")

# === Summary ===
print("\n" + "=" * 70)
print("  H2O VQE SUMMARY")
print("=" * 70)
print(f"  Molecule:          H2O (water)")
print(f"  Active space:      CASCI({n_active_elec},{n_active_orbs}) = {n_q} qubits")
print(f"  Pauli terms:       {len(pauli_terms)}")
print(f"  Measurement circuits: {len(circuits)}")
print(f"  CNOTs per circuit: {n_q - 1} x {n_layers} = {(n_q-1)*n_layers}")
print(f"")
print(f"  Energies:")
print(f"    HF:         {mf.e_tot:.6f} Ha")
print(f"    CASCI:      {mc.e_tot:.6f} Ha")
print(f"    VQE (opt):  {best_E:.6f} Ha")
print(f"    FCI (exact): {e_fci:.6f} Ha")
print(f"    VQE error:  {abs(best_E - E_fci_active)*1000:.2f} mHa")
print(f"")
print(f"  CASCI captures {(mf.e_tot - mc.e_tot)/(mf.e_tot - e_fci)*100:.1f}% of correlation energy")
print(f"  Ready for QI emulator and IBM hardware submission.")
