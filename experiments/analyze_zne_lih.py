#!/usr/bin/env python3
"""Analyze ZNE LiH 4-qubit VQE results from Tuna-9.

Workflow:
  1. Load fold=1 counts from existing LiH run
  2. Fetch fold=3, fold=5 counts from ZNE jobs
  3. Build 16x16 confusion matrix from calibration data
  4. Apply REM at each fold factor
  5. Richardson extrapolation to zero-noise limit
  6. Mitigation ladder: raw → REM → REM+ZNE(linear) → REM+ZNE(quadratic)

Usage:
  python analyze_zne_lih.py          # fetch + analyze
  python analyze_zne_lih.py --check  # just check job status
  python analyze_zne_lih.py --no-fetch  # use cached counts
"""

import json
import sys
import numpy as np
from pathlib import Path
from datetime import datetime, timezone

RESULTS_DIR = Path("experiments/results")
ZNE_JOB_IDS = RESULTS_DIR / "zne-lih-job-ids.json"
FOLD1_COUNTS = RESULTS_DIR / "lih-4qubit-tuna9-counts.json"
ZNE_RAW_COUNTS = RESULTS_DIR / "zne-lih-raw-counts.json"
ANALYSIS_FILE = RESULTS_DIR / "zne-lih-analysis.json"

# Physical qubit map: logical -> physical
QMAP = {0: 2, 1: 4, 2: 6, 3: 8}
N_PHYSICAL = 9
FOLDS = [1, 3, 5]
N_REPS = 5

# Pauli terms and their coefficients (from lih-4qubit-tuna9-native.json)
PAULI_COEFFS = {
    "IIII": -7.509157199126883,
    "ZIII": 0.15592409137654908,
    "YZYI": 0.014015947443735908,
    "XZXI": 0.014015947443735908,
    "IZII": 0.15592409137654906,
    "IYZY": 0.014015947443735908,
    "IXZX": 0.014015947443735908,
    "IIZI": -0.01503982224040852,
    "IIIZ": -0.015039822240408528,
    "ZZII": 0.12182774168311085,
    "YIYI": 0.012144898067813291,
    "XIXI": 0.012144898067813291,
    "ZYZY": 0.012144898067813291,
    "ZXZX": 0.012144898067813291,
    "YXXY": 0.003265995895202011,
    "YYXX": -0.003265995895202011,
    "XXYY": -0.003265995895202011,
    "XYYX": 0.003265995895202011,
    "ZIZI": 0.05263651530244965,
    "ZIIZ": 0.05590251119765166,
    "YZYZ": -0.0018710430187559995,
    "XZXZ": -0.0018710430187559995,
    "IZZI": 0.05590251119765166,
    "IYIY": -0.0018710430187559995,
    "IXIX": -0.0018710430187559995,
    "IZIZ": 0.05263651530244965,
    "IIZZ": 0.08447056786924143,
}

# Which Pauli terms are measured by each circuit
CIRCUIT_TERM_MAP = {
    "Z": ["IIII", "ZIII", "IZII", "IIZI", "IIIZ", "ZZII", "ZIZI", "ZIIZ", "IZZI", "IZIZ", "IIZZ"],
    "q0Y_q2Y": ["YZYI", "YIYI", "YZYZ"],
    "q0X_q2X": ["XZXI", "XIXI", "XZXZ"],
    "q1Y_q3Y": ["IYZY", "ZYZY", "IYIY"],
    "q1X_q3X": ["IXZX", "ZXZX", "IXIX"],
    "q0Y_q1X_q2X_q3Y": ["YXXY"],
    "q0Y_q1Y_q2X_q3X": ["YYXX"],
    "q0X_q1X_q2Y_q3Y": ["XXYY"],
    "q0X_q1Y_q2Y_q3X": ["XYYX"],
}

E_CASCI = -7.862128833438587


def extract_4q_probs(counts_9bit):
    """Extract 4-qubit probabilities for q2,q4,q6,q8 from 9-bit counts."""
    probs = {}
    total = 0
    for bs, count in counts_9bit.items():
        # MSB-first: position = (N_PHYSICAL - 1) - qubit_index
        q0_val = bs[N_PHYSICAL - 1 - QMAP[0]]  # q2 -> pos 6
        q1_val = bs[N_PHYSICAL - 1 - QMAP[1]]  # q4 -> pos 4
        q2_val = bs[N_PHYSICAL - 1 - QMAP[2]]  # q6 -> pos 2
        q3_val = bs[N_PHYSICAL - 1 - QMAP[3]]  # q8 -> pos 0
        key = f"{q0_val}{q1_val}{q2_val}{q3_val}"
        probs[key] = probs.get(key, 0) + count
        total += count
    return {k: v / total for k, v in probs.items()}, total


