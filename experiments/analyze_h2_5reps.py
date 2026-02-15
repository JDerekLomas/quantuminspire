#!/usr/bin/env python3
"""Analyze 5-rep H2 VQE results with REM. Computes mean ± std across reps.

Usage:
  python analyze_h2_5reps.py              # fetch results, analyze, save
  python analyze_h2_5reps.py --check      # just check job statuses
  python analyze_h2_5reps.py --no-fetch   # analyze from cached counts
"""

import json
import sys
import numpy as np
from pathlib import Path
from datetime import datetime, timezone

# ── Constants ──────────────────────────────────────────────────
Q0_POS = 4  # q4 position in 9-bit MSB-first bitstring
Q1_POS = 2  # q6 position
N_REPS = 5
RESULTS_DIR = Path("experiments/results")


def extract_2q_probs(counts, pos0=Q0_POS, pos1=Q1_POS):
    """Extract 2-qubit probability vector from 9-bit counts."""
    total = sum(counts.values())
    probs = np.zeros(4)
    for bitstring, count in counts.items():
        b0 = int(bitstring[pos0])
        b1 = int(bitstring[pos1])
        probs[b0 * 2 + b1] += count
    return probs / total


def build_confusion_matrix(cal_counts):
    """Build 4x4 joint confusion matrix. M[i,j] = P(measure i | prepared j)."""
    M = np.zeros((4, 4))
    for j, prep in enumerate(["00", "01", "10", "11"]):
        M[:, j] = extract_2q_probs(cal_counts[prep])
    return M


def expval_from_probs(probs):
    """Compute Z0, Z1, Z0Z1 from probability vector [P00, P01, P10, P11]."""
    z0 = (probs[0] + probs[1]) - (probs[2] + probs[3])
    z1 = (probs[0] + probs[2]) - (probs[1] + probs[3])
    zz = (probs[0] + probs[3]) - (probs[1] + probs[2])
    return z0, z1, zz


def compute_energy(g0, g1, g4, z0, z1, xx, yy):
    """E = g0 + g1*(Z0 - Z1) + g4*(X0X1 + Y0Y1)"""
    return g0 + g1 * (z0 - z1) + g4 * (xx + yy)


def rem_energy_from_counts(counts_z, counts_x, counts_y, M_inv, g0, g1, g4):
    """Full pipeline: raw counts → REM-corrected energy."""
    raw_z = extract_2q_probs(counts_z)
    raw_x = extract_2q_probs(counts_x)
    raw_y = extract_2q_probs(counts_y)

    corr_z = np.maximum(M_inv @ raw_z, 0); corr_z /= corr_z.sum()
    corr_x = np.maximum(M_inv @ raw_x, 0); corr_x /= corr_x.sum()
    corr_y = np.maximum(M_inv @ raw_y, 0); corr_y /= corr_y.sum()

    z0, z1, z0z1 = expval_from_probs(corr_z)
    _, _, xx = expval_from_probs(corr_x)
    _, _, yy = expval_from_probs(corr_y)

    energy = compute_energy(g0, g1, g4, z0, z1, xx, yy)

    # Also compute raw energy
    rz0, rz1, _ = expval_from_probs(raw_z)
    _, _, rxx = expval_from_probs(raw_x)
    _, _, ryy = expval_from_probs(raw_y)
    raw_energy = compute_energy(g0, g1, g4, rz0, rz1, rxx, ryy)

    return {
        "raw_energy": float(raw_energy),
        "rem_energy": float(energy),
        "z0z1_raw": float((raw_z[0] + raw_z[3]) - (raw_z[1] + raw_z[2])),
        "z0z1_rem": float(z0z1),
    }


# ── Fetch results ─────────────────────────────────────────────

