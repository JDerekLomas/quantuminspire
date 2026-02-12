#!/usr/bin/env python3
"""
Hybrid VQE for LiH (Lithium Hydride) -- 4 qubits
==================================================
Uses PySCF for molecular integrals, OpenFermion for qubit mapping,
then generates circuits for QI emulator and IBM hardware.

LiH is a standard benchmark for quantum chemistry on quantum computers.
It has real chemical interest: the Li-H bond is partly ionic.

REPLICATION NOTE: Implicitly follows Kandala et al. (2017) but diverges in
three ways: (1) CASCI(2,2) active space captures only 1.3% of correlation —
"chemical accuracy" is vs. the tiny active-space target, not the true ground
state. (2) Ry-only ansatz, not full SU(2). (3) Jordan-Wigner mapping, not
parity. The integral pipeline is correct (verified by FCI matching CASCI).
See .claude/handoffs/2026-02-12-vqe-experiments.md for full analysis.
"""
import numpy as np
import json
from itertools import product

# === Step 1: Compute LiH Hamiltonian from first principles ===
print("=" * 70)
print("  LiH VQE: Computing Hamiltonian from First Principles")
print("=" * 70)

from openfermion.chem import MolecularData
from openfermion.transforms import jordan_wigner, bravyi_kitaev
from openfermion.utils import count_qubits
from openfermion.linalg import get_sparse_operator
from openfermionpyscf import run_pyscf

# LiH geometry at equilibrium (R = 1.6 Angstrom)
R = 1.6  # Angstrom
geometry = [("Li", (0, 0, 0)), ("H", (0, 0, R))]
basis = "sto-3g"
multiplicity = 1
charge = 0

print(f"\n  Molecule: LiH")
print(f"  Bond distance: {R} A")
print(f"  Basis: {basis}")

molecule = MolecularData(geometry, basis, multiplicity, charge)
molecule = run_pyscf(molecule, run_scf=True, run_fci=True)

print(f"  HF energy:  {molecule.hf_energy:.6f} Ha")
print(f"  FCI energy: {molecule.fci_energy:.6f} Ha")
print(f"  Correlation energy: {(molecule.hf_energy - molecule.fci_energy)*1000:.1f} mHa")

# Get the fermionic Hamiltonian
from openfermion import get_fermion_operator
hamiltonian = molecule.get_molecular_hamiltonian()
fermion_h = get_fermion_operator(hamiltonian)

# Jordan-Wigner mapping to qubits
qubit_h = jordan_wigner(fermion_h)
n_qubits = count_qubits(qubit_h)
n_terms = len(qubit_h.terms)
print(f"\n  Qubits (full JW): {n_qubits}")
print(f"  Pauli terms: {n_terms}")

# === Active space reduction ===
# LiH in STO-3G: 6 MOs, 4 electrons
# Freeze core (1s of Li): 2 electrons in 1 orbital -> 2 electrons in 5 active orbitals
# Further reduce: keep only 2 active orbitals (HOMO, LUMO) -> 2 electrons in 2 orbitals -> 4 qubits
# This captures the essential bonding/antibonding physics

from openfermion import InteractionOperator
from openfermion.chem import MolecularData

# Use active space: freeze Li 1s core, use HOMO + LUMO only
# For minimal active space (2e, 2o): 4 spin-orbitals -> 4 qubits after JW
# But let's use a slightly larger space for better accuracy

# Actually, let's work with the full space but analyze which terms matter
# For a practical IBM experiment, let me use the (2e, 2o) active space

print("\n  Using active space: (2 electrons, 2 orbitals) = 4 qubits")
print("  Frozen core: Li 1s orbital")

# Build the active space Hamiltonian manually using PySCF
import pyscf
from pyscf import gto, scf, mcscf, fci

mol = gto.M(atom=f"Li 0 0 0; H 0 0 {R}", basis="sto-3g", verbose=0)
mf = scf.RHF(mol).run()

