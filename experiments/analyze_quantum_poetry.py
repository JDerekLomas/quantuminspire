#!/usr/bin/env python3
"""
Analyze Quantum Poetry Experiment Results
==========================================
Parses results from three experiments run on Tuna-9 emulator:
  1. GHZ-9 state -> two maximally correlated haiku
  2. Bell Couplets -> entangled couplet generation
  3. Entangled Haiku (Z-basis) -> ~400 unique outcomes

Produces a formatted report and JSON output.
"""

import json
import math
import os
import sys
from collections import Counter
from datetime import datetime

# Add parent so we can import from quantum_poetry
sys.path.insert(0, os.path.dirname(__file__))
from quantum_poetry import (
    HAIKU_LINES_Z, HAIKU_LINES_X, BELL_COUPLETS, COUPLET_WORDS,
    bitstring_to_haiku, bitstring_to_couplet, results_to_poems,
    correlation_analysis, entropy_per_line,
    circuit_ghz9, circuit_bell_couplets, circuit_entangled_haiku,
)

RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")

# =============================================================================
# RAW RESULTS
# =============================================================================

GHZ_RESULTS = {"000000000": 526, "111111111": 498}

BELL_RESULTS = {
    "00000000": 65, "00000011": 64, "00001100": 53, "00001111": 72,
    "00110000": 64, "00110011": 60, "00111100": 68, "00111111": 67,
    "11000000": 76, "11000011": 71, "11001100": 58, "11001111": 71,
    "11110000": 55, "11110011": 51, "11111100": 66, "11111111": 63,
}

# =============================================================================
# ANALYSIS FUNCTIONS
# =============================================================================

def analyze_ghz():
    """Analyze GHZ-9 results: exactly two haiku."""
    print("=" * 72)
    print("  EXPERIMENT 1: GHZ-9 HAIKU")
    print("  Circuit: |000000000> + |111111111>")
    print("=" * 72)
    print()

    total = sum(GHZ_RESULTS.values())
    print(f"  Total shots: {total}")
    print(f"  Unique outcomes: {len(GHZ_RESULTS)}")
    print()

    poems = results_to_poems(GHZ_RESULTS, poem_type="haiku", basis="Z")

    report_poems = []
    for i, (poem, count) in enumerate(poems):
        frac = count / total
        label = "|000000000>" if i == 0 else "|111111111>"
        print(f"  --- Haiku {i+1} ({label}, {count} shots, {frac:.1%}) ---")
        print()
        for line in poem.split("\n"):
            print(f"    {line}")
        print()
        report_poems.append({
            "bitstring": list(GHZ_RESULTS.keys())[i],
            "shots": count,
            "fraction": round(frac, 4),
            "poem": poem,
        })

    # Correlation is trivially 1.0 for all pairs in GHZ
    print("  Qubit correlations: ALL pairs = +1.000 (perfect GHZ)")
    print()

    return {
        "experiment": "GHZ-9 Haiku",
        "circuit": "ghz9",
        "total_shots": total,
        "unique_outcomes": len(GHZ_RESULTS),
        "raw_results": GHZ_RESULTS,
        "poems": report_poems,
        "notes": "9-qubit GHZ state produces exactly 2 haiku with perfect qubit correlations."
    }


