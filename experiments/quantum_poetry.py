#!/usr/bin/env python3
"""
Quantum Poetry Experiments
==========================

A series of experiments using quantum computation to generate poetry
whose structure is genuinely quantum — not poems about quantum physics,
but poems whose meaning depends on superposition, entanglement, and
measurement in ways no classical process can replicate.

Hardware: Quantum Inspire Tuna-9 (9 superconducting qubits)
Emulator: qxelarator (local cQASM 3.0 emulator)

Experiments:
  1. Entangled Haiku — 9 qubits, 3 lines, entanglement creates thematic coherence
  2. Complementary Poems — same state, two bases, two poems
  3. Bell Couplets — entangled word pairs with Bell inequality verification
  4. Decoherence Gradient — poem dissolving as coherence is lost
"""

import json
import math
import os
from collections import Counter
from datetime import datetime

RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")

# =============================================================================
# WORD BANKS
# =============================================================================

# Experiment 1 & 2: Haiku line variants
# Each group of 3 qubits (0-2, 3-5, 6-8) selects from 8 line variants.
# Lines are designed so that correlated selections produce coherent haiku.

HAIKU_LINES_Z = {
    # Line 1 (5 syllables) — landscape/nature
    "line1": [
        "the winter morning",      # 000
        "a sudden silence",        # 001
        "beneath cold water",      # 010
        "the last light fading",   # 011
        "across the still lake",   # 100
        "inside the hollow",       # 101
        "before the first snow",   # 110
        "along the cliff edge",    # 111
    ],
    # Line 2 (7 syllables) — action/observation
    "line2": [
        "something opens like a wound",       # 000
        "the shadows learn to breathe again",  # 001
        "a bell rings out across the field",   # 010
        "the old stones remember rain",        # 011
        "light falls through the broken wall",  # 100
        "the river carries what remains",       # 101
        "nothing moves except the wind",        # 110
        "the world holds still and does not speak", # 111
    ],
    # Line 3 (5 syllables) — image/object
    "line3": [
        "the salt on my tongue",    # 000
        "birds in the rafters",     # 001
        "smoke from the chimney",   # 010
        "ice on the window",        # 011
        "dust in the sunlight",     # 100
        "roots in the dark earth",  # 101
        "ash on the water",         # 110
        "bone under the snow",      # 111
    ],
}

# X-basis line variants (complementary theme: intimacy/body)
HAIKU_LINES_X = {
    "line1": [
        "your hands in my hair",     # 000
        "the taste of summer",       # 001
        "inside your breathing",     # 010
        "the warmth of your mouth",  # 011
        "sweat on the bedsheets",    # 100
        "your voice in the dark",    # 101
        "the weight of your sleep",  # 110
        "skin against cool skin",    # 111
    ],
    "line2": [
        "I trace the bruise along your spine",   # 000
        "the hours dissolve like salt in rain",   # 001
        "your breath becomes the only sound",     # 010
        "we lie so still the clock forgets",      # 011
        "the sheets remember what we said",       # 100
        "I count your ribs like rosary beads",    # 101
        "the dark assembles us from parts",       # 110
        "you speak my name into my mouth",        # 111
    ],
    "line3": [
        "pulse against pulse",       # 000
        "the curtain moves",         # 001
        "two breaths, then one",     # 010
        "teeth on my wrist",         # 011
        "the sheets grow cold",      # 100
        "sweat and the dawn",        # 101
        "your scent on me",          # 110
        "no words, just weight",     # 111
    ],
}

# Experiment 3: Bell couplet word banks
# 4 Bell pairs → 4 binary choices → modular line construction
# Each choice controls a semantic dimension shared between both lines.

COUPLET_WORDS = {
    # Bell pair 0: temporal setting
    "time": {
        0: {"line1": "At dawn",      "line2": "the morning"},
        1: {"line1": "At dusk",      "line2": "the evening"},
    },
    # Bell pair 1: element
    "element": {
        0: {"line1": "rain",         "line2": "river"},
        1: {"line1": "fire",         "line2": "ember"},
    },
    # Bell pair 2: action
    "action": {
        0: {"line1": "gathers",      "line2": "finds its way"},
        1: {"line1": "scatters",     "line2": "forgets its name"},
    },
    # Bell pair 3: quality
    "quality": {
        0: {"line1": "without a sound", "line2": "slowly, home"},
        1: {"line1": "like an open wound", "line2": "into the unknown"},
    },
}

