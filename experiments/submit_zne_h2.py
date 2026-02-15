#!/usr/bin/env python3
"""Submit ZNE circuits for H2 2-qubit VQE on Tuna-9.

Zero Noise Extrapolation via local CZ gate folding:
  fold=1: ...CZ...           (1 CZ, baseline)
  fold=3: ...CZ·CZ·CZ...    (3 CZ, since CZ†=CZ)
  fold=5: ...CZ·CZ·CZ·CZ·CZ (5 CZ)

Richardson extrapolation to zero-noise limit:
  Linear (f=1,3):   E(0) = (3·E(1) - E(3)) / 2
  Quadratic (f=1,3,5): E(0) = (15·E(1) - 10·E(3) + 3·E(5)) / 8

5 reps per circuit for proper error bars.
Total: 3 folds × 7 distances × 3 bases × 5 reps = 315 VQE + 8 cal = 323 circuits.
"""

import json
import time
from pathlib import Path
from datetime import datetime, timezone

TUNA9_BACKEND_ID = 6
N_SHOTS = 4096
QA, QB = 4, 6  # Physical qubits
FOLDS = [1, 3, 5]
N_REPS = 5

# Bond distances and Hamiltonian coefficients
DISTANCES = [
    {"R": 0.500, "alpha": -0.143585, "g0": 0.12316306, "g1": 0.58307965, "g4": 0.08443511, "fci": -1.05515976, "hf": -1.04299624},
    {"R": 0.700, "alpha": -0.209565, "g0": -0.27643762, "g1": 0.42045571, "g4": 0.08950029, "fci": -1.13618945, "hf": -1.11734900},
    {"R": 0.735, "alpha": -0.223390, "g0": -0.32112409, "g1": 0.39793745, "g4": 0.09046560, "fci": -1.13730604, "hf": -1.11699900},
    {"R": 0.900, "alpha": -0.298167, "g0": -0.47233944, "g1": 0.30978731, "g4": 0.09528584, "fci": -1.12056029, "hf": -1.09191400},
    {"R": 1.100, "alpha": -0.413789, "g0": -0.57374710, "g1": 0.23139590, "g4": 0.10161111, "fci": -1.07919296, "hf": -1.03560800},
    {"R": 1.500, "alpha": -0.726723, "g0": -0.65267092, "g1": 0.12910133, "g4": 0.11476796, "fci": -0.99814937, "hf": -0.91087400},
    {"R": 2.000, "alpha": -1.133286, "g0": -0.66253664, "g1": 0.06062802, "g4": 0.12956923, "fci": -0.94864112, "hf": -0.78379300},
]


def gen_circuit(alpha, basis, fold):
    """Generate cQASM 3.0 with CZ folded `fold` times.

    Base circuit (Z-basis, fold=1):
        X q[4]                  # prepare |1> on qa
        Ry(alpha) q[6]          # rotate qb
        Ry(-π/2) q[4]           # pre-CZ (CNOT decomposition)
        CZ q[6], q[4]           # entangling gate
        Ry(π/2) q[4]            # post-CZ (Z-basis)
        measure

    For fold=3: CZ → CZ·CZ·CZ
    For fold=5: CZ → CZ·CZ·CZ·CZ·CZ
    """
    lines = ["version 3.0", "qubit[9] q"]
    lines.append(f"X q[{QA}]")
    lines.append(f"Ry({alpha:.6f}) q[{QB}]")
    lines.append(f"Ry(-1.570796) q[{QA}]")

    # Folded CZ gates
    for _ in range(fold):
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
    """Calibration circuit for readout error mitigation."""
    lines = ["version 3.0", "qubit[9] q"]
    if state in ("10", "11"):
        lines.append(f"X q[{QA}]")
    if state in ("01", "11"):
        lines.append(f"X q[{QB}]")
    if state == "00":
        lines.append(f"Ry(0) q[{QA}]")  # no-op for QI empty circuit bug
    lines.append("bit[9] b")
    lines.append("b = measure q")
    return '\n'.join(lines)


def main():
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

    # Calibration at start
    for state in ["00", "10", "01", "11"]:
        circuits[f"cal_start_{state}"] = gen_cal_circuit(state)

    # VQE circuits: fold × distance × basis × rep
    for fold in FOLDS:
        for rep in range(N_REPS):
            for d in DISTANCES:
                for basis in ['Z', 'X', 'Y']:
                    name = f"f{fold}_rep{rep}_R{d['R']:.3f}_{basis}"
                    circuits[name] = gen_circuit(d['alpha'], basis, fold)

    # Calibration at end
    for state in ["00", "10", "01", "11"]:
        circuits[f"cal_end_{state}"] = gen_cal_circuit(state)

    n_vqe = len(FOLDS) * N_REPS * len(DISTANCES) * 3
    print(f"Generated {len(circuits)} circuits:")
    print(f"  {n_vqe} VQE ({len(FOLDS)} folds × {N_REPS} reps × {len(DISTANCES)} distances × 3 bases)")
    print(f"  8 calibration (4 start + 4 end)")

    # Submit
    backend = RemoteBackend()
    options = JobOptions(number_of_shots=N_SHOTS)
    print(f"\nSubmitting to Tuna-9 (id={TUNA9_BACKEND_ID})...")

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
                print(f"  [{i+1}/{len(circuits)}] {name} -> job {job_id}")
        except Exception as e:
            job_ids[name] = f"FAILED: {e}"
            n_fail += 1
            print(f"  [{i+1}/{len(circuits)}] {name} -> FAILED: {e}")

        if i < len(circuits) - 1:
            time.sleep(0.3)

    output = {
        "experiment": "H2 2-qubit ZNE (REM+ZNE stacked)",
        "submitted": datetime.now(timezone.utc).isoformat(),
        "backend": "Tuna-9",
        "physical_qubits": [QA, QB],
        "n_shots": N_SHOTS,
        "n_reps": N_REPS,
        "fold_factors": FOLDS,
        "distances": DISTANCES,
        "n_circuits": len(circuits),
        "job_ids": job_ids,
        "n_submitted": n_ok,
        "n_failed": n_fail,
        "richardson_coefficients": {
            "linear_f1_f3": {"f1": 1.5, "f3": -0.5, "formula": "E(0) = (3*E(1) - E(3)) / 2"},
            "quadratic_f1_f3_f5": {"f1": 1.875, "f3": -1.25, "f5": 0.375, "formula": "E(0) = (15*E(1) - 10*E(3) + 3*E(5)) / 8"},
        },
    }

    outfile = Path("experiments/results/zne-h2-job-ids.json")
    with open(outfile, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nSubmitted: {n_ok}, Failed: {n_fail}")
    print(f"Job IDs saved to: {outfile}")


if __name__ == "__main__":
    main()