def analyze_bell_couplets():
    """Analyze Bell couplet results."""
    print("=" * 72)
    print("  EXPERIMENT 2: BELL COUPLETS")
    print("  Circuit: 4 Bell pairs -> entangled word choices")
    print("=" * 72)
    print()

    total = sum(BELL_RESULTS.values())
    print(f"  Total shots: {total}")
    print(f"  Unique outcomes: {len(BELL_RESULTS)}")
    print()

    # Check Bell pair correlations
    # Each Bell pair (q_even, q_odd) should be perfectly correlated
    print("  Bell pair correlations (even qubit == odd qubit):")
    pair_stats = {}
    for pair_idx in range(4):
        q_even = pair_idx * 2      # q0, q2, q4, q6
        q_odd = q_even + 1          # q1, q3, q5, q7
        same = 0
        diff = 0
        for bitstring, count in BELL_RESULTS.items():
            # MSB-first: bit[0]=q7, bit[7]=q0
            b_even = bitstring[7 - q_even]
            b_odd = bitstring[7 - q_odd]
            if b_even == b_odd:
                same += count
            else:
                diff += count
        corr = (same - diff) / total
        pair_stats[f"pair{pair_idx}"] = round(corr, 4)
        dim_names = ["time", "element", "action", "quality"]
        print(f"    Pair {pair_idx} (q{q_even},q{q_odd}) [{dim_names[pair_idx]:>8s}]: "
              f"corr = {corr:+.4f}  (same={same}, diff={diff})")
    print()

    # Map to couplets using the even-qubit extraction
    couplet_counts = Counter()
    couplet_details = {}

    for bitstring, count in BELL_RESULTS.items():
        # Extract even-qubit bits: q0=bitstring[7], q2=bitstring[5], q4=bitstring[3], q6=bitstring[1]
        key = bitstring[7] + bitstring[5] + bitstring[3] + bitstring[1]

        if key in BELL_COUPLETS:
            line1, line2 = BELL_COUPLETS[key]
            couplet = f"{line1}\n{line2}"
        else:
            couplet = f"[unmapped key: {key}]"
            line1, line2 = f"[unmapped: {key}]", f"[unmapped: {key}]"

        couplet_counts[couplet] += count
        if key not in couplet_details:
            couplet_details[key] = {
                "line1": line1,
                "line2": line2,
                "shots": 0,
                "bitstrings": [],
            }
        couplet_details[key]["shots"] += count
        couplet_details[key]["bitstrings"].append(bitstring)

    # Print couplets sorted by key for readability
    print("  Generated couplets (all 16 outcomes):")
    print()

    report_couplets = []
    for key in sorted(couplet_details.keys()):
        info = couplet_details[key]
        frac = info["shots"] / total
        # Decode the 4 semantic bits
        bits = [int(b) for b in key]
        time_word = "dawn" if bits[0] == 0 else "dusk"
        elem_word = "rain" if bits[1] == 0 else "fire"
        act_word = "gathers" if bits[2] == 0 else "scatters"
        qual_word = "sound" if bits[3] == 0 else "wound"

        print(f"  [{key}] {info['shots']:>3d} shots ({frac:.1%})  "
              f"[{time_word}/{elem_word}/{act_word}/{qual_word}]")
        print(f"    L1: {info['line1']}")
        print(f"    L2: {info['line2']}")
        print()

        report_couplets.append({
            "key": key,
            "shots": info["shots"],
            "fraction": round(frac, 4),
            "semantics": {
                "time": time_word,
                "element": elem_word,
                "action": act_word,
                "quality": qual_word,
            },
            "line1": info["line1"],
            "line2": info["line2"],
            "contributing_bitstrings": info["bitstrings"],
        })

    # Check uniformity (should be ~1/16 = 6.25% each)
    expected = total / 16
    chi_sq = sum((info["shots"] - expected)**2 / expected
                 for info in couplet_details.values())
    # 15 degrees of freedom, chi-sq critical value at 0.05 = 25.0
    print(f"  Uniformity test: chi-squared = {chi_sq:.2f} (df=15, critical=25.0)")
    print(f"    Expected per couplet: {expected:.1f}")
    print(f"    {'PASS: consistent with uniform' if chi_sq < 25.0 else 'FAIL: non-uniform'}")
    print()

    return {
        "experiment": "Bell Couplets",
        "circuit": "bell_couplets",
        "total_shots": total,
        "unique_outcomes": len(BELL_RESULTS),
        "raw_results": BELL_RESULTS,
        "bell_pair_correlations": pair_stats,
        "couplets": report_couplets,
        "chi_squared": round(chi_sq, 2),
        "uniform_p_value_approx": "pass" if chi_sq < 25.0 else "fail",
        "notes": ("4 Bell pairs produce 16 couplets with perfectly correlated "
                  "semantic dimensions between lines. Each pair controls one "
                  "thematic axis: time, element, action, quality."),
    }


