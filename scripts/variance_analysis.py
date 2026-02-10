#!/usr/bin/env python3
"""Compare original vs re-run results for run-to-run variance analysis.

Computes:
- IBM VQE: energy from both runs, expectation value differences
- Tuna-9 QV: heavy output fractions from both runs using emulator ideal distributions
"""

import json
import numpy as np
from pathlib import Path

# ── IBM VQE comparison ──────────────────────────────────────────────────────

# Hamiltonian coefficients (sector-projected, R=0.735 Å)
g0, g1, g2, g3, g4, g5 = -0.321124, 0.397937, -0.397937, 0.0, 0.090466, 0.090466
FCI = -1.1373

def compute_vqe_energy(z_counts, x_counts, y_counts):
    """Compute VQE energy from 3-basis measurement counts.

    IBM bit ordering: "ab" means a=q1(MSB), b=q0(LSB).
    """
    total = sum(z_counts.values())

    # Z-basis expectation values
    Z0 = (z_counts.get("00",0) + z_counts.get("10",0)
         - z_counts.get("01",0) - z_counts.get("11",0)) / total
    Z1 = (z_counts.get("00",0) + z_counts.get("01",0)
         - z_counts.get("10",0) - z_counts.get("11",0)) / total
    Z0Z1 = (z_counts.get("00",0) + z_counts.get("11",0)
           - z_counts.get("01",0) - z_counts.get("10",0)) / total

    # X-basis: X0X1 from parity
    xt = sum(x_counts.values())
    X0X1 = (x_counts.get("00",0) + x_counts.get("11",0)
           - x_counts.get("01",0) - x_counts.get("10",0)) / xt

    # Y-basis: Y0Y1 from parity
    yt = sum(y_counts.values())
    Y0Y1 = (y_counts.get("00",0) + y_counts.get("11",0)
           - y_counts.get("01",0) - y_counts.get("10",0)) / yt

    energy = g0 + g1*Z0 + g2*Z1 + g3*Z0Z1 + g4*X0X1 + g5*Y0Y1

    return {
        "Z0": round(Z0, 5),
        "Z1": round(Z1, 5),
        "Z0Z1": round(Z0Z1, 5),
        "X0X1": round(X0X1, 5),
        "Y0Y1": round(Y0Y1, 5),
        "energy": round(energy, 4),
        "error_hartree": round(abs(energy - FCI), 4),
        "error_kcal_mol": round(abs(energy - FCI) * 627.509, 2),
    }

# Original IBM VQE counts
orig_z = {"01": 3973, "10": 59, "00": 21, "11": 43}
orig_x = {"00": 802, "10": 1276, "11": 722, "01": 1296}
orig_y = {"10": 1209, "00": 813, "11": 832, "01": 1242}

# Re-run IBM VQE counts
rerun_z = {"01": 3933, "00": 19, "10": 68, "11": 76}
rerun_x = {"11": 757, "01": 1305, "10": 1215, "00": 819}
rerun_y = {"10": 1236, "00": 864, "01": 1184, "11": 812}

orig_vqe = compute_vqe_energy(orig_z, orig_x, orig_y)
rerun_vqe = compute_vqe_energy(rerun_z, rerun_x, rerun_y)

print("=" * 60)
print("IBM TORINO VQE: Original vs Re-run")
print("=" * 60)
print(f"{'Metric':<12} {'Original':>12} {'Re-run':>12} {'Delta':>12}")
print("-" * 48)
for key in ["Z0", "Z1", "Z0Z1", "X0X1", "Y0Y1"]:
    delta = rerun_vqe[key] - orig_vqe[key]
    print(f"{key:<12} {orig_vqe[key]:>12.5f} {rerun_vqe[key]:>12.5f} {delta:>+12.5f}")
print("-" * 48)
print(f"{'Energy (Ha)':<12} {orig_vqe['energy']:>12.4f} {rerun_vqe['energy']:>12.4f} {rerun_vqe['energy']-orig_vqe['energy']:>+12.4f}")
print(f"{'Error (Ha)':<12} {orig_vqe['error_hartree']:>12.4f} {rerun_vqe['error_hartree']:>12.4f}")
print(f"{'Error (kcal)':<12} {orig_vqe['error_kcal_mol']:>12.2f} {rerun_vqe['error_kcal_mol']:>12.2f}")
print(f"\nFCI reference: {FCI} Ha")
print(f"Run-to-run energy shift: {abs(rerun_vqe['energy']-orig_vqe['energy'])*627.509:.2f} kcal/mol")

# ── Tuna-9 QV comparison ───────────────────────────────────────────────────

# To compute heavy output fraction, we need the ideal output distribution.
# We'll use qxelarator to simulate each circuit with many shots.
try:
    import qxelarator
    HAS_EMULATOR = True
except ImportError:
    HAS_EMULATOR = False

