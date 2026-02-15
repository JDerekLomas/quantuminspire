#!/usr/bin/env python3
"""Analyze QV=16 hardware results from Tuna-9.

Follows Cross et al. 2019 protocol:
  1. Run 100+ random QV circuits on hardware
  2. For each circuit, compute heavy output fraction (HOF)
  3. QV=2^n certified if mean HOF > 2/3 with 2-sigma confidence

Usage:
  python analyze_qv16_hardware.py          # fetch + analyze
  python analyze_qv16_hardware.py --check  # just check job status
  python analyze_qv16_hardware.py --no-fetch  # use cached counts
"""

import json
import sys
import numpy as np
from pathlib import Path
from datetime import datetime, timezone

RESULTS_DIR = Path("experiments/results")
JOB_IDS_FILE = RESULTS_DIR / "qv16-tuna9-hardware-job-ids.json"
RAW_COUNTS_FILE = RESULTS_DIR / "qv16-tuna9-hardware-counts.json"
ANALYSIS_FILE = RESULTS_DIR / "qv16-tuna9-hardware-analysis.json"

NUM_QUBITS = 4
PHYS_QUBITS = [4, 6, 7, 8]


def hardware_bs_to_logical(bitstring):
    """Convert 9-bit MSB-first hardware bitstring to 4-bit logical bitstring.

    Hardware: bs[i] = qubit (8-i) in MSB-first
    Physical qubits [4,6,7,8] → logical [0,1,2,3]
    Logical output: MSB-first, bs[j] = logical qubit (3-j)
    """
    phys_to_logical = {4: 0, 6: 1, 7: 2, 8: 3}
    logical_bits = ['0'] * NUM_QUBITS
    for phys_idx, log_idx in phys_to_logical.items():
        bs_pos = 8 - phys_idx  # MSB-first position in 9-bit string
        qubit_val = bitstring[bs_pos]
        logical_bits[NUM_QUBITS - 1 - log_idx] = qubit_val
    return ''.join(logical_bits)


def compute_hof(counts, heavy_set):
    """Compute heavy output fraction from hardware counts."""
    total = 0
    heavy_count = 0
    for bitstring, count in counts.items():
        # Handle both 9-bit (hardware) and 4-bit (bit register) formats
        if len(bitstring) == 9:
            logical_bs = hardware_bs_to_logical(bitstring)
        elif len(bitstring) == 4:
            logical_bs = bitstring
        else:
            # Try to parse as integer
            logical_bs = format(int(bitstring), f'0{NUM_QUBITS}b')

        total += count
        if logical_bs in heavy_set:
            heavy_count += count

    return heavy_count / total if total > 0 else 0.0


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

        if (n_done + n_pending + n_fail) % 20 == 0:
            print(f"  Fetched {n_done}, pending {n_pending}, failed {n_fail}")

    print(f"Total: {n_done} done, {n_pending} pending, {n_fail} failed")
    return counts, n_pending


def check_status(job_data):
    """Quick status check on sample of jobs."""
    from quantuminspire.util.api.remote_backend import RemoteBackend
    backend = RemoteBackend()

    items = list(job_data["job_ids"].items())
    sample = items[:3] + items[len(items)//2:len(items)//2+3] + items[-3:]

    done = 0
    pending = 0
    for name, job_id in sample:
        if isinstance(job_id, str) and job_id.startswith("FAILED"):
            continue
        try:
            job = backend.get_job(int(job_id))
            status = str(getattr(job, "status", ""))
            if "COMPLETED" in status:
                done += 1
            else:
                pending += 1
        except:
            pending += 1

    print(f"Sample ({len(sample)} jobs): {done} done, {pending} pending")
    return pending == 0


def analyze(counts, job_data):
    """QV analysis following Cross et al. 2019."""
    ideal_data = job_data["ideal_data"]

    hof_values = []
    per_circuit = []

    for circ_name in sorted(ideal_data.keys()):
        if circ_name not in counts:
            continue

        heavy_set = set(ideal_data[circ_name]["heavy_bitstrings"])
        ideal_hof = ideal_data[circ_name]["ideal_heavy_output_fraction"]

        hof = compute_hof(counts[circ_name], heavy_set)
        passed = hof > 2/3
        hof_values.append(hof)

        per_circuit.append({
            "circuit": circ_name,
            "heavy_output_fraction": hof,
            "ideal_heavy_output_fraction": ideal_hof,
            "passed": passed,
        })

    if not hof_values:
        print("No results to analyze!")
        return

    hof_arr = np.array(hof_values)
    mean_hof = float(np.mean(hof_arr))
    std_err = float(np.std(hof_arr) / np.sqrt(len(hof_arr)))
    ci_lower = mean_hof - 2 * std_err
    qv_passed = ci_lower > 2/3

    n_passed = sum(1 for h in hof_values if h > 2/3)

    print(f"\n{'='*60}")
    print(f"  QUANTUM VOLUME 16 — TUNA-9 HARDWARE RESULTS")
    print(f"{'='*60}")
    print(f"  Circuits analyzed: {len(hof_values)}")
    print(f"  Mean HOF:          {mean_hof:.4f}")
    print(f"  Std error:         {std_err:.4f}")
    print(f"  2-sigma lower:     {ci_lower:.4f}")
    print(f"  Threshold:         {2/3:.4f}")
    print(f"  QV=16 certified:   {'YES' if qv_passed else 'NO'}")
    print(f"  Per-circuit > 2/3: {n_passed}/{len(hof_values)}")
    print(f"  HOF range:         [{min(hof_values):.4f}, {max(hof_values):.4f}]")

    # Histogram of HOF values
    bins = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.667, 0.7, 0.8, 0.9, 1.0]
    hist, _ = np.histogram(hof_values, bins=bins)
    print(f"\n  HOF distribution:")
    for i in range(len(bins)-1):
        bar = '#' * int(hist[i])
        marker = " <-- threshold" if bins[i+1] == 0.667 else ""
        print(f"    [{bins[i]:.3f}-{bins[i+1]:.3f}): {hist[i]:3d} {bar}{marker}")

    analysis = {
        "experiment": "QV=16 Tuna-9 hardware",
        "completed": datetime.now(timezone.utc).isoformat(),
        "backend": "Tuna-9",
        "physical_qubits": PHYS_QUBITS,
        "n_circuits": len(hof_values),
        "n_shots": job_data["n_shots"],
        "seed": job_data["seed"],
        "analysis": {
            "quantum_volume": 16 if qv_passed else "< 16",
            "mean_heavy_output_fraction": mean_hof,
            "std_error": std_err,
            "ci_lower_2sigma": ci_lower,
            "threshold": 2/3,
            "passed": qv_passed,
            "n_circuits_passed": n_passed,
            "hof_min": float(min(hof_values)),
            "hof_max": float(max(hof_values)),
            "hof_median": float(np.median(hof_values)),
        },
        "per_circuit": per_circuit,
    }

    with open(ANALYSIS_FILE, "w") as f:
        json.dump(analysis, f, indent=2)
    print(f"\nAnalysis saved to: {ANALYSIS_FILE}")

    return analysis


def main():
    if not JOB_IDS_FILE.exists():
        print(f"No job IDs file: {JOB_IDS_FILE}")
        print("Run submit_qv16_hardware.py first.")
        sys.exit(1)

    with open(JOB_IDS_FILE) as f:
        job_data = json.load(f)

    print(f"QV=16: {job_data['n_submitted']} circuits submitted")

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
