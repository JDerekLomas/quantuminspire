#!/usr/bin/env python3
"""
LiH VQE — Kandala Replication
=================================
Replicates Kandala et al., Nature 549, 242 (2017), targeting Fig. 3
(LiH dissociation curve on quantum hardware).

Key improvements over lih_vqe.py:
1. Full SU(2) ansatz: Ry + Rz per qubit per layer (matching Kandala)
2. Dissociation curve: R = 0.5 to 4.0 A (matching Kandala's Fig. 3)
3. Corrected integral transformation (spinorb_from_spatial)
4. ZNE-ready circuits for IBM submission (use lih_zne.py)
5. Active space: CASCI(2,2) — same as Kandala

Kandala's method (for reference):
  - STO-3G basis, CASCI(2,2) active space, 4 qubits (JW or parity)
  - Hardware-efficient ansatz: R_y R_z rotations + entangling layers
  - Depth d=3 on ibmqx4 (5-qubit superconducting chip)
  - Error mitigation: Richardson extrapolation (zero-noise extrapolation)
  - Key result: dissociation curve matching FCI within ~10 mHa after mitigation
"""
import numpy as np
import json
from scipy.optimize import minimize

import pyscf
from pyscf import gto, scf, mcscf, ao2mo as pyscf_ao2mo

from openfermion import InteractionOperator, get_fermion_operator
from openfermion.chem.molecular_data import spinorb_from_spatial
from openfermion.transforms import jordan_wigner
from openfermion.utils import count_qubits
from openfermion.linalg import get_sparse_operator

# =============================================================================
# Configuration
# =============================================================================

# Bond distances matching Kandala et al. Fig. 3
BOND_DISTANCES = [0.5, 0.75, 1.0, 1.25, 1.5, 1.6, 1.75, 2.0, 2.5, 3.0, 3.5, 4.0]

# Ansatz depth (Kandala used d=3; d=2 sufficient for our active space)
ANSATZ_DEPTH = 2

# VQE optimizer settings
N_RANDOM_STARTS = 15
MAX_ITER = 3000


# =============================================================================
# Step 1: Molecular Hamiltonian from PySCF + OpenFermion
# =============================================================================

def compute_lih_hamiltonian(R, n_active_orbitals=2, n_active_electrons=2):
    """Compute LiH active-space Hamiltonian at bond distance R.

    Uses PySCF for molecular integrals and CASCI for the active space,
    then OpenFermion for the Jordan-Wigner qubit mapping.

    The integral transformation follows the corrected pipeline:
      PySCF chemist's (ij|kl) → transpose(0,2,3,1) → spinorb_from_spatial
    """
    mol = gto.M(atom=f"Li 0 0 0; H 0 0 {R}", basis="sto-3g", verbose=0)
    mf = scf.RHF(mol).run()

    # CASCI: freeze Li 1s core, keep HOMO + LUMO
    mc = mcscf.CASCI(mf, ncas=n_active_orbitals, nelecas=n_active_electrons)
    mc.kernel()

    # Full-space FCI for reference
    from pyscf import fci as pyscf_fci
    cisolver = pyscf_fci.FCI(mf)
    E_FCI_full = cisolver.kernel()[0]

    # Active-space integrals
    h1e_cas, ecore = mc.get_h1eff()
    h2e_cas = pyscf_ao2mo.restore(1, mc.get_h2eff(), n_active_orbitals)

    # PySCF chemist's notation → OpenFermion physicist's notation
    h2e_of = np.asarray(h2e_cas.transpose(0, 2, 3, 1), order="C")
    one_body, two_body = spinorb_from_spatial(h1e_cas, h2e_of)

    active_h = InteractionOperator(ecore, one_body, 0.5 * two_body)
    fermion_h = get_fermion_operator(active_h)
    qubit_h = jordan_wigner(fermion_h)

    n_qubits = count_qubits(qubit_h)
    H_mat = get_sparse_operator(qubit_h).toarray()

    # Verify: qubit Hamiltonian ground state should match CASCI
    eigs = np.linalg.eigvalsh(H_mat)
    E_qubit_gs = eigs[0]

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

    return {
        "R": R,
        "E_HF": float(mf.e_tot),
        "E_CASCI": float(mc.e_tot),
        "E_FCI_full": float(E_FCI_full),
        "E_qubit_gs": float(E_qubit_gs),
        "ecore": float(ecore),
        "n_qubits": n_qubits,
        "pauli_terms": pauli_terms,
        "H_mat": H_mat,
    }


