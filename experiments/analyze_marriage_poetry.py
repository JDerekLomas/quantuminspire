#!/usr/bin/env python3
"""
Analyze quantum marriage poetry results from Tuna-9 hardware.

Reads raw measurement data, maps bitstrings to poems, computes statistics,
and saves a comprehensive results JSON.
"""

import json
import math
import os
from collections import Counter

RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")

# Word banks (must match submit_quantum_poetry.py exactly)
TENDERNESS = {
    "line1": ["your hand finds mine","the children sleeping","seventeen winters","you laugh and I remember","the kitchen light still on","your breathing in the dark","we built this room together","I know your silences"],
    "line2": ["and something holds that should have broken","the years have made us porous to each other","I trace the atlas of your changing face","the fractures are the places where light enters","we speak a language no one else can hear","the bed remembers every shape we've been","four lives grew upward from this tangled root","the ordinary days are what I'll grieve"],
    "line3": ["still, your warmth","the door left open","bread on the table","your scent, the sheets","a hand-worn ring","roots under stone","two clocks, one time","the long way home"],
}

RESENTMENT = {
    "line1": ["your silence fills the room","the children watch us watching","seventeen years of this","you talk and I stop hearing","the kitchen light, still on","your breathing keeps me up","we built these walls together","I know your evasions"],
    "line2": ["and something stays that should have left by now","the years have worn us thin as excuses","I count the ways your face has disappointed","the fractures are just fractures, nothing more","we speak the same exhausted arguments","the bed remembers every turned-away back","four lives demand more than this hollow truce","the ordinary days are all there is"],
    "line3": ["still, your weight","the door slammed shut","crumbs on the table","your snore, the sheets","a hand-worn groove","walls closing in","two clocks, no time","the long way round"],
}


def bitstring_to_poem(bitstring, bank):
    """Convert 9-bit MSB-first bitstring to poem.

    Qubit grouping for Tuna-9 topology:
      Line 1: q0, q1, q3
      Line 2: q2, q4, q6
      Line 3: q5, q7, q8

    MSB-first: bitstring[0]=q8, bitstring[8]=q0
    """
    q = {}
    for i in range(9):
        q[i] = int(bitstring[8 - i])

    g1 = q[3] * 4 + q[1] * 2 + q[0]
    g2 = q[6] * 4 + q[4] * 2 + q[2]
    g3 = q[8] * 4 + q[7] * 2 + q[5]

    return [bank["line1"][g1], bank["line2"][g2], bank["line3"][g3]]


def shannon_entropy(counts, total):
    """Shannon entropy in bits."""
    H = 0.0
    for c in counts.values():
        if c > 0:
            p = c / total
            H -= p * math.log2(p)
    return H


def analyze_circuit(name, raw_results, bank, label):
    """Analyze a single circuit's results."""
    total = sum(raw_results.values())
    n_bitstrings = len(raw_results)

    # Map to poems
    poem_counts = Counter()
    for bs, count in raw_results.items():
        poem = tuple(bitstring_to_poem(bs, bank))
        poem_counts[poem] += count

    n_poems = len(poem_counts)

    # Entropy
    bs_entropy = shannon_entropy(raw_results, total)
    poem_entropy = shannon_entropy(poem_counts, total)

    # Top poems
    top_poems = []
    for poem, count in poem_counts.most_common(10):
        top_poems.append({
            "lines": list(poem),
            "count": count,
            "probability": round(count / total, 4),
            "text": "\n".join(poem),
        })

    return {
        "circuit": name,
        "reading": label,
        "total_shots": total,
        "unique_bitstrings": n_bitstrings,
        "unique_poems": n_poems,
        "bitstring_entropy_bits": round(bs_entropy, 3),
        "poem_entropy_bits": round(poem_entropy, 3),
        "max_bitstring_entropy": round(math.log2(512), 3),  # 9 bits = 512 states
        "top_poems": top_poems,
    }


def analyze_ghz(raw_results):
    """Special analysis for GHZ circuit."""
    total = sum(raw_results.values())

    # Ideal GHZ states
    all_zero = raw_results.get("000000000", 0)
    all_one = raw_results.get("111111111", 0)
    fidelity = (all_zero + all_one) / total

    # Map ALL bitstrings to tenderness poems (Z-basis for GHZ)
    poem_counts = Counter()
    for bs, count in raw_results.items():
        poem = tuple(bitstring_to_poem(bs, TENDERNESS))
        poem_counts[poem] += count

    n_poems = len(poem_counts)
    bs_entropy = shannon_entropy(raw_results, total)
    poem_entropy = shannon_entropy(poem_counts, total)

    # The two ideal poems
    poem_000 = bitstring_to_poem("000000000", TENDERNESS)
    poem_111 = bitstring_to_poem("111111111", TENDERNESS)

    top_poems = []
    for poem, count in poem_counts.most_common(15):
        top_poems.append({
            "lines": list(poem),
            "count": count,
            "probability": round(count / total, 4),
            "text": "\n".join(poem),
        })

    # Categorize: how many shots are "pure tenderness" vs "pure resentment" vs "mixed"
    # In GHZ, all-0 = tenderness poem #0, all-1 = tenderness poem #7 (last index)
    # But the artistic reading is: all-0 = pure state A, all-1 = pure state B
    # Everything else = noise-induced superposition

    return {
        "circuit": "marriage-ghz",
        "reading": "all-or-nothing (GHZ)",
        "total_shots": total,
        "unique_bitstrings": len(raw_results),
        "unique_poems": n_poems,
        "ghz_fidelity": round(fidelity, 4),
        "all_zero_count": all_zero,
        "all_one_count": all_one,
        "ideal_poem_a": poem_000,
        "ideal_poem_b": poem_111,
        "bitstring_entropy_bits": round(bs_entropy, 3),
        "poem_entropy_bits": round(poem_entropy, 3),
        "top_poems": top_poems,
    }


