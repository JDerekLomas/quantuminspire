#!/usr/bin/env python3
"""Analyze ZNE H2 2-qubit VQE results from Tuna-9.

Workflow:
  1. Fetch raw counts from QI (or use cached)
  2. Apply REM (readout error mitigation) at each fold factor
  3. Richardson extrapolation to zero-noise limit
  4. Compare: raw → REM-only → REM+ZNE (linear) → REM+ZNE (quadratic)
  5. Save results + website JSON

Usage:
  python analyze_zne_h2.py          # fetch + analyze
  python analyze_zne_h2.py --check  # just check job status
  python analyze_zne_h2.py --no-fetch  # use cached counts
"""

import json
import sys
import numpy as np
from pathlib import Path
from datetime import datetime, timezone

RESULTS_DIR = Path("experiments/results")
JOB_IDS_FILE = RESULTS_DIR / "zne-h2-job-ids.json"
RAW_COUNTS_FILE = RESULTS_DIR / "zne-h2-raw-counts.json"
ANALYSIS_FILE = RESULTS_DIR / "zne-h2-analysis.json"
SWEEP_FILE = RESULTS_DIR / "vqe-h2-sweep-tuna9.json"

QA, QB = 4, 6  # Physical qubits
FOLDS = [1, 3, 5]
N_REPS = 5


def extract_2q_probs(counts_9bit):
    """Extract 2-qubit probabilities for qa=4, qb=6 from 9-bit counts."""
    probs = {"00": 0, "01": 0, "10": 0, "11": 0}
    total = 0
    for bs, count in counts_9bit.items():
        qa_val = bs[8 - QA]  # MSB-first: pos = 8 - qubit_index
        qb_val = bs[8 - QB]
        probs[f"{qa_val}{qb_val}"] += count
        total += count
    return {k: v / total for k, v in probs.items()}, total


def build_confusion_matrix(cal_counts):
    """Build 4x4 confusion matrix from calibration data."""
    states = ["00", "10", "01", "11"]
    M = np.zeros((4, 4))
    for j, prep_state in enumerate(states):
        probs, _ = extract_2q_probs(cal_counts[prep_state])
        for i, meas_state in enumerate(states):
            M[i, j] = probs[meas_state]
    return M


def apply_rem(probs_dict, M_inv):
    """Apply REM: corrected = M_inv @ raw_probs."""
    states = ["00", "10", "01", "11"]
    raw_vec = np.array([probs_dict[s] for s in states])
    corrected = M_inv @ raw_vec
    return {s: float(corrected[i]) for i, s in enumerate(states)}


def compute_expvals(probs):
    """Compute <Z0>, <Z1>, <Z0Z1>, <X0X1>, <Y0Y1> from 2-qubit probs."""
    p00 = probs.get("00", 0)
    p01 = probs.get("01", 0)
    p10 = probs.get("10", 0)
    p11 = probs.get("11", 0)

    z0 = (p00 + p01) - (p10 + p11)
    z1 = (p00 + p10) - (p01 + p11)
    z0z1 = (p00 + p11) - (p01 + p10)
    return z0, z1, z0z1


def compute_energy(z_probs, x_probs, y_probs, g0, g1, g4):
    """Compute H2 energy from measurement results."""
    _, _, z0z1 = compute_expvals(z_probs)
    z0, z1, _ = compute_expvals(z_probs)
    _, _, x0x1 = compute_expvals(x_probs)
    _, _, y0y1 = compute_expvals(y_probs)

    energy = g0 + g1 * (z0 - z1) + g4 * (x0x1 + y0y1)
    return energy


