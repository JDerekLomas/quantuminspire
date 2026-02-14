#!/usr/bin/env python3
"""Generate kicked Ising model circuits for Tuna-9 with FULL 12-edge topology.

Kim 2023 replication: 9 qubits, theta_h=0 (Clifford point), theta_j=-pi/4.
Previous run used 10 edges; this uses the confirmed 12-edge topology.

Generates 4 circuits in cQASM 3.0:
  d1_f1: 1 Trotter step, no folding
  d3_f1: 3 Trotter steps, no folding
  d5_f1: 5 Trotter steps, no folding
  d1_f3: 1 Trotter step, fold=3 ZNE

Also verifies d1_f1 on qxelarator emulator.
"""

import json
import math
import sys
from pathlib import Path

# Full 12-edge Tuna-9 topology
EDGES_12 = [
    (0, 1), (0, 2),
    (1, 3), (1, 4),
    (2, 4), (2, 5),
    (3, 6),
    (4, 6), (4, 7),
    (5, 7),
    (6, 8),
    (7, 8),
]

N_QUBITS = 9
THETA_J = -math.pi / 4   # ZZ coupling
THETA_H = 0.0            # transverse field (identity at Clifford point)
RZ_ANGLE = 2 * THETA_J   # = -pi/2


def zz_block_cqasm(i: int, j: int, fold: int = 1) -> str:
    """Generate ZZ(theta_j) block for edge (i,j).

    ZZ(theta) = CNOT(i,j); Rz(2*theta) on j; CNOT(i,j)

    For ZNE fold=f: each CNOT is replaced by CNOT repeated (2f-1) times.
    fold=1: CNOT (normal)
    fold=3: CNOT-CNOT-CNOT-CNOT-CNOT (5 CNOTs, equivalent to 1 CNOT)

    Wait -- ZNE gate folding means: gate -> gate * (gate_dag * gate)^(f-1)
    For CNOT (self-inverse): CNOT -> CNOT * (CNOT * CNOT)^(f-1)
    fold=1: CNOT (1 gate)
    fold=3: CNOT * CNOT * CNOT (3 gates -- CNOT is its own inverse)

    Actually, let me be more careful. ZNE "fold factor" f means:
    - Each gate G is replaced by G * (G^dag * G)^((f-1)/2) for odd f
    - For CNOT (self-inverse, G^dag = G): CNOT -> CNOT^f
    - fold=1: CNOT (1 gate)
    - fold=3: CNOT * CNOT * CNOT = CNOT (3 gates, net = 1 CNOT)

    So for the full ZZ block with fold=f:
    CNOT(i,j)^f ; Rz(angle) q[j] ; CNOT(i,j)^f
    """
    lines = []

    # First CNOT (folded)
    for _ in range(fold):
        lines.append(f"CNOT q[{i}], q[{j}]")

    # Rz rotation on target qubit
    lines.append(f"Rz({RZ_ANGLE}) q[{j}]")

    # Second CNOT (folded)
    for _ in range(fold):
        lines.append(f"CNOT q[{i}], q[{j}]")

    return "\n".join(lines)


def build_circuit(n_steps: int, fold: int) -> str:
    """Build full Ising circuit in cQASM 3.0.

    Args:
        n_steps: Number of Trotter steps (d)
        fold: ZNE fold factor (1=native, 3=3x noise)
    """
    lines = [
        "version 3.0",
        f"qubit[{N_QUBITS}] q",
        f"bit[{N_QUBITS}] b",
        "",
        f"// Kicked Ising model: {n_steps} Trotter steps, fold={fold}",
        f"// theta_j = -pi/4, theta_h = 0 (Clifford point)",
        f"// 12-edge Tuna-9 topology",
        "",
    ]

    for step in range(n_steps):
        lines.append(f"// --- Trotter step {step + 1}/{n_steps} ---")

        # ZZ interaction layer: all 12 edges
        for i, j in EDGES_12:
            lines.append(f"// ZZ on edge ({i},{j})")
            lines.append(zz_block_cqasm(i, j, fold))
            lines.append("")

        # Rx layer (theta_h = 0, so identity -- skip entirely)
        # lines.append("// Rx layer: theta_h=0 (identity, skipped)")

    # Measurement
    lines.append("b = measure q")
    lines.append("")

    return "\n".join(lines)


def count_gates(n_steps: int, fold: int) -> dict:
    """Count gates in the circuit."""
    n_edges = len(EDGES_12)
    cnots_per_edge = 2 * fold  # two CNOT blocks per ZZ, each folded
    rz_per_edge = 1

    total_cnots = n_steps * n_edges * cnots_per_edge
    total_rz = n_steps * n_edges * rz_per_edge

    return {
        "n_steps": n_steps,
        "fold": fold,
        "n_edges": n_edges,
        "cnots_per_step": n_edges * cnots_per_edge,
        "rz_per_step": n_edges * rz_per_edge,
        "total_cnots": total_cnots,
        "total_rz": total_rz,
        "total_gates": total_cnots + total_rz,
    }


