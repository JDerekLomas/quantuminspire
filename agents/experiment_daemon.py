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
from datetime import datetime, timezone
from pathlib import Path

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


def generate_vqe_z_circuit(params):
    """Generate VQE circuit with Z-basis measurement.

    Uses a simplified 2-qubit ansatz decomposition of the DoubleExcitation
    gate, mapped to cQASM 3.0 native gates.
    """
    theta = params.get("theta", 0.2286)
    qubits = params.get("qubits", [0, 1, 2, 3])
    q = qubits

    # Simplified 2-qubit Ry ansatz for H2 (Bravyi-Kitaev reduced)
    # HF state: |01> (one electron per qubit in BK basis)
    # Ansatz: Ry(theta) rotation in the {|01>, |10>} subspace
    return f"""version 3.0
qubit[{max(q) + 1}] q
bit[{max(q) + 1}] b

// Prepare HF state |01> in BK basis
X q[{q[0]}]

// Ry ansatz: excitation rotation
CNOT q[{q[0]}], q[{q[1]}]
Ry q[{q[0]}], {theta:.6f}
CNOT q[{q[1]}], q[{q[0]}]
Ry q[{q[0]}], {-theta:.6f}
CNOT q[{q[1]}], q[{q[0]}]
CNOT q[{q[0]}], q[{q[1]}]

// Z-basis measurement
b = measure q"""


def generate_vqe_x_circuit(params):
    """VQE circuit with X-basis measurement (H rotation before measure)."""
    theta = params.get("theta", 0.2286)
    qubits = params.get("qubits", [0, 1, 2, 3])
    q = qubits

    return f"""version 3.0
qubit[{max(q) + 1}] q
bit[{max(q) + 1}] b

// Prepare HF state |01> in BK basis
X q[{q[0]}]

// Ry ansatz
CNOT q[{q[0]}], q[{q[1]}]
Ry q[{q[0]}], {theta:.6f}
CNOT q[{q[1]}], q[{q[0]}]
Ry q[{q[0]}], {-theta:.6f}
CNOT q[{q[1]}], q[{q[0]}]
CNOT q[{q[0]}], q[{q[1]}]

// Rotate to X-basis
H q[{q[0]}]
H q[{q[1]}]

b = measure q"""


def generate_vqe_y_circuit(params):
    """VQE circuit with Y-basis measurement (Sdg+H rotation before measure)."""
    theta = params.get("theta", 0.2286)
    qubits = params.get("qubits", [0, 1, 2, 3])
    q = qubits

    return f"""version 3.0
qubit[{max(q) + 1}] q
bit[{max(q) + 1}] b

// Prepare HF state |01> in BK basis
X q[{q[0]}]

// Ry ansatz
CNOT q[{q[0]}], q[{q[1]}]
Ry q[{q[0]}], {theta:.6f}
CNOT q[{q[1]}], q[{q[0]}]
Ry q[{q[0]}], {-theta:.6f}
CNOT q[{q[1]}], q[{q[0]}]
CNOT q[{q[0]}], q[{q[1]}]

// Rotate to Y-basis (Sdg then H)
Sdag q[{q[0]}]
H q[{q[0]}]
Sdag q[{q[1]}]
H q[{q[1]}]

b = measure q"""


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


def analyze_vqe(all_counts, params):
    """Analyze VQE measurement results from Z, X, Y bases.

    Reconstructs <H> = g0*I + g1*Z0 + g2*Z1 + g3*Z0Z1 + g4*X0X1 + g5*Y0Y1
    using expectation values from each measurement basis.

    Coefficients for H2 at ~0.735 Angstrom (STO-3G, BK-reduced 2-qubit):
    """
    R = params.get("bond_distance", 0.735)

    # H2 Hamiltonian coefficients (STO-3G, Bravyi-Kitaev, 2-qubit reduced)
    # From O'Malley et al. / Sagastizabal et al. for R ~ 0.735 A
    g0 = -0.4804
    g1 = 0.3435
    g2 = -0.4347
    g3 = 0.5716
    g4 = 0.0910
    g5 = 0.0910

    def expectation_from_counts(counts, total):
        """Compute <Z0>, <Z1>, <Z0Z1> from bitstring counts."""
        z0, z1, z0z1 = 0, 0, 0
        for bitstring, count in counts.items():
            bits = bitstring[-2:]  # Last 2 qubits
            b0 = int(bits[-1])  # Least significant = qubit 0
            b1 = int(bits[-2])  # Most significant = qubit 1
            z0 += (1 - 2 * b0) * count
            z1 += (1 - 2 * b1) * count
            z0z1 += (1 - 2 * b0) * (1 - 2 * b1) * count
        return z0 / total, z1 / total, z0z1 / total

    results = {}
    z_counts = all_counts.get("z_basis", {})
    x_counts = all_counts.get("x_basis", {})
    y_counts = all_counts.get("y_basis", {})

    total_z = sum(z_counts.values()) if z_counts else 0
    total_x = sum(x_counts.values()) if x_counts else 0
    total_y = sum(y_counts.values()) if y_counts else 0

    if total_z == 0:
        return {"error": "No Z-basis measurement results"}

    # Z-basis gives <Z0>, <Z1>, <Z0Z1>
    exp_z0, exp_z1, exp_z0z1 = expectation_from_counts(z_counts, total_z)

    # X-basis measurement (after H gates) gives <X0X1> correlation
    exp_x0x1 = 0
    if total_x > 0:
        _, _, exp_x0x1 = expectation_from_counts(x_counts, total_x)

    # Y-basis measurement (after Sdg+H) gives <Y0Y1> correlation
    exp_y0y1 = 0
    if total_y > 0:
        _, _, exp_y0y1 = expectation_from_counts(y_counts, total_y)

    # Reconstruct energy
    energy = g0 + g1 * exp_z0 + g2 * exp_z1 + g3 * exp_z0z1 + g4 * exp_x0x1 + g5 * exp_y0y1

    # FCI reference for R=0.735: -1.1373 Ha
    fci_energy = -1.1373

    return {
        "energy_hartree": round(energy, 6),
        "fci_energy": fci_energy,
        "error_hartree": round(abs(energy - fci_energy), 6),
        "error_kcal_mol": round(abs(energy - fci_energy) * 627.509, 2),
        "chemical_accuracy": abs(energy - fci_energy) < 0.0016,  # 1 kcal/mol
        "expectation_values": {
            "Z0": round(exp_z0, 4),
            "Z1": round(exp_z1, 4),
            "Z0Z1": round(exp_z0z1, 4),
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
        "interpretation": (
            f"VQE energy: {energy:.4f} Ha (FCI: {fci_energy:.4f} Ha). "
            f"Error: {abs(energy - fci_energy) * 627.509:.1f} kcal/mol. "
            f"{'Within' if abs(energy - fci_energy) < 0.0016 else 'Outside'} chemical accuracy."
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
                "theta": 0.2286,
                "qubits": [0, 1, 2, 3],
            },
            "priority": 3,
            "description": "H2 VQE at equilibrium (0.735 A). 3 measurement bases.",
        },
    ]

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
