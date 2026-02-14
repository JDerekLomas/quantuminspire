#!/usr/bin/env python3
"""QAOA MaxCut circuits for 4-cycle subgraphs on Tuna-9 (12-edge topology).

This is a direct improvement over the Harrigan 2021 replication which could
only test TREE subgraphs because the old 10-edge topology had no cycles.
With the new 12-edge topology (edges 4-7 and 5-7 confirmed), Tuna-9 now
has 4-cycle subgraphs — the first NON-TREE graphs testable on this hardware.

Two 4-cycles:
  Cycle A: q4-q6-q8-q7 with edges (4,6), (6,8), (7,8), (4,7)
  Cycle B: q2-q4-q7-q5 with edges (2,4), (4,7), (5,7), (2,5)

For a 4-cycle MaxCut:
  - Classical max cut = 4 (bipartite: color alternating vertices differently)
  - Max cut states: alternating 0/1 around the cycle
  - p=1 theoretical approximation ratio ~ 0.75

Pre-optimized angles (from literature):
  p=1: gamma = pi/4 ≈ 0.7854, beta = pi/8 ≈ 0.3927
  p=2: gamma1=0.3, beta1=0.7, gamma2=0.8, beta2=0.3

Verifies on qxelarator (MSB-first bitstring convention: str[0]=q_{N-1}).
"""

import json
import math
import qxelarator

SHOTS = 8192

# ============================================================
# Circuit definitions
# ============================================================

def qaoa_cycle_a_p1():
    """QAOA p=1 on 4-cycle q4-q6-q8-q7.
    Edges: (4,6), (6,8), (7,8), (4,7)
    gamma = pi/4 ≈ 0.7854, beta = pi/8 ≈ 0.3927
    """
    gamma = math.pi / 4  # 0.785398
    beta = math.pi / 8   # 0.392699
    # Cost unitary per edge: exp(+i*gamma/2 * ZZ)
    # CNOT-Rz(theta)-CNOT = exp(-i*theta/2 * ZZ)
    # So theta = -gamma to get exp(+i*gamma/2 * ZZ)
    rz_angle = -gamma     # -0.785398
    rx_angle = 2 * beta   # 0.785398

    return f"""version 3.0
qubit[9] q
bit[9] b

// QAOA MaxCut p=1: 4-cycle q4-q6-q8-q7
// gamma = pi/4 = {gamma:.6f}, beta = pi/8 = {beta:.6f}
// Edges: (4,6), (6,8), (7,8), (4,7)
// Classical max cut = 4
// ZZ decomposition: CNOT-Rz(-gamma)-CNOT = exp(+i*gamma/2 * ZZ)

// 1. Initial superposition
H q[4]
H q[6]
H q[7]
H q[8]

// 2. Cost unitary: exp(-i*gamma*C) where C = sum (1-ZZ)/2
// Edge (4,6): CNOT-Rz(-gamma)-CNOT
CNOT q[4], q[6]
Rz({rz_angle:.6f}) q[6]
CNOT q[4], q[6]

// Edge (6,8): CNOT-Rz(-gamma)-CNOT
CNOT q[6], q[8]
Rz({rz_angle:.6f}) q[8]
CNOT q[6], q[8]

// Edge (7,8): CNOT-Rz(-gamma)-CNOT
CNOT q[7], q[8]
Rz({rz_angle:.6f}) q[8]
CNOT q[7], q[8]

// Edge (4,7): CNOT-Rz(-gamma)-CNOT
CNOT q[4], q[7]
Rz({rz_angle:.6f}) q[7]
CNOT q[4], q[7]

// 3. Mixer unitary: Rx(2*beta) on each qubit
Rx({rx_angle:.6f}) q[4]
Rx({rx_angle:.6f}) q[6]
Rx({rx_angle:.6f}) q[7]
Rx({rx_angle:.6f}) q[8]

// 4. Measure
b = measure q
"""


