"""Apply Readout Error Mitigation (REM) to H2 2-qubit VQE results.

Uses per-qubit confusion matrices calibrated from dedicated readout
calibration circuits on q4 and q6. The joint 4x4 confusion matrix
M = M_q4 ⊗ M_q6 is inverted and applied to raw measurement counts
in all three bases at all 7 bond distances.

Calibration circuits:
  429920: |00⟩ (both qubits in ground state)
  429921: |10⟩ (X on q4)
  429922: |01⟩ (X on q6)
  429923: |11⟩ (X on both)

Physical qubits: q4 (logical 0, position 4), q6 (logical 1, position 2)
Bitstring: 9-bit MSB-first
"""

import json
import numpy as np
from pathlib import Path
from datetime import datetime, timezone

# Physical qubit positions in 9-bit MSB-first bitstring
Q0_POS = 4  # q4 → position 4
Q1_POS = 2  # q6 → position 2

# Calibration job IDs
CAL_JOBS = {
    "00": 429920,
    "10": 429921,  # X on q4
    "01": 429922,  # X on q6
    "11": 429923,  # X on both
}

# VQE job IDs (v3)
JOB_MAP = {
    0.500: {"X": 426697, "Y": 426698, "Z": 426699},
    0.700: {"X": 426700, "Y": 426701, "Z": 426702},
    0.735: {"X": 426703, "Y": 426704, "Z": 426705},
    0.900: {"X": 426706, "Y": 426707, "Z": 426708},
    1.100: {"X": 426709, "Y": 426710, "Z": 426711},
    1.500: {"X": 426712, "Y": 426713, "Z": 426714},
    2.000: {"X": 426715, "Y": 426716, "Z": 426717},
}


def extract_2q_probs(counts: dict, pos0: int, pos1: int) -> np.ndarray:
    """Extract 2-qubit probability vector [P(00), P(01), P(10), P(11)]
    from 9-bit measurement counts, marginalizing over idle qubits."""
    total = sum(counts.values())
    probs = np.zeros(4)
    for bitstring, count in counts.items():
        b0 = int(bitstring[pos0])
        b1 = int(bitstring[pos1])
        idx = b0 * 2 + b1  # 00=0, 01=1, 10=2, 11=3
        probs[idx] += count
    return probs / total


def build_confusion_matrix(cal_counts: dict) -> np.ndarray:
    """Build 4x4 joint confusion matrix from calibration data.

    M[i,j] = P(measure i | prepared j)

    Columns are prepared states (00, 01, 10, 11).
    Rows are measured outcomes (00, 01, 10, 11).
    """
    M = np.zeros((4, 4))
    prepared_states = ["00", "01", "10", "11"]

    for j, prep in enumerate(prepared_states):
        counts = cal_counts[prep]
        probs = extract_2q_probs(counts, Q0_POS, Q1_POS)
        M[:, j] = probs

    return M


def apply_rem(counts: dict, M_inv: np.ndarray, pos0: int, pos1: int) -> dict:
    """Apply REM correction to measurement counts.

    1. Extract 2-qubit probability distribution
    2. Apply inverse confusion matrix
    3. Clip negative probabilities to 0 and renormalize
    4. Return corrected counts (as fractional counts for expectation values)
    """
    total = sum(counts.values())
    raw_probs = extract_2q_probs(counts, pos0, pos1)

    # Apply inverse confusion matrix
    corrected_probs = M_inv @ raw_probs

    # Clip negatives and renormalize
    corrected_probs = np.maximum(corrected_probs, 0)
    if corrected_probs.sum() > 0:
        corrected_probs /= corrected_probs.sum()

    # Convert back to 2-qubit count dict
    labels = ["00", "01", "10", "11"]
    corrected_counts = {}
    for i, label in enumerate(labels):
        if corrected_probs[i] > 1e-10:
            corrected_counts[label] = corrected_probs[i] * total

    return corrected_counts


def compute_expvals_from_2q(counts: dict) -> tuple:
    """Compute expectation values from 2-qubit counts dict.

    Keys are "00", "01", "10", "11" with fractional counts.
    Returns (Z0, Z1, Z0Z1) or (XX,) or (YY,) depending on context.
    """
    total = sum(counts.values())
    results = {}
    for label, count in counts.items():
        b0, b1 = int(label[0]), int(label[1])
        s0 = 1 - 2 * b0
        s1 = 1 - 2 * b1
        results[label] = (s0, s1, s0 * s1, count)

    z0 = sum(r[0] * r[3] for r in results.values()) / total
    z1 = sum(r[1] * r[3] for r in results.values()) / total
    z0z1 = sum(r[2] * r[3] for r in results.values()) / total

    return z0, z1, z0z1


