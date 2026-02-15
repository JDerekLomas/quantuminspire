#!/usr/bin/env python3
"""Three experiments on Tuna-9:
1. QAOA MaxCut on Tuna-9's own topology (self-referential)
2. Quantum walk — information spreading across the chip
3. 9-qubit GHZ state + entanglement witness

All circuits use native gates only (CZ, Ry, Rz, X) with compile_stage="routing".
"""

import json
import math
import itertools
from pathlib import Path

# Tuna-9 topology: 9 qubits, 12 edges (bipartite graph!)
EDGES = [
    (0, 1), (0, 2), (1, 3), (1, 4), (2, 4), (2, 5),
    (3, 6), (4, 6), (4, 7), (5, 7), (6, 8), (7, 8),
]
N_QUBITS = 9

# MaxCut optimal partition (graph is bipartite → MaxCut = 12, all edges cut)
# A = {0, 3, 4, 5, 8}, B = {1, 2, 6, 7}
PARTITION_A = {0, 3, 4, 5, 8}
PARTITION_B = {1, 2, 6, 7}
MAX_CUT = 12

# GHZ spanning tree (BFS from q0)
GHZ_TREE = [(0, 1), (0, 2), (1, 3), (1, 4), (2, 5), (4, 6), (4, 7), (6, 8)]

PI = math.pi
HALF_PI = PI / 2


# ── cQASM helpers ──────────────────────────────────────────────────────────

def header():
    return "version 3.0\n\nqubit[9] q\nbit[9] b\n"


def h_gate(q):
    """Hadamard in native gates: H = Rz(π) Ry(π/2)"""
    return f"Rz({PI:.10f}) q[{q}]\nRy({HALF_PI:.10f}) q[{q}]\n"


def cnot(control, target):
    """CNOT in native gates: Ry(-π/2) target, CZ, Ry(π/2) target"""
    return (
        f"Ry({-HALF_PI:.10f}) q[{target}]\n"
        f"CZ q[{control}], q[{target}]\n"
        f"Ry({HALF_PI:.10f}) q[{target}]\n"
    )


def rz_gate(q, angle):
    return f"Rz({angle:.10f}) q[{q}]\n"


def ry_gate(q, angle):
    return f"Ry({angle:.10f}) q[{q}]\n"


def rx_native(q, angle):
    """Rx(θ) = Rz(-π/2) Ry(θ) Rz(π/2)"""
    return rz_gate(q, -HALF_PI) + ry_gate(q, angle) + rz_gate(q, HALF_PI)


def zz_interaction(qi, qj, gamma):
    """exp(-iγ Z_i Z_j) using 2 CZ gates.
    Decomposition: CNOT(i→j), Rz(2γ) on j, CNOT(i→j)
    Each CNOT = Ry(-π/2) CZ Ry(π/2) on target.
    """
    return cnot(qi, qj) + rz_gate(qj, 2 * gamma) + cnot(qi, qj)


def measure_all():
    return "b = measure q\n"


# ── Experiment 1: QAOA MaxCut ─────────────────────────────────────────────

def qaoa_maxcut_circuit(gamma, beta):
    """QAOA p=1 for MaxCut on Tuna-9's own topology.

    Cost: C = Σ_{(i,j)∈E} (1 - Z_i Z_j) / 2
    Mixer: B = Σ_i X_i
    State: e^{-iβB} e^{-iγC} |+⟩^n

    The ZZ part of the cost: e^{-i(γ/2) Σ Z_i Z_j} (the constant part is global phase)
    """
    circ = header()
    circ += "// === QAOA p=1 MaxCut on Tuna-9 topology ===\n\n"

    # Initialize |+⟩ on all qubits
    circ += "// Initialize |+⟩^9\n"
    for q in range(N_QUBITS):
        circ += h_gate(q)
    circ += "\n"

    # Cost layer: e^{-iγ Σ Z_i Z_j / 2}
    # Each edge gets ZZ(γ/2)
    circ += "// Cost layer: ZZ interactions on all 12 edges\n"
    for i, j in EDGES:
        circ += f"// Edge ({i},{j})\n"
        circ += zz_interaction(i, j, gamma / 2)
    circ += "\n"

    # Mixer layer: e^{-iβ Σ X_i} = Π_i Rx(2β)
    circ += "// Mixer layer: Rx(2β) on all qubits\n"
    for q in range(N_QUBITS):
        circ += rx_native(q, 2 * beta)
    circ += "\n"

    circ += measure_all()
    return circ


def qaoa_cost_from_bitstring(bitstring):
    """Compute MaxCut cost for a bitstring (MSB-first, qubit 0 at left)."""
    cost = 0
    for i, j in EDGES:
        if bitstring[i] != bitstring[j]:
            cost += 1
    return cost