def fetch_results(job_data):
    """Fetch all results from QI."""
    from quantuminspire.util.api.remote_backend import RemoteBackend
    backend = RemoteBackend()

    job_ids = job_data["job_ids"]
    counts = {}
    n_done = 0
    n_pending = 0
    n_fail = 0

    for name, job_id in job_ids.items():
        if isinstance(job_id, str) and job_id.startswith("FAILED"):
            n_fail += 1
            continue
        try:
            job = backend.get_job(int(job_id))
            status = str(getattr(job, "status", ""))

            if "COMPLETED" in status:
                raw = backend.get_results(int(job_id))
                items = raw.items if hasattr(raw, "items") else raw
                histogram = None
                for item in items:
                    if hasattr(item, "results") and item.results:
                        histogram = item.results
                        break
                if histogram:
                    counts[name] = {k: int(v) for k, v in histogram.items()}
                    n_done += 1
                else:
                    n_fail += 1
            elif "RUNNING" in status or "PLANNED" in status:
                n_pending += 1
            else:
                n_fail += 1
        except Exception as e:
            n_fail += 1
            print(f"  Error fetching {name} (job {job_id}): {e}")

        if (n_done + n_pending + n_fail) % 50 == 0:
            print(f"  Fetched {n_done}, pending {n_pending}, failed {n_fail}")

    print(f"Total: {n_done} done, {n_pending} pending, {n_fail} failed")
    return counts, n_pending


def check_status(job_data):
    """Check job completion status."""
    from quantuminspire.util.api.remote_backend import RemoteBackend
    backend = RemoteBackend()

    job_ids = job_data["job_ids"]
    statuses = {"COMPLETED": 0, "RUNNING": 0, "PLANNED": 0, "FAILED": 0, "OTHER": 0}

    # Sample first and last few jobs
    items = list(job_ids.items())
    sample = items[:5] + items[-5:]

    for name, job_id in sample:
        if isinstance(job_id, str) and job_id.startswith("FAILED"):
            statuses["FAILED"] += 1
            continue
        try:
            job = backend.get_job(int(job_id))
            status = str(getattr(job, "status", ""))
            if "COMPLETED" in status:
                statuses["COMPLETED"] += 1
            elif "RUNNING" in status:
                statuses["RUNNING"] += 1
            elif "PLANNED" in status:
                statuses["PLANNED"] += 1
            elif "FAILED" in status:
                statuses["FAILED"] += 1
            else:
                statuses["OTHER"] += 1
        except Exception as e:
            statuses["OTHER"] += 1
            print(f"  {name}: {e}")

    print(f"Sample status ({len(sample)} jobs): {dict(statuses)}")
    if statuses["PLANNED"] > 0 or statuses["RUNNING"] > 0:
        print("Jobs still running. Try again later.")
        return False
    return True


