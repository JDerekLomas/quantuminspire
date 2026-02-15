#!/usr/bin/env python3
"""Single-qubit randomized benchmarking on all 9 Tuna-9 qubits.

Protocol: random Clifford sequence + inverse, measure survival probability.
Fit A*p^m + B to extract error per Clifford (EPC) and average gate fidelity.

24 single-qubit Cliffords decomposed into native Ry/Rz/X gates.
Uses ZYZ decomposition: U = Rz(a)·Ry(b)·Rz(c).

Total: 9 qubits × 6 lengths × 5 seeds = 270 circuits.
"""

import json
import time
import numpy as np
from math import pi
from pathlib import Path
from datetime import datetime, timezone

TUNA9_BACKEND_ID = 6
N_SHOTS = 1024
SEQ_LENGTHS = [1, 4, 8, 16, 32, 64]
N_SEEDS = 5
TOTAL_QUBITS = 9

# ── Clifford group generation ─────────────────────────────────────────────

def _ry_matrix(theta):
    c, s = np.cos(theta/2), np.sin(theta/2)
    return np.array([[c, -s], [s, c]], dtype=complex)

def _rz_matrix(phi):
    return np.array([[np.exp(-1j*phi/2), 0], [0, np.exp(1j*phi/2)]], dtype=complex)

def _x_matrix():
    return np.array([[0, 1], [1, 0]], dtype=complex)


def _make_clifford_table():
    """Build 24 single-qubit Cliffords via BFS from {H, S, X} generators."""
    # Generators as matrices
    H_mat = _rz_matrix(pi) @ _ry_matrix(pi/2)       # H = Rz(π)·Ry(π/2)
    S_mat = _rz_matrix(pi/2)                          # S = Rz(π/2)
    X_mat = _x_matrix()                               # X

    generators = [
        (H_mat, "H"),
        (S_mat, "S"),
        (X_mat, "X"),
    ]

    # BFS: build all 24 Cliffords as products of generators
    table = [(np.eye(2, dtype=complex), [])]  # (matrix, generator_labels)
    queue = list(table)

    while len(table) < 24 and queue:
        mat, labels = queue.pop(0)
        for g_mat, g_label in generators:
            new_mat = g_mat @ mat  # g applied after mat
            new_labels = labels + [g_label]

            is_new = True
            for t_mat, _ in table:
                if abs(abs(np.trace(new_mat @ t_mat.conj().T)) - 2.0) < 1e-6:
                    is_new = False
                    break

            if is_new:
                table.append((new_mat, new_labels))
                queue.append((new_mat, new_labels))

    assert len(table) == 24, f"Expected 24, got {len(table)}"
    return table


def _zyz_decompose(U):
    """Decompose SU(2) unitary into Rz(a)·Ry(b)·Rz(c) angles.

    Returns (a, b, c) such that U ∝ Rz(a)·Ry(b)·Rz(c).
    """
    # Ensure SU(2) (det = 1)
    det = np.linalg.det(U)
    U = U / np.sqrt(det)

    # U = [[cos(b/2)*e^{-i(a+c)/2}, -sin(b/2)*e^{-i(a-c)/2}],
    #       [sin(b/2)*e^{i(a-c)/2},   cos(b/2)*e^{i(a+c)/2}]]
    b = 2 * np.arccos(np.clip(abs(U[0, 0]), 0, 1))

    if abs(np.sin(b / 2)) < 1e-10:
        # b ≈ 0: pure phase, U ≈ diag(e^{-i(a+c)/2}, e^{i(a+c)/2})
        a_plus_c = -2 * np.angle(U[0, 0])
        a = a_plus_c / 2
        c = a_plus_c / 2
    elif abs(np.cos(b / 2)) < 1e-10:
        # b ≈ π: U[0,0] ≈ 0
        a_minus_c = 2 * np.angle(U[1, 0])
        a = a_minus_c / 2
        c = -a_minus_c / 2
    else:
        a = np.angle(U[1, 0]) - np.angle(U[0, 0])
        c = -np.angle(U[0, 0]) - np.angle(U[1, 0])

    return float(a), float(b), float(c)


def _clifford_to_cqasm_gates(U, qubit):
    """Convert Clifford unitary to cQASM gate sequence on given qubit.

    Uses ZYZ decomposition, skipping near-zero rotations.
    """
    a, b, c = _zyz_decompose(U)
    gates = []

    # Apply Rz(c) first, then Ry(b), then Rz(a) [right-to-left matrix order]
    if abs(c % (2 * pi)) > 1e-6:
        gates.append(f"Rz({c:.6f}) q[{qubit}]")
    if abs(b) > 1e-6:
        gates.append(f"Ry({b:.6f}) q[{qubit}]")
    if abs(a % (2 * pi)) > 1e-6:
        gates.append(f"Rz({a:.6f}) q[{qubit}]")

    return gates


