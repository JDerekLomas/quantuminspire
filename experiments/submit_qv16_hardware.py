#!/usr/bin/env python3
"""Submit QV=16 circuits to Tuna-9 hardware.

100 circuits (Cross et al. 2019 protocol), n=4, d=4.
Physical qubits: q4, q6, q7, q8 (best 4-qubit subgraph).
Native gate set (CZ, Ry, Rz) with CompileStage.ROUTING.

Saves ideal distributions alongside job IDs for later HOF analysis.
"""

import json
import time
import numpy as np
from pathlib import Path
from datetime import datetime, timezone

# ── Configuration ──────────────────────────────────────────────────────

NUM_CIRCUITS = 100
NUM_LAYERS = 4  # depth = width = n = 4
NUM_QUBITS = 4
N_SHOTS = 1024
SEED = 42
TUNA9_BACKEND_ID = 6

# Physical qubit mapping: logical [0,1,2,3] -> physical [4,6,7,8]
PHYS_QUBITS = [4, 6, 7, 8]

# Non-overlapping connected pairs on the 4-cycle
#   logical 0=q4, 1=q6, 2=q7, 3=q8
PAIR_OPTIONS = [
    [(0, 1), (2, 3)],  # (q4,q6) + (q7,q8)
    [(0, 2), (1, 3)],  # (q4,q7) + (q6,q8)
]


def generate_su4_gates(rng):
    """Random angles for SU(4) decomposition: Rz-Ry-Rz + CNOT + Rz-Ry."""
    return {
        'a_pre': (rng.uniform(0, 2*np.pi), rng.uniform(0, np.pi), rng.uniform(0, 2*np.pi)),
        'b_pre': (rng.uniform(0, 2*np.pi), rng.uniform(0, np.pi), rng.uniform(0, 2*np.pi)),
        'a_post': (rng.uniform(0, 2*np.pi), rng.uniform(0, np.pi)),
        'b_post': (rng.uniform(0, 2*np.pi), rng.uniform(0, np.pi)),
    }


def build_cqasm_native(layers, circuit_idx, total_qubits=9):
    """Build cQASM 3.0 with native gates (CZ, Ry, Rz).

    CNOT(a,b) decomposed as: Ry(-π/2,b); CZ(a,b); Ry(π/2,b)
    """
    lines = [
        "version 3.0",
        f"qubit[{total_qubits}] q",
        f"bit[{NUM_QUBITS}] b",
        "",
        f"// QV=16 circuit {circuit_idx}: n={NUM_QUBITS}, d={NUM_LAYERS}",
    ]

    for layer_idx, layer in enumerate(layers):
        lines.append(f"// Layer {layer_idx}")

        for pair_idx, (log_a, log_b) in enumerate(layer['pairs']):
            phys_a = PHYS_QUBITS[log_a]
            phys_b = PHYS_QUBITS[log_b]
            gates = layer['gates'][pair_idx]

            # Pre-CNOT: Rz-Ry-Rz on each qubit
            a0, a1, a2 = gates['a_pre']
            b0, b1, b2 = gates['b_pre']
            lines.append(f"Rz({a0:.6f}) q[{phys_a}]")
            lines.append(f"Ry({a1:.6f}) q[{phys_a}]")
            lines.append(f"Rz({a2:.6f}) q[{phys_a}]")
            lines.append(f"Rz({b0:.6f}) q[{phys_b}]")
            lines.append(f"Ry({b1:.6f}) q[{phys_b}]")
            lines.append(f"Rz({b2:.6f}) q[{phys_b}]")

            # CNOT(a,b) -> Ry(-π/2,b); CZ(a,b); Ry(π/2,b)
            lines.append(f"Ry(-1.570796) q[{phys_b}]")
            lines.append(f"CZ q[{phys_a}], q[{phys_b}]")
            lines.append(f"Ry(1.570796) q[{phys_b}]")

            # Post-CNOT: Rz-Ry on each qubit
            a3, a4 = gates['a_post']
            b3, b4 = gates['b_post']
            lines.append(f"Rz({a3:.6f}) q[{phys_a}]")
            lines.append(f"Ry({a4:.6f}) q[{phys_a}]")
            lines.append(f"Rz({b3:.6f}) q[{phys_b}]")
            lines.append(f"Ry({b4:.6f}) q[{phys_b}]")

    # Measurement
    lines.append("")
    for log_idx, phys_idx in enumerate(PHYS_QUBITS):
        lines.append(f"b[{log_idx}] = measure q[{phys_idx}]")

    return "\n".join(lines)


