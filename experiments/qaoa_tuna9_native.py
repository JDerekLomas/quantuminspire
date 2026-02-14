#!/usr/bin/env python3
"""QAOA MaxCut circuits for 4-cycles on Tuna-9, in native gate set {CZ, Ry, Rz, X}.

All gates decomposed to Tuna-9 native gates:
  H        -> Rz(pi); Ry(pi/2)
  CNOT(a,b)-> Ry(-pi/2, b); CZ(a,b); Ry(pi/2, b)
  Rx(theta)-> Rz(-pi/2); Ry(theta); Rz(pi/2)

After decomposition, consecutive same-axis single-qubit rotations are merged,
and near-zero rotations (|angle| < 1e-10) are removed.

Tuna-9 connectivity (connected pairs):
  0-1, 0-2, 1-3, 1-4, 2-4, 2-5, 3-6, 4-6, 6-8, 7-8

Circuits:
  1. p=1 on 4-cycle {1,3,6,4}: edges 1-3, 3-6, 4-6, 1-4
     gamma=pi/4, beta=pi/8
  2. p=2 on same cycle: gamma1=0.3, beta1=0.7, gamma2=0.8, beta2=0.3
  3. p=1 on 4-cycle {0,1,4,2}: edges 0-1, 1-4, 4-2, 2-0
     gamma=pi/4, beta=pi/8

For a 4-cycle MaxCut:
  - Classical max cut = 4 (bipartite: alternating colors)
  - p=1 theoretical approximation ratio ~ 0.75
"""

import json
import math
import qxelarator
from datetime import datetime, timezone

SHOTS = 8192

# Tuna-9 connected pairs (bidirectional)
TUNA9_EDGES = {
    frozenset({0, 1}), frozenset({0, 2}), frozenset({1, 3}), frozenset({1, 4}),
    frozenset({2, 4}), frozenset({2, 5}), frozenset({3, 6}), frozenset({4, 6}),
    frozenset({6, 8}), frozenset({7, 8}),
}

# Error rates per qubit
QUBIT_ERROR_RATES = {
    0: None, 1: 0.037, 2: None, 3: 0.052, 4: 0.019, 5: None,
    6: 0.027, 7: None, 8: None,
}


def is_connected(q1, q2):
    """Check if two qubits are connected on Tuna-9."""
    return frozenset({q1, q2}) in TUNA9_EDGES


# ============================================================
# Native gate circuit builder
# ============================================================