# CASCI with 2 electrons in 2 orbitals (HOMO, LUMO)
mc = mcscf.CASCI(mf, ncas=2, nelecas=2)
mc.kernel()
print(f"  CASCI(2,2) energy: {mc.e_tot:.6f} Ha")

# Get the 1- and 2-electron integrals in the active space
h1e_cas, ecore = mc.get_h1eff()
from pyscf import ao2mo as pyscf_ao2mo
h2e_cas = pyscf_ao2mo.restore(1, mc.get_h2eff(), 2)  # restore to 4D

# Build OpenFermion InteractionOperator for the active space
from openfermion import InteractionOperator
from openfermion.chem.molecular_data import spinorb_from_spatial

# PySCF returns chemist's notation (ij|kl); OpenFermion needs (ik|jl)
# transpose(0,2,3,1) converts: h2e_of[p,q,r,s] = h2e_chem[p,r,s,q] = (ps|rq)
h2e_of = np.asarray(h2e_cas.transpose(0, 2, 3, 1), order='C')

# spinorb_from_spatial handles the spin-orbital mapping correctly
one_body, two_body = spinorb_from_spatial(h1e_cas, h2e_of)

active_h = InteractionOperator(ecore, one_body, 0.5 * two_body)
active_qubit_h = jordan_wigner(get_fermion_operator(active_h))

n_q = count_qubits(active_qubit_h)
n_t = len(active_qubit_h.terms)

print(f"\n  Active space qubits: {n_q}")
print(f"  Active space Pauli terms: {n_t}")

# Verify by diagonalizing
H_mat = get_sparse_operator(active_qubit_h).toarray()
eigenvalues = np.linalg.eigvalsh(H_mat)
E_fci_active = eigenvalues[0]
print(f"  Active space FCI: {E_fci_active:.6f} Ha")
print(f"  Full FCI:         {molecule.fci_energy:.6f} Ha")

# === Step 2: Extract Pauli terms ===
print("\n" + "-" * 70)
print("  QUBIT HAMILTONIAN (4 qubits)")
print("-" * 70)

pauli_terms = {}
for term, coeff in active_qubit_h.terms.items():
    if abs(coeff) < 1e-10:
        continue
    coeff = float(np.real(coeff))
    # Convert term to string like "IXYZ"
    pauli_str = ["I"] * n_q
    for qubit_idx, pauli_op in term:
        pauli_str[qubit_idx] = pauli_op
    key = "".join(pauli_str)
    pauli_terms[key] = pauli_terms.get(key, 0) + coeff

# Clean up near-zero terms
pauli_terms = {k: v for k, v in pauli_terms.items() if abs(v) > 1e-10}

print(f"\n  Non-trivial Pauli terms: {len(pauli_terms)}")
for term, coeff in sorted(pauli_terms.items(), key=lambda x: -abs(x[1])):
    print(f"    {term}: {coeff:+.6f}")

# === Step 3: Group commuting terms for measurement ===
# Terms that differ only in I/Z positions can be measured simultaneously
def measurement_basis(term):
    """Extract the non-trivial measurement basis (X or Y positions)."""
    return tuple((i, c) for i, c in enumerate(term) if c in ('X', 'Y'))

groups = {}
for term, coeff in pauli_terms.items():
    basis = measurement_basis(term)
    if basis not in groups:
        groups[basis] = []
    groups[basis].append((term, coeff))

print(f"\n  Measurement groups (circuits needed): {len(groups)}")
for i, (basis, terms) in enumerate(groups.items()):
    if basis == ():
        basis_name = "Z-basis (computational)"
    else:
        basis_name = " ".join(f"q{idx}={op}" for idx, op in basis)
    print(f"    Group {i}: {basis_name} ({len(terms)} terms)")
    for term, coeff in terms:
        print(f"      {term}: {coeff:+.6f}")

# === Step 4: Generate circuits ===
print("\n" + "-" * 70)
print("  VQE ANSATZ (hardware-efficient)")
print("-" * 70)

