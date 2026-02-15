#!/usr/bin/env python3
"""Submit 5 independent repetitions of H2 2-qubit VQE circuits to Tuna-9.

Generates 5 reps × 7 distances × 3 bases = 105 VQE circuits
+ 4 end-of-batch calibration circuits = 109 total.

Uses fresh calibration from verification run (429925-429928) as primary.
End-of-batch calibration checks for drift.

Standard practice: always run multiple reps for proper error bars.
"""

import json
import time
import sys
from pathlib import Path
from datetime import datetime, timezone

TUNA9_BACKEND_ID = 6
N_SHOTS = 4096
QA, QB = 4, 6  # Physical qubits

# Bond distances and parameters from replication-tuna9-circuits.json
DISTANCES = [
    {"R": 0.500, "alpha": -0.143585, "g0": 0.12316306, "g1": 0.58307965, "g4": 0.08443511, "fci": -1.05515976, "hf": -1.04299624},
    {"R": 0.700, "alpha": -0.209565, "g0": -0.27643762, "g1": 0.42045571, "g4": 0.08950029, "fci": -1.13618945, "hf": -1.11734900},
    {"R": 0.735, "alpha": -0.223390, "g0": -0.32112409, "g1": 0.39793745, "g4": 0.09046560, "fci": -1.13730604, "hf": -1.11699900},
    {"R": 0.900, "alpha": -0.298167, "g0": -0.47233944, "g1": 0.30978731, "g4": 0.09528584, "fci": -1.12056029, "hf": -1.09191400},
    {"R": 1.100, "alpha": -0.413789, "g0": -0.57374710, "g1": 0.23139590, "g4": 0.10161111, "fci": -1.07919296, "hf": -1.03560800},
    {"R": 1.500, "alpha": -0.726723, "g0": -0.65267092, "g1": 0.12910133, "g4": 0.11476796, "fci": -0.99814937, "hf": -0.91087400},
    {"R": 2.000, "alpha": -1.133286, "g0": -0.66253664, "g1": 0.06062802, "g4": 0.12956923, "fci": -0.94864112, "hf": -0.78379300},
]


def gen_circuit(alpha, basis):
    """Generate cQASM 3.0 circuit for H2 2-qubit VQE."""
    lines = ["version 3.0", "qubit[9] q"]
    lines.append(f"X q[{QA}]")
    lines.append(f"Ry({alpha:.6f}) q[{QB}]")
    lines.append(f"Ry(-1.570796) q[{QA}]")
    lines.append(f"CZ q[{QB}], q[{QA}]")

    if basis == 'X':
        lines.append(f"Ry(-1.570796) q[{QB}]")
    elif basis == 'Y':
        lines.append(f"Ry(1.570796) q[{QA}]")
        lines.append(f"Rz(-1.570796) q[{QA}]")
        lines.append(f"Ry(1.570796) q[{QA}]")
        lines.append(f"Rz(1.570796) q[{QA}]")
        lines.append(f"Rz(-1.570796) q[{QB}]")
        lines.append(f"Ry(1.570796) q[{QB}]")
        lines.append(f"Rz(1.570796) q[{QB}]")
    else:  # Z
        lines.append(f"Ry(1.570796) q[{QA}]")

    lines.append("bit[9] b")
    lines.append("b = measure q")
    return '\n'.join(lines)


def gen_cal_circuit(state):
    """Generate calibration circuit for a 2-qubit state."""
    lines = ["version 3.0", "qubit[9] q"]
    if state in ("10", "11"):
        lines.append(f"X q[{QA}]")
    if state in ("01", "11"):
        lines.append(f"X q[{QB}]")
    if state == "00":
        lines.append(f"Ry(0) q[{QA}]")  # no-op to avoid QI empty circuit bug
    lines.append("bit[9] b")
    lines.append("b = measure q")
    return '\n'.join(lines)


def submit_all():
    """Generate and submit all circuits."""
    from compute_api_client import CompileStage
    from quantuminspire.sdk.models.cqasm_algorithm import CqasmAlgorithm
    from quantuminspire.sdk.models.job_options import JobOptions
    from quantuminspire.util.api.remote_backend import RemoteBackend

    class PrecompiledAlgorithm(CqasmAlgorithm):
        @property
        def compile_stage(self):
            return CompileStage.ROUTING

    # Generate all circuits
    circuits = {}
    for rep in range(5):
        for d in DISTANCES:
            for basis in ['Z', 'X', 'Y']:
                name = f"rep{rep}_R{d['R']:.3f}_{basis}"
                circuits[name] = gen_circuit(d['alpha'], basis)

    # End-of-batch calibration
    for state in ["00", "10", "01", "11"]:
        circuits[f"cal_end_{state}"] = gen_cal_circuit(state)

    print(f"Generated {len(circuits)} circuits "
          f"(5 reps × {len(DISTANCES)} distances × 3 bases + 4 cal)")

    # Submit
    backend = RemoteBackend()
    options = JobOptions(number_of_shots=N_SHOTS)
    print(f"Connected to QI. Submitting to Tuna-9 (id={TUNA9_BACKEND_ID})...")

    job_ids = {}
    n_ok = 0
    n_fail = 0
    for i, (name, cqasm) in enumerate(circuits.items()):
        algo = PrecompiledAlgorithm(
            platform_name="Quantum Inspire",
            program_name=name
        )
        algo._content = cqasm

        try:
            job_id = backend.run(algo, backend_type_id=TUNA9_BACKEND_ID, options=options)
            job_ids[name] = job_id
            n_ok += 1
            if (i + 1) % 21 == 0 or i == len(circuits) - 1:
                print(f"  [{i+1}/{len(circuits)}] {name} → job {job_id}")
        except Exception as e:
            job_ids[name] = f"FAILED: {e}"
            n_fail += 1
            print(f"  [{i+1}/{len(circuits)}] {name} → FAILED: {e}")

        if i < len(circuits) - 1:
            time.sleep(0.3)

    # Save
    output = {
        "experiment": "H2 2-qubit VQE 5-rep statistical run",
        "submitted": datetime.now(timezone.utc).isoformat(),
        "backend": "Tuna-9",
        "physical_qubits": [QA, QB],
        "n_shots": N_SHOTS,
        "n_reps": 5,
        "distances": DISTANCES,
        "start_calibration_jobs": {
            "00": 429925, "10": 429926, "01": 429927, "11": 429928
        },
        "job_ids": job_ids,
        "n_submitted": n_ok,
        "n_failed": n_fail,
    }

    outfile = Path("experiments/results/h2-5rep-job-ids.json")
    with open(outfile, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nSubmitted: {n_ok}, Failed: {n_fail}")
    print(f"Job IDs saved to: {outfile}")
    if n_fail > 0:
        print("WARNING: Some circuits failed to submit!")

    return output


if __name__ == "__main__":
    submit_all()
