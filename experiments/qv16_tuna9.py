#!/usr/bin/env python3
"""Quantum Volume 16 circuits for Tuna-9 (QI emulator verification).

Generates QV=16 circuits (n=4, d=4) following Cross et al. 2019 protocol:
- 4 qubits, 4 layers (depth = width)
- Each layer: random permutation into 2 non-overlapping pairs, each gets random SU(4)
- SU(4) decomposed as: Rz-Ry-Rz on each qubit, CNOT, Rz-Ry on each qubit

Physical qubits: q4, q6, q7, q8 on Tuna-9
Topology edges: (4,6), (4,7), (6,8), (7,8) — 4-cycle, best connected 4-qubit subgraph

Non-overlapping pair options for the 4-cycle:
  Option A: (q4,q6) + (q7,q8)
  Option B: (q4,q7) + (q6,q8)
  (Option C: (q4,q8) — NOT connected! Skip.)

Each random permutation layer picks from option A or B.
"""

import json
import itertools
import numpy as np
from datetime import datetime, timezone

# ── Configuration ──────────────────────────────────────────────────────

NUM_CIRCUITS = 10
NUM_LAYERS = 4  # depth = width = n = 4
NUM_QUBITS = 4
SHOTS_IDEAL = 100_000  # lots of shots for ideal distribution
SHOTS_EMULATOR = 1024  # standard shots for emulator test
SEED = 42

# Physical qubit mapping: logical [0,1,2,3] -> physical [4,6,7,8]
PHYS_QUBITS = [4, 6, 7, 8]

# Non-overlapping connected pair options on the 4-cycle (4,6)-(6,8)-(8,7)-(7,4)
# Using logical indices:
#   logical 0=q4, 1=q6, 2=q7, 3=q8
#   Option A: (0,1)+(2,3) = (q4,q6)+(q7,q8) — edges (4,6) and (7,8) ✓
#   Option B: (0,2)+(1,3) = (q4,q7)+(q6,q8) — edges (4,7) and (6,8) ✓
PAIR_OPTIONS = [
    [(0, 1), (2, 3)],  # (q4,q6) + (q7,q8)
    [(0, 2), (1, 3)],  # (q4,q7) + (q6,q8)
]


def generate_su4_gates(rng):
    """Generate random angles for SU(4) decomposition on a pair.

    Decomposition (following previous QV circuits in this project):
      qubit_a: Rz(a0) Ry(a1) Rz(a2)
      qubit_b: Rz(b0) Ry(b1) Rz(b2)
      CNOT qubit_a, qubit_b
      qubit_a: Rz(a3) Ry(a4)
      qubit_b: Rz(b3) Ry(b4)

    Returns dict with angles for qubit_a and qubit_b.
    """
    return {
        'a_pre': (rng.uniform(0, 2*np.pi), rng.uniform(0, np.pi), rng.uniform(0, 2*np.pi)),
        'b_pre': (rng.uniform(0, 2*np.pi), rng.uniform(0, np.pi), rng.uniform(0, 2*np.pi)),
        'a_post': (rng.uniform(0, 2*np.pi), rng.uniform(0, np.pi)),
        'b_post': (rng.uniform(0, 2*np.pi), rng.uniform(0, np.pi)),
    }


def build_cqasm_circuit(layers, circuit_idx, total_qubits=9):
    """Build a cQASM 3.0 string from layer descriptions.

    Args:
        layers: list of layer dicts, each with 'pairs' and 'gates'
        circuit_idx: circuit number for comment
        total_qubits: number of physical qubits on chip (9 for Tuna-9)

    Returns:
        cQASM 3.0 string
    """
    lines = [
        "version 3.0",
        f"qubit[{total_qubits}] q",
        f"bit[{NUM_QUBITS}] b",
        "",
        f"// QV=16 circuit {circuit_idx}: n={NUM_QUBITS}, d={NUM_LAYERS}",
        f"// Physical qubits: {PHYS_QUBITS}",
    ]

    for layer_idx, layer in enumerate(layers):
        lines.append(f"")
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

            # CNOT
            lines.append(f"CNOT q[{phys_a}], q[{phys_b}]")

            # Post-CNOT: Rz-Ry on each qubit
            a3, a4 = gates['a_post']
            b3, b4 = gates['b_post']
            lines.append(f"Rz({a3:.6f}) q[{phys_a}]")
            lines.append(f"Ry({a4:.6f}) q[{phys_a}]")
            lines.append(f"Rz({b3:.6f}) q[{phys_b}]")
            lines.append(f"Ry({b4:.6f}) q[{phys_b}]")

    # Measurement — map logical qubits to bit register
    lines.append("")
    lines.append("// Measurement")
    for log_idx, phys_idx in enumerate(PHYS_QUBITS):
        lines.append(f"b[{log_idx}] = measure q[{phys_idx}]")

    return "\n".join(lines)


