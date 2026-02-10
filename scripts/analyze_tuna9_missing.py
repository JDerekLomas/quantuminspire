#!/usr/bin/env python3
"""Analyze Tuna-9 missing replication results: HeH+ on q[4,6] and H2 on q[6,8].

Applies 5 mitigation strategies using inline calibration data:
  1. Raw
  2. Post-selection (PS) - Z-parity filter
  3. REM only - confusion matrix inversion
  4. REM then PS
  5. PS then REM (hybrid - best on q[2,4])
"""

import json
import numpy as np
from pathlib import Path

RAW_FILE = Path(__file__).parent.parent / "experiments" / "results" / "tuna9-missing-raw.json"
PARAMS_FILE = Path(__file__).parent.parent / "experiments" / "queue" / "tuna9-missing-replications.json"
RESULTS_DIR = Path(__file__).parent.parent / "experiments" / "results"


def extract_qubit_bits(bitstring, qubits):
    """Extract bits for physical qubits. MSB-first: b[N-1]...b[0]."""
    result = ""
    for q in qubits:
        idx = -(q + 1)
        if abs(idx) <= len(bitstring):
            result += bitstring[idx]
        else:
            result += "0"
    return result


def to_2q_distribution(counts, qubits):
    """Collapse full-width counts to 2-qubit distribution."""
    dist = {}
    for bs, count in counts.items():
        bits = extract_qubit_bits(bs, qubits)
        dist[bits] = dist.get(bits, 0) + count
    return dist


def build_confusion_matrix(cal_00_counts, cal_11_counts, qubits):
    """Build per-qubit confusion matrices from calibration data.

    Returns M0, M1 (2x2 matrices) and their inverses.
    M[i][j] = P(measure i | prepared j)
    """
    # Extract 2q distributions
    d00 = to_2q_distribution(cal_00_counts, qubits)
    d11 = to_2q_distribution(cal_11_counts, qubits)

    total_00 = sum(d00.values())
    total_11 = sum(d11.values())

    # For qubit 0 (first in qubits list):
    # From |00>: q0 should be 0
    q0_meas0_prep0 = sum(c for bs, c in d00.items() if bs[0] == '0') / total_00
    q0_meas1_prep0 = sum(c for bs, c in d00.items() if bs[0] == '1') / total_00
    # From |11>: q0 should be 1
    q0_meas0_prep1 = sum(c for bs, c in d11.items() if bs[0] == '0') / total_11
    q0_meas1_prep1 = sum(c for bs, c in d11.items() if bs[0] == '1') / total_11

    # For qubit 1 (second in qubits list):
    q1_meas0_prep0 = sum(c for bs, c in d00.items() if bs[1] == '0') / total_00
    q1_meas1_prep0 = sum(c for bs, c in d00.items() if bs[1] == '0') / total_00  # BUG: should check bs[1]

    # Actually let me redo this more carefully
    # M[measured][prepared] for each qubit

    # Qubit 0 (qubits[0])
    M0 = np.array([
        [q0_meas0_prep0, q0_meas0_prep1],  # P(meas 0 | prep 0), P(meas 0 | prep 1)
        [q0_meas1_prep0, q0_meas1_prep1],  # P(meas 1 | prep 0), P(meas 1 | prep 1)
    ])

    # Qubit 1 (qubits[1])
    q1_m0_p0 = sum(c for bs, c in d00.items() if bs[1] == '0') / total_00
    q1_m1_p0 = sum(c for bs, c in d00.items() if bs[1] == '1') / total_00
    q1_m0_p1 = sum(c for bs, c in d11.items() if bs[1] == '0') / total_11
    q1_m1_p1 = sum(c for bs, c in d11.items() if bs[1] == '1') / total_11

    M1 = np.array([
        [q1_m0_p0, q1_m0_p1],
        [q1_m1_p0, q1_m1_p1],
    ])

    M0_inv = np.linalg.inv(M0)
    M1_inv = np.linalg.inv(M1)

    # Readout errors
    q0_err_0to1 = q0_meas1_prep0  # false positive
    q0_err_1to0 = q0_meas0_prep1  # false negative
    q1_err_0to1 = q1_m1_p0
    q1_err_1to0 = q1_m0_p1

    return {
        "M0": M0, "M1": M1, "M0_inv": M0_inv, "M1_inv": M1_inv,
        "errors": {
            f"q{qubits[0]}_0to1": round(q0_err_0to1, 4),
            f"q{qubits[0]}_1to0": round(q0_err_1to0, 4),
            f"q{qubits[0]}_total": round((q0_err_0to1 + q0_err_1to0) / 2, 4),
            f"q{qubits[1]}_0to1": round(q1_err_0to1, 4),
            f"q{qubits[1]}_1to0": round(q1_err_1to0, 4),
            f"q{qubits[1]}_total": round((q1_err_0to1 + q1_err_1to0) / 2, 4),
        }
    }