# For 4 qubits with 2 electrons, HF state is |0011> (q0=q1=occupied)
# Use a simple hardware-efficient ansatz:
#   Layer 1: Ry(t0) Ry(t1) Ry(t2) Ry(t3)
#   Layer 2: CNOT chain (q0-q1, q1-q2, q2-q3)
#   Layer 3: Ry(t4) Ry(t5) Ry(t6) Ry(t7)

# For a quick demo, use a single UCCSD-like excitation:
# The dominant excitation is HOMO -> LUMO (|0011> -> |1100>)
# Parameterized as: exp(theta * (a†_2 a†_3 a_1 a_0 - h.c.))
# After JW this maps to a set of Pauli rotations

# For simplicity, use a hardware-efficient ansatz and optimize classically
n_params = 8
print(f"  Ansatz: 2-layer Ry + CNOT chain")
print(f"  Parameters: {n_params}")
print(f"  HF reference: |0011> (2 electrons in lowest orbitals)")

# Classical VQE optimization using matrix simulation
def ansatz_state(params):
    """Hardware-efficient ansatz for 4 qubits."""
    # Start with |0011> (HF state)
    state = np.zeros(16, dtype=complex)
    state[0b0011] = 1.0  # |0011> = q0=1, q1=1, q2=0, q3=0

    def ry_gate(theta):
        c, s = np.cos(theta/2), np.sin(theta/2)
        return np.array([[c, -s], [s, c]], dtype=complex)

    def apply_single(state, gate, qubit, n_qubits):
        """Apply single-qubit gate."""
        n = 2**n_qubits
        new_state = np.zeros(n, dtype=complex)
        for i in range(n):
            bit = (i >> qubit) & 1
            i0 = i & ~(1 << qubit)  # i with qubit=0
            i1 = i0 | (1 << qubit)  # i with qubit=1
            if bit == 0:
                new_state[i] = gate[0,0] * state[i0] + gate[0,1] * state[i1]
            else:
                new_state[i] = gate[1,0] * state[i0] + gate[1,1] * state[i1]
        return new_state

    def apply_cnot(state, control, target, n_qubits):
        """Apply CNOT gate."""
        n = 2**n_qubits
        new_state = state.copy()
        for i in range(n):
            if (i >> control) & 1:  # control is |1>
                j = i ^ (1 << target)  # flip target
                new_state[i], new_state[j] = state[j], state[i]
        return new_state

    # Layer 1: Ry rotations
    for q in range(4):
        state = apply_single(state, ry_gate(params[q]), q, 4)

    # Entangling layer: CNOT chain
    for q in range(3):
        state = apply_cnot(state, q, q+1, 4)

    # Layer 2: Ry rotations
    for q in range(4):
        state = apply_single(state, ry_gate(params[4+q]), q, 4)

    return state

def vqe_energy(params):
    state = ansatz_state(params)
    return np.real(state.conj() @ H_mat @ state)

# Optimize using gradient-free method
from scipy.optimize import minimize

# Start near HF (small random perturbations)
np.random.seed(42)
best_E = E_fci_active + 10
best_params = None

# Multiple random starts
for trial in range(20):
    x0 = np.random.randn(n_params) * 0.3
    res = minimize(vqe_energy, x0, method='COBYLA',
                   options={'maxiter': 2000, 'rhobeg': 0.5})
    if res.fun < best_E:
        best_E = res.fun
        best_params = res.x

print(f"\n  VQE optimized energy: {best_E:.6f} Ha")
print(f"  Exact FCI energy:    {E_fci_active:.6f} Ha")
print(f"  VQE error:           {abs(best_E - E_fci_active)*1000:.2f} mHa")
print(f"  Optimal params: {np.array2string(best_params, precision=4, separator=', ')}")

# === Step 5: Compute Pauli expectations at optimal params ===
opt_state = ansatz_state(best_params)

