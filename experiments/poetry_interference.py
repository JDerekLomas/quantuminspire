#!/usr/bin/env python3
"""
Quantum Poetry: Interference Draft
====================================

The marriage experiment gives Z-basis (tenderness) and X-basis (resentment).
The interference draft fills the space between: measure at intermediate
rotation angles. At theta=pi/4, some poems are amplified (constructive
interference) and others suppressed (destructive). This is not interpolation
— it's genuine quantum interference.

Before measurement, apply Rz(2*theta); Ry(theta) on all 9 qubits.
  theta=0:    identity    -> Z-basis (tenderness)
  theta=pi/2: Rz(pi)+Ry(pi/2) = H -> X-basis (resentment)

Rz is virtual on superconducting hardware (zero noise cost).
All gates native (Rz, Ry, CZ). CompileStage.ROUTING.

Hardware: Quantum Inspire Tuna-9 (9 superconducting qubits)
"""

import json
import math
import os
import sys
import time
from collections import Counter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".venv", "lib", "python3.12", "site-packages"))

RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")
PI = math.pi

# Tuna-9 topology qubit grouping (matching submit_quantum_poetry.py):
#   Line 1: q0, q1, q3  (edges: 0-1, 1-3)
#   Line 2: q2, q4, q6  (edges: 2-4, 4-6)
#   Line 3: q5, q7, q8  (edges: 5-7, 7-8)
# Entanglement: CZ(0,2), CZ(1,4), CZ(4,7), CZ(2,5)

THETA_LABELS = {
    0:        "0 (Z-basis)",
    PI / 8:   "pi/8 (22.5 deg)",
    PI / 4:   "pi/4 (45 deg)",
    3 * PI / 8: "3pi/8 (67.5 deg)",
    PI / 2:   "pi/2 (X-basis)",
}


def circuit_interference(theta: float) -> str:
    """
    Generate cQASM 3.0 circuit for the marriage state with pre-measurement
    rotation Rz(2*theta) + Ry(theta) on all 9 qubits.

    At theta=0: identity (Z-basis, tenderness)
    At theta=pi/2: Rz(pi)+Ry(pi/2) = H (X-basis, resentment)
    """
    lines = [
        "version 3.0",
        "qubit[9] q",
        "bit[9] b",
        "",
        "// Prepare the marriage state — partial rotations",
        "Ry(1.0) q[0]",
        "Ry(0.8) q[1]",
        "Ry(1.2) q[3]",
        "Ry(0.6) q[2]",
        "Ry(1.4) q[4]",
        "Ry(0.9) q[6]",
        "Ry(1.1) q[5]",
        "Ry(0.7) q[7]",
        "Ry(1.3) q[8]",
        "",
        "// Entangle line groups — native CZ on physical edges",
        "CZ q[0], q[2]",
        "CZ q[1], q[4]",
        "CZ q[4], q[7]",
        "CZ q[2], q[5]",
    ]

    rz_angle = 2 * theta
    ry_angle = theta

    if abs(theta) > 1e-10:  # Skip identity rotation
        lines += [
            "",
            f"// Interference rotation: Rz({rz_angle:.6f}) + Ry({ry_angle:.6f})",
            f"// theta = {theta:.6f} rad ({math.degrees(theta):.1f} deg)",
        ]
        for i in range(9):
            if abs(rz_angle) > 1e-10:
                lines.append(f"Rz({rz_angle:.6f}) q[{i}]")
            lines.append(f"Ry({ry_angle:.6f}) q[{i}]")

    lines += ["", "b = measure q"]
    return "\n".join(lines)