def compute_ideal_distribution(layers):
    """Compute the ideal output probability distribution by matrix simulation.

    Builds the full 2^n x 2^n unitary from the circuit layers and computes
    |<x|U|0>|^2 for all x.

    Returns dict mapping bitstring -> probability.
    """
    n = NUM_QUBITS
    dim = 2**n

    # Start with |0...0>
    state = np.zeros(dim, dtype=complex)
    state[0] = 1.0

    # Gate matrices
    def ry_matrix(theta):
        c, s = np.cos(theta/2), np.sin(theta/2)
        return np.array([[c, -s], [s, c]], dtype=complex)

    def rz_matrix(phi):
        return np.array([[np.exp(-1j*phi/2), 0], [0, np.exp(1j*phi/2)]], dtype=complex)

    def apply_single_qubit(state, gate, qubit, n_qubits):
        """Apply a single-qubit gate to the state vector."""
        dim = 2**n_qubits
        new_state = np.zeros(dim, dtype=complex)
        for i in range(dim):
            bit = (i >> qubit) & 1
            # Compute the two basis states connected by this gate
            i0 = i & ~(1 << qubit)  # same as i but with qubit=0
            i1 = i0 | (1 << qubit)  # same as i but with qubit=1
            if bit == 0:
                new_state[i] += gate[0, 0] * state[i0] + gate[0, 1] * state[i1]
            else:
                new_state[i] += gate[1, 0] * state[i0] + gate[1, 1] * state[i1]
        return new_state

    def apply_cnot(state, control, target, n_qubits):
        """Apply CNOT gate to the state vector."""
        dim = 2**n_qubits
        new_state = np.zeros(dim, dtype=complex)
        for i in range(dim):
            ctrl_bit = (i >> control) & 1
            if ctrl_bit == 0:
                new_state[i] = state[i]
            else:
                # Flip target bit
                j = i ^ (1 << target)
                new_state[i] = state[j]
        return new_state

    # Apply each layer
    for layer in layers:
        for pair_idx, (log_a, log_b) in enumerate(layer['pairs']):
            gates = layer['gates'][pair_idx]

            # Pre-CNOT: Rz-Ry-Rz on each qubit (using logical qubit indices)
            a0, a1, a2 = gates['a_pre']
            b0, b1, b2 = gates['b_pre']

            state = apply_single_qubit(state, rz_matrix(a0), log_a, n)
            state = apply_single_qubit(state, ry_matrix(a1), log_a, n)
            state = apply_single_qubit(state, rz_matrix(a2), log_a, n)
            state = apply_single_qubit(state, rz_matrix(b0), log_b, n)
            state = apply_single_qubit(state, ry_matrix(b1), log_b, n)
            state = apply_single_qubit(state, rz_matrix(b2), log_b, n)

            # CNOT
            state = apply_cnot(state, log_a, log_b, n)

            # Post-CNOT: Rz-Ry on each qubit
            a3, a4 = gates['a_post']
            b3, b4 = gates['b_post']

            state = apply_single_qubit(state, rz_matrix(a3), log_a, n)
            state = apply_single_qubit(state, ry_matrix(a4), log_a, n)
            state = apply_single_qubit(state, rz_matrix(b3), log_b, n)
            state = apply_single_qubit(state, ry_matrix(b4), log_b, n)

    # Compute probabilities
    probs = np.abs(state)**2

    # Build bitstring -> probability dict
    dist = {}
    for i in range(dim):
        bs = format(i, f'0{n}b')
        if probs[i] > 1e-12:
            dist[bs] = float(probs[i])

    return dist


def compute_heavy_outputs(ideal_dist):
    """Determine the heavy output set from an ideal probability distribution.

    Heavy outputs are bitstrings whose ideal probability exceeds the median.

    Returns:
        heavy_set: set of bitstrings in the heavy half
        median_prob: the median probability
    """
    n = NUM_QUBITS
    # Get all 2^n probabilities (including zeros)
    all_probs = []
    for i in range(2**n):
        bs = format(i, f'0{n}b')
        all_probs.append((bs, ideal_dist.get(bs, 0.0)))

    # Sort by probability
    all_probs.sort(key=lambda x: x[1])

    # Median probability
    probs_only = [p for _, p in all_probs]
    median_prob = np.median(probs_only)

    # Heavy outputs: probability > median
    heavy_set = {bs for bs, p in all_probs if p > median_prob}

    # Ideal heavy output fraction (should be > 2/3 for a random unitary)
    ideal_hof = sum(p for bs, p in all_probs if bs in heavy_set)

    return heavy_set, median_prob, ideal_hof


