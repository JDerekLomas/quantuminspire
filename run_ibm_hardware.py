"""
Run H2 VQE on IBM Quantum hardware.
Pre-computes optimal angles via PennyLane simulation, then runs on real QPU.
"""
import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit.quantum_info import Operator
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2
import pennylane as qml
from pennylane import numpy as pnp
from scipy.optimize import minimize_scalar
from openfermion import MolecularData, jordan_wigner
from openfermionpyscf import run_pyscf


def h2_data(R):
    """Compute H2 Hamiltonian terms and FCI energy."""
    mol = MolecularData([('H', (0, 0, 0)), ('H', (0, 0, R))], 'sto-3g', 1, 0)
    mol = run_pyscf(mol, run_fci=True)
    qh = jordan_wigner(mol.get_molecular_hamiltonian())
    terms = [(c.real, list(t)) for t, c in qh.terms.items() if abs(c) > 1e-10]
    return terms, mol.fci_energy


def optimal_theta(R):
    """Find optimal VQE angle using PennyLane statevector simulation."""
    mol = MolecularData([('H', (0, 0, 0)), ('H', (0, 0, R))], 'sto-3g', 1, 0)
    mol = run_pyscf(mol, run_fci=True)
    qh = jordan_wigner(mol.get_molecular_hamiltonian())

    coeffs, ops = [], []
    for term, coeff in qh.terms.items():
        if abs(coeff) < 1e-10:
            continue
        if len(term) == 0:
            ops.append(qml.Identity(0))
        else:
            pauli_ops = []
            for q, p in term:
                if p == 'X': pauli_ops.append(qml.X(q))
                elif p == 'Y': pauli_ops.append(qml.Y(q))
                elif p == 'Z': pauli_ops.append(qml.Z(q))
            ops.append(qml.prod(*pauli_ops) if len(pauli_ops) > 1 else pauli_ops[0])
        coeffs.append(coeff.real)
    H = qml.Hamiltonian(coeffs, ops)

    dev = qml.device('default.qubit', wires=4)

    @qml.qnode(dev)
    def circuit(theta):
        qml.BasisState(np.array([1, 1, 0, 0]), wires=[0, 1, 2, 3])
        qml.DoubleExcitation(theta, wires=[0, 1, 2, 3])
        return qml.expval(H)

    result = minimize_scalar(lambda t: float(circuit(pnp.array(t))),
                             bounds=(-np.pi, np.pi), method='bounded')
    return float(result.x)


def vqe_circuit_unitary(theta):
    """Get the 4-qubit unitary for HF + DoubleExcitation(theta) via PennyLane."""
    dev = qml.device('default.qubit', wires=4)

    @qml.qnode(dev)
    def circuit():
        qml.BasisState(np.array([1, 1, 0, 0]), wires=[0, 1, 2, 3])
        qml.DoubleExcitation(theta, wires=[0, 1, 2, 3])
        return qml.state()

    state = circuit()
    return np.array(state)


def build_qiskit_circuit(theta):
    """Build Qiskit circuit that prepares the VQE state."""
    # Get target state from PennyLane (guaranteed correct)
    target_state = vqe_circuit_unitary(theta)

    qc = QuantumCircuit(4)
    qc.initialize(target_state, [0, 1, 2, 3])
    return qc


def energy_from_counts(counts, terms, total_shots):
    """Compute <H> from Z-basis measurement counts (Z-diagonal terms only)."""
    energy = 0.0
    for coeff, paulis in terms:
        if len(paulis) == 0:
            energy += coeff
            continue
        if not all(p in ('Z', 'I') for _, p in paulis):
            continue  # Skip non-Z terms (need basis rotation)
        z_qubits = [q for q, p in paulis if p == 'Z']
        ev = 0.0
        for bitstring, count in counts.items():
            sign = 1
            for q in z_qubits:
                if bitstring[-(q + 1)] == '1':
                    sign *= -1
            ev += sign * count
        energy += coeff * ev / total_shots
    return energy


def energy_from_counts_sv(counts, terms, total_shots):
    """Compute <H> with symmetry verification (even-parity post-selection)."""
    sv_counts = {bs: c for bs, c in counts.items()
                 if sum(int(b) for b in bs) % 2 == 0}
    sv_shots = sum(sv_counts.values())
    if sv_shots == 0:
        return energy_from_counts(counts, terms, total_shots), 0.0

    energy = 0.0
    for coeff, paulis in terms:
        if len(paulis) == 0:
            energy += coeff
            continue
        if not all(p in ('Z', 'I') for _, p in paulis):
            continue
        z_qubits = [q for q, p in paulis if p == 'Z']
        ev = 0.0
        for bitstring, count in sv_counts.items():
            sign = 1
            for q in z_qubits:
                if bitstring[-(q + 1)] == '1':
                    sign *= -1
            ev += sign * count
        energy += coeff * ev / sv_shots
    return energy, sv_shots / total_shots


if __name__ == "__main__":
    print("Connecting to IBM Quantum...")
    service = QiskitRuntimeService(channel='ibm_cloud')
    backend = service.least_busy(operational=True, min_num_qubits=4)
    print(f"Backend: {backend.name} ({backend.num_qubits}q)")

    SHOTS = 4096
    bond_distances = [0.5, 0.7, 0.9, 1.1, 1.5, 2.0]

    # Pre-compute everything locally
    print("\nPre-computing optimal angles and building circuits...")
    circuits = []
    metadata = []

    for R in bond_distances:
        terms, fci = h2_data(R)
        theta = optimal_theta(R)
        print(f"  R={R:.1f}: FCI={fci:.5f}, theta={theta:.4f}")

        qc = build_qiskit_circuit(theta)
        qc.measure_all()
        qc_t = transpile(qc, backend=backend, optimization_level=3)
        print(f"    Transpiled: depth={qc_t.depth()}")

        circuits.append(qc_t)
        metadata.append((R, terms, fci))

    # Submit all circuits
    print(f"\nSubmitting {len(circuits)} circuits to {backend.name}...")
    sampler = SamplerV2(backend)
    job = sampler.run(circuits, shots=SHOTS)
    print(f"Job ID: {job.job_id()}")
    print("Waiting for results...")
    result = job.result()

    # Process
    print(f"\n{'R':>5} | {'FCI':>9} | {'Raw':>9} | {'SV':>9} | {'Err_raw':>7} | {'Err_sv':>7} | {'Keep%':>5}")
    print("-" * 70)

    for i, (R, terms, fci) in enumerate(metadata):
        pub_result = result[i]
        counts = pub_result.data.meas.get_counts()

        e_raw = energy_from_counts(counts, terms, SHOTS)
        e_sv, keep_frac = energy_from_counts_sv(counts, terms, SHOTS)

        print(f"{R:5.1f} | {fci:9.5f} | {e_raw:9.5f} | {e_sv:9.5f} | "
              f"{abs(e_raw-fci):7.4f} | {abs(e_sv-fci):7.4f} | {100*keep_frac:5.1f}")

    print(f"\nBackend: {backend.name}")
    print(f"Shots: {SHOTS}")
    print("Note: Z-diagonal terms only. Full energy requires X/Y measurement circuits.")
