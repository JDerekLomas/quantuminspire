#!/usr/bin/env python3
"""Submit ZNE circuits for LiH 4-qubit VQE on Tuna-9.

Zero Noise Extrapolation via local CZ gate folding:
  fold=1: ...CZ...           (baseline, already have data)
  fold=3: ...CZ·CZ·CZ...    (3 CZ per gate since CZ†=CZ)
  fold=5: ...CZ·CZ·CZ·CZ·CZ (5 CZ per gate)

The LiH circuit has 3 CZ gates (CNOT chain q0→q1→q2→q3).
  fold=1: 3 CZ total
  fold=3: 9 CZ total
  fold=5: 15 CZ total

Richardson extrapolation to zero-noise limit:
  Linear (f=1,3):     E(0) = (3·E(1) - E(3)) / 2
  Quadratic (f=1,3,5): E(0) = (15·E(1) - 10·E(3) + 3·E(5)) / 8

Only submits fold=3 and fold=5 (fold=1 data already exists).
Total: 2 folds × 9 circuits × 5 reps = 90 VQE circuits.
Reuses calibration from existing fold=1 run.
"""

import json
import time
import numpy as np
from pathlib import Path
from datetime import datetime, timezone

TUNA9_BACKEND_ID = 6
N_SHOTS = 4096
QMAP = {0: 2, 1: 4, 2: 6, 3: 8}
N_PHYSICAL = 9
PI = np.pi

FOLDS = [3, 5]  # fold=1 already done
N_REPS = 5

# Optimal parameters from classical VQE
PARAMS = [0.038174879800962555, -2.8710483985762977e-05,
          -3.3674130395102014e-05, 3.106838748116853,
          -5.5928043028862676e-05, -3.1413840024522823,
          -0.00011881317251419843, 3.17639539952274]

# Measurement groups (from Hamiltonian)
MEASUREMENT_GROUPS = {
    "Z": [],
    "q0Y_q2Y": [(0, 'Y'), (2, 'Y')],
    "q0X_q2X": [(0, 'X'), (2, 'X')],
    "q1Y_q3Y": [(1, 'Y'), (3, 'Y')],
    "q1X_q3X": [(1, 'X'), (3, 'X')],
    "q0Y_q1X_q2X_q3Y": [(0, 'Y'), (1, 'X'), (2, 'X'), (3, 'Y')],
    "q0Y_q1Y_q2X_q3X": [(0, 'Y'), (1, 'Y'), (2, 'X'), (3, 'X')],
    "q0X_q1X_q2Y_q3Y": [(0, 'X'), (1, 'X'), (2, 'Y'), (3, 'Y')],
    "q0X_q1Y_q2Y_q3X": [(0, 'X'), (1, 'Y'), (2, 'Y'), (3, 'X')],
}


def gen_circuit(params, basis_rotations, fold):
    """Generate native cQASM 3.0 with CZ gates folded.

    Each CZ in the CNOT chain is replaced by CZ^fold.
    Since CZ is self-inverse (CZ† = CZ), CZ^fold = CZ repeated fold times.
    """
    lines = [
        "version 3.0",
        f"qubit[{N_PHYSICAL}] q",
        f"bit[{N_PHYSICAL}] b",
        "",
    ]

    def phys(lq):
        return QMAP[lq]

    # HF state |1100⟩: X on q0, q1
    lines.append(f"X q[{phys(0)}]")
    lines.append(f"X q[{phys(1)}]")
    lines.append("")

    # Layer 1: Ry rotations
    for q in range(4):
        lines.append(f"Ry({params[q]:.10f}) q[{phys(q)}]")
    lines.append("")

    # CNOT chain with CZ folding
    for i in range(3):  # 3 CNOTs: (0,1), (1,2), (2,3)
        ctrl, tgt = phys(i), phys(i + 1)
        lines.append(f"Ry({-PI/2:.10f}) q[{tgt}]")
        for _ in range(fold):
            lines.append(f"CZ q[{ctrl}], q[{tgt}]")
        lines.append(f"Ry({PI/2:.10f}) q[{tgt}]")
    lines.append("")

    # Layer 2: Ry rotations
    for q in range(4):
        lines.append(f"Ry({params[4 + q]:.10f}) q[{phys(q)}]")
    lines.append("")

    # Measurement basis rotations
    if basis_rotations:
        for idx, op in basis_rotations:
            pq = phys(idx)
            if op == 'X':
                lines.append(f"Rz({PI:.10f}) q[{pq}]")
                lines.append(f"Ry({PI/2:.10f}) q[{pq}]")
            elif op == 'Y':
                lines.append(f"Rz({PI/2:.10f}) q[{pq}]")
                lines.append(f"Ry({PI/2:.10f}) q[{pq}]")
        lines.append("")

    lines.append("b = measure q")
    lines.append("")
    return "\n".join(lines)