class NativeCircuitBuilder:
    """Builds cQASM 3.0 circuits using only native gates {CZ, Ry, Rz, X}.

    Tracks pending single-qubit rotations per qubit to merge consecutive
    same-axis rotations. All rotations are stored as (axis, angle) pairs
    where axis is 'y' or 'z'. When a two-qubit gate or measurement is
    encountered, pending rotations are flushed.
    """

    def __init__(self, n_qubits=9):
        self.n_qubits = n_qubits
        self.ops = []  # list of (type, args) tuples
        # Pending rotations per qubit: list of ('y'|'z', angle)
        self.pending = {q: [] for q in range(n_qubits)}

    def _flush_qubit(self, q):
        """Merge and emit pending rotations for a qubit."""
        merged = self._merge_rotations(self.pending[q])
        for axis, angle in merged:
            if abs(angle) < 1e-10:
                continue
            if axis == 'y':
                self.ops.append(('Ry', q, angle))
            elif axis == 'z':
                self.ops.append(('Rz', q, angle))
        self.pending[q] = []

    def _merge_rotations(self, rotations):
        """Merge consecutive same-axis rotations."""
        if not rotations:
            return []
        merged = [rotations[0]]
        for axis, angle in rotations[1:]:
            if merged[-1][0] == axis:
                merged[-1] = (axis, merged[-1][1] + angle)
            else:
                merged.append((axis, angle))
        # Remove near-zero entries
        return [(a, ang) for a, ang in merged if abs(ang) > 1e-10]

    def ry(self, q, angle):
        self.pending[q].append(('y', angle))

    def rz(self, q, angle):
        self.pending[q].append(('z', angle))

    def h(self, q):
        """H = Rz(pi) Ry(pi/2)."""
        self.rz(q, math.pi)
        self.ry(q, math.pi / 2)

    def cz(self, q1, q2):
        """CZ gate — flushes both qubits first."""
        assert is_connected(q1, q2), f"CZ({q1},{q2}) not connected on Tuna-9!"
        self._flush_qubit(q1)
        self._flush_qubit(q2)
        self.ops.append(('CZ', q1, q2))

    def cnot(self, ctrl, tgt):
        """CNOT(ctrl, tgt) = Ry(-pi/2, tgt); CZ(ctrl, tgt); Ry(pi/2, tgt).

        Note: we add Ry rotations to pending before/after the CZ.
        The CZ flush will emit the pre-CZ Ry, then after CZ we add the post-CZ Ry to pending.
        """
        self.ry(tgt, -math.pi / 2)
        self.cz(ctrl, tgt)  # flushes both qubits (including the Ry(-pi/2) on tgt)
        self.ry(tgt, math.pi / 2)

    def rx(self, q, angle):
        """Rx(theta) = Rz(-pi/2) Ry(theta) Rz(pi/2)."""
        self.rz(q, -math.pi / 2)
        self.ry(q, angle)
        self.rz(q, math.pi / 2)

    def zz_cost(self, q1, q2, gamma):
        """ZZ cost unitary for edge (q1,q2): CNOT(q1,q2); Rz(-gamma, q2); CNOT(q1,q2).

        Implements exp(+i*gamma/2 * Z_q1 Z_q2).
        """
        self.cnot(q1, q2)
        self.rz(q2, -gamma)
        self.cnot(q1, q2)

    def comment(self, text):
        """Add a comment line."""
        # Flush nothing — comments are structural
        self.ops.append(('COMMENT', text))

    def flush_all(self):
        """Flush all pending rotations."""
        for q in range(self.n_qubits):
            self._flush_qubit(q)

    def to_cqasm(self, header_comment=""):
        """Generate cQASM 3.0 string. Flushes all pending rotations first."""
        self.flush_all()

        lines = ["version 3.0", f"qubit[{self.n_qubits}] q", f"bit[{self.n_qubits}] b"]
        if header_comment:
            lines.append("")
            for line in header_comment.strip().split("\n"):
                lines.append(f"// {line}")
        lines.append("")

        for op in self.ops:
            if op[0] == 'COMMENT':
                lines.append(f"// {op[1]}")
            elif op[0] == 'Ry':
                q, angle = op[1], op[2]
                lines.append(f"Ry({angle:.6f}) q[{q}]")
            elif op[0] == 'Rz':
                q, angle = op[1], op[2]
                lines.append(f"Rz({angle:.6f}) q[{q}]")
            elif op[0] == 'CZ':
                q1, q2 = op[1], op[2]
                lines.append(f"CZ q[{q1}], q[{q2}]")
            elif op[0] == 'X':
                q = op[1]
                lines.append(f"X q[{q}]")

        lines.append("")
        lines.append("b = measure q")
        lines.append("")
        return "\n".join(lines)

    def gate_counts(self):
        """Count gates in the circuit (after flush)."""
        self.flush_all()
        counts = {'CZ': 0, 'Ry': 0, 'Rz': 0, 'X': 0}
        for op in self.ops:
            if op[0] in counts:
                counts[op[0]] += 1
        counts['total_1q'] = counts['Ry'] + counts['Rz'] + counts['X']
        counts['total_2q'] = counts['CZ']
        counts['total'] = counts['total_1q'] + counts['total_2q']
        return counts


# ============================================================
# Circuit generators
# ============================================================

def build_qaoa_p1_cycle1():
    """p=1 QAOA MaxCut on 4-cycle {1,3,6,4}.
    Edges: 1-3, 3-6, 4-6, 1-4
    gamma=pi/4, beta=pi/8
    """
    gamma = math.pi / 4
    beta = math.pi / 8
    qubits = [1, 3, 4, 6]
    edges = [(1, 3), (3, 6), (4, 6), (1, 4)]

    cb = NativeCircuitBuilder(9)

    cb.comment("QAOA MaxCut p=1: 4-cycle {1,3,6,4}")
    cb.comment(f"gamma = pi/4 = {gamma:.6f}, beta = pi/8 = {beta:.6f}")
    cb.comment(f"Edges: {edges}")
    cb.comment("Native gate set: CZ, Ry, Rz")
    cb.comment("")

    # 1. Initial superposition: H on each qubit
    cb.comment("1. Initial superposition (H = Rz(pi) Ry(pi/2))")
    for q in qubits:
        cb.h(q)

    cb.comment("")

    # 2. Cost unitary
    cb.comment("2. Cost unitary: ZZ(-gamma) per edge via CNOT-Rz-CNOT")
    for q1, q2 in edges:
        cb.comment(f"  Edge ({q1},{q2})")
        cb.zz_cost(q1, q2, gamma)

    cb.comment("")

    # 3. Mixer
    cb.comment("3. Mixer: Rx(2*beta) = Rz(-pi/2) Ry(2*beta) Rz(pi/2)")
    for q in qubits:
        cb.rx(q, 2 * beta)

    return cb, qubits, edges