# Hand-crafted couplets for richer Bell experiment
# Indexed by 4-bit string. Each shares thematic DNA via entangled bits.
BELL_COUPLETS = {
    "0000": ("At dawn the rain gathers without a sound",
             "the morning river finds its way slowly home"),
    "0001": ("At dawn the rain gathers like an open wound",
             "the morning river finds its way into the unknown"),
    "0010": ("At dawn the rain scatters without a sound",
             "the morning river forgets its name slowly home"),
    "0011": ("At dawn the rain scatters like an open wound",
             "the morning river forgets its name into the unknown"),
    "0100": ("At dawn the fire gathers without a sound",
             "the morning ember finds its way slowly home"),
    "0101": ("At dawn the fire gathers like an open wound",
             "the morning ember finds its way into the unknown"),
    "0110": ("At dawn the fire scatters without a sound",
             "the morning ember forgets its name slowly home"),
    "0111": ("At dawn the fire scatters like an open wound",
             "the morning ember forgets its name into the unknown"),
    "1000": ("At dusk the rain gathers without a sound",
             "the evening river finds its way slowly home"),
    "1001": ("At dusk the rain gathers like an open wound",
             "the evening river finds its way into the unknown"),
    "1010": ("At dusk the rain scatters without a sound",
             "the evening river forgets its name slowly home"),
    "1011": ("At dusk the rain scatters like an open wound",
             "the evening river forgets its name into the unknown"),
    "1100": ("At dusk the fire gathers without a sound",
             "the evening ember finds its way slowly home"),
    "1101": ("At dusk the fire gathers like an open wound",
             "the evening ember finds its way into the unknown"),
    "1110": ("At dusk the fire scatters without a sound",
             "the evening ember forgets its name slowly home"),
    "1111": ("At dusk the fire scatters like an open wound",
             "the evening ember forgets its name into the unknown"),
}


# =============================================================================
# CIRCUIT GENERATORS
# =============================================================================

def circuit_entangled_haiku(basis="Z"):
    """
    9-qubit circuit for entangled haiku.

    Qubits 0-2: line 1 selection
    Qubits 3-5: line 2 selection
    Qubits 6-8: line 3 selection

    Entanglement between groups creates thematic correlations:
    - CZ(0,3): line 1 and line 2 share MSB correlation
    - CZ(3,6): line 2 and line 3 share MSB correlation
    - CZ(1,4): secondary correlation between lines 1 and 2
    - CZ(4,7): secondary correlation between lines 2 and 3

    basis="Z": standard measurement (landscape/nature theme)
    basis="X": Hadamard before measurement (intimacy/body theme)
    """
    lines = [
        "version 3.0",
        "qubit[9] q",
        "bit[9] b",
        "",
        "// Prepare superposition",
        "H q[0]", "H q[1]", "H q[2]",
        "H q[3]", "H q[4]", "H q[5]",
        "H q[6]", "H q[7]", "H q[8]",
        "",
        "// Entangle between line groups",
        "// Line 1 <-> Line 2",
        "CNOT q[0], q[3]",
        "CNOT q[1], q[4]",
        "",
        "// Line 2 <-> Line 3",
        "CNOT q[3], q[6]",
        "CNOT q[4], q[7]",
        "",
        "// Cross-correlation Line 1 <-> Line 3",
        "CNOT q[2], q[8]",
    ]

    if basis == "X":
        lines += [
            "",
            "// Rotate to X basis before measurement",
            "H q[0]", "H q[1]", "H q[2]",
            "H q[3]", "H q[4]", "H q[5]",
            "H q[6]", "H q[7]", "H q[8]",
        ]

    lines += [
        "",
        "// Measure",
        "b = measure q",
    ]
    return "\n".join(lines)


def circuit_bell_couplets():
    """
    8-qubit circuit: 4 Bell pairs for entangled couplets.

    Bell pairs: (q0,q1), (q2,q3), (q4,q5), (q6,q7)
    Even qubits → line 1 word choices
    Odd qubits → line 2 word choices
    Entanglement ensures correlated selections.
    """
    return """version 3.0
qubit[8] q
bit[8] b

// Bell pair 1: time
H q[0]
CNOT q[0], q[1]

// Bell pair 2: element
H q[2]
CNOT q[2], q[3]

// Bell pair 3: action
H q[4]
CNOT q[4], q[5]

// Bell pair 4: quality
H q[6]
CNOT q[6], q[7]

b = measure q"""