def main():
    from compute_api_client import CompileStage
    from quantuminspire.sdk.models.cqasm_algorithm import CqasmAlgorithm
    from quantuminspire.sdk.models.job_options import JobOptions
    from quantuminspire.util.api.remote_backend import RemoteBackend

    class PrecompiledAlgorithm(CqasmAlgorithm):
        @property
        def compile_stage(self):
            return CompileStage.ROUTING

    # Generate circuits
    circuits = {}
    for fold in FOLDS:
        for rep in range(N_REPS):
            for name, rotations in MEASUREMENT_GROUPS.items():
                key = f"f{fold}_rep{rep}_{name}"
                circuits[key] = gen_circuit(
                    PARAMS,
                    rotations if rotations else None,
                    fold
                )

    n_total = len(circuits)
    print(f"Generated {n_total} circuits:")
    print(f"  {len(FOLDS)} folds × {N_REPS} reps × {len(MEASUREMENT_GROUPS)} bases")
    print(f"  Fold factors: {FOLDS}")
    print(f"  CZ gates per circuit: fold=3 → 9, fold=5 → 15")

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
            program_name=f"lih_zne_{name}"
        )
        algo._content = cqasm

        try:
            job_id = backend.run(algo, backend_type_id=TUNA9_BACKEND_ID, options=options)
            job_ids[name] = job_id
            n_ok += 1
            if (i + 1) % 15 == 0 or i == n_total - 1:
                print(f"  [{i+1}/{n_total}] {name} -> job {job_id}")
        except Exception as e:
            job_ids[name] = f"FAILED: {e}"
            n_fail += 1
            print(f"  [{i+1}/{n_total}] {name} -> FAILED: {e}")

        if i < n_total - 1:
            time.sleep(0.3)

    output = {
        "experiment": "LiH 4-qubit ZNE (CZ gate folding)",
        "submitted": datetime.now(timezone.utc).isoformat(),
        "backend": "Tuna-9",
        "physical_qubits": QMAP,
        "n_shots": N_SHOTS,
        "n_reps": N_REPS,
        "fold_factors": FOLDS,
        "fold1_data": "lih-4qubit-tuna9-counts.json",
        "fold1_cal": "reusing calibration from fold=1 run",
        "n_circuits": n_total,
        "job_ids": job_ids,
        "n_submitted": n_ok,
        "n_failed": n_fail,
        "optimal_params": PARAMS,
        "measurement_groups": {k: v for k, v in MEASUREMENT_GROUPS.items()},
        "E_CASCI": -7.862128833438587,
        "richardson_coefficients": {
            "linear_f1_f3": {"f1": 1.5, "f3": -0.5},
            "quadratic_f1_f3_f5": {"f1": 1.875, "f3": -1.25, "f5": 0.375},
        },
    }

    outfile = Path("experiments/results/zne-lih-job-ids.json")
    with open(outfile, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nSubmitted: {n_ok}, Failed: {n_fail}")
    print(f"Job IDs saved to: {outfile}")


if __name__ == "__main__":
    main()
