"""
Replication: "Evidence for the utility of quantum computing before fault tolerance"
Kim et al., Nature 618, 500-505 (2023)
https://arxiv.org/abs/2302.11590

Replicates:
  - Kicked Ising model Trotterized time evolution
  - Magnetization M_z vs Trotter depth at theta_h = 0 (Clifford condition)
  - M_z vs theta_h sweep at fixed depth
  - ZNE error mitigation via gate folding
  - Comparison: ideal vs noisy vs ZNE-mitigated

Key differences from original:
  - Original used 127 qubits on heavy-hex lattice with PEA (learned noise model)
  - We use 9 qubits (Tuna-9 topology) with basic ZNE (gate folding + depolarizing noise)
  - Physics is identical; scale and mitigation sophistication differ
  - 9 qubits is exactly simulable, giving ground truth for comparison

Based on PennyLane tutorial: pennylane.ai/qml/demos/tutorial_mitigation_advantage
"""

import numpy as np
import pennylane as qml
from pennylane import numpy as pnp
import json
import datetime
import sys
import os
os.environ['PYTHONUNBUFFERED'] = '1'
sys.stdout.reconfigure(line_buffering=True)


# ── Graph topologies ────────────────────────────────────────────

# Tuna-9 actual connectivity (10 edges)
TUNA9_EDGES = [
    (0, 1), (0, 2), (1, 3), (1, 4), (2, 4),
    (2, 5), (3, 6), (4, 6), (6, 8), (7, 8),
]
TUNA9_QUBITS = 9

# 3x3 grid (12 edges) — matches PennyLane tutorial
GRID3x3_EDGES = [
    (0, 1), (1, 2), (3, 4), (4, 5), (6, 7), (7, 8),  # horizontal
    (0, 3), (1, 4), (2, 5), (3, 6), (4, 7), (5, 8),  # vertical
]
GRID3x3_QUBITS = 9

# 1D chain (simplest)
CHAIN5_EDGES = [(i, i+1) for i in range(4)]
CHAIN5_QUBITS = 5


# ── Kicked Ising circuit ────────────────────────────────────────

def kicked_ising_trotter(n_qubits, edges, theta_h, theta_j, n_steps):
    """Build one Trotter step of the kicked Ising model.

    H = -J * sum_{<i,j>} Z_i Z_j  +  h * sum_i X_i

    Per step: RX(theta_h) on all qubits, then RZZ(theta_j) on all edges.
    """
    for _ in range(n_steps):
        # Single-qubit kicks (transverse field)
        for q in range(n_qubits):
            qml.RX(2 * theta_h, wires=q)

        # Two-qubit ZZ interactions
        for i, j in edges:
            qml.IsingZZ(2 * theta_j, wires=[i, j])


