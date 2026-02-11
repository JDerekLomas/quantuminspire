#!/usr/bin/env python3
"""Kim 2023 Kicked Ising replication on Tuna-9 hardware.

Generates cQASM 3.0 circuits for the Clifford checkpoint (theta_h=0),
where ideal M_z = 1.0 at any depth. Tests on local emulator first,
then submits to Tuna-9 hardware for cross-platform comparison.

Circuit per Trotter step at theta_h=0:
  - RX(0) = identity on all qubits (skip)
  - RZZ(-pi/2) on all 10 edges

RZZ(theta, i, j) decomposition into CZ native gates:
  H q[j]; CZ q[i],q[j]; H q[j]; Rz(theta) q[j]; H q[j]; CZ q[i],q[j]; H q[j]
"""

import json
import math
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Tuna-9 topology (10 edges, verified by autonomous characterization)
EDGES = [
    (0, 1), (0, 2), (1, 3), (1, 4), (2, 4),
    (2, 5), (3, 6), (4, 6), (6, 8), (7, 8),
]
N_QUBITS = 9


def rzz_cqasm(i, j, theta):
    """Generate cQASM 3.0 for RZZ(theta) on qubits i,j using CZ native gate."""
    lines = []
    lines.append(f"  H q[{j}]")
    lines.append(f"  CZ q[{i}], q[{j}]")
    lines.append(f"  H q[{j}]")
    lines.append(f"  Rz({theta:.6f}) q[{j}]")
    lines.append(f"  H q[{j}]")
    lines.append(f"  CZ q[{i}], q[{j}]")
    lines.append(f"  H q[{j}]")
    return lines


def rzz_dagger_cqasm(i, j, theta):
    """Generate cQASM for RZZ_dagger(theta) = RZZ(-theta)."""
    return rzz_cqasm(i, j, -theta)


