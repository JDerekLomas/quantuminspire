"""
Research Orchestrator

Central coordinator for the AI x Quantum research pipeline.
Manages experiment scheduling, result tracking, and agent coordination.

Modes:
    --status          Show pipeline status and latest results
    --run-benchmarks  Run a benchmark sweep against specified models
    --run-replication Run a paper replication by ID
    --daemon          Run continuously: benchmark + replicate on a schedule
    --once            Run full pipeline once (benchmark + replication + report)

Usage:
    secret-lover run -- python agents/orchestrator.py --status
    secret-lover run -- python agents/orchestrator.py --run-benchmarks --models gemini-3-flash-preview --limit 10
    secret-lover run -- python agents/orchestrator.py --once
    secret-lover run -- python agents/orchestrator.py --daemon --interval 3600
"""

import json
import subprocess
import sys
import argparse
import time
import signal
from datetime import datetime
from pathlib import Path
from collections import Counter

AGENTS_DIR = Path(__file__).parent
PROJECT_DIR = AGENTS_DIR.parent
RESULTS_DIR = AGENTS_DIR / "results"
BENCHMARK_RESULTS_DIR = PROJECT_DIR / "benchmark_results"
STATE_FILE = AGENTS_DIR / "state.json"
LOG_FILE = AGENTS_DIR / "orchestrator.log"

DEFAULT_MODELS = ["gemini-3-flash-preview"]
DEFAULT_INTERVAL = 3600  # 1 hour between runs


# ─── State Management ─────────────────────────────────────────────────────────

def load_state():
    if STATE_FILE.exists():
        with open(STATE_FILE) as f:
            return json.load(f)
    return {
        "created": datetime.now().isoformat(),
        "last_run": None,
        "total_runs": 0,
        "benchmark_runs": [],
        "replication_runs": [],
        "daemon_started": None,
        "daemon_runs": 0,
    }


def save_state(state):
    RESULTS_DIR.mkdir(exist_ok=True)
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")


# ─── Benchmark Agent ──────────────────────────────────────────────────────────

def run_benchmark_sweep(models=None, limit=None):
    models = models or DEFAULT_MODELS
    results = []

    for model in models:
        log(f"BENCHMARK: Starting {model}" + (f" (limit={limit})" if limit else ""))

        cmd = [sys.executable, str(PROJECT_DIR / "benchmark_harness.py"), "--model", model]
        if limit:
            cmd.extend(["--limit", str(limit)])

        t0 = time.time()
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=7200)
            elapsed = time.time() - t0

            # Parse results from the latest results file
            pass_rate = None
            latest = sorted(BENCHMARK_RESULTS_DIR.glob(f"results_*{model.replace('/', '-')}*.json"))
            if latest:
                with open(latest[-1]) as f:
                    data = json.load(f)
                pass_rate = data.get("pass_rate")

            entry = {
                "model": model,
                "timestamp": datetime.now().isoformat(),
                "elapsed_s": round(elapsed, 1),
                "exit_code": result.returncode,
                "pass_rate": pass_rate,
                "results_file": str(latest[-1]) if latest else None,
            }
            results.append(entry)
            log(f"BENCHMARK: {model} done — Pass@1={pass_rate}% in {elapsed:.0f}s")

        except subprocess.TimeoutExpired:
            results.append({
                "model": model,
                "timestamp": datetime.now().isoformat(),
                "exit_code": -1,
                "error": "timeout (2h)",
            })
            log(f"BENCHMARK: {model} TIMEOUT")

        except Exception as e:
            results.append({
                "model": model,
                "timestamp": datetime.now().isoformat(),
                "exit_code": -1,
                "error": str(e),
            })
            log(f"BENCHMARK: {model} ERROR: {e}")

    return results


# ─── Replication Agent ────────────────────────────────────────────────────────

