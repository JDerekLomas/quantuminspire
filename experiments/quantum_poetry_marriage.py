#!/usr/bin/env python3
"""
Quantum Poetry: Marriage as Superposition
==========================================

A quantum poem about long-term love. The same quantum state, measured
in two bases, produces two complementary poems: one about tenderness,
one about resentment. Neither is more real. Both are always present
in the wavefunction. The act of reading one collapses the other.

"Marriage is not a love poem. Or is it?"

Hardware: Quantum Inspire Tuna-9 (9 superconducting qubits)
"""

import json
import os
from collections import Counter
from datetime import datetime

RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")

# =============================================================================
# WORD BANKS: MARRIAGE AS COMPLEMENTARY OBSERVABLES
# =============================================================================

# Z-basis: tenderness, connection, the love poem
# These are what you see when you look at the marriage with love-eyes.
TENDERNESS = {
    "line1": [
        "your hand finds mine",           # 000 — touch, reaching
        "the children sleeping",           # 001 — what you built
        "seventeen winters",               # 010 — endurance
        "you laugh and I remember",        # 011 — recognition
        "the kitchen light still on",      # 100 — domestic warmth
        "your breathing in the dark",      # 101 — intimacy of night
        "we built this room together",     # 110 — shared labor
        "I know your silences",            # 111 — deep knowing
    ],
    "line2": [
        "and something holds that should have broken",     # 000
        "the years have made us porous to each other",     # 001
        "I trace the atlas of your changing face",         # 010
        "the fractures are the places where light enters",  # 011
        "we speak a language no one else can hear",        # 100
        "the bed remembers every shape we've been",        # 101
        "four lives grew upward from this tangled root",   # 110
        "the ordinary days are what I'll grieve",          # 111
    ],
    "line3": [
        "still, your warmth",            # 000
        "the door left open",            # 001
        "bread on the table",            # 010
        "your scent, the sheets",        # 011
        "a hand-worn ring",              # 100
        "roots under stone",             # 101
        "two clocks, one time",          # 110
        "the long way home",             # 111
    ],
}

# X-basis: resentment, distance, the other poem.
# Same quantum state. Different measurement. Different truth.
RESENTMENT = {
    "line1": [
        "your silence fills the room",     # 000 — absence as presence
        "the children watch us watching",   # 001 — what they inherit
        "seventeen years of this",          # 010 — endurance as burden
        "you talk and I stop hearing",      # 011 — anti-recognition
        "the kitchen light, still on",      # 100 — domestic trap
        "your breathing keeps me up",       # 101 — intimacy as invasion
        "we built these walls together",    # 110 — shared labor, shared prison
        "I know your evasions",             # 111 — knowing as weapon
    ],
    "line2": [
        "and something stays that should have left by now",  # 000
        "the years have worn us thin as excuses",            # 001
        "I count the ways your face has disappointed",       # 010
        "the fractures are just fractures, nothing more",    # 011
        "we speak the same exhausted arguments",             # 100
        "the bed remembers every turned-away back",          # 101
        "four lives demand more than this hollow truce",     # 110
        "the ordinary days are all there is",                # 111
    ],
    "line3": [
        "still, your weight",            # 000
        "the door slammed shut",          # 001
        "crumbs on the table",            # 010
        "your snore, the sheets",         # 011
        "a hand-worn groove",             # 100
        "walls closing in",               # 101
        "two clocks, no time",            # 110
        "the long way round",             # 111
    ],
}

# =============================================================================
# GHZ STATE: ALL-OR-NOTHING MARRIAGE
#
# The GHZ state produces only two poems. Every qubit agrees.
# Some days it's all tenderness. Some days it's all resentment.
# The superposition holds both at 50/50, always.
# =============================================================================

GHZ_TENDERNESS = """your hand finds mine
and something holds that should have broken
still, your warmth"""

