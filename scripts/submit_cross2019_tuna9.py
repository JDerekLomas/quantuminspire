#!/usr/bin/env python3
"""Submit Cross 2019 QV + RB circuits to Tuna-9 and analyze results.

Usage:
    # First: qi login   (refresh auth token)
    # Then:
    python scripts/submit_cross2019_tuna9.py submit   # submit all circuits
    python scripts/submit_cross2019_tuna9.py poll      # check job status
    python scripts/submit_cross2019_tuna9.py analyze   # analyze + write results
"""

import json
import sys
import time
import subprocess
import statistics
from datetime import datetime, timezone
from pathlib import Path

RESULTS_DIR = Path(__file__).parent.parent / "experiments" / "results"
QV_CIRCUITS = json.loads((Path("/tmp/qv_circuits.json")).read_text())
RB_CIRCUITS = json.loads((Path("/tmp/rb_circuits.json")).read_text())
JOB_TRACKER = Path("/tmp/cross2019_jobs.json")
BACKEND_TYPE_ID = 6  # Tuna-9

# Emulator baseline from qv-001.json (seed=123, 1024 shots)
EMULATOR_QV_COUNTS = {
    "qv_n2_c0": {"00": 115, "01": 17, "10": 180, "11": 712},
    "qv_n2_c1": {"00": 129, "01": 369, "10": 8, "11": 518},
    "qv_n2_c2": {"00": 140, "01": 697, "10": 13, "11": 174},
    "qv_n2_c3": {"00": 325, "01": 343, "10": 201, "11": 155},
    "qv_n2_c4": {"00": 306, "01": 235, "10": 154, "11": 329},
    "qv_n3_c0": {"000": 12, "001": 21, "010": 46, "011": 46, "100": 75, "101": 138, "110": 418, "111": 268},
    "qv_n3_c1": {"000": 44, "001": 286, "010": 179, "011": 302, "100": 13, "101": 85, "110": 49, "111": 66},
    "qv_n3_c2": {"000": 700, "001": 73, "010": 25, "011": 186, "100": 22, "101": 6, "110": 3, "111": 9},
    "qv_n3_c3": {"000": 17, "001": 57, "010": 130, "011": 171, "100": 43, "101": 123, "110": 198, "111": 285},
    "qv_n3_c4": {"000": 133, "001": 83, "010": 63, "011": 5, "100": 324, "101": 218, "110": 183, "111": 15},
}


def submit_circuit(name: str, circuit: str, shots: int = 1024) -> int:
    """Submit a circuit via QI SDK and return job_id."""
    from quantuminspire.util.api.remote_backend import RemoteBackend
    backend = RemoteBackend()
    from quantuminspire.util.api.quantum_interface import QuantumInterface
    algo = QuantumInterface()
    algo.set_program(circuit)
    options = {"number_of_shots": shots}
    job_id = backend.run(algo, backend_type_id=BACKEND_TYPE_ID, options=options)
    print(f"  {name}: job_id={job_id}")
    return job_id


def submit_all():
    """Submit all 35 circuits to Tuna-9."""
    jobs = {}
    submitted = datetime.now(timezone.utc).isoformat()

    print("Submitting 10 QV circuits...")
    for name, circuit in QV_CIRCUITS.items():
        try:
            jobs[name] = submit_circuit(name, circuit)
            time.sleep(1)  # rate limit
        except Exception as e:
            print(f"  FAILED {name}: {e}")
            jobs[name] = None

    print("\nSubmitting 25 RB circuits...")
    for name, circuit in RB_CIRCUITS.items():
        try:
            jobs[name] = submit_circuit(name, circuit)
            time.sleep(1)
        except Exception as e:
            print(f"  FAILED {name}: {e}")
            jobs[name] = None

    tracker = {"submitted": submitted, "jobs": jobs}
    JOB_TRACKER.write_text(json.dumps(tracker, indent=2))
    print(f"\n{len([j for j in jobs.values() if j])} jobs submitted. Tracker: {JOB_TRACKER}")


def poll_jobs():
    """Check status of all submitted jobs."""
    tracker = json.loads(JOB_TRACKER.read_text())
    jobs = tracker["jobs"]

    completed = 0
    failed = 0
    pending = 0

    for name, job_id in jobs.items():
        if job_id is None:
            failed += 1
            continue
        try:
            result = subprocess.run(
                [sys.executable, "-c",
                 f"from quantuminspire.util.api.remote_backend import RemoteBackend; "
                 f"import json; "
                 f"# Check job status via CLI"],
                capture_output=True, text=True, timeout=10
            )
            # Use CLI instead
            result = subprocess.run(
                ["qi", "jobs", "get", str(job_id)],
                capture_output=True, text=True, timeout=15
            )
            status = "UNKNOWN"
            if "COMPLETED" in result.stdout:
                status = "COMPLETED"
                completed += 1
            elif "FAILED" in result.stdout:
                status = "FAILED"
                failed += 1
            elif "PLANNED" in result.stdout or "RUNNING" in result.stdout:
                status = "PENDING"
                pending += 1
            else:
                pending += 1
            print(f"  {name} (job {job_id}): {status}")
        except Exception as e:
            print(f"  {name} (job {job_id}): ERROR checking - {e}")
            pending += 1

    print(f"\nCompleted: {completed}, Pending: {pending}, Failed: {failed}")