def qaoa_cycle_a_p2():
    """QAOA p=2 on 4-cycle q4-q6-q8-q7.
    Edges: (4,6), (6,8), (7,8), (4,7)
    Layer 1: gamma1=0.3, beta1=0.7
    Layer 2: gamma2=0.8, beta2=0.3
    """
    gamma1, beta1 = 0.3, 0.7
    gamma2, beta2 = 0.8, 0.3
    rz1 = -gamma1
    rx1 = 2 * beta1
    rz2 = -gamma2
    rx2 = 2 * beta2

    return f"""version 3.0
qubit[9] q
bit[9] b

// QAOA MaxCut p=2: 4-cycle q4-q6-q8-q7
// Layer 1: gamma1={gamma1}, beta1={beta1}
// Layer 2: gamma2={gamma2}, beta2={beta2}
// Edges: (4,6), (6,8), (7,8), (4,7)
// Classical max cut = 4

// 1. Initial superposition
H q[4]
H q[6]
H q[7]
H q[8]

// ====== LAYER 1 ======
// Cost unitary: ZZ(gamma1) for each edge
CNOT q[4], q[6]
Rz({rz1:.6f}) q[6]
CNOT q[4], q[6]

CNOT q[6], q[8]
Rz({rz1:.6f}) q[8]
CNOT q[6], q[8]

CNOT q[7], q[8]
Rz({rz1:.6f}) q[8]
CNOT q[7], q[8]

CNOT q[4], q[7]
Rz({rz1:.6f}) q[7]
CNOT q[4], q[7]

// Mixer unitary: Rx(2*beta1) on each qubit
Rx({rx1:.6f}) q[4]
Rx({rx1:.6f}) q[6]
Rx({rx1:.6f}) q[7]
Rx({rx1:.6f}) q[8]

// ====== LAYER 2 ======
// Cost unitary: ZZ(gamma2) for each edge
CNOT q[4], q[6]
Rz({rz2:.6f}) q[6]
CNOT q[4], q[6]

CNOT q[6], q[8]
Rz({rz2:.6f}) q[8]
CNOT q[6], q[8]

CNOT q[7], q[8]
Rz({rz2:.6f}) q[8]
CNOT q[7], q[8]

CNOT q[4], q[7]
Rz({rz2:.6f}) q[7]
CNOT q[4], q[7]

// Mixer unitary: Rx(2*beta2) on each qubit
Rx({rx2:.6f}) q[4]
Rx({rx2:.6f}) q[6]
Rx({rx2:.6f}) q[7]
Rx({rx2:.6f}) q[8]

// Measure
b = measure q
"""


def qaoa_cycle_b_p1():
    """QAOA p=1 on 4-cycle q2-q4-q7-q5.
    Edges: (2,4), (4,7), (5,7), (2,5)
    gamma = pi/4, beta = pi/8
    """
    gamma = math.pi / 4
    beta = math.pi / 8
    rz_angle = -gamma
    rx_angle = 2 * beta

    return f"""version 3.0
qubit[9] q
bit[9] b

// QAOA MaxCut p=1: 4-cycle q2-q4-q7-q5
// gamma = pi/4 = {gamma:.6f}, beta = pi/8 = {beta:.6f}
// Edges: (2,4), (4,7), (5,7), (2,5)
// Classical max cut = 4
// ZZ decomposition: CNOT-Rz(-gamma)-CNOT = exp(+i*gamma/2 * ZZ)

// 1. Initial superposition
H q[2]
H q[4]
H q[5]
H q[7]

// 2. Cost unitary: exp(-i*gamma*C) where C = sum (1-ZZ)/2
// Edge (2,4): CNOT-Rz(-gamma)-CNOT
CNOT q[2], q[4]
Rz({rz_angle:.6f}) q[4]
CNOT q[2], q[4]

// Edge (4,7): CNOT-Rz(-gamma)-CNOT
CNOT q[4], q[7]
Rz({rz_angle:.6f}) q[7]
CNOT q[4], q[7]

// Edge (5,7): CNOT-Rz(-gamma)-CNOT
CNOT q[5], q[7]
Rz({rz_angle:.6f}) q[7]
CNOT q[5], q[7]

// Edge (2,5): CNOT-Rz(-gamma)-CNOT
CNOT q[2], q[5]
Rz({rz_angle:.6f}) q[5]
CNOT q[2], q[5]

// 3. Mixer unitary: Rx(2*beta) on each qubit
Rx({rx_angle:.6f}) q[2]
Rx({rx_angle:.6f}) q[4]
Rx({rx_angle:.6f}) q[5]
Rx({rx_angle:.6f}) q[7]

// 4. Measure
b = measure q
"""