GHZ_RESENTMENT = """I know your evasions
the ordinary days are all there is
the long way round"""

# =============================================================================
# CIRCUITS
# =============================================================================

def circuit_marriage_complementary(basis="Z"):
    """
    9-qubit entangled state for the marriage poem.

    Partial rotations create a state that is non-trivial in both Z and X bases.
    Entanglement between line groups ensures thematic coherence.

    Z-basis → tenderness poem
    X-basis → resentment poem
    Same state. Different reading. Both true.
    """
    lines = [
        "version 3.0",
        "qubit[9] q",
        "bit[9] b",
        "",
        "// Prepare the marriage state",
        "// Partial rotations: neither fully |0> nor |1>",
        "// Like a relationship that is neither purely love nor purely not",
        "Ry(1.0) q[0]",
        "Ry(0.8) q[1]",
        "Ry(1.2) q[2]",
        "Ry(0.6) q[3]",
        "Ry(1.4) q[4]",
        "Ry(0.9) q[5]",
        "Ry(1.1) q[6]",
        "Ry(0.7) q[7]",
        "Ry(1.3) q[8]",
        "",
        "// Entangle the lines — what one says shapes the others",
        "CNOT q[0], q[3]",
        "CNOT q[1], q[4]",
        "CNOT q[3], q[6]",
        "CNOT q[4], q[7]",
        "CNOT q[2], q[8]",
    ]

    if basis == "X":
        lines += [
            "",
            "// Change the lens — same marriage, different truth",
            "H q[0]", "H q[1]", "H q[2]",
            "H q[3]", "H q[4]", "H q[5]",
            "H q[6]", "H q[7]", "H q[8]",
        ]

    lines += ["", "b = measure q"]
    return "\n".join(lines)


def circuit_marriage_ghz():
    """
    GHZ state: the all-or-nothing marriage.
    Only two outcomes: total tenderness or total resentment.
    50/50, every time. No middle ground.
    """
    return """version 3.0
qubit[9] q
bit[9] b

// The all-or-nothing state
H q[0]
CNOT q[0], q[1]
CNOT q[1], q[2]
CNOT q[2], q[3]
CNOT q[3], q[4]
CNOT q[4], q[5]
CNOT q[5], q[6]
CNOT q[6], q[7]
CNOT q[7], q[8]

b = measure q"""


def circuit_marriage_w_state():
    """
    W state: exactly one qubit is |1>, the rest are |0>.
    Nine possible poems, each with one line of resentment
    breaking through the tenderness. The crack in the surface.
    """
    # W state for 9 qubits: |100000000> + |010000000> + ... + |000000001>
    # Approximate using a cascade of controlled rotations
    # This is an approximation — exact W state needs more gates
    import math

    lines = [
        "version 3.0",
        "qubit[9] q",
        "bit[9] b",
        "",
        "// W state: one crack in the surface",
        "// Exactly one line shifts, the rest hold",
    ]

    # Create W state via sequential rotations
    # Start with |100000000>, then distribute the excitation
    lines.append("X q[0]")  # Start with qubit 0 excited

    # Rotate to share excitation: Ry(2*arccos(sqrt(k/(k+1)))) on qubit k,
    # controlled on qubit k-1
    for k in range(1, 9):
        angle = 2 * math.acos(math.sqrt(k / (k + 1)))
        # Approximate CNOT + Ry as a controlled rotation
        # For emulator, use CNOT to transfer, then partial rotation
        lines.append(f"CNOT q[{k-1}], q[{k}]")
        lines.append(f"Ry({angle:.6f}) q[{k-1}]")
        lines.append(f"CNOT q[{k-1}], q[{k}]")

    lines += ["", "b = measure q"]
    return "\n".join(lines)