# Word banks (same as submit_quantum_poetry.py / PageClient.tsx)
TENDERNESS = {
    "line1": ["your hand finds mine", "the children sleeping", "seventeen winters",
              "you laugh and I remember", "the kitchen light still on",
              "your breathing in the dark", "we built this room together",
              "I know your silences"],
    "line2": ["and something holds that should have broken",
              "the years have made us porous to each other",
              "I trace the atlas of your changing face",
              "the fractures are the places where light enters",
              "we speak a language no one else can hear",
              "the bed remembers every shape we've been",
              "four lives grew upward from this tangled root",
              "the ordinary days are what I'll grieve"],
    "line3": ["still, your warmth", "the door left open", "bread on the table",
              "your scent, the sheets", "a hand-worn ring", "roots under stone",
              "two clocks, one time", "the long way home"],
}

RESENTMENT = {
    "line1": ["your silence fills the room", "the children watch us watching",
              "seventeen years of this", "you talk and I stop hearing",
              "the kitchen light, still on", "your breathing keeps me up",
              "we built these walls together", "I know your evasions"],
    "line2": ["and something stays that should have left by now",
              "the years have worn us thin as excuses",
              "I count the ways your face has disappointed",
              "the fractures are just fractures, nothing more",
              "we speak the same exhausted arguments",
              "the bed remembers every turned-away back",
              "four lives demand more than this hollow truce",
              "the ordinary days are all there is"],
    "line3": ["still, your weight", "the door slammed shut", "crumbs on the table",
              "your snore, the sheets", "a hand-worn groove", "walls closing in",
              "two clocks, no time", "the long way round"],
}


def bitstring_to_poem(bitstring: str, bank: dict) -> tuple:
    """Convert 9-bit MSB-first bitstring to poem tuple.
    Qubit grouping: Line1=q0,q1,q3  Line2=q2,q4,q6  Line3=q5,q7,q8
    """
    q = {}
    for i in range(9):
        q[i] = int(bitstring[8 - i])

    g1 = q[3] * 4 + q[1] * 2 + q[0]
    g2 = q[6] * 4 + q[4] * 2 + q[2]
    g3 = q[8] * 4 + q[7] * 2 + q[5]

    return (bank["line1"][g1], bank["line2"][g2], bank["line3"][g3])


def analyze_distribution(counts: dict, total: int) -> dict:
    """Compute distribution statistics."""
    import math as m

    probs = {k: v / total for k, v in counts.items()}
    entropy = -sum(p * m.log2(p) for p in probs.values() if p > 0)

    # Get poems in both bases
    z_poems = Counter()
    x_poems = Counter()
    for bs, count in counts.items():
        z_poems[bitstring_to_poem(bs, TENDERNESS)] += count
        x_poems[bitstring_to_poem(bs, RESENTMENT)] += count

    def top_poems(poem_counts, n=5):
        return [
            {"lines": list(p), "count": c, "probability": c / total}
            for p, c in poem_counts.most_common(n)
        ]

    return {
        "total_shots": total,
        "unique_bitstrings": len(counts),
        "entropy_bits": round(entropy, 3),
        "max_entropy": 9.0,
        "top_bitstrings": sorted(counts.items(), key=lambda x: -x[1])[:10],
        "top_z_poems": top_poems(z_poems),
        "top_x_poems": top_poems(x_poems),
    }


