"""
Experiment Daemon — Live Quantum Hardware Pipeline

Picks up experiment definitions from experiments/queue/, generates cQASM 3.0
circuits, submits to Quantum Inspire, analyzes results, and writes to
experiments/results/. Commits results to git for Vercel auto-deploy.

Usage:
    python agents/experiment_daemon.py --once        # Process one experiment
    python agents/experiment_daemon.py --daemon      # Run continuously
    python agents/experiment_daemon.py --status       # Show queue status
    python agents/experiment_daemon.py --seed         # Create seed experiments
    python agents/experiment_daemon.py --dry-run      # Generate circuits without submitting
"""

import json
import subprocess
import sys
import argparse
import time
import signal
import math
import random as _random_module
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

# ─── Paths ───────────────────────────────────────────────────────────────────

AGENTS_DIR = Path(__file__).parent
PROJECT_DIR = AGENTS_DIR.parent
QUEUE_DIR = PROJECT_DIR / "experiments" / "queue"
RESULTS_DIR = PROJECT_DIR / "experiments" / "results"
LOG_FILE = AGENTS_DIR / "experiment_daemon.log"
VENV_BIN = PROJECT_DIR / ".venv" / "bin"

DEFAULT_INTERVAL = 300  # 5 minutes between checks


# ─── Logging ─────────────────────────────────────────────────────────────────

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")


# ─── Queue Management ────────────────────────────────────────────────────────

def load_queue():
    """Load all experiment definitions from queue/, sorted by priority."""
    experiments = []
    for f in sorted(QUEUE_DIR.glob("*.json")):
        try:
            with open(f) as fh:
                exp = json.load(fh)
            exp["_file"] = str(f)
            experiments.append(exp)
        except (json.JSONDecodeError, KeyError) as e:
            log(f"WARN: Skipping malformed queue file {f.name}: {e}")
    return experiments


def get_pending():
    """Get pending experiments sorted by priority."""
    queue = load_queue()
    pending = [e for e in queue if e.get("status") == "pending"]
    return sorted(pending, key=lambda e: e.get("priority", 99))


def update_queue_status(exp, status):
    """Update the status of an experiment in its queue file."""
    filepath = Path(exp["_file"])
    with open(filepath) as f:
        data = json.load(f)
    data["status"] = status
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)


def load_results():
    """Load all completed results."""
    results = []
    for f in sorted(RESULTS_DIR.glob("*.json")):
        if f.name == ".gitkeep":
            continue
        try:
            with open(f) as fh:
                results.append(json.load(fh))
        except (json.JSONDecodeError, KeyError):
            pass
    return results


# ─── cQASM 3.0 Circuit Generation ───────────────────────────────────────────

def generate_bell_circuit(params):
    """Generate Bell state circuit in cQASM 3.0."""
    qubits = params.get("qubits", [0, 1])
    q0, q1 = qubits[0], qubits[1]
    return f"""version 3.0
qubit[{max(qubits) + 1}] q
bit[{max(qubits) + 1}] b

H q[{q0}]
CNOT q[{q0}], q[{q1}]
b = measure q"""


def generate_ghz_circuit(params):
    """Generate GHZ state circuit in cQASM 3.0."""
    n = params.get("num_qubits", 3)
    qubits = params.get("qubits", list(range(n)))
    lines = [
        "version 3.0",
        f"qubit[{max(qubits) + 1}] q",
        f"bit[{max(qubits) + 1}] b",
        "",
        f"H q[{qubits[0]}]",
    ]
    for i in range(len(qubits) - 1):
        lines.append(f"CNOT q[{qubits[i]}], q[{qubits[i + 1]}]")
    lines.append("b = measure q")
    return "\n".join(lines)


def _vqe_ansatz_block(params):
    """Return the subspace-preserving VQE ansatz lines.

    Circuit: Ry(alpha) q[0], CNOT q[0]q[1], X q[0]
    Creates state: cos(alpha/2)|10> + sin(alpha/2)|01>
    This stays exactly in {|01>, |10>} with zero leakage into |00>/|11>.

    Accepts either 'alpha' (preferred) or legacy 'theta' parameter.
    For equilibrium H2 (R=0.735A), optimal alpha ~ -0.2235.
    """
    alpha = params.get("alpha", params.get("theta", -0.2235))
    qubits = params.get("qubits", [0, 1])
    q = qubits
    lines = [
        f"// Subspace-preserving ansatz: Ry-CNOT-X",
        f"// State = cos(a/2)|10> + sin(a/2)|01>, alpha={alpha:.6f}",
        f"Ry({alpha:.6f}) q[{q[0]}]",
        f"CNOT q[{q[0]}], q[{q[1]}]",
        f"X q[{q[0]}]",
    ]
    return q, lines


def generate_vqe_z_circuit(params):
    """Generate VQE circuit with Z-basis measurement."""
    q, ansatz = _vqe_ansatz_block(params)
    header = [
        "version 3.0",
        f"qubit[{max(q) + 1}] q",
        f"bit[{max(q) + 1}] b",
        "",
    ]
    footer = ["", "// Z-basis measurement", "b = measure q"]
    return "\n".join(header + ansatz + footer)


def generate_vqe_x_circuit(params):
    """VQE circuit with X-basis measurement (H rotation before measure)."""
    q, ansatz = _vqe_ansatz_block(params)
    header = [
        "version 3.0",
        f"qubit[{max(q) + 1}] q",
        f"bit[{max(q) + 1}] b",
        "",
    ]
    footer = [
        "",
        "// Rotate to X-basis",
        f"H q[{q[0]}]",
        f"H q[{q[1]}]",
        "",
        "b = measure q",
    ]
    return "\n".join(header + ansatz + footer)


def generate_vqe_y_circuit(params):
    """VQE circuit with Y-basis measurement (Sdg+H rotation before measure)."""
    q, ansatz = _vqe_ansatz_block(params)
    header = [
        "version 3.0",
        f"qubit[{max(q) + 1}] q",
        f"bit[{max(q) + 1}] b",
        "",
    ]
    footer = [
        "",
        "// Rotate to Y-basis (Sdg then H)",
        f"Sdag q[{q[0]}]",
        f"H q[{q[0]}]",
        f"Sdag q[{q[1]}]",
        f"H q[{q[1]}]",
        "",
        "b = measure q",
    ]
    return "\n".join(header + ansatz + footer)


# ─── Randomized Benchmarking (1-qubit) ────────────────────────────────────

# 24 single-qubit Clifford gates as sequences of native gates (I, X, Y, Z, H, S, Sdag, ...)
# Each Clifford is represented as a list of gate strings to apply in order.
SINGLE_QUBIT_CLIFFORDS = [
    [],                     # 0: I
    ["H"],                  # 1: H
    ["S"],                  # 2: S
    ["Sdag"],               # 3: Sdag
    ["X"],                  # 4: X
    ["Y"],                  # 5: Y
    ["Z"],                  # 6: Z
    ["H", "S"],             # 7: HS
    ["H", "Sdag"],          # 8: HSdag
    ["S", "H"],             # 9: SH
    ["Sdag", "H"],          # 10: SdagH
    ["X", "H"],             # 11: XH
    ["X", "S"],             # 12: XS
    ["X", "Sdag"],          # 13: XSdag
    ["Y", "H"],             # 14: YH
    ["Z", "H"],             # 15: ZH
    ["H", "S", "H"],        # 16: HSH
    ["H", "Sdag", "H"],     # 17: HSdagH
    ["S", "H", "Sdag"],     # 18: SHSdag
    ["Sdag", "H", "S"],     # 19: SdagHS
    ["X", "S", "H"],        # 20: XSH
    ["X", "Sdag", "H"],     # 21: XSdagH
    ["Y", "H", "S"],        # 22: YHS
    ["Y", "H", "Sdag"],     # 23: YHSdag
]

# Pre-computed multiplication table: CLIFFORD_MULT[i][j] = index of C_i * C_j
# This was computed by tracking the Bloch sphere action of each Clifford.
# We only need the inverse lookup: for a product of Cliffords, find which single
# Clifford undoes it. We compute this on-the-fly by composing matrices.

def _clifford_matrix(gates):
    """Compute the 2x2 unitary for a sequence of gates."""
    I = np.eye(2, dtype=complex)
    X = np.array([[0, 1], [1, 0]], dtype=complex)
    Y = np.array([[0, -1j], [1j, 0]], dtype=complex)
    Z = np.array([[1, 0], [0, -1]], dtype=complex)
    H = np.array([[1, 1], [1, -1]], dtype=complex) / np.sqrt(2)
    S = np.array([[1, 0], [0, 1j]], dtype=complex)
    Sd = np.array([[1, 0], [0, -1j]], dtype=complex)
    gate_map = {"X": X, "Y": Y, "Z": Z, "H": H, "S": S, "Sdag": Sd}
    mat = I.copy()
    for g in gates:
        mat = gate_map[g] @ mat
    return mat