# ============================================================
# Analysis helpers
# ============================================================

def extract_qubit_values(bitstring, qubit_indices):
    """Extract qubit values from a 9-bit MSB-first bitstring.

    qxelarator convention for 9 qubits: "abcdefghi" means
    a=q8, b=q7, c=q6, d=q5, e=q4, f=q3, g=q2, h=q1, i=q0
    i.e., str[pos] = q[N-1-pos] where N = len(bitstring)

    Verified empirically: X q[0] -> "000000001", X q[8] -> "100000000"
    """
    n = len(bitstring)
    return tuple(int(bitstring[n - 1 - q]) for q in qubit_indices)


def compute_cut_value(qubit_values, edges, qubit_indices):
    """Compute number of edges cut by a given assignment.

    qubit_values: tuple of 0/1 for each logical vertex
    edges: list of (physical_q_i, physical_q_j)
    qubit_indices: list of physical qubits (maps position -> physical qubit)
    """
    # Build physical -> position map
    phys_to_pos = {q: i for i, q in enumerate(qubit_indices)}
    cuts = 0
    for qi, qj in edges:
        vi = qubit_values[phys_to_pos[qi]]
        vj = qubit_values[phys_to_pos[qj]]
        if vi != vj:
            cuts += 1
    return cuts


def analyze_results(counts, qubit_indices, edges, label, classical_max_cut=4):
    """Analyze QAOA MaxCut results from qxelarator."""
    total = sum(counts.values())

    # Compute expected cut value
    expected_cut = 0.0
    # Track max-cut state probabilities
    maxcut_prob = 0.0
    # Distribution over cut values
    cut_distribution = {}

    for bitstring, count in counts.items():
        qvals = extract_qubit_values(bitstring, qubit_indices)
        cut = compute_cut_value(qvals, edges, qubit_indices)
        expected_cut += cut * count / total

        cut_distribution[cut] = cut_distribution.get(cut, 0) + count

        if cut == classical_max_cut:
            maxcut_prob += count / total

    approx_ratio = expected_cut / classical_max_cut

    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"{'='*60}")
    print(f"  Qubits: {qubit_indices}")
    print(f"  Edges:  {edges}")
    print(f"  Shots:  {total}")
    print(f"  Classical max cut: {classical_max_cut}")
    print(f"  Expected cut: {expected_cut:.4f}")
    print(f"  Approximation ratio: {approx_ratio:.4f}")
    print(f"  Max-cut state probability: {maxcut_prob:.4f}")
    print(f"  Random baseline (uniform): {sum(c * cut_distribution.get(c, 0) for c in range(classical_max_cut+1)) / total / classical_max_cut:.4f}")
    print()

    # Cut value distribution
    print(f"  Cut distribution:")
    for c in sorted(cut_distribution.keys()):
        pct = cut_distribution[c] / total * 100
        bar = "#" * int(pct / 2)
        print(f"    cut={c}: {cut_distribution[c]:5d} ({pct:5.1f}%) {bar}")

    # Top 10 bitstrings (projected to relevant qubits)
    print(f"\n  Top bitstrings (projected to {qubit_indices}):")
    projected = {}
    for bitstring, count in counts.items():
        qvals = extract_qubit_values(bitstring, qubit_indices)
        key = "".join(str(v) for v in qvals)
        projected[key] = projected.get(key, 0) + count

    sorted_proj = sorted(projected.items(), key=lambda x: -x[1])
    for i, (bs, count) in enumerate(sorted_proj[:10]):
        pct = count / total * 100
        qvals = tuple(int(b) for b in bs)
        cut = compute_cut_value(qvals, edges, qubit_indices)
        maxcut_marker = " <-- MAX CUT" if cut == classical_max_cut else ""
        print(f"    {bs}: {count:5d} ({pct:5.1f}%) cut={cut}{maxcut_marker}")

    return {
        "label": label,
        "qubits": qubit_indices,
        "edges": edges,
        "shots": total,
        "expected_cut": round(expected_cut, 4),
        "approximation_ratio": round(approx_ratio, 4),
        "maxcut_probability": round(maxcut_prob, 4),
        "cut_distribution": {str(k): v for k, v in sorted(cut_distribution.items())},
        "top_states": {bs: count for bs, count in sorted_proj[:10]},
    }