def verify_on_emulator(circuit_str: str, shots: int = 4096) -> dict:
    """Run circuit on qxelarator emulator and return results."""
    try:
        import qxelarator
    except ImportError:
        print("ERROR: qxelarator not available. Install via: pip install qxelarator")
        return {"error": "qxelarator not installed"}

    print(f"Running on qxelarator emulator ({shots} shots)...")

    # Execute directly using execute_string (LocalBackend wrapper is buggy)
    sim_result = qxelarator.execute_string(circuit_str, iterations=shots)

    # SimulationResult has .results dict of {bitstring: count}
    # qxelarator uses MSB-first convention: bitstring[i] = qubit (n-1-i)
    results = sim_result.results
    print(f"Shots done: {sim_result.shots_done}")
    print(f"Number of unique bitstrings: {len(results)}")

    # Compute Z expectations per qubit
    z_expectations = [0.0] * N_QUBITS
    total_shots = 0

    for bitstring, count in results.items():
        total_shots += count
        for q in range(N_QUBITS):
            # MSB-first: qubit q is at bitstring[-(q+1)]
            bit = int(bitstring[-(q + 1)])
            # Z expectation: |0> -> +1, |1> -> -1
            z_expectations[q] += (1 - 2 * bit) * count

    z_expectations = [z / total_shots for z in z_expectations]
    mz = sum(z_expectations) / N_QUBITS

    # Show top 5 bitstrings
    sorted_counts = sorted(results.items(), key=lambda x: -x[1])[:5]
    print(f"Top bitstrings:")
    for bs, cnt in sorted_counts:
        print(f"  {bs}: {cnt} ({100*cnt/total_shots:.1f}%)")
    print(f"Z expectations: {[round(z, 4) for z in z_expectations]}")
    print(f"Mean magnetization: {mz:.4f}")

    return {
        "counts": dict(results),
        "z_expectations": z_expectations,
        "mz": mz,
        "total_shots": total_shots,
        "n_unique_bitstrings": len(results),
    }


def main():
    circuits = {}
    gate_counts = {}
    configs = [
        ("d1_f1", 1, 1),
        ("d3_f1", 3, 1),
        ("d5_f1", 5, 1),
        ("d1_f3", 1, 3),
    ]

    print("=" * 60)
    print("Kicked Ising Model — 12-edge Tuna-9 Topology")
    print("=" * 60)
    print(f"Qubits: {N_QUBITS}")
    print(f"Edges: {len(EDGES_12)}")
    print(f"theta_j = -pi/4 = {THETA_J:.6f}")
    print(f"theta_h = {THETA_H}")
    print(f"Rz angle = 2*theta_j = {RZ_ANGLE:.6f}")
    print()

    for name, n_steps, fold in configs:
        circuit = build_circuit(n_steps, fold)
        circuits[name] = circuit
        gc = count_gates(n_steps, fold)
        gate_counts[name] = gc
        print(f"{name}: {gc['total_cnots']} CNOTs + {gc['total_rz']} Rz = {gc['total_gates']} gates")

    print()

    # Save circuits to individual files and a combined JSON
    outdir = Path("experiments/results")
    outdir.mkdir(exist_ok=True)

    # Save individual .cqasm files
    for name, circuit in circuits.items():
        fpath = outdir / f"ising-12edge-{name}.cqasm"
        fpath.write_text(circuit)
        print(f"Saved {fpath}")

    # Verify d1_f1 on emulator
    print()
    print("=" * 60)
    print("Emulator verification: d1_f1")
    print("=" * 60)
    emulator_result = verify_on_emulator(circuits["d1_f1"], shots=4096)

    # Save combined results
    output = {
        "experiment": "kim2023_ising_12edge",
        "topology": "tuna9_12edge",
        "n_qubits": N_QUBITS,
        "n_edges": len(EDGES_12),
        "edges": [[i, j] for i, j in EDGES_12],
        "theta_j": THETA_J,
        "theta_h": THETA_H,
        "rz_angle": RZ_ANGLE,
        "gate_counts": gate_counts,
        "circuits": {name: circuit for name, circuit in circuits.items()},
        "emulator_verification": {
            "d1_f1": emulator_result,
        },
    }

    combined_path = outdir / "kim2023-ising-12edge-circuits.json"
    combined_path.write_text(json.dumps(output, indent=2))
    print(f"\nSaved combined results to {combined_path}")

    # Print circuit for d1_f1 as reference
    print()
    print("=" * 60)
    print("Circuit d1_f1 (1 Trotter step, no folding):")
    print("=" * 60)
    print(circuits["d1_f1"])


if __name__ == "__main__":
    main()