# Build the Clifford table once
_CLIFFORD_TABLE = _make_clifford_table()
CLIFFORDS = [mat for mat, _ in _CLIFFORD_TABLE]


def inverse_clifford(indices):
    """Find the inverse of a Clifford sequence."""
    U = np.eye(2, dtype=complex)
    for idx in indices:
        U = CLIFFORDS[idx] @ U
    U_inv = U.conj().T
    for i, C in enumerate(CLIFFORDS):
        if abs(abs(np.trace(U_inv @ C.conj().T)) - 2.0) < 1e-6:
            return i
    raise ValueError("Inverse Clifford not found")


# ── Circuit generation ────────────────────────────────────────────────────

def make_rb_circuit(qubit, seq_length, seed):
    """Generate cQASM RB circuit: random Cliffords + inverse → should return |0⟩."""
    rng = np.random.RandomState(seed * 1000 + seq_length)

    lines = ["version 3.0", f"qubit[{TOTAL_QUBITS}] q",
             f"// RB q{qubit}: m={seq_length}, seed={seed}"]

    cliff_indices = []
    for _ in range(seq_length):
        idx = rng.randint(0, 24)
        cliff_indices.append(idx)
        lines.extend(_clifford_to_cqasm_gates(CLIFFORDS[idx], qubit))

    # Inverse Clifford
    inv_idx = inverse_clifford(cliff_indices)
    lines.extend(_clifford_to_cqasm_gates(CLIFFORDS[inv_idx], qubit))

    # Measure
    lines.append(f"bit[{TOTAL_QUBITS}] b")
    lines.append("b = measure q")
    return "\n".join(lines)


def verify_on_emulator():
    """Quick verification: RB should return |0⟩ on noiseless emulator."""
    import qxelarator

    print("Verifying RB circuits on emulator...")
    for qubit in [4, 6]:
        for m in [1, 8, 32]:
            cqasm = make_rb_circuit(qubit, m, seed=0)
            result = qxelarator.execute_string(cqasm, iterations=1000)
            counts = {k: int(v) for k, v in result.results.items()}
            # Check qubit is in |0⟩
            total = sum(counts.values())
            n_zero = 0
            for bs, c in counts.items():
                bit_val = bs[TOTAL_QUBITS - 1 - qubit]  # MSB-first
                if bit_val == '0':
                    n_zero += c
            survival = n_zero / total
            status = "OK" if survival > 0.99 else "FAIL"
            print(f"  q{qubit} m={m}: survival={survival:.4f} [{status}]")


def submit_all():
    """Submit all RB circuits to Tuna-9."""
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
    for qubit in range(TOTAL_QUBITS):
        for m in SEQ_LENGTHS:
            for seed in range(N_SEEDS):
                name = f"rb_q{qubit}_m{m}_s{seed}"
                circuits[name] = make_rb_circuit(qubit, m, seed)

    print(f"Generated {len(circuits)} RB circuits "
          f"({TOTAL_QUBITS} qubits × {len(SEQ_LENGTHS)} lengths × {N_SEEDS} seeds)")

    # Submit
    backend = RemoteBackend()
    options = JobOptions(number_of_shots=N_SHOTS)
    print(f"Submitting to Tuna-9 (id={TUNA9_BACKEND_ID})...")

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
            if (i + 1) % 30 == 0 or i == len(circuits) - 1:
                print(f"  [{i+1}/{len(circuits)}] {name} -> job {job_id}")
        except Exception as e:
            job_ids[name] = f"FAILED: {e}"
            n_fail += 1
            print(f"  [{i+1}/{len(circuits)}] {name} -> FAILED: {e}")

        if i < len(circuits) - 1:
            time.sleep(0.3)

    output = {
        "experiment": "Single-qubit RB on all Tuna-9 qubits",
        "submitted": datetime.now(timezone.utc).isoformat(),
        "backend": "Tuna-9",
        "n_qubits": TOTAL_QUBITS,
        "n_shots": N_SHOTS,
        "seq_lengths": SEQ_LENGTHS,
        "n_seeds": N_SEEDS,
        "n_circuits": len(circuits),
        "job_ids": job_ids,
        "n_submitted": n_ok,
        "n_failed": n_fail,
    }

    outfile = Path("experiments/results/rb-tuna9-job-ids.json")
    with open(outfile, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nSubmitted: {n_ok}, Failed: {n_fail}")
    print(f"Job IDs saved to: {outfile}")


if __name__ == "__main__":
    import sys
    if "--verify" in sys.argv:
        verify_on_emulator()
    else:
        verify_on_emulator()  # always verify first
        submit_all()