# Build all 24 Clifford matrices and their inverses
_CLIFF_MATS = [_clifford_matrix(gates) for gates in SINGLE_QUBIT_CLIFFORDS]

def _find_inverse_clifford(composed_mat):
    """Find which Clifford index is the inverse of the given matrix."""
    for i, mat in enumerate(_CLIFF_MATS):
        product = mat @ composed_mat
        # Check if product is proportional to identity
        if abs(abs(product[0, 0]) - 1) < 1e-6 and abs(product[0, 1]) < 1e-6:
            return i
    return 0  # fallback to identity


def generate_rb_circuits(params):
    """Generate randomized benchmarking circuits for 1 qubit.

    Returns one circuit per (sequence_length, seed) pair.
    """
    import random as _random

    qubit = params.get("qubit", 0)
    seq_lengths = params.get("sequence_lengths", [1, 4, 8, 16, 32])
    num_sequences = params.get("num_sequences", 5)
    seed = params.get("seed", 42)
    rng = _random.Random(seed)

    circuits = {}
    for m in seq_lengths:
        for s in range(num_sequences):
            # Pick m random Cliffords
            indices = [rng.randint(0, 23) for _ in range(m)]

            # Compute composed matrix
            composed = np.eye(2, dtype=complex)
            for idx in indices:
                composed = _CLIFF_MATS[idx] @ composed

            # Find inverse Clifford
            inv_idx = _find_inverse_clifford(composed)

            # Build cQASM
            lines = [
                "version 3.0",
                f"qubit[{qubit + 1}] q",
                f"bit[{qubit + 1}] b",
                "",
                f"// RB sequence: m={m}, seed={s}",
            ]
            for idx in indices:
                for gate in SINGLE_QUBIT_CLIFFORDS[idx]:
                    lines.append(f"{gate} q[{qubit}]")
            # Apply inverse
            lines.append(f"// Inverse Clifford (index {inv_idx})")
            for gate in SINGLE_QUBIT_CLIFFORDS[inv_idx]:
                lines.append(f"{gate} q[{qubit}]")
            lines.append("b = measure q")

            circuits[f"rb_m{m}_s{s}"] = "\n".join(lines)

    return circuits


def analyze_rb(all_counts, params):
    """Analyze randomized benchmarking results.

    Fits survival probability p(m) = A * p^m + B to extract gate fidelity.
    """
    seq_lengths = params.get("sequence_lengths", [1, 4, 8, 16, 32])
    num_sequences = params.get("num_sequences", 5)
    qubit = params.get("qubit", 0)

    # Compute survival probability for each sequence length
    survival = {}
    for m in seq_lengths:
        probs = []
        for s in range(num_sequences):
            key = f"rb_m{m}_s{s}"
            counts = all_counts.get(key, {})
            total = sum(counts.values())
            if total == 0:
                continue
            # Survival = probability of measuring |0>
            p0 = counts.get("0", 0) + counts.get("00", 0)
            probs.append(p0 / total)
        if probs:
            survival[m] = sum(probs) / len(probs)

    if len(survival) < 2:
        return {"error": "Insufficient RB data for fit"}

    # Simple exponential fit: log(survival - 0.5) = log(A) + m*log(p)
    # Using least squares on the linearized form
    ms = sorted(survival.keys())
    ps = [survival[m] for m in ms]

    # Fit A*p^m + B where B=0.5 (single qubit, uniform noise)
    B = 0.5
    shifted = [max(p - B, 1e-10) for p in ps]
    log_shifted = [math.log(s) for s in shifted]
    log_ms = [float(m) for m in ms]

    # Linear regression: log(survival - 0.5) = log(A) + m * log(p)
    n = len(ms)
    sum_x = sum(log_ms)
    sum_y = sum(log_shifted)
    sum_xy = sum(x * y for x, y in zip(log_ms, log_shifted))
    sum_x2 = sum(x * x for x in log_ms)

    denom = n * sum_x2 - sum_x * sum_x
    if abs(denom) < 1e-12:
        log_p = 0.0
        log_A = log_shifted[0]
    else:
        log_p = (n * sum_xy - sum_x * sum_y) / denom
        log_A = (sum_y - log_p * sum_x) / n

    p_depol = math.exp(log_p) if log_p < 0 else 0.999  # clamp
    p_depol = max(0, min(1, p_depol))
    A = math.exp(log_A)
    gate_fidelity = (1 + p_depol) / 2
    error_per_gate = 1 - gate_fidelity

    return {
        "gate_fidelity": round(gate_fidelity, 6),
        "error_per_gate": round(error_per_gate, 6),
        "depolarizing_parameter": round(p_depol, 6),
        "fit_amplitude": round(A, 4),
        "survival_probabilities": {str(m): round(v, 4) for m, v in survival.items()},
        "sequence_lengths": seq_lengths,
        "num_sequences": num_sequences,
        "qubit": qubit,
        "interpretation": (
            f"1-qubit RB: gate fidelity {gate_fidelity:.2%}, "
            f"error per gate {error_per_gate:.4f}. "
            f"{'Excellent' if gate_fidelity > 0.999 else 'Good' if gate_fidelity > 0.99 else 'Moderate' if gate_fidelity > 0.95 else 'Poor'} quality."
        ),
    }


# ─── QAOA MaxCut (3 qubits, triangle) ─────────────────────────────────────

def generate_qaoa_circuits(params):
    """Generate QAOA MaxCut circuits for a 3-qubit triangle graph.

    Single QAOA layer with a sweep of gamma/beta parameters.
    """
    qubits = params.get("qubits", [0, 1, 2])
    _default_sweep = [round(0.1 + 0.1 * i, 1) for i in range(10)]  # 0.1..1.0
    gamma_values = params.get("gamma_values", _default_sweep)
    beta_values = params.get("beta_values", _default_sweep)
    # Triangle edges
    edges = [(qubits[0], qubits[1]), (qubits[1], qubits[2]), (qubits[0], qubits[2])]

    circuits = {}
    for gi, gamma in enumerate(gamma_values):
        for bi, beta in enumerate(beta_values):
            lines = [
                "version 3.0",
                f"qubit[{max(qubits) + 1}] q",
                f"bit[{max(qubits) + 1}] b",
                "",
                f"// QAOA MaxCut: gamma={gamma:.3f}, beta={beta:.3f}",
                "// Initial superposition",
            ]
            for q in qubits:
                lines.append(f"H q[{q}]")

            lines.append("")
            lines.append("// Cost layer: exp(-i*gamma*C) via ZZ interactions")
            for q_a, q_b in edges:
                # ZZ rotation = CNOT - Rz(2*gamma) - CNOT
                lines.append(f"CNOT q[{q_a}], q[{q_b}]")
                lines.append(f"Rz({2 * gamma:.6f}) q[{q_b}]")
                lines.append(f"CNOT q[{q_a}], q[{q_b}]")

            lines.append("")
            lines.append("// Mixer layer: exp(-i*beta*B) via X rotations")
            for q in qubits:
                lines.append(f"Rx({2 * beta:.6f}) q[{q}]")

            lines.append("")
            lines.append("b = measure q")
            circuits[f"qaoa_g{gi}_b{bi}"] = "\n".join(lines)

    return circuits


def analyze_qaoa(all_counts, params):
    """Analyze QAOA MaxCut results for triangle graph.

    Computes approximation ratio vs classical optimum.
    """
    qubits = params.get("qubits", [0, 1, 2])
    _default_sweep = [round(0.1 + 0.1 * i, 1) for i in range(10)]
    gamma_values = params.get("gamma_values", _default_sweep)
    beta_values = params.get("beta_values", _default_sweep)
    n = len(qubits)
    edges = [(0, 1), (1, 2), (0, 2)]  # triangle

    def cut_value(bitstring):
        """Count edges cut by this assignment."""
        bits = bitstring[-n:]
        cut = 0
        for i, j in edges:
            if bits[-(i + 1)] != bits[-(j + 1)]:
                cut += 1
        return cut

    # Classical optimum for triangle: max cut = 2 (e.g., 010, 101)
    classical_max = 2

    # Compute expected cut value for each (gamma, beta) point
    heatmap = {}
    best_ratio = 0
    best_params = (0, 0)

    for gi, gamma in enumerate(gamma_values):
        for bi, beta in enumerate(beta_values):
            key = f"qaoa_g{gi}_b{bi}"
            counts = all_counts.get(key, {})
            total = sum(counts.values())
            if total == 0:
                continue

            expected_cut = sum(cut_value(bs) * c for bs, c in counts.items()) / total
            ratio = expected_cut / classical_max
            heatmap[f"g{gi}_b{bi}"] = {
                "gamma": gamma,
                "beta": beta,
                "expected_cut": round(expected_cut, 4),
                "approximation_ratio": round(ratio, 4),
            }
            if ratio > best_ratio:
                best_ratio = ratio
                best_params = (gamma, beta)

    return {
        "best_approximation_ratio": round(best_ratio, 4),
        "best_gamma": best_params[0],
        "best_beta": best_params[1],
        "classical_max_cut": classical_max,
        "heatmap": heatmap,
        "gamma_values": gamma_values,
        "beta_values": beta_values,
        "num_qubits": n,
        "graph": "triangle",
        "interpretation": (
            f"QAOA MaxCut on triangle: best approximation ratio {best_ratio:.1%} "
            f"at gamma={best_params[0]:.2f}, beta={best_params[1]:.2f}. "
            f"Classical optimum: {classical_max} edges cut."
        ),
    }


