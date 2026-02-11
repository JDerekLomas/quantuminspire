#!/usr/bin/env python3
"""Kim 2023 replication on IBM Torino: Kicked Ising with TREX.

Submits kicked Ising circuits at multiple Trotter depths and theta_h values.
Measures M_z = (1/N) sum <Z_i> using EstimatorV2 with TREX.

Based on: Kim et al., Nature 618, 500-505 (2023)
Original: 127 qubits, heavy-hex, PEA mitigation
This: 9 qubits (Tuna-9 topology), TREX mitigation on IBM Torino
"""
import numpy as np
import json
import sys
import os
from datetime import datetime, timezone
from pathlib import Path

os.environ['PYTHONUNBUFFERED'] = '1'
sys.stdout.reconfigure(line_buffering=True)

# Constants
N_QUBITS = 9
THETA_J = -np.pi / 4
RESULTS_DIR = Path("experiments/results")

# Tuna-9 topology (10 edges)
EDGES = [
    (0, 1), (0, 2), (1, 3), (1, 4), (2, 4),
    (2, 5), (3, 6), (4, 6), (6, 8), (7, 8),
]


def build_kicked_ising(theta_h, theta_j, n_steps):
    """Build kicked Ising circuit in Qiskit."""
    from qiskit import QuantumCircuit
    qc = QuantumCircuit(N_QUBITS)
    for _ in range(n_steps):
        # Single-qubit kicks (transverse field)
        if abs(theta_h) > 1e-10:
            for q in range(N_QUBITS):
                qc.rx(2 * theta_h, q)
        # Two-qubit ZZ interactions
        for i, j in EDGES:
            qc.rzz(2 * theta_j, i, j)
    return qc


def build_mz_observable():
    """Build M_z = (1/N) sum Z_i as SparsePauliOp."""
    from qiskit.quantum_info import SparsePauliOp
    terms = []
    for q in range(N_QUBITS):
        label = ['I'] * N_QUBITS
        label[N_QUBITS - 1 - q] = 'Z'  # Qiskit reverse ordering
        terms.append((''.join(label), 1.0 / N_QUBITS))
    return SparsePauliOp.from_list(terms)


def connect():
    """Connect to IBM and get Torino backend."""
    from qiskit_ibm_runtime import QiskitRuntimeService
    print("Connecting to IBM Quantum...")
    service = QiskitRuntimeService(channel='ibm_cloud')
    backend = service.backend('ibm_torino')
    print(f"Backend: {backend.name} ({backend.num_qubits}q, "
          f"pending: {backend.status().pending_jobs})")
    return backend


def transpile_circuits(circuits, backend):
    """Transpile for IBM hardware."""
    from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
    pm = generate_preset_pass_manager(
        optimization_level=1,
        backend=backend,
        translation_method='translator',
    )
    isa = pm.run(circuits)
    if not isinstance(isa, list):
        isa = [isa]
    for i, c in enumerate(isa):
        print(f"  Circuit {i}: depth={c.depth()}, "
              f"cx={c.count_ops().get('cx', 0)}")
    return isa


def run_estimator(backend, isa_circuits, obs, label, resilience_level=1,
                  shots=4096):
    """Run EstimatorV2 job and return results."""
    from qiskit_ibm_runtime import EstimatorV2

    estimator = EstimatorV2(mode=backend)
    estimator.options.resilience_level = resilience_level
    estimator.options.default_shots = shots

    pubs = [(c, obs.apply_layout(c.layout)) for c in isa_circuits]
    print(f"\nSubmitting {label} ({len(pubs)} circuits, "
          f"resilience={resilience_level}, shots={shots})...", flush=True)

    job = estimator.run(pubs)
    job_id = job.job_id()
    print(f"  Job ID: {job_id}", flush=True)

    print("  Waiting for results...", flush=True)
    result = job.result()
    print(f"  Done! QPU time: {getattr(result, 'metadata', {}).get('execution', {}).get('execution_spans', 'N/A')}", flush=True)

    values = []
    for i, pub_result in enumerate(result):
        val = float(pub_result.data.evs)
        std = float(pub_result.data.stds) if hasattr(pub_result.data, 'stds') else 0.0
        values.append({'mz': val, 'std': std})
        print(f"  Circuit {i}: M_z = {val:.6f} +/- {std:.6f}", flush=True)

    return job_id, values


