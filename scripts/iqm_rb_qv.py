#!/usr/bin/env python3
"""Run RB and QV on IQM Garnet for cross-platform comparison.

Key question: does IQM show RB survival DECAY (like Tuna-9) or
FLAT (like IBM)? We submit raw prx/cz gates — no transpiler to
collapse Clifford sequences.

RB: 5 sequence lengths [1,4,8,16,32] x 5 seeds = 25 circuits
QV: 5 circuits at n=2 + 5 at n=3 = 10 circuits
Total: 35 circuits x 1024 shots

Native gates: prx(angle, phase), cz, measure
  angle and phase in radians
  prx(theta, phi) = exp(-i*theta/2 * (cos(phi)*X + sin(phi)*Y))
"""

import json
import os
import sys
import time
import numpy as np
from math import pi
from datetime import datetime, timezone
from pathlib import Path

from iqm.iqm_client import IQMClient, Circuit, CircuitOperation

# ── Config ──────────────────────────────────────────────────────────────────

IQM_URL = "https://cocos.resonance.meetiqm.com/garnet"
SHOTS = 1024
RESULTS_DIR = Path(__file__).parent.parent / "experiments" / "results"

# Best qubits from Bell calibration (QB1-QB2: 97.3%)
RB_QUBIT = "QB1"
QV_QUBITS_2 = ["QB1", "QB2"]
QV_QUBITS_3 = ["QB1", "QB2", "QB3"]

SEQ_LENGTHS = [1, 4, 8, 16, 32]
N_SEEDS = 5
N_QV_CIRCUITS = 5

# ── Native gate helpers ─────────────────────────────────────────────────────

def prx(qubit, angle, phase):
    """prx gate with angle and phase in radians. Args must be float."""
    return CircuitOperation(
        name="prx", locus=(qubit,),
        args={"angle": float(angle), "phase": float(phase)}
    )

def cz(q1, q2):
    return CircuitOperation(name="cz", locus=(q1, q2), args={})

def measure(qubits, key="m"):
    return CircuitOperation(name="measure", locus=tuple(qubits), args={"key": key})

def h_gates(qubit):
    """Hadamard = prx(pi, 0) then prx(pi/2, pi/2)."""
    return [prx(qubit, pi, 0), prx(qubit, pi/2, pi/2)]

def cnot_gates(ctrl, tgt):
    """CNOT = H(tgt), CZ(ctrl,tgt), H(tgt)."""
    return h_gates(tgt) + [cz(ctrl, tgt)] + h_gates(tgt)

# ── Clifford group for single-qubit RB ──────────────────────────────────────

def _prx_matrix(angle, phase):
    """Compute the 2x2 unitary for prx(angle, phase).
    prx(θ, φ) = cos(θ/2)·I − i·sin(θ/2)·(cos(φ)·σx + sin(φ)·σy)
    """
    c = np.cos(angle / 2)
    s = np.sin(angle / 2)
    cphi = np.cos(phase)
    sphi = np.sin(phase)
    # Off-diag: -i*s*(cos(phi) ± i*sin(phi)) = -i*s*e^{∓i*phi}
    return np.array([
        [c, -1j * s * np.exp(-1j * phase)],
        [-1j * s * np.exp(1j * phase), c]
    ], dtype=complex)


def _seq_to_matrix(seq):
    """Convert a list of (angle, phase) tuples to a 2x2 unitary.
    Gates applied left-to-right: seq[0] first, seq[-1] last.
    Matrix = M[-1] @ ... @ M[0]
    """
    M = np.eye(2, dtype=complex)
    for angle, phase in seq:
        M = _prx_matrix(angle, phase) @ M
    return M


# Generator gate sequences as (angle, phase) tuples
# H: prx(pi, 0) then prx(pi/2, pi/2) — verified by Bell fidelity on IQM
_H_SEQ = [(pi, 0.0), (pi / 2, pi / 2)]
# S (= Rz(pi/2) up to phase): prx(pi, 0) then prx(pi, pi/4)
_S_SEQ = [(pi, 0.0), (pi, pi / 4)]
# X: prx(pi, 0)
_X_SEQ = [(pi, 0.0)]