def run_replication(paper_id="sagastizabal2019"):
    log(f"REPLICATION: Starting {paper_id}")

    cmd = [sys.executable, str(AGENTS_DIR / "replication_agent.py"), "--run", paper_id]
    t0 = time.time()

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
        elapsed = time.time() - t0

        entry = {
            "paper_id": paper_id,
            "timestamp": datetime.now().isoformat(),
            "elapsed_s": round(elapsed, 1),
            "exit_code": result.returncode,
        }
        log(f"REPLICATION: {paper_id} done (exit={result.returncode}) in {elapsed:.0f}s")
        return entry

    except subprocess.TimeoutExpired:
        log(f"REPLICATION: {paper_id} TIMEOUT")
        return {"paper_id": paper_id, "timestamp": datetime.now().isoformat(), "error": "timeout"}

    except Exception as e:
        log(f"REPLICATION: {paper_id} ERROR: {e}")
        return {"paper_id": paper_id, "timestamp": datetime.now().isoformat(), "error": str(e)}


# ─── Analysis ─────────────────────────────────────────────────────────────────

def analyze_results():
    """Analyze all benchmark results and produce a summary."""
    if not BENCHMARK_RESULTS_DIR.exists():
        return None

    summaries = []
    for f in sorted(BENCHMARK_RESULTS_DIR.glob("results_*.json")):
        with open(f) as fh:
            data = json.load(fh)
        if data.get("total_tasks", 0) >= 10:  # skip tiny test runs
            summaries.append({
                "file": f.name,
                "model": data.get("model"),
                "tasks": data.get("total_tasks"),
                "passed": data.get("passed"),
                "rate": data.get("pass_rate"),
                "by_difficulty": data.get("by_difficulty", {}),
            })

    return summaries