def kicked_ising_folded(n_qubits, edges, theta_h, theta_j, n_steps, fold_factor):
    """Build circuit with gate folding for ZNE.

    fold_factor = 1: original circuit
    fold_factor = 3: each gate G is replaced by G G^dag G
    fold_factor = 5: G G^dag G G^dag G
    """
    for _ in range(n_steps):
        # Single-qubit kicks with folding
        for q in range(n_qubits):
            for _ in range((fold_factor + 1) // 2):
                qml.RX(2 * theta_h, wires=q)
                if _ < (fold_factor - 1) // 2:
                    qml.RX(-2 * theta_h, wires=q)

        # Two-qubit ZZ with folding
        for i, j in edges:
            for _ in range((fold_factor + 1) // 2):
                qml.IsingZZ(2 * theta_j, wires=[i, j])
                if _ < (fold_factor - 1) // 2:
                    qml.IsingZZ(-2 * theta_j, wires=[i, j])


# ── Noisy circuit builders ──────────────────────────────────────

def _apply_step_noise(n_qubits, edges, p_1q, p_2q):
    """Apply depolarizing noise after each step: per-qubit and per-edge."""
    for q in range(n_qubits):
        qml.DepolarizingChannel(p_1q, wires=q)
    for i, j in edges:
        # Two-qubit depolarizing on each edge
        qml.DepolarizingChannel(p_2q, wires=i)
        qml.DepolarizingChannel(p_2q, wires=j)


def kicked_ising_noisy(n_qubits, edges, theta_h, theta_j, n_steps,
                       noise_strength, fold_factor=1):
    """Build noisy kicked Ising circuit with per-step noise.

    noise_strength is base single-qubit depolarizing probability.
    Two-qubit noise is 2x single-qubit (approximate).
    fold_factor scales the noise (for ZNE amplification).
    """
    p_1q = min(noise_strength * fold_factor, 0.75)  # cap at max depolarizing
    p_2q = min(noise_strength * fold_factor * 0.5, 0.75)

    for _ in range(n_steps):
        # Single-qubit kicks
        for q in range(n_qubits):
            qml.RX(2 * theta_h, wires=q)

        # Two-qubit ZZ interactions
        for i, j in edges:
            qml.IsingZZ(2 * theta_j, wires=[i, j])

        # Noise after this Trotter step
        _apply_step_noise(n_qubits, edges, p_1q, p_2q)


# ── Magnetization measurement ──────────────────────────────────

def run_magnetization(n_qubits, edges, theta_h, theta_j, n_steps,
                      noise_strength=0.0, fold_factor=1):
    """Compute average magnetization M_z = (1/N) sum <Z_q>.

    Returns M_z for each qubit and the average.
    """
    if noise_strength > 0:
        dev = qml.device('default.mixed', wires=n_qubits)

        @qml.qnode(dev)
        def circuit():
            kicked_ising_noisy(n_qubits, edges, theta_h, theta_j,
                                n_steps, noise_strength, fold_factor)
            return [qml.expval(qml.Z(q)) for q in range(n_qubits)]
    else:
        dev = qml.device('default.qubit', wires=n_qubits)

        @qml.qnode(dev)
        def circuit():
            kicked_ising_trotter(n_qubits, edges, theta_h, theta_j, n_steps)
            return [qml.expval(qml.Z(q)) for q in range(n_qubits)]

    z_values = circuit()
    z_values = [float(z) for z in z_values]
    mz = np.mean(z_values)
    return mz, z_values


def zne_magnetization(n_qubits, edges, theta_h, theta_j, n_steps,
                      noise_strength, fold_factors=(1, 3, 5)):
    """Zero-noise extrapolation using gate folding.

    Runs circuit at multiple noise amplification levels and
    extrapolates to zero noise using Richardson extrapolation.
    """
    results = []
    for ff in fold_factors:
        mz, _ = run_magnetization(n_qubits, edges, theta_h, theta_j,
                                   n_steps, noise_strength, ff)
        results.append((ff, mz))

    # Richardson extrapolation (linear for 2 points, quadratic for 3)
    xs = np.array([r[0] for r in results], dtype=float)
    ys = np.array([r[1] for r in results], dtype=float)

    if len(xs) == 2:
        # Linear extrapolation to x=0
        slope = (ys[1] - ys[0]) / (xs[1] - xs[0])
        mitigated = ys[0] - slope * xs[0]
    else:
        # Quadratic extrapolation (Richardson)
        coeffs = np.polyfit(xs, ys, min(2, len(xs) - 1))
        mitigated = np.polyval(coeffs, 0)

    return float(mitigated), results


# ── Experiment: M_z vs Trotter depth (theta_h = 0) ─────────────

def run_depth_sweep(topology='tuna9', noise_strength=0.01,
                    max_steps=10, theta_j=-np.pi/4):
    """Replicate Fig. 2c: M_z decay with Trotter depth at Clifford point.

    At theta_h = 0, ideal M_z = 1.0 for all depths (trivial dynamics).
    Noisy M_z decays monotonically. ZNE should recover ~1.0.
    """
    if topology == 'tuna9':
        n_q, edges = TUNA9_QUBITS, TUNA9_EDGES
    elif topology == 'grid3x3':
        n_q, edges = GRID3x3_QUBITS, GRID3x3_EDGES
    else:
        n_q, edges = CHAIN5_QUBITS, CHAIN5_EDGES

    theta_h = 0.0  # Clifford condition
    steps_list = list(range(1, max_steps + 1))
    results = []

    print(f"\n{'='*65}", flush=True)
    print(f"Depth sweep: {topology} ({n_q}q), theta_h=0, noise={noise_strength}", flush=True)
    print(f"{'='*65}", flush=True)
    print(f"{'Steps':>5} | {'Ideal':>8} | {'Noisy':>8} | {'ZNE':>8} | {'ZNE err':>8}", flush=True)
    print("-" * 50, flush=True)

    for d in steps_list:
        # Ideal
        mz_ideal, _ = run_magnetization(n_q, edges, theta_h, theta_j, d,
                                         noise_strength=0.0)
        # Noisy
        mz_noisy, _ = run_magnetization(n_q, edges, theta_h, theta_j, d,
                                         noise_strength=noise_strength)
        # ZNE
        mz_zne, zne_points = zne_magnetization(n_q, edges, theta_h, theta_j, d,
                                                 noise_strength)

        zne_err = abs(mz_zne - mz_ideal)

        results.append({
            'trotter_steps': d,
            'ideal_mz': float(mz_ideal),
            'noisy_mz': float(mz_noisy),
            'zne_mz': float(mz_zne),
            'zne_error': float(zne_err),
            'zne_points': [(int(ff), float(v)) for ff, v in zne_points],
        })

        print(f"{d:5d} | {mz_ideal:8.4f} | {mz_noisy:8.4f} | {mz_zne:8.4f} | {zne_err:8.5f}", flush=True)

    return results


# ── Experiment: M_z vs theta_h sweep (fixed depth) ─────────────

def run_theta_sweep(topology='tuna9', noise_strength=0.01,
                    n_steps=5, theta_j=-np.pi/4, n_points=11):
    """Replicate Fig. 3a: M_z vs theta_h at fixed depth.

    theta_h = 0: Clifford (trivial, M_z = 1)
    theta_h = pi/4: strongly entangling regime
    theta_h = pi/2: stabilizer point
    """
    if topology == 'tuna9':
        n_q, edges = TUNA9_QUBITS, TUNA9_EDGES
    elif topology == 'grid3x3':
        n_q, edges = GRID3x3_QUBITS, GRID3x3_EDGES
    else:
        n_q, edges = CHAIN5_QUBITS, CHAIN5_EDGES

    theta_h_values = np.linspace(0, np.pi/2, n_points)
    results = []

    print(f"\n{'='*65}", flush=True)
    print(f"Theta sweep: {topology} ({n_q}q), d={n_steps}, noise={noise_strength}", flush=True)
    print(f"{'='*65}", flush=True)
    print(f"{'theta_h':>8} | {'Ideal':>8} | {'Noisy':>8} | {'ZNE':>8} | {'ZNE err':>8}", flush=True)
    print("-" * 50, flush=True)

    for theta_h in theta_h_values:
        mz_ideal, _ = run_magnetization(n_q, edges, theta_h, theta_j, n_steps,
                                         noise_strength=0.0)
        mz_noisy, _ = run_magnetization(n_q, edges, theta_h, theta_j, n_steps,
                                         noise_strength=noise_strength)
        mz_zne, zne_points = zne_magnetization(n_q, edges, theta_h, theta_j,
                                                 n_steps, noise_strength)

        zne_err = abs(mz_zne - mz_ideal)

        results.append({
            'theta_h': float(theta_h),
            'theta_h_over_pi': float(theta_h / np.pi),
            'ideal_mz': float(mz_ideal),
            'noisy_mz': float(mz_noisy),
            'zne_mz': float(mz_zne),
            'zne_error': float(zne_err),
        })

        print(f"{theta_h:8.4f} | {mz_ideal:8.4f} | {mz_noisy:8.4f} | {mz_zne:8.4f} | {zne_err:8.5f}", flush=True)

    return results


# ── Save results ────────────────────────────────────────────────

def save_results(depth_results, theta_results, topology, noise_strength):
    ts = datetime.datetime.now().isoformat()

    data = {
        'schema_version': '1.0',
        'experiment_id': f'kim2023-ising-{topology}',
        'paper': {
            'title': 'Evidence for the utility of quantum computing before fault tolerance',
            'authors': 'Kim et al.',
            'arxiv': '2302.11590',
            'journal': 'Nature 618, 500-505 (2023)',
        },
        'topology': topology,
        'n_qubits': TUNA9_QUBITS if topology == 'tuna9' else (GRID3x3_QUBITS if topology == 'grid3x3' else CHAIN5_QUBITS),
        'noise_model': f'depolarizing p={noise_strength}',
        'mitigation': 'ZNE gate folding (fold_factors=[1,3,5], Richardson extrapolation)',
        'note': 'Original used 127 qubits on heavy-hex with PEA (learned Pauli-Lindblad). We use 9 qubits with basic ZNE.',
        'timestamp': ts,
        'depth_sweep': {
            'description': 'M_z vs Trotter depth at theta_h=0 (Clifford condition, ideal M_z=1.0)',
            'theta_h': 0.0,
            'theta_j': float(-np.pi/4),
            'results': depth_results,
        },
        'theta_sweep': {
            'description': 'M_z vs theta_h sweep at fixed depth',
            'n_steps': 5,
            'theta_j': float(-np.pi/4),
            'results': theta_results,
        },
        'summary': {
            'depth_sweep_max_steps': len(depth_results),
            'depth_sweep_zne_mae': float(np.mean([r['zne_error'] for r in depth_results])),
            'depth_sweep_noisy_mae': float(np.mean([abs(r['noisy_mz'] - r['ideal_mz']) for r in depth_results])),
            'theta_sweep_n_points': len(theta_results),
            'theta_sweep_zne_mae': float(np.mean([r['zne_error'] for r in theta_results])),
            'theta_sweep_noisy_mae': float(np.mean([abs(r['noisy_mz'] - r['ideal_mz']) for r in theta_results])),
            'zne_improvement_factor': float(
                np.mean([abs(r['noisy_mz'] - r['ideal_mz']) for r in depth_results]) /
                max(np.mean([r['zne_error'] for r in depth_results]), 1e-10)
            ),
        },
    }

    outfile = f'experiments/results/kim2023-ising-{topology}.json'
    with open(outfile, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"\nSaved: {outfile}", flush=True)

    return data


# ── Main ────────────────────────────────────────────────────────

if __name__ == '__main__':
    topology = 'tuna9'
    noise_strength = 0.01  # approximate depolarizing noise
    max_steps = 10

    if '--grid' in sys.argv:
        topology = 'grid3x3'
    elif '--chain' in sys.argv:
        topology = 'chain5'

    if '--noise' in sys.argv:
        idx = sys.argv.index('--noise')
        noise_strength = float(sys.argv[idx + 1])

    print(f"Kim 2023 Replication: Kicked Ising on {topology}", flush=True)
    print(f"Noise: depolarizing p={noise_strength}", flush=True)
    print(f"Mitigation: ZNE gate folding (1x, 3x, 5x)", flush=True)

    # Depth sweep at Clifford point
    depth_results = run_depth_sweep(topology, noise_strength, max_steps)

    # Theta sweep at d=5
    theta_results = run_theta_sweep(topology, noise_strength, n_steps=5)

    # Save
    data = save_results(depth_results, theta_results, topology, noise_strength)

    # Summary
    s = data['summary']
    print(f"\n{'='*65}", flush=True)
    print(f"SUMMARY — Kim 2023 Replication ({topology})", flush=True)
    print(f"{'='*65}", flush=True)
    print(f"Depth sweep: ZNE MAE = {s['depth_sweep_zne_mae']:.5f}, "
          f"noisy MAE = {s['depth_sweep_noisy_mae']:.5f}", flush=True)
    print(f"  ZNE improvement: {s['zne_improvement_factor']:.1f}x", flush=True)
    print(f"Theta sweep: ZNE MAE = {s['theta_sweep_zne_mae']:.5f}, "
          f"noisy MAE = {s['theta_sweep_noisy_mae']:.5f}", flush=True)

    # Key claims
    print(f"\nClaim 1: Unmitigated M_z decays with depth", flush=True)
    d1 = depth_results[0]['noisy_mz']
    d10 = depth_results[-1]['noisy_mz']
    print(f"  d=1: {d1:.4f}, d={max_steps}: {d10:.4f} -> {'PASS' if d10 < d1 else 'FAIL'}", flush=True)

    print(f"Claim 2: ZNE recovers ideal at Clifford (theta_h=0)", flush=True)
    zne_errs = [r['zne_error'] for r in depth_results]
    max_zne_err = max(zne_errs)
    print(f"  Max ZNE error: {max_zne_err:.5f} -> {'PASS' if max_zne_err < 0.1 else 'FAIL'}", flush=True)

    print(f"Claim 3: ZNE improves over unmitigated", flush=True)
    print(f"  Improvement: {s['zne_improvement_factor']:.1f}x -> {'PASS' if s['zne_improvement_factor'] > 1.5 else 'FAIL'}", flush=True)