def _make_clifford_table():
    """Build all 24 single-qubit Cliffords with precomputed prx gate sequences.

    Uses BFS from generators {H, S, X} to find the shortest gate sequence
    for each Clifford. Returns list of (matrix, gate_sequence) pairs.
    """
    H_mat = _seq_to_matrix(_H_SEQ)
    S_mat = _seq_to_matrix(_S_SEQ)
    X_mat = _seq_to_matrix(_X_SEQ)
    generators = [(H_mat, list(_H_SEQ)), (S_mat, list(_S_SEQ)), (X_mat, list(_X_SEQ))]

    # BFS: start with identity (empty sequence), grow by applying generators
    table = [(np.eye(2, dtype=complex), [])]
    queue = list(table)

    while len(table) < 24 and queue:
        mat, seq = queue.pop(0)
        for g_mat, g_seq in generators:
            # g applied AFTER mat → new_mat = g_mat @ mat
            # Hardware: mat's gates first, then g's gates
            new_mat = g_mat @ mat
            new_seq = seq + g_seq

            is_new = True
            for t_mat, _ in table:
                if abs(abs(np.trace(new_mat @ t_mat.conj().T)) - 2.0) < 1e-6:
                    is_new = False
                    break

            if is_new:
                table.append((new_mat, new_seq))
                queue.append((new_mat, new_seq))

    assert len(table) == 24, f"Expected 24 Cliffords, got {len(table)}"

    # Verify: each gate sequence faithfully reproduces its matrix
    for mat, seq in table:
        if seq:
            recomputed = _seq_to_matrix(seq)
            overlap = abs(np.trace(recomputed @ mat.conj().T))
            assert abs(overlap - 2.0) < 1e-6, \
                f"Gate sequence mismatch: trace overlap = {overlap:.6f}"

    return table


CLIFFORD_TABLE = _make_clifford_table()
CLIFFORDS = [mat for mat, _ in CLIFFORD_TABLE]
_CLIFFORD_SEQS = [seq for _, seq in CLIFFORD_TABLE]


def clifford_to_prx(qubit, U):
    """Look up the precomputed prx gate sequence for a Clifford unitary."""
    for i, C in enumerate(CLIFFORDS):
        if abs(abs(np.trace(U @ C.conj().T)) - 2.0) < 1e-6:
            return [prx(qubit, float(a), float(p)) for a, p in _CLIFFORD_SEQS[i]]
    raise ValueError("Unitary not found in Clifford group")


def unitary_to_prx(qubit, U):
    """Decompose an arbitrary SU(2) unitary into prx gates (ZYZ method).

    U = Rz(alpha) @ Ry(beta) @ Rz(gamma)
      = prx(beta, pi/2 + alpha) @ Rz(alpha + gamma)

    At most 3 prx gates.
    """
    det = np.linalg.det(U)
    U_su2 = U / np.sqrt(det)
    a = U_su2[0, 0]
    b = U_su2[1, 0]

    beta = 2 * np.arccos(np.clip(abs(a), 0, 1))

    if abs(np.sin(beta / 2)) < 1e-10:
        # beta ≈ 0: pure Rz, set gamma = 0
        alpha = -2 * np.angle(a)
        gamma = 0.0
    elif abs(np.cos(beta / 2)) < 1e-10:
        # beta ≈ pi: |a| ≈ 0, set gamma = 0
        alpha = 2 * np.angle(b)
        gamma = 0.0
    else:
        alpha = np.angle(b) - np.angle(a)
        gamma = -np.angle(a) - np.angle(b)

    instructions = []

    # Rz(alpha + gamma) via prx(pi, 0) then prx(pi, (alpha+gamma)/2)
    rz_total = alpha + gamma
    if abs(rz_total) > 1e-10 and abs(rz_total % (2 * pi)) > 1e-10:
        instructions.append(prx(qubit, pi, 0.0))
        instructions.append(prx(qubit, pi, float(rz_total / 2)))

    # Main rotation: prx(beta, pi/2 + alpha)
    if beta > 1e-10:
        instructions.append(prx(qubit, float(beta), float(pi / 2 + alpha)))

    return instructions