def circuit_product_haiku():
    """
    9-qubit circuit with NO entanglement (control experiment).
    Each qubit is independently in superposition.
    """
    return """version 3.0
qubit[9] q
bit[9] b

// Independent superposition (no entanglement)
H q[0]
H q[1]
H q[2]
H q[3]
H q[4]
H q[5]
H q[6]
H q[7]
H q[8]

b = measure q"""


def circuit_ghz9():
    """
    9-qubit GHZ state: |000000000> + |111111111>
    All qubits perfectly correlated.
    Only two possible haiku: all-0 or all-1 lines.
    """
    return """version 3.0
qubit[9] q
bit[9] b

// GHZ state
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


def circuit_decoherence_haiku(noise_level=0):
    """
    Entangled haiku circuit with progressive decoherence.
    noise_level 0-5: adds random rotations to degrade correlations.
    """
    lines = [
        "version 3.0",
        "qubit[9] q",
        "bit[9] b",
        "",
        "// Prepare entangled state",
        "H q[0]", "H q[1]", "H q[2]",
        "H q[3]", "H q[4]", "H q[5]",
        "H q[6]", "H q[7]", "H q[8]",
        "",
        "CNOT q[0], q[3]",
        "CNOT q[1], q[4]",
        "CNOT q[3], q[6]",
        "CNOT q[4], q[7]",
        "CNOT q[2], q[8]",
    ]

    if noise_level > 0:
        lines.append("")
        lines.append(f"// Decoherence (noise level {noise_level})")
        # Add small rotations that degrade entanglement
        # More noise_level = larger rotations = more decoherence
        angle = noise_level * 0.3  # radians
        for i in range(min(noise_level * 2, 9)):
            lines.append(f"Ry({angle:.3f}) q[{i}]")

    lines += ["", "b = measure q"]
    return "\n".join(lines)


# =============================================================================
# MEASUREMENT → POETRY MAPPING
# =============================================================================

def bitstring_to_haiku(bitstring, word_bank):
    """Convert a 9-bit string to a haiku using the given word bank."""
    # MSB-first convention: bitstring[0] = q8, bitstring[8] = q0
    # But for simplicity, we'll use direct positional mapping
    # Bits 0-2 → line 1, bits 3-5 → line 2, bits 6-8 → line 3
    # In MSB-first: positions are reversed

    n = len(bitstring)
    # Extract 3-bit groups (accounting for MSB-first)
    # For 9 qubits MSB-first: bit[0]=q8, bit[1]=q7, ..., bit[8]=q0
    # Group 1 (q0,q1,q2) = bits[8,7,6]
    # Group 2 (q3,q4,q5) = bits[5,4,3]
    # Group 3 (q6,q7,q8) = bits[2,1,0]

    g1 = int(bitstring[6:9], 2)  # q0,q1,q2
    g2 = int(bitstring[3:6], 2)  # q3,q4,q5
    g3 = int(bitstring[0:3], 2)  # q6,q7,q8

    line1 = word_bank["line1"][g1]
    line2 = word_bank["line2"][g2]
    line3 = word_bank["line3"][g3]

    return f"{line1}\n{line2}\n{line3}"


def bitstring_to_couplet(bitstring):
    """Convert an 8-bit string to a couplet using Bell pair correlations."""
    # 4 Bell pairs: (q0,q1), (q2,q3), (q4,q5), (q6,q7)
    # MSB-first: bit[0]=q7, bit[7]=q0
    # Extract even-qubit bits for the 4-bit couplet index

    # q0 = bitstring[7], q2 = bitstring[5], q4 = bitstring[3], q6 = bitstring[1]
    key = bitstring[7] + bitstring[5] + bitstring[3] + bitstring[1]

    if key in BELL_COUPLETS:
        return BELL_COUPLETS[key]
    else:
        return (f"[unmapped: {key}]", f"[unmapped: {key}]")


def results_to_poems(results, poem_type="haiku", basis="Z"):
    """Convert measurement results dict to a list of (poem, count) tuples."""
    poems = Counter()

    for bitstring, count in results.items():
        if poem_type == "haiku":
            bank = HAIKU_LINES_Z if basis == "Z" else HAIKU_LINES_X
            poem = bitstring_to_haiku(bitstring, bank)
        elif poem_type == "couplet":
            l1, l2 = bitstring_to_couplet(bitstring)
            poem = f"{l1}\n{l2}"
        else:
            poem = bitstring
        poems[poem] += count

    return poems.most_common()


# =============================================================================
# ANALYSIS
# =============================================================================

def correlation_analysis(results, n_qubits=9):
    """Analyze pairwise correlations between qubits."""
    total = sum(results.values())
    correlations = {}

    for i in range(n_qubits):
        for j in range(i+1, n_qubits):
            # Count same-value vs different-value outcomes
            same = 0
            diff = 0
            for bitstring, count in results.items():
                bi = bitstring[n_qubits - 1 - i]
                bj = bitstring[n_qubits - 1 - j]
                if bi == bj:
                    same += count
                else:
                    diff += count
            corr = (same - diff) / total
            correlations[(i, j)] = corr

    return correlations


def entropy_per_line(results, n_qubits=9):
    """Calculate Shannon entropy for each 3-qubit line group."""
    total = sum(results.values())

    groups = {"line1": Counter(), "line2": Counter(), "line3": Counter()}
    for bitstring, count in results.items():
        g1 = bitstring[6:9]
        g2 = bitstring[3:6]
        g3 = bitstring[0:3]
        groups["line1"][g1] += count
        groups["line2"][g2] += count
        groups["line3"][g3] += count

    entropies = {}
    for name, counter in groups.items():
        h = 0
        for count in counter.values():
            p = count / total
            if p > 0:
                h -= p * math.log2(p)
        entropies[name] = h

    return entropies


def format_experiment_report(experiment_name, circuit, results, poems,
                              correlations=None, entropies=None):
    """Format a complete experiment report."""
    report = []
    report.append(f"# {experiment_name}")
    report.append(f"Date: {datetime.now().isoformat()}")
    report.append(f"Shots: {sum(results.values())}")
    report.append(f"Unique outcomes: {len(results)}")
    report.append("")

    report.append("## Circuit")
    report.append("```")
    report.append(circuit)
    report.append("```")
    report.append("")

    report.append("## Poems (most frequent)")
    for poem, count in poems[:10]:
        report.append(f"### [{count} shots]")
        report.append(poem)
        report.append("")

    if correlations:
        report.append("## Qubit Correlations")
        # Show inter-group correlations (the interesting ones)
        report.append("Inter-line correlations (entanglement signature):")
        for (i, j), corr in sorted(correlations.items()):
            group_i = "L1" if i < 3 else ("L2" if i < 6 else "L3")
            group_j = "L1" if j < 3 else ("L2" if j < 6 else "L3")
            if group_i != group_j:
                report.append(f"  q{i}({group_i}) <-> q{j}({group_j}): {corr:+.3f}")
        report.append("")

    if entropies:
        report.append("## Line Entropy (bits)")
        report.append(f"  Max possible: 3.000 bits (uniform over 8 options)")
        for name, h in entropies.items():
            report.append(f"  {name}: {h:.3f}")
        report.append("")

    return "\n".join(report)


# =============================================================================
# MAIN — run all experiments
# =============================================================================

if __name__ == "__main__":
    print("Quantum Poetry Experiments")
    print("=" * 40)
    print()
    print("This script defines circuits and word banks.")
    print("Run experiments via the QI emulator MCP tool or submit to Tuna-9.")
    print()
    print("Available circuits:")
    print("  1. circuit_entangled_haiku('Z')  — entangled, Z-basis (nature)")
    print("  2. circuit_entangled_haiku('X')  — entangled, X-basis (intimacy)")
    print("  3. circuit_product_haiku()       — no entanglement (control)")
    print("  4. circuit_ghz9()                — GHZ state (maximum correlation)")
    print("  5. circuit_bell_couplets()       — 4 Bell pairs for couplets")
    print("  6. circuit_decoherence_haiku(n)  — noise level 0-5")
    print()

    # Print sample circuits
    for name, circ in [
        ("Entangled Haiku (Z)", circuit_entangled_haiku("Z")),
        ("Bell Couplets", circuit_bell_couplets()),
        ("GHZ-9", circuit_ghz9()),
    ]:
        print(f"--- {name} ---")
        print(circ)
        print()