def get_results(job_id: int) -> dict:
    """Get results for a completed job via CLI."""
    result = subprocess.run(
        ["qi", "final_results", "get", str(job_id)],
        capture_output=True, text=True, timeout=15
    )
    if result.returncode != 0:
        raise RuntimeError(f"Failed to get results: {result.stderr}")
    # Parse the output - format is typically JSON or table
    return json.loads(result.stdout)


def compute_heavy_output_fraction(ideal_counts: dict, hw_counts: dict) -> float:
    """Compute heavy output fraction for a single QV circuit.

    Heavy outputs are those with ideal probability > median.
    """
    total_ideal = sum(ideal_counts.values())
    ideal_probs = {k: v / total_ideal for k, v in ideal_counts.items()}

    # Find median probability
    probs = sorted(ideal_probs.values())
    median_prob = statistics.median(probs)

    # Heavy outputs: those with probability > median
    heavy_outputs = {k for k, p in ideal_probs.items() if p > median_prob}

    # Fraction of hardware shots on heavy outputs
    total_hw = sum(hw_counts.values())
    heavy_count = sum(hw_counts.get(k, 0) for k in heavy_outputs)
    return heavy_count / total_hw


def compute_rb_survival(counts: dict) -> float:
    """Compute survival probability (prob of measuring |0>) from RB counts."""
    total = sum(counts.values())
    return counts.get("0", 0) / total