# =============================================================================
# Step 2: SU(2) Hardware-Efficient Ansatz (matching Kandala)
# =============================================================================

def su2_ansatz_state(params, n_qubits=4, depth=2):
    """Kandala-style hardware-efficient ansatz.

    Structure:
      |HF⟩ → [Ry layer] → d × [CNOT chain + Ry Rz layer]

    Parameters per layer:
      - Initial: n_qubits Ry angles
      - Each block: n_qubits × 2 (Ry + Rz) angles
      - Total: n_qubits × (1 + 2 × depth)
    """
    state = np.zeros(2 ** n_qubits, dtype=complex)
    state[0b0011] = 1.0  # HF: 2 electrons in lowest spin-orbitals

    def ry(theta):
        c, s = np.cos(theta / 2), np.sin(theta / 2)
        return np.array([[c, -s], [s, c]], dtype=complex)

    def rz(phi):
        return np.array([[np.exp(-1j * phi / 2), 0],
                         [0, np.exp(1j * phi / 2)]], dtype=complex)

    def apply_1q(st, gate, q):
        n = len(st)
        out = np.zeros(n, dtype=complex)
        for i in range(n):
            b = (i >> q) & 1
            i0 = i & ~(1 << q)
            i1 = i0 | (1 << q)
            out[i] = gate[b, 0] * st[i0] + gate[b, 1] * st[i1]
        return out

    def apply_cnot(st, ctrl, tgt):
        out = st.copy()
        for i in range(len(st)):
            if (i >> ctrl) & 1:
                j = i ^ (1 << tgt)
                out[i], out[j] = st[j], st[i]
        return out

    idx = 0

    # Initial Ry layer
    for q in range(n_qubits):
        state = apply_1q(state, ry(params[idx]), q)
        idx += 1

    # Entangling blocks
    for _ in range(depth):
        # CNOT chain
        for q in range(n_qubits - 1):
            state = apply_cnot(state, q, q + 1)
        # Ry + Rz on each qubit
        for q in range(n_qubits):
            state = apply_1q(state, ry(params[idx]), q)
            idx += 1
            state = apply_1q(state, rz(params[idx]), q)
            idx += 1

    return state


def n_params_for_ansatz(n_qubits=4, depth=2):
    return n_qubits * (1 + 2 * depth)


def classical_vqe(H_mat, n_qubits=4, depth=2, n_starts=15):
    """Run classical VQE with SU(2) ansatz."""
    n_p = n_params_for_ansatz(n_qubits, depth)

    def energy(params):
        psi = su2_ansatz_state(params, n_qubits, depth)
        return np.real(psi.conj() @ H_mat @ psi)

    np.random.seed(42)
    best_E, best_p = 1e10, None
    for _ in range(n_starts):
        x0 = np.random.randn(n_p) * 0.3
        res = minimize(energy, x0, method="COBYLA",
                       options={"maxiter": MAX_ITER, "rhobeg": 0.5})
        if res.fun < best_E:
            best_E, best_p = res.fun, res.x

    return best_E, best_p


# =============================================================================
# Step 3: Measurement grouping
# =============================================================================

def group_commuting_terms(pauli_terms):
    """Group Pauli terms by their non-trivial (X/Y) measurement basis."""
    groups = {}
    for term, coeff in pauli_terms.items():
        basis = tuple((i, c) for i, c in enumerate(term) if c in ("X", "Y"))
        groups.setdefault(basis, []).append((term, coeff))
    return groups


# =============================================================================
# Step 4: Circuit generation
# =============================================================================

def gen_qasm(params, n_qubits, depth, measurement_rotations=None):
    """Generate OpenQASM 2.0 for the SU(2) ansatz."""
    qasm = f'OPENQASM 2.0;\ninclude "qelib1.inc";\n'
    qasm += f'qreg q[{n_qubits}];\ncreg c[{n_qubits}];\n\n'
    qasm += '// HF state |0011>\nx q[0];\nx q[1];\n\n'

    idx = 0
    # Initial Ry layer
    qasm += '// Initial Ry layer\n'
    for i in range(n_qubits):
        qasm += f'ry({params[idx]:.6f}) q[{i}];\n'
        idx += 1
    qasm += '\n'

    # Entangling blocks
    for d in range(depth):
        qasm += f'// Block {d + 1}: entangling + Ry Rz\n'
        for i in range(n_qubits - 1):
            qasm += f'cx q[{i}], q[{i + 1}];\n'
        for i in range(n_qubits):
            qasm += f'ry({params[idx]:.6f}) q[{i}];\n'
            idx += 1
            qasm += f'rz({params[idx]:.6f}) q[{i}];\n'
            idx += 1
        qasm += '\n'

    if measurement_rotations:
        qasm += '// Basis rotation\n'
        for qubit, basis in measurement_rotations:
            if basis == 'X':
                qasm += f'h q[{qubit}];\n'
            elif basis == 'Y':
                qasm += f'sdg q[{qubit}];\nh q[{qubit}];\n'
        qasm += '\n'

    for i in range(n_qubits):
        qasm += f'measure q[{i}] -> c[{i}];\n'
    return qasm


