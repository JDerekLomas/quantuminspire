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
import os
os.environ['PYTHONUNBUFFERED'] = '1'
sys.stdout.reconfigure(line_buffering=True)


# ── Hamiltonian generation ──────────────────────────────────────

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
    h_active = mol.get_molecular_hamiltonian(
        occupied_indices=[0], active_indices=[1, 2, 3, 4, 5]
    )
    ferm = get_fermion_operator(h_active)
    qh = jordan_wigner(ferm)
    n_q = max((max(q for q, _ in term) for term in qh.terms if term), default=-1) + 1
    H = openfermion_to_pennylane(qh, n_q)
    return H, mol.fci_energy, n_q


# ── VQE with hardware-efficient ansatz ──────────────────────────

def n_params(n_qubits, depth=1):
    """Number of variational parameters: N * (3d + 2)."""
    return n_qubits * (3 * depth + 2)


def run_vqe(H, n_qubits, n_electrons, depth=1, n_restarts=3, max_iter=500,
            warm_start=None):
    """Run VQE with HF state + hardware-efficient ansatz."""
    dev = qml.device('default.qubit', wires=n_qubits)
    n_p = n_params(n_qubits, depth)

    # HF state: first n_electrons qubits occupied
    hf_state = np.zeros(n_qubits, dtype=int)
    hf_state[:n_electrons] = 1

    @qml.qnode(dev)
    def circuit(params):
        qml.BasisState(hf_state, wires=list(range(n_qubits)))
        idx = 0
        for q in range(n_qubits):
            qml.RX(params[idx], wires=q); idx += 1
            qml.RZ(params[idx], wires=q); idx += 1
        for _ in range(depth):
            for q in range(n_qubits - 1):
                qml.CNOT(wires=[q, q + 1])
            for q in range(n_qubits):
                qml.RZ(params[idx], wires=q); idx += 1
                qml.RX(params[idx], wires=q); idx += 1
                qml.RZ(params[idx], wires=q); idx += 1
        return qml.expval(H)

    best_energy = float('inf')
    best_params = None

    # Build initial points: warm start + random
    init_points = []
    if warm_start is not None:
        init_points.append(warm_start + np.random.uniform(-0.05, 0.05, n_p))
    for _ in range(n_restarts):
        init_points.append(np.random.uniform(-0.3, 0.3, n_p))

    for p0 in init_points:
        try:
            result = minimize(
                lambda p: float(circuit(pnp.array(p))),
                p0,
                method='COBYLA',
                options={'maxiter': max_iter, 'rhobeg': 0.5}
            )
            if result.fun < best_energy:
                best_energy = result.fun
                best_params = result.x.copy()
        except Exception as e:
            print(f"  Restart failed: {e}", flush=True)

    return best_energy, best_params


# ── H2 sweep ───────────────────────────────────────────────────

def run_h2_sweep():
    """Replicate H2 potential energy curve (Fig. 1a of Kandala 2017)."""
    distances = [0.3, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.7, 2.0, 2.5]
    results = []

    print("=" * 65, flush=True)
    print("H2 — Hardware-Efficient Ansatz (d=1, 4 qubits JW)", flush=True)
    print("=" * 65, flush=True)
    print(f"{'R':>5} | {'FCI':>10} | {'VQE':>10} | {'Err(mHa)':>8} | Status", flush=True)
    print("-" * 55, flush=True)

    prev_params = None
    for R in distances:
        R = round(R, 2)
        H, fci = h2_hamiltonian(R)
        vqe_e, best_p = run_vqe(H, n_qubits=4, n_electrons=2, depth=1,
                                 n_restarts=3, max_iter=400, warm_start=prev_params)
        prev_params = best_p
        err_mha = abs(vqe_e - fci) * 1000
        results.append({
            'bond_distance': float(R),
            'fci_energy': float(fci),
            'vqe_energy': float(vqe_e),
            'error_mhartree': float(err_mha),
            'chemical_accuracy': bool(err_mha < 1.6),
        })
        print(f"{R:5.2f} | {fci:10.6f} | {vqe_e:10.6f} | {err_mha:8.3f} | {'PASS' if err_mha < 1.6 else 'FAIL'}", flush=True)

    errors = [r['error_mhartree'] for r in results]
    n_pass = sum(1 for r in results if r['chemical_accuracy'])
    mae = np.mean(errors)
    print("-" * 55)
    print(f"MAE: {mae:.3f} mHa | Chem. accuracy: {n_pass}/{len(results)}")
    return results, mae