def compute_energy(g0, g1, g4, z0, z1, xx, yy):
    """E = g0 + g1*(Z0 - Z1) + g4*(X0X1 + Y0Y1)"""
    return g0 + g1 * (z0 - z1) + g4 * (xx + yy)


def bootstrap_rem_energy(counts_z, counts_x, counts_y, M_inv, g0, g1, g4,
                         n_bootstrap=1000, seed=42):
    """Bootstrap energy error estimate for REM-corrected data."""
    rng = np.random.RandomState(seed)

    # Get raw 2q distributions for resampling
    def get_2q_samples(counts):
        total = sum(counts.values())
        samples = []
        for bitstring, count in counts.items():
            b0 = int(bitstring[Q0_POS]) if len(bitstring) == 9 else int(bitstring[0])
            b1 = int(bitstring[Q1_POS]) if len(bitstring) == 9 else int(bitstring[1])
            label = f"{b0}{b1}"
            samples.extend([label] * int(count))
        return samples, total

    samples_z, n_z = get_2q_samples(counts_z)
    samples_x, n_x = get_2q_samples(counts_x)
    samples_y, n_y = get_2q_samples(counts_y)

    energies = []
    for _ in range(n_bootstrap):
        # Resample
        rs_z = rng.choice(samples_z, size=n_z, replace=True)
        rs_x = rng.choice(samples_x, size=n_x, replace=True)
        rs_y = rng.choice(samples_y, size=n_y, replace=True)

        # Count
        def count_samples(rs):
            c = {}
            for s in rs:
                c[s] = c.get(s, 0) + 1
            return c

        rc_z = count_samples(rs_z)
        rc_x = count_samples(rs_x)
        rc_y = count_samples(rs_y)

        # Apply REM
        total_z = sum(rc_z.values())
        total_x = sum(rc_x.values())
        total_y = sum(rc_y.values())

        probs_z = np.zeros(4)
        probs_x = np.zeros(4)
        probs_y = np.zeros(4)
        labels = ["00", "01", "10", "11"]
        for i, lab in enumerate(labels):
            probs_z[i] = rc_z.get(lab, 0) / total_z
            probs_x[i] = rc_x.get(lab, 0) / total_x
            probs_y[i] = rc_y.get(lab, 0) / total_y

        corr_z = np.maximum(M_inv @ probs_z, 0)
        corr_x = np.maximum(M_inv @ probs_x, 0)
        corr_y = np.maximum(M_inv @ probs_y, 0)
        corr_z /= corr_z.sum() if corr_z.sum() > 0 else 1
        corr_x /= corr_x.sum() if corr_x.sum() > 0 else 1
        corr_y /= corr_y.sum() if corr_y.sum() > 0 else 1

        # Compute expectation values from corrected probs
        def expval_from_probs(probs):
            z0 = (probs[0] + probs[1]) - (probs[2] + probs[3])
            z1 = (probs[0] + probs[2]) - (probs[1] + probs[3])
            zz = (probs[0] + probs[3]) - (probs[1] + probs[2])
            return z0, z1, zz

        z0, z1, _ = expval_from_probs(corr_z)
        xx_z0, xx_z1, xx = expval_from_probs(corr_x)
        yy_z0, yy_z1, yy = expval_from_probs(corr_y)

        energies.append(compute_energy(g0, g1, g4, z0, z1, xx, yy))

    return float(np.std(energies))


