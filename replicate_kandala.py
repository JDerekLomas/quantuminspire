"""
Replication: "Hardware-efficient variational quantum eigensolver for small molecules
and quantum magnets"
Kandala et al., Nature 549, 242 (2017)
https://arxiv.org/abs/1704.05018

Replicates:
  - H2 potential energy curve with hardware-efficient ansatz (4-qubit JW)
  - LiH potential energy curve with frozen-core active space (10-qubit JW)
  - Both at depth d=1

Key differences from original:
  - Original used parity mapping + Z2 reduction (2/4/6 qubits)
  - We use Jordan-Wigner (4/10 qubits) since parity mapping not in OpenFermion
  - Physics is identical; only circuit width differs
"""

import numpy as np
import pennylane as qml
from pennylane import numpy as pnp
from scipy.optimize import minimize
from openfermion import MolecularData, jordan_wigner, get_fermion_operator
from openfermionpyscf import run_pyscf
import json
import datetime
import sys


# ── Hamiltonian generation ──────────────────────────────────────

def h2_hamiltonian(R):
    """H2 Hamiltonian via JW mapping (4 qubits)."""
    mol = MolecularData([('H', (0, 0, 0)), ('H', (0, 0, R))], 'sto-3g', 1, 0)
    mol = run_pyscf(mol, run_fci=True)
    qh = jordan_wigner(mol.get_molecular_hamiltonian())
    H = openfermion_to_pennylane(qh, 4)
    return H, mol.fci_energy


def lih_hamiltonian(R):
    """LiH Hamiltonian with frozen 1s core (10 qubits via JW)."""
    mol = MolecularData([('Li', (0, 0, 0)), ('H', (0, 0, R))], 'sto-3g', 1, 0)
    mol = run_pyscf(mol, run_fci=True)
    # Freeze Li 1s orbital, keep 5 spatial (10 spin) orbitals active
    h_active = mol.get_molecular_hamiltonian(
        occupied_indices=[0], active_indices=[1, 2, 3, 4, 5]
    )
    ferm = get_fermion_operator(h_active)
    qh = jordan_wigner(ferm)
    # Determine actual qubit count
    if qh.terms:
        n_q = max((max(q for q, _ in term) for term in qh.terms if term), default=-1) + 1
    else:
        n_q = 10
    H = openfermion_to_pennylane(qh, n_q)
    return H, mol.fci_energy, n_q


def openfermion_to_pennylane(qubit_op, n_qubits):
    """Convert OpenFermion QubitOperator to PennyLane Hamiltonian."""
    coeffs, ops = [], []
    for term, coeff in qubit_op.terms.items():
        if abs(coeff) < 1e-10:
            continue
        if len(term) == 0:
            ops.append(qml.Identity(0))
        else:
            pauli_ops = []
            for q, p in term:
                if p == 'X':
                    pauli_ops.append(qml.X(q))
                elif p == 'Y':
                    pauli_ops.append(qml.Y(q))
                elif p == 'Z':
                    pauli_ops.append(qml.Z(q))
            ops.append(qml.prod(*pauli_ops) if len(pauli_ops) > 1 else pauli_ops[0])
        coeffs.append(coeff.real)
    return qml.Hamiltonian(coeffs, ops)


# ── Hardware-efficient ansatz ───────────────────────────────────

def hardware_efficient_ansatz(params, n_qubits, depth=1):
    """Kandala-style hardware-efficient ansatz.

    Structure per depth layer:
      - Rotation layer: Rz(θ) Rx(θ) Rz(θ) per qubit (first layer: Rx Rz only)
      - Entangling layer: linear CNOT chain

    Total parameters: n_qubits * (3*depth + 2)
    """
    idx = 0

    # First rotation layer: Rx, Rz per qubit (Rz on |0> is trivial)
    for q in range(n_qubits):
        qml.RX(params[idx], wires=q)
        idx += 1
        qml.RZ(params[idx], wires=q)
        idx += 1

    for d in range(depth):
        # Entangling layer: linear CNOT chain
        for q in range(n_qubits - 1):
            qml.CNOT(wires=[q, q + 1])

        # Full rotation layer: Rz, Rx, Rz per qubit
        for q in range(n_qubits):
            qml.RZ(params[idx], wires=q)
            idx += 1
            qml.RX(params[idx], wires=q)
            idx += 1
            qml.RZ(params[idx], wires=q)
            idx += 1

    return idx  # number of parameters consumed