def test_emulator():
    """Run all 5 theta values on local emulator."""
    import qxelarator

    thetas = [0, PI / 8, PI / 4, 3 * PI / 8, PI / 2]
    results = {}

    print("=" * 60)
    print("  INTERFERENCE DRAFT — EMULATOR TEST")
    print("=" * 60)

    for theta in thetas:
        label = THETA_LABELS[theta]
        print(f"\n--- theta = {label} ---")

        cqasm = circuit_interference(theta)
        sim = qxelarator.execute_string(cqasm, 4096)
        counts = sim.results

        total = sum(counts.values())
        analysis = analyze_distribution(counts, total)

        print(f"  Unique bitstrings: {analysis['unique_bitstrings']}")
        print(f"  Entropy: {analysis['entropy_bits']:.3f} / 9.0 bits")

        print(f"\n  Top tenderness readings:")
        for p in analysis["top_z_poems"][:3]:
            pct = p["probability"] * 100
            print(f"    [{pct:.1f}%] {p['lines'][0]}")

        print(f"\n  Top resentment readings:")
        for p in analysis["top_x_poems"][:3]:
            pct = p["probability"] * 100
            print(f"    [{pct:.1f}%] {p['lines'][0]}")

        results[f"theta_{theta:.4f}"] = {
            "theta_rad": theta,
            "theta_deg": math.degrees(theta),
            "label": label,
            "counts": dict(counts),
            "analysis": {
                "total_shots": analysis["total_shots"],
                "unique_bitstrings": analysis["unique_bitstrings"],
                "entropy_bits": analysis["entropy_bits"],
                "top_z_poems": analysis["top_z_poems"],
                "top_x_poems": analysis["top_x_poems"],
            },
        }

    # Save emulator results
    outpath = os.path.join(RESULTS_DIR, "poetry-interference-emulator.json")
    with open(outpath, "w") as f:
        json.dump({
            "experiment": "poetry-interference-draft",
            "backend": "qxelarator emulator",
            "date": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "shots": 4096,
            "thetas": results,
        }, f, indent=2)
    print(f"\nEmulator results saved to {outpath}")
    return results


def submit_tuna9():
    """Submit 3 new circuits (theta=pi/8, pi/4, 3pi/8) to Tuna-9."""
    from quantuminspire.util.api.remote_backend import RemoteBackend
    from quantuminspire.sdk.models.cqasm_algorithm import CqasmAlgorithm
    from quantuminspire.sdk.models.job_options import JobOptions
    from compute_api_client import CompileStage

    # Monkey-patch for image_id length bug
    from compute_api_client.models.backend_type import BackendType as BT
    for field in BT.__fields__.values():
        if field.alias == 'image_id' and hasattr(field, 'max_length'):
            field.max_length = 64

    backend = RemoteBackend()
    options = JobOptions(number_of_shots=4096)

    new_thetas = [PI / 8, PI / 4, 3 * PI / 8]
    job_ids = {}

    for theta in new_thetas:
        deg = math.degrees(theta)
        name = f"interference-{deg:.0f}deg"
        cqasm = circuit_interference(theta)
        print(f"Submitting {name} (theta={theta:.4f} rad)...")

        class _NativeAlgo(CqasmAlgorithm):
            @property
            def compile_stage(self):
                return CompileStage.ROUTING

        algo = _NativeAlgo(platform_name="Quantum Inspire", program_name=name)
        algo._content = cqasm
        job_id = backend.run(algo, backend_type_id=6, options=options)
        job_ids[name] = {"job_id": job_id, "theta_rad": theta, "theta_deg": deg}
        print(f"  Job ID: {job_id}")

    # Save job IDs
    outpath = os.path.join(RESULTS_DIR, "poetry-interference-tuna9-jobs.json")
    result = {
        "experiment": "poetry-interference-draft",
        "date": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "backend": "Tuna-9 (backend_type_id=6)",
        "shots": 4096,
        "compile_stage": "ROUTING",
        "note": "theta=0 and theta=pi/2 data already exists from marriage experiment (jobs 426093, 426094)",
        "existing_jobs": {
            "marriage-z-basis (theta=0)": 426093,
            "marriage-x-basis (theta=pi/2)": 426094,
        },
        "new_jobs": job_ids,
    }
    with open(outpath, "w") as f:
        json.dump(result, f, indent=2)
    print(f"\nJob IDs saved to {outpath}")
    return job_ids


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Quantum Poetry: Interference Draft")
    parser.add_argument("action", choices=["test", "submit", "both"],
                        help="test=emulator, submit=Tuna-9, both=test then submit")
    args = parser.parse_args()

    if args.action in ("test", "both"):
        test_emulator()

    if args.action in ("submit", "both"):
        submit_tuna9()
