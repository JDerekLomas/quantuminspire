"""
Qiskit HumanEval Benchmark Harness

Runs the 151 Qiskit HumanEval tasks against an LLM via the Google GenAI API,
executes generated code with tests, and reports Pass@1.

Usage:
    secret-lover run -- python benchmark_harness.py                       # Run all 151 tasks
    secret-lover run -- python benchmark_harness.py --hard                # Hard variant
    secret-lover run -- python benchmark_harness.py --difficulty basic    # Filter by difficulty
    secret-lover run -- python benchmark_harness.py --limit 10           # First N tasks
    secret-lover run -- python benchmark_harness.py --resume              # Resume from checkpoint
    secret-lover run -- python benchmark_harness.py --task-id 42         # Single task
    secret-lover run -- python benchmark_harness.py --model gemini-2.5-pro  # Different model
"""

import json
import subprocess
import sys
import time
import argparse
import os
import re
from pathlib import Path
from datetime import datetime
from collections import Counter

from google import genai

# --- Configuration ---

MODEL = "gemini-3-flash-preview"
DATASET_STANDARD = "qiskit_humaneval.json"
DATASET_HARD = "qiskit_humaneval_hard.json"
RESULTS_DIR = Path("benchmark_results")
EXECUTION_TIMEOUT = 60  # seconds per task execution
MAX_TOKENS = 8192

SYSTEM_PROMPT = """\
You are a Qiskit quantum computing expert. You will be given a Python function \
signature with a docstring. Complete ONLY the function body. Return ONLY the \
Python code that goes inside the function — no markdown fences, no explanation, \
no imports (they are already provided), no function signature (it is already provided). \
Just the indented body code."""

SYSTEM_PROMPT_HARD = """\
You are a Qiskit quantum computing expert. You will be given a problem description. \
Write a complete Python function that solves it. Include all necessary imports. \
Return ONLY the Python code — no markdown fences, no explanation. \
The function must be named as specified in the problem."""


def load_dataset(hard=False):
    path = DATASET_HARD if hard else DATASET_STANDARD
    with open(path) as f:
        return json.load(f)


def strip_markdown_fences(text):
    """Remove markdown code fences from LLM output."""
    pattern = r'```(?:python)?\s*\n(.*?)```'
    matches = re.findall(pattern, text, re.DOTALL)
    if matches:
        return "\n".join(matches)
    return text


def call_llm(prompt, hard=False, model=MODEL):
    """Send a task prompt to the LLM and get the completion."""
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    system = SYSTEM_PROMPT_HARD if hard else SYSTEM_PROMPT

    if hard:
        user_msg = prompt
    else:
        user_msg = (
            f"Complete the following function. Return ONLY the function body code "
            f"(indented, no signature, no imports):\n\n```python\n{prompt}\n```"
        )

    response = client.models.generate_content(
        model=model,
        config=genai.types.GenerateContentConfig(
            system_instruction=system,
            max_output_tokens=MAX_TOKENS,
            temperature=0,
        ),
        contents=user_msg,
    )

    text = response.text
    text = strip_markdown_fences(text)

    input_tokens = response.usage_metadata.prompt_token_count or 0
    output_tokens = response.usage_metadata.candidates_token_count or 0

    return text, input_tokens, output_tokens


def ensure_indented(code, indent="    "):
    """Ensure all lines of the completion are indented (function body)."""
    lines = code.split("\n")
    # If any non-empty line lacks indentation, indent everything
    needs_indent = any(
        line and not line.startswith((" ", "\t")) for line in lines
    )
    if needs_indent:
        return "\n".join(indent + line if line.strip() else line for line in lines)
    return code


def build_test_script(task, completion, hard=False):
    """Assemble the full test script from prompt + completion + test."""
    if hard:
        full_code = completion
    else:
        full_code = task["prompt"] + "\n" + ensure_indented(completion)

    test_code = task["test"]
    entry_point = task["entry_point"]

    return f"""\
{full_code}

{test_code}

# Run the test
check({entry_point})
print("BENCHMARK_PASS")
"""


