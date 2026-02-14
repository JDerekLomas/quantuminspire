#!/usr/bin/env python3
"""
Submit Quantum Marriage poems to Tuna-9 hardware.

Topology-aware circuit using native gates (CZ, Ry, Rz).
Uses CompileStage.ROUTING to skip server-side OpenSquirrel.

Qubit grouping (matching Tuna-9 physical edges):
  Line 1: q0, q1, q3  (edges: 0-1, 1-3)
  Line 2: q2, q4, q6  (edges: 2-4, 4-6)
  Line 3: q5, q7, q8  (edges: 5-7, 7-8)

Inter-group entanglement:
  CZ(0,2): line1 <-> line2
  CZ(1,4): line1 <-> line2
  CZ(4,7): line2 <-> line3
  CZ(2,5): line2 <-> line3
"""

import json
import math
import os
import sys
import time

# Add the venv path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".venv", "lib", "python3.12", "site-packages"))

RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")
PI = math.pi

# =============================================================================
# NATIVE GATE CIRCUITS
# =============================================================================

def circuit_z_basis():
    """Marriage poem, Z-basis (tenderness reading), native gates."""
    return """version 3.0
qubit[9] q
bit[9] b

// Prepare the marriage state — partial rotations
// Line 1 qubits (q0, q1, q3)
Ry(1.0) q[0]
Ry(0.8) q[1]
Ry(1.2) q[3]

// Line 2 qubits (q2, q4, q6)
Ry(0.6) q[2]
Ry(1.4) q[4]
Ry(0.9) q[6]

// Line 3 qubits (q5, q7, q8)
Ry(1.1) q[5]
Ry(0.7) q[7]
Ry(1.3) q[8]

// Entangle line groups — native CZ gates on physical edges
// Line 1 <-> Line 2
CZ q[0], q[2]
CZ q[1], q[4]

// Line 2 <-> Line 3
CZ q[4], q[7]
CZ q[2], q[5]

b = measure q"""


def circuit_x_basis():
    """Marriage poem, X-basis (resentment reading), native gates.
    Same state as Z-basis, but H on all qubits before measurement.
    H = Rz(pi) then Ry(pi/2) in cQASM line order."""
    return f"""version 3.0
qubit[9] q
bit[9] b

// Prepare the marriage state — same as Z-basis
Ry(1.0) q[0]
Ry(0.8) q[1]
Ry(1.2) q[3]
Ry(0.6) q[2]
Ry(1.4) q[4]
Ry(0.9) q[6]
Ry(1.1) q[5]
Ry(0.7) q[7]
Ry(1.3) q[8]

// Entangle
CZ q[0], q[2]
CZ q[1], q[4]
CZ q[4], q[7]
CZ q[2], q[5]

// Change the lens: H = Rz(pi); Ry(pi/2)
Rz({PI:.6f}) q[0]
Ry({PI/2:.6f}) q[0]
Rz({PI:.6f}) q[1]
Ry({PI/2:.6f}) q[1]
Rz({PI:.6f}) q[2]
Ry({PI/2:.6f}) q[2]
Rz({PI:.6f}) q[3]
Ry({PI/2:.6f}) q[3]
Rz({PI:.6f}) q[4]
Ry({PI/2:.6f}) q[4]
Rz({PI:.6f}) q[5]
Ry({PI/2:.6f}) q[5]
Rz({PI:.6f}) q[6]
Ry({PI/2:.6f}) q[6]
Rz({PI:.6f}) q[7]
Ry({PI/2:.6f}) q[7]
Rz({PI:.6f}) q[8]
Ry({PI/2:.6f}) q[8]

b = measure q"""


def circuit_ghz():
    """GHZ state: all-or-nothing marriage, native gates.
    CNOT(a,b) = Ry(-pi/2,b); CZ(a,b); Ry(pi/2,b)

    Chain: q0 -> q1 -> q3 -> q1 -> q4 -> q2 -> q5 -> q7 -> q8
    Wait, need a valid CNOT chain through connected edges.

    Available edges: 0-1, 0-2, 1-3, 1-4, 2-4, 2-5, 4-6, 4-7, 5-7, 6-8, 7-8

    GHZ chain: H(q0), CNOT(0,1), CNOT(1,3), CNOT(1,4), CNOT(0,2),
               CNOT(2,5), CNOT(4,6), CNOT(4,7), CNOT(7,8)
    That's H + 8 CNOTs = H + 24 native gates
    """
    hp = PI / 2   # pi/2
    hm = -PI / 2  # -pi/2

    return f"""version 3.0
qubit[9] q
bit[9] b

// GHZ state via CNOT chain, native gates
// H on q0: Rz(pi); Ry(pi/2)
Rz({PI:.6f}) q[0]
Ry({hp:.6f}) q[0]

// CNOT(0,1): Ry(-pi/2,1); CZ(0,1); Ry(pi/2,1)
Ry({hm:.6f}) q[1]
CZ q[0], q[1]
Ry({hp:.6f}) q[1]

// CNOT(1,3)
Ry({hm:.6f}) q[3]
CZ q[1], q[3]
Ry({hp:.6f}) q[3]

// CNOT(1,4)
Ry({hm:.6f}) q[4]
CZ q[1], q[4]
Ry({hp:.6f}) q[4]

// CNOT(0,2)
Ry({hm:.6f}) q[2]
CZ q[0], q[2]
Ry({hp:.6f}) q[2]

// CNOT(2,5)
Ry({hm:.6f}) q[5]
CZ q[2], q[5]
Ry({hp:.6f}) q[5]

// CNOT(4,6)
Ry({hm:.6f}) q[6]
CZ q[4], q[6]
Ry({hp:.6f}) q[6]

// CNOT(4,7)
Ry({hm:.6f}) q[7]
CZ q[4], q[7]
Ry({hp:.6f}) q[7]

// CNOT(7,8)
Ry({hm:.6f}) q[8]
CZ q[7], q[8]
Ry({hp:.6f}) q[8]

b = measure q"""