def inverse_clifford(indices):
    """Compute the inverse of a sequence of Clifford indices."""
    # Multiply all Cliffords in sequence
    U = np.eye(2, dtype=complex)
    for idx in indices:
        U = CLIFFORDS[idx] @ U
    # Compute inverse
    U_inv = U.conj().T
    # Find which Clifford matches U_inv
    for i, C in enumerate(CLIFFORDS):
        if abs(abs(np.trace(U_inv @ C.conj().T)) - 2.0) < 1e-6:
            return i
    # Shouldn't happen
    raise ValueError("Inverse Clifford not found in group")


# ── RB circuit generation ───────────────────────────────────────────────────

def make_rb_circuit(qubit, seq_length, seed):
    """Generate a proper RB circuit with inverse Clifford."""
    rng = np.random.RandomState(seed * 1000 + seq_length)

    instructions = []
    cliff_indices = []

    # Random Clifford sequence
    for _ in range(seq_length):
        idx = rng.randint(0, 24)
        cliff_indices.append(idx)
        instructions += clifford_to_prx(qubit, CLIFFORDS[idx])

    # Compute and append inverse Clifford
    inv_idx = inverse_clifford(cliff_indices)
    instructions += clifford_to_prx(qubit, CLIFFORDS[inv_idx])

    instructions.append(measure([qubit]))
    return Circuit(
        name=f"rb_m{seq_length}_s{seed}",
        instructions=tuple(instructions)
    )


# ── QV circuit generation ───────────────────────────────────────────────────

def random_su4_layer(qubits, rng):
    """Generate a random SU(4) layer: random SU(2) on each qubit + CNOT.
    Uses Haar-random SU(2) via Euler angles.
    """
    instructions = []

    # Random single-qubit gates
    for q in qubits:
        alpha = rng.uniform(0, 2*pi)
        beta = rng.uniform(0, pi)
        gamma = rng.uniform(0, 2*pi)
        # Rz(alpha) Ry(beta) Rz(gamma)
        Ry = np.array([
            [np.cos(beta/2), -np.sin(beta/2)],
            [np.sin(beta/2), np.cos(beta/2)]
        ], dtype=complex)
        Rz_a = np.array([[np.exp(-1j*alpha/2), 0], [0, np.exp(1j*alpha/2)]], dtype=complex)
        Rz_g = np.array([[np.exp(-1j*gamma/2), 0], [0, np.exp(1j*gamma/2)]], dtype=complex)
        U = Rz_a @ Ry @ Rz_g
        instructions += unitary_to_prx(q, U)

    # CNOT between pairs
    for i in range(0, len(qubits) - 1, 2):
        instructions += cnot_gates(qubits[i], qubits[i + 1])

    return instructions


def make_qv_circuit(n_qubits, circuit_idx, seed=42):
    """Generate a QV circuit: n_qubits layers of random SU(4)."""
    rng = np.random.RandomState(seed * 100 + circuit_idx)

    if n_qubits == 2:
        qubits = QV_QUBITS_2
    else:
        qubits = QV_QUBITS_3

    instructions = []
    for _ in range(n_qubits):  # depth = n_qubits
        instructions += random_su4_layer(qubits, rng)

    instructions.append(measure(qubits))
    return Circuit(name=f"qv_n{n_qubits}_c{circuit_idx}", instructions=tuple(instructions))


# ── Ideal QV simulation ────────────────────────────────────────────────────

