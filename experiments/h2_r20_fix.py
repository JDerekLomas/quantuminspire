#!/usr/bin/env python3
"""
H2 VQE at R=2.0 Angstrom — Strong Correlation Fix
====================================================
The SU(2) ansatz at depth=2 fails at R=2.0 (24 mHa error) because:
1. Strong correlation → large CI coefficients → need more expressive ansatz
2. COBYLA alone gets trapped in local minima near the barren plateau

Fix: depth=3 ansatz, 50 restarts, multi-optimizer strategy (L-BFGS-B, COBYLA, Nelder-Mead).
Falls back to depth=4 if depth=3 doesn't reach chemical accuracy (<1.6 mHa).
"""
import numpy as np
import json
import time
from scipy.optimize import minimize

from openfermion.chem import MolecularData
from openfermion.transforms import jordan_wigner
from openfermion.utils import count_qubits
from openfermion.linalg import get_sparse_operator
from openfermion import get_fermion_operator
from openfermionpyscf import run_pyscf

R = 2.0  # Angstrom — strong correlation regime


# =============================================================================
# Hamiltonian
# =============================================================================

def compute_h2_hamiltonian(R):
    geometry = [("H", (0, 0, 0)), ("H", (0, 0, R))]
    molecule = MolecularData(geometry, "sto-3g", 1, 0)
    molecule = run_pyscf(molecule, run_scf=True, run_fci=True)
    hamiltonian = molecule.get_molecular_hamiltonian()
    fermion_h = get_fermion_operator(hamiltonian)
    qubit_h = jordan_wigner(fermion_h)
    n_qubits = count_qubits(qubit_h)
    H_mat = get_sparse_operator(qubit_h).toarray()
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
        "pauli_terms": pauli_terms,
        "H_mat": H_mat,
        "n_qubits": n_qubits,
        "E_HF": molecule.hf_energy,
        "E_FCI": molecule.fci_energy,
    }


# =============================================================================
# SU(2) Ansatz — Rz-Ry-Rz per qubit per layer (full SU(2) rotation)
# =============================================================================

def ansatz_state(params, n_qubits=4, depth=3):
    """SU(2) ansatz: initial Ry + d x [CNOT chain + Rz Ry Rz per qubit].

    Full SU(2) single-qubit rotation per layer gives maximum expressibility.
    """
    state = np.zeros(2 ** n_qubits, dtype=complex)
    state[0b0011] = 1.0  # HF state: electrons in bonding orbitals

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

    def apply_cnot(st, c, t):
        out = st.copy()
        for i in range(len(st)):
            if (i >> c) & 1:
                j = i ^ (1 << t)
                out[i], out[j] = st[j], st[i]
        return out

    idx = 0
    # Initial Ry layer
    for q in range(n_qubits):
        state = apply_1q(state, ry(params[idx]), q)
        idx += 1

    # Entangling blocks: CNOT chain + Rz Ry Rz per qubit
    for _ in range(depth):
        for q in range(n_qubits - 1):
            state = apply_cnot(state, q, q + 1)
        for q in range(n_qubits):
            state = apply_1q(state, rz(params[idx]), q)
            idx += 1
            state = apply_1q(state, ry(params[idx]), q)
            idx += 1
            state = apply_1q(state, rz(params[idx]), q)
            idx += 1

    return state


def n_params(n_qubits=4, depth=3):
    """Initial Ry: n_qubits, then per layer: 3*n_qubits (Rz, Ry, Rz)."""
    return n_qubits + 3 * n_qubits * depth


# =============================================================================
# Multi-optimizer VQE
# =============================================================================