# =============================================================================
# BITSTRING → POEM MAPPING
# =============================================================================

# Word banks (same as quantum_poetry_marriage.py)
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

    MSB-first positions: q8=bs[0], q7=bs[1], q6=bs[2], q5=bs[3],
                         q4=bs[4], q3=bs[5], q2=bs[6], q1=bs[7], q0=bs[8]
    """
    q = {}
    for i in range(9):
        q[i] = int(bitstring[8 - i])

    # Line 1: q3*4 + q1*2 + q0
    g1 = q[3] * 4 + q[1] * 2 + q[0]
    # Line 2: q6*4 + q4*2 + q2
    g2 = q[6] * 4 + q[4] * 2 + q[2]
    # Line 3: q8*4 + q7*2 + q5
    g3 = q[8] * 4 + q[7] * 2 + q[5]

    return (bank["line1"][g1], bank["line2"][g2], bank["line3"][g3])


# =============================================================================
# EMULATOR VERIFICATION
# =============================================================================

def test_on_emulator():
    """Test all circuits on the local emulator before hardware submission."""
    import qxelarator

    print("=" * 60)
    print("  EMULATOR VERIFICATION")
    print("=" * 60)

    for name, circ, bank in [
        ("Z-basis (tenderness)", circuit_z_basis(), TENDERNESS),
        ("X-basis (resentment)", circuit_x_basis(), RESENTMENT),
        ("GHZ (all-or-nothing)", circuit_ghz(), TENDERNESS),
    ]:
        print(f"\n--- {name} ---")

        sim = qxelarator.execute_string(circ, 1024)
        counts = sim.results

        # Map to poems
        from collections import Counter
        poem_counts = Counter()
        for bs, count in counts.items():
            poem = bitstring_to_poem(bs, bank)
            poem_counts[poem] += count

        # Show top poems
        print(f"  Unique bitstrings: {len(counts)}")
        print(f"  Unique poems: {len(poem_counts)}")
        for poem, count in poem_counts.most_common(3):
            pct = count / 1024 * 100
            print(f"\n  [{pct:.1f}% — {count} shots]")
            for line in poem:
                print(f"    {line}")

    print()


# =============================================================================
# HARDWARE SUBMISSION
# =============================================================================

def submit_to_tuna9():
    """Submit all three circuits to Tuna-9."""
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

    circuits = {
        "marriage-z-basis": circuit_z_basis(),
        "marriage-x-basis": circuit_x_basis(),
        "marriage-ghz": circuit_ghz(),
    }

    job_ids = {}
    for name, cqasm in circuits.items():
        print(f"Submitting {name}...")

        # Create algorithm with CompileStage.ROUTING
        class _NativeAlgo(CqasmAlgorithm):
            @property
            def compile_stage(self):
                return CompileStage.ROUTING

        algo = _NativeAlgo(platform_name="Quantum Inspire", program_name=name)
        algo._content = cqasm
        job_id = backend.run(algo, backend_type_id=6, options=options)
        job_ids[name] = job_id
        print(f"  Job ID: {job_id}")

    # Save job IDs
    result = {
        "experiment": "quantum-poetry-marriage",
        "date": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "backend": "Tuna-9 (backend_type_id=6)",
        "shots": 4096,
        "compile_stage": "ROUTING",
        "circuits": {
            name: {
                "job_id": jid,
                "status": "SUBMITTED",
            }
            for name, jid in job_ids.items()
        },
    }

    outpath = os.path.join(RESULTS_DIR, "quantum-poetry-marriage-jobs.json")
    with open(outpath, "w") as f:
        json.dump(result, f, indent=2)
    print(f"\nJob IDs saved to {outpath}")

    return job_ids


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Quantum Marriage Poems on Tuna-9")
    parser.add_argument("action", choices=["test", "submit", "both"],
                        help="test=emulator only, submit=hardware, both=test then submit")
    args = parser.parse_args()

    if args.action in ("test", "both"):
        test_on_emulator()

    if args.action in ("submit", "both"):
        job_ids = submit_to_tuna9()
        print("\nCircuits submitted to Tuna-9. Use qi_check_job to poll status.")
        for name, jid in job_ids.items():
            print(f"  {name}: job {jid}")