def execute_test(script, timeout=EXECUTION_TIMEOUT):
    """Run the test script in a subprocess. Returns (passed, output, error)."""
    try:
        result = subprocess.run(
            [sys.executable, "-c", script],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        passed = "BENCHMARK_PASS" in result.stdout
        return passed, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "TIMEOUT"
    except Exception as e:
        return False, "", str(e)


def classify_error(stderr):
    """Classify error type from stderr."""
    if not stderr:
        return "Unknown"
    for pattern, label in [
        ("TIMEOUT", "Timeout"),
        ("AssertionError", "Wrong answer"),
        ("AssertError", "Wrong answer"),
        ("ImportError", "Import error"),
        ("ModuleNotFoundError", "Import error"),
        ("AttributeError", "Attribute error"),
        ("SyntaxError", "Syntax error"),
        ("IndentationError", "Indentation error"),
        ("NameError", "Name error"),
        ("TypeError", "Type error"),
        ("ValueError", "Value error"),
    ]:
        if pattern in stderr:
            return label
    return "Runtime error"


def run_benchmark(args):
    """Main benchmark loop."""
    RESULTS_DIR.mkdir(exist_ok=True)

    tasks = load_dataset(hard=args.hard)
    model = args.model or MODEL

    # Filter
    if args.difficulty:
        tasks = [t for t in tasks if t["difficulty_scale"] == args.difficulty]
    if args.task_id is not None:
        tasks = [t for t in tasks if t["task_id"] == f"qiskitHumanEval/{args.task_id}"]
    if args.limit:
        tasks = tasks[: args.limit]

    variant = "hard" if args.hard else "standard"
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_slug = model.replace("/", "-")
    results_file = RESULTS_DIR / f"results_{variant}_{model_slug}_{timestamp}.json"
    checkpoint_file = RESULTS_DIR / f"checkpoint_{variant}_{model_slug}.json"

    # Load checkpoint if resuming
    completed = {}
    if args.resume and checkpoint_file.exists():
        with open(checkpoint_file) as f:
            completed = {r["task_id"]: r for r in json.load(f)}
        print(f"Resuming: {len(completed)} tasks already completed")

    results = list(completed.values())
    total = len(tasks)
    passed_count = sum(1 for r in results if r["passed"])

    print(f"\nQiskit HumanEval Benchmark")
    print(f"  Variant:    {variant}")
    print(f"  Model:      {model}")
    print(f"  Tasks:      {total}")
    print(f"  Timeout:    {EXECUTION_TIMEOUT}s per task")
    print(f"  Results:    {results_file}")
    print("=" * 60)

    for i, task in enumerate(tasks):
        task_id = task["task_id"]

        if task_id in completed:
            continue

        difficulty = task["difficulty_scale"]
        entry = task["entry_point"]
        print(f"\n[{i+1}/{total}] {task_id} ({difficulty}) -- {entry}")

        # Call LLM
        t0 = time.time()
        try:
            completion, input_tokens, output_tokens = call_llm(
                task["prompt"], hard=args.hard, model=model
            )
        except Exception as e:
            print(f"  API ERROR: {e}")
            results.append({
                "task_id": task_id,
                "difficulty": difficulty,
                "entry_point": entry,
                "passed": False,
                "error": f"API error: {e}",
                "completion": "",
                "api_time": 0,
                "exec_time": 0,
                "input_tokens": 0,
                "output_tokens": 0,
            })
            continue

        api_time = time.time() - t0

        # Build and execute test
        script = build_test_script(task, completion, hard=args.hard)
        t1 = time.time()
        passed, stdout, stderr = execute_test(script)
        exec_time = time.time() - t1

        status = "PASS" if passed else "FAIL"
        print(f"  {status}  (API: {api_time:.1f}s, Exec: {exec_time:.1f}s, "
              f"Tokens: {input_tokens}+{output_tokens})")

        if not passed and stderr:
            err_lines = stderr.strip().split("\n")
            for line in err_lines[-3:]:
                print(f"  | {line[:120]}")

        result = {
            "task_id": task_id,
            "difficulty": difficulty,
            "entry_point": entry,
            "passed": passed,
            "completion": completion,
            "stdout": stdout[:500],
            "stderr": stderr[:1000],
            "api_time": round(api_time, 2),
            "exec_time": round(exec_time, 2),
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
        }
        results.append(result)

        if passed:
            passed_count += 1

        # Checkpoint after every task
        with open(checkpoint_file, "w") as f:
            json.dump(results, f, indent=2)

        # Running stats
        done = len(results)
        print(f"  Running: {passed_count}/{done} = {passed_count/done*100:.1f}%")

    # --- Final results ---
    print("\n" + "=" * 60)
    print("FINAL RESULTS")
    print("=" * 60)

    total_done = len(results)
    total_pass = sum(1 for r in results if r["passed"])
    total_input_tokens = sum(r.get("input_tokens", 0) for r in results)
    total_output_tokens = sum(r.get("output_tokens", 0) for r in results)

    print(f"  Model:  {model}")
    print(f"  Pass@1: {total_pass}/{total_done} = {total_pass/total_done*100:.1f}%")
    print(f"  Total tokens: {total_input_tokens:,} input + {total_output_tokens:,} output")

    for diff in ["basic", "intermediate", "difficult"]:
        subset = [r for r in results if r["difficulty"] == diff]
        if subset:
            p = sum(1 for r in subset if r["passed"])
            print(f"  {diff:>15}: {p}/{len(subset)} = {p/len(subset)*100:.1f}%")

    # Error breakdown
    failures = [r for r in results if not r["passed"]]
    if failures:
        error_types = Counter(classify_error(r.get("stderr", "")) for r in failures)
        print(f"\n  Error breakdown ({len(failures)} failures):")
        for err_type, count in error_types.most_common():
            print(f"    {err_type:>20}: {count}")

        print(f"\n  Failed tasks:")
        for r in failures:
            err_type = classify_error(r.get("stderr", ""))
            print(f"    {r['task_id']} ({r['difficulty']}): {err_type}")

    # Save final results
    summary = {
        "model": model,
        "variant": variant,
        "timestamp": timestamp,
        "total_tasks": total_done,
        "passed": total_pass,
        "pass_rate": round(total_pass / total_done * 100, 2) if total_done else 0,
        "total_input_tokens": total_input_tokens,
        "total_output_tokens": total_output_tokens,
        "by_difficulty": {},
        "results": results,
    }
    for diff in ["basic", "intermediate", "difficult"]:
        subset = [r for r in results if r["difficulty"] == diff]
        if subset:
            p = sum(1 for r in subset if r["passed"])
            summary["by_difficulty"][diff] = {
                "total": len(subset),
                "passed": p,
                "pass_rate": round(p / len(subset) * 100, 2),
            }

    with open(results_file, "w") as f:
        json.dump(summary, f, indent=2)

    print(f"\n  Results saved to {results_file}")

    if checkpoint_file.exists():
        checkpoint_file.unlink()

    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Qiskit HumanEval Benchmark")
    parser.add_argument("--hard", action="store_true", help="Use hard variant")
    parser.add_argument("--model", type=str, default=None, help="Model ID")
    parser.add_argument("--difficulty", choices=["basic", "intermediate", "difficult"])
    parser.add_argument("--limit", type=int, help="Max tasks to run")
    parser.add_argument("--resume", action="store_true", help="Resume from checkpoint")
    parser.add_argument("--task-id", type=int, help="Run a single task by index")
    parser.add_argument("--timeout", type=int, default=60, help="Exec timeout (seconds)")
    args = parser.parse_args()

    if args.timeout:
        EXECUTION_TIMEOUT = args.timeout

    run_benchmark(args)