def analyze_inter_group_correlations():
    """Compare inter-group correlations for entangled vs product Bell states."""
    print("=" * 72)
    print("  CORRELATION ANALYSIS: BELL PAIRS")
    print("=" * 72)
    print()

    # For Bell couplets, the inter-pair correlations should be ~0
    # (pairs are independent) while intra-pair correlations are +1
    corrs = correlation_analysis(BELL_RESULTS, n_qubits=8)

    print("  Intra-pair correlations (should be ~+1.0):")
    for pair_idx in range(4):
        i, j = pair_idx * 2, pair_idx * 2 + 1
        print(f"    q{i}-q{j}: {corrs[(i,j)]:+.4f}")

    print()
    print("  Inter-pair correlations (should be ~0.0 for independent pairs):")
    inter_corrs = []
    for p1 in range(4):
        for p2 in range(p1+1, 4):
            for qi in [p1*2, p1*2+1]:
                for qj in [p2*2, p2*2+1]:
                    key = (min(qi,qj), max(qi,qj))
                    val = corrs[key]
                    inter_corrs.append(val)
                    print(f"    q{qi}-q{qj}: {val:+.4f}")

    mean_inter = sum(abs(c) for c in inter_corrs) / len(inter_corrs)
    print(f"\n  Mean |inter-pair correlation|: {mean_inter:.4f} (ideal: 0.0)")
    print()

    return {
        "intra_pair_mean_correlation": round(
            sum(corrs[(i*2, i*2+1)] for i in range(4)) / 4, 4),
        "inter_pair_mean_abs_correlation": round(mean_inter, 4),
    }


def main():
    print()
    print("*" * 72)
    print("*" + " " * 70 + "*")
    print("*" + "QUANTUM POETRY EXPERIMENT — ANALYSIS REPORT".center(70) + "*")
    print("*" + f"Generated {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}".center(70) + "*")
    print("*" + " " * 70 + "*")
    print("*" * 72)
    print()

    # Run analyses
    ghz_report = analyze_ghz()
    bell_report = analyze_bell_couplets()
    corr_report = analyze_inter_group_correlations()

    # Merge correlation analysis into bell report
    bell_report["correlation_analysis"] = corr_report

    # Summary
    print("=" * 72)
    print("  SUMMARY")
    print("=" * 72)
    print()
    print("  GHZ-9 Haiku:")
    print("    - 2 possible poems from 1024 shots (526 vs 498)")
    print("    - Perfect qubit correlations: every line choice is entangled")
    print("    - The poem exists in superposition until measured")
    print()
    print("  Bell Couplets:")
    print(f"    - 16 couplets from {sum(BELL_RESULTS.values())} shots")
    print(f"    - Intra-pair correlation: {corr_report['intra_pair_mean_correlation']:+.4f}")
    print(f"    - Inter-pair |correlation|: {corr_report['inter_pair_mean_abs_correlation']:.4f}")
    print("    - Each line 1 / line 2 word pair is Bell-entangled")
    print("    - Lines share meaning not by classical design but by quantum correlation")
    print()

    # Build JSON report
    report = {
        "title": "Quantum Poetry Experiment 1",
        "date": datetime.now().isoformat(),
        "platform": "qxelarator (emulator)",
        "experiments": {
            "ghz_haiku": ghz_report,
            "bell_couplets": bell_report,
        },
        "summary": {
            "ghz_haiku_count": 2,
            "ghz_total_shots": sum(GHZ_RESULTS.values()),
            "bell_couplet_count": 16,
            "bell_total_shots": sum(BELL_RESULTS.values()),
            "bell_intra_pair_correlation": corr_report["intra_pair_mean_correlation"],
            "bell_inter_pair_correlation": corr_report["inter_pair_mean_abs_correlation"],
        },
    }

    # Save JSON
    os.makedirs(RESULTS_DIR, exist_ok=True)
    outpath = os.path.join(RESULTS_DIR, "quantum-poetry-experiment1.json")
    with open(outpath, "w") as f:
        json.dump(report, f, indent=2)
    print(f"  JSON report saved to: {outpath}")
    print()


if __name__ == "__main__":
    main()