def analyze():
    """Analyze collected results and write JSON files."""
    tracker = json.loads(JOB_TRACKER.read_text())
    jobs = tracker["jobs"]

    # Collect all results
    hw_counts = {}
    for name, job_id in jobs.items():
        if job_id is None:
            continue
        try:
            results = get_results(job_id)
            hw_counts[name] = results
            print(f"  Got results for {name}")
        except Exception as e:
            print(f"  Failed to get {name}: {e}")

    if not hw_counts:
        print("No results collected yet. Run 'poll' first to check status.")
        return

    # === QV Analysis ===
    qv_results = {}
    for n in [2, 3]:
        hofs = []
        circuit_results = {}
        for i in range(5):
            cname = f"qv_n{n}_c{i}"
            if cname not in hw_counts:
                continue
            ideal = EMULATOR_QV_COUNTS[cname]
            measured = hw_counts[cname]
            hof = compute_heavy_output_fraction(ideal, measured)
            hofs.append(hof)
            circuit_results[cname] = {
                "heavy_output_fraction": round(hof, 4),
                "raw_counts": measured
            }

        if hofs:
            mean_hof = statistics.mean(hofs)
            passed = mean_hof > 2/3
            qv_results[str(n)] = {
                "heavy_output_fraction": round(mean_hof, 4),
                "passed": passed,
                "threshold": 0.6667,
                "num_circuits": len(hofs),
                "per_circuit": circuit_results
            }

    max_passed = 0
    for n_str, r in qv_results.items():
        if r["passed"]:
            max_passed = max(max_passed, 2 ** int(n_str))
    qv = max_passed

    # Write QV result
    qv_result = {
        "schema_version": "1.0",
        "id": "qv-001-tuna9",
        "type": "quantum_volume",
        "backend": "tuna-9",
        "backend_qubits": [0, 1, 2],
        "job_id": None,
        "submitted": tracker["submitted"],
        "completed": datetime.now(timezone.utc).isoformat(),
        "parameters": {
            "shots": 1024,
            "qubit_counts": [2, 3],
            "num_circuits": 5,
            "seed": 123
        },
        "raw_counts": {k: v for k, v in hw_counts.items() if k.startswith("qv_")},
        "analysis": {
            "quantum_volume": qv,
            "results_by_qubit_count": qv_results,
            "qubit_counts_tested": [2, 3],
            "interpretation": f"Quantum Volume: {qv}. " + ". ".join(
                f"n={n}: {'PASS' if r['passed'] else 'FAIL'} (heavy={r['heavy_output_fraction']*100:.1f}%)"
                for n, r in sorted(qv_results.items())
            )
        },
        "circuit_cqasm": QV_CIRCUITS["qv_n2_c0"],
        "job_ids": {k: v for k, v in jobs.items() if k.startswith("qv_")},
        "errors": None
    }
    out_path = RESULTS_DIR / "qv-001-tuna9.json"
    out_path.write_text(json.dumps(qv_result, indent=2))
    print(f"\nWrote QV result: {out_path}")

    # === RB Analysis ===
    seq_lengths = [1, 4, 8, 16, 32]
    survival_by_length = {}
    rb_raw = {}

    for m in seq_lengths:
        survivals = []
        for s in range(5):
            rname = f"rb_m{m}_s{s}"
            if rname not in hw_counts:
                continue
            surv = compute_rb_survival(hw_counts[rname])
            survivals.append(surv)
            rb_raw[rname] = hw_counts[rname]

        if survivals:
            survival_by_length[str(m)] = {
                "mean_survival": round(statistics.mean(survivals), 4),
                "per_sequence": survivals
            }

    # Fit exponential decay: p(m) = A * alpha^m + B
    # For single-qubit RB: B = 0.5 (random guess), so p(m) = A * alpha^m + 0.5
    # Gate fidelity = (1 + alpha) / 2
    import math
    lengths = []
    means = []
    for m_str, data in sorted(survival_by_length.items(), key=lambda x: int(x[0])):
        lengths.append(int(m_str))
        means.append(data["mean_survival"])

    gate_fidelity = None
    error_per_gate = None
    if len(lengths) >= 2:
        # Simple fit: use first and last points
        # p(m) = 0.5 + 0.5 * alpha^m => alpha^m = 2*(p - 0.5)
        # Log fit across all points
        try:
            log_data = [(m, math.log(max(2 * (p - 0.5), 0.001))) for m, p in zip(lengths, means)]
            # Linear regression on log: log(2p-1) = log(A) + m*log(alpha)
            n = len(log_data)
            sum_m = sum(x[0] for x in log_data)
            sum_y = sum(x[1] for x in log_data)
            sum_mm = sum(x[0]**2 for x in log_data)
            sum_my = sum(x[0]*x[1] for x in log_data)
            log_alpha = (n * sum_my - sum_m * sum_y) / (n * sum_mm - sum_m**2)
            alpha = math.exp(log_alpha)
            gate_fidelity = round((1 + alpha) / 2, 6)
            error_per_gate = round(1 - gate_fidelity, 6)
        except Exception:
            pass

    rb_result = {
        "schema_version": "1.0",
        "id": "rb-1qubit-001-tuna9",
        "type": "randomized_benchmarking",
        "backend": "tuna-9",
        "backend_qubits": [0],
        "job_id": None,
        "submitted": tracker["submitted"],
        "completed": datetime.now(timezone.utc).isoformat(),
        "parameters": {
            "shots": 1024,
            "num_qubits": 1,
            "sequence_lengths": seq_lengths,
            "sequences_per_length": 5,
            "seed": 42
        },
        "raw_counts": rb_raw,
        "analysis": {
            "gate_fidelity": gate_fidelity,
            "error_per_gate": error_per_gate,
            "survival_by_length": survival_by_length,
            "interpretation": (
                f"1-qubit RB on Tuna-9: gate fidelity {gate_fidelity*100:.2f}%, "
                f"error per gate {error_per_gate*100:.4f}%"
            ) if gate_fidelity else "Insufficient data for fit"
        },
        "circuit_cqasm": RB_CIRCUITS["rb_m1_s0"],
        "job_ids": {k: v for k, v in jobs.items() if k.startswith("rb_")},
        "errors": None
    }
    out_path = RESULTS_DIR / "rb-1qubit-001-tuna9.json"
    out_path.write_text(json.dumps(rb_result, indent=2))
    print(f"Wrote RB result: {out_path}")

    # Summary
    print("\n=== Cross 2019 Replication Summary (Tuna-9) ===")
    print(f"QV: {qv}")
    for n, r in sorted(qv_results.items()):
        print(f"  n={n}: heavy={r['heavy_output_fraction']*100:.1f}% {'PASS' if r['passed'] else 'FAIL'}")
    if gate_fidelity:
        print(f"RB: gate fidelity = {gate_fidelity*100:.2f}%")
        print(f"    error per gate = {error_per_gate*100:.4f}%")
    for m_str, data in sorted(survival_by_length.items(), key=lambda x: int(x[0])):
        print(f"  m={m_str}: survival = {data['mean_survival']*100:.1f}%")

    # Claim assessment
    print("\n=== Claim Assessment ===")
    claim1_pass = qv_results.get("2", {}).get("passed", False)
    claim2_pass = qv_results.get("3", {}).get("passed", False)
    claim3_pass = gate_fidelity is not None and gate_fidelity > 0.99
    print(f"Claim 1 (2q QV pass): {'PASS' if claim1_pass else 'FAIL'}")
    print(f"Claim 2 (3q QV pass): {'PASS' if claim2_pass else 'FAIL'}")
    print(f"Claim 3 (RB fidelity >99%): {'PASS' if claim3_pass else 'FAIL'}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python submit_cross2019_tuna9.py [submit|poll|analyze]")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "submit":
        submit_all()
    elif cmd == "poll":
        poll_jobs()
    elif cmd == "analyze":
        analyze()
    else:
        print(f"Unknown command: {cmd}")