def analyze_qaoa(results, gamma, beta):
    """Analyze QAOA results: expected cut value, approximation ratio."""
    total_shots = sum(results.values())
    expected_cost = 0
    best_bitstring = None
    best_cost = 0

    for bitstring, count in results.items():
        cost = qaoa_cost_from_bitstring(bitstring)
        expected_cost += cost * count / total_shots
        if cost > best_cost:
            best_cost = cost
            best_bitstring = bitstring

    approx_ratio = expected_cost / MAX_CUT

    # Check if optimal solutions appear
    opt_a = "".join("0" if q in PARTITION_A else "1" for q in range(9))
    opt_b = "".join("1" if q in PARTITION_A else "0" for q in range(9))
    p_optimal = (results.get(opt_a, 0) + results.get(opt_b, 0)) / total_shots

    return {
        "gamma": gamma,
        "beta": beta,
        "expected_cost": round(expected_cost, 3),
        "approx_ratio": round(approx_ratio, 4),
        "best_bitstring": best_bitstring,
        "best_cost": best_cost,
        "p_optimal": round(p_optimal, 4),
        "total_shots": total_shots,
    }


# ── Experiment 2: Quantum Walk ────────────────────────────────────────────

def quantum_walk_circuit(depth, theta=PI/4):
    """Quantum walk on Tuna-9 via Trotter evolution.

    Hamiltonian: H = -J Σ_{(i,j)} Z_i Z_j  -  h Σ_i X_i
    Start from |100000000⟩ (excitation on q0).

    Each Trotter step:
    1. ZZ layer: CZ on all edges (with Rz rotations for angle)
    2. X field layer: Ry(θ) on all qubits

    For a simple demonstration, we use CZ + Ry layers
    which create a spreading interference pattern.
    """
    circ = header()
    circ += f"// === Quantum Walk, depth={depth}, θ={theta:.4f} ===\n\n"

    # Initialize: flip q0 to |1⟩
    circ += "// Prepare |100000000⟩\n"
    circ += "X q[0]\n\n"

    for d in range(depth):
        circ += f"// --- Trotter step {d+1} ---\n"

        # X-field layer: Ry(θ) on all qubits (creates superposition)
        circ += "// Transverse field\n"
        for q in range(N_QUBITS):
            circ += ry_gate(q, theta)

        # ZZ layer via CZ + Rz: e^{-iθ Z_i Z_j}
        # For simplicity use bare CZ (= ZZ at θ=π/4) + small Rz correction
        circ += "// ZZ coupling layer\n"
        for i, j in EDGES:
            circ += zz_interaction(i, j, theta / 2)

        circ += "\n"

    circ += measure_all()
    return circ


def quantum_walk_light_circuit(depth, theta=PI/6):
    """Lighter quantum walk using just CZ + Ry (no CNOT decomposition).

    Each step: Ry(θ) on all qubits, then CZ on all edges.
    Much shallower than full Trotter. Creates beautiful interference.
    """
    circ = header()
    circ += f"// === Quantum Walk (light), depth={depth}, θ={theta:.4f} ===\n\n"

    # Initialize: flip q0 to |1⟩
    circ += "// Prepare |100000000⟩\n"
    circ += "X q[0]\n\n"

    for d in range(depth):
        circ += f"// --- Step {d+1} ---\n"

        # Rotation layer
        for q in range(N_QUBITS):
            circ += ry_gate(q, theta)

        # Entangling layer: CZ on all edges
        for i, j in EDGES:
            circ += f"CZ q[{i}], q[{j}]\n"

        circ += "\n"

    circ += measure_all()
    return circ


def analyze_walk(results, label=""):
    """Compute per-qubit excitation probability."""
    total = sum(results.values())
    probs = [0.0] * N_QUBITS

    for bitstring, count in results.items():
        for q in range(N_QUBITS):
            if bitstring[q] == "1":
                probs[q] += count / total

    return {
        "label": label,
        "excitation_probability": [round(p, 4) for p in probs],
        "total_shots": total,
        "entropy": round(-sum(p * math.log2(p) if p > 0 else 0 for p in probs if p < 1), 3),
    }


# ── Experiment 3: 9-qubit GHZ ────────────────────────────────────────────

def ghz9_z_basis():
    """Create 9-qubit GHZ state and measure in Z basis."""
    circ = header()
    circ += "// === 9-qubit GHZ state, Z-basis measurement ===\n\n"

    # Hadamard on q0
    circ += "// H on q0\n"
    circ += h_gate(0)
    circ += "\n"

    # CNOT cascade along spanning tree
    circ += "// CNOT cascade along spanning tree\n"
    for ctrl, tgt in GHZ_TREE:
        circ += f"// CNOT {ctrl}→{tgt}\n"
        circ += cnot(ctrl, tgt)

    circ += "\n"
    circ += measure_all()
    return circ