# ─── Quantum Volume (2-3 qubits) ──────────────────────────────────────────

def _random_su4_cqasm(q0, q1, seed_val):
    """Generate a random SU(4) layer as Rz-Ry-Rz single-qubit rotations + CNOT.

    Uses deterministic angles from seed for reproducibility.
    """
    import random as _random
    rng = _random.Random(seed_val)

    lines = []
    # Random single-qubit rotations on both qubits
    for q in [q0, q1]:
        rz1 = rng.uniform(0, 2 * math.pi)
        ry = rng.uniform(0, math.pi)
        rz2 = rng.uniform(0, 2 * math.pi)
        lines.append(f"Rz({rz1:.6f}) q[{q}]")
        lines.append(f"Ry({ry:.6f}) q[{q}]")
        lines.append(f"Rz({rz2:.6f}) q[{q}]")
    # CNOT entangling gate
    lines.append(f"CNOT q[{q0}], q[{q1}]")
    # More single-qubit rotations
    for q in [q0, q1]:
        rz1 = rng.uniform(0, 2 * math.pi)
        ry = rng.uniform(0, math.pi)
        lines.append(f"Rz({rz1:.6f}) q[{q}]")
        lines.append(f"Ry({ry:.6f}) q[{q}]")
    return lines


def generate_qv_circuits(params):
    """Generate Quantum Volume circuits for n=2 and n=3.

    Each QV circuit has depth = n layers of random SU(4) on pairs.
    """
    qubit_counts = params.get("qubit_counts", [2, 3])
    num_circuits = params.get("num_circuits", 5)
    seed = params.get("seed", 123)

    circuits = {}
    for n in qubit_counts:
        for c in range(num_circuits):
            qubits = list(range(n))
            lines = [
                "version 3.0",
                f"qubit[{n}] q",
                f"bit[{n}] b",
                "",
                f"// QV circuit: n={n}, circuit={c}",
            ]
            # n layers of random SU(4) on adjacent pairs
            for layer in range(n):
                lines.append(f"// Layer {layer}")
                for pair_idx in range(n // 2):
                    q0 = qubits[2 * pair_idx]
                    q1 = qubits[2 * pair_idx + 1]
                    su4_seed = seed + n * 1000 + c * 100 + layer * 10 + pair_idx
                    lines.extend(_random_su4_cqasm(q0, q1, su4_seed))
                # If odd number of qubits, apply random single-qubit gate to last
                if n % 2 == 1:
                    import random as _random
                    rng = _random.Random(seed + n * 1000 + c * 100 + layer * 10 + 99)
                    q = qubits[-1]
                    lines.append(f"Rz({rng.uniform(0, 2 * math.pi):.6f}) q[{q}]")
                    lines.append(f"Ry({rng.uniform(0, math.pi):.6f}) q[{q}]")

            lines.append("")
            lines.append("b = measure q")
            circuits[f"qv_n{n}_c{c}"] = "\n".join(lines)

    return circuits


def _ideal_qv_probs(circuit_cqasm, n):
    """Simulate QV circuit classically to get ideal output probabilities.

    Uses numpy matrix multiplication (trivial for n<=3: 4-8 dimensional).
    """
    # Parse the cQASM and apply gates to state vector
    state = np.zeros(2**n, dtype=complex)
    state[0] = 1.0  # |000...0>

    def apply_single(state, gate_mat, qubit, n_qubits):
        """Apply a single-qubit gate to the state vector."""
        new_state = np.zeros_like(state)
        for i in range(2**n_qubits):
            bit = (i >> qubit) & 1
            i_flipped = i ^ (1 << qubit)
            new_state[i] += gate_mat[bit, 0] * state[i & ~(1 << qubit)] + gate_mat[bit, 1] * state[i | (1 << qubit)]
        return new_state

    def apply_gate(state, gate_name, params_list, qubit, n_qubits):
        I2 = np.eye(2, dtype=complex)
        X = np.array([[0, 1], [1, 0]], dtype=complex)
        H = np.array([[1, 1], [1, -1]], dtype=complex) / np.sqrt(2)

        if gate_name == "Rz":
            angle = params_list[0]
            mat = np.array([[np.exp(-1j * angle / 2), 0], [0, np.exp(1j * angle / 2)]], dtype=complex)
        elif gate_name == "Ry":
            angle = params_list[0]
            c, s = np.cos(angle / 2), np.sin(angle / 2)
            mat = np.array([[c, -s], [s, c]], dtype=complex)
        elif gate_name == "Rx":
            angle = params_list[0]
            c, s = np.cos(angle / 2), np.sin(angle / 2)
            mat = np.array([[c, -1j * s], [-1j * s, c]], dtype=complex)
        elif gate_name == "H":
            mat = H
        elif gate_name == "X":
            mat = X
        elif gate_name == "S":
            mat = np.array([[1, 0], [0, 1j]], dtype=complex)
        elif gate_name == "Sdag":
            mat = np.array([[1, 0], [0, -1j]], dtype=complex)
        else:
            return state  # skip unknown

        # Apply via tensor product approach
        dim = 2**n_qubits
        new_state = np.zeros(dim, dtype=complex)
        for i in range(dim):
            b = (i >> qubit) & 1
            i0 = i & ~(1 << qubit)  # i with qubit=0
            i1 = i | (1 << qubit)   # i with qubit=1
            new_state[i] = mat[b, 0] * state[i0] + mat[b, 1] * state[i1]
        return new_state

    def apply_cnot(state, ctrl, targ, n_qubits):
        dim = 2**n_qubits
        new_state = np.zeros(dim, dtype=complex)
        for i in range(dim):
            cb = (i >> ctrl) & 1
            if cb == 1:
                j = i ^ (1 << targ)
                new_state[j] = state[i]
            else:
                new_state[i] = state[i]
        return new_state

    # Parse cQASM lines
    for line in circuit_cqasm.split("\n"):
        line = line.strip()
        if not line or line.startswith("//") or line.startswith("version") or line.startswith("qubit") or line.startswith("bit") or line.startswith("b ="):
            continue

        if line.startswith("CNOT"):
            parts = line.replace("CNOT", "").strip().split(",")
            ctrl = int(parts[0].strip().split("[")[1].split("]")[0])
            targ = int(parts[1].strip().split("[")[1].split("]")[0])
            state = apply_cnot(state, ctrl, targ, n)
        else:
            # Parse gate_name(param) q[idx] or gate_name q[idx]
            if "(" in line:
                gate_name = line.split("(")[0].strip()
                param_str = line.split("(")[1].split(")")[0]
                gate_params = [float(param_str)]
                qubit_str = line.split("]")[0].split("[")[-1]
                qubit = int(qubit_str)
            else:
                parts = line.split()
                gate_name = parts[0]
                gate_params = []
                qubit_str = parts[1].split("[")[1].split("]")[0]
                qubit = int(qubit_str)
            state = apply_gate(state, gate_name, gate_params, qubit, n)

    # Return probability distribution
    probs = np.abs(state) ** 2
    return probs


def analyze_qv(all_counts, params):
    """Analyze Quantum Volume results.

    Computes heavy output fraction and checks against 2/3 threshold.
    """
    qubit_counts = params.get("qubit_counts", [2, 3])
    num_circuits = params.get("num_circuits", 5)

    results_by_n = {}
    for n in qubit_counts:
        heavy_fractions = []
        for c in range(num_circuits):
            key = f"qv_n{n}_c{c}"
            counts = all_counts.get(key, {})
            total = sum(counts.values())
            if total == 0:
                continue

            # Get corresponding circuit for ideal simulation
            circuit_key = key
            circuit_cqasm = None
            # We need the circuit — it's stored alongside counts in the run
            # For analysis, we regenerate it deterministically
            temp_params = dict(params)
            temp_circuits = generate_qv_circuits(temp_params)
            circuit_cqasm = temp_circuits.get(key)

            if circuit_cqasm is None:
                continue

            # Get ideal probabilities
            ideal_probs = _ideal_qv_probs(circuit_cqasm, n)

            # Heavy outputs: bitstrings whose ideal probability > median
            median_prob = float(np.median(ideal_probs))
            heavy_output_count = 0
            for bs, count in counts.items():
                # Convert bitstring to index
                bits = bs[-n:].zfill(n)
                idx = int(bits, 2)
                if idx < len(ideal_probs) and ideal_probs[idx] > median_prob:
                    heavy_output_count += count

            heavy_fraction = heavy_output_count / total
            heavy_fractions.append(heavy_fraction)

        if heavy_fractions:
            avg_heavy = sum(heavy_fractions) / len(heavy_fractions)
            passed = avg_heavy > 2 / 3
            results_by_n[str(n)] = {
                "heavy_output_fraction": round(avg_heavy, 4),
                "passed": passed,
                "threshold": round(2 / 3, 4),
                "num_circuits": len(heavy_fractions),
            }

    # Determine QV number (largest n that passes)
    qv_number = 1
    for n in sorted(qubit_counts):
        info = results_by_n.get(str(n), {})
        if info.get("passed", False):
            qv_number = 2**n

    return {
        "quantum_volume": qv_number,
        "results_by_qubit_count": results_by_n,
        "qubit_counts_tested": qubit_counts,
        "interpretation": (
            f"Quantum Volume: {qv_number}. "
            + ". ".join(
                f"n={n}: {'PASS' if results_by_n.get(str(n), {}).get('passed', False) else 'FAIL'} "
                f"(heavy={results_by_n.get(str(n), {}).get('heavy_output_fraction', 0):.1%})"
                for n in qubit_counts if str(n) in results_by_n
            )
        ),
    }


# ─── Connectivity Probe ──────────────────────────────────────────────────

def generate_connectivity_probe_circuits(params):
    """Generate Bell-pair circuits for all qubit pairs to map CNOT fidelity.

    Creates one Bell circuit per pair (i,j) with i<j on 9 qubits.
    """
    num_qubits = params.get("num_qubits", 9)
    pairs = params.get("pairs", None)
    if pairs is None:
        pairs = [(i, j) for i in range(num_qubits) for j in range(i + 1, num_qubits)]

    circuits = {}
    for i, j in pairs:
        circuit = f"""version 3.0
qubit[{num_qubits}] q
bit[{num_qubits}] b

H q[{i}]
CNOT q[{i}], q[{j}]
b = measure q"""
        circuits[f"pair_{i}_{j}"] = circuit
    return circuits


def analyze_connectivity_probe(all_counts, params):
    """Analyze Bell fidelity for each qubit pair.

    Returns pair fidelities ranked best to worst, plus a 9x9 heatmap.
    """
    num_qubits = params.get("num_qubits", 9)
    pair_fidelities = {}

    for key, counts in all_counts.items():
        if not key.startswith("pair_"):
            continue
        parts = key.split("_")
        i, j = int(parts[1]), int(parts[2])
        total = sum(counts.values())
        if total == 0:
            continue

        # Bell fidelity = P(both same) for the target qubits
        correct = 0
        for bitstring, count in counts.items():
            bits = bitstring.zfill(num_qubits)
            # cQASM bit order: b[0] is leftmost in output
            bi = int(bits[-(i + 1)])
            bj = int(bits[-(j + 1)])
            if bi == bj:
                correct += count

        fidelity = correct / total
        pair_fidelities[f"{i}-{j}"] = round(fidelity, 4)

    # Build heatmap (symmetric)
    heatmap = {}
    for pair_key, fid in pair_fidelities.items():
        i, j = map(int, pair_key.split("-"))
        heatmap[f"{i},{j}"] = fid
        heatmap[f"{j},{i}"] = fid
    for i in range(num_qubits):
        heatmap[f"{i},{i}"] = 1.0

    # Rank pairs
    ranked = sorted(pair_fidelities.items(), key=lambda x: x[1], reverse=True)
    best_5q = []
    best_6q = []
    if ranked:
        # Greedy subgraph: pick best-connected 5 qubits
        used = set()
        for pair_key, fid in ranked:
            i, j = map(int, pair_key.split("-"))
            used.add(i)
            used.add(j)
            if len(used) >= 5 and not best_5q:
                best_5q = sorted(list(used))[:5]
            if len(used) >= 6 and not best_6q:
                best_6q = sorted(list(used))[:6]
                break

    avg_fidelity = sum(pair_fidelities.values()) / len(pair_fidelities) if pair_fidelities else 0

    return {
        "pair_fidelities": pair_fidelities,
        "heatmap": heatmap,
        "num_qubits": num_qubits,
        "num_pairs": len(pair_fidelities),
        "average_fidelity": round(avg_fidelity, 4),
        "best_pairs": [{"pair": p, "fidelity": f} for p, f in ranked[:10]],
        "worst_pairs": [{"pair": p, "fidelity": f} for p, f in ranked[-5:]],
        "recommended_5q_subgraph": best_5q,
        "recommended_6q_subgraph": best_6q,
        "interpretation": (
            f"Connectivity probe: {len(pair_fidelities)} pairs measured. "
            f"Average Bell fidelity: {avg_fidelity:.1%}. "
            f"Best pair: {ranked[0][0]} ({ranked[0][1]:.1%}). "
            f"Worst pair: {ranked[-1][0]} ({ranked[-1][1]:.1%})."
            if ranked else "No pairs measured."
        ),
    }


# ─── Repetition Code (3-qubit) ──────────────────────────────────────────

def generate_repetition_code_circuits(params):
    """Generate 3-qubit repetition code circuits with syndrome extraction.

    Layout: d0 -- s0 -- d1 -- s1 -- d2
    Qubits: [d0, d1, d2, s0, s1] mapped to physical qubits from params.
    Stabilizers: Z0Z1 -> s0, Z1Z2 -> s1 (via CNOT).
    """
    # Physical qubit mapping (default: 0-4)
    qmap = params.get("qubit_mapping", [0, 1, 2, 3, 4])
    d0, d1, d2 = qmap[0], qmap[1], qmap[2]
    s0, s1 = qmap[3], qmap[4]
    num_qubits = max(qmap) + 1
    shots = params.get("shots", 4096)

    variants = {}

    # No error: logical |0> = |000>
    variants["no_error"] = {
        "prep": [],
        "error": [],
        "expected_syndrome": [0, 0],
        "expected_data_parity": 0,
    }

    # Error on d0
    variants["error_d0"] = {
        "prep": [],
        "error": [f"X q[{d0}]"],
        "expected_syndrome": [1, 0],
        "expected_data_parity": 1,
    }

    # Error on d1
    variants["error_d1"] = {
        "prep": [],
        "error": [f"X q[{d1}]"],
        "expected_syndrome": [1, 1],
        "expected_data_parity": 1,
    }

    # Error on d2
    variants["error_d2"] = {
        "prep": [],
        "error": [f"X q[{d2}]"],
        "expected_syndrome": [0, 1],
        "expected_data_parity": 1,
    }

    # Logical |1> = |111>
    variants["logical_1"] = {
        "prep": [f"X q[{d0}]", f"X q[{d1}]", f"X q[{d2}]"],
        "error": [],
        "expected_syndrome": [0, 0],
        "expected_data_parity": 1,
    }

    # Logical |+>
    variants["logical_plus"] = {
        "prep": [f"H q[{d0}]", f"H q[{d1}]", f"H q[{d2}]"],
        "error": [],
        "expected_syndrome": None,  # mixed
        "expected_data_parity": None,
    }

    circuits = {}
    for name, v in variants.items():
        lines = [
            "version 3.0",
            f"qubit[{num_qubits}] q",
            f"bit[{num_qubits}] b",
            "",
            f"// Repetition code: {name}",
        ]

        # State preparation
        if v["prep"]:
            lines.append("// Prepare logical state")
            lines.extend(v["prep"])
            lines.append("")

        # Error injection
        if v["error"]:
            lines.append("// Inject error")
            lines.extend(v["error"])
            lines.append("")

        # Syndrome extraction: Z0Z1 -> s0, Z1Z2 -> s1
        lines.append("// Syndrome extraction")
        lines.append(f"CNOT q[{d0}], q[{s0}]")
        lines.append(f"CNOT q[{d1}], q[{s0}]")
        lines.append(f"CNOT q[{d1}], q[{s1}]")
        lines.append(f"CNOT q[{d2}], q[{s1}]")
        lines.append("")
        lines.append("b = measure q")

        circuits[name] = "\n".join(lines)

    return circuits


def analyze_repetition_code(all_counts, params):
    """Analyze repetition code results.

    Extracts syndromes from ancilla bits, checks against expected values,
    and computes logical error rate with majority-vote decoding.
    """
    qmap = params.get("qubit_mapping", [0, 1, 2, 3, 4])
    d0, d1, d2 = qmap[0], qmap[1], qmap[2]
    s0, s1 = qmap[3], qmap[4]
    num_qubits = max(qmap) + 1

    expected_syndromes = {
        "no_error": (0, 0),
        "error_d0": (1, 0),
        "error_d1": (1, 1),
        "error_d2": (0, 1),
        "logical_1": (0, 0),
    }

    # Correction map: syndrome -> which data qubit to flip
    correction_map = {
        (0, 0): None,
        (1, 0): 0,  # d0
        (1, 1): 1,  # d1
        (0, 1): 2,  # d2
    }

    variant_results = {}
    total_logical_errors = 0
    total_correctable = 0

    for variant_name, counts in all_counts.items():
        if variant_name == "logical_plus":
            # Skip: syndrome is inherently mixed
            variant_results[variant_name] = {"note": "Mixed syndrome expected for |+> state"}
            continue

        total = sum(counts.values())
        if total == 0:
            continue

        expected = expected_syndromes.get(variant_name)
        correct_syndrome_count = 0
        logical_errors_after_correction = 0

        # Determine expected logical value
        is_logical_1 = variant_name == "logical_1"

        syndrome_dist = {}
        for bitstring, count in counts.items():
            bits = bitstring.zfill(num_qubits)
            # Extract bits (cQASM: bit index matches qubit index, rightmost = q[0])
            def get_bit(q_idx):
                return int(bits[-(q_idx + 1)])

            measured_s0 = get_bit(s0)
            measured_s1 = get_bit(s1)
            syndrome = (measured_s0, measured_s1)
            syndrome_key = f"{measured_s0}{measured_s1}"
            syndrome_dist[syndrome_key] = syndrome_dist.get(syndrome_key, 0) + count

            # Check syndrome accuracy
            if expected and syndrome == expected:
                correct_syndrome_count += count

            # Majority vote decoding on data qubits
            data_bits = [get_bit(d0), get_bit(d1), get_bit(d2)]

            # Apply correction based on syndrome
            correction = correction_map.get(syndrome)
            if correction is not None:
                data_bits[correction] ^= 1

            # Decode logical value via majority vote
            logical_val = 1 if sum(data_bits) >= 2 else 0
            expected_logical = 1 if is_logical_1 else 0

            if logical_val != expected_logical:
                logical_errors_after_correction += count

        syndrome_accuracy = correct_syndrome_count / total if expected else None
        logical_error_rate = logical_errors_after_correction / total

        variant_results[variant_name] = {
            "total_shots": total,
            "syndrome_accuracy": round(syndrome_accuracy, 4) if syndrome_accuracy is not None else None,
            "syndrome_distribution": syndrome_dist,
            "logical_error_rate": round(logical_error_rate, 4),
            "expected_syndrome": f"{expected[0]}{expected[1]}" if expected else None,
        }

        if variant_name not in ("logical_1", "logical_plus"):
            total_logical_errors += logical_errors_after_correction
            total_correctable += total

    avg_logical_error_rate = total_logical_errors / total_correctable if total_correctable > 0 else 0

    # Compute average syndrome accuracy across deterministic variants
    syn_accs = [v["syndrome_accuracy"] for v in variant_results.values()
                if isinstance(v, dict) and v.get("syndrome_accuracy") is not None]
    avg_syndrome_accuracy = sum(syn_accs) / len(syn_accs) if syn_accs else 0

    return {
        "variant_results": variant_results,
        "average_syndrome_accuracy": round(avg_syndrome_accuracy, 4),
        "average_logical_error_rate": round(avg_logical_error_rate, 4),
        "qubit_mapping": qmap,
        "code_type": "3-qubit repetition",
        "num_data_qubits": 3,
        "num_syndrome_qubits": 2,
        "interpretation": (
            f"3-qubit repetition code: avg syndrome accuracy {avg_syndrome_accuracy:.1%}, "
            f"logical error rate {avg_logical_error_rate:.1%} (after majority-vote correction). "
            f"{'Code is working — errors detected and corrected.' if avg_syndrome_accuracy > 0.7 else 'Significant hardware noise affecting syndrome extraction.'}"
        ),
    }


# ─── [[4,2,2]] Detection Code ───────────────────────────────────────────

def generate_detection_code_circuits(params):
    """Generate [[4,2,2]] detection code circuits.

    4 data qubits + 2 ancilla (X-type and Z-type).
    Stabilizers: XXXX (detects Z errors) and ZZZZ (detects X errors).
    """
    qmap = params.get("qubit_mapping", [0, 1, 2, 3, 4, 5])
    d0, d1, d2, d3 = qmap[0], qmap[1], qmap[2], qmap[3]
    ax, az = qmap[4], qmap[5]  # X-ancilla, Z-ancilla
    num_qubits = max(qmap) + 1

    def syndrome_block():
        """XXXX and ZZZZ stabilizer measurement."""
        lines = []
        # XXXX stabilizer (X-type): detects Z errors
        lines.append("// XXXX stabilizer measurement")
        lines.append(f"H q[{ax}]")
        lines.append(f"CNOT q[{ax}], q[{d0}]")
        lines.append(f"CNOT q[{ax}], q[{d1}]")
        lines.append(f"CNOT q[{ax}], q[{d2}]")
        lines.append(f"CNOT q[{ax}], q[{d3}]")
        lines.append(f"H q[{ax}]")
        lines.append("")
        # ZZZZ stabilizer (Z-type): detects X errors
        lines.append("// ZZZZ stabilizer measurement")
        lines.append(f"CNOT q[{d0}], q[{az}]")
        lines.append(f"CNOT q[{d1}], q[{az}]")
        lines.append(f"CNOT q[{d2}], q[{az}]")
        lines.append(f"CNOT q[{d3}], q[{az}]")
        return lines

    # GHZ state preparation: logical |00> = (|0000>+|1111>)/sqrt(2)
    # This puts data qubits into the [[4,2,2]] codespace (+1 eigenspace of XXXX and ZZZZ)
    codespace_prep = [
        f"// Prepare logical |00> = GHZ state (codespace)",
        f"H q[{d0}]",
        f"CNOT q[{d0}], q[{d1}]",
        f"CNOT q[{d0}], q[{d2}]",
        f"CNOT q[{d0}], q[{d3}]",
    ]

    variants = {}

    # No error: logical |00>, both syndromes = 0
    variants["no_error"] = {"prep": codespace_prep, "error": [], "expected_x_syndrome": 0, "expected_z_syndrome": 0, "error_type": "none"}

    # X errors on each data qubit (ZZZZ flips)
    for idx, dq in enumerate([d0, d1, d2, d3]):
        variants[f"x_error_d{idx}"] = {
            "prep": codespace_prep, "error": [f"X q[{dq}]"],
            "expected_x_syndrome": 0, "expected_z_syndrome": 1,
            "error_type": f"X_d{idx}",
        }

    # Z errors on each data qubit (XXXX flips)
    for idx, dq in enumerate([d0, d1, d2, d3]):
        variants[f"z_error_d{idx}"] = {
            "prep": codespace_prep, "error": [f"Z q[{dq}]"],
            "expected_x_syndrome": 1, "expected_z_syndrome": 0,
            "error_type": f"Z_d{idx}",
        }

    # Y errors on each data qubit (both flip)
    for idx, dq in enumerate([d0, d1, d2, d3]):
        variants[f"y_error_d{idx}"] = {
            "prep": codespace_prep, "error": [f"X q[{dq}]", f"Z q[{dq}]"],
            "expected_x_syndrome": 1, "expected_z_syndrome": 1,
            "error_type": f"Y_d{idx}",
        }

    circuits = {}
    for name, v in variants.items():
        lines = [
            "version 3.0",
            f"qubit[{num_qubits}] q",
            f"bit[{num_qubits}] b",
            "",
            f"// [[4,2,2]] detection code: {name}",
        ]

        if v["prep"]:
            lines.extend(v["prep"])
            lines.append("")

        if v["error"]:
            lines.append("// Inject error")
            lines.extend(v["error"])
            lines.append("")

        lines.extend(syndrome_block())
        lines.append("")
        lines.append("b = measure q")

        circuits[name] = "\n".join(lines)

    return circuits


def analyze_detection_code(all_counts, params):
    """Analyze [[4,2,2]] detection code results.

    Checks syndrome extraction accuracy, detection rates, and false positive rates.
    Optionally trains NN decoder if enough data.
    """
    qmap = params.get("qubit_mapping", [0, 1, 2, 3, 4, 5])
    d0, d1, d2, d3 = qmap[0], qmap[1], qmap[2], qmap[3]
    ax, az = qmap[4], qmap[5]
    num_qubits = max(qmap) + 1

    variant_results = {}
    detection_correct = 0
    detection_total = 0
    false_positives = 0
    false_positive_total = 0

    # Collect training data for decoder
    decoder_X = []
    decoder_y = []

    for variant_name, counts in all_counts.items():
        total = sum(counts.values())
        if total == 0:
            continue

        # Determine expected syndromes
        is_no_error = variant_name == "no_error"
        expected_x = 0
        expected_z = 0
        error_type = "none"
        if variant_name.startswith("x_error"):
            expected_z = 1
            error_type = variant_name.replace("x_error_", "X_")
        elif variant_name.startswith("z_error"):
            expected_x = 1
            error_type = variant_name.replace("z_error_", "Z_")
        elif variant_name.startswith("y_error"):
            expected_x = 1
            expected_z = 1
            error_type = variant_name.replace("y_error_", "Y_")

        correct_detection = 0
        syndrome_dist = {}

        for bitstring, count in counts.items():
            bits = bitstring.zfill(num_qubits)
            def get_bit(q_idx):
                return int(bits[-(q_idx + 1)])

            sx = get_bit(ax)
            sz = get_bit(az)
            syndrome_key = f"X{sx}Z{sz}"
            syndrome_dist[syndrome_key] = syndrome_dist.get(syndrome_key, 0) + count

            # Check if error was detected
            any_error_detected = (sx == 1 or sz == 1)
            should_detect = not is_no_error

            if should_detect and any_error_detected:
                correct_detection += count
            elif is_no_error and not any_error_detected:
                correct_detection += count

            if is_no_error and any_error_detected:
                false_positives += count

            # Collect decoder training data
            data_bits = [get_bit(d0), get_bit(d1), get_bit(d2), get_bit(d3)]
            features = data_bits + [sx, sz]
            for _ in range(count):
                decoder_X.append(features)
                decoder_y.append(error_type)

        detection_rate = correct_detection / total

        if is_no_error:
            false_positive_total += total
        else:
            detection_total += total
            detection_correct += correct_detection

        variant_results[variant_name] = {
            "total_shots": total,
            "detection_rate": round(detection_rate, 4),
            "syndrome_distribution": syndrome_dist,
            "error_type": error_type,
        }

    overall_detection = detection_correct / detection_total if detection_total > 0 else 0
    false_positive_rate = false_positives / false_positive_total if false_positive_total > 0 else 0

    result = {
        "variant_results": variant_results,
        "overall_detection_rate": round(overall_detection, 4),
        "false_positive_rate": round(false_positive_rate, 4),
        "qubit_mapping": qmap,
        "code_type": "[[4,2,2]] detection",
        "num_data_qubits": 4,
        "num_ancilla_qubits": 2,
        "interpretation": (
            f"[[4,2,2]] detection code: {overall_detection:.1%} error detection rate, "
            f"{false_positive_rate:.1%} false positive rate. "
            f"{'Excellent detection performance.' if overall_detection > 0.9 else 'Moderate detection — hardware noise affecting ancilla.' if overall_detection > 0.7 else 'Significant noise degrading error detection.'}"
        ),
    }

    # Try NN decoder if we have enough data
    if len(decoder_X) > 100:
        try:
            from agents.qec_decoder import train_and_evaluate_decoders
            decoder_results = train_and_evaluate_decoders(
                np.array(decoder_X), decoder_y
            )
            result["decoder_comparison"] = decoder_results
            result["interpretation"] += (
                f" NN decoder: {decoder_results.get('nn_accuracy', 0):.1%} accuracy "
                f"vs lookup table: {decoder_results.get('lookup_accuracy', 0):.1%}."
            )
        except Exception as e:
            log(f"Decoder training failed: {e}")
            result["decoder_error"] = str(e)

    return result


def generate_circuit(exp_type, params):
    """Generate the appropriate circuit(s) for an experiment type."""
    if exp_type == "bell_calibration":
        return {"z_basis": generate_bell_circuit(params)}
    elif exp_type == "ghz_state":
        return {"z_basis": generate_ghz_circuit(params)}
    elif exp_type == "vqe_h2":
        return {
            "z_basis": generate_vqe_z_circuit(params),
            "x_basis": generate_vqe_x_circuit(params),
            "y_basis": generate_vqe_y_circuit(params),
        }
    elif exp_type == "rb_1qubit":
        return generate_rb_circuits(params)
    elif exp_type == "qaoa_maxcut":
        return generate_qaoa_circuits(params)
    elif exp_type == "quantum_volume":
        return generate_qv_circuits(params)
    elif exp_type == "connectivity_probe":
        return generate_connectivity_probe_circuits(params)
    elif exp_type == "repetition_code":
        return generate_repetition_code_circuits(params)
    elif exp_type == "detection_code":
        return generate_detection_code_circuits(params)
    else:
        raise ValueError(f"Unknown experiment type: {exp_type}")


# ─── QI Submission ───────────────────────────────────────────────────────────

def submit_to_qi(circuit_cqasm, shots=1024):
    """Submit a circuit to Quantum Inspire via the SDK hybrid interface.

    Uses `qi files run` for local emulator or the SDK for remote hardware.
    Returns raw measurement counts.
    """
    import tempfile

    # Write a hybrid file that the QI SDK expects
    hybrid_code = f'''"""Auto-generated experiment circuit."""
from quantuminspire.sdk.quantum_interface import QuantumInterface

def execute(quantum_interface: QuantumInterface):
    circuit = """{circuit_cqasm}"""
    result = quantum_interface.execute_circuit(circuit, number_of_shots={shots})
    return result

def finalize(results):
    combined = {{}}
    for r in results:
        combined.update(r)
    return combined
'''

    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
        f.write(hybrid_code)
        tmp_path = f.name

    # Resolve qi binary — prefer venv, fall back to PATH
    qi_bin = str(VENV_BIN / "qi") if (VENV_BIN / "qi").exists() else "qi"

    try:
        result = subprocess.run(
            [qi_bin, "files", "run", tmp_path],
            capture_output=True,
            text=True,
            timeout=120,
        )

        if result.returncode != 0:
            log(f"QI ERROR (exit {result.returncode}): {result.stderr[:500]}")
            return None, result.stderr[:500]

        # Parse the output — QI returns JSON-like dict
        output = result.stdout.strip()
        try:
            # Try parsing the last line as JSON (QI outputs other stuff too)
            for line in reversed(output.split("\n")):
                line = line.strip()
                if line.startswith("{") or line.startswith("'"):
                    # Handle Python dict format (single quotes)
                    counts = json.loads(line.replace("'", '"'))
                    return counts, None
            # If no JSON found, try the whole output
            log(f"QI raw output: {output[:300]}")
            return None, f"Could not parse QI output: {output[:200]}"
        except (json.JSONDecodeError, ValueError) as e:
            log(f"QI parse error: {e}, output: {output[:300]}")
            return None, str(e)

    except subprocess.TimeoutExpired:
        return None, "QI submission timed out (120s)"
    except FileNotFoundError:
        return None, "qi CLI not found — install quantuminspire SDK"
    finally:
        Path(tmp_path).unlink(missing_ok=True)


# ─── Analysis ────────────────────────────────────────────────────────────────

def analyze_bell(counts, params):
    """Analyze Bell state measurement results."""
    total = sum(counts.values())
    if total == 0:
        return {"error": "No measurement results"}

    # For Bell state |Phi+> = (|00> + |11>) / sqrt(2)
    # Ideal: 50% |00>, 50% |11>, 0% |01>, 0% |10>
    correct = counts.get("00", 0) + counts.get("11", 0)
    leakage = counts.get("01", 0) + counts.get("10", 0)
    fidelity = correct / total

    return {
        "fidelity": round(fidelity, 4),
        "parity_leakage": round(leakage / total, 4),
        "expected_fidelity": 1.0,
        "total_shots": total,
        "correct_parity": correct,
        "wrong_parity": leakage,
        "interpretation": (
            f"Bell state fidelity: {fidelity:.1%}. "
            f"{'Excellent' if fidelity > 0.95 else 'Good' if fidelity > 0.85 else 'Moderate' if fidelity > 0.7 else 'Poor'} "
            f"— {leakage / total:.1%} leakage into wrong parity states."
        ),
    }


def analyze_ghz(counts, params):
    """Analyze GHZ state measurement results."""
    n = params.get("num_qubits", 3)
    total = sum(counts.values())
    if total == 0:
        return {"error": "No measurement results"}

    # Ideal GHZ: 50% |000...0>, 50% |111...1>
    all_zeros = "0" * n
    all_ones = "1" * n

    # Handle variable-length bitstrings from different backends
    correct = 0
    wrong = 0
    parity_dist = {"even": 0, "odd": 0}

    for bitstring, count in counts.items():
        # Trim or pad to n qubits
        bits = bitstring[-n:] if len(bitstring) >= n else bitstring.zfill(n)
        parity = sum(int(b) for b in bits) % 2
        parity_dist["even" if parity == 0 else "odd"] += count

        if bits == all_zeros or bits == all_ones:
            correct += count
        else:
            wrong += count

    fidelity = correct / total

    return {
        "fidelity": round(fidelity, 4),
        "parity_distribution": {
            k: round(v / total, 4) for k, v in parity_dist.items()
        },
        "ghz_population": {
            all_zeros: counts.get(all_zeros, 0),
            all_ones: counts.get(all_ones, 0),
        },
        "total_shots": total,
        "num_qubits": n,
        "interpretation": (
            f"{n}-qubit GHZ fidelity: {fidelity:.1%}. "
            f"Even parity: {parity_dist['even'] / total:.1%}, "
            f"Odd parity: {parity_dist['odd'] / total:.1%}."
        ),
    }


def parity_postselect(counts):
    """Filter Z-basis counts to odd-parity bitstrings only.

    For BK-reduced 2-qubit H2, valid states are |01> and |10> (odd parity).
    Even-parity states (|00>, |11>) are leakage from hardware noise.
    """
    filtered = {}
    for bs, count in counts.items():
        bits = bs[-2:]
        parity = int(bits[0]) ^ int(bits[1])
        if parity == 1:  # odd parity = valid
            filtered[bs] = count
    return filtered


def analyze_vqe(all_counts, params):
    """Analyze VQE measurement results from Z, X, Y bases.

    Reconstructs <H> = g0*I + g1*Z0 + g2*Z1 + g3*Z0Z1 + g4*X0X1 + g5*Y0Y1
    using expectation values from each measurement basis.
    Applies parity post-selection to Z-basis counts for error mitigation.
    """
    R = params.get("bond_distance", 0.735)

    # H2 Hamiltonian coefficients (STO-3G, 2-qubit, JW + sector projection)
    g0 = -0.321124
    g1 = 0.397937
    g2 = -0.397937
    g3 = 0.0
    g4 = 0.090466
    g5 = 0.090466

    def expectation_from_counts(counts, total):
        """Compute <Z0>, <Z1>, <Z0Z1> from bitstring counts."""
        z0, z1, z0z1 = 0, 0, 0
        for bitstring, count in counts.items():
            bits = bitstring[-2:]
            b0 = int(bits[-1])
            b1 = int(bits[-2])
            z0 += (1 - 2 * b0) * count
            z1 += (1 - 2 * b1) * count
            z0z1 += (1 - 2 * b0) * (1 - 2 * b1) * count
        return z0 / total, z1 / total, z0z1 / total

    z_counts = all_counts.get("z_basis", {})
    x_counts = all_counts.get("x_basis", {})
    y_counts = all_counts.get("y_basis", {})

    total_z = sum(z_counts.values()) if z_counts else 0
    total_x = sum(x_counts.values()) if x_counts else 0
    total_y = sum(y_counts.values()) if y_counts else 0

    if total_z == 0:
        return {"error": "No Z-basis measurement results"}

    # Raw energy (no mitigation)
    exp_z0, exp_z1, exp_z0z1 = expectation_from_counts(z_counts, total_z)
    exp_x0x1 = 0
    if total_x > 0:
        _, _, exp_x0x1 = expectation_from_counts(x_counts, total_x)
    exp_y0y1 = 0
    if total_y > 0:
        _, _, exp_y0y1 = expectation_from_counts(y_counts, total_y)

    energy_raw = g0 + g1 * exp_z0 + g2 * exp_z1 + g3 * exp_z0z1 + g4 * exp_x0x1 + g5 * exp_y0y1

    # Post-selected energy (filter Z-basis to odd-parity only)
    z_filtered = parity_postselect(z_counts)
    z_kept = sum(z_filtered.values())
    keep_fraction = z_kept / total_z if total_z > 0 else 0

    if z_kept > 0:
        ps_z0, ps_z1, ps_z0z1 = expectation_from_counts(z_filtered, z_kept)
        energy_ps = g0 + g1 * ps_z0 + g2 * ps_z1 + g3 * ps_z0z1 + g4 * exp_x0x1 + g5 * exp_y0y1
    else:
        energy_ps = energy_raw
        ps_z0, ps_z1, ps_z0z1 = exp_z0, exp_z1, exp_z0z1

    fci_energy = -1.1373

    return {
        "energy_hartree": round(energy_ps, 6),
        "energy_raw": round(energy_raw, 6),
        "energy_postselected": round(energy_ps, 6),
        "postselection_keep_fraction": round(keep_fraction, 4),
        "fci_energy": fci_energy,
        "error_hartree": round(abs(energy_ps - fci_energy), 6),
        "error_kcal_mol": round(abs(energy_ps - fci_energy) * 627.509, 2),
        "chemical_accuracy": abs(energy_ps - fci_energy) < 0.0016,
        "expectation_values": {
            "Z0": round(ps_z0, 4),
            "Z1": round(ps_z1, 4),
            "Z0Z1": round(ps_z0z1, 4),
            "X0X1": round(exp_x0x1, 4),
            "Y0Y1": round(exp_y0y1, 4),
        },
        "hamiltonian_coefficients": {
            "g0": g0, "g1": g1, "g2": g2,
            "g3": g3, "g4": g4, "g5": g5,
        },
        "bond_distance_angstrom": R,
        "total_shots_per_basis": {
            "z": total_z, "x": total_x, "y": total_y,
        },
        "postselection_z_kept": z_kept,
        "interpretation": (
            f"VQE energy: {energy_ps:.4f} Ha (FCI: {fci_energy:.4f} Ha). "
            f"Error: {abs(energy_ps - fci_energy) * 627.509:.1f} kcal/mol. "
            f"{'Within' if abs(energy_ps - fci_energy) < 0.0016 else 'Outside'} chemical accuracy. "
            f"Post-selection kept {keep_fraction:.0%} of Z-basis shots."
        ),
    }


# ─── Experiment Runner ───────────────────────────────────────────────────────

def run_experiment(exp, dry_run=False):
    """Run a single experiment: generate circuit, submit, analyze."""
    exp_id = exp["id"]
    exp_type = exp["type"]
    params = exp.get("parameters", {})
    shots = params.get("shots", 1024)

    log(f"EXPERIMENT: Starting {exp_id} (type={exp_type}, backend={exp.get('backend', '?')})")

    # Generate circuit(s)
    try:
        circuits = generate_circuit(exp_type, params)
    except ValueError as e:
        log(f"EXPERIMENT: Circuit generation failed for {exp_id}: {e}")
        return None

    if dry_run:
        log(f"DRY RUN: Generated {len(circuits)} circuit(s) for {exp_id}")
        for basis, cqasm in circuits.items():
            print(f"\n--- {basis} ---")
            print(cqasm)
        return None

    # Submit circuit(s) to QI
    update_queue_status(exp, "running")
    submitted = datetime.now(timezone.utc).isoformat()

    all_counts = {}
    all_errors = []

    for basis, cqasm in circuits.items():
        log(f"EXPERIMENT: Submitting {exp_id} {basis} ({shots} shots)")
        counts, error = submit_to_qi(cqasm, shots=shots)
        if error:
            all_errors.append(f"{basis}: {error}")
            log(f"EXPERIMENT: {exp_id} {basis} failed: {error}")
        elif counts:
            all_counts[basis] = counts
            log(f"EXPERIMENT: {exp_id} {basis} complete: {counts}")

    if not all_counts:
        log(f"EXPERIMENT: {exp_id} all submissions failed: {all_errors}")
        update_queue_status(exp, "failed")
        return None

    completed = datetime.now(timezone.utc).isoformat()

    # Analyze results
    if exp_type == "bell_calibration":
        analysis = analyze_bell(all_counts.get("z_basis", {}), params)
        raw_counts = all_counts.get("z_basis", {})
    elif exp_type == "ghz_state":
        analysis = analyze_ghz(all_counts.get("z_basis", {}), params)
        raw_counts = all_counts.get("z_basis", {})
    elif exp_type == "vqe_h2":
        analysis = analyze_vqe(all_counts, params)
        raw_counts = all_counts
    elif exp_type == "rb_1qubit":
        analysis = analyze_rb(all_counts, params)
        raw_counts = all_counts
    elif exp_type == "qaoa_maxcut":
        analysis = analyze_qaoa(all_counts, params)
        raw_counts = all_counts
    elif exp_type == "quantum_volume":
        analysis = analyze_qv(all_counts, params)
        raw_counts = all_counts
    elif exp_type == "connectivity_probe":
        analysis = analyze_connectivity_probe(all_counts, params)
        raw_counts = all_counts
    elif exp_type == "repetition_code":
        analysis = analyze_repetition_code(all_counts, params)
        raw_counts = all_counts
    elif exp_type == "detection_code":
        analysis = analyze_detection_code(all_counts, params)
        raw_counts = all_counts
    else:
        analysis = {"raw": all_counts}
        raw_counts = all_counts

    # Build result
    result = {
        "id": exp_id,
        "type": exp_type,
        "backend": exp.get("backend", "unknown"),
        "submitted": submitted,
        "completed": completed,
        "parameters": params,
        "raw_counts": raw_counts,
        "analysis": analysis,
        "circuit_cqasm": circuits.get("z_basis", list(circuits.values())[0]),
        "errors": all_errors if all_errors else None,
    }

    # Write result
    result_file = RESULTS_DIR / f"{exp_id}.json"
    with open(result_file, "w") as f:
        json.dump(result, f, indent=2)
    log(f"EXPERIMENT: Result written to {result_file}")

    # Update queue status
    update_queue_status(exp, "completed")

    return result


# ─── Git Operations ──────────────────────────────────────────────────────────

def git_commit_results():
    """Commit any new results to git."""
    try:
        # Check if there are changes to commit
        status = subprocess.run(
            ["git", "status", "--porcelain", "experiments/results/"],
            capture_output=True, text=True, cwd=str(PROJECT_DIR),
        )
        if not status.stdout.strip():
            return False

        # Stage and commit
        subprocess.run(
            ["git", "add", "experiments/results/", "experiments/queue/"],
            cwd=str(PROJECT_DIR),
        )
        ts = datetime.now().strftime("%Y-%m-%d %H:%M")
        subprocess.run(
            ["git", "commit", "-m", f"experiment results [{ts}]"],
            capture_output=True, text=True, cwd=str(PROJECT_DIR),
        )
        log("GIT: Committed experiment results")

        # Push if remote is configured
        push = subprocess.run(
            ["git", "push"],
            capture_output=True, text=True, cwd=str(PROJECT_DIR),
            timeout=30,
        )
        if push.returncode == 0:
            log("GIT: Pushed to remote")
        else:
            log(f"GIT: Push failed (may need auth): {push.stderr[:200]}")

        return True
    except Exception as e:
        log(f"GIT: Error: {e}")
        return False


# ─── Daemon Mode ─────────────────────────────────────────────────────────────

_running = True


def _signal_handler(sig, frame):
    global _running
    log("DAEMON: Received shutdown signal")
    _running = False


def run_daemon(interval=DEFAULT_INTERVAL):
    """Run continuously, processing experiments as they appear."""
    global _running
    signal.signal(signal.SIGINT, _signal_handler)
    signal.signal(signal.SIGTERM, _signal_handler)

    log(f"DAEMON: Started (interval={interval}s)")
    log("DAEMON: Press Ctrl+C to stop")

    cycle = 0
    while _running:
        cycle += 1
        pending = get_pending()

        if pending:
            log(f"DAEMON: Cycle {cycle} — {len(pending)} pending experiment(s)")
            results = []
            for exp in pending:
                if not _running:
                    break
                result = run_experiment(exp)
                if result:
                    results.append(result)

            if results:
                git_commit_results()
        else:
            log(f"DAEMON: Cycle {cycle} — no pending experiments")

        if not _running:
            break

        # Sleep in small increments for signal responsiveness
        for _ in range(interval):
            if not _running:
                break
            time.sleep(1)

    log(f"DAEMON: Stopped after {cycle} cycles")


# ─── Status ──────────────────────────────────────────────────────────────────

def show_status():
    """Display queue and results status."""
    queue = load_queue()
    results = load_results()

    pending = [e for e in queue if e.get("status") == "pending"]
    running = [e for e in queue if e.get("status") == "running"]
    completed = [e for e in queue if e.get("status") == "completed"]
    failed = [e for e in queue if e.get("status") == "failed"]

    print("\n" + "=" * 60)
    print("Experiment Pipeline Status")
    print("=" * 60)
    print(f"  Queue:     {len(pending)} pending, {len(running)} running")
    print(f"  Results:   {len(completed)} completed, {len(failed)} failed")
    print(f"  Total:     {len(results)} result file(s)")

    if pending:
        print(f"\n  Pending experiments:")
        for e in pending:
            print(f"    [{e.get('priority', '?')}] {e['id']} ({e['type']}, {e.get('backend', '?')})")

    if results:
        print(f"\n  Latest results:")
        for r in results[-5:]:
            analysis = r.get("analysis", {})
            metric = ""
            if "fidelity" in analysis:
                metric = f"fidelity={analysis['fidelity']:.1%}"
            elif "energy_hartree" in analysis:
                metric = f"E={analysis['energy_hartree']:.4f} Ha"
            print(f"    {r['id']}: {r['type']} on {r.get('backend', '?')} — {metric}")

    print()


# ─── Seed ────────────────────────────────────────────────────────────────────

def create_seed_experiments():
    """Create the initial set of seed experiments."""
    seeds = [
        {
            "id": "bell-calibration-001",
            "type": "bell_calibration",
            "status": "pending",
            "backend": "tuna-9",
            "created": datetime.now(timezone.utc).isoformat(),
            "parameters": {"shots": 1024, "qubits": [0, 1]},
            "priority": 1,
            "description": "Bell state (H + CNOT) on qubits 0,1. Measure fidelity vs ideal |Phi+> state.",
        },
        {
            "id": "ghz-003",
            "type": "ghz_state",
            "status": "pending",
            "backend": "tuna-9",
            "created": datetime.now(timezone.utc).isoformat(),
            "parameters": {"shots": 1024, "num_qubits": 3, "qubits": [0, 1, 2]},
            "priority": 2,
            "description": "3-qubit GHZ state (H + CNOT chain). Measure parity distribution.",
        },
        {
            "id": "vqe-equilibrium-001",
            "type": "vqe_h2",
            "status": "pending",
            "backend": "tuna-9",
            "created": datetime.now(timezone.utc).isoformat(),
            "parameters": {
                "shots": 4096,
                "bond_distance": 0.735,
                "alpha": -0.2235,
                "qubits": [0, 1],
            },
            "priority": 3,
            "description": "H2 VQE at equilibrium (0.735 A). 3 measurement bases.",
        },
    ]

    # New experiment types
    seeds.extend([
        {
            "id": "rb-1qubit-001",
            "type": "rb_1qubit",
            "status": "pending",
            "backend": "qxelarator",
            "created": datetime.now(timezone.utc).isoformat(),
            "parameters": {
                "shots": 1024,
                "qubit": 0,
                "sequence_lengths": [1, 4, 8, 16, 32],
                "num_sequences": 5,
                "seed": 42,
            },
            "priority": 4,
            "description": "1-qubit randomized benchmarking: random Clifford sequences to extract gate fidelity.",
        },
        {
            "id": "qaoa-maxcut-001",
            "type": "qaoa_maxcut",
            "status": "pending",
            "backend": "qxelarator",
            "created": datetime.now(timezone.utc).isoformat(),
            "parameters": {
                "shots": 1024,
                "qubits": [0, 1, 2],
                "gamma_values": [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
                "beta_values": [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
            },
            "priority": 5,
            "description": "QAOA MaxCut on 3-qubit triangle graph. Sweep gamma/beta for optimal approximation ratio.",
        },
        {
            "id": "qv-001",
            "type": "quantum_volume",
            "status": "pending",
            "backend": "qxelarator",
            "created": datetime.now(timezone.utc).isoformat(),
            "parameters": {
                "shots": 1024,
                "qubit_counts": [2, 3],
                "num_circuits": 5,
                "seed": 123,
            },
            "priority": 6,
            "description": "Quantum Volume test for n=2,3 qubits. 5 random circuits each, heavy output threshold 2/3.",
        },
    ])

    QUEUE_DIR.mkdir(parents=True, exist_ok=True)
    for seed in seeds:
        filepath = QUEUE_DIR / f"{seed['id']}.json"
        if filepath.exists():
            log(f"SEED: Skipping {seed['id']} (already exists)")
            continue
        with open(filepath, "w") as f:
            json.dump(seed, f, indent=2)
        log(f"SEED: Created {filepath}")

    log(f"SEED: {len(seeds)} seed experiment(s) ready")


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Experiment Daemon — Live Quantum Hardware Pipeline")
    parser.add_argument("--once", action="store_true", help="Process one pending experiment and exit")
    parser.add_argument("--daemon", action="store_true", help="Run continuously")
    parser.add_argument("--status", action="store_true", help="Show queue status")
    parser.add_argument("--seed", action="store_true", help="Create seed experiments")
    parser.add_argument("--dry-run", action="store_true", help="Generate circuits without submitting")
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL, help="Daemon polling interval (seconds)")
    args = parser.parse_args()

    # Ensure directories exist
    QUEUE_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    if args.seed:
        create_seed_experiments()
        return

    if args.status:
        show_status()
        return

    if args.dry_run:
        pending = get_pending()
        if not pending:
            print("No pending experiments.")
            return
        for exp in pending:
            print(f"\n{'=' * 60}")
            print(f"Experiment: {exp['id']} ({exp['type']})")
            print(f"{'=' * 60}")
            run_experiment(exp, dry_run=True)
        return

    if args.once:
        pending = get_pending()
        if not pending:
            log("ONCE: No pending experiments")
            return
        result = run_experiment(pending[0])
        if result:
            git_commit_results()
            log(f"ONCE: Completed {result['id']}")
        return

    if args.daemon:
        run_daemon(interval=args.interval)
        return

    # Default: show status
    show_status()
    print("Commands:")
    print("  --once      Process one pending experiment")
    print("  --daemon    Run continuously")
    print("  --status    Show queue/results status")
    print("  --seed      Create seed experiments")
    print("  --dry-run   Generate circuits without submitting")


if __name__ == "__main__":
    main()