def simulate_qv_ideal(n_qubits, circuit_idx, seed=42):
    """Simulate QV circuit to get ideal output distribution."""
    rng = np.random.RandomState(seed * 100 + circuit_idx)

    if n_qubits == 2:
        qubits = list(range(2))
    else:
        qubits = list(range(3))

    dim = 2 ** n_qubits
    state = np.zeros(dim, dtype=complex)
    state[0] = 1.0  # |00...0>

    for _ in range(n_qubits):
        # Single-qubit gates
        for q in qubits:
            alpha = rng.uniform(0, 2*pi)
            beta = rng.uniform(0, pi)
            gamma = rng.uniform(0, 2*pi)
            Ry = np.array([
                [np.cos(beta/2), -np.sin(beta/2)],
                [np.sin(beta/2), np.cos(beta/2)]
            ], dtype=complex)
            Rz_a = np.array([[np.exp(-1j*alpha/2), 0], [0, np.exp(1j*alpha/2)]], dtype=complex)
            Rz_g = np.array([[np.exp(-1j*gamma/2), 0], [0, np.exp(1j*gamma/2)]], dtype=complex)
            U = Rz_a @ Ry @ Rz_g
            # Apply to qubit q in full state
            full_U = np.eye(1, dtype=complex)
            for i in range(n_qubits):
                if i == q:
                    full_U = np.kron(full_U, U)
                else:
                    full_U = np.kron(full_U, np.eye(2, dtype=complex))
            state = full_U @ state

        # CNOT between pairs
        for i in range(0, len(qubits) - 1, 2):
            ctrl, tgt = qubits[i], qubits[i + 1]
            cnot = np.eye(dim, dtype=complex)
            for b in range(dim):
                bits = list(format(b, f'0{n_qubits}b'))
                if bits[ctrl] == '1':
                    bits[tgt] = '0' if bits[tgt] == '1' else '1'
                    b2 = int(''.join(bits), 2)
                    cnot[b, b] = 0
                    cnot[b2, b] = 1
                    cnot[b, b2] = 0  # will be set by symmetric case
            # Fix: build CNOT properly
            cnot = np.zeros((dim, dim), dtype=complex)
            for b in range(dim):
                bits = list(format(b, f'0{n_qubits}b'))
                new_bits = bits.copy()
                if bits[ctrl] == '1':
                    new_bits[tgt] = '0' if bits[tgt] == '1' else '1'
                b2 = int(''.join(new_bits), 2)
                cnot[b2, b] = 1
            state = cnot @ state

    probs = np.abs(state) ** 2
    return probs


def compute_hof(counts, ideal_probs, n_qubits):
    """Compute Heavy Output Fraction."""
    median_prob = np.median(ideal_probs)
    total = sum(counts.values())

    heavy_count = 0
    for bitstring, count in counts.items():
        # Convert bitstring to index
        idx = int(bitstring, 2)
        if idx < len(ideal_probs) and ideal_probs[idx] > median_prob:
            heavy_count += count

    return heavy_count / total if total > 0 else 0


# ── Result extraction ────────────────────────────────────────────────────────