def gen_cqasm(params, n_qubits, depth, measurement_rotations=None):
    """Generate cQASM 3.0 for the SU(2) ansatz."""
    cq = f'version 3.0\n\nqubit[{n_qubits}] q\n\n'
    cq += '// HF state |0011>\nX q[0]\nX q[1]\n\n'

    idx = 0
    cq += '// Initial Ry layer\n'
    for i in range(n_qubits):
        cq += f'Ry({params[idx]:.6f}) q[{i}]\n'
        idx += 1
    cq += '\n'

    for d in range(depth):
        cq += f'// Block {d + 1}: entangling + Ry Rz\n'
        for i in range(n_qubits - 1):
            cq += f'CNOT q[{i}], q[{i + 1}]\n'
        for i in range(n_qubits):
            cq += f'Ry({params[idx]:.6f}) q[{i}]\n'
            idx += 1
            cq += f'Rz({params[idx]:.6f}) q[{i}]\n'
            idx += 1
        cq += '\n'

    if measurement_rotations:
        cq += '// Basis rotation\n'
        for qubit, basis in measurement_rotations:
            if basis == 'X':
                cq += f'H q[{qubit}]\n'
            elif basis == 'Y':
                cq += f'Sdag q[{qubit}]\nH q[{qubit}]\n'
        cq += '\n'

    cq += f'bit[{n_qubits}] b\nb = measure q\n'
    return cq


# =============================================================================
# Main: Dissociation Curve
# =============================================================================

print("=" * 72)
print("  LiH VQE — KANDALA REPLICATION")
print("  Dissociation curve from first principles")
print("  Reference: Kandala et al., Nature 549, 242 (2017)")
print("=" * 72)

n_p = n_params_for_ansatz(4, ANSATZ_DEPTH)
print(f"\n  Ansatz: SU(2) hardware-efficient, depth={ANSATZ_DEPTH}, {n_p} params")
print(f"  Active space: CASCI(2,2) = 4 qubits")
print(f"  Bond distances: {len(BOND_DISTANCES)} points, {BOND_DISTANCES[0]}–{BOND_DISTANCES[-1]} A")

all_results = []

for R in BOND_DISTANCES:
    print(f"\n--- R = {R:.2f} A ---")

    # Compute Hamiltonian
    data = compute_lih_hamiltonian(R)
    corr_full = (data["E_HF"] - data["E_FCI_full"]) * 1000
    corr_cas = (data["E_HF"] - data["E_CASCI"]) * 1000
    print(f"  E_HF={data['E_HF']:.6f}  E_CASCI={data['E_CASCI']:.6f}  E_FCI={data['E_FCI_full']:.6f}")
    print(f"  Correlation: CASCI captures {corr_cas:.1f} of {corr_full:.1f} mHa ({corr_cas/corr_full*100:.0f}%)")
    print(f"  Qubit Hamiltonian: {len(data['pauli_terms'])} Pauli terms, {data['n_qubits']} qubits")

    # Verify qubit Hamiltonian matches CASCI
    offset = data["E_qubit_gs"] - data["E_CASCI"]
    print(f"  Qubit GS={data['E_qubit_gs']:.6f}, offset from CASCI={offset:.6f}")

    # Classical VQE
    best_E, best_params = classical_vqe(data["H_mat"], depth=ANSATZ_DEPTH, n_starts=N_RANDOM_STARTS)
    vqe_err = abs(best_E - data["E_qubit_gs"]) * 1000
    vqe_mol = best_E - offset  # Convert to molecular energy frame
    print(f"  VQE={best_E:.6f} (error vs qubit GS: {vqe_err:.3f} mHa)")
    print(f"  VQE molecular energy: {vqe_mol:.6f}")

    # Measurement grouping
    groups = group_commuting_terms(data["pauli_terms"])
    circuit_term_map = {}
    for basis, terms in groups.items():
        name = "Z" if not basis else "_".join(f"q{i}{op}" for i, op in basis)
        circuit_term_map[name] = [t for t, _ in terms]

    all_results.append({
        "R": R,
        "E_HF": data["E_HF"],
        "E_CASCI": data["E_CASCI"],
        "E_FCI_full": data["E_FCI_full"],
        "E_qubit_gs": data["E_qubit_gs"],
        "E_VQE_qubit": float(best_E),
        "E_VQE_molecular": float(vqe_mol),
        "vqe_error_mHa": float(vqe_err),
        "offset": float(offset),
        "n_pauli_terms": len(data["pauli_terms"]),
        "n_circuits": len(circuit_term_map),
        "pauli_terms": {k: float(v) for k, v in data["pauli_terms"].items()},
        "circuit_term_map": circuit_term_map,
        "optimal_params": best_params.tolist(),
    })