# Load circuits
circuits_path = Path("experiments/circuits/cross2019-qv-circuits.json")
with open(circuits_path) as f:
    circuits = json.load(f)

# Original Tuna-9 QV counts
orig_qv = {
    "qv_n2_c0": {"00": 119, "01": 59, "10": 312, "11": 534},
    "qv_n2_c1": {"00": 211, "01": 264, "10": 121, "11": 428},
    "qv_n2_c2": {"00": 253, "01": 563, "10": 53, "11": 155},
    "qv_n2_c3": {"00": 379, "01": 292, "10": 231, "11": 122},
    "qv_n2_c4": {"00": 348, "01": 210, "10": 196, "11": 270},
    "qv_n3_c0": {"000": 23, "001": 18, "010": 49, "011": 50, "100": 116, "101": 170, "110": 367, "111": 231},
    "qv_n3_c1": {"000": 93, "001": 291, "010": 202, "011": 240, "100": 32, "101": 73, "110": 45, "111": 48},
    "qv_n3_c2": {"000": 621, "001": 121, "010": 58, "011": 162, "100": 40, "101": 12, "110": 6, "111": 4},
    "qv_n3_c3": {"000": 51, "001": 71, "010": 126, "011": 143, "100": 70, "101": 114, "110": 200, "111": 249},
    "qv_n3_c4": {"000": 145, "001": 93, "010": 46, "011": 13, "100": 328, "101": 244, "110": 116, "111": 39},
}

# Re-run Tuna-9 QV counts (from job results)
rerun_qv = {
    "qv_n2_c0": {"00": 110, "01": 66, "10": 289, "11": 559},
    "qv_n2_c1": {"00": 159, "01": 307, "10": 117, "11": 441},
    "qv_n2_c2": {"00": 253, "01": 546, "10": 46, "11": 179},
    "qv_n2_c3": {"00": 367, "01": 312, "10": 206, "11": 139},
    "qv_n2_c4": {"00": 343, "01": 232, "10": 152, "11": 297},
    "qv_n3_c0": {"000": 10, "001": 29, "010": 57, "011": 37, "100": 115, "101": 163, "110": 364, "111": 249},
    "qv_n3_c1": {"000": 99, "001": 242, "010": 196, "011": 282, "100": 36, "101": 58, "110": 36, "111": 75},
    "qv_n3_c2": {"000": 637, "001": 130, "010": 66, "011": 147, "100": 32, "101": 5, "110": 4, "111": 3},
    "qv_n3_c3": {"000": 52, "001": 65, "010": 130, "011": 144, "100": 100, "101": 109, "110": 199, "111": 225},
    "qv_n3_c4": {"000": 106, "001": 107, "010": 41, "011": 24, "100": 348, "101": 239, "110": 133, "111": 26},
}

def compute_heavy_outputs_from_emulator(circuit_cqasm, n_qubits, shots=100000):
    """Simulate circuit on emulator to get ideal distribution, return heavy output set."""
    result = qxelarator.execute_string(circuit_cqasm, iterations=shots)
    counts = result.results

    # Convert to probabilities
    total = sum(counts.values())
    probs = {k: v/total for k, v in counts.items()}

    # Heavy outputs = those with probability > median
    prob_values = list(probs.values())
    # Include all 2^n outcomes (zero-probability ones too)
    all_outcomes = [format(i, f'0{n_qubits}b') for i in range(2**n_qubits)]
    all_probs = [probs.get(o, 0.0) for o in all_outcomes]
    median_prob = np.median(all_probs)

    heavy_set = set(o for o, p in zip(all_outcomes, all_probs) if p > median_prob)
    return heavy_set, {o: p for o, p in zip(all_outcomes, all_probs)}

def compute_hof(counts, heavy_set):
    """Compute heavy output fraction given measurement counts and the heavy set."""
    total = sum(counts.values())
    heavy_count = sum(v for k, v in counts.items() if k in heavy_set)
    return heavy_count / total

print("\n" + "=" * 60)
print("TUNA-9 QUANTUM VOLUME: Original vs Re-run")
print("=" * 60)

