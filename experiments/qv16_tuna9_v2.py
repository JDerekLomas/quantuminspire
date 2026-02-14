#!/usr/bin/env python3
"""Quantum Volume 16 circuits for Tuna-9 — v2 with native gates on connected qubits.

Generates QV=16 circuits (n=4, d=4) following Cross et al. 2019 protocol:
- 4 qubits, 4 layers (depth = width)
- Each layer: random pairing into 2 non-overlapping pairs, each gets random SU(4)
- SU(4) decomposed as: Rz-Ry-Rz on each qubit, CNOT, Rz-Ry on each qubit
- CNOT decomposed into native gates: Ry(-pi/2,target); CZ(ctrl,target); Ry(pi/2,target)

Physical qubits: q1, q3, q4, q6 on Tuna-9 (4-cycle subgraph)
Topology edges used: 1-3, 1-4, 3-6, 4-6

Non-overlapping pair options for the 4-cycle:
  Option A: (q1,q3) + (q4,q6)  — edges 1-3 and 4-6
  Option B: (q1,q4) + (q3,q6)  — edges 1-4 and 3-6

Native gate set: CZ, Ry, Rz (no CNOT, no H)
Consecutive same-type rotations on the same qubit are merged.
Near-zero rotations (|theta| < 1e-9) are removed.
"""

import json
import numpy as np
from datetime import datetime, timezone

# ── Configuration ──────────────────────────────────────────────────────

NUM_CIRCUITS = 10
NUM_LAYERS = 4   # depth = width = n = 4
NUM_QUBITS = 4
SHOTS_EMULATOR = 1024
SEED = 42
ANGLE_EPSILON = 1e-9

# Physical qubit mapping: logical [0,1,2,3] -> physical [1,3,4,6]
PHYS_QUBITS = [1, 3, 4, 6]

# Non-overlapping connected pair options on the 4-cycle 1-3-6-4-1
# Using logical indices:
#   logical 0=q1, 1=q3, 2=q4, 3=q6
#   Option A: (0,1)+(2,3) = (q1,q3)+(q4,q6) — edges 1-3 and 4-6
#   Option B: (0,2)+(1,3) = (q1,q4)+(q3,q6) — edges 1-4 and 3-6
PAIR_OPTIONS = [
    [(0, 1), (2, 3)],  # (q1,q3) + (q4,q6)
    [(0, 2), (1, 3)],  # (q1,q4) + (q3,q6)
]