def compute_ideal_distribution(layers):
    """Statevector simulation for ideal output probabilities."""
    n = NUM_QUBITS
    dim = 2**n
    state = np.zeros(dim, dtype=complex)
    state[0] = 1.0

    def ry(theta):
        c, s = np.cos(theta/2), np.sin(theta/2)
        return np.array([[c, -s], [s, c]], dtype=complex)

    def rz(phi):
        return np.array([[np.exp(-1j*phi/2), 0], [0, np.exp(1j*phi/2)]], dtype=complex)

    def apply_1q(state, gate, qubit):
        new = np.zeros(dim, dtype=complex)
        for i in range(dim):
            i0 = i & ~(1 << qubit)
            i1 = i0 | (1 << qubit)
            bit = (i >> qubit) & 1
            if bit == 0:
                new[i] += gate[0, 0] * state[i0] + gate[0, 1] * state[i1]
            else:
                new[i] += gate[1, 0] * state[i0] + gate[1, 1] * state[i1]
        return new

    def apply_cnot(state, ctrl, tgt):
        new = np.zeros(dim, dtype=complex)
        for i in range(dim):
            if (i >> ctrl) & 1 == 0:
                new[i] = state[i]
            else:
                new[i] = state[i ^ (1 << tgt)]
        return new

    for layer in layers:
        for pair_idx, (log_a, log_b) in enumerate(layer['pairs']):
            g = layer['gates'][pair_idx]
            a0, a1, a2 = g['a_pre']
            b0, b1, b2 = g['b_pre']
            state = apply_1q(state, rz(a0), log_a)
            state = apply_1q(state, ry(a1), log_a)
            state = apply_1q(state, rz(a2), log_a)
            state = apply_1q(state, rz(b0), log_b)
            state = apply_1q(state, ry(b1), log_b)
            state = apply_1q(state, rz(b2), log_b)
            state = apply_cnot(state, log_a, log_b)
            a3, a4 = g['a_post']
            b3, b4 = g['b_post']
            state = apply_1q(state, rz(a3), log_a)
            state = apply_1q(state, ry(a4), log_a)
            state = apply_1q(state, rz(b3), log_b)
            state = apply_1q(state, ry(b4), log_b)

    probs = np.abs(state)**2
    dist = {}
    for i in range(dim):
        bs = format(i, f'0{n}b')
        if probs[i] > 1e-12:
            dist[bs] = float(probs[i])
    return dist


def compute_heavy_outputs(ideal_dist):
    """Heavy output set and median from ideal distribution."""
    n = NUM_QUBITS
    all_probs = []
    for i in range(2**n):
        bs = format(i, f'0{n}b')
        all_probs.append((bs, ideal_dist.get(bs, 0.0)))

    probs_only = [p for _, p in all_probs]
    median_prob = float(np.median(probs_only))

    heavy_set = {bs for bs, p in all_probs if p > median_prob}
    ideal_hof = sum(p for _, p in all_probs if _ in heavy_set)

    return sorted(list(heavy_set)), median_prob, float(ideal_hof)


def main():
    from compute_api_client import CompileStage
    from quantuminspire.sdk.models.cqasm_algorithm import CqasmAlgorithm
    from quantuminspire.sdk.models.job_options import JobOptions
    from quantuminspire.util.api.remote_backend import RemoteBackend

    class PrecompiledAlgorithm(CqasmAlgorithm):
        @property
        def compile_stage(self):
            return CompileStage.ROUTING

    rng = np.random.RandomState(SEED)

    print(f"Generating {NUM_CIRCUITS} QV=16 circuits (n=4, d=4)...")
    print(f"Physical qubits: {PHYS_QUBITS}")

    circuits = {}
    ideal_data = {}

    for circ_idx in range(NUM_CIRCUITS):
        layers = []
        for _ in range(NUM_LAYERS):
            pair_choice = rng.randint(0, len(PAIR_OPTIONS))
            pairs = PAIR_OPTIONS[pair_choice]
            gates = [generate_su4_gates(rng) for _ in pairs]
            layers.append({'pairs': pairs, 'gates': gates})

        cqasm = build_cqasm_native(layers, circ_idx)
        circuits[f"qv16_c{circ_idx:03d}"] = cqasm

        ideal_dist = compute_ideal_distribution(layers)
        heavy_set, median_prob, ideal_hof = compute_heavy_outputs(ideal_dist)
        ideal_data[f"qv16_c{circ_idx:03d}"] = {
            "heavy_bitstrings": heavy_set,
            "median_probability": median_prob,
            "ideal_heavy_output_fraction": ideal_hof,
        }

        if (circ_idx + 1) % 10 == 0:
            print(f"  Generated {circ_idx + 1}/{NUM_CIRCUITS} circuits")

    print(f"\nGenerated {len(circuits)} circuits. Submitting to Tuna-9...")

    backend = RemoteBackend()
    options = JobOptions(number_of_shots=N_SHOTS)

    job_ids = {}
    n_ok = 0
    n_fail = 0

    for i, (name, cqasm) in enumerate(circuits.items()):
        algo = PrecompiledAlgorithm(
            platform_name="Quantum Inspire",
            program_name=name
        )
        algo._content = cqasm

        try:
            job_id = backend.run(algo, backend_type_id=TUNA9_BACKEND_ID, options=options)
            job_ids[name] = job_id
            n_ok += 1
            if (i + 1) % 10 == 0 or i == len(circuits) - 1:
                print(f"  [{i+1}/{len(circuits)}] {name} -> job {job_id}")
        except Exception as e:
            job_ids[name] = f"FAILED: {e}"
            n_fail += 1
            print(f"  [{i+1}/{len(circuits)}] {name} -> FAILED: {e}")

        if i < len(circuits) - 1:
            time.sleep(0.3)

    output = {
        "experiment": "QV=16 Tuna-9 hardware",
        "submitted": datetime.now(timezone.utc).isoformat(),
        "backend": "Tuna-9",
        "physical_qubits": PHYS_QUBITS,
        "n_shots": N_SHOTS,
        "n_circuits": NUM_CIRCUITS,
        "n_layers": NUM_LAYERS,
        "seed": SEED,
        "job_ids": job_ids,
        "ideal_data": ideal_data,
        "n_submitted": n_ok,
        "n_failed": n_fail,
    }

    outfile = Path("experiments/results/qv16-tuna9-hardware-job-ids.json")
    with open(outfile, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nSubmitted: {n_ok}, Failed: {n_fail}")
    print(f"Job IDs + ideal data saved to: {outfile}")


if __name__ == "__main__":
    main()