def generate_circuit(n_steps, fold_factor=1, theta_h=0.0, theta_j=-math.pi/4):
    """Generate complete cQASM 3.0 circuit for kicked Ising model.

    Args:
        n_steps: Number of Trotter steps
        fold_factor: 1=normal, 3=G.Gdagger.G per gate
        theta_h: Transverse field angle (0 = Clifford)
        theta_j: ZZ coupling angle (standard: -pi/4)
    """
    lines = [
        "version 3.0",
        "",
        f"qubit[{N_QUBITS}] q",
        f"bit[{N_QUBITS}] b",
        "",
        f"// Kim 2023 Kicked Ising: d={n_steps}, fold={fold_factor}, theta_h={theta_h:.4f}",
        f"// Tuna-9 topology: {N_QUBITS} qubits, {len(EDGES)} edges",
        "",
    ]

    rzz_angle = 2 * theta_j  # = -pi/2 at standard coupling

    for step in range(n_steps):
        lines.append(f"// --- Trotter step {step + 1} ---")

        # RX(2*theta_h) on all qubits (skip if theta_h=0)
        if abs(theta_h) > 1e-10:
            rx_angle = 2 * theta_h
            for q in range(N_QUBITS):
                if fold_factor == 1:
                    lines.append(f"  Rx({rx_angle:.6f}) q[{q}]")
                else:
                    # Gate folding: G, G_dag, G, G_dag, ..., G
                    for rep in range((fold_factor + 1) // 2):
                        lines.append(f"  Rx({rx_angle:.6f}) q[{q}]")
                        if rep < (fold_factor - 1) // 2:
                            lines.append(f"  Rx({-rx_angle:.6f}) q[{q}]")

        # RZZ on all edges
        for i, j in EDGES:
            if fold_factor == 1:
                lines.extend(rzz_cqasm(i, j, rzz_angle))
            elif fold_factor == 3:
                # G . G_dag . G
                lines.append(f"  // RZZ fold=3 on q[{i}],q[{j}]")
                lines.extend(rzz_cqasm(i, j, rzz_angle))
                lines.extend(rzz_dagger_cqasm(i, j, rzz_angle))
                lines.extend(rzz_cqasm(i, j, rzz_angle))
            elif fold_factor == 5:
                lines.append(f"  // RZZ fold=5 on q[{i}],q[{j}]")
                lines.extend(rzz_cqasm(i, j, rzz_angle))
                lines.extend(rzz_dagger_cqasm(i, j, rzz_angle))
                lines.extend(rzz_cqasm(i, j, rzz_angle))
                lines.extend(rzz_dagger_cqasm(i, j, rzz_angle))
                lines.extend(rzz_cqasm(i, j, rzz_angle))

        lines.append("")

    # Measurement
    lines.append("// Measurement")
    lines.append("b = measure q")
    lines.append("")

    return "\n".join(lines)


def compute_mz(counts, n_qubits=N_QUBITS):
    """Compute M_z = (1/N) sum_q <Z_q> from measurement counts.

    cQASM bitstring format is MSB-first: b[N-1]...b[0].
    """
    total = sum(counts.values())
    if total == 0:
        return 0.0

    z_per_qubit = [0.0] * n_qubits
    for bitstring, count in counts.items():
        for q in range(n_qubits):
            bit = int(bitstring[-(q + 1)])  # MSB-first extraction
            z_per_qubit[q] += (1 - 2 * bit) * count  # 0->+1, 1->-1

    z_expectations = [z / total for z in z_per_qubit]
    mz = sum(z_expectations) / n_qubits
    return mz, z_expectations


def count_gates(circuit_str):
    """Count CZ and single-qubit gates in a cQASM circuit."""
    cz_count = circuit_str.count("CZ ")
    h_count = circuit_str.count("H q[")
    rz_count = circuit_str.count("Rz(")
    rx_count = circuit_str.count("Rx(")
    return {"CZ": cz_count, "H": h_count, "Rz": rz_count, "Rx": rx_count,
            "total_2q": cz_count, "total_1q": h_count + rz_count + rx_count}


# ── Main ──

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--emulator", action="store_true", help="Test on local emulator")
    parser.add_argument("--submit", action="store_true", help="Submit to Tuna-9 hardware")
    parser.add_argument("--generate", action="store_true", help="Just generate and print circuits")
    parser.add_argument("--shots", type=int, default=4096)
    args = parser.parse_args()

    # Define experiment matrix
    experiments = [
        {"name": "d1_f1", "n_steps": 1, "fold": 1, "theta_h": 0.0},
        {"name": "d3_f1", "n_steps": 3, "fold": 1, "theta_h": 0.0},
        {"name": "d5_f1", "n_steps": 5, "fold": 1, "theta_h": 0.0},
        {"name": "d1_f3", "n_steps": 1, "fold": 3, "theta_h": 0.0},
        {"name": "d3_f3", "n_steps": 3, "fold": 3, "theta_h": 0.0},
    ]

    circuits = {}
    for exp in experiments:
        circuit = generate_circuit(exp["n_steps"], exp["fold"], exp["theta_h"])
        gates = count_gates(circuit)
        circuits[exp["name"]] = circuit
        print(f"{exp['name']}: {gates['total_2q']} CZ, {gates['total_1q']} 1q gates")

    if args.generate:
        for name, circuit in circuits.items():
            print(f"\n{'='*60}")
            print(f"Circuit: {name}")
            print(f"{'='*60}")
            print(circuit)
        sys.exit(0)

    if args.emulator:
        print("\n--- Local emulator test ---")
        results = {}
        for exp in experiments:
            circuit = circuits[exp["name"]]
            print(f"\nRunning {exp['name']} on emulator ({args.shots} shots)...")

            # Use qxelarator
            try:
                import qxelarator
                sim_result = qxelarator.execute_string(circuit, iterations=args.shots)
                counts = dict(sim_result.results)
                mz, z_exp = compute_mz(counts)
                print(f"  M_z = {mz:.6f} (ideal = 1.0, error = {abs(1.0 - mz):.6f})")
                print(f"  Per-qubit Z: {[f'{z:.4f}' for z in z_exp]}")
                print(f"  Top counts: {dict(sorted(counts.items(), key=lambda x: -x[1])[:5])}")
                results[exp["name"]] = {
                    "mz": mz, "z_expectations": z_exp,
                    "counts": counts, "shots": args.shots
                }
            except Exception as e:
                print(f"  ERROR: {e}")
                results[exp["name"]] = {"error": str(e)}

        # Summary
        print(f"\n{'='*60}")
        print("Emulator Summary (theta_h=0, ideal M_z=1.0)")
        print(f"{'='*60}")
        print(f"{'Experiment':<12} {'M_z':>8} {'Error':>8}")
        print("-" * 30)
        for name, r in results.items():
            if "mz" in r:
                print(f"{name:<12} {r['mz']:8.4f} {abs(1.0 - r['mz']):8.5f}")

        # Save emulator results
        out = {
            "type": "kim2023_ising_emulator_cqasm",
            "backend": "qxelarator",
            "theta_h": 0.0,
            "theta_j": -math.pi/4,
            "topology": "tuna9",
            "n_qubits": N_QUBITS,
            "n_edges": len(EDGES),
            "shots": args.shots,
            "results": results,
        }
        outfile = "experiments/results/kim2023-ising-emulator-cqasm.json"
        with open(outfile, "w") as f:
            json.dump(out, f, indent=2)
        print(f"\nSaved: {outfile}")

    if args.submit:
        print("\n--- Submitting to Tuna-9 hardware ---")
        job_ids = {}
        for exp in experiments:
            name = exp["name"]
            circuit = circuits[name]
            gates = count_gates(circuit)
            print(f"\nSubmitting {name} ({gates['total_2q']} CZ gates)...")

            # Save circuit to file for reference
            circuit_file = f"/tmp/kim_tuna9_{name}.qasm"
            with open(circuit_file, "w") as f:
                f.write(circuit)
            print(f"  Saved circuit: {circuit_file}")

            # Submit via QI SDK
            try:
                from quantuminspire.sdk.models.circuit import Circuit as QICircuit
                from quantuminspire.sdk.models import base_algorithm as computebackend

                backend = computebackend.RemoteBackend(backend_type_id=6)
                qi_circuit = QICircuit(name=f"kim_{name}", content=circuit)
                job = backend.run(qi_circuit, shot_count=args.shots)
                print(f"  Job submitted: {job.id}")
                job_ids[name] = job.id
            except Exception as e:
                print(f"  ERROR: {e}")
                # Fallback: print circuit for manual submission
                print(f"  Use MCP: qi_submit_circuit with circuit from {circuit_file}")
                job_ids[name] = None

        print(f"\nJob IDs: {json.dumps(job_ids, indent=2)}")

        # Save job tracking
        tracking = {
            "experiment": "kim2023_ising_tuna9",
            "jobs": job_ids,
            "parameters": {exp["name"]: exp for exp in experiments},
            "shots": args.shots,
        }
        with open("experiments/queue/kim-tuna9-ising.json", "w") as f:
            json.dump(tracking, f, indent=2)
        print(f"Saved tracking to experiments/queue/kim-tuna9-ising.json")