def build_qaoa_p2_cycle1():
    """p=2 QAOA MaxCut on 4-cycle {1,3,6,4}.
    Edges: 1-3, 3-6, 4-6, 1-4
    Layer 1: gamma1=0.3, beta1=0.7
    Layer 2: gamma2=0.8, beta2=0.3
    """
    gamma1, beta1 = 0.3, 0.7
    gamma2, beta2 = 0.8, 0.3
    qubits = [1, 3, 4, 6]
    edges = [(1, 3), (3, 6), (4, 6), (1, 4)]

    cb = NativeCircuitBuilder(9)

    cb.comment("QAOA MaxCut p=2: 4-cycle {1,3,6,4}")
    cb.comment(f"Layer 1: gamma1={gamma1}, beta1={beta1}")
    cb.comment(f"Layer 2: gamma2={gamma2}, beta2={beta2}")
    cb.comment(f"Edges: {edges}")
    cb.comment("Native gate set: CZ, Ry, Rz")
    cb.comment("")

    # 1. Initial superposition
    cb.comment("1. Initial superposition")
    for q in qubits:
        cb.h(q)

    cb.comment("")

    # Layer 1
    cb.comment("====== LAYER 1 ======")
    cb.comment("Cost unitary: ZZ(gamma1)")
    for q1, q2 in edges:
        cb.comment(f"  Edge ({q1},{q2})")
        cb.zz_cost(q1, q2, gamma1)

    cb.comment("Mixer: Rx(2*beta1)")
    for q in qubits:
        cb.rx(q, 2 * beta1)

    cb.comment("")

    # Layer 2
    cb.comment("====== LAYER 2 ======")
    cb.comment("Cost unitary: ZZ(gamma2)")
    for q1, q2 in edges:
        cb.comment(f"  Edge ({q1},{q2})")
        cb.zz_cost(q1, q2, gamma2)

    cb.comment("Mixer: Rx(2*beta2)")
    for q in qubits:
        cb.rx(q, 2 * beta2)

    return cb, qubits, edges


def build_qaoa_p1_cycle2():
    """p=1 QAOA MaxCut on 4-cycle {0,1,4,2}.
    Edges: 0-1, 1-4, 4-2, 2-0
    gamma=pi/4, beta=pi/8
    """
    gamma = math.pi / 4
    beta = math.pi / 8
    qubits = [0, 1, 2, 4]
    edges = [(0, 1), (1, 4), (2, 4), (0, 2)]

    cb = NativeCircuitBuilder(9)

    cb.comment("QAOA MaxCut p=1: 4-cycle {0,1,4,2}")
    cb.comment(f"gamma = pi/4 = {gamma:.6f}, beta = pi/8 = {beta:.6f}")
    cb.comment(f"Edges: {edges}")
    cb.comment("Native gate set: CZ, Ry, Rz")
    cb.comment("")

    # 1. Initial superposition
    cb.comment("1. Initial superposition")
    for q in qubits:
        cb.h(q)

    cb.comment("")

    # 2. Cost unitary
    cb.comment("2. Cost unitary: ZZ(-gamma) per edge")
    for q1, q2 in edges:
        cb.comment(f"  Edge ({q1},{q2})")
        cb.zz_cost(q1, q2, gamma)

    cb.comment("")

    # 3. Mixer
    cb.comment("3. Mixer: Rx(2*beta)")
    for q in qubits:
        cb.rx(q, 2 * beta)

    return cb, qubits, edges


# ============================================================
# Analysis
# ============================================================

def extract_qubit_values(bitstring, qubit_indices):
    """Extract qubit values from a 9-bit MSB-first bitstring.
    qxelarator: str[pos] = q[N-1-pos] where N=len(bitstring).
    """
    n = len(bitstring)
    return tuple(int(bitstring[n - 1 - q]) for q in qubit_indices)


