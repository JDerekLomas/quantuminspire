#!/usr/bin/env python3
"""Offline REM reanalysis of all Tuna-9 VQE results.

Applies confusion matrix readout error mitigation to existing raw counts
and compares 4 mitigation strategies:
  1. Raw (no mitigation)
  2. Parity post-selection only (PS)
  3. REM only
  4. REM + post-selection (REM+PS)
  5. Post-selection + REM (PS+REM) -- different ordering

Uses calibration data from readout-cal-tuna9-q24-001.json.
"""

import json
import glob
import os
import numpy as np
from pathlib import Path

RESULTS_DIR = Path(__file__).parent.parent / "experiments" / "results"
CAL_FILE = RESULTS_DIR / "readout-cal-tuna9-q24-001.json"


def _extract_qubit_bits(bitstring, qubits):
    """Extract bits for specific physical qubits from a full-width bitstring.
    Bitstring is MSB-first: bit[N-1]...bit[1]bit[0].
    """
    result = ""
    for q in qubits:
        if q < len(bitstring):
            result += bitstring[-(q + 1)]
        else:
            result += "0"
    return result


def _apply_rem_to_counts(counts, qubits, M0_inv, M1_inv):
    """Apply readout error mitigation via per-qubit confusion matrix inversion."""
    dist_2q = {}
    for bs, count in counts.items():
        bits = _extract_qubit_bits(bs, qubits)
        dist_2q[bits] = dist_2q.get(bits, 0) + count

    total = sum(dist_2q.values())
    if total == 0:
        return {}

    state_order = ["00", "01", "10", "11"]
    p_meas = np.array([dist_2q.get(s, 0) / total for s in state_order])

    M_full_inv = np.kron(M0_inv, M1_inv)
    p_corrected = M_full_inv @ p_meas
    p_corrected = np.maximum(p_corrected, 0)
    p_sum = p_corrected.sum()
    if p_sum > 0:
        p_corrected /= p_sum

    corrected_counts = {}
    for i, state in enumerate(state_order):
        c = int(round(p_corrected[i] * total))
        if c > 0:
            corrected_counts[state] = c
    return corrected_counts


def parity_postselect(counts, qubits):
    """Filter to odd-parity bitstrings only (valid VQE subspace)."""
    filtered = {}
    for bs, count in counts.items():
        bits = _extract_qubit_bits(bs, qubits)
        parity = int(bits[0]) ^ int(bits[1])
        if parity == 1:
            filtered[bs] = count
    return filtered


def parity_postselect_2q(counts_2q):
    """Filter 2-qubit counts to odd-parity only."""
    return {bs: c for bs, c in counts_2q.items()
            if int(bs[0]) ^ int(bs[1]) == 1}


def expectation_from_counts(counts, qubits, total):
    """Compute <Z0>, <Z1>, <Z0Z1> from full-width bitstring counts."""
    z0, z1, z0z1 = 0, 0, 0
    for bitstring, count in counts.items():
        bits = _extract_qubit_bits(bitstring, qubits)
        b0 = int(bits[0])
        b1 = int(bits[1])
        z0 += (1 - 2 * b0) * count
        z1 += (1 - 2 * b1) * count
        z0z1 += (1 - 2 * b0) * (1 - 2 * b1) * count
    return z0 / total, z1 / total, z0z1 / total


def expectation_from_2q(counts_2q, total):
    """Compute expectations from 2-qubit bitstring counts."""
    z0, z1, z0z1 = 0, 0, 0
    for bits, count in counts_2q.items():
        b0 = int(bits[0])
        b1 = int(bits[1])
        z0 += (1 - 2 * b0) * count
        z1 += (1 - 2 * b1) * count
        z0z1 += (1 - 2 * b0) * (1 - 2 * b1) * count
    return z0 / total, z1 / total, z0z1 / total


