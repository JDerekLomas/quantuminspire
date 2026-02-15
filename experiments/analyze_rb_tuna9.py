#!/usr/bin/env python3
"""Analyze single-qubit RB results from Tuna-9.

Fits A*p^m + B to extract:
  - EPC (error per Clifford) = (1 - p) * (d-1)/d, where d=2 for single-qubit
  - Average gate fidelity F = 1 - EPC

Usage:
  python analyze_rb_tuna9.py          # fetch + analyze
  python analyze_rb_tuna9.py --check  # just check job status
  python analyze_rb_tuna9.py --no-fetch  # use cached counts
"""

import json
import sys
import numpy as np
from scipy.optimize import curve_fit
from pathlib import Path
from datetime import datetime, timezone

RESULTS_DIR = Path("experiments/results")
JOB_IDS_FILE = RESULTS_DIR / "rb-tuna9-job-ids.json"
RAW_COUNTS_FILE = RESULTS_DIR / "rb-tuna9-raw-counts.json"
ANALYSIS_FILE = RESULTS_DIR / "rb-tuna9-analysis.json"

TOTAL_QUBITS = 9


def rb_model(m, A, p, B):
    """Standard RB decay model."""
    return A * p**m + B


def compute_survival(counts, qubit, n_total=9):
    """Compute survival probability (fraction measuring |0⟩) for a qubit."""
    total = 0
    n_zero = 0
    for bs, count in counts.items():
        bs_pos = n_total - 1 - qubit  # MSB-first
        bit_val = bs[bs_pos] if bs_pos < len(bs) else '0'
        if bit_val == '0':
            n_zero += count
        total += count
    return n_zero / total if total > 0 else 0.0


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
            print(f"  Error: {name} (job {job_id}): {e}")

        if (n_done + n_pending + n_fail) % 50 == 0:
            print(f"  Fetched {n_done}, pending {n_pending}, failed {n_fail}")

    print(f"Total: {n_done} done, {n_pending} pending, {n_fail} failed")
    return counts, n_pending


def check_status(job_data):
    """Quick status check."""
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
    """Full RB analysis: fit decay, extract gate fidelities."""
    seq_lengths = job_data["seq_lengths"]
    n_seeds = job_data["n_seeds"]

    results_per_qubit = {}

    print(f"\n{'='*65}")
    print(f"  RANDOMIZED BENCHMARKING — TUNA-9 (ALL QUBITS)")
    print(f"{'='*65}")
    print(f"  {'Qubit':>5} | {'EPC':>8} | {'Fidelity':>10} | {'p':>8} | {'A':>6} | {'B':>6}")
    print(f"  {'─'*5:>5} | {'─'*8:>8} | {'─'*10:>10} | {'─'*8:>8} | {'─'*6:>6} | {'─'*6:>6}")

    for qubit in range(TOTAL_QUBITS):
        # Collect survival probabilities per sequence length
        data = {}  # m -> list of survivals
        for m in seq_lengths:
            survivals = []
            for seed in range(n_seeds):
                key = f"rb_q{qubit}_m{m}_s{seed}"
                if key in counts:
                    surv = compute_survival(counts[key], qubit)
                    survivals.append(surv)
            if survivals:
                data[m] = survivals

        if not data:
            print(f"  q{qubit:>4} | {'N/A':>8} | {'N/A':>10} | no data")
            continue

        # Prepare arrays for fitting
        ms = []
        means = []
        stds = []
        raw_data = {}
        for m in sorted(data.keys()):
            ms.append(m)
            means.append(np.mean(data[m]))
            stds.append(np.std(data[m], ddof=1) if len(data[m]) > 1 else 0)
            raw_data[str(m)] = {
                "mean": float(np.mean(data[m])),
                "std": float(np.std(data[m], ddof=1) if len(data[m]) > 1 else 0),
                "values": [float(x) for x in data[m]],
            }

        ms = np.array(ms)
        means = np.array(means)

        # Fit A*p^m + B
        try:
            popt, pcov = curve_fit(
                rb_model, ms, means,
                p0=[0.5, 0.99, 0.5],
                bounds=([0, 0, 0], [1, 1, 1]),
                maxfev=10000
            )
            A_fit, p_fit, B_fit = popt
            perr = np.sqrt(np.diag(pcov))

            # Error per Clifford: EPC = (1-p)(d-1)/d, d=2 for single qubit
            epc = (1 - p_fit) / 2
            fidelity = 1 - epc

            print(f"  q{qubit:>4} | {epc:>8.4f} | {fidelity:>10.6f} | {p_fit:>8.5f} | {A_fit:>6.3f} | {B_fit:>6.3f}")

            results_per_qubit[f"q{qubit}"] = {
                "qubit": qubit,
                "depolarizing_parameter_p": float(p_fit),
                "error_per_clifford": float(epc),
                "average_gate_fidelity": float(fidelity),
                "fit_A": float(A_fit),
                "fit_B": float(B_fit),
                "fit_uncertainties": {
                    "A": float(perr[0]),
                    "p": float(perr[1]),
                    "B": float(perr[2]),
                },
                "sequence_data": raw_data,
            }

        except Exception as e:
            print(f"  q{qubit:>4} | FIT FAIL: {e}")
            results_per_qubit[f"q{qubit}"] = {
                "qubit": qubit,
                "fit_error": str(e),
                "sequence_data": raw_data,
            }

    # Summary
    print(f"\n{'─'*65}")
    fidelities = [(k, v["average_gate_fidelity"])
                  for k, v in results_per_qubit.items()
                  if "average_gate_fidelity" in v]
    if fidelities:
        fidelities.sort(key=lambda x: -x[1])
        print(f"  Best:  {fidelities[0][0]} — {fidelities[0][1]:.6f}")
        print(f"  Worst: {fidelities[-1][0]} — {fidelities[-1][1]:.6f}")
        avg_f = np.mean([f for _, f in fidelities])
        print(f"  Mean:  {avg_f:.6f}")

    analysis = {
        "experiment": "Single-qubit RB on all Tuna-9 qubits",
        "completed": datetime.now(timezone.utc).isoformat(),
        "backend": "Tuna-9",
        "n_qubits": TOTAL_QUBITS,
        "n_shots": job_data["n_shots"],
        "seq_lengths": job_data["seq_lengths"],
        "n_seeds": job_data["n_seeds"],
        "results": results_per_qubit,
    }

    with open(ANALYSIS_FILE, "w") as f:
        json.dump(analysis, f, indent=2)
    print(f"\nAnalysis saved to: {ANALYSIS_FILE}")

    return analysis


def main():
    if not JOB_IDS_FILE.exists():
        print(f"No job IDs: {JOB_IDS_FILE}")
        sys.exit(1)

    with open(JOB_IDS_FILE) as f:
        job_data = json.load(f)

    print(f"RB: {job_data['n_submitted']} circuits submitted")

    if "--check" in sys.argv:
        check_status(job_data)
        return

    if "--no-fetch" in sys.argv:
        if not RAW_COUNTS_FILE.exists():
            print(f"No cached counts: {RAW_COUNTS_FILE}")
            sys.exit(1)
        with open(RAW_COUNTS_FILE) as f:
            counts = json.load(f)
    else:
        print("Fetching results...")
        counts, n_pending = fetch_results(job_data)
        if n_pending > 0:
            print(f"\n{n_pending} jobs still pending.")
            sys.exit(1)
        with open(RAW_COUNTS_FILE, "w") as f:
            json.dump(counts, f)
        print(f"Cached {len(counts)} results to {RAW_COUNTS_FILE}")

    analyze(counts, job_data)


if __name__ == "__main__":
    main()
