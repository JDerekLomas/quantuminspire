"""
Run H2 VQE on IBM Quantum hardware — full Hamiltonian measurement.

Previous version only measured Z-diagonal terms (~70% of H2 energy).
This version adds basis-rotated circuits for XXYY terms to get the complete energy.

For each bond distance, submits:
  - 1 Z-basis circuit (for I, Z, ZZ terms — with symmetry verification)
  - 1 circuit per unique non-Z Pauli group (XXYY, YYXX — raw measurement)
"""
import numpy as np
from collections import defaultdict
from qiskit import QuantumCircuit, transpile
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2
import pennylane as qml
from pennylane import numpy as pnp
from scipy.optimize import minimize_scalar
from openfermion import MolecularData, jordan_wigner
from openfermionpyscf import run_pyscf


def h2_data(R):
    """Compute H2 Hamiltonian terms and FCI energy at bond distance R."""
    mol = MolecularData([('H', (0, 0, 0)), ('H', (0, 0, R))], 'sto-3g', 1, 0)
    mol = run_pyscf(mol, run_fci=True)
    qh = jordan_wigner(mol.get_molecular_hamiltonian())
    terms = [(c.real, list(t)) for t, c in qh.terms.items() if abs(c) > 1e-10]
    return terms, mol.fci_energy


def optimal_theta(R):
    """Find optimal VQE angle via PennyLane statevector simulation."""
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


def get_state_vector(theta, n_qubits=4):
    """Get 4-qubit VQE state vector, converted to Qiskit bit ordering.

    PennyLane uses big-endian (q0 = MSB of index), Qiskit uses little-endian
    (q0 = LSB). We reverse the bit order of each index to convert.
    """
    dev = qml.device('default.qubit', wires=n_qubits)

    @qml.qnode(dev)
    def circuit():
        qml.BasisState(np.array([1, 1, 0, 0]), wires=[0, 1, 2, 3])
        qml.DoubleExcitation(theta, wires=[0, 1, 2, 3])
        return qml.state()

    pl_state = np.array(circuit())

    # Reorder: PennyLane index i → Qiskit index with reversed bits
    qk_state = np.zeros_like(pl_state)
    for i in range(len(pl_state)):
        j = int(format(i, f'0{n_qubits}b')[::-1], 2)
        qk_state[j] = pl_state[i]
    return qk_state


def classify_terms(terms):
    """Split Hamiltonian terms by measurement basis.

    Returns:
        identity_coeff: constant energy offset
        z_terms: [(coeff, [(qubit, 'Z'), ...])] — measurable in computational basis
        basis_groups: {pauli_signature: [(coeff, [(qubit, pauli), ...])]}
            One entry per unique non-Z Pauli string (e.g. XXYY, YYXX)
    """
    identity_coeff = 0.0
    z_terms = []
    basis_groups = defaultdict(list)

    for coeff, paulis in terms:
        if len(paulis) == 0:
            identity_coeff += coeff
            continue
        if all(p == 'Z' for _, p in paulis):
            z_terms.append((coeff, paulis))
        else:
            sig = tuple(sorted(paulis))
            basis_groups[sig].append((coeff, paulis))

    return identity_coeff, z_terms, dict(basis_groups)


def build_all_circuits(bond_distances):
    """Build measurement circuits for all bond distances and all bases.

    For each R: 1 Z-basis circuit + 1 circuit per non-Z Pauli group.
    """
    all_circuits = []
    circuit_map = []  # (R_index, basis_type, terms_for_this_circuit, identity_coeff)
    all_metadata = []

    for i, R in enumerate(bond_distances):
        terms, fci = h2_data(R)
        theta = optimal_theta(R)
        state = get_state_vector(theta)
        identity_coeff, z_terms, basis_groups = classify_terms(terms)

        all_metadata.append((R, terms, fci, theta, identity_coeff))
        print(f"  R={R:.1f}: FCI={fci:.5f}, theta={theta:.4f}, "
              f"{len(z_terms)} Z-terms, {len(basis_groups)} rotated groups")

        # Z-basis circuit
        qc_z = QuantumCircuit(4)
        qc_z.initialize(state, [0, 1, 2, 3])
        qc_z.measure_all()
        all_circuits.append(qc_z)
        circuit_map.append((i, 'Z', z_terms, identity_coeff))

        # Rotated-basis circuits
        for sig, sig_terms in basis_groups.items():
            qc = QuantumCircuit(4)
            qc.initialize(state, [0, 1, 2, 3])

            # Rotate each qubit so its Pauli becomes Z
            #   X -> Z: apply H
            #   Y -> Z: apply S†H
            for q, p in sig:
                if p == 'X':
                    qc.h(q)
                elif p == 'Y':
                    qc.sdg(q)
                    qc.h(q)

            qc.measure_all()
            all_circuits.append(qc)
            # After rotation all paulis act as Z — remap for counting
            rotated_terms = [(c, [(q, 'Z') for q, _ in ps]) for c, ps in sig_terms]
            circuit_map.append((i, sig, rotated_terms, 0.0))

    return all_circuits, circuit_map, all_metadata


