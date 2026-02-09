"""
Replication: "Error Mitigation by Symmetry Verification on a VQE"
Sagastizabal et al., Phys. Rev. A 100, 010302 (2019)
https://arxiv.org/abs/1902.11258

2-qubit VQE for H2 with symmetry verification, from QuTech/TU Delft.
Uses the full 4-qubit Jordan-Wigner Hamiltonian with Qiskit.
"""

import numpy as np
from openfermion import MolecularData, jordan_wigner, get_sparse_operator
from openfermionpyscf import run_pyscf
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
from qiskit_aer.noise import NoiseModel, thermal_relaxation_error


def h2_hamiltonian(R):
    """Compute H2 qubit Hamiltonian + FCI energy at bond distance R."""
    mol = MolecularData([('H', (0, 0, 0)), ('H', (0, 0, R))], 'sto-3g', 1, 0)
    mol = run_pyscf(mol, run_fci=True)
    qubit_op = jordan_wigner(mol.get_molecular_hamiltonian())
    return qubit_op, mol.fci_energy


def ansatz_4q(theta):
    """Hardware-efficient 4-qubit ansatz for H2.
    Prepares HF state |0101> then applies single-excitation rotation."""
    qc = QuantumCircuit(4)
    # Hartree-Fock: occupy orbitals 0 and 1 -> |0101> in JW
    qc.x(0)
    qc.x(1)
    # UCCSD-like single excitation between occupied/virtual
    qc.ry(theta, 2)
    qc.cx(2, 3)
    qc.cx(0, 2)
    qc.ry(-theta, 2)
    qc.cx(0, 2)
    qc.cx(2, 3)
    return qc


def pauli_expval(counts, pauli_indices):
    """Compute expectation value of a Pauli Z-string from counts.
    pauli_indices: list of qubit indices that have Z operators."""
    total, weighted = 0, 0.0
    for bitstring, count in counts.items():
        bits = bitstring.replace(' ', '')[::-1]  # reverse for qiskit ordering
        sign = 1
        for idx in pauli_indices:
            if int(bits[idx]) == 1:
                sign *= -1
        weighted += sign * count
        total += count
    return weighted / total


def measure_hamiltonian(qc, qubit_op, sim, shots=8192, postselect_parity=None):
    """Measure <H> by grouping commuting Pauli terms."""
    energy = 0.0

    # Group terms by measurement basis
    z_terms = []  # terms with only I and Z
    other_terms = []

    for term, coeff in qubit_op.terms.items():
        if abs(coeff) < 1e-10:
            continue
        if len(term) == 0:
            energy += coeff.real
            continue
        paulis = {q: p for q, p in term}
        if all(p == 'Z' for p in paulis.values()):
            z_terms.append((paulis, coeff.real))
        else:
            other_terms.append((term, coeff.real))

    # Measure Z-basis terms
    qc_z = qc.copy()
    qc_z.measure_all()
    counts_z = sim.run(qc_z, shots=shots).result().get_counts()

    if postselect_parity is not None:
        # Post-select on total Z-parity
        filtered = {}
        for bitstring, count in counts_z.items():
            bits = bitstring.replace(' ', '')
            parity = sum(int(b) for b in bits) % 2
            if parity == postselect_parity:
                filtered[bitstring] = count
        if filtered:
            counts_z = filtered

    for paulis, coeff in z_terms:
        ev = pauli_expval(counts_z, list(paulis.keys()))
        energy += coeff * ev

    # Measure XXYY / XYYX / YXXY / YYXX terms (all share same basis rotation)
    if other_terms:
        # These are 4-qubit terms like X0 X1 Y2 Y3
        # Basis change: H for X, Sdg H for Y, I for Z
        qc_xyyx = qc.copy()
        for term, coeff in other_terms:
            break  # just need one to determine basis
        # All the non-Z terms in H2 JW have form X_i X_j Y_k Y_l or permutations
        # They can be measured in 2 bases. For simplicity, measure each independently.
        for term, coeff in other_terms:
            paulis = {q: p for q, p in term}
            qc_basis = qc.copy()
            for q, p in paulis.items():
                if p == 'X':
                    qc_basis.h(q)
                elif p == 'Y':
                    qc_basis.sdg(q)
                    qc_basis.h(q)
            qc_basis.measure_all()
            counts_p = sim.run(qc_basis, shots=shots).result().get_counts()
            ev = pauli_expval(counts_p, list(paulis.keys()))
            energy += coeff * ev

    return energy


def noise_model():
    nm = NoiseModel()
    t1, t2 = 30e3, 60e3
    e1 = thermal_relaxation_error(t1, t2, 20)
    e2 = thermal_relaxation_error(t1, t2, 60).tensor(thermal_relaxation_error(t1, t2, 60))
    nm.add_all_qubit_quantum_error(e1, ['x', 'h', 'ry', 'sdg', 'rz'])
    nm.add_all_qubit_quantum_error(e2, ['cx'])
    return nm


if __name__ == "__main__":
    distances = np.arange(0.3, 2.01, 0.2)

    print("Computing H2 Hamiltonians via PySCF...")
    data = {}
    for R in distances:
        qh, fci = h2_hamiltonian(round(R, 2))
        data[round(R, 2)] = (qh, fci)
        print(f"  R={R:.1f}: FCI = {fci:.6f} Ha")

    sim_ideal = AerSimulator()
    sim_noisy = AerSimulator(noise_model=noise_model())

    print(f"\n{'R':>5} | {'Exact':>9} | {'Ideal':>9} | {'Noisy':>9} | {'Mitigated':>9}")
    print("-" * 60)

    all_exact, all_ideal, all_noisy, all_mitig = [], [], [], []

    for R in distances:
        R = round(R, 2)
        qh, fci = data[R]

        best_i, best_n, best_m = 1e9, 1e9, 1e9
        for theta in np.linspace(-np.pi, np.pi, 60):
            qc = ansatz_4q(theta)
            e_i = measure_hamiltonian(qc, qh, sim_ideal)
            e_n = measure_hamiltonian(qc, qh, sim_noisy)
            e_m = measure_hamiltonian(qc, qh, sim_noisy, postselect_parity=0)
            best_i = min(best_i, e_i)
            best_n = min(best_n, e_n)
            best_m = min(best_m, e_m)

        all_exact.append(fci)
        all_ideal.append(best_i)
        all_noisy.append(best_n)
        all_mitig.append(best_m)
        print(f"{R:5.1f} | {fci:9.5f} | {best_i:9.5f} | {best_n:9.5f} | {best_m:9.5f}")

    exact = np.array(all_exact)
    ideal = np.array(all_ideal)
    noisy = np.array(all_noisy)
    mitig = np.array(all_mitig)

    print(f"\nMAE ideal:     {np.mean(np.abs(ideal - exact)):.5f} Ha")
    print(f"MAE noisy:     {np.mean(np.abs(noisy - exact)):.5f} Ha")
    print(f"MAE mitigated: {np.mean(np.abs(mitig - exact)):.5f} Ha")
    if np.mean(np.abs(mitig - exact)) > 0:
        ratio = np.mean(np.abs(noisy - exact)) / np.mean(np.abs(mitig - exact))
        print(f"Improvement:   {ratio:.1f}x")