def circuit_marriage_decoherence(noise_level):
    """
    The marriage under stress.
    noise_level 0: perfect coherence, strong correlations
    noise_level 5: decoherence, the lines drift apart, meaning dissolves
    """
    lines = [
        "version 3.0",
        "qubit[9] q",
        "bit[9] b",
        "",
        f"// Marriage under stress (noise level {noise_level})",
        "Ry(1.0) q[0]", "Ry(0.8) q[1]", "Ry(1.2) q[2]",
        "Ry(0.6) q[3]", "Ry(1.4) q[4]", "Ry(0.9) q[5]",
        "Ry(1.1) q[6]", "Ry(0.7) q[7]", "Ry(1.3) q[8]",
        "",
        "CNOT q[0], q[3]",
        "CNOT q[1], q[4]",
        "CNOT q[3], q[6]",
        "CNOT q[4], q[7]",
        "CNOT q[2], q[8]",
    ]

    if noise_level > 0:
        lines.append("")
        lines.append("// The noise of years")
        angle = noise_level * 0.35
        for i in range(min(noise_level * 2, 9)):
            lines.append(f"Ry({angle:.3f}) q[{i}]")

    lines += ["", "b = measure q"]
    return "\n".join(lines)


# =============================================================================
# MEASUREMENT → POETRY
# =============================================================================

def bitstring_to_haiku(bitstring, word_bank):
    """Convert a 9-bit MSB-first string to a haiku."""
    g1 = int(bitstring[6:9], 2)  # qubits 0,1,2 → line 1
    g2 = int(bitstring[3:6], 2)  # qubits 3,4,5 → line 2
    g3 = int(bitstring[0:3], 2)  # qubits 6,7,8 → line 3

    line1 = word_bank["line1"][g1]
    line2 = word_bank["line2"][g2]
    line3 = word_bank["line3"][g3]

    return (line1, line2, line3)


def results_to_poems(results, word_bank, top_n=10):
    """Convert measurement results to ranked poems."""
    poems = Counter()
    total = sum(results.values())

    for bitstring, count in results.items():
        haiku = bitstring_to_haiku(bitstring, word_bank)
        poems[haiku] += count

    output = []
    for poem, count in poems.most_common(top_n):
        output.append({
            "lines": list(poem),
            "count": count,
            "probability": count / total,
            "text": "\n".join(poem),
        })

    return output


def print_poem_results(title, poems, show_n=5):
    """Pretty-print poem results."""
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}\n")

    for i, p in enumerate(poems[:show_n]):
        pct = p["probability"] * 100
        print(f"  [{pct:.1f}% — {p['count']} shots]")
        for line in p["lines"]:
            print(f"    {line}")
        print()


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    print("Quantum Poetry: Marriage as Superposition")
    print("=" * 50)
    print()
    print("Available circuits:")
    print()
    print("  1. circuit_marriage_complementary('Z')  — tenderness reading")
    print("  2. circuit_marriage_complementary('X')  — resentment reading")
    print("  3. circuit_marriage_ghz()               — all-or-nothing")
    print("  4. circuit_marriage_decoherence(0-5)    — stress test")
    print()
    print("Word banks loaded:")
    print(f"  TENDERNESS: {len(TENDERNESS['line1'])} × 3 lines")
    print(f"  RESENTMENT: {len(RESENTMENT['line1'])} × 3 lines")
    print()

    # Print the two GHZ poems
    print("GHZ Marriage (the all-or-nothing state):")
    print("-" * 40)
    print()
    print("  50.0% →")
    for line in GHZ_TENDERNESS.strip().split("\n"):
        print(f"    {line}")
    print()
    print("  50.0% →")
    for line in GHZ_RESENTMENT.strip().split("\n"):
        print(f"    {line}")
    print()

    # Print sample complementary lines
    print("Complementary pairs (same index, different basis):")
    print("-" * 40)
    for i in range(8):
        z = TENDERNESS["line1"][i]
        x = RESENTMENT["line1"][i]
        print(f"  Z: {z}")
        print(f"  X: {x}")
        print()