def compute_cut_value(qubit_values, edges, qubit_indices):
    """Compute number of edges cut."""
    phys_to_pos = {q: i for i, q in enumerate(qubit_indices)}
    cuts = 0
    for qi, qj in edges:
        vi = qubit_values[phys_to_pos[qi]]
        vj = qubit_values[phys_to_pos[qj]]
        if vi != vj:
            cuts += 1
    return cuts


def analyze_results(counts, qubit_indices, edges, label, classical_max_cut=4):
    """Analyze QAOA MaxCut results."""
    total = sum(counts.values())
    expected_cut = 0.0
    maxcut_prob = 0.0
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
    print(f"  Max-cut probability: {maxcut_prob:.4f}")
    print()

    print(f"  Cut distribution:")
    for c in sorted(cut_distribution.keys()):
        pct = cut_distribution[c] / total * 100
        bar = "#" * int(pct / 2)
        print(f"    cut={c}: {cut_distribution[c]:5d} ({pct:5.1f}%) {bar}")

    # Projected bitstrings
    projected = {}
    for bitstring, count in counts.items():
        qvals = extract_qubit_values(bitstring, qubit_indices)
        key = "".join(str(v) for v in qvals)
        projected[key] = projected.get(key, 0) + count

    sorted_proj = sorted(projected.items(), key=lambda x: -x[1])
    print(f"\n  Top states (projected to {qubit_indices}):")
    for bs, count in sorted_proj[:10]:
        pct = count / total * 100
        qvals = tuple(int(b) for b in bs)
        cut = compute_cut_value(qvals, edges, qubit_indices)
        marker = " <-- MAX CUT" if cut == classical_max_cut else ""
        print(f"    {bs}: {count:5d} ({pct:5.1f}%) cut={cut}{marker}")

    return {
        "label": label,
        "qubits": qubit_indices,
        "edges": [[a, b] for a, b in edges],
        "shots": total,
        "expected_cut": round(expected_cut, 4),
        "approximation_ratio": round(approx_ratio, 4),
        "maxcut_probability": round(maxcut_prob, 4),
        "cut_distribution": {str(k): v for k, v in sorted(cut_distribution.items())},
        "top_states": {bs: count for bs, count in sorted_proj[:10]},
    }


# ============================================================
# Main
# ============================================================