def compute_energy(exp_z0, exp_z1, exp_z0z1, exp_x0x1, exp_y0y1, coeffs):
    """H = g0 + g1*Z0 + g2*Z1 + g3*Z0Z1 + g4*X0X1 + g5*Y0Y1"""
    return (coeffs["g0"] + coeffs["g1"] * exp_z0 + coeffs["g2"] * exp_z1
            + coeffs["g3"] * exp_z0z1 + coeffs["g4"] * exp_x0x1
            + coeffs["g5"] * exp_y0y1)


def analyze_one(result, M0_inv, M1_inv):
    """Reanalyze a single VQE result with all mitigation strategies."""
    params = result["parameters"]
    qubits = params.get("qubits", [0, 1])
    coeffs = {k: params.get(k, 0) for k in ["g0", "g1", "g2", "g3", "g4", "g5"]}
    fci = params.get("fci_energy", -1.1373)
    R = params.get("bond_distance", 0.735)
    cnot_folds = params.get("cnot_folds", 1)

    raw_counts = result.get("raw_counts", {})
    z_counts = raw_counts.get("z_basis", {})
    x_counts = raw_counts.get("x_basis", {})
    y_counts = raw_counts.get("y_basis", {})

    total_z = sum(z_counts.values())
    total_x = sum(x_counts.values())
    total_y = sum(y_counts.values())

    if total_z == 0:
        return None

    # --- Strategy 1: Raw ---
    exp_z0, exp_z1, exp_z0z1 = expectation_from_counts(z_counts, qubits, total_z)
    exp_x0x1 = 0
    if total_x > 0:
        _, _, exp_x0x1 = expectation_from_counts(x_counts, qubits, total_x)
    exp_y0y1 = 0
    if total_y > 0:
        _, _, exp_y0y1 = expectation_from_counts(y_counts, qubits, total_y)
    energy_raw = compute_energy(exp_z0, exp_z1, exp_z0z1, exp_x0x1, exp_y0y1, coeffs)

    # --- Strategy 2: Post-selection only ---
    z_ps = parity_postselect(z_counts, qubits)
    z_ps_total = sum(z_ps.values())
    ps_keep = z_ps_total / total_z if total_z > 0 else 0
    if z_ps_total > 0:
        ps_z0, ps_z1, ps_z0z1 = expectation_from_counts(z_ps, qubits, z_ps_total)
        energy_ps = compute_energy(ps_z0, ps_z1, ps_z0z1, exp_x0x1, exp_y0y1, coeffs)
    else:
        energy_ps = energy_raw

    # --- Strategy 3: REM only ---
    z_rem = _apply_rem_to_counts(z_counts, qubits, M0_inv, M1_inv)
    x_rem = _apply_rem_to_counts(x_counts, qubits, M0_inv, M1_inv) if total_x > 0 else {}
    y_rem = _apply_rem_to_counts(y_counts, qubits, M0_inv, M1_inv) if total_y > 0 else {}

    total_z_rem = sum(z_rem.values())
    total_x_rem = sum(x_rem.values())
    total_y_rem = sum(y_rem.values())

    if total_z_rem > 0:
        rem_z0, rem_z1, rem_z0z1 = expectation_from_2q(z_rem, total_z_rem)
        rem_x0x1 = 0
        if total_x_rem > 0:
            _, _, rem_x0x1 = expectation_from_2q(x_rem, total_x_rem)
        rem_y0y1 = 0
        if total_y_rem > 0:
            _, _, rem_y0y1 = expectation_from_2q(y_rem, total_y_rem)
        energy_rem = compute_energy(rem_z0, rem_z1, rem_z0z1, rem_x0x1, rem_y0y1, coeffs)
    else:
        energy_rem = energy_raw

    # --- Strategy 4: REM then post-selection ---
    z_rem_ps = parity_postselect_2q(z_rem)
    z_rem_ps_total = sum(z_rem_ps.values())
    if z_rem_ps_total > 0:
        rps_z0, rps_z1, rps_z0z1 = expectation_from_2q(z_rem_ps, z_rem_ps_total)
        energy_rem_ps = compute_energy(rps_z0, rps_z1, rps_z0z1, rem_x0x1, rem_y0y1, coeffs)
    else:
        energy_rem_ps = energy_rem

    # --- Strategy 5: Post-selection then REM ---
    # Apply PS to raw counts first, then REM on those
    z_ps_raw = parity_postselect(z_counts, qubits)
    z_ps_rem = _apply_rem_to_counts(z_ps_raw, qubits, M0_inv, M1_inv) if sum(z_ps_raw.values()) > 0 else {}
    z_ps_rem_total = sum(z_ps_rem.values())
    if z_ps_rem_total > 0:
        psr_z0, psr_z1, psr_z0z1 = expectation_from_2q(z_ps_rem, z_ps_rem_total)
        energy_ps_rem = compute_energy(psr_z0, psr_z1, psr_z0z1, rem_x0x1, rem_y0y1, coeffs)
    else:
        energy_ps_rem = energy_ps

    def error_kcal(e):
        return round(abs(e - fci) * 627.509, 2)

    return {
        "id": result["id"],
        "bond_distance": R,
        "cnot_folds": cnot_folds,
        "fci_energy": fci,
        "ps_keep_fraction": round(ps_keep, 4),
        "raw": {"energy": round(energy_raw, 6), "error_kcal": error_kcal(energy_raw)},
        "ps": {"energy": round(energy_ps, 6), "error_kcal": error_kcal(energy_ps)},
        "rem": {"energy": round(energy_rem, 6), "error_kcal": error_kcal(energy_rem)},
        "rem_ps": {"energy": round(energy_rem_ps, 6), "error_kcal": error_kcal(energy_rem_ps)},
        "ps_rem": {"energy": round(energy_ps_rem, 6), "error_kcal": error_kcal(energy_ps_rem)},
    }