if __name__ == "__main__":
    # Load calibration counts
    cal_file = Path("experiments/results/readout-cal-q4q6-counts.json")
    if not cal_file.exists():
        print(f"Calibration file not found: {cal_file}")
        print("Fetch calibration results from jobs 429920-429923 and save as:")
        print('  {"00": {...}, "01": {...}, "10": {...}, "11": {...}}')
        raise SystemExit(1)

    with open(cal_file) as f:
        cal_data = json.load(f)

    # Build confusion matrix
    M = build_confusion_matrix(cal_data)
    print("Confusion Matrix M[measured | prepared]:")
    labels = ["00", "01", "10", "11"]
    print(f"{'':>12} {'Prep|00':>10} {'Prep|01':>10} {'Prep|10':>10} {'Prep|11':>10}")
    for i, label in enumerate(labels):
        row = "  ".join(f"{M[i,j]:.4f}" for j in range(4))
        print(f"  Meas|{label}:  {row}")

    # Per-qubit readout errors
    # q4 (logical 0): P(flip) from |0⟩ and |1⟩
    e0_0to1 = M[2, 0] + M[3, 0]  # P(q4=1 | prepared q4=0)
    e0_1to0 = M[0, 2] + M[1, 2]  # P(q4=0 | prepared q4=1)
    # q6 (logical 1):
    e1_0to1 = M[1, 0] + M[3, 0]  # P(q6=1 | prepared q6=0)
    e1_1to0 = M[0, 1] + M[2, 1]  # P(q6=0 | prepared q6=1)
    print(f"\nPer-qubit readout errors:")
    print(f"  q4: P(1|0) = {e0_0to1:.4f}, P(0|1) = {e0_1to0:.4f}")
    print(f"  q6: P(1|0) = {e1_0to1:.4f}, P(0|1) = {e1_1to0:.4f}")

    # Invert
    M_inv = np.linalg.inv(M)
    cond = np.linalg.cond(M)
    print(f"\nConfusion matrix condition number: {cond:.2f}")

    # Load VQE raw counts
    raw_file = Path("experiments/results/h2-2qubit-tuna9-raw-counts-v3.json")
    with open(raw_file) as f:
        raw_counts = json.load(f)

    # Load circuit metadata
    circuits_file = Path("experiments/results/replication-tuna9-circuits.json")
    with open(circuits_file) as f:
        circuit_data = json.load(f)

    h2_meta = circuit_data["sagastizabal2019"]["distances"]

    print("\n" + "=" * 80)
    print("H2 2-QUBIT VQE — TUNA-9 WITH READOUT ERROR MITIGATION")
    print("=" * 80)
    print(f"Qubits: q4 (logical 0), q6 (logical 1)")
    print(f"Calibration jobs: {list(CAL_JOBS.values())}")
    print()

    all_results = []
    for meta in h2_meta:
        R = meta["bond_distance"]
        g0 = meta["g0"]
        g1 = meta["g1"]
        g4 = meta["g4"]
        fci = meta["fci_energy"]
        jobs = JOB_MAP[R]

        counts_z = raw_counts[str(jobs["Z"])]
        counts_x = raw_counts[str(jobs["X"])]
        counts_y = raw_counts[str(jobs["Y"])]

        # Raw expectation values (for comparison)
        raw_probs_z = extract_2q_probs(counts_z, Q0_POS, Q1_POS)
        raw_probs_x = extract_2q_probs(counts_x, Q0_POS, Q1_POS)
        raw_probs_y = extract_2q_probs(counts_y, Q0_POS, Q1_POS)

        # REM-corrected
        corr_probs_z = np.maximum(M_inv @ raw_probs_z, 0)
        corr_probs_x = np.maximum(M_inv @ raw_probs_x, 0)
        corr_probs_y = np.maximum(M_inv @ raw_probs_y, 0)
        corr_probs_z /= corr_probs_z.sum()
        corr_probs_x /= corr_probs_x.sum()
        corr_probs_y /= corr_probs_y.sum()

        # Expectation values from corrected probabilities
        def expval_from_probs(probs):
            z0 = (probs[0] + probs[1]) - (probs[2] + probs[3])
            z1 = (probs[0] + probs[2]) - (probs[1] + probs[3])
            zz = (probs[0] + probs[3]) - (probs[1] + probs[2])
            return z0, z1, zz

        z0, z1, z0z1 = expval_from_probs(corr_probs_z)
        _, _, xx = expval_from_probs(corr_probs_x)  # ZZ in rotated basis = XX
        _, _, yy = expval_from_probs(corr_probs_y)  # ZZ in rotated basis = YY

        energy = compute_energy(g0, g1, g4, z0, z1, xx, yy)
        error_mha = abs(energy - fci) * 1000

        # Raw energy for comparison
        raw_z0, raw_z1, raw_z0z1 = expval_from_probs(raw_probs_z)
        _, _, raw_xx = expval_from_probs(raw_probs_x)
        _, _, raw_yy = expval_from_probs(raw_probs_y)
        raw_energy = compute_energy(g0, g1, g4, raw_z0, raw_z1, raw_xx, raw_yy)
        raw_error_mha = abs(raw_energy - fci) * 1000

        # Bootstrap error
        sigma = bootstrap_rem_energy(counts_z, counts_x, counts_y, M_inv, g0, g1, g4)

        result = {
            "bond_distance": R,
            "fci_energy": fci,
            "optimal_alpha": meta["optimal_alpha"],
            "g0": g0, "g1": g1, "g4": g4,
            "raw_energy": round(raw_energy, 8),
            "raw_error_mHa": round(raw_error_mha, 4),
            "rem_expvals": {
                "Z0": round(z0, 6), "Z1": round(z1, 6),
                "Z0Z1": round(z0z1, 6),
                "X0X1": round(xx, 6), "Y0Y1": round(yy, 6),
            },
            "rem_symmetry_Z0Z1": round(z0z1, 4),
            "rem_energy": round(energy, 8),
            "rem_error_mHa": round(error_mha, 4),
            "rem_error_kcal_mol": round(error_mha * 0.627509, 2),
            "rem_sigma_mHa": round(sigma * 1000, 4),
            "improvement_factor": round(raw_error_mha / error_mha, 1) if error_mha > 0 else float('inf'),
            "chemical_accuracy": bool(error_mha < 1.6),
        }
        all_results.append(result)

        chem = "** CHEMICAL ACCURACY **" if result["chemical_accuracy"] else ""
        print(f"R = {R:.3f} A")
        print(f"  FCI:       {fci:.6f} Ha")
        print(f"  Raw:       {raw_energy:.6f} Ha  ({raw_error_mha:.1f} mHa)")
        print(f"  REM:       {energy:.6f} Ha  ({error_mha:.1f} +/- {sigma*1000:.1f} mHa)"
              f"  [{result['improvement_factor']:.1f}x improvement]  {chem}")
        print(f"  Symmetry:  <Z0Z1> = {z0z1:+.4f} (ideal: -1.000)")
        print()

    # Summary
    print("=" * 80)
    print(f"{'R (A)':>7} {'FCI':>10} {'Raw E':>10} {'Raw Err':>8} {'REM E':>10} {'REM Err':>8} {'Improv':>7}")
    print("-" * 80)
    for r in all_results:
        print(f"{r['bond_distance']:>7.3f} {r['fci_energy']:>10.6f} "
              f"{r['raw_energy']:>10.6f} {r['raw_error_mHa']:>7.1f} "
              f"{r['rem_energy']:>10.6f} {r['rem_error_mHa']:>7.1f} "
              f"{r['improvement_factor']:>6.1f}x")

    avg_raw = np.mean([r["raw_error_mHa"] for r in all_results])
    avg_rem = np.mean([r["rem_error_mHa"] for r in all_results])
    n_chem = sum(1 for r in all_results if r["chemical_accuracy"])
    print(f"\nAvg raw error: {avg_raw:.1f} mHa")
    print(f"Avg REM error: {avg_rem:.1f} mHa")
    print(f"Avg improvement: {avg_raw/avg_rem:.1f}x")
    print(f"Chemical accuracy: {n_chem}/{len(all_results)} points")

    # Save
    output = {
        "experiment": "H2 2-qubit VQE dissociation curve with REM",
        "backend": "Tuna-9",
        "physical_qubits": [4, 6],
        "gate_set": "native (CZ, Ry, Rz, X)",
        "compile_stage": "routing",
        "shots_per_basis": 4096,
        "total_shots": 86016,
        "mitigation": "Readout Error Mitigation (confusion matrix inversion)",
        "calibration_jobs": CAL_JOBS,
        "confusion_matrix": M.tolist(),
        "confusion_matrix_condition": round(cond, 2),
        "analyzed": datetime.now(timezone.utc).isoformat(),
        "job_map": {str(k): v for k, v in JOB_MAP.items()},
        "results": all_results,
    }

    outfile = Path("experiments/results/h2-2qubit-vqe-tuna9-rem-analysis.json")
    with open(outfile, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nSaved to: {outfile}")