def main():
    backend = connect()
    obs = build_mz_observable()

    # ── Phase 1: Depth sweep at theta_h=0 (Clifford point) ──────
    print("\n" + "=" * 65)
    print("PHASE 1: Depth sweep (theta_h=0, Clifford)")
    print("=" * 65)

    depths = [1, 2, 3, 5, 7, 10]
    depth_circuits = [build_kicked_ising(0.0, THETA_J, d) for d in depths]
    isa_depth = transpile_circuits(depth_circuits, backend)

    # TREX
    trex_job_id, trex_depth = run_estimator(
        backend, isa_depth, obs, "TREX depth sweep",
        resilience_level=1, shots=4096
    )

    # Raw
    raw_job_id, raw_depth = run_estimator(
        backend, isa_depth, obs, "Raw depth sweep",
        resilience_level=0, shots=4096
    )

    print("\n" + "-" * 60)
    print(f"{'Depth':>5} | {'Ideal':>8} | {'Raw':>8} | {'TREX':>8} | {'TREX err':>8}")
    print("-" * 60)
    depth_results = []
    for i, d in enumerate(depths):
        ideal = 1.0  # M_z = 1 at theta_h=0 for all depths
        raw_mz = raw_depth[i]['mz']
        trex_mz = trex_depth[i]['mz']
        trex_err = abs(trex_mz - ideal)
        print(f"{d:5d} | {ideal:8.4f} | {raw_mz:8.4f} | {trex_mz:8.4f} | {trex_err:8.5f}")
        depth_results.append({
            'trotter_steps': d,
            'ideal_mz': ideal,
            'raw_mz': raw_mz,
            'raw_std': raw_depth[i]['std'],
            'trex_mz': trex_mz,
            'trex_std': trex_depth[i]['std'],
            'trex_error': trex_err,
        })

    # ── Phase 2: Theta sweep at d=5 ─────────────────────────────
    print("\n" + "=" * 65)
    print("PHASE 2: Theta sweep (d=5)")
    print("=" * 65)

    # Ideal M_z values from emulator (precomputed)
    theta_values = [0.0, np.pi/8, np.pi/4, 3*np.pi/8, np.pi/2]
    ideal_mz = [1.0, 0.928, 0.0, -0.928, -1.0]  # approximate

    # Actually compute ideal from our emulator results
    # theta_h=0 -> 1.0, pi/8 -> ~0.63, pi/4 -> 0, 3pi/8 -> ~-0.63, pi/2 -> -1.0
    # Let me use the values from our emulator run
    ideal_mz_map = {
        0.0: 1.0,
        0.05: 0.928,  # pi/10
        0.125: 0.626,  # pi/8
        0.25: 0.0,  # pi/4
        0.375: -0.626,  # 3pi/8
        0.5: -1.0,  # pi/2
    }

    theta_circuits = [build_kicked_ising(th, THETA_J, 5) for th in theta_values]
    isa_theta = transpile_circuits(theta_circuits, backend)

    # TREX
    trex_theta_job_id, trex_theta = run_estimator(
        backend, isa_theta, obs, "TREX theta sweep",
        resilience_level=1, shots=4096
    )

    # Raw
    raw_theta_job_id, raw_theta = run_estimator(
        backend, isa_theta, obs, "Raw theta sweep",
        resilience_level=0, shots=4096
    )

    print("\n" + "-" * 60)
    print(f"{'theta_h':>8} | {'Raw':>8} | {'TREX':>8}")
    print("-" * 60)
    theta_results = []
    for i, th in enumerate(theta_values):
        raw_mz = raw_theta[i]['mz']
        trex_mz = trex_theta[i]['mz']
        print(f"{th:8.4f} | {raw_mz:8.4f} | {trex_mz:8.4f}")
        theta_results.append({
            'theta_h': float(th),
            'theta_h_over_pi': float(th / np.pi),
            'raw_mz': raw_mz,
            'raw_std': raw_theta[i]['std'],
            'trex_mz': trex_mz,
            'trex_std': trex_theta[i]['std'],
        })

    # ── Save results ────────────────────────────────────────────
    ts = datetime.now(timezone.utc).isoformat()

    # Compute summary stats
    raw_depth_mae = np.mean([abs(r['raw_mz'] - r['ideal_mz']) for r in depth_results])
    trex_depth_mae = np.mean([abs(r['trex_mz'] - r['ideal_mz']) for r in depth_results])
    improvement = raw_depth_mae / max(trex_depth_mae, 1e-10)

    data = {
        'schema_version': '1.0',
        'experiment_id': 'kim2023-ising-ibm-torino',
        'paper': {
            'title': 'Evidence for the utility of quantum computing before fault tolerance',
            'authors': 'Kim et al.',
            'arxiv': '2302.11590',
            'journal': 'Nature 618, 500-505 (2023)',
        },
        'backend': 'ibm_torino',
        'n_qubits': N_QUBITS,
        'topology': 'tuna9 (logical), IBM heavy-hex (physical)',
        'mitigation': 'TREX (EstimatorV2, resilience_level=1)',
        'note': 'Original used 127 qubits + PEA. We use 9 qubits + TREX on IBM Torino.',
        'timestamp': ts,
        'jobs': {
            'trex_depth': trex_job_id,
            'raw_depth': raw_job_id,
            'trex_theta': trex_theta_job_id,
            'raw_theta': raw_theta_job_id,
        },
        'depth_sweep': {
            'description': 'M_z vs Trotter depth at theta_h=0 (Clifford)',
            'theta_h': 0.0,
            'theta_j': float(THETA_J),
            'shots': 4096,
            'results': depth_results,
        },
        'theta_sweep': {
            'description': 'M_z vs theta_h at d=5',
            'n_steps': 5,
            'theta_j': float(THETA_J),
            'shots': 4096,
            'results': theta_results,
        },
        'summary': {
            'depth_sweep_raw_mae': float(raw_depth_mae),
            'depth_sweep_trex_mae': float(trex_depth_mae),
            'trex_improvement_factor': float(improvement),
            'depths_tested': depths,
            'theta_values_tested': [float(t) for t in theta_values],
        },
    }

    outfile = RESULTS_DIR / 'kim2023-ising-ibm-torino.json'
    with open(outfile, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"\nSaved: {outfile}")

    # Summary
    print(f"\n{'=' * 65}")
    print(f"SUMMARY — Kim 2023 on IBM Torino")
    print(f"{'=' * 65}")
    print(f"Depth sweep: Raw MAE = {raw_depth_mae:.4f}, TREX MAE = {trex_depth_mae:.4f}")
    print(f"  TREX improvement: {improvement:.1f}x")
    print(f"  d=1 Raw: {depth_results[0]['raw_mz']:.4f}, TREX: {depth_results[0]['trex_mz']:.4f}")
    d10_idx = next(i for i, r in enumerate(depth_results) if r['trotter_steps'] == 10)
    print(f"  d=10 Raw: {depth_results[d10_idx]['raw_mz']:.4f}, TREX: {depth_results[d10_idx]['trex_mz']:.4f}")

    # Claims
    print(f"\nClaim 1: Raw M_z decays with depth")
    d1 = depth_results[0]['raw_mz']
    d10 = depth_results[d10_idx]['raw_mz']
    print(f"  d=1: {d1:.4f}, d=10: {d10:.4f} -> {'PASS' if d10 < d1 else 'FAIL'}")

    print(f"Claim 2: TREX recovers ideal at Clifford")
    max_trex_err = max(r['trex_error'] for r in depth_results)
    print(f"  Max TREX error: {max_trex_err:.4f} -> {'PASS' if max_trex_err < 0.2 else 'FAIL'}")

    print(f"Claim 3: TREX improves over raw")
    print(f"  Improvement: {improvement:.1f}x -> {'PASS' if improvement > 1.5 else 'FAIL'}")


if __name__ == '__main__':
    main()