def build_confusion_matrix(cal_counts):
    """Build 16x16 confusion matrix from 16 calibration states.

    States ordered as: 0000, 0001, 0010, ..., 1111 (binary counting).
    """
    n_states = 16
    states = [f"{i:04b}" for i in range(n_states)]
    M = np.zeros((n_states, n_states))

    for j, prep_state in enumerate(states):
        cal_key = f"cal_{prep_state}"
        if cal_key not in cal_counts:
            raise ValueError(f"Missing calibration: {cal_key}")
        probs, _ = extract_4q_probs(cal_counts[cal_key])
        for i, meas_state in enumerate(states):
            M[i, j] = probs.get(meas_state, 0.0)

    return M


def apply_rem(probs_dict, M_inv):
    """Apply REM: corrected = M_inv @ raw_probs (16-state), clipped and renormalized."""
    states = [f"{i:04b}" for i in range(16)]
    raw_vec = np.array([probs_dict.get(s, 0.0) for s in states])
    corrected = M_inv @ raw_vec
    corrected = np.maximum(corrected, 0)
    corrected /= corrected.sum()
    return {s: float(corrected[i]) for i, s in enumerate(states)}


def pauli_expval(probs, pauli_str):
    """Compute expectation value of a Pauli string from measurement probs.

    pauli_str like "ZIZI" — 4 chars, qubit 0 is leftmost.
    Measurement is in the rotated basis, so all operators act as Z/I.
    For the measurement circuit, X/Y qubits have been rotated to Z basis.
    """
    # Map the Pauli string to an effective Z-only string
    # In the measurement basis, the non-I operators become Z
    expval = 0.0
    for bitstring, prob in probs.items():
        sign = 1
        for q in range(4):
            op = pauli_str[q]
            if op in ('Z', 'X', 'Y'):
                bit = int(bitstring[q])
                sign *= (-1) ** bit
            # I and identity-like: sign unchanged
        expval += sign * prob
    return expval


def compute_energy_from_circuit_probs(circuit_probs):
    """Compute LiH energy from all 9 measurement circuit probabilities.

    circuit_probs: dict mapping circuit name -> 4-qubit probability dict
    """
    energy = 0.0

    for circuit_name, terms in CIRCUIT_TERM_MAP.items():
        if circuit_name not in circuit_probs:
            raise ValueError(f"Missing circuit: {circuit_name}")
        probs = circuit_probs[circuit_name]

        for pauli_str in terms:
            coeff = PAULI_COEFFS[pauli_str]
            # For IIII, expval is always 1
            if pauli_str == "IIII":
                energy += coeff
                continue

            # Determine the effective measurement operators
            # In the measurement basis for this circuit, the relevant
            # qubits have been rotated so X/Y -> Z
            ev = pauli_expval(probs, pauli_str)
            energy += coeff * ev

    return energy


def fetch_zne_results(job_data):
    """Fetch fold=3 and fold=5 results from QI."""
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

        if (n_done + n_pending + n_fail) % 15 == 0:
            print(f"  Fetched {n_done}, pending {n_pending}, failed {n_fail}")

    print(f"Total: {n_done} done, {n_pending} pending, {n_fail} failed")
    return counts, n_pending