# ============================================================
# Main: generate circuits and run on emulator
# ============================================================

if __name__ == "__main__":
    circuits = {
        "cycle_a_p1": {
            "circuit": qaoa_cycle_a_p1(),
            "qubits": [4, 6, 7, 8],
            "edges": [(4, 6), (6, 8), (7, 8), (4, 7)],
            "label": "Cycle A (q4-q6-q8-q7) p=1, gamma=pi/4, beta=pi/8",
        },
        "cycle_a_p2": {
            "circuit": qaoa_cycle_a_p2(),
            "qubits": [4, 6, 7, 8],
            "edges": [(4, 6), (6, 8), (7, 8), (4, 7)],
            "label": "Cycle A (q4-q6-q8-q7) p=2, gamma1=0.3/beta1=0.7, gamma2=0.8/beta2=0.3",
        },
        "cycle_b_p1": {
            "circuit": qaoa_cycle_b_p1(),
            "qubits": [2, 4, 5, 7],
            "edges": [(2, 4), (4, 7), (5, 7), (2, 5)],
            "label": "Cycle B (q2-q4-q7-q5) p=1, gamma=pi/4, beta=pi/8",
        },
    }

    # Print circuit strings
    for name, info in circuits.items():
        print(f"\n{'#'*60}")
        print(f"# Circuit: {name}")
        print(f"{'#'*60}")
        print(info["circuit"])

    # Run on emulator
    all_results = {}
    for name, info in circuits.items():
        print(f"\nRunning {name} on qxelarator ({SHOTS} shots)...")
        result = qxelarator.execute_string(info["circuit"], iterations=SHOTS)

        if hasattr(result, 'results'):
            counts = result.results
        else:
            print(f"  ERROR: {result}")
            continue

        analysis = analyze_results(
            counts,
            info["qubits"],
            info["edges"],
            info["label"],
        )
        all_results[name] = {
            "analysis": analysis,
            "circuit_cqasm": info["circuit"],
        }

    # Compute theoretical random baseline for comparison
    # For 4-cycle with uniform random: expected cut = 2.0 (each edge cut with prob 0.5)
    print(f"\n{'='*60}")
    print(f"  SUMMARY")
    print(f"{'='*60}")
    print(f"  Random baseline: expected cut = 2.0, ratio = 0.5000")
    for name, data in all_results.items():
        a = data["analysis"]
        print(f"  {name}: cut={a['expected_cut']:.4f}, ratio={a['approximation_ratio']:.4f}, "
              f"P(maxcut)={a['maxcut_probability']:.4f}")

    # Identify max-cut states for Cycle A
    print(f"\n  Max-cut states for Cycle A (q4-q6-q8-q7):")
    print(f"    q4=0,q6=1,q7=0,q8=1 -> alternating around cycle (0,1,0,1)")
    print(f"    q4=1,q6=0,q7=1,q8=0 -> alternating around cycle (1,0,1,0)")
    print(f"    In MSB-first 9-bit: str[N-1-q] = qubit value")

    print(f"\n  Max-cut states for Cycle B (q2-q4-q7-q5):")
    print(f"    q2=0,q4=1,q5=0,q7=1 -> alternating (0,1,0,1)")
    print(f"    q2=1,q4=0,q5=1,q7=0 -> alternating (1,0,1,0)")

    # Save output
    output = {
        "experiment": "qaoa-4cycle-emulator-verification",
        "description": "QAOA MaxCut on 4-cycle subgraphs of Tuna-9 (12-edge topology). "
                       "First non-tree graphs testable on this hardware.",
        "shots": SHOTS,
        "circuits": {},
        "results": {},
    }
    for name, data in all_results.items():
        output["circuits"][name] = data["circuit_cqasm"]
        output["results"][name] = data["analysis"]

    outpath = "/Users/dereklomas/haiqu/experiments/results/qaoa-4cycle-emulator.json"
    with open(outpath, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\n  Saved results to {outpath}")