def main():
    # Load raw results
    jobs_path = os.path.join(RESULTS_DIR, "quantum-poetry-marriage-jobs.json")
    with open(jobs_path) as f:
        jobs = json.load(f)

    # Raw results (hardcoded from qi_get_results — already fetched)
    raw = {}
    for name in ["marriage-z-basis", "marriage-x-basis", "marriage-ghz"]:
        path = os.path.join(RESULTS_DIR, f"quantum-poetry-{name}-raw.json")
        if os.path.exists(path):
            with open(path) as f:
                raw[name] = json.load(f)

    if not raw:
        print("No raw results found. Run fetch_poetry_results.py first.")
        return

    # Analyze each circuit
    z_analysis = analyze_circuit("marriage-z-basis", raw["marriage-z-basis"],
                                 TENDERNESS, "tenderness (Z-basis)")
    x_analysis = analyze_circuit("marriage-x-basis", raw["marriage-x-basis"],
                                 RESENTMENT, "resentment (X-basis)")
    ghz_analysis = analyze_ghz(raw["marriage-ghz"])

    # Build full results
    results = {
        "experiment": "quantum-poetry-marriage",
        "description": "Marriage as quantum superposition. Same state, two readings. Neither is more real.",
        "hardware": "Quantum Inspire Tuna-9 (9 superconducting qubits)",
        "date": "2026-02-14",
        "occasion": "17th wedding anniversary",
        "shots_per_circuit": 4096,
        "compile_stage": "ROUTING (native gates: CZ, Ry, Rz)",
        "qubit_mapping": {
            "line1_qubits": [0, 1, 3],
            "line2_qubits": [2, 4, 6],
            "line3_qubits": [5, 7, 8],
            "entanglement_edges": ["CZ(0,2)", "CZ(1,4)", "CZ(4,7)", "CZ(2,5)"],
        },
        "circuits": {
            "z_basis_tenderness": z_analysis,
            "x_basis_resentment": x_analysis,
            "ghz_all_or_nothing": ghz_analysis,
        },
        "job_ids": {
            name: info["job_id"]
            for name, info in jobs["circuits"].items()
        },
    }

    # Save
    outpath = os.path.join(RESULTS_DIR, "quantum-poetry-marriage-results.json")
    with open(outpath, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Results saved to {outpath}")

    # Print summary
    print("\n" + "=" * 70)
    print("  QUANTUM MARRIAGE — TUNA-9 HARDWARE RESULTS")
    print("  Valentine's Day, 2026")
    print("=" * 70)

    for label, analysis in [
        ("TENDERNESS (Z-basis)", z_analysis),
        ("RESENTMENT (X-basis)", x_analysis),
    ]:
        print(f"\n--- {label} ---")
        print(f"  {analysis['unique_bitstrings']} bitstrings → {analysis['unique_poems']} poems")
        print(f"  Entropy: {analysis['poem_entropy_bits']:.1f} bits (max {math.log2(512):.1f})")
        for p in analysis["top_poems"][:3]:
            pct = p["probability"] * 100
            print(f"\n  [{pct:.1f}% — {p['count']} shots]")
            for line in p["lines"]:
                print(f"    {line}")

    print(f"\n--- GHZ (ALL-OR-NOTHING) ---")
    print(f"  Fidelity: {ghz_analysis['ghz_fidelity']:.1%}")
    print(f"  |000000000⟩: {ghz_analysis['all_zero_count']} shots")
    print(f"  |111111111⟩: {ghz_analysis['all_one_count']} shots")
    print(f"  {ghz_analysis['unique_poems']} poems total (noise creates mixed states)")

    print(f"\n  Poem A ({ghz_analysis['all_zero_count']} shots):")
    for line in ghz_analysis["ideal_poem_a"]:
        print(f"    {line}")

    print(f"\n  Poem B ({ghz_analysis['all_one_count']} shots):")
    for line in ghz_analysis["ideal_poem_b"]:
        print(f"    {line}")

    # The noise poems — the most interesting artistic finding
    print(f"\n--- NOISE POEMS (the cracks in the GHZ) ---")
    for p in ghz_analysis["top_poems"]:
        if p["lines"] == ghz_analysis["ideal_poem_a"] or p["lines"] == ghz_analysis["ideal_poem_b"]:
            continue
        pct = p["probability"] * 100
        if pct < 1.0:
            break
        print(f"\n  [{pct:.1f}% — {p['count']} shots]")
        for line in p["lines"]:
            print(f"    {line}")

    print()


if __name__ == "__main__":
    main()