def check_status(job_data):
    """Check ZNE job completion status."""
    from quantuminspire.util.api.remote_backend import RemoteBackend
    backend = RemoteBackend()

    job_ids = job_data["job_ids"]
    items = list(job_ids.items())
    # Sample across the batch
    sample = items[:3] + items[len(items)//2-1:len(items)//2+2] + items[-3:]

    statuses = {"COMPLETED": 0, "RUNNING": 0, "PLANNED": 0, "FAILED": 0, "OTHER": 0}
    for name, job_id in sample:
        if isinstance(job_id, str) and job_id.startswith("FAILED"):
            statuses["FAILED"] += 1
            continue
        try:
            job = backend.get_job(int(job_id))
            status = str(getattr(job, "status", ""))
            for s in ["COMPLETED", "RUNNING", "PLANNED", "FAILED"]:
                if s in status:
                    statuses[s] += 1
                    break
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


def analyze(fold1_counts, zne_counts):
    """Full ZNE analysis with REM for LiH."""

    # Build confusion matrix from fold=1 calibration (start cal)
    M = build_confusion_matrix(fold1_counts)
    cond = np.linalg.cond(M)
    M_inv = np.linalg.inv(M)
    print(f"Confusion matrix condition number: {cond:.3f}")

    # Check end-cal drift
    end_cal_counts = {f"cal_{s}": fold1_counts[f"end_cal_{s}"]
                      for s in [f"{i:04b}" for i in range(16)]
                      if f"end_cal_{s}" in fold1_counts}
    if len(end_cal_counts) == 16:
        M_end = build_confusion_matrix(end_cal_counts)
        drift = np.max(np.abs(M - M_end))
        print(f"Cal drift (max element): {drift:.4f}")

    # Collect energies per fold per rep
    fold_energies_raw = {f: [] for f in FOLDS}
    fold_energies_rem = {f: [] for f in FOLDS}

    measurement_bases = list(CIRCUIT_TERM_MAP.keys())

    for fold in FOLDS:
        for rep in range(N_REPS):
            # Collect counts for all 9 circuits
            circuit_probs_raw = {}
            circuit_probs_rem = {}
            all_found = True

            for basis in measurement_bases:
                if fold == 1:
                    key = f"rep{rep}_{basis}"
                    source = fold1_counts
                else:
                    key = f"f{fold}_rep{rep}_{basis}"
                    source = zne_counts

                if key not in source:
                    print(f"  MISSING: {key}")
                    all_found = False
                    break

                probs, _ = extract_4q_probs(source[key])
                circuit_probs_raw[basis] = probs
                circuit_probs_rem[basis] = apply_rem(probs, M_inv)

            if not all_found:
                continue

            e_raw = compute_energy_from_circuit_probs(circuit_probs_raw)
            e_rem = compute_energy_from_circuit_probs(circuit_probs_rem)
            fold_energies_raw[fold].append(e_raw)
            fold_energies_rem[fold].append(e_rem)

    # Statistics
    print(f"\n{'='*70}")
    print(f"FOLD ENERGIES (target E_CASCI = {E_CASCI:.6f} Ha)")
    print(f"{'='*70}")

    fold_stats_raw = {}
    fold_stats_rem = {}
    for fold in FOLDS:
        if fold_energies_raw[fold]:
            arr = np.array(fold_energies_raw[fold])
            fold_stats_raw[fold] = {
                "mean": float(np.mean(arr)),
                "std": float(np.std(arr, ddof=1)),
                "error_mHa": float(abs(np.mean(arr) - E_CASCI) * 1000),
                "values": [float(x) for x in arr],
            }
            print(f"  fold={fold} raw:  {np.mean(arr):.6f} ± {np.std(arr, ddof=1):.4f} "
                  f"(error: {abs(np.mean(arr) - E_CASCI)*1000:.1f} mHa)")

        if fold_energies_rem[fold]:
            arr = np.array(fold_energies_rem[fold])
            fold_stats_rem[fold] = {
                "mean": float(np.mean(arr)),
                "std": float(np.std(arr, ddof=1)),
                "error_mHa": float(abs(np.mean(arr) - E_CASCI) * 1000),
                "values": [float(x) for x in arr],
            }
            print(f"  fold={fold} REM:  {np.mean(arr):.6f} ± {np.std(arr, ddof=1):.4f} "
                  f"(error: {abs(np.mean(arr) - E_CASCI)*1000:.1f} mHa)")

    # Richardson extrapolation (on REM energies)
    zne_results = {}

    if all(f in fold_stats_rem for f in [1, 3]):
        e1 = np.array(fold_stats_rem[1]["values"])
        e3 = np.array(fold_stats_rem[3]["values"])
        n = min(len(e1), len(e3))
        # Linear: E(0) = (3*E(1) - E(3)) / 2 = 1.5*E(1) - 0.5*E(3)
        linear = 1.5 * e1[:n] - 0.5 * e3[:n]
        zne_results["linear"] = {
            "mean": float(np.mean(linear)),
            "std": float(np.std(linear, ddof=1)),
            "error_mHa": float(abs(np.mean(linear) - E_CASCI) * 1000),
            "values": [float(x) for x in linear],
        }
        print(f"\n  REM+ZNE linear:    {np.mean(linear):.6f} ± {np.std(linear, ddof=1):.4f} "
              f"(error: {abs(np.mean(linear) - E_CASCI)*1000:.1f} mHa)")

    if all(f in fold_stats_rem for f in [1, 3, 5]):
        e1 = np.array(fold_stats_rem[1]["values"])
        e3 = np.array(fold_stats_rem[3]["values"])
        e5 = np.array(fold_stats_rem[5]["values"])
        n = min(len(e1), len(e3), len(e5))
        # Quadratic: E(0) = 1.875*E(1) - 1.25*E(3) + 0.375*E(5)
        quad = 1.875 * e1[:n] - 1.25 * e3[:n] + 0.375 * e5[:n]
        zne_results["quadratic"] = {
            "mean": float(np.mean(quad)),
            "std": float(np.std(quad, ddof=1)),
            "error_mHa": float(abs(np.mean(quad) - E_CASCI) * 1000),
            "values": [float(x) for x in quad],
        }
        print(f"  REM+ZNE quadratic: {np.mean(quad):.6f} ± {np.std(quad, ddof=1):.4f} "
              f"(error: {abs(np.mean(quad) - E_CASCI)*1000:.1f} mHa)")

    # Mitigation ladder summary
    print(f"\n{'='*70}")
    print("MITIGATION LADDER")
    print(f"{'='*70}")
    ladder = []
    if 1 in fold_stats_raw:
        err = fold_stats_raw[1]["error_mHa"]
        ca = "YES" if err <= 1.6 else "NO"
        print(f"  Raw:               {err:6.1f} mHa  [{ca}]")
        ladder.append(("raw", err))
    if 1 in fold_stats_rem:
        err = fold_stats_rem[1]["error_mHa"]
        ca = "YES" if err <= 1.6 else "NO"
        print(f"  REM only:          {err:6.1f} mHa  [{ca}]")
        ladder.append(("rem", err))
    if "linear" in zne_results:
        err = zne_results["linear"]["error_mHa"]
        ca = "YES" if err <= 1.6 else "NO"
        print(f"  REM+ZNE linear:    {err:6.1f} mHa  [{ca}]")
        ladder.append(("zne_linear", err))
    if "quadratic" in zne_results:
        err = zne_results["quadratic"]["error_mHa"]
        ca = "YES" if err <= 1.6 else "NO"
        print(f"  REM+ZNE quadratic: {err:6.1f} mHa  [{ca}]")
        ladder.append(("zne_quadratic", err))

    # Save analysis
    analysis = {
        "experiment": "LiH 4-qubit ZNE (REM+ZNE stacked)",
        "completed": datetime.now(timezone.utc).isoformat(),
        "backend": "Tuna-9",
        "molecule": "LiH",
        "R_angstrom": 1.6,
        "E_CASCI": E_CASCI,
        "physical_qubits": QMAP,
        "n_reps": N_REPS,
        "fold_factors": FOLDS,
        "calibration": {
            "condition_number": float(cond),
        },
        "fold_stats_raw": {str(k): v for k, v in fold_stats_raw.items()},
        "fold_stats_rem": {str(k): v for k, v in fold_stats_rem.items()},
        "zne": zne_results,
        "mitigation_ladder": {name: err for name, err in ladder},
    }

    with open(ANALYSIS_FILE, "w") as f:
        json.dump(analysis, f, indent=2)
    print(f"\nAnalysis saved to: {ANALYSIS_FILE}")

    return analysis


def main():
    if not ZNE_JOB_IDS.exists():
        print(f"No ZNE job IDs: {ZNE_JOB_IDS}")
        sys.exit(1)

    with open(ZNE_JOB_IDS) as f:
        job_data = json.load(f)

    print(f"ZNE experiment: {job_data['n_submitted']} circuits (fold={job_data['fold_factors']})")

    if "--check" in sys.argv:
        check_status(job_data)
        return

    # Load fold=1 data (always needed)
    if not FOLD1_COUNTS.exists():
        print(f"No fold=1 counts: {FOLD1_COUNTS}")
        sys.exit(1)
    with open(FOLD1_COUNTS) as f:
        fold1_counts = json.load(f)
    print(f"Loaded fold=1: {len(fold1_counts)} circuits")

    # Load or fetch fold=3,5 data
    if "--no-fetch" in sys.argv:
        if not ZNE_RAW_COUNTS.exists():
            print(f"No cached ZNE counts: {ZNE_RAW_COUNTS}")
            sys.exit(1)
        with open(ZNE_RAW_COUNTS) as f:
            zne_counts = json.load(f)
        print(f"Loaded cached ZNE: {len(zne_counts)} circuits")
    else:
        print("Fetching ZNE results from QI...")
        zne_counts, n_pending = fetch_zne_results(job_data)
        if n_pending > 0:
            print(f"\n{n_pending} jobs still pending. Run --check to monitor.")
            sys.exit(1)
        with open(ZNE_RAW_COUNTS, "w") as f:
            json.dump(zne_counts, f)
        print(f"Cached {len(zne_counts)} ZNE results to {ZNE_RAW_COUNTS}")

    analyze(fold1_counts, zne_counts)


if __name__ == "__main__":
    main()