def apply_rem(dist_2q, M0_inv, M1_inv):
    """Apply REM via tensor-product confusion matrix inversion."""
    total = sum(dist_2q.values())
    if total == 0:
        return {}

    states = ["00", "01", "10", "11"]
    p_meas = np.array([dist_2q.get(s, 0) / total for s in states])

    M_full_inv = np.kron(M0_inv, M1_inv)
    p_corr = M_full_inv @ p_meas
    p_corr = np.maximum(p_corr, 0)
    s = p_corr.sum()
    if s > 0:
        p_corr /= s

    return {s: int(round(p_corr[i] * total)) for i, s in enumerate(states) if round(p_corr[i] * total) > 0}


def parity_filter(dist_2q, target_parity=1):
    """Keep only bitstrings with given parity (default odd=1 for VQE)."""
    return {bs: c for bs, c in dist_2q.items() if int(bs[0]) ^ int(bs[1]) == target_parity}


def expectations_2q(dist_2q):
    """Compute <Z0>, <Z1>, <Z0Z1> from 2-qubit distribution."""
    total = sum(dist_2q.values())
    if total == 0:
        return 0, 0, 0
    z0, z1, z0z1 = 0, 0, 0
    for bits, count in dist_2q.items():
        b0, b1 = int(bits[0]), int(bits[1])
        z0 += (1 - 2 * b0) * count
        z1 += (1 - 2 * b1) * count
        z0z1 += (1 - 2 * b0) * (1 - 2 * b1) * count
    return z0 / total, z1 / total, z0z1 / total


def x0x1_from_dist(dist_2q):
    """X0X1 expectation: +1 for same parity, -1 for different."""
    total = sum(dist_2q.values())
    if total == 0:
        return 0
    val = 0
    for bits, count in dist_2q.items():
        b0, b1 = int(bits[0]), int(bits[1])
        val += (1 - 2 * (b0 ^ b1)) * count
    return val / total


def energy(z0, z1, z0z1, x0x1, y0y1, g):
    """H = g0 + g1*Z0 + g2*Z1 + g3*Z0Z1 + g4*X0X1 + g5*Y0Y1"""
    return g["g0"] + g["g1"]*z0 + g["g2"]*z1 + g["g3"]*z0z1 + g["g4"]*x0x1 + g["g5"]*y0y1


def analyze_molecule(name, z_counts, x_counts, y_counts, qubits, coeffs, fci, cal):
    """Full 5-strategy analysis for one molecule."""
    M0_inv = cal["M0_inv"]
    M1_inv = cal["M1_inv"]

    # Collapse to 2-qubit distributions
    z_2q = to_2q_distribution(z_counts, qubits)
    x_2q = to_2q_distribution(x_counts, qubits)
    y_2q = to_2q_distribution(y_counts, qubits)

    total_z = sum(z_2q.values())
    total_x = sum(x_2q.values())
    total_y = sum(y_2q.values())

    print(f"\n{'='*70}")
    print(f"  {name} on q{qubits}")
    print(f"{'='*70}")
    print(f"  FCI = {fci:.6f} Ha")
    print(f"  Z-basis 2q dist: {dict(sorted(z_2q.items()))}")
    print(f"  X-basis 2q dist: {dict(sorted(x_2q.items()))}")
    print(f"  Y-basis 2q dist: {dict(sorted(y_2q.items()))}")
    print(f"  Readout errors: {cal['errors']}")

    results = {}

    # --- 1. Raw ---
    z0, z1, z0z1 = expectations_2q(z_2q)
    xx = x0x1_from_dist(x_2q)
    yy = x0x1_from_dist(y_2q)
    e_raw = energy(z0, z1, z0z1, xx, yy, coeffs)
    results["raw"] = {"energy": e_raw, "z0": z0, "z1": z1, "z0z1": z0z1, "xx": xx, "yy": yy}

    # --- 2. Post-selection only (Z-basis) ---
    z_ps = parity_filter(z_2q)
    z_ps_total = sum(z_ps.values())
    ps_keep = z_ps_total / total_z
    z0_ps, z1_ps, z0z1_ps = expectations_2q(z_ps)
    e_ps = energy(z0_ps, z1_ps, z0z1_ps, xx, yy, coeffs)
    results["ps"] = {"energy": e_ps, "keep": ps_keep, "z0": z0_ps, "z1": z1_ps}

    # --- 3. REM only (all bases) ---
    z_rem = apply_rem(z_2q, M0_inv, M1_inv)
    x_rem = apply_rem(x_2q, M0_inv, M1_inv)
    y_rem = apply_rem(y_2q, M0_inv, M1_inv)
    z0_r, z1_r, z0z1_r = expectations_2q(z_rem)
    xx_r = x0x1_from_dist(x_rem)
    yy_r = x0x1_from_dist(y_rem)
    e_rem = energy(z0_r, z1_r, z0z1_r, xx_r, yy_r, coeffs)
    results["rem"] = {"energy": e_rem, "z0": z0_r, "z1": z1_r, "xx": xx_r, "yy": yy_r}

    # --- 4. REM then PS (Z-basis REM then parity filter) ---
    z_rem_ps = parity_filter(z_rem)
    z_rem_ps_total = sum(z_rem_ps.values())
    z0_rp, z1_rp, z0z1_rp = expectations_2q(z_rem_ps)
    e_rem_ps = energy(z0_rp, z1_rp, z0z1_rp, xx_r, yy_r, coeffs)
    results["rem_ps"] = {"energy": e_rem_ps}

    # --- 5. PS then REM (hybrid: PS on Z, REM on X/Y) ---
    # This is the strategy that worked best on q[2,4]
    z0_h, z1_h, z0z1_h = z0_ps, z1_ps, z0z1_ps  # PS values for Z
    e_hybrid = energy(z0_h, z1_h, z0z1_h, xx_r, yy_r, coeffs)  # REM values for X/Y
    results["hybrid_ps_rem"] = {"energy": e_hybrid}

    # Print results table
    print(f"\n  {'Strategy':<20} {'Energy (Ha)':>12} {'Error (kcal)':>12} {'Pass?':>6}")
    print(f"  {'-'*52}")
    for strat_name, strat_data in results.items():
        e = strat_data["energy"]
        err_kcal = abs(e - fci) * 627.509
        passing = "PASS" if err_kcal <= 1.6 else "FAIL"
        print(f"  {strat_name:<20} {e:>12.6f} {err_kcal:>12.2f} {passing:>6}")

    return results