def emulator_bs_to_logical(bitstring, phys_to_logical_map, n_total=9):
    """Convert a qxelarator 9-bit bitstring to a 4-bit logical bitstring.

    qxelarator uses MSB-first convention: bs[i] = qubit (n_total - 1 - i).
    So physical qubit q is at bitstring position (n_total - 1 - q).

    Ideal distribution uses Python format(i,'04b') which is also MSB-first:
    bs[j] = logical qubit (n_logical - 1 - j).

    We map: physical qubit -> logical qubit -> MSB-first position in 4-bit string.
    """
    logical_bits = ['0'] * NUM_QUBITS
    for phys_idx, log_idx in phys_to_logical_map.items():
        # Physical qubit phys_idx is at bitstring position (n_total - 1 - phys_idx)
        bs_pos = n_total - 1 - phys_idx
        qubit_val = bitstring[bs_pos]
        # Place in logical MSB-first position (NUM_QUBITS - 1 - log_idx)
        logical_bits[NUM_QUBITS - 1 - log_idx] = qubit_val
    return ''.join(logical_bits)


def compute_hof_from_counts(counts, heavy_set, phys_to_logical_map):
    """Compute heavy output fraction from emulator measurement counts.

    Args:
        counts: dict of bitstring -> count from qxelarator
        heavy_set: set of heavy output bitstrings (MSB-first logical order)
        phys_to_logical_map: dict mapping physical qubit index to logical index

    Returns:
        heavy output fraction
    """
    total = 0
    heavy_count = 0

    for bitstring, count in counts.items():
        logical_bs = emulator_bs_to_logical(bitstring, phys_to_logical_map)
        total += count
        if logical_bs in heavy_set:
            heavy_count += count

    return heavy_count / total if total > 0 else 0.0


