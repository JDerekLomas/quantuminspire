"""
Benchmark Agent

Autonomous agent that runs Qiskit HumanEval benchmarks against LLMs.
Designed to be invoked by the orchestrator or run standalone.

Supports multiple LLM backends via a unified interface.
Results are saved to benchmark_results/ and can be compared across models.

Usage:
    secret-lover run -- python agents/benchmark_agent.py
    secret-lover run -- python agents/benchmark_agent.py --model gemini-3-flash-preview --limit 10
    secret-lover run -- python agents/benchmark_agent.py --compare
"""

import json
import argparse
from pathlib import Path
from datetime import datetime

PROJECT_DIR = Path(__file__).parent.parent
RESULTS_DIR = PROJECT_DIR / "benchmark_results"


def compare_results():
    """Compare all benchmark results across models and time."""
    if not RESULTS_DIR.exists():
        print("No results found.")
        return

    results = []
    for f in sorted(RESULTS_DIR.glob("results_*.json")):
        with open(f) as fh:
            data = json.load(fh)
        results.append({
            "file": f.name,
            "model": data.get("model", "unknown"),
            "variant": data.get("variant", "standard"),
            "total": data.get("total_tasks", 0),
            "passed": data.get("passed", 0),
            "rate": data.get("pass_rate", 0),
            "timestamp": data.get("timestamp", ""),
            "by_difficulty": data.get("by_difficulty", {}),
        })

    if not results:
        print("No results found.")
        return

    print("\n" + "=" * 80)
    print("Qiskit HumanEval — Model Comparison")
    print("=" * 80)
    print(f"{'Model':<35} {'Variant':<10} {'Pass@1':>8} {'Tasks':>6} {'Date':>16}")
    print("-" * 80)
    for r in results:
        print(f"{r['model']:<35} {r['variant']:<10} {r['rate']:>7.1f}% {r['total']:>6} {r['timestamp']:>16}")

        # Difficulty breakdown
        for diff in ["basic", "intermediate", "difficult"]:
            d = r["by_difficulty"].get(diff, {})
            if d:
                print(f"  {'':>33} {diff:>10}: {d.get('pass_rate', 0):.1f}% "
                      f"({d.get('passed', 0)}/{d.get('total', 0)})")
    print()


def run_benchmark(model, limit=None, hard=False):
    """Run the benchmark harness as a subprocess."""
    import subprocess
    import sys

    cmd = [
        sys.executable,
        str(PROJECT_DIR / "scripts" / "benchmark_harness.py"),
        "--model", model,
    ]
    if limit:
        cmd.extend(["--limit", str(limit)])
    if hard:
        cmd.append("--hard")

    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd)
    return result.returncode


def main():
    parser = argparse.ArgumentParser(description="Benchmark Agent")
    parser.add_argument("--model", default="gemini-3-flash-preview", help="Model to benchmark")
    parser.add_argument("--limit", type=int, help="Max tasks")
    parser.add_argument("--hard", action="store_true", help="Use hard variant")
    parser.add_argument("--compare", action="store_true", help="Compare existing results")
    args = parser.parse_args()

    if args.compare:
        compare_results()
        return

    exit_code = run_benchmark(args.model, args.limit, args.hard)
    if exit_code == 0:
        print("\nBenchmark complete. Use --compare to see all results.")
    else:
        print(f"\nBenchmark failed with exit code {exit_code}")


if __name__ == "__main__":
    main()