# Generate circuits at all bond distances
print("\n" + "=" * 72)
print("  CIRCUIT GENERATION")
print("=" * 72)

all_circuits = {}
for r in all_results:
    R = r["R"]
    groups = group_commuting_terms(r["pauli_terms"])
    circuits_ibm = {}
    circuits_qi = {}
    for basis, terms in groups.items():
        rotations = list(basis) if basis else None
        name = "Z" if not basis else "_".join(f"q{i}{op}" for i, op in basis)
        circuits_ibm[name] = gen_qasm(r["optimal_params"], 4, ANSATZ_DEPTH, rotations)
        circuits_qi[name] = gen_cqasm(r["optimal_params"], 4, ANSATZ_DEPTH, rotations)
    all_circuits[str(R)] = {"ibm": circuits_ibm, "qi": circuits_qi}
    print(f"  R={R:.2f}: {len(circuits_ibm)} circuits")


# Save results
output = {
    "experiment": "LiH VQE Kandala replication",
    "reference": "Kandala et al., Nature 549, 242 (2017)",
    "method": {
        "basis_set": "STO-3G",
        "active_space": "CASCI(2,2), frozen Li 1s core",
        "qubit_mapping": "Jordan-Wigner (4 qubits)",
        "ansatz": f"SU(2) hardware-efficient, depth={ANSATZ_DEPTH}, {n_p} params",
        "ansatz_structure": "Ry layer + d x [CNOT chain + Ry Rz layer]",
        "optimizer": f"COBYLA, {N_RANDOM_STARTS} random starts, max {MAX_ITER} iter",
        "error_mitigation": "ZNE via EstimatorV2 resilience_level=2 (see lih_zne.py)",
    },
    "dissociation_curve": all_results,
    "circuits": all_circuits,
}

outpath = "/Users/dereklomas/haiqu/experiments/lih_replication_output.json"
with open(outpath, "w") as f:
    json.dump(output, f, indent=2, default=str)

print(f"\n  Saved to {outpath}")

# Summary table
print("\n" + "=" * 72)
print("  DISSOCIATION CURVE SUMMARY")
print("=" * 72)
print(f"  {'R':>5} | {'E_HF':>10} | {'E_CASCI':>10} | {'E_FCI':>10} | {'E_VQE':>10} | {'VQE err':>8} | {'CAS/FCI':>7}")
print(f"  {'-' * 5}-+-{'-' * 10}-+-{'-' * 10}-+-{'-' * 10}-+-{'-' * 10}-+-{'-' * 8}-+-{'-' * 7}")
for r in all_results:
    cas_pct = (r["E_HF"] - r["E_CASCI"]) / (r["E_HF"] - r["E_FCI_full"]) * 100 if r["E_HF"] != r["E_FCI_full"] else 0
    print(f"  {r['R']:5.2f} | {r['E_HF']:10.6f} | {r['E_CASCI']:10.6f} | {r['E_FCI_full']:10.6f} | {r['E_VQE_molecular']:10.6f} | {r['vqe_error_mHa']:8.3f} | {cas_pct:6.1f}%")

print(f"\n  NOTE: CASCI(2,2) captures only a fraction of total correlation.")
print(f"  The VQE error above is vs the CASCI target (active-space FCI),")
print(f"  NOT vs the true FCI. See the CAS/FCI column for coverage.")
print(f"\n  To run on hardware with ZNE: python experiments/lih_zne.py")