def main():
    with open(RAW_FILE) as f:
        raw = json.load(f)
    with open(PARAMS_FILE) as f:
        params = json.load(f)

    counts = raw["counts"]

    # Build calibration for q[4,6]
    print("Building confusion matrices...")
    cal_46 = build_confusion_matrix(
        counts["cal_q46_00"], counts["cal_q46_11"], qubits=[4, 6]
    )
    print(f"  q[4,6]: {cal_46['errors']}")

    # Build calibration for q[6,8]
    cal_68 = build_confusion_matrix(
        counts["cal_q68_00"], counts["cal_q68_11"], qubits=[6, 8]
    )
    print(f"  q[6,8]: {cal_68['errors']}")

    # Analyze HeH+ on q[4,6]
    p = params["parameters"]["peruzzo"]
    coeffs_heh = {f"g{i}": p[f"g{i}"] for i in range(6)}
    heh_results = analyze_molecule(
        "HeH+ (Peruzzo 2014)",
        counts["peruzzo_zbasis"], counts["peruzzo_xbasis"], counts["peruzzo_ybasis"],
        qubits=[4, 6], coeffs=coeffs_heh, fci=p["fci"], cal=cal_46
    )

    # Analyze H2 on q[6,8]
    h = params["parameters"]["h2_q68"]
    coeffs_h2 = {f"g{i}": h[f"g{i}"] for i in range(6)}
    h2_results = analyze_molecule(
        "H2 (Kandala 2017, new pair q[6,8])",
        counts["h2_q68_zbasis"], counts["h2_q68_xbasis"], counts["h2_q68_ybasis"],
        qubits=[6, 8], coeffs=coeffs_h2, fci=h["fci"], cal=cal_68
    )

    # Summary comparison
    print(f"\n{'='*70}")
    print("  SUMMARY: Best strategy per molecule")
    print(f"{'='*70}")
    for mol_name, mol_results, fci_val in [
        ("HeH+ q[4,6]", heh_results, p["fci"]),
        ("H2 q[6,8]", h2_results, h["fci"]),
    ]:
        best_name = min(mol_results, key=lambda k: abs(mol_results[k]["energy"] - fci_val))
        best_err = abs(mol_results[best_name]["energy"] - fci_val) * 627.509
        print(f"  {mol_name:<20}: {best_name} = {best_err:.2f} kcal/mol")

    # Compare with q[2,4] best (from memory)
    print(f"\n  Reference: H2 q[2,4] hybrid PS+REM = 0.92 kcal/mol (PASS)")
    print(f"  Reference: H2 q[2,4] PS only = 7.04 kcal/mol mean")

    # Save structured results
    output = {
        "timestamp": "2026-02-10T20:46:00Z",
        "source": "tuna9-missing-raw.json",
        "calibration": {
            "q46": {k: v for k, v in cal_46.items() if k == "errors"},
            "q68": {k: v for k, v in cal_68.items() if k == "errors"},
        },
        "heh_q46": {
            "molecule": "HeH+",
            "paper": "peruzzo2014",
            "qubits": [4, 6],
            "fci": p["fci"],
            "alpha": p["alpha"],
            "results": {k: {"energy": round(v["energy"], 6),
                           "error_kcal": round(abs(v["energy"] - p["fci"]) * 627.509, 2)}
                       for k, v in heh_results.items()},
        },
        "h2_q68": {
            "molecule": "H2",
            "paper": "kandala2017",
            "qubits": [6, 8],
            "fci": h["fci"],
            "alpha": h["alpha"],
            "results": {k: {"energy": round(v["energy"], 6),
                           "error_kcal": round(abs(v["energy"] - h["fci"]) * 627.509, 2)}
                       for k, v in h2_results.items()},
        },
    }

    out_path = RESULTS_DIR / "tuna9-missing-analysis.json"
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nSaved to {out_path}")


if __name__ == "__main__":
    main()