def n_params(n_qubits, depth=1):
    """Number of variational parameters."""
    return n_qubits * (3 * depth + 2)


# ── VQE runner ──────────────────────────────────────────────────

def run_vqe(H, n_qubits, depth=1, n_restarts=5, max_iter=500):
    """Run VQE with hardware-efficient ansatz, multiple random restarts."""
    dev = qml.device('default.qubit', wires=n_qubits)
    n_p = n_params(n_qubits, depth)

    @qml.qnode(dev)
    def circuit(params):
        hardware_efficient_ansatz(params, n_qubits, depth)
        return qml.expval(H)

    best_energy = float('inf')
    best_params = None

    for restart in range(n_restarts):
        # Small random initial parameters (close to |0...0>)
        p0 = np.random.uniform(-0.1, 0.1, n_p)

        try:
            result = minimize(
                lambda p: float(circuit(pnp.array(p))),
                p0,
                method='COBYLA',
                options={'maxiter': max_iter, 'rhobeg': 0.5}
            )
            energy = result.fun
            if energy < best_energy:
                best_energy = energy
                best_params = result.x
        except Exception as e:
            print(f"  Restart {restart} failed: {e}")

    return best_energy, best_params


# ── Main: H2 sweep ─────────────────────────────────────────────

def run_h2_sweep():
    """Replicate H2 potential energy curve (Fig. 1a of Kandala 2017)."""
    distances = np.arange(0.3, 2.55, 0.1)
    results = []

    print("=" * 70)
    print("H2 Potential Energy Curve — Hardware-Efficient Ansatz (depth=1)")
    print("=" * 70)
    print(f"{'R(A)':>6} | {'FCI':>10} | {'VQE':>10} | {'Error':>8} | {'mHa':>6}")
    print("-" * 55)

    for R in distances:
        R = round(R, 2)
        H, fci = h2_hamiltonian(R)
        vqe_energy, _ = run_vqe(H, n_qubits=4, depth=1, n_restarts=8, max_iter=600)

        err = vqe_energy - fci
        err_mha = abs(err) * 1000

        results.append({
            'bond_distance': R,
            'fci_energy': fci,
            'vqe_energy': vqe_energy,
            'error_hartree': err,
            'error_mhartree': err_mha,
            'chemical_accuracy': err_mha < 1.6
        })

        status = "PASS" if err_mha < 1.6 else f"FAIL"
        print(f"{R:6.2f} | {fci:10.6f} | {vqe_energy:10.6f} | {err:+8.5f} | {err_mha:6.2f} {status}")

    # Summary
    errors = [r['error_mhartree'] for r in results]
    n_pass = sum(1 for r in results if r['chemical_accuracy'])
    mae = np.mean(errors)
    max_err = max(errors)

    print("-" * 55)
    print(f"MAE: {mae:.3f} mHa | Max: {max_err:.3f} mHa | Chemical accuracy: {n_pass}/{len(results)}")

    return results, mae, max_err


# ── Main: LiH sweep ────────────────────────────────────────────

def run_lih_sweep():
    """Replicate LiH potential energy curve (Fig. 1c of Kandala 2017)."""
    distances = np.arange(1.0, 3.05, 0.2)
    results = []

    print("\n" + "=" * 70)
    print("LiH Potential Energy Curve — Hardware-Efficient Ansatz (depth=1)")
    print("  NOTE: Using 10-qubit JW mapping (paper used 4-qubit parity)")
    print("  NOTE: Paper found d=8 needed for chemical accuracy on LiH")
    print("=" * 70)

    # First, check qubit count
    _, _, n_q = lih_hamiltonian(1.595)
    print(f"Qubit count: {n_q}, Parameters: {n_params(n_q, 1)}")
    print(f"{'R(A)':>6} | {'FCI':>10} | {'VQE':>10} | {'Error':>8} | {'mHa':>6}")
    print("-" * 55)

    for R in distances:
        R = round(R, 2)
        H, fci, n_q = lih_hamiltonian(R)
        # More restarts for larger system
        vqe_energy, _ = run_vqe(H, n_qubits=n_q, depth=1, n_restarts=10, max_iter=1000)

        err = vqe_energy - fci
        err_mha = abs(err) * 1000

        results.append({
            'bond_distance': R,
            'fci_energy': fci,
            'vqe_energy': vqe_energy,
            'error_hartree': err,
            'error_mhartree': err_mha,
            'chemical_accuracy': err_mha < 1.6
        })

        status = "PASS" if err_mha < 1.6 else "FAIL"
        print(f"{R:6.2f} | {fci:10.6f} | {vqe_energy:10.6f} | {err:+8.5f} | {err_mha:6.2f} {status}")

    errors = [r['error_mhartree'] for r in results]
    n_pass = sum(1 for r in results if r['chemical_accuracy'])
    mae = np.mean(errors)
    max_err = max(errors)

    print("-" * 55)
    print(f"MAE: {mae:.3f} mHa | Max: {max_err:.3f} mHa | Chemical accuracy: {n_pass}/{len(results)}")

    return results, mae, max_err