def generate_report(state):
    """Generate a text report of the current state."""
    log("REPORT: Generating research summary")

    lines = [
        "=" * 60,
        "AI x Quantum — Research Pipeline Report",
        f"Generated: {datetime.now().isoformat()}",
        "=" * 60,
        "",
    ]

    # Pipeline stats
    lines.append(f"Total pipeline runs: {state.get('total_runs', 0)}")
    lines.append(f"Last run: {state.get('last_run', 'never')}")
    lines.append(f"Benchmark sweeps: {len(state.get('benchmark_runs', []))}")
    lines.append(f"Replications: {len(state.get('replication_runs', []))}")
    lines.append("")

    # Benchmark results
    summaries = analyze_results()
    if summaries:
        lines.append("BENCHMARK RESULTS (runs >= 10 tasks):")
        lines.append(f"{'Model':<35} {'Pass@1':>8} {'Tasks':>6}")
        lines.append("-" * 55)
        for s in summaries:
            lines.append(f"{s['model']:<35} {s['rate']:>7.1f}% {s['tasks']:>6}")
            for diff in ["basic", "intermediate", "difficult"]:
                d = s["by_difficulty"].get(diff, {})
                if d:
                    lines.append(f"  {diff:>33}: {d.get('pass_rate', 0):.1f}% ({d.get('passed', 0)}/{d.get('total', 0)})")
        lines.append("")

    report = "\n".join(lines)

    # Save report
    RESULTS_DIR.mkdir(exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = RESULTS_DIR / f"report_{ts}.txt"
    with open(report_file, "w") as f:
        f.write(report)

    print(report)
    log(f"REPORT: Saved to {report_file}")
    return report


# ─── Pipeline ─────────────────────────────────────────────────────────────────

def run_full_pipeline(state, models=None, limit=None, skip_replication=False):
    """Run the complete pipeline: benchmarks + replications + report."""
    log("PIPELINE: Starting full run")
    state["total_runs"] = state.get("total_runs", 0) + 1

    # 1. Benchmarks
    bench_results = run_benchmark_sweep(models=models, limit=limit)
    state["benchmark_runs"].extend(bench_results)

    # 2. Replications (if not skipped)
    if not skip_replication:
        rep_result = run_replication("sagastizabal2019")
        state["replication_runs"].append(rep_result)

    # 3. Report
    generate_report(state)

    state["last_run"] = datetime.now().isoformat()
    save_state(state)
    log("PIPELINE: Complete")


# ─── Daemon Mode ──────────────────────────────────────────────────────────────

_running = True

def _signal_handler(sig, frame):
    global _running
    log("DAEMON: Received shutdown signal")
    _running = False

def run_daemon(state, interval=DEFAULT_INTERVAL, models=None, limit=None):
    """Run continuously, executing the pipeline on a schedule."""
    global _running
    signal.signal(signal.SIGINT, _signal_handler)
    signal.signal(signal.SIGTERM, _signal_handler)

    state["daemon_started"] = datetime.now().isoformat()
    state["daemon_runs"] = 0
    save_state(state)

    log(f"DAEMON: Started (interval={interval}s, models={models or DEFAULT_MODELS})")
    log(f"DAEMON: Press Ctrl+C to stop")

    while _running:
        try:
            run_full_pipeline(state, models=models, limit=limit, skip_replication=True)
            state["daemon_runs"] = state.get("daemon_runs", 0) + 1
            save_state(state)
        except Exception as e:
            log(f"DAEMON: Pipeline error: {e}")

        if not _running:
            break

        log(f"DAEMON: Sleeping {interval}s until next run...")
        # Sleep in small increments so we can catch signals
        for _ in range(interval):
            if not _running:
                break
            time.sleep(1)

    log(f"DAEMON: Stopped after {state.get('daemon_runs', 0)} runs")
    save_state(state)


# ─── Status ───────────────────────────────────────────────────────────────────

def show_status(state):
    print("\n" + "=" * 60)
    print("AI x Quantum — Research Pipeline Status")
    print("=" * 60)
    print(f"  Created:          {state.get('created', '?')}")
    print(f"  Last run:         {state.get('last_run', 'never')}")
    print(f"  Total runs:       {state.get('total_runs', 0)}")
    print(f"  Benchmark sweeps: {len(state.get('benchmark_runs', []))}")
    print(f"  Replications:     {len(state.get('replication_runs', []))}")

    if state.get("daemon_started"):
        print(f"  Daemon started:   {state['daemon_started']}")
        print(f"  Daemon runs:      {state.get('daemon_runs', 0)}")

    # Latest benchmark results
    summaries = analyze_results()
    if summaries:
        print(f"\n  Benchmark Results (significant runs):")
        for s in summaries:
            print(f"    {s['model']}: {s['rate']:.1f}% Pass@1 ({s['passed']}/{s['tasks']})")

    # Latest run details
    bench_runs = state.get("benchmark_runs", [])
    if bench_runs:
        latest = bench_runs[-1]
        print(f"\n  Latest benchmark run:")
        print(f"    Model:     {latest.get('model', '?')}")
        print(f"    Pass@1:    {latest.get('pass_rate', '?')}%")
        print(f"    Time:      {latest.get('elapsed_s', '?')}s")
        print(f"    Timestamp: {latest.get('timestamp', '?')}")

    print()


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="AI x Quantum Research Orchestrator")
    parser.add_argument("--status", action="store_true", help="Show pipeline status")
    parser.add_argument("--run-benchmarks", action="store_true", help="Run benchmark sweep")
    parser.add_argument("--run-replication", type=str, help="Run replication by paper ID")
    parser.add_argument("--once", action="store_true", help="Run full pipeline once")
    parser.add_argument("--daemon", action="store_true", help="Run continuously on a schedule")
    parser.add_argument("--report", action="store_true", help="Generate report from existing results")
    parser.add_argument("--models", nargs="+", help="Models to benchmark")
    parser.add_argument("--limit", type=int, help="Limit tasks per model")
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL, help="Daemon interval in seconds")
    args = parser.parse_args()

    state = load_state()

    if args.status:
        show_status(state)
        return

    if args.report:
        generate_report(state)
        return

    if args.run_benchmarks:
        results = run_benchmark_sweep(models=args.models, limit=args.limit)
        state["benchmark_runs"].extend(results)
        state["last_run"] = datetime.now().isoformat()
        state["total_runs"] = state.get("total_runs", 0) + 1
        save_state(state)
        show_status(state)
        return

    if args.run_replication:
        result = run_replication(args.run_replication)
        state["replication_runs"].append(result)
        state["last_run"] = datetime.now().isoformat()
        save_state(state)
        return

    if args.once:
        run_full_pipeline(state, models=args.models, limit=args.limit)
        return

    if args.daemon:
        run_daemon(state, interval=args.interval, models=args.models, limit=args.limit)
        return

    # Default
    show_status(state)
    print("Commands:")
    print("  --status           Show pipeline status")
    print("  --run-benchmarks   Run benchmark sweep")
    print("  --run-replication  Run paper replication")
    print("  --once             Run full pipeline once")
    print("  --daemon           Run continuously (Ctrl+C to stop)")
    print("  --report           Generate report from results")


if __name__ == "__main__":
    main()