if __name__ == "__main__":
    print("QAOA MaxCut — Native Gate Set (CZ, Ry, Rz) for Tuna-9")
    print("=" * 60)

    # Build circuits
    builders = {
        "cycle1_p1": {
            "build": build_qaoa_p1_cycle1,
            "description": "p=1 on 4-cycle {1,3,6,4}, gamma=pi/4, beta=pi/8",
            "cycle_label": "{1,3,6,4}",
            "p": 1,
            "params": {"gamma": math.pi / 4, "beta": math.pi / 8},
        },
        "cycle1_p2": {
            "build": build_qaoa_p2_cycle1,
            "description": "p=2 on 4-cycle {1,3,6,4}, gamma1=0.3/beta1=0.7, gamma2=0.8/beta2=0.3",
            "cycle_label": "{1,3,6,4}",
            "p": 2,
            "params": {"gamma1": 0.3, "beta1": 0.7, "gamma2": 0.8, "beta2": 0.3},
        },
        "cycle2_p1": {
            "build": build_qaoa_p1_cycle2,
            "description": "p=1 on 4-cycle {0,1,4,2}, gamma=pi/4, beta=pi/8",
            "cycle_label": "{0,1,4,2}",
            "p": 1,
            "params": {"gamma": math.pi / 4, "beta": math.pi / 8},
        },
    }

    circuits = {}
    results = {}

    for name, info in builders.items():
        cb, qubits, edges = info["build"]()

        header = (
            f"{info['description']}\n"
            f"Classical max cut = 4\n"
            f"All gates in native set: CZ, Ry, Rz"
        )
        cqasm = cb.to_cqasm(header)
        gate_counts = cb.gate_counts()

        # Verify all CZ gates use connected pairs
        for op in cb.ops:
            if op[0] == 'CZ':
                assert is_connected(op[1], op[2]), (
                    f"INVALID CZ({op[1]},{op[2]}): not connected on Tuna-9!"
                )

        print(f"\n{'#'*60}")
        print(f"# {name}: {info['description']}")
        print(f"# Gate counts: {gate_counts}")
        print(f"{'#'*60}")
        print(cqasm)

        circuits[name] = {
            "cqasm": cqasm,
            "qubits": qubits,
            "edges": [[a, b] for a, b in edges],
            "gate_counts": gate_counts,
            "params": info["params"],
            "p": info["p"],
            "cycle": info["cycle_label"],
            "description": info["description"],
        }

        # Run on emulator
        print(f"Running {name} on qxelarator ({SHOTS} shots)...")
        result = qxelarator.execute_string(cqasm, iterations=SHOTS)

        if hasattr(result, 'results'):
            counts = result.results
            analysis = analyze_results(counts, qubits, edges, info["description"])
            results[name] = analysis
        else:
            print(f"  ERROR: {result}")
            results[name] = {"error": str(result)}

    # Summary
    print(f"\n{'='*60}")
    print(f"  SUMMARY — Native Gate Set QAOA MaxCut")
    print(f"{'='*60}")
    print(f"  Random baseline: expected cut = 2.0, ratio = 0.5000")
    print(f"  p=1 theoretical ratio (4-cycle) ~ 0.75")
    print()

    for name, data in results.items():
        if "error" in data:
            print(f"  {name}: ERROR")
        else:
            gc = circuits[name]["gate_counts"]
            print(f"  {name}:")
            print(f"    Approx ratio: {data['approximation_ratio']:.4f}")
            print(f"    P(maxcut):    {data['maxcut_probability']:.4f}")
            print(f"    Gates: {gc['CZ']} CZ, {gc['Ry']} Ry, {gc['Rz']} Rz "
                  f"({gc['total']} total, {gc['total_2q']} two-qubit)")

    # Identify max-cut states
    print(f"\n  Max-cut states for {builders['cycle1_p1']['cycle_label']}:")
    print(f"    Alternating: q1=0,q3=1,q4=0,q6=1 and q1=1,q3=0,q4=1,q6=0")
    print(f"  Max-cut states for {builders['cycle2_p1']['cycle_label']}:")
    print(f"    Alternating: q0=0,q1=1,q2=0,q4=1 and q0=1,q1=0,q2=1,q4=0")

    # Error rate comparison
    cycle1_qubits = [1, 3, 4, 6]
    cycle2_qubits = [0, 1, 2, 4]
    cycle1_errors = [QUBIT_ERROR_RATES[q] for q in cycle1_qubits if QUBIT_ERROR_RATES[q] is not None]
    cycle2_errors = [QUBIT_ERROR_RATES[q] for q in cycle2_qubits if QUBIT_ERROR_RATES[q] is not None]
    if cycle1_errors:
        print(f"\n  Error rates cycle1 {cycle1_qubits}: {cycle1_errors}, avg={sum(cycle1_errors)/len(cycle1_errors):.3f}")
    if cycle2_errors:
        print(f"  Error rates cycle2 {cycle2_qubits}: {cycle2_errors}, avg={sum(cycle2_errors)/len(cycle2_errors):.3f}")

    # Save results
    output = {
        "experiment": "qaoa-tuna9-native-circuits",
        "description": (
            "QAOA MaxCut on 4-cycle subgraphs of Tuna-9 using native gate set "
            "(CZ, Ry, Rz). All gates decomposed from H/CNOT/Rx with consecutive "
            "same-axis rotations merged and near-zero rotations removed."
        ),
        "gate_set": ["CZ", "Ry", "Rz"],
        "n_circuits": len(circuits),
        "tuna9_connectivity": [list(e) for e in sorted(TUNA9_EDGES, key=lambda e: sorted(e))],
        "shots": SHOTS,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "circuits": {},
        "results": {},
        "metadata": {
            "classical_max_cut": 4,
            "random_baseline_ratio": 0.5,
            "p1_theoretical_ratio_4cycle": 0.75,
            "qubit_error_rates": {str(k): v for k, v in QUBIT_ERROR_RATES.items() if v is not None},
        },
    }

    for name in circuits:
        output["circuits"][name] = circuits[name]
        if name in results:
            output["results"][name] = results[name]

    outpath = "/Users/dereklomas/haiqu/experiments/results/qaoa-tuna9-native-circuits.json"
    with open(outpath, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\n  Saved to {outpath}")