def _extract_counts(run_result, circuit_index=0, key="m"):
    """Extract bitstring counts from IQM RunResult."""
    measurements = run_result.measurements
    if not measurements or len(measurements) <= circuit_index:
        return {}
    circuit_meas = measurements[circuit_index]
    if key not in circuit_meas:
        print(f"  Warning: key '{key}' not in measurements. Keys: {list(circuit_meas.keys())}")
        return {}
    raw_data = circuit_meas[key]
    counts = {}
    for shot in raw_data:
        bitstring = ''.join(str(b) for b in shot)
        counts[bitstring] = counts.get(bitstring, 0) + 1
    return counts


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    token = os.environ.get("IQM_TOKEN")
    if not token:
        print("ERROR: IQM_TOKEN not set")
        sys.exit(1)

    print(f"Connecting to IQM Garnet at {IQM_URL}...")
    # IQMClient reads IQM_TOKEN from env var automatically
    client = IQMClient(IQM_URL)
    print("Connected.\n")

    timestamp = datetime.now(timezone.utc).isoformat()
    all_results = {}

    # ── RB circuits ─────────────────────────────────────────────────────────
    print("=" * 60)
    print("RANDOMIZED BENCHMARKING")
    print(f"Qubit: {RB_QUBIT}, Lengths: {SEQ_LENGTHS}, Seeds: {N_SEEDS}")
    print("=" * 60)

    rb_circuits = []
    rb_names = []
    for m in SEQ_LENGTHS:
        for s in range(N_SEEDS):
            circ = make_rb_circuit(RB_QUBIT, m, seed=s)
            rb_circuits.append(circ)
            rb_names.append(f"rb_m{m}_s{s}")
            print(f"  Generated rb_m{m}_s{s} ({len(circ.instructions)} gates)")

    # Submit all RB circuits
    print(f"\nSubmitting {len(rb_circuits)} RB circuits...")
    rb_raw_counts = {}
    rb_job_ids = {}

    for i, (circ, name) in enumerate(zip(rb_circuits, rb_names)):
        try:
            job_id = client.submit_circuits([circ], shots=SHOTS)
            print(f"  [{i+1}/{len(rb_circuits)}] {name} -> {job_id}")
            result = client.wait_for_results(job_id, timeout_secs=120)
            counts = _extract_counts(result)
            rb_raw_counts[name] = counts
            rb_job_ids[name] = str(job_id)
            total = sum(counts.values())
            p0 = counts.get("0", 0) / total if total > 0 else 0
            print(f"    P(0) = {p0:.4f}  counts: {counts}")
        except Exception as e:
            print(f"    ERROR: {e}")
            rb_raw_counts[name] = {}
            rb_job_ids[name] = f"error: {e}"

    # Analyze RB
    rb_data = {}
    for m in SEQ_LENGTHS:
        survivals = []
        for s in range(N_SEEDS):
            counts = rb_raw_counts.get(f"rb_m{m}_s{s}", {})
            total = sum(counts.values())
            p0 = counts.get("0", 0) / total if total > 0 else 0
            survivals.append(round(p0, 4))
        mean_surv = np.mean(survivals)
        std_surv = np.std(survivals)
        rb_data[str(m)] = {
            "mean_survival": round(float(mean_surv), 4),
            "std_survival": round(float(std_surv), 4),
            "per_seed": survivals,
        }
        print(f"\n  m={m}: mean P(0) = {mean_surv:.4f} +/- {std_surv:.4f}")

    # Fit exponential decay: P(0) = A * p^m + B
    from scipy.optimize import curve_fit
    ms = np.array(SEQ_LENGTHS, dtype=float)
    means = np.array([rb_data[str(m)]["mean_survival"] for m in SEQ_LENGTHS])

    try:
        def rb_model(m, A, p, B):
            return A * p**m + B
        popt, _ = curve_fit(rb_model, ms, means, p0=[0.4, 0.99, 0.5], maxfev=10000)
        A_fit, p_fit, B_fit = popt
        epc = (1 - p_fit) / 2
        gate_fidelity = 1 - epc
        print(f"\n  RB Fit: A={A_fit:.4f}, p={p_fit:.6f}, B={B_fit:.4f}")
        print(f"  Error per Clifford: {epc:.6f}")
        print(f"  Gate fidelity: {gate_fidelity*100:.4f}%")

        rb_fit = {
            "A": round(float(A_fit), 6),
            "p": round(float(p_fit), 6),
            "B": round(float(B_fit), 6),
            "error_per_clifford": round(float(epc), 6),
            "gate_fidelity": round(float(gate_fidelity), 6),
            "fidelity_percent": round(float(gate_fidelity * 100), 4),
        }
    except Exception as e:
        print(f"\n  RB Fit FAILED: {e}")
        rb_fit = {"error": str(e)}

    # ── QV circuits ─────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("QUANTUM VOLUME")
    print(f"Qubits: n=2 ({QV_QUBITS_2}), n=3 ({QV_QUBITS_3})")
    print("=" * 60)

    qv_circuits = []
    qv_names = []
    qv_seed = 42  # same seed for reproducibility

    for i in range(N_QV_CIRCUITS):
        circ = make_qv_circuit(2, i, seed=qv_seed)
        qv_circuits.append(circ)
        qv_names.append(f"qv_n2_c{i}")
    for i in range(N_QV_CIRCUITS):
        circ = make_qv_circuit(3, i, seed=qv_seed)
        qv_circuits.append(circ)
        qv_names.append(f"qv_n3_c{i}")

    print(f"Submitting {len(qv_circuits)} QV circuits...")
    qv_raw_counts = {}
    qv_job_ids = {}

    for i, (circ, name) in enumerate(zip(qv_circuits, qv_names)):
        try:
            job_id = client.submit_circuits([circ], shots=SHOTS)
            print(f"  [{i+1}/{len(qv_circuits)}] {name} -> {job_id}")
            result = client.wait_for_results(job_id, timeout_secs=120)
            counts = _extract_counts(result)
            qv_raw_counts[name] = counts
            qv_job_ids[name] = str(job_id)
            print(f"    counts: {counts}")
        except Exception as e:
            print(f"    ERROR: {e}")
            qv_raw_counts[name] = {}
            qv_job_ids[name] = f"error: {e}"

    # Compute HOF for each QV circuit
    qv_analysis = {}
    for n in [2, 3]:
        hofs = []
        for i in range(N_QV_CIRCUITS):
            name = f"qv_n{n}_c{i}"
            counts = qv_raw_counts.get(name, {})
            if counts:
                ideal_probs = simulate_qv_ideal(n, i, seed=qv_seed)
                hof = compute_hof(counts, ideal_probs, n)
                hofs.append(round(hof, 4))
                print(f"  {name}: HOF = {hof:.4f}")
            else:
                hofs.append(0.0)

        mean_hof = float(np.mean(hofs))
        std_hof = float(np.std(hofs))
        passes = mean_hof > 2/3
        qv_analysis[f"n{n}"] = {
            "mean_hof": round(mean_hof, 4),
            "std_hof": round(std_hof, 4),
            "per_circuit_hof": hofs,
            "passes_threshold": passes,
            "threshold": 2/3,
        }
        status = "PASS" if passes else "FAIL"
        print(f"  QV n={n}: mean HOF = {mean_hof:.4f} [{status}]")

    # ── Save results ────────────────────────────────────────────────────────
    completed = datetime.now(timezone.utc).isoformat()

    result = {
        "schema_version": "1.0",
        "id": "cross2019-iqm-garnet",
        "type": "cross2019_replication",
        "backend": "iqm-garnet",
        "backend_provider": "IQM Resonance (Finland)",
        "backend_qubits": 20,
        "submitted": timestamp,
        "completed": completed,
        "parameters": {
            "shots": SHOTS,
            "rb_qubit": RB_QUBIT,
            "qv_qubits_2": QV_QUBITS_2,
            "qv_qubits_3": QV_QUBITS_3,
            "n_qv_circuits": N_QV_CIRCUITS,
            "n_rb_seeds": N_SEEDS,
            "rb_sequence_lengths": SEQ_LENGTHS,
            "qv_seed": qv_seed,
        },
        "raw_counts": {**rb_raw_counts, **qv_raw_counts},
        "job_ids": {**rb_job_ids, **qv_job_ids},
        "analysis": {
            "quantum_volume": qv_analysis,
            "randomized_benchmarking": {
                "sequence_lengths": SEQ_LENGTHS,
                "data": rb_data,
                "fit": rb_fit,
            },
            "claims": {
                "qv_2qubit": {
                    "published": "HOF > 2/3",
                    "measured": qv_analysis.get("n2", {}).get("mean_hof", 0),
                    "pass": qv_analysis.get("n2", {}).get("passes_threshold", False),
                },
                "qv_3qubit": {
                    "published": "HOF > 2/3",
                    "measured": qv_analysis.get("n3", {}).get("mean_hof", 0),
                    "pass": qv_analysis.get("n3", {}).get("passes_threshold", False),
                },
                "rb_gate_fidelity": {
                    "published": "0.99 +/- 0.01",
                    "measured": rb_fit.get("gate_fidelity", 0),
                    "pass": rb_fit.get("gate_fidelity", 0) > 0.98 if isinstance(rb_fit.get("gate_fidelity"), (int, float)) else False,
                },
            },
        },
        "environment": "experiments/environment.json",
    }

    outpath = RESULTS_DIR / "cross2019-iqm-garnet.json"
    with open(outpath, "w") as f:
        json.dump(result, f, indent=2)
        f.write("\n")

    print(f"\nSaved to {outpath}")
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    for m in SEQ_LENGTHS:
        d = rb_data[str(m)]
        print(f"  RB m={m:2d}: P(0) = {d['mean_survival']:.4f} +/- {d['std_survival']:.4f}")
    print(f"  RB gate fidelity: {rb_fit.get('fidelity_percent', 'N/A')}%")
    for n in [2, 3]:
        d = qv_analysis[f"n{n}"]
        s = "PASS" if d["passes_threshold"] else "FAIL"
        print(f"  QV n={n}: HOF = {d['mean_hof']:.4f} [{s}]")


if __name__ == "__main__":
    main()