print("\n" + "-" * 70)
print("  PAULI EXPECTATIONS AT OPTIMAL PARAMETERS")
print("-" * 70)

# Build Pauli matrices for 4 qubits
pauli_map = {"I": np.eye(2), "X": np.array([[0,1],[1,0]]),
             "Y": np.array([[0,-1j],[1j,0]]), "Z": np.array([[1,0],[0,-1]])}

for term, coeff in sorted(pauli_terms.items(), key=lambda x: -abs(x[1])):
    # Build the full operator
    op = pauli_map[term[0]]
    for i in range(1, n_q):
        op = np.kron(op, pauli_map[term[i]])
    exp_val = np.real(opt_state.conj() @ op @ opt_state)
    print(f"  <{term}> = {exp_val:+.6f}  (coeff: {coeff:+.6f}, contrib: {coeff*exp_val:+.6f})")

# === Step 6: Generate OpenQASM circuits for IBM ===
print("\n" + "-" * 70)
print("  OPENQASM 2.0 CIRCUITS FOR IBM")
print("-" * 70)

def gen_lih_qasm(params, measurement_rotations=None):
    """Generate OpenQASM 2.0 for LiH VQE ansatz."""
    qasm = 'OPENQASM 2.0;\ninclude "qelib1.inc";\n'
    qasm += 'qreg q[4];\ncreg c[4];\n\n'

    # Prepare HF state |0011>: q0=1, q1=1
    qasm += '// Hartree-Fock state |0011>\n'
    qasm += 'x q[0];\nx q[1];\n\n'

    # Layer 1: Ry rotations
    qasm += '// Layer 1: Ry rotations\n'
    for i in range(4):
        qasm += f'ry({params[i]:.6f}) q[{i}];\n'
    qasm += '\n'

    # CNOT chain
    qasm += '// Entangling layer\n'
    for i in range(3):
        qasm += f'cx q[{i}], q[{i+1}];\n'
    qasm += '\n'

    # Layer 2: Ry rotations
    qasm += '// Layer 2: Ry rotations\n'
    for i in range(4):
        qasm += f'ry({params[4+i]:.6f}) q[{i}];\n'
    qasm += '\n'

    # Measurement basis rotations
    if measurement_rotations:
        qasm += '// Measurement basis rotation\n'
        for qubit, basis in measurement_rotations:
            if basis == 'X':
                qasm += f'h q[{qubit}];\n'
            elif basis == 'Y':
                qasm += f'sdg q[{qubit}];\nh q[{qubit}];\n'
        qasm += '\n'

    qasm += '// Measure all qubits\n'
    for i in range(4):
        qasm += f'measure q[{i}] -> c[{i}];\n'
    return qasm

# Generate one circuit per measurement group
circuits = {}
for i, (basis, terms) in enumerate(groups.items()):
    rotations = [(idx, op) for idx, op in basis]
    qasm = gen_lih_qasm(best_params, rotations if rotations else None)
    group_name = "Z" if not basis else "_".join(f"q{idx}{op}" for idx, op in basis)
    circuits[group_name] = qasm

print(f"\n  Generated {len(circuits)} measurement circuits for IBM:")
for name in circuits:
    print(f"    - {name}")

# Save circuits
with open("/Users/dereklomas/haiqu/experiments/lih_circuits.json", "w") as f:
    json.dump({
        "molecule": "LiH",
        "bond_distance": R,
        "basis": basis,
        "n_qubits": n_q,
        "n_params": n_params,
        "optimal_params": best_params.tolist(),
        "E_HF": float(mf.e_tot),
        "E_FCI": float(molecule.fci_energy),
        "E_VQE": float(best_E),
        "E_CASCI": float(mc.e_tot),
        "pauli_terms": pauli_terms,
        "circuits": circuits,
    }, f, indent=2)

print(f"\n  Saved to experiments/lih_circuits.json")
print(f"\n  Ready to submit to IBM and QI!")