# ── Save results ────────────────────────────────────────────────

def save_results(h2_results, h2_mae, h2_max, lih_results=None, lih_mae=None, lih_max=None):
    """Save to experiments/results/kandala2017-*.json"""
    timestamp = datetime.datetime.now().isoformat()

    # H2
    h2_data = {
        'experiment_id': 'kandala2017-h2-sweep',
        'paper': 'Kandala et al., Nature 549, 242 (2017)',
        'arxiv': '1704.05018',
        'molecule': 'H2',
        'basis': 'STO-3G',
        'mapping': 'jordan_wigner',
        'n_qubits': 4,
        'ansatz': 'hardware_efficient_d1',
        'ansatz_depth': 1,
        'n_parameters': 20,
        'optimizer': 'COBYLA',
        'timestamp': timestamp,
        'results_by_distance': h2_results,
        'summary': {
            'mae_mhartree': h2_mae,
            'max_error_mhartree': h2_max,
            'n_distances': len(h2_results),
            'n_chemical_accuracy': sum(1 for r in h2_results if r['chemical_accuracy']),
            'equilibrium_result': next(
                (r for r in h2_results if abs(r['bond_distance'] - 0.7) < 0.1), None
            ),
        }
    }

    with open('experiments/results/kandala2017-h2-sweep.json', 'w') as f:
        json.dump(h2_data, f, indent=2)
    print(f"\nSaved H2 results to experiments/results/kandala2017-h2-sweep.json")

    # LiH
    if lih_results:
        lih_data = {
            'experiment_id': 'kandala2017-lih-sweep',
            'paper': 'Kandala et al., Nature 549, 242 (2017)',
            'arxiv': '1704.05018',
            'molecule': 'LiH',
            'basis': 'STO-3G',
            'mapping': 'jordan_wigner',
            'n_qubits': 10,
            'ansatz': 'hardware_efficient_d1',
            'ansatz_depth': 1,
            'n_parameters': 50,
            'note': 'Paper used 4-qubit parity mapping; we use 10-qubit JW',
            'optimizer': 'COBYLA',
            'timestamp': timestamp,
            'results_by_distance': lih_results,
            'summary': {
                'mae_mhartree': lih_mae,
                'max_error_mhartree': lih_max,
                'n_distances': len(lih_results),
                'n_chemical_accuracy': sum(1 for r in lih_results if r['chemical_accuracy']),
                'equilibrium_result': next(
                    (r for r in lih_results if abs(r['bond_distance'] - 1.6) < 0.15), None
                ),
            }
        }

        with open('experiments/results/kandala2017-lih-sweep.json', 'w') as f:
            json.dump(lih_data, f, indent=2)
        print(f"Saved LiH results to experiments/results/kandala2017-lih-sweep.json")


if __name__ == '__main__':
    run_lih = '--lih' in sys.argv or '--all' in sys.argv

    h2_results, h2_mae, h2_max = run_h2_sweep()

    lih_results, lih_mae, lih_max = None, None, None
    if run_lih:
        lih_results, lih_mae, lih_max = run_lih_sweep()

    save_results(h2_results, h2_mae, h2_max, lih_results, lih_mae, lih_max)

    print("\n" + "=" * 70)
    print("REPLICATION SUMMARY — Kandala et al. 2017")
    print("=" * 70)
    print(f"H2 (4-qubit JW):  MAE = {h2_mae:.3f} mHa, chemical accuracy at {sum(1 for r in h2_results if r['chemical_accuracy'])}/{len(h2_results)} distances")
    if lih_results:
        print(f"LiH (10-qubit JW): MAE = {lih_mae:.3f} mHa, chemical accuracy at {sum(1 for r in lih_results if r['chemical_accuracy'])}/{len(lih_results)} distances")
    else:
        print("LiH: skipped (use --lih or --all to include)")
