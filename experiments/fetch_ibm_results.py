#!/usr/bin/env python3
"""Fetch IBM Quantum job results and save as JSON for energy reconstruction.

Polls job status, waits for completion, extracts measurement counts.
Saves per-backend JSON files: h2-vqe-hardware-<backend>.json

Usage:
    .venv/bin/python experiments/fetch_ibm_results.py [--poll]
"""

import json
import sys
import time
from pathlib import Path

from qiskit_ibm_runtime import QiskitRuntimeService

# ── Job IDs ──────────────────────────────────────────────────────────────

BACKENDS = {
    "ibm_fez": {
        "Z": "d67rmt3e4kfs73d2baug",
        "q0Y_q1X_q2X_q3Y": "d67rmtre4kfs73d2bavg",
        "q0Y_q1Y_q2X_q3X": "d67rmutbujdc73d0bsf0",
        "q0X_q1X_q2Y_q3Y": "d67rmvlbujdc73d0bsg0",
        "q0X_q1Y_q2Y_q3X": "d67rn0gqbmes739fqcqg",
    },
    "ibm_torino": {
        "Z": "d67rcr9v6o8c73d5u1pg",
        "q0Y_q1X_q2X_q3Y": "d67rcroqbmes739fq0kg",
        "q0Y_q1Y_q2X_q3X": "d67rcsdbujdc73d0bgcg",
        "q0X_q1X_q2Y_q3Y": "d67rcthv6o8c73d5u1v0",
        "q0X_q1Y_q2Y_q3X": "d67rcube4kfs73d2auig",
    },
    "ibm_marrakesh": {
        "Z": "d67ri99v6o8c73d5u8u0",
        "q0Y_q1X_q2X_q3Y": "d67ria5bujdc73d0bn5g",
        "q0Y_q1Y_q2X_q3X": "d67rib1v6o8c73d5u910",
        "q0X_q1X_q2Y_q3Y": "d67ric1v6o8c73d5u92g",
        "q0X_q1Y_q2Y_q3X": "d67ricpv6o8c73d5u940",
    },
}

RESULTS_DIR = Path(__file__).parent / "results"


def fetch_backend(service, backend_name, job_ids, poll=False):
    """Fetch results for one backend. Returns dict of {circuit_name: counts}."""
    output_file = RESULTS_DIR / f"h2-vqe-hardware-{backend_name}.json"

    # Check if already fetched
    if output_file.exists():
        print(f"  [{backend_name}] Already fetched: {output_file}")
        with open(output_file) as f:
            return json.load(f)

    all_counts = {}
    all_done = True

    for circuit_name, job_id in job_ids.items():
        try:
            job = service.job(job_id)
        except Exception as e:
            print(f"  [{backend_name}] Error fetching job {job_id}: {e}")
            all_done = False
            continue

        status = str(job.status())
        if status == "DONE":
            result = job.result()
            # Extract counts from the first (only) pub result
            # Qiskit Runtime v2 returns SamplerResult
            try:
                # v2 Sampler format
                pub_result = result[0]
                counts = pub_result.data.c.get_counts()
            except (AttributeError, IndexError, KeyError):
                try:
                    # v1 format
                    counts = result.get_counts()
                except AttributeError:
                    # Try raw quasi-dist
                    counts = result.quasi_dists[0]

            # Ensure counts are {bitstring: int}
            counts = {str(k): int(v) for k, v in counts.items()}
            all_counts[circuit_name] = counts
            total = sum(counts.values())
            print(f"  [{backend_name}] {circuit_name}: DONE ({total} shots)")
        elif status in ("QUEUED", "VALIDATING", "RUNNING"):
            print(f"  [{backend_name}] {circuit_name}: {status}")
            all_done = False
        else:
            print(f"  [{backend_name}] {circuit_name}: {status} (unexpected)")
            all_done = False

    if all_done and len(all_counts) == len(job_ids):
        with open(output_file, "w") as f:
            json.dump(all_counts, f, indent=2)
        print(f"  [{backend_name}] Saved: {output_file}")
        return all_counts
    else:
        print(f"  [{backend_name}] Not all jobs complete ({len(all_counts)}/{len(job_ids)} done)")
        return None


def main():
    poll = "--poll" in sys.argv

    print("=" * 60)
    print("  Fetching IBM Quantum H2 VQE Results")
    print("=" * 60)

    service = QiskitRuntimeService(channel="ibm_cloud")

    results = {}
    for backend_name, job_ids in BACKENDS.items():
        print(f"\n  --- {backend_name} ---")
        r = fetch_backend(service, backend_name, job_ids, poll=poll)
        if r is not None:
            results[backend_name] = r

    if poll:
        max_wait = 3600  # 1 hour
        interval = 60  # check every minute
        elapsed = 0
        while len(results) < len(BACKENDS) and elapsed < max_wait:
            remaining = [b for b in BACKENDS if b not in results]
            print(f"\n  Waiting for: {remaining} ({elapsed}s elapsed)")
            time.sleep(interval)
            elapsed += interval
            for backend_name in remaining:
                r = fetch_backend(service, backend_name, BACKENDS[backend_name])
                if r is not None:
                    results[backend_name] = r

    n_done = len(results)
    n_total = len(BACKENDS)
    print(f"\n  Fetched {n_done}/{n_total} backends.")
    if n_done < n_total:
        print("  Re-run with --poll to wait, or re-run later.")
    else:
        print("  All backends done! Run h2_hardware_energy.py to compute energy.")


if __name__ == "__main__":
    main()