def main():
    # Load calibration
    with open(CAL_FILE) as f:
        cal = json.load(f)
    analysis = cal["analysis"]
    M0_inv = np.array(analysis["inverse_matrix_q0"])
    M1_inv = np.array(analysis["inverse_matrix_q1"])
    print(f"Loaded calibration: q2 error {analysis['readout_errors']['q2_total_error']*100:.1f}%, "
          f"q4 error {analysis['readout_errors']['q4_total_error']*100:.1f}%")

    # Find all Tuna-9 VQE results
    files = sorted(glob.glob(str(RESULTS_DIR / "vqe-tuna9-*.json")))
    print(f"Found {len(files)} Tuna-9 VQE result files\n")

    results = []
    for fpath in files:
        with open(fpath) as f:
            data = json.load(f)
        # Skip files that don't have standard raw_counts format
        if "raw_counts" not in data or "z_basis" not in data.get("raw_counts", {}):
            print(f"  SKIP {data['id']} (no standard raw_counts)")
            continue
        # Only process q[2,4] results (calibration is for these qubits)
        qubits = data.get("parameters", {}).get("qubits", [0, 1])
        if qubits != [2, 4]:
            print(f"  SKIP {data['id']} (qubits={qubits}, cal is for [2,4])")
            continue
        r = analyze_one(data, M0_inv, M1_inv)
        if r:
            results.append(r)

    # Print comparison table
    print(f"\n{'='*110}")
    print(f"{'ID':<32} {'R(A)':>5} {'f':>2} {'Raw':>8} {'PS':>8} {'REM':>8} {'REM+PS':>8} {'PS+REM':>8} {'Best':>8} {'Strategy':<10}")
    print(f"{'='*110}")

    strategy_wins = {"raw": 0, "ps": 0, "rem": 0, "rem_ps": 0, "ps_rem": 0}

    for r in results:
        strategies = {
            "raw": r["raw"]["error_kcal"],
            "ps": r["ps"]["error_kcal"],
            "rem": r["rem"]["error_kcal"],
            "rem_ps": r["rem_ps"]["error_kcal"],
            "ps_rem": r["ps_rem"]["error_kcal"],
        }
        best_name = min(strategies, key=strategies.get)
        best_err = strategies[best_name]
        strategy_wins[best_name] += 1

        print(f"{r['id']:<32} {r['bond_distance']:>5.3f} {r['cnot_folds']:>2} "
              f"{r['raw']['error_kcal']:>8.2f} {r['ps']['error_kcal']:>8.2f} "
              f"{r['rem']['error_kcal']:>8.2f} {r['rem_ps']['error_kcal']:>8.2f} "
              f"{r['ps_rem']['error_kcal']:>8.2f} {best_err:>8.2f} {best_name:<10}")

    print(f"{'='*110}")

    # Summary stats
    print(f"\nStrategy wins: {dict(strategy_wins)}")
    print(f"Total experiments: {len(results)}")

    # Mean error by strategy
    for strat in ["raw", "ps", "rem", "rem_ps", "ps_rem"]:
        errs = [r[strat]["error_kcal"] for r in results]
        print(f"  {strat:>8}: mean={np.mean(errs):.2f}, median={np.median(errs):.2f}, "
              f"min={np.min(errs):.2f}, max={np.max(errs):.2f} kcal/mol")

    # By bond distance
    bond_groups = {}
    for r in results:
        bd = r["bond_distance"]
        if bd not in bond_groups:
            bond_groups[bd] = []
        bond_groups[bd].append(r)

    if len(bond_groups) > 1:
        print(f"\n{'='*80}")
        print(f"{'R(A)':>6} {'N':>3} {'Raw':>8} {'PS':>8} {'REM':>8} {'REM+PS':>8} {'PS+REM':>8}")
        print(f"{'='*80}")
        for bd in sorted(bond_groups.keys()):
            group = bond_groups[bd]
            n = len(group)
            means = {}
            for strat in ["raw", "ps", "rem", "rem_ps", "ps_rem"]:
                means[strat] = np.mean([r[strat]["error_kcal"] for r in group])
            print(f"{bd:>6.3f} {n:>3} {means['raw']:>8.2f} {means['ps']:>8.2f} "
                  f"{means['rem']:>8.2f} {means['rem_ps']:>8.2f} {means['ps_rem']:>8.2f}")

    # ZNE interaction
    zne_groups = {}
    for r in results:
        f = r["cnot_folds"]
        if f not in zne_groups:
            zne_groups[f] = []
        zne_groups[f].append(r)

    if len(zne_groups) > 1:
        print(f"\n--- ZNE fold factor interaction ---")
        print(f"{'Folds':>6} {'N':>3} {'Raw':>8} {'PS':>8} {'REM':>8} {'REM+PS':>8} {'PS+REM':>8}")
        for f in sorted(zne_groups.keys()):
            group = zne_groups[f]
            n = len(group)
            means = {}
            for strat in ["raw", "ps", "rem", "rem_ps", "ps_rem"]:
                means[strat] = np.mean([r[strat]["error_kcal"] for r in group])
            print(f"{f:>6} {n:>3} {means['raw']:>8.2f} {means['ps']:>8.2f} "
                  f"{means['rem']:>8.2f} {means['rem_ps']:>8.2f} {means['ps_rem']:>8.2f}")

    # Save output
    output = {
        "calibration_file": "readout-cal-tuna9-q24-001",
        "qubits": [2, 4],
        "n_experiments": len(results),
        "strategy_wins": strategy_wins,
        "results": results,
        "summary": {
            strat: {
                "mean_error_kcal": round(float(np.mean([r[strat]["error_kcal"] for r in results])), 2),
                "median_error_kcal": round(float(np.median([r[strat]["error_kcal"] for r in results])), 2),
                "min_error_kcal": round(float(np.min([r[strat]["error_kcal"] for r in results])), 2),
                "max_error_kcal": round(float(np.max([r[strat]["error_kcal"] for r in results])), 2),
            }
            for strat in ["raw", "ps", "rem", "rem_ps", "ps_rem"]
        },
    }

    out_path = RESULTS_DIR / "tuna9-rem-reanalysis.json"
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nSaved to {out_path}")


if __name__ == "__main__":
    main()