def run_vqe(H_mat, n_qubits=4, depth=3, n_starts=50):
    """Multi-optimizer VQE with aggressive restart strategy.

    Strategy:
    1. Random restarts with COBYLA (fast, derivative-free, good for rough landscape)
    2. Polish best COBYLA result with L-BFGS-B (gradient-based, precise)
    3. Extra restarts with Nelder-Mead (simplex, different search pattern)
    4. Take the absolute best across all methods
    """
    np_params = n_params(n_qubits, depth)
    print(f"  Ansatz: depth={depth}, {np_params} parameters")

    def energy(params):
        psi = ansatz_state(params, n_qubits, depth)
        return np.real(psi.conj() @ H_mat @ psi)

    def energy_grad(params):
        """Numerical gradient via parameter-shift rule (central differences)."""
        e0 = energy(params)
        grad = np.zeros_like(params)
        eps = 1e-6
        for i in range(len(params)):
            params_p = params.copy()
            params_p[i] += eps
            params_m = params.copy()
            params_m[i] -= eps
            grad[i] = (energy(params_p) - energy(params_m)) / (2 * eps)
        return e0, grad

    results = []
    np.random.seed(42)

    # Phase 1: COBYLA restarts (fast exploration)
    print(f"  Phase 1: {n_starts} COBYLA restarts...")
    t0 = time.time()
    for i in range(n_starts):
        x0 = np.random.randn(np_params) * 0.5
        res = minimize(energy, x0, method="COBYLA",
                       options={"maxiter": 5000, "rhobeg": 0.5})
        results.append(("COBYLA", res.fun, res.x))
    t1 = time.time()
    cobyla_best = min(results, key=lambda x: x[1])
    print(f"    Best COBYLA: {cobyla_best[1]:.6f} Ha ({t1-t0:.1f}s)")

    # Phase 2: L-BFGS-B polish of top 5 COBYLA results
    print(f"  Phase 2: L-BFGS-B polish (top 5)...")
    t0 = time.time()
    sorted_results = sorted(results, key=lambda x: x[1])[:5]
    for _, e_init, x_init in sorted_results:
        res = minimize(energy, x_init, method="L-BFGS-B",
                       jac=lambda p: energy_grad(p)[1],
                       options={"maxiter": 2000, "ftol": 1e-15, "gtol": 1e-10})
        results.append(("L-BFGS-B", res.fun, res.x))
    t1 = time.time()
    print(f"    Best L-BFGS-B: {min(r[1] for r in results if r[0] == 'L-BFGS-B'):.6f} Ha ({t1-t0:.1f}s)")

    # Phase 3: Nelder-Mead restarts (different search geometry)
    print(f"  Phase 3: {n_starts // 2} Nelder-Mead restarts...")
    t0 = time.time()
    for i in range(n_starts // 2):
        x0 = np.random.randn(np_params) * 0.5
        res = minimize(energy, x0, method="Nelder-Mead",
                       options={"maxiter": 10000, "xatol": 1e-8, "fatol": 1e-10})
        results.append(("Nelder-Mead", res.fun, res.x))
    t1 = time.time()
    nm_best = min((r for r in results if r[0] == "Nelder-Mead"), key=lambda x: x[1])
    print(f"    Best Nelder-Mead: {nm_best[1]:.6f} Ha ({t1-t0:.1f}s)")

    # Phase 4: Final L-BFGS-B polish of absolute best
    overall_best = min(results, key=lambda x: x[1])
    res = minimize(energy, overall_best[2], method="L-BFGS-B",
                   jac=lambda p: energy_grad(p)[1],
                   options={"maxiter": 5000, "ftol": 1e-15, "gtol": 1e-12})
    results.append(("L-BFGS-B-final", res.fun, res.x))

    best = min(results, key=lambda x: x[1])
    return best[1], best[2], best[0]


# =============================================================================
# Main
# =============================================================================

print("=" * 72)
print("  H2 VQE at R=2.0 A — STRONG CORRELATION FIX")
print("  Rz-Ry-Rz SU(2) ansatz, multi-optimizer strategy")
print("=" * 72)

# Compute Hamiltonian
print(f"\n--- Computing H2 Hamiltonian at R={R} A ---")
data = compute_h2_hamiltonian(R)
print(f"  PySCF: E_HF  = {data['E_HF']:.6f} Ha")
print(f"  PySCF: E_FCI = {data['E_FCI']:.6f} Ha")
print(f"  Correlation energy: {(data['E_FCI'] - data['E_HF'])*1000:.3f} mHa")
print(f"  4-qubit JW: {len(data['pauli_terms'])} Pauli terms")

# Verify FCI
eigs = np.sort(np.linalg.eigvalsh(data["H_mat"]))
assert abs(eigs[0] - data["E_FCI"]) < 1e-6, "FCI mismatch!"
print(f"  FCI verified: eigenvalue matches PySCF")
print(f"  Spectral gap: {(eigs[1] - eigs[0])*1000:.1f} mHa")

# Try depth=3 first
CHEMICAL_ACCURACY = 1.6  # mHa

for depth in [3, 4]:
    print(f"\n{'='*72}")
    print(f"  DEPTH = {depth}")
    print(f"{'='*72}")

    best_E, best_params, best_method = run_vqe(
        data["H_mat"], n_qubits=4, depth=depth, n_starts=50
    )
    error_mHa = abs(best_E - data["E_FCI"]) * 1000
    chem_accurate = error_mHa < CHEMICAL_ACCURACY

    print(f"\n  --- RESULTS (depth={depth}) ---")
    print(f"  Best energy:   {best_E:.8f} Ha")
    print(f"  FCI energy:    {data['E_FCI']:.8f} Ha")
    print(f"  Error:         {error_mHa:.4f} mHa")
    print(f"  Best method:   {best_method}")
    print(f"  Chemical accuracy (<{CHEMICAL_ACCURACY} mHa): {'YES' if chem_accurate else 'NO'}")

    if chem_accurate:
        # Save results
        output = {
            "experiment": "H2 VQE R=2.0 strong correlation fix",
            "R": R,
            "depth": depth,
            "n_params": n_params(4, depth),
            "E_HF": float(data["E_HF"]),
            "E_FCI": float(data["E_FCI"]),
            "E_VQE": float(best_E),
            "error_mHa": float(error_mHa),
            "chemical_accuracy": True,
            "best_method": best_method,
            "optimal_params": best_params.tolist(),
            "ansatz": f"Rz-Ry-Rz SU(2), depth={depth}, CNOT chain",
            "optimizers": "COBYLA(50) + L-BFGS-B(polish) + Nelder-Mead(25)",
        }
        outpath = "/Users/dereklomas/haiqu/experiments/results/h2_r20_fix.json"
        with open(outpath, "w") as f:
            json.dump(output, f, indent=2)
        print(f"\n  Saved to {outpath}")
        break
    else:
        print(f"  Depth {depth} insufficient, trying deeper...")

if not chem_accurate:
    print("\n  WARNING: Neither depth=3 nor depth=4 achieved chemical accuracy.")
    print("  Consider UCCSD ansatz or symmetry-adapted approach.")