def energy_from_counts(counts, total_shots, z_terms, identity_coeff=0.0):
    """Compute energy from Z-basis measurement counts."""
    energy = identity_coeff
    for coeff, paulis in z_terms:
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


def energy_from_counts_sv(counts, total_shots, z_terms, identity_coeff=0.0):
    """Energy with even-parity post-selection (only valid for Z-diagonal terms)."""
    sv_counts = {bs: c for bs, c in counts.items()
                 if sum(int(b) for b in bs) % 2 == 0}
    sv_shots = sum(sv_counts.values())
    if sv_shots == 0:
        return energy_from_counts(counts, total_shots, z_terms, identity_coeff), 0.0

    energy = identity_coeff
    for coeff, paulis in z_terms:
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

    SHOTS = 8192
    bond_distances = [0.5, 0.7, 0.9, 1.1, 1.5, 2.0]

    print("\nBuilding circuits (all measurement bases)...")
    all_circuits, circuit_map, all_metadata = build_all_circuits(bond_distances)

    print(f"\nTranspiling {len(all_circuits)} circuits...")
    transpiled = transpile(all_circuits, backend=backend, optimization_level=3)
    for i, qc_t in enumerate(transpiled):
        r_idx, basis, _, _ = circuit_map[i]
        R = bond_distances[r_idx]
        basis_label = 'Z' if basis == 'Z' else ''.join(p for _, p in basis)
        print(f"  R={R:.1f} [{basis_label}]: depth={qc_t.depth()}")

    print(f"\nSubmitting {len(transpiled)} circuits to {backend.name} ({SHOTS} shots each)...")
    sampler = SamplerV2(backend)
    job = sampler.run(transpiled, shots=SHOTS)
    print(f"Job ID: {job.job_id()}")
    print("Waiting for results...")
    result = job.result()

    # Aggregate per bond distance
    n_R = len(bond_distances)
    energies_raw = [0.0] * n_R
    energies_sv = [0.0] * n_R
    keep_fracs = [1.0] * n_R

    for i, (r_idx, basis_type, terms, id_coeff) in enumerate(circuit_map):
        counts = result[i].data.meas.get_counts()

        if basis_type == 'Z':
            # Z-basis: compute raw + symmetry-verified
            energies_raw[r_idx] += energy_from_counts(counts, SHOTS, terms, id_coeff)
            e_sv, kf = energy_from_counts_sv(counts, SHOTS, terms, id_coeff)
            energies_sv[r_idx] += e_sv
            keep_fracs[r_idx] = kf
        else:
            # Rotated basis: raw only (parity post-selection not applicable)
            e = energy_from_counts(counts, SHOTS, terms, 0.0)
            energies_raw[r_idx] += e
            energies_sv[r_idx] += e

    # Print results
    print(f"\n{'R':>5} | {'FCI':>9} | {'Raw':>9} | {'SV':>9} | "
          f"{'Err_raw':>7} | {'Err_sv':>7} | {'Keep%':>5}")
    print("-" * 72)

    for i, (R, terms, fci, theta, id_coeff) in enumerate(all_metadata):
        print(f"{R:5.1f} | {fci:9.5f} | {energies_raw[i]:9.5f} | {energies_sv[i]:9.5f} | "
              f"{abs(energies_raw[i]-fci):7.4f} | {abs(energies_sv[i]-fci):7.4f} | "
              f"{100*keep_fracs[i]:5.1f}")

    fci_arr = np.array([m[2] for m in all_metadata])
    raw_arr = np.array(energies_raw)
    sv_arr = np.array(energies_sv)

    print(f"\nMAE raw:  {np.mean(np.abs(raw_arr - fci_arr)):.5f} Ha")
    print(f"MAE SV:   {np.mean(np.abs(sv_arr - fci_arr)):.5f} Ha")
    if np.mean(np.abs(sv_arr - fci_arr)) > 0:
        print(f"Improvement: {np.mean(np.abs(raw_arr - fci_arr)) / np.mean(np.abs(sv_arr - fci_arr)):.1f}x")

    print(f"\nBackend: {backend.name}")
    print(f"Shots per circuit: {SHOTS}")
    print(f"Total circuits: {len(transpiled)}")