def generate_su4_angles(rng):
    """Generate random angles for SU(4) decomposition on a pair.

    Decomposition:
      qubit_a: Rz(a0) Ry(a1) Rz(a2)
      qubit_b: Rz(b0) Ry(b1) Rz(b2)
      CNOT qubit_a -> qubit_b
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


def expand_su4_to_native(log_a, log_b, gates):
    """Expand one SU(4) block into native gate instructions.

    CNOT(a,b) = Ry(-pi/2, b); CZ(a, b); Ry(pi/2, b)

    Returns list of gate tuples: ('Ry', qubit, angle), ('Rz', qubit, angle),
    or ('CZ', qubit_a, qubit_b).
    """
    ops = []
    a0, a1, a2 = gates['a_pre']
    b0, b1, b2 = gates['b_pre']

    # Pre-CNOT single-qubit gates
    ops.append(('Rz', log_a, a0))
    ops.append(('Ry', log_a, a1))
    ops.append(('Rz', log_a, a2))
    ops.append(('Rz', log_b, b0))
    ops.append(('Ry', log_b, b1))
    ops.append(('Rz', log_b, b2))

    # CNOT(a, b) decomposed into native gates
    ops.append(('Ry', log_b, -np.pi/2))
    ops.append(('CZ', log_a, log_b))
    ops.append(('Ry', log_b, np.pi/2))

    # Post-CNOT single-qubit gates
    a3, a4 = gates['a_post']
    b3, b4 = gates['b_post']
    ops.append(('Rz', log_a, a3))
    ops.append(('Ry', log_a, a4))
    ops.append(('Rz', log_b, b3))
    ops.append(('Ry', log_b, b4))

    return ops


def merge_and_clean_ops(ops):
    """Merge consecutive same-type rotations on the same qubit, remove near-zero.

    Processes the gate list sequentially. When two adjacent single-qubit gates
    of the same type (Ry or Rz) act on the same qubit, their angles are summed.
    Rotations with |angle| < ANGLE_EPSILON are dropped.

    Two-qubit gates (CZ) break the merging chain.
    """
    if not ops:
        return []

    merged = []
    for op in ops:
        if op[0] == 'CZ':
            merged.append(op)
            continue

        gate_type, qubit, angle = op

        # Check if the last operation on this qubit is the same type
        # We can only merge if the most recent gate in merged is the same type
        # on the same qubit AND no CZ involving this qubit appeared in between.
        # Simple approach: only merge with the immediately preceding gate.
        if (merged
                and merged[-1][0] == gate_type
                and merged[-1][1] == qubit):
            # Merge by summing angles
            merged[-1] = (gate_type, qubit, merged[-1][2] + angle)
        else:
            merged.append(op)

    # Remove near-zero rotations
    cleaned = []
    for op in merged:
        if op[0] == 'CZ':
            cleaned.append(op)
        else:
            # Normalize angle to [-pi, pi] range for comparison
            angle = op[2] % (2 * np.pi)
            if angle > np.pi:
                angle -= 2 * np.pi
            if abs(angle) > ANGLE_EPSILON:
                cleaned.append((op[0], op[1], op[2]))
            # else: skip near-zero rotation

    return cleaned


def build_native_ops(layers):
    """Build the full list of native gate operations for a circuit.

    Returns the merged and cleaned operation list.
    """
    all_ops = []
    for layer in layers:
        for pair_idx, (log_a, log_b) in enumerate(layer['pairs']):
            gates = layer['gates'][pair_idx]
            ops = expand_su4_to_native(log_a, log_b, gates)
            all_ops.extend(ops)

    return merge_and_clean_ops(all_ops)


def ops_to_cqasm(ops, circuit_idx, total_qubits=9):
    """Convert native gate operations to a cQASM 3.0 string.

    Uses physical qubit mapping and `bit[9] b; b = measure q` format.
    """
    lines = [
        "version 3.0",
        f"qubit[{total_qubits}] q",
        f"bit[{total_qubits}] b",
        "",
        f"// QV=16 circuit {circuit_idx}: n={NUM_QUBITS}, d={NUM_LAYERS}",
        f"// Physical qubits: {PHYS_QUBITS}",
        f"// Native gate set: CZ, Ry, Rz",
    ]

    for op in ops:
        if op[0] == 'CZ':
            _, log_a, log_b = op
            phys_a = PHYS_QUBITS[log_a]
            phys_b = PHYS_QUBITS[log_b]
            lines.append(f"CZ q[{phys_a}], q[{phys_b}]")
        else:
            gate_type, log_q, angle = op
            phys_q = PHYS_QUBITS[log_q]
            lines.append(f"{gate_type}({angle:.6f}) q[{phys_q}]")

    lines.append("")
    lines.append("// Measurement")
    lines.append("b = measure q")

    return "\n".join(lines)


# ── Ideal state-vector simulation ─────────────────────────────────────

def ry_matrix(theta):
    c, s = np.cos(theta / 2), np.sin(theta / 2)
    return np.array([[c, -s], [s, c]], dtype=complex)


def rz_matrix(phi):
    return np.array([[np.exp(-1j * phi / 2), 0],
                     [0, np.exp(1j * phi / 2)]], dtype=complex)


def apply_single_qubit(state, gate, qubit, n_qubits):
    """Apply a single-qubit gate to the state vector."""
    dim = 2 ** n_qubits
    new_state = np.zeros(dim, dtype=complex)
    for i in range(dim):
        bit = (i >> qubit) & 1
        i0 = i & ~(1 << qubit)
        i1 = i0 | (1 << qubit)
        if bit == 0:
            new_state[i] += gate[0, 0] * state[i0] + gate[0, 1] * state[i1]
        else:
            new_state[i] += gate[1, 0] * state[i0] + gate[1, 1] * state[i1]
    return new_state


def apply_cz(state, q_a, q_b, n_qubits):
    """Apply CZ gate: flip phase when both qubits are |1>."""
    dim = 2 ** n_qubits
    new_state = state.copy()
    for i in range(dim):
        if ((i >> q_a) & 1) and ((i >> q_b) & 1):
            new_state[i] = -state[i]
    return new_state


def compute_ideal_statevector(layers):
    """Compute the ideal output state vector using the ORIGINAL (un-decomposed) circuit.

    Uses the logical SU(4) decomposition: Rz-Ry-Rz + CNOT + Rz-Ry
    This ensures the ideal distribution is independent of the native gate decomposition.

    Returns the state vector (complex array of length 2^n).
    """
    n = NUM_QUBITS
    dim = 2 ** n
    state = np.zeros(dim, dtype=complex)
    state[0] = 1.0

    def apply_cnot(state, control, target, n_qubits):
        dim = 2 ** n_qubits
        new_state = np.zeros(dim, dtype=complex)
        for i in range(dim):
            if (i >> control) & 1:
                j = i ^ (1 << target)
                new_state[i] = state[j]
            else:
                new_state[i] = state[i]
        return new_state

    for layer in layers:
        for pair_idx, (log_a, log_b) in enumerate(layer['pairs']):
            gates = layer['gates'][pair_idx]
            a0, a1, a2 = gates['a_pre']
            b0, b1, b2 = gates['b_pre']

            state = apply_single_qubit(state, rz_matrix(a0), log_a, n)
            state = apply_single_qubit(state, ry_matrix(a1), log_a, n)
            state = apply_single_qubit(state, rz_matrix(a2), log_a, n)
            state = apply_single_qubit(state, rz_matrix(b0), log_b, n)
            state = apply_single_qubit(state, ry_matrix(b1), log_b, n)
            state = apply_single_qubit(state, rz_matrix(b2), log_b, n)

            state = apply_cnot(state, log_a, log_b, n)

            a3, a4 = gates['a_post']
            b3, b4 = gates['b_post']
            state = apply_single_qubit(state, rz_matrix(a3), log_a, n)
            state = apply_single_qubit(state, ry_matrix(a4), log_a, n)
            state = apply_single_qubit(state, rz_matrix(b3), log_b, n)
            state = apply_single_qubit(state, ry_matrix(b4), log_b, n)

    return state


def compute_ideal_statevector_native(ops):
    """Compute ideal state vector from the native gate ops (for verification).

    This should produce the same result as compute_ideal_statevector if the
    CNOT decomposition is correct.
    """
    n = NUM_QUBITS
    dim = 2 ** n
    state = np.zeros(dim, dtype=complex)
    state[0] = 1.0

    for op in ops:
        if op[0] == 'CZ':
            _, log_a, log_b = op
            state = apply_cz(state, log_a, log_b, n)
        elif op[0] == 'Ry':
            _, log_q, angle = op
            state = apply_single_qubit(state, ry_matrix(angle), log_q, n)
        elif op[0] == 'Rz':
            _, log_q, angle = op
            state = apply_single_qubit(state, rz_matrix(angle), log_q, n)

    return state


def compute_heavy_outputs(state):
    """Determine the heavy output set from an ideal state vector.

    Returns:
        ideal_dist: dict of bitstring -> probability
        heavy_set: set of heavy bitstrings
        median_prob: the median probability
        ideal_hof: ideal heavy output fraction
    """
    n = NUM_QUBITS
    probs = np.abs(state) ** 2

    all_probs = []
    ideal_dist = {}
    for i in range(2 ** n):
        bs = format(i, f'0{n}b')
        p = float(probs[i])
        all_probs.append((bs, p))
        if p > 1e-12:
            ideal_dist[bs] = p

    probs_only = [p for _, p in all_probs]
    median_prob = float(np.median(probs_only))

    heavy_set = {bs for bs, p in all_probs if p > median_prob}
    ideal_hof = sum(p for bs, p in all_probs if bs in heavy_set)

    return ideal_dist, heavy_set, median_prob, ideal_hof


def emulator_bs_to_logical(bitstring, phys_to_logical_map, n_total=9):
    """Convert a qxelarator bitstring to a 4-bit logical bitstring.

    qxelarator uses MSB-first convention:
      bitstring[i] = qubit (n_total - 1 - i)

    Ideal distribution uses MSB-first: format(i,'04b') where
      bs[j] = logical qubit (n_logical - 1 - j)
    """
    logical_bits = ['0'] * NUM_QUBITS
    for phys_idx, log_idx in phys_to_logical_map.items():
        # MSB-first: physical qubit phys_idx is at position (n_total - 1 - phys_idx)
        bs_pos = n_total - 1 - phys_idx
        qubit_val = bitstring[bs_pos]
        # MSB-first logical: position (NUM_QUBITS - 1 - log_idx)
        logical_bits[NUM_QUBITS - 1 - log_idx] = qubit_val
    return ''.join(logical_bits)


def compute_hof_from_counts(counts, heavy_set, phys_to_logical_map):
    """Compute heavy output fraction from emulator measurement counts."""
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

    # Physical-to-logical mapping
    # PHYS_QUBITS = [1, 3, 4, 6] -> logical [0, 1, 2, 3]
    phys_to_logical = {1: 0, 3: 1, 4: 2, 6: 3}

    print("=" * 70)
    print("  Quantum Volume 16 v2 — Native Gates on Connected Qubits")
    print("  n=4, d=4, 10 circuits, qubits q1,q3,q4,q6")
    print("  Gate set: CZ, Ry, Rz (native Tuna-9)")
    print("  Pairings: (q1,q3)+(q4,q6) or (q1,q4)+(q3,q6)")
    print("=" * 70)

    all_circuits_data = []
    hof_values = []

    for circ_idx in range(NUM_CIRCUITS):
        print(f"\n{'─' * 70}")
        print(f"  Circuit {circ_idx}")
        print(f"{'─' * 70}")

        # Generate random layers
        layers = []
        for layer_idx in range(NUM_LAYERS):
            pair_choice = rng.randint(0, len(PAIR_OPTIONS))
            pairs = PAIR_OPTIONS[pair_choice]
            gates = [generate_su4_angles(rng) for _ in pairs]
            layers.append({'pairs': pairs, 'gates': gates})

        # Print layer pairings
        for layer_idx, layer in enumerate(layers):
            pair_strs = []
            for (la, lb) in layer['pairs']:
                pair_strs.append(f"(q{PHYS_QUBITS[la]},q{PHYS_QUBITS[lb]})")
            print(f"  Layer {layer_idx}: {' + '.join(pair_strs)}")

        # Build native gate operations (merged and cleaned)
        native_ops = build_native_ops(layers)

        # Build cQASM circuit from native ops
        cqasm = ops_to_cqasm(native_ops, circ_idx)

        # Count gates
        n_cz = sum(1 for op in native_ops if op[0] == 'CZ')
        n_ry = sum(1 for op in native_ops if op[0] == 'Ry')
        n_rz = sum(1 for op in native_ops if op[0] == 'Rz')
        print(f"  Gates: {n_cz} CZ, {n_ry} Ry, {n_rz} Rz (total {len(native_ops)})")

        # Compute ideal state vector (from original decomposition)
        state_ideal = compute_ideal_statevector(layers)

        # Verify native decomposition matches
        state_native = compute_ideal_statevector_native(native_ops)
        fidelity = abs(np.vdot(state_ideal, state_native)) ** 2
        print(f"  Native decomposition fidelity: {fidelity:.10f}")
        assert fidelity > 1 - 1e-8, f"Native decomposition mismatch! Fidelity={fidelity}"

        # Also verify with the merged/cleaned ops
        unmerged_ops = []
        for layer in layers:
            for pair_idx, (log_a, log_b) in enumerate(layer['pairs']):
                unmerged_ops.extend(expand_su4_to_native(log_a, log_b, layer['gates'][pair_idx]))
        state_unmerged = compute_ideal_statevector_native(unmerged_ops)
        fidelity_merge = abs(np.vdot(state_unmerged, state_native)) ** 2
        print(f"  Merge verification fidelity:   {fidelity_merge:.10f}")
        assert fidelity_merge > 1 - 1e-8, f"Merge broke the circuit! Fidelity={fidelity_merge}"

        # Compute heavy outputs
        ideal_dist, heavy_set, median_prob, ideal_hof = compute_heavy_outputs(state_ideal)

        print(f"  Ideal heavy output fraction: {ideal_hof:.4f}")
        print(f"  Heavy outputs ({len(heavy_set)}/{2**NUM_QUBITS}): {sorted(list(heavy_set))}")

        # Top 5 ideal probabilities
        sorted_dist = sorted(ideal_dist.items(), key=lambda x: -x[1])[:5]
        print(f"  Top 5 ideal probs:")
        for bs, p in sorted_dist:
            marker = " [H]" if bs in heavy_set else ""
            print(f"    |{bs}> : {p:.4f}{marker}")

        # Store state vector as list of (real, imag) for JSON
        state_list = [(float(s.real), float(s.imag)) for s in state_ideal]

        all_circuits_data.append({
            "circuit_id": f"qv16_c{circ_idx}",
            "cqasm": cqasm,
            "ideal_distribution": ideal_dist,
            "ideal_state_vector": state_list,
            "heavy_output_set": {
                "heavy_bitstrings": sorted(list(heavy_set)),
                "median_probability": median_prob,
                "ideal_heavy_output_fraction": ideal_hof,
                "n_heavy": len(heavy_set),
            },
            "gate_counts": {"CZ": n_cz, "Ry": n_ry, "Rz": n_rz, "total": len(native_ops)},
            "layers": [
                {
                    "pairs": [(PHYS_QUBITS[la], PHYS_QUBITS[lb]) for la, lb in layer['pairs']],
                }
                for layer in layers
            ],
        })

    # ── Emulator verification (first 3 circuits) ────────────────────────
    print(f"\n{'=' * 70}")
    print(f"  EMULATOR VERIFICATION (circuits 0-2, {SHOTS_EMULATOR} shots each)")
    print(f"{'=' * 70}")

    for circ_idx in range(3):
        cdata = all_circuits_data[circ_idx]
        heavy_set = set(cdata["heavy_output_set"]["heavy_bitstrings"])

        print(f"\n  Circuit {circ_idx}: running on qxelarator...")
        result = qxelarator.execute_string(cdata["cqasm"], iterations=SHOTS_EMULATOR)
        counts = result.results

        hof = compute_hof_from_counts(counts, heavy_set, phys_to_logical)
        hof_values.append(hof)

        cdata["emulator_counts"] = {k: int(v) for k, v in counts.items()}
        cdata["emulator_hof"] = hof
        cdata["emulator_passed"] = hof > 2/3

        print(f"  HOF: {hof:.4f} ({'PASS' if hof > 2/3 else 'FAIL'})")

        # Top 5 emulator outcomes
        total_shots = sum(counts.values())
        sorted_counts = sorted(counts.items(), key=lambda x: -x[1])[:5]
        print(f"  Top 5 emulator outcomes:")
        for bs, c in sorted_counts:
            logical_bs = emulator_bs_to_logical(bs, phys_to_logical)
            marker = " [H]" if logical_bs in heavy_set else ""
            print(f"    {bs} -> |{logical_bs}> : {int(c)} ({c/total_shots*100:.1f}%){marker}")

    # ── Summary ─────────────────────────────────────────────────────────
    mean_hof = np.mean(hof_values)
    std_hof = np.std(hof_values) / np.sqrt(len(hof_values))

    print(f"\n{'=' * 70}")
    print(f"  EMULATOR SUMMARY (3 circuits)")
    print(f"{'=' * 70}")
    print(f"  Mean HOF:        {mean_hof:.4f}")
    print(f"  Std error:       {std_hof:.4f}")
    print(f"  Per-circuit:     {[f'{h:.3f}' for h in hof_values]}")
    print(f"  All > 2/3:       {all(h > 2/3 for h in hof_values)}")

    # ── Save results ────────────────────────────────────────────────────
    output = {
        "schema_version": "2.0",
        "id": "qv16-tuna9-v2-native",
        "type": "quantum_volume",
        "generated": datetime.now(timezone.utc).isoformat(),
        "parameters": {
            "n_qubits": NUM_QUBITS,
            "n_layers": NUM_LAYERS,
            "n_circuits": NUM_CIRCUITS,
            "seed": SEED,
            "physical_qubits": PHYS_QUBITS,
            "gate_set": ["CZ", "Ry", "Rz"],
            "pair_options": [
                "(q1,q3)+(q4,q6)",
                "(q1,q4)+(q3,q6)",
            ],
            "topology_edges_used": ["1-3", "1-4", "3-6", "4-6"],
            "qubit_error_rates": {"q1": 0.037, "q3": 0.052, "q4": 0.019, "q6": 0.027},
        },
        "circuits": all_circuits_data,
        "emulator_verification": {
            "backend": "qxelarator",
            "shots": SHOTS_EMULATOR,
            "circuits_verified": 3,
            "mean_hof": mean_hof,
            "per_circuit_hof": hof_values,
        },
    }

    outpath = "/Users/dereklomas/haiqu/experiments/results/qv16-tuna9-v2-circuits-native.json"
    with open(outpath, "w") as f:
        json.dump(output, f, indent=2, default=str)
    print(f"\n  Results saved to: {outpath}")

    # Print sample circuit
    print(f"\n{'=' * 70}")
    print(f"  SAMPLE CIRCUIT (qv16_c0)")
    print(f"{'=' * 70}")
    print(all_circuits_data[0]["cqasm"])


if __name__ == "__main__":
    main()