def analyze(counts, job_data):
    """Full ZNE analysis with REM."""
    distances = job_data["distances"]

    # Build confusion matrices from start and end calibration
    cal_start = {}
    cal_end = {}
    for state in ["00", "10", "01", "11"]:
        start_key = f"cal_start_{state}"
        end_key = f"cal_end_{state}"
        if start_key in counts:
            cal_start[state] = counts[start_key]
        if end_key in counts:
            cal_end[state] = counts[end_key]

    if len(cal_start) == 4:
        M_start = build_confusion_matrix(cal_start)
        M_inv_start = np.linalg.inv(M_start)
        print(f"Start cal condition number: {np.linalg.cond(M_start):.3f}")
    else:
        print("WARNING: Missing start calibration, skipping REM")
        M_inv_start = None

    if len(cal_end) == 4:
        M_end = build_confusion_matrix(cal_end)
        print(f"End cal condition number: {np.linalg.cond(M_end):.3f}")
        if M_inv_start is not None:
            drift = np.max(np.abs(M_start - M_end))
            print(f"Calibration drift: {drift:.4f}")
    else:
        M_end = None

    # Process each distance × fold × rep
    results_per_distance = []

    for d in distances:
        R = d["R"]
        g0, g1, g4 = d["g0"], d["g1"], d["g4"]
        fci = d["fci"]
        hf = d["hf"]

        fold_energies = {}  # fold -> list of energies (5 reps)
        fold_energies_raw = {}

        for fold in FOLDS:
            rep_energies = []
            rep_energies_raw = []

            for rep in range(N_REPS):
                z_key = f"f{fold}_rep{rep}_R{R:.3f}_Z"
                x_key = f"f{fold}_rep{rep}_R{R:.3f}_X"
                y_key = f"f{fold}_rep{rep}_R{R:.3f}_Y"

                if z_key not in counts or x_key not in counts or y_key not in counts:
                    continue

                z_probs, _ = extract_2q_probs(counts[z_key])
                x_probs, _ = extract_2q_probs(counts[x_key])
                y_probs, _ = extract_2q_probs(counts[y_key])

                # Raw energy (no mitigation)
                e_raw = compute_energy(z_probs, x_probs, y_probs, g0, g1, g4)
                rep_energies_raw.append(e_raw)

                # REM energy
                if M_inv_start is not None:
                    z_rem = apply_rem(z_probs, M_inv_start)
                    x_rem = apply_rem(x_probs, M_inv_start)
                    y_rem = apply_rem(y_probs, M_inv_start)
                    e_rem = compute_energy(z_rem, x_rem, y_rem, g0, g1, g4)
                    rep_energies.append(e_rem)

            fold_energies[fold] = rep_energies
            fold_energies_raw[fold] = rep_energies_raw

        # Compute statistics at each fold
        fold_stats = {}
        fold_stats_raw = {}
        for fold in FOLDS:
            if fold_energies[fold]:
                arr = np.array(fold_energies[fold])
                fold_stats[fold] = {
                    "mean": float(np.mean(arr)),
                    "std": float(np.std(arr, ddof=1)),
                    "values": [float(x) for x in arr],
                }
            if fold_energies_raw[fold]:
                arr = np.array(fold_energies_raw[fold])
                fold_stats_raw[fold] = {
                    "mean": float(np.mean(arr)),
                    "std": float(np.std(arr, ddof=1)),
                }

        # Richardson extrapolation (REM energies)
        zne_results = {}

        if all(fold in fold_stats for fold in [1, 3]):
            # Linear: E(0) = (3*E(1) - E(3)) / 2
            e1_vals = np.array(fold_stats[1]["values"])
            e3_vals = np.array(fold_stats[3]["values"])
            # Per-rep extrapolation
            n_pairs = min(len(e1_vals), len(e3_vals))
            linear_vals = (3 * e1_vals[:n_pairs] - e3_vals[:n_pairs]) / 2
            zne_results["linear"] = {
                "mean": float(np.mean(linear_vals)),
                "std": float(np.std(linear_vals, ddof=1)),
                "error_mHa": float(abs(np.mean(linear_vals) - fci) * 1000),
                "error_kcal": float(abs(np.mean(linear_vals) - fci) * 627.509),
                "values": [float(x) for x in linear_vals],
            }

        if all(fold in fold_stats for fold in [1, 3, 5]):
            # Quadratic: E(0) = (15*E(1) - 10*E(3) + 3*E(5)) / 8
            e1_vals = np.array(fold_stats[1]["values"])
            e3_vals = np.array(fold_stats[3]["values"])
            e5_vals = np.array(fold_stats[5]["values"])
            n_trips = min(len(e1_vals), len(e3_vals), len(e5_vals))
            quad_vals = (15 * e1_vals[:n_trips] - 10 * e3_vals[:n_trips] + 3 * e5_vals[:n_trips]) / 8
            zne_results["quadratic"] = {
                "mean": float(np.mean(quad_vals)),
                "std": float(np.std(quad_vals, ddof=1)),
                "error_mHa": float(abs(np.mean(quad_vals) - fci) * 1000),
                "error_kcal": float(abs(np.mean(quad_vals) - fci) * 627.509),
                "values": [float(x) for x in quad_vals],
            }

        # Summary for this distance
        rem_only_error = abs(fold_stats[1]["mean"] - fci) * 1000 if 1 in fold_stats else None
        raw_error = abs(fold_stats_raw[1]["mean"] - fci) * 1000 if 1 in fold_stats_raw else None

        result = {
            "bond_distance": R,
            "fci_energy": fci,
            "hf_energy": hf,
            "fold_stats_rem": {str(k): v for k, v in fold_stats.items()},
            "fold_stats_raw": {str(k): v for k, v in fold_stats_raw.items()},
            "zne": zne_results,
            "error_raw_mHa": raw_error,
            "error_rem_mHa": rem_only_error,
            "error_zne_linear_mHa": zne_results.get("linear", {}).get("error_mHa"),
            "error_zne_quad_mHa": zne_results.get("quadratic", {}).get("error_mHa"),
        }
        results_per_distance.append(result)

        # Print summary
        raw_str = f"{raw_error:.1f}" if raw_error else "N/A"
        rem_str = f"{rem_only_error:.1f}" if rem_only_error else "N/A"
        lin_str = f"{zne_results['linear']['error_mHa']:.1f}" if "linear" in zne_results else "N/A"
        quad_str = f"{zne_results['quadratic']['error_mHa']:.1f}" if "quadratic" in zne_results else "N/A"
        print(f"R={R:.3f}: raw={raw_str}, REM={rem_str}, ZNE-lin={lin_str}, ZNE-quad={quad_str} mHa")

    # Overall summary
    print(f"\n{'='*60}")
    print("MITIGATION LADDER (mean across distances, mHa)")
    print(f"{'='*60}")

    for method, key in [("Raw", "error_raw_mHa"), ("REM only", "error_rem_mHa"),
                         ("REM+ZNE linear", "error_zne_linear_mHa"),
                         ("REM+ZNE quadratic", "error_zne_quad_mHa")]:
        vals = [r[key] for r in results_per_distance if r[key] is not None]
        if vals:
            mean_err = np.mean(vals)
            chem_acc = sum(1 for v in vals if v <= 1.6)
            print(f"  {method:20s}: {mean_err:.1f} mHa avg, {chem_acc}/{len(vals)} at chemical accuracy")

    # Save full analysis
    analysis = {
        "experiment": "H2 2-qubit ZNE (REM+ZNE stacked)",
        "completed": datetime.now(timezone.utc).isoformat(),
        "backend": "Tuna-9",
        "physical_qubits": [QA, QB],
        "n_reps": N_REPS,
        "fold_factors": FOLDS,
        "results": results_per_distance,
        "calibration": {
            "start_condition": float(np.linalg.cond(M_start)) if M_inv_start is not None else None,
        },
    }

    with open(ANALYSIS_FILE, "w") as f:
        json.dump(analysis, f, indent=2)
    print(f"\nFull analysis saved to: {ANALYSIS_FILE}")

    # Update website sweep JSON with best ZNE method
    best_method = "quadratic" if all("quadratic" in r["zne"] for r in results_per_distance) else "linear"
    sweep_data = []
    for r in results_per_distance:
        zne = r["zne"].get(best_method, r["zne"].get("linear", {}))
        entry = {
            "bond_distance": r["bond_distance"],
            "energy_measured": zne.get("mean", r["fold_stats_rem"]["1"]["mean"]),
            "energy_exact": r["fci_energy"],
            "fci_energy": r["fci_energy"],
            "hf_energy": r["hf_energy"],
            "error_kcal": zne.get("error_kcal", 0),
            "error_std_kcal": zne.get("std", 0) * 627.509 if "std" in zne else 0,
            "error_mHa": zne.get("error_mHa", 0),
            "error_std_mHa": zne.get("std", 0) * 1000 if "std" in zne else 0,
            "alpha": next(d["alpha"] for d in job_data["distances"] if abs(d["R"] - r["bond_distance"]) < 0.001),
            "shots": 4096,
            "n_reps": N_REPS,
            "mitigation": f"REM+ZNE({best_method})",
        }
        sweep_data.append(entry)

    with open(SWEEP_FILE, "w") as f:
        json.dump(sweep_data, f, indent=2)
    print(f"Website sweep updated: {SWEEP_FILE}")

    return analysis


def main():
    if not JOB_IDS_FILE.exists():
        print(f"No job IDs file: {JOB_IDS_FILE}")
        print("Run submit_zne_h2.py first.")
        sys.exit(1)

    with open(JOB_IDS_FILE) as f:
        job_data = json.load(f)

    print(f"ZNE experiment: {job_data['n_submitted']} circuits submitted")

    if "--check" in sys.argv:
        check_status(job_data)
        return

    if "--no-fetch" in sys.argv:
        if not RAW_COUNTS_FILE.exists():
            print(f"No cached counts: {RAW_COUNTS_FILE}")
            sys.exit(1)
        with open(RAW_COUNTS_FILE) as f:
            counts = json.load(f)
        print(f"Loaded {len(counts)} cached results")
    else:
        print("Fetching results from QI...")
        counts, n_pending = fetch_results(job_data)
        if n_pending > 0:
            print(f"\n{n_pending} jobs still pending. Run --check to monitor.")
            sys.exit(1)

        with open(RAW_COUNTS_FILE, "w") as f:
            json.dump(counts, f)
        print(f"Cached {len(counts)} results to {RAW_COUNTS_FILE}")

    analyze(counts, job_data)


if __name__ == "__main__":
    main()