# ── LiH sweep ──────────────────────────────────────────────────

def run_lih_sweep():
    """Replicate LiH potential energy curve (Fig. 1c of Kandala 2017)."""
    distances = np.arange(1.0, 3.05, 0.25)
    results = []

    # Determine qubit count
    _, _, n_q = lih_hamiltonian(1.6)

    print("\n" + "=" * 65)
    print(f"LiH — Hardware-Efficient Ansatz (d=1, {n_q} qubits JW)")
    print("  Paper used 4-qubit parity mapping; d=8 needed for chem. accuracy")
    print("=" * 65)
    print(f"{'R':>5} | {'FCI':>10} | {'VQE':>10} | {'Err(mHa)':>8} | Status")
    print("-" * 55)

    for R in distances:
        R = round(R, 2)
        H, fci, n_q = lih_hamiltonian(R)
        # 2 active electrons (Li 1s frozen)
        vqe_e, _ = run_vqe(H, n_qubits=n_q, n_electrons=2, depth=1,
                            n_restarts=5, max_iter=800)
        err_mha = abs(vqe_e - fci) * 1000
        results.append({
            'bond_distance': R,
            'fci_energy': fci,
            'vqe_energy': vqe_e,
            'error_mhartree': err_mha,
            'chemical_accuracy': err_mha < 1.6,
        })
        print(f"{R:5.2f} | {fci:10.6f} | {vqe_e:10.6f} | {err_mha:8.3f} | {'PASS' if err_mha < 1.6 else 'FAIL'}")

    errors = [r['error_mhartree'] for r in results]
    n_pass = sum(1 for r in results if r['chemical_accuracy'])
    mae = np.mean(errors)
    print("-" * 55)
    print(f"MAE: {mae:.3f} mHa | Chem. accuracy: {n_pass}/{len(results)}")
    return results, mae


# ── Save ────────────────────────────────────────────────────────

def save_results(h2_results, h2_mae, lih_results=None, lih_mae=None):
    ts = datetime.datetime.now().isoformat()

    h2_data = {
        'experiment_id': 'kandala2017-h2-sweep',
        'paper': 'Kandala et al., Nature 549, 242 (2017)',
        'arxiv': '1704.05018',
        'molecule': 'H2',
        'basis': 'STO-3G',
        'mapping': 'jordan_wigner',
        'n_qubits': 4,
        'ansatz': 'hardware_efficient_d1',
        'n_parameters': 20,
        'timestamp': ts,
        'results_by_distance': h2_results,
        'summary': {
            'mae_mhartree': h2_mae,
            'n_distances': len(h2_results),
            'n_chemical_accuracy': sum(1 for r in h2_results if r['chemical_accuracy']),
        },
    }
    with open('experiments/results/kandala2017-h2-sweep.json', 'w') as f:
        json.dump(h2_data, f, indent=2)
    print(f"\nSaved: experiments/results/kandala2017-h2-sweep.json")

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
            'n_parameters': 50,
            'note': 'Paper used 4-qubit parity mapping; we use 10-qubit JW',
            'timestamp': ts,
            'results_by_distance': lih_results,
            'summary': {
                'mae_mhartree': lih_mae,
                'n_distances': len(lih_results),
                'n_chemical_accuracy': sum(1 for r in lih_results if r['chemical_accuracy']),
            },
        }
        with open('experiments/results/kandala2017-lih-sweep.json', 'w') as f:
            json.dump(lih_data, f, indent=2)
        print(f"Saved: experiments/results/kandala2017-lih-sweep.json")


if __name__ == '__main__':
    do_lih = '--lih' in sys.argv or '--all' in sys.argv

    h2_results, h2_mae = run_h2_sweep()

    lih_results, lih_mae = None, None
    if do_lih:
        lih_results, lih_mae = run_lih_sweep()

    save_results(h2_results, h2_mae, lih_results, lih_mae)

    print("\n" + "=" * 65)
    print("SUMMARY — Kandala et al. 2017 Replication")
    print("=" * 65)
    n_pass_h2 = sum(1 for r in h2_results if r['chemical_accuracy'])
    print(f"H2:  MAE = {h2_mae:.3f} mHa, chem. acc. {n_pass_h2}/{len(h2_results)}")
    if lih_results:
        n_pass_lih = sum(1 for r in lih_results if r['chemical_accuracy'])
        print(f"LiH: MAE = {lih_mae:.3f} mHa, chem. acc. {n_pass_lih}/{len(lih_results)}")
