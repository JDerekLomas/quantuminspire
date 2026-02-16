#!/usr/bin/env python3
"""Fetch LiH VQE results from Tuna-9 and run analysis."""

import json
import time
import sys
from pathlib import Path

RESULTS_DIR = Path(__file__).parent / "results"


def fetch_results():
    """Poll QI for all LiH job results."""
    from quantuminspire.util.api.remote_backend import RemoteBackend

    with open(RESULTS_DIR / "lih-4qubit-tuna9-jobids.json") as f:
        data = json.load(f)

    job_ids = data["job_ids"]
    backend = RemoteBackend()

    all_counts = {}
    pending = set()
    failed = set()

    for name, job_id in job_ids.items():
        if isinstance(job_id, str):
            failed.add(name)
            continue
        pending.add(name)

    print(f"Fetching {len(pending)} jobs...")

    max_retries = 60
    for attempt in range(max_retries):
        still_pending = set()
        for name in list(pending):
            job_id = job_ids[name]
            try:
                result = backend.get_results(job_id)
                if result is not None:
                    if hasattr(result, 'results') and result.results:
                        all_counts[name] = result.results
                    elif isinstance(result, dict):
                        all_counts[name] = result
                    else:
                        still_pending.add(name)
                        continue
                else:
                    still_pending.add(name)
                    continue
            except Exception as e:
                err = str(e)
                if "not yet completed" in err.lower() or "pending" in err.lower():
                    still_pending.add(name)
                else:
                    print(f"  ERROR fetching {name} (job {job_id}): {e}")
                    failed.add(name)

        pending = still_pending
        done = len(all_counts)
        print(f"  [{attempt+1}/{max_retries}] Done: {done}, pending: {len(pending)}, failed: {len(failed)}")

        if not pending:
            break
        time.sleep(30)

    print(f"\nTotal: {len(all_counts)} done, {len(pending)} pending, {len(failed)} failed")

    # Save raw counts
    outfile = RESULTS_DIR / "lih-4qubit-tuna9-counts.json"
    with open(outfile, "w") as f:
        json.dump(all_counts, f, indent=2)
    print(f"Saved: {outfile}")

    return all_counts


def analyze(all_counts=None):
    """Run energy analysis on fetched results."""
    if all_counts is None:
        with open(RESULTS_DIR / "lih-4qubit-tuna9-counts.json") as f:
            all_counts = json.load(f)

    # Import analysis functions from lih_tuna9_vqe
    sys.path.insert(0, str(Path(__file__).parent))
    from lih_tuna9_vqe import compute_energy, apply_rem, QMAP, N_PHYSICAL

    with open(RESULTS_DIR / "lih-4qubit-tuna9-native.json") as f:
        data = json.load(f)

    pauli_terms = data["pauli_terms"]
    circuit_term_map = data["circuit_term_map"]
    E_CASCI = data["E_CASCI"]
    E_HF = data["E_HF"]
    E_FCI = data["E_FCI"]

    import numpy as np

    print("=" * 60)
    print("  LiH 4-qubit VQE — Tuna-9 Results")
    print("=" * 60)

    # Extract calibration counts
    cal_counts = {k: v for k, v in all_counts.items()
                  if k.startswith("cal_") and not k.startswith("end_cal_")}
    end_cal_counts = {k.replace("end_", ""): v for k, v in all_counts.items()
                      if k.startswith("end_cal_")}

    print(f"\n  Cal circuits (start): {len(cal_counts)}")
    print(f"  Cal circuits (end): {len(end_cal_counts)}")

    # Per-rep analysis
    n_reps = 5
    rep_energies_raw = []
    rep_energies_rem = []

    for rep in range(n_reps):
        rep_counts = {}
        for name in data["circuits"]:
            key = f"rep{rep}_{name}"
            if key in all_counts:
                rep_counts[name] = all_counts[key]

        if len(rep_counts) < len(data["circuits"]):
            missing = len(data["circuits"]) - len(rep_counts)
            print(f"  Rep {rep}: {missing} circuits missing, skipping")
            continue

        # Raw energy
        E_raw = compute_energy(rep_counts, circuit_term_map, pauli_terms)
        err_raw = abs(E_raw - E_CASCI) * 1000
        rep_energies_raw.append(E_raw)

        # REM energy
        E_rem = apply_rem(rep_counts, cal_counts, circuit_term_map, pauli_terms)
        err_rem = abs(E_rem - E_CASCI) * 1000
        rep_energies_rem.append(E_rem)

        print(f"  Rep {rep}: raw={E_raw:.6f} ({err_raw:.1f} mHa), "
              f"REM={E_rem:.6f} ({err_rem:.1f} mHa)")

    if not rep_energies_raw:
        print("  No complete reps found!")
        return

    raw_arr = np.array(rep_energies_raw)
    rem_arr = np.array(rep_energies_rem)

    raw_mean = np.mean(raw_arr)
    raw_std = np.std(raw_arr)
    rem_mean = np.mean(rem_arr)
    rem_std = np.std(rem_arr)

    raw_err = abs(raw_mean - E_CASCI) * 1000
    rem_err = abs(rem_mean - E_CASCI) * 1000

    print(f"\n{'=' * 60}")
    print(f"  SUMMARY ({len(rep_energies_raw)} reps)")
    print(f"{'=' * 60}")
    print(f"  Target (CASCI):  {E_CASCI:.6f} Ha")
    print(f"  Raw:  {raw_mean:.6f} ± {raw_std*1000:.1f} mHa  (error: {raw_err:.1f} mHa)")
    print(f"  REM:  {rem_mean:.6f} ± {rem_std*1000:.1f} mHa  (error: {rem_err:.1f} mHa)")
    print(f"  Chemical accuracy (REM): {'YES' if rem_err < 1.6 else 'NO'}")
    print(f"  Best rep (REM): {min(abs(rem_arr - E_CASCI))*1000:.1f} mHa")

    # Save analysis
    analysis = {
        "experiment": "LiH 4-qubit VQE on Tuna-9",
        "molecule": "LiH",
        "R_angstrom": 1.6,
        "active_space": "CASCI(2,2)",
        "E_CASCI": E_CASCI,
        "E_HF": E_HF,
        "E_FCI": E_FCI,
        "n_reps": len(rep_energies_raw),
        "n_measurement_circuits": len(data["circuits"]),
        "n_pauli_terms": len(pauli_terms),
        "qubit_map": QMAP,
        "raw": {
            "energies": [float(e) for e in rep_energies_raw],
            "mean": float(raw_mean),
            "std": float(raw_std),
            "error_mHa": float(raw_err),
        },
        "rem": {
            "energies": [float(e) for e in rep_energies_rem],
            "mean": float(rem_mean),
            "std": float(rem_std),
            "error_mHa": float(rem_err),
            "chemical_accuracy": bool(rem_err < 1.6),
        },
    }
    outfile = RESULTS_DIR / "lih-4qubit-tuna9-analysis.json"
    with open(outfile, "w") as f:
        json.dump(analysis, f, indent=2)
    print(f"\n  Analysis saved: {outfile}")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "fetch"

    if mode == "fetch":
        counts = fetch_results()
        if counts:
            analyze(counts)
    elif mode == "analyze":
        analyze()
    else:
        print(f"Usage: {sys.argv[0]} [fetch|analyze]")