def ghz9_x_basis():
    """Create 9-qubit GHZ state and measure in X basis (H before measurement)."""
    circ = header()
    circ += "// === 9-qubit GHZ state, X-basis measurement ===\n\n"

    # Hadamard on q0
    circ += "// H on q0\n"
    circ += h_gate(0)
    circ += "\n"

    # CNOT cascade
    circ += "// CNOT cascade along spanning tree\n"
    for ctrl, tgt in GHZ_TREE:
        circ += f"// CNOT {ctrl}→{tgt}\n"
        circ += cnot(ctrl, tgt)

    circ += "\n"

    # Hadamard on ALL qubits for X-basis measurement
    circ += "// Rotate to X basis\n"
    for q in range(N_QUBITS):
        circ += h_gate(q)

    circ += "\n"
    circ += measure_all()
    return circ


def analyze_ghz_z(results):
    """Analyze Z-basis GHZ measurement."""
    total = sum(results.values())
    p_all0 = results.get("0" * 9, 0) / total
    p_all1 = results.get("1" * 9, 0) / total
    fidelity_z = p_all0 + p_all1

    # Sort by frequency
    sorted_results = sorted(results.items(), key=lambda x: -x[1])

    return {
        "P(000000000)": round(p_all0, 4),
        "P(111111111)": round(p_all1, 4),
        "F_z (GHZ populations)": round(fidelity_z, 4),
        "top_5_bitstrings": [(bs, count, round(count/total, 4)) for bs, count in sorted_results[:5]],
        "unique_bitstrings": len(results),
        "total_shots": total,
    }


def analyze_ghz_x(results):
    """Analyze X-basis GHZ measurement (parity check)."""
    total = sum(results.values())

    # For GHZ = (|0...0⟩ + |1...1⟩)/√2:
    # In X basis, only even-parity bitstrings should appear
    even_parity = 0
    odd_parity = 0
    for bitstring, count in results.items():
        hw = sum(1 for c in bitstring if c == "1")
        if hw % 2 == 0:
            even_parity += count
        else:
            odd_parity += count

    parity_expectation = (even_parity - odd_parity) / total  # ⟨X^⊗9⟩

    return {
        "P(even parity)": round(even_parity / total, 4),
        "P(odd parity)": round(odd_parity / total, 4),
        "<X^9> (parity expectation)": round(parity_expectation, 4),
        "total_shots": total,
    }


def ghz_fidelity_bound(z_analysis, x_analysis):
    """GHZ fidelity lower bound: F ≥ ½(F_z + |⟨X^⊗n⟩|)"""
    f_z = z_analysis["F_z (GHZ populations)"]
    x_exp = abs(x_analysis["<X^9> (parity expectation)"])
    bound = 0.5 * (f_z + x_exp)
    return {
        "F_z": round(f_z, 4),
        "|<X^9>|": round(x_exp, 4),
        "fidelity_lower_bound": round(bound, 4),
        "genuine_entanglement": bound > 0.5,
    }


# ── Main: generate all circuits ──────────────────────────────────────────

if __name__ == "__main__":
    out_dir = Path(__file__).parent / "circuits"
    out_dir.mkdir(exist_ok=True)

    # 1. QAOA: generate circuits for parameter sweep
    print("=== QAOA MaxCut Parameter Sweep ===")
    gammas = [i * PI / 8 for i in range(1, 9)]  # π/8 to π
    betas = [i * PI / 16 for i in range(1, 9)]   # π/16 to π/2

    # Save a few representative circuits
    for gamma, beta in [(PI/4, PI/8), (PI/3, PI/6), (3*PI/8, PI/4)]:
        fname = f"qaoa_g{gamma:.3f}_b{beta:.3f}.qasm"
        circ = qaoa_maxcut_circuit(gamma, beta)
        (out_dir / fname).write_text(circ)
        print(f"  Wrote {fname}")

    # 2. Quantum walk: depths 1-4
    print("\n=== Quantum Walk Circuits ===")
    for depth in range(1, 5):
        fname = f"walk_light_d{depth}.qasm"
        circ = quantum_walk_light_circuit(depth, theta=PI/6)
        (out_dir / fname).write_text(circ)
        print(f"  Wrote {fname}")

    # 3. GHZ state: Z and X basis
    print("\n=== GHZ-9 Circuits ===")
    circ_z = ghz9_z_basis()
    (out_dir / "ghz9_z.qasm").write_text(circ_z)
    print("  Wrote ghz9_z.qasm")

    circ_x = ghz9_x_basis()
    (out_dir / "ghz9_x.qasm").write_text(circ_x)
    print("  Wrote ghz9_x.qasm")

    print(f"\nAll circuits saved to {out_dir}/")
    print(f"Graph is bipartite: MaxCut = {MAX_CUT} (all {len(EDGES)} edges)")
    print(f"Optimal bitstrings:")
    opt_a = "".join("0" if q in PARTITION_A else "1" for q in range(9))
    opt_b = "".join("1" if q in PARTITION_A else "0" for q in range(9))
    print(f"  {opt_a} (A=0) or {opt_b} (A=1)")