if HAS_EMULATOR:
    qv_results = {}
    for n_label, n_qubits, circuit_ids in [("n2", 2, range(5)), ("n3", 3, range(5))]:
        print(f"\n--- QV n={n_qubits} ---")
        print(f"{'Circuit':<12} {'Orig HOF':>10} {'Rerun HOF':>10} {'Delta':>10}")
        print("-" * 42)

        orig_hofs = []
        rerun_hofs = []

        for i in circuit_ids:
            cid = f"qv_{n_label}_c{i}"
            circuit = circuits[cid]

            # Get heavy set from emulator
            heavy_set, ideal_probs = compute_heavy_outputs_from_emulator(circuit, n_qubits)

            orig_hof = compute_hof(orig_qv[cid], heavy_set)
            rerun_hof = compute_hof(rerun_qv[cid], heavy_set)
            delta = rerun_hof - orig_hof

            orig_hofs.append(orig_hof)
            rerun_hofs.append(rerun_hof)

            print(f"{cid:<12} {orig_hof:>10.3f} {rerun_hof:>10.3f} {delta:>+10.3f}")

        avg_orig = np.mean(orig_hofs)
        avg_rerun = np.mean(rerun_hofs)
        std_orig = np.std(orig_hofs, ddof=1)
        std_rerun = np.std(rerun_hofs, ddof=1)

        print(f"{'AVERAGE':<12} {avg_orig:>10.3f} {avg_rerun:>10.3f} {avg_rerun-avg_orig:>+10.3f}")
        print(f"{'STD DEV':<12} {std_orig:>10.3f} {std_rerun:>10.3f}")
        print(f"Pass threshold: 0.667")
        print(f"Original: {'PASS' if avg_orig > 2/3 else 'FAIL'} | Re-run: {'PASS' if avg_rerun > 2/3 else 'FAIL'}")

        qv_results[n_label] = {
            "original": {"per_circuit": [round(h, 3) for h in orig_hofs], "mean": round(avg_orig, 3), "std": round(std_orig, 3)},
            "rerun": {"per_circuit": [round(h, 3) for h in rerun_hofs], "mean": round(avg_rerun, 3), "std": round(std_rerun, 3)},
        }
else:
    print("qxelarator not available — skipping QV heavy output analysis")
    print("Using original per-circuit HOFs from result file for comparison")
    qv_results = None

# ── Save results ────────────────────────────────────────────────────────────

output = {
    "schema_version": "1.0",
    "id": "variance-analysis-001",
    "type": "variance_analysis",
    "description": "Run-to-run variance measurement: same circuits submitted twice to same backends",
    "timestamp": "2026-02-11T00:30:00Z",
    "ibm_vqe": {
        "backend": "ibm_torino",
        "circuit": "Ry(-0.2235) -> CNOT(0,1) -> X(0)",
        "shots_per_basis": 4096,
        "original": {
            "job_ids": {"z": "d65n0gbe4kfs73cvkisg", "x": "d65n0gre4kfs73cvkitg", "y": "d65n0hbe4kfs73cvkivg"},
            "raw_counts": {"z": orig_z, "x": orig_x, "y": orig_y},
            "expectation_values": {k: orig_vqe[k] for k in ["Z0","Z1","Z0Z1","X0X1","Y0Y1"]},
            "energy_hartree": orig_vqe["energy"],
            "error_kcal_mol": orig_vqe["error_kcal_mol"],
        },
        "rerun": {
            "job_ids": {"z": "d65nb9oqbmes739d4ffg", "x": "d65nbadbujdc73ctmie0", "y": "d65nbahv6o8c73d37700"},
            "raw_counts": {"z": rerun_z, "x": rerun_x, "y": rerun_y},
            "expectation_values": {k: rerun_vqe[k] for k in ["Z0","Z1","Z0Z1","X0X1","Y0Y1"]},
            "energy_hartree": rerun_vqe["energy"],
            "error_kcal_mol": rerun_vqe["error_kcal_mol"],
        },
        "variance": {
            "energy_delta_hartree": round(abs(rerun_vqe["energy"] - orig_vqe["energy"]), 4),
            "energy_delta_kcal_mol": round(abs(rerun_vqe["energy"] - orig_vqe["energy"]) * 627.509, 2),
            "expectation_deltas": {
                k: round(rerun_vqe[k] - orig_vqe[k], 5)
                for k in ["Z0","Z1","Z0Z1","X0X1","Y0Y1"]
            },
        },
        "fci_reference": FCI,
    },
}

if qv_results:
    output["tuna9_qv"] = {
        "backend": "tuna-9",
        "shots_per_circuit": 1024,
        "num_circuits": 5,
        "seed": 123,
        "original_job_ids": {
            "n2": [415379, 415380, 415381, 415382, 415384],
            "n3": [415389, 415390, 415391, 415393, 415394],
        },
        "rerun_job_ids": {
            "n2": [415445, 415448, 415450, 415452, 415453],
            "n3": [415454, 415456, 415458, 415460, 415461],
        },
        "n2": qv_results["n2"],
        "n3": qv_results["n3"],
        "qv_original": 8 if qv_results["n2"]["original"]["mean"] > 2/3 and qv_results["n3"]["original"]["mean"] > 2/3 else 4,
        "qv_rerun": 8 if qv_results["n2"]["rerun"]["mean"] > 2/3 and qv_results["n3"]["rerun"]["mean"] > 2/3 else 4,
    }

output_path = Path("experiments/results/variance-analysis-001.json")
with open(output_path, "w") as f:
    json.dump(output, f, indent=2)
    f.write("\n")

print(f"\n\nResults saved to {output_path}")