def fetch_results(job_ids_file):
    """Fetch all results from QI and cache locally."""
    from quantuminspire.util.api.remote_backend import RemoteBackend

    with open(job_ids_file) as f:
        data = json.load(f)

    job_ids = data["job_ids"]
    backend = RemoteBackend()

    all_counts = {}
    n_done = 0
    n_running = 0
    n_failed = 0

    for name, job_id in job_ids.items():
        if isinstance(job_id, str) and "FAILED" in job_id:
            n_failed += 1
            continue

        try:
            job = backend.get_job(job_id)
            status = str(getattr(job, "status", ""))

            if "COMPLETED" in status:
                raw = backend.get_results(job_id)
                items = raw.items if hasattr(raw, "items") else raw
                histogram = None
                for item in items:
                    if hasattr(item, "results") and item.results:
                        histogram = item.results
                        break
                if histogram:
                    all_counts[name] = histogram
                    n_done += 1
                else:
                    print(f"  {name} (job {job_id}): completed but no results")
                    n_failed += 1
            elif "FAILED" in status or "ERROR" in status:
                print(f"  {name} (job {job_id}): {status}")
                n_failed += 1
            else:
                n_running += 1
                if n_running <= 5:
                    print(f"  {name} (job {job_id}): {status}")
        except Exception as e:
            print(f"  {name} (job {job_id}): error fetching: {e}")
            n_failed += 1

    print(f"\nFetch summary: {n_done} done, {n_running} running, {n_failed} failed")

    if n_running > 0:
        print(f"WARNING: {n_running} jobs still running. Re-run later to get all results.")

    # Cache
    cache_file = RESULTS_DIR / "h2-5rep-raw-counts.json"
    with open(cache_file, "w") as f:
        json.dump(all_counts, f)
    print(f"Cached {len(all_counts)} count dictionaries to {cache_file}")

    return all_counts, n_done, n_running


