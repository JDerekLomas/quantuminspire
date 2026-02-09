"""
Research Orchestrator

Central coordinator for the AI x Quantum research pipeline.
Manages experiment scheduling, result tracking, and agent coordination.

Usage:
    secret-lover run -- python agents/orchestrator.py
    secret-lover run -- python agents/orchestrator.py --run-benchmarks
    secret-lover run -- python agents/orchestrator.py --status
"""

import json
import subprocess
import sys
import argparse
from datetime import datetime
from pathlib import Path

AGENTS_DIR = Path(__file__).parent
PROJECT_DIR = AGENTS_DIR.parent
RESULTS_DIR = AGENTS_DIR / "results"
STATE_FILE = AGENTS_DIR / "state.json"


def load_state():
    """Load orchestrator state from disk."""
    if STATE_FILE.exists():
        with open(STATE_FILE) as f:
            return json.load(f)
    return {
        "last_run": None,
        "benchmark_runs": [],
        "replication_runs": [],
        "pending_experiments": [],
    }


def save_state(state):
    """Persist orchestrator state."""
    RESULTS_DIR.mkdir(exist_ok=True)
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


def run_benchmark_sweep(models=None, limit=None):
    """Run Qiskit HumanEval benchmark against specified models."""
    if models is None:
        models = ["gemini-3-flash-preview"]

    results = []
    for model in models:
        print(f"\n{'='*60}")
        print(f"Running benchmark: {model}")
        print(f"{'='*60}")

        cmd = [
            sys.executable,
            str(PROJECT_DIR / "benchmark_harness.py"),
            "--model", model,
        ]
        if limit:
            cmd.extend(["--limit", str(limit)])

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
            results.append({
                "model": model,
                "timestamp": datetime.now().isoformat(),
                "exit_code": result.returncode,
                "stdout_tail": result.stdout[-2000:] if result.stdout else "",
                "stderr_tail": result.stderr[-1000:] if result.stderr else "",
            })
            print(result.stdout[-500:])
        except subprocess.TimeoutExpired:
            results.append({
                "model": model,
                "timestamp": datetime.now().isoformat(),
                "exit_code": -1,
                "error": "timeout",
            })

    return results


def show_status(state):
    """Print current pipeline status."""
    print("\n" + "=" * 60)
    print("AI x Quantum — Research Pipeline Status")
    print("=" * 60)
    print(f"  Last run: {state.get('last_run', 'never')}")
    print(f"  Benchmark runs: {len(state.get('benchmark_runs', []))}")
    print(f"  Replication runs: {len(state.get('replication_runs', []))}")
    print(f"  Pending experiments: {len(state.get('pending_experiments', []))}")

    # Show latest benchmark results
    results_dir = PROJECT_DIR / "benchmark_results"
    if results_dir.exists():
        result_files = sorted(results_dir.glob("results_*.json"))
        if result_files:
            print(f"\n  Latest benchmark results:")
            for f in result_files[-5:]:
                with open(f) as fh:
                    data = json.load(fh)
                print(f"    {f.name}: {data.get('model', '?')} — "
                      f"{data.get('passed', 0)}/{data.get('total_tasks', 0)} "
                      f"({data.get('pass_rate', 0):.1f}%)")

    print()


def main():
    parser = argparse.ArgumentParser(description="Research Orchestrator")
    parser.add_argument("--status", action="store_true", help="Show pipeline status")
    parser.add_argument("--run-benchmarks", action="store_true", help="Run benchmark sweep")
    parser.add_argument("--models", nargs="+", help="Models to benchmark")
    parser.add_argument("--limit", type=int, help="Limit tasks per model")
    args = parser.parse_args()

    state = load_state()

    if args.status:
        show_status(state)
        return

    if args.run_benchmarks:
        results = run_benchmark_sweep(
            models=args.models,
            limit=args.limit,
        )
        state["benchmark_runs"].extend(results)
        state["last_run"] = datetime.now().isoformat()
        save_state(state)
        show_status(state)
        return

    # Default: show status
    show_status(state)
    print("Use --run-benchmarks to start a sweep, or --status for details.")


if __name__ == "__main__":
    main()