def main():
    import qxelarator

    rng = np.random.RandomState(SEED)

    # Physical-to-logical mapping for qxelarator output parsing
    # qxelarator is MSB-first: bitstring[i] = qubit (n-1-i)
    # PHYS_QUBITS = [4, 6, 7, 8] -> logical [0, 1, 2, 3]
    phys_to_logical = {4: 0, 6: 1, 7: 2, 8: 3}

    print("=" * 70)
    print("  Quantum Volume 16 — Tuna-9 Emulator Verification")
    print("  n=4, d=4, 10 circuits, qubits q4,q6,q7,q8")
    print("=" * 70)

    results = {
        "schema_version": "1.0",
        "id": "qv16-tuna9-emulator",
        "type": "quantum_volume",
        "backend": "qxelarator",
        "backend_qubits": PHYS_QUBITS,
        "submitted": datetime.now(timezone.utc).isoformat(),
        "parameters": {
            "n_qubits": NUM_QUBITS,
            "n_layers": NUM_LAYERS,
            "n_circuits": NUM_CIRCUITS,
            "shots_ideal": SHOTS_IDEAL,
            "shots_emulator": SHOTS_EMULATOR,
            "seed": SEED,
            "physical_qubits": PHYS_QUBITS,
            "pair_options": [
                ["(q4,q6)+(q7,q8)", "(q4,q7)+(q6,q8)"],
            ],
        },
        "circuits": {},
        "ideal_distributions": {},
        "heavy_output_sets": {},
        "emulator_counts": {},
        "per_circuit_results": [],
    }

    hof_values = []

    for circ_idx in range(NUM_CIRCUITS):
        print(f"\n{'─' * 70}")
        print(f"  Circuit {circ_idx}")
        print(f"{'─' * 70}")

        # Generate random layers
        layers = []
        for layer_idx in range(NUM_LAYERS):
            # Random permutation: pick pair option A or B
            pair_choice = rng.randint(0, len(PAIR_OPTIONS))
            pairs = PAIR_OPTIONS[pair_choice]

            # Generate random SU(4) for each pair
            gates = [generate_su4_gates(rng) for _ in pairs]

            layers.append({'pairs': pairs, 'gates': gates})

        # Build cQASM circuit
        cqasm = build_cqasm_circuit(layers, circ_idx)
        results["circuits"][f"qv16_c{circ_idx}"] = cqasm

        # Print circuit summary
        for layer_idx, layer in enumerate(layers):
            pair_strs = []
            for (la, lb) in layer['pairs']:
                pair_strs.append(f"(q{PHYS_QUBITS[la]},q{PHYS_QUBITS[lb]})")
            print(f"  Layer {layer_idx}: {' + '.join(pair_strs)}")

        # Compute ideal distribution via matrix simulation
        ideal_dist = compute_ideal_distribution(layers)
        results["ideal_distributions"][f"qv16_c{circ_idx}"] = ideal_dist

        # Compute heavy outputs
        heavy_set, median_prob, ideal_hof = compute_heavy_outputs(ideal_dist)
        results["heavy_output_sets"][f"qv16_c{circ_idx}"] = {
            "heavy_bitstrings": sorted(list(heavy_set)),
            "median_probability": median_prob,
            "ideal_heavy_output_fraction": ideal_hof,
            "n_heavy": len(heavy_set),
        }

        print(f"  Ideal heavy output fraction: {ideal_hof:.4f}")
        print(f"  Heavy outputs ({len(heavy_set)}/{2**NUM_QUBITS}): {sorted(list(heavy_set))}")
        print(f"  Median probability: {median_prob:.6f}")

        # Top 5 ideal probabilities
        sorted_dist = sorted(ideal_dist.items(), key=lambda x: -x[1])[:5]
        print(f"  Top 5 ideal probs:")
        for bs, p in sorted_dist:
            marker = " [H]" if bs in heavy_set else ""
            print(f"    |{bs}> : {p:.4f}{marker}")

        # Run on emulator
        print(f"\n  Running on qxelarator ({SHOTS_EMULATOR} shots)...")
        result = qxelarator.execute_string(cqasm, iterations=SHOTS_EMULATOR)
        counts = result.results
        results["emulator_counts"][f"qv16_c{circ_idx}"] = {k: int(v) for k, v in counts.items()}

        # Compute heavy output fraction from emulator
        hof = compute_hof_from_counts(counts, heavy_set, phys_to_logical)
        hof_values.append(hof)

        results["per_circuit_results"].append({
            "circuit": f"qv16_c{circ_idx}",
            "heavy_output_fraction": hof,
            "ideal_heavy_output_fraction": ideal_hof,
            "passed": hof > 2/3,
        })

        print(f"  Emulator HOF: {hof:.4f} ({'PASS' if hof > 2/3 else 'FAIL'})")

        # Show top emulator outcomes
        total_shots = sum(counts.values())
        sorted_counts = sorted(counts.items(), key=lambda x: -x[1])[:5]
        print(f"  Top 5 emulator outcomes:")
        for bs, c in sorted_counts:
            logical_bs = emulator_bs_to_logical(bs, phys_to_logical)
            marker = " [H]" if logical_bs in heavy_set else ""
            print(f"    {bs} -> |{logical_bs}> : {int(c)} ({c/total_shots*100:.1f}%){marker}")

    # Overall analysis
    mean_hof = np.mean(hof_values)
    std_hof = np.std(hof_values) / np.sqrt(NUM_CIRCUITS)  # standard error
    ci_lower = mean_hof - 2 * std_hof
    passed = ci_lower > 2/3

    print(f"\n{'=' * 70}")
    print(f"  QUANTUM VOLUME 16 RESULTS (EMULATOR)")
    print(f"{'=' * 70}")
    print(f"  Mean HOF:          {mean_hof:.4f}")
    print(f"  Std error:         {std_hof:.4f}")
    print(f"  2-sigma lower:     {ci_lower:.4f}")
    print(f"  Threshold:         {2/3:.4f}")
    print(f"  QV=16 passed:      {'YES' if passed else 'NO'}")
    print(f"  Per-circuit HOFs:  {[f'{h:.3f}' for h in hof_values]}")
    print(f"  Circuits > 2/3:    {sum(1 for h in hof_values if h > 2/3)}/{NUM_CIRCUITS}")

    results["completed"] = datetime.now(timezone.utc).isoformat()
    results["analysis"] = {
        "quantum_volume": 16 if passed else "< 16",
        "mean_heavy_output_fraction": mean_hof,
        "std_error": std_hof,
        "ci_lower_2sigma": ci_lower,
        "threshold": 2/3,
        "passed": passed,
        "per_circuit_hof": hof_values,
        "interpretation": (
            f"QV=16 {'PASS' if passed else 'FAIL'} on emulator. "
            f"Mean HOF={mean_hof:.4f}, 2-sigma lower={ci_lower:.4f} "
            f"({'>' if ci_lower > 2/3 else '<='} 2/3 threshold). "
            f"{sum(1 for h in hof_values if h > 2/3)}/{NUM_CIRCUITS} circuits passed individually."
        ),
    }

    # Save results
    outpath = "/Users/dereklomas/haiqu/experiments/results/qv16-tuna9-emulator.json"
    with open(outpath, "w") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\n  Results saved to: {outpath}")

    # Also print first circuit's cQASM for reference
    print(f"\n{'=' * 70}")
    print(f"  SAMPLE CIRCUIT (qv16_c0)")
    print(f"{'=' * 70}")
    print(results["circuits"]["qv16_c0"])


if __name__ == "__main__":
    main()