def check_status(job_ids_file):
    """Check status of all jobs without fetching results."""
    from quantuminspire.util.api.remote_backend import RemoteBackend

    with open(job_ids_file) as f:
        data = json.load(f)

    job_ids = data["job_ids"]
    backend = RemoteBackend()

    status_counts = {}
    for name, job_id in job_ids.items():
        if isinstance(job_id, str):
            status_counts["SUBMIT_FAILED"] = status_counts.get("SUBMIT_FAILED", 0) + 1
            continue
        try:
            job = backend.get_job(job_id)
            status = str(getattr(job, "status", "UNKNOWN"))
            # Normalize
            for s in ["COMPLETED", "RUNNING", "PLANNED", "FAILED", "ERROR"]:
                if s in status:
                    status = s
                    break
            status_counts[status] = status_counts.get(status, 0) + 1
        except Exception:
            status_counts["FETCH_ERROR"] = status_counts.get("FETCH_ERROR", 0) + 1

    total = sum(status_counts.values())
    print(f"Job status summary ({total} total):")
    for s, n in sorted(status_counts.items()):
        bar = "█" * (n * 40 // total)
        print(f"  {s:>15}: {n:>3} {bar}")

    return status_counts


# ── Analysis ──────────────────────────────────────────────────

def analyze(counts, distances, cal_counts):
    """Compute per-rep and aggregate statistics."""
    M = build_confusion_matrix(cal_counts)
    M_inv = np.linalg.inv(M)
    cond = np.linalg.cond(M)

    print(f"\nConfusion matrix condition: {cond:.2f}")
    print(f"Using calibration from: {list(cal_counts.keys())}")

    results_by_distance = {}
    for d in distances:
        R = d["R"]
        g0, g1, g4, fci = d["g0"], d["g1"], d["g4"], d["fci"]

        rep_results = []
        for rep in range(N_REPS):
            z_key = f"rep{rep}_R{R:.3f}_Z"
            x_key = f"rep{rep}_R{R:.3f}_X"
            y_key = f"rep{rep}_R{R:.3f}_Y"

            if z_key not in counts or x_key not in counts or y_key not in counts:
                continue

            r = rem_energy_from_counts(
                counts[z_key], counts[x_key], counts[y_key],
                M_inv, g0, g1, g4
            )
            r["raw_error_mHa"] = abs(r["raw_energy"] - fci) * 1000
            r["rem_error_mHa"] = abs(r["rem_energy"] - fci) * 1000
            r["rep"] = rep
            rep_results.append(r)

        if not rep_results:
            print(f"  R={R:.3f}: NO DATA")
            continue

        raw_errors = [r["raw_error_mHa"] for r in rep_results]
        rem_errors = [r["rem_error_mHa"] for r in rep_results]
        rem_energies = [r["rem_energy"] for r in rep_results]
        raw_energies = [r["raw_energy"] for r in rep_results]
        z0z1_values = [r["z0z1_rem"] for r in rep_results]

        results_by_distance[R] = {
            "bond_distance": R,
            "fci_energy": fci,
            "hf_energy": d["hf"],
            "n_reps": len(rep_results),
            "raw_energy_mean": float(np.mean(raw_energies)),
            "raw_energy_std": float(np.std(raw_energies, ddof=1)),
            "rem_energy_mean": float(np.mean(rem_energies)),
            "rem_energy_std": float(np.std(rem_energies, ddof=1)),
            "raw_error_mean_mHa": float(np.mean(raw_errors)),
            "raw_error_std_mHa": float(np.std(raw_errors, ddof=1)),
            "rem_error_mean_mHa": float(np.mean(rem_errors)),
            "rem_error_std_mHa": float(np.std(rem_errors, ddof=1)),
            "z0z1_mean": float(np.mean(z0z1_values)),
            "z0z1_std": float(np.std(z0z1_values, ddof=1)),
            "per_rep": rep_results,
        }

    return results_by_distance, M, cond


def print_report(results, cond):
    """Print formatted analysis report."""
    print("\n" + "=" * 90)
    print("H2 2-QUBIT VQE — TUNA-9 — 5 REPETITIONS WITH REM")
    print("=" * 90)
    print(f"Confusion matrix condition: {cond:.2f}")
    print(f"Chemical accuracy threshold: 1.6 mHa (1.0 kcal/mol)")
    print()

    header = (f"{'R (Å)':>7} {'N':>3} {'Raw Mean':>10} {'Raw σ':>8} "
              f"{'REM Mean':>10} {'REM σ':>8} {'<Z0Z1>':>8} {'Chem?':>6}")
    print(header)
    print("-" * 90)

    all_rem_means = []
    n_chem = 0
    for R in sorted(results.keys()):
        r = results[R]
        chem = r["rem_error_mean_mHa"] < 1.6
        if chem:
            n_chem += 1
        all_rem_means.append(r["rem_error_mean_mHa"])
        mark = "  ✓" if chem else ""
        print(f"{R:>7.3f} {r['n_reps']:>3} "
              f"{r['raw_error_mean_mHa']:>8.1f}±{r['raw_error_std_mHa']:<5.1f} "
              f"{r['rem_error_mean_mHa']:>8.1f}±{r['rem_error_std_mHa']:<5.1f} "
              f"{r['z0z1_mean']:>+.4f} {mark}")

    print("-" * 90)
    overall_mean = np.mean(all_rem_means)
    print(f"Overall REM error: {overall_mean:.1f} mHa (mean across distances)")
    print(f"Chemical accuracy: {n_chem}/{len(results)} distances")

    # Per-rep breakdown
    print(f"\n{'Per-rep REM errors (mHa)':>30}")
    print(f"{'R (Å)':>7}", end="")
    for rep in range(N_REPS):
        print(f" {'Rep'+str(rep):>8}", end="")
    print()
    for R in sorted(results.keys()):
        r = results[R]
        print(f"{R:>7.3f}", end="")
        for pr in r["per_rep"]:
            print(f" {pr['rem_error_mHa']:>8.1f}", end="")
        print()


def save_results(results, M, cond, cal_source, distances):
    """Save full analysis + website-ready sweep data."""
    # Full analysis JSON
    analysis = {
        "experiment": "H2 2-qubit VQE 5-rep statistical run",
        "backend": "Tuna-9",
        "physical_qubits": [4, 6],
        "gate_set": "native (CZ, Ry, Rz, X)",
        "compile_stage": "routing",
        "shots_per_basis": 4096,
        "n_reps": N_REPS,
        "mitigation": "REM (confusion matrix inversion)",
        "calibration_source": cal_source,
        "confusion_matrix": M.tolist(),
        "confusion_matrix_condition": round(cond, 2),
        "analyzed": datetime.now(timezone.utc).isoformat(),
        "results": {str(R): {k: v for k, v in r.items() if k != "per_rep"}
                    for R, r in results.items()},
        "per_rep_results": {str(R): r["per_rep"] for R, r in results.items()},
    }

    analysis_file = RESULTS_DIR / "h2-2qubit-vqe-tuna9-5rep-analysis.json"
    with open(analysis_file, "w") as f:
        json.dump(analysis, f, indent=2)
    print(f"\nFull analysis saved to: {analysis_file}")

    # Website-ready sweep data (matches SweepPoint interface)
    sweep = []
    for R in sorted(results.keys()):
        r = results[R]
        d = next(d for d in distances if d["R"] == R)
        sweep.append({
            "bond_distance": R,
            "energy_measured": round(r["rem_energy_mean"], 6),
            "energy_exact": r["fci_energy"],
            "fci_energy": r["fci_energy"],
            "hf_energy": r["hf_energy"],
            "error_kcal": round(r["rem_error_mean_mHa"] * 0.627509, 2),
            "error_std_kcal": round(r["rem_error_std_mHa"] * 0.627509, 2),
            "error_mHa": round(r["rem_error_mean_mHa"], 1),
            "error_std_mHa": round(r["rem_error_std_mHa"], 1),
            "alpha": d["alpha"],
            "shots": 4096,
            "n_reps": r["n_reps"],
            "mitigation": "REM",
        })

    sweep_file = RESULTS_DIR / "vqe-h2-sweep-tuna9.json"
    with open(sweep_file, "w") as f:
        json.dump(sweep, f, indent=2)
    print(f"Website sweep data saved to: {sweep_file}")

    return analysis_file, sweep_file


# ── Main ──────────────────────────────────────────────────────

if __name__ == "__main__":
    job_ids_file = RESULTS_DIR / "h2-5rep-job-ids.json"

    if "--check" in sys.argv:
        check_status(job_ids_file)
        sys.exit(0)

    # Load distances from job IDs file
    with open(job_ids_file) as f:
        meta = json.load(f)
    distances = meta["distances"]

    # Fetch or load cached counts
    cache_file = RESULTS_DIR / "h2-5rep-raw-counts.json"
    if "--no-fetch" in sys.argv and cache_file.exists():
        print(f"Loading cached counts from {cache_file}")
        with open(cache_file) as f:
            all_counts = json.load(f)
        n_running = 0
    else:
        all_counts, n_done, n_running = fetch_results(job_ids_file)
        if n_running > 0:
            print(f"\n{n_running} jobs still running. Exiting — re-run when complete.")
            sys.exit(1)

    # Load calibration (use start-of-batch from verification run)
    cal_file = RESULTS_DIR / "readout-cal-q4q6-counts.json"
    if not cal_file.exists():
        print(f"ERROR: Calibration file not found: {cal_file}")
        sys.exit(1)
    with open(cal_file) as f:
        start_cal = json.load(f)

    # Check for end-of-batch calibration
    end_cal = {}
    for state in ["00", "10", "01", "11"]:
        key = f"cal_end_{state}"
        if key in all_counts:
            end_cal[state] = all_counts[key]

    # Analyze with start calibration
    print("\n--- Analysis with start-of-batch calibration ---")
    results, M, cond = analyze(all_counts, distances, start_cal)
    print_report(results, cond)

    # Check calibration drift if end-cal available
    if len(end_cal) == 4:
        M_end = build_confusion_matrix(end_cal)
        drift = np.max(np.abs(M_end - M))
        print(f"\nCalibration drift (start → end): max ΔM = {drift:.4f}")
        if drift > 0.01:
            print("WARNING: Significant calibration drift detected!")
            print("Consider averaging start/end calibration or using per-rep cal.")
        else:
            print("Calibration stable throughout batch.")

    # Save
    save_results(results, M, cond, "verification run jobs 429925-429928", distances)
