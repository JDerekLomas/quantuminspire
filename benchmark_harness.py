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

try:
    from google import genai
except ImportError:
    genai = None

try:
    import anthropic
except ImportError:
    anthropic = None

# --- Configuration ---

MODEL = "gemini-3-flash-preview"
DATASET_STANDARD = "qiskit_humaneval.json"
DATASET_HARD = "qiskit_humaneval_hard.json"
RESULTS_DIR = Path("benchmark_results")
EXECUTION_TIMEOUT = 60  # seconds per task execution
MAX_TOKENS = 8192
CHEATSHEET_PATH = Path("QISKIT_2X_CHEATSHEET.md")

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

RAG_SUFFIX = """\

CRITICAL: You MUST use Qiskit 2.x APIs. Many Qiskit APIs have been removed or renamed. \
Here is a reference of current correct APIs:

{cheatsheet}"""

CONTEXT7_LIBS = ["/qiskit/qiskit", "/qiskit/qiskit-ibm-runtime"]
CONTEXT7_TOKENS = 1500  # max tokens of docs to retrieve per library
CONTEXT7_CACHE_FILE = Path("benchmark_results/context7_cache.json")


def load_cheatsheet():
    """Load the Qiskit 2.x API cheatsheet for RAG injection."""
    if CHEATSHEET_PATH.exists():
        return CHEATSHEET_PATH.read_text()
    return ""


def query_context7(task_prompt, tokens=CONTEXT7_TOKENS):
    """Fetch relevant Qiskit docs from Context7 for a given task prompt.

    Queries both qiskit core and qiskit-ibm-runtime libraries.
    Returns concatenated doc snippets.
    """
    import urllib.request
    import urllib.parse

    # Extract key terms from the task prompt (function name + imports + docstring)
    snippets = []
    api_key = os.environ.get("CONTEXT7_API_KEY", "")
    for lib_id in CONTEXT7_LIBS:
        query = urllib.parse.urlencode({
            "libraryId": lib_id,
            "query": task_prompt[:500],  # first 500 chars have the signature + docstring
            "tokens": tokens,
        })
        url = f"https://context7.com/api/v2/context?{query}"
        try:
            req = urllib.request.Request(url)
            if api_key:
                req.add_header("Authorization", f"Bearer {api_key}")
            with urllib.request.urlopen(req, timeout=15) as resp:
                text = resp.read().decode()
                if text.strip():
                    snippets.append(text.strip())
        except Exception as e:
            if "429" in str(e):
                # Rate limited — wait and retry once
                print(f"  [context7 rate limited, waiting 65s...]")
                time.sleep(65)
                try:
                    req2 = urllib.request.Request(url)
                    if api_key:
                        req2.add_header("Authorization", f"Bearer {api_key}")
                    with urllib.request.urlopen(req2, timeout=15) as resp2:
                        text = resp2.read().decode()
                        if text.strip():
                            snippets.append(text.strip())
                except Exception as e2:
                    print(f"  [context7 retry failed: {lib_id}: {e2}]")
            else:
                print(f"  [context7 warning: {lib_id}: {e}]")
    return "\n\n---\n\n".join(snippets) if snippets else ""


def build_context7_cache(hard=False, delay=65):
    """Pre-fetch Context7 docs for all tasks with rate-limiting delays.

    Saves a JSON cache mapping task_id -> docs string.
    Respects Context7's 60 req/hour free tier by waiting between requests.
    """
    tasks = load_dataset(hard=hard)
    cache = {}
    if CONTEXT7_CACHE_FILE.exists():
        with open(CONTEXT7_CACHE_FILE) as f:
            cache = json.load(f)
        print(f"Loaded existing cache with {len(cache)} entries")

    remaining = [t for t in tasks if t["task_id"] not in cache]
    print(f"Need to fetch {len(remaining)} tasks ({len(cache)} already cached)")

    for i, task in enumerate(remaining):
        task_id = task["task_id"]
        print(f"[{i+1}/{len(remaining)}] Fetching docs for {task_id}...")
        docs = query_context7(task["prompt"])
        if docs:
            cache[task_id] = docs
            print(f"  Got {len(docs)} chars")
        else:
            print(f"  WARNING: No docs returned (rate limited?)")
            # Save progress and wait longer
            with open(CONTEXT7_CACHE_FILE, "w") as f:
                json.dump(cache, f)
            print(f"  Saved {len(cache)} cached entries. Waiting {delay*2}s...")
            time.sleep(delay * 2)
            # Retry once
            docs = query_context7(task["prompt"])
            if docs:
                cache[task_id] = docs
                print(f"  Retry OK: {len(docs)} chars")
            else:
                print(f"  Retry failed. Skipping.")
                continue

        # Save checkpoint
        if (i + 1) % 5 == 0:
            with open(CONTEXT7_CACHE_FILE, "w") as f:
                json.dump(cache, f)
            print(f"  [checkpoint: {len(cache)} cached]")

        # Rate limit: ~1 request per minute (we make 2 per task to 2 libs)
        if i < len(remaining) - 1:
            print(f"  Waiting {delay}s for rate limit...")
            time.sleep(delay)

    with open(CONTEXT7_CACHE_FILE, "w") as f:
        json.dump(cache, f)
    print(f"\nDone! Cache has {len(cache)}/{len(tasks)} tasks")
    return cache


def load_context7_cache():
    """Load pre-built Context7 cache."""
    if CONTEXT7_CACHE_FILE.exists():
        with open(CONTEXT7_CACHE_FILE) as f:
            return json.load(f)
    return {}


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


def detect_provider(model):
    """Detect API provider from model name."""
    if model.startswith("claude-"):
        return "claude-cli"
    return "google"


def call_llm(prompt, hard=False, model=MODEL, rag=False, task_id=None, context7_cache=None):
    """Send a task prompt to the LLM and get the completion."""
    provider = detect_provider(model)
    system = SYSTEM_PROMPT_HARD if hard else SYSTEM_PROMPT

    if rag == "cheatsheet":
        cheatsheet = load_cheatsheet()
        if cheatsheet:
            system += RAG_SUFFIX.format(cheatsheet=cheatsheet)
    elif rag == "context7":
        # Use cache if available, otherwise fetch live
        docs = None
        if context7_cache and task_id and task_id in context7_cache:
            docs = context7_cache[task_id]
        else:
            docs = query_context7(prompt)
        if docs:
            system += RAG_SUFFIX.format(cheatsheet=docs)

    if hard:
        user_msg = prompt
    else:
        user_msg = (
            f"Complete the following function. Return ONLY the function body code "
            f"(indented, no signature, no imports):\n\n```python\n{prompt}\n```"
        )

    if provider == "claude-cli":
        full_prompt = f"{system}\n\n{user_msg}"
        result = subprocess.run(
            ["claude", "-p", full_prompt, "--model", model, "--output-format", "text"],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode != 0:
            raise RuntimeError(f"claude CLI error: {result.stderr[:200]}")
        text = result.stdout
        text = strip_markdown_fences(text)
        # CLI doesn't report token counts; estimate from char length
        input_tokens = len(full_prompt) // 4
        output_tokens = len(text) // 4
    else:
        client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
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
    """Ensure all lines of the completion are indented as a function body.

    Handles three cases:
    - All lines unindented: indent everything
    - Mixed (first line unindented, rest indented): indent the unindented lines
    - All lines already indented: leave as-is
    """
    lines = code.split("\n")
    non_empty = [l for l in lines if l.strip()]
    if not non_empty:
        return code

    # Check if ALL non-empty lines already have indentation
    all_indented = all(l.startswith((" ", "\t")) for l in non_empty)
    if all_indented:
        return code

    # Check if MOST non-empty lines are indented (model gave body with 4-space
    # indent but first line lost its indent)
    indented_count = sum(1 for l in non_empty if l.startswith((" ", "\t")))
    if indented_count > len(non_empty) / 2:
        # Only indent lines that aren't already indented
        return "\n".join(
            indent + line if line.strip() and not line.startswith((" ", "\t")) else line
            for line in lines
        )

    # No lines indented: indent everything
    return "\n".join(indent + line if line.strip() else line for line in lines)


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
    """Classify error type from stderr.

    Returns (category, error_type) where category is one of:
      - 'model'          — the LLM produced wrong/broken code
      - 'infrastructure'  — test harness, API mismatch, or environment issue
    """
    if not stderr:
        return "infrastructure", "Unknown"

    # Infrastructure errors: not the model's fault
    infra_patterns = [
        ("AccountNotFoundError", "IBM auth required"),
        ("QiskitRuntimeService", "IBM auth required"),
        ("active_account", "IBM auth required"),
        ("IBMNotAuthorizedError", "IBM auth required"),
        ("SamplerV2.__init__() got an unexpected keyword argument", "Qiskit API mismatch"),
        ("SamplerV2.__init__() got unexpected keyword", "Qiskit API mismatch"),
        ("EstimatorV2.__init__() got an unexpected keyword argument", "Qiskit API mismatch"),
        ("No module named 'qiskit.providers.aer'", "Qiskit API mismatch"),
        ("No module named 'qiskit.utils'", "Qiskit API mismatch"),
        ("TIMEOUT", "Timeout"),
    ]
    for pattern, label in infra_patterns:
        if pattern in stderr:
            return "infrastructure", label

    # Model errors: the LLM generated bad code
    model_patterns = [
        ("AssertionError", "Wrong answer"),
        ("AssertError", "Wrong answer"),
        ("AssertionError", "Wrong answer"),
        ("SyntaxError", "Syntax error"),
        ("IndentationError", "Syntax error"),
        ("ImportError", "Import error"),
        ("ModuleNotFoundError", "Import error"),
        ("AttributeError", "Attribute error"),
        ("NameError", "Name error"),
        ("TypeError", "Type error"),
        ("ValueError", "Value error"),
    ]
    for pattern, label in model_patterns:
        if pattern in stderr:
            return "model", label
    return "model", "Runtime error"


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

    rag = getattr(args, "rag", None) or None
    context7_cache = None
    if rag == "context7":
        context7_cache = load_context7_cache()
        if context7_cache:
            print(f"  Using Context7 cache: {len(context7_cache)} entries")
    variant = "hard" if args.hard else "standard"
    if rag:
        variant += f"_rag_{rag}"
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
                task["prompt"], hard=args.hard, model=model, rag=rag,
                task_id=task_id, context7_cache=context7_cache
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

    # Error breakdown — split infrastructure vs model failures
    failures = [r for r in results if not r["passed"]]
    if failures:
        classified = [(classify_error(r.get("stderr", "")), r) for r in failures]
        infra_failures = [(cat, etype, r) for (cat, etype), r in classified if cat == "infrastructure"]
        model_failures = [(cat, etype, r) for (cat, etype), r in classified if cat == "model"]

        infra_count = len(infra_failures)
        model_count = len(model_failures)
        testable = total_done - infra_count
        adjusted_rate = round(total_pass / testable * 100, 2) if testable else 0

        print(f"\n  Error breakdown ({len(failures)} failures):")
        print(f"    Infrastructure (not model's fault): {infra_count}")
        infra_types = Counter(etype for _, etype, _ in infra_failures)
        for etype, count in infra_types.most_common():
            print(f"      {etype:>25}: {count}")
        print(f"    Model errors (genuine failures):    {model_count}")
        model_types = Counter(etype for _, etype, _ in model_failures)
        for etype, count in model_types.most_common():
            print(f"      {etype:>25}: {count}")

        print(f"\n  Adjusted Pass@1 (excluding infra): {total_pass}/{testable} = {adjusted_rate}%")

        print(f"\n  Failed tasks:")
        for (cat, etype), r in classified:
            tag = "[INFRA]" if cat == "infrastructure" else "[MODEL]"
            print(f"    {tag} {r['task_id']} ({r['difficulty']}): {etype}")

    # Compute infra vs model split for saved results
    if failures:
        _classified = [(classify_error(r.get("stderr", "")), r) for r in failures]
        _infra = sum(1 for (cat, _), _ in _classified if cat == "infrastructure")
        _testable = total_done - _infra
        _adjusted = round(total_pass / _testable * 100, 2) if _testable else 0
    else:
        _infra = 0
        _testable = total_done
        _adjusted = round(total_pass / total_done * 100, 2) if total_done else 0

    # Save final results
    summary = {
        "model": model,
        "variant": variant,
        "rag": rag,
        "timestamp": timestamp,
        "total_tasks": total_done,
        "passed": total_pass,
        "pass_rate": round(total_pass / total_done * 100, 2) if total_done else 0,
        "infrastructure_failures": _infra,
        "testable_tasks": _testable,
        "adjusted_pass_rate": _adjusted,
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
    parser.add_argument("--rag", choices=["cheatsheet", "context7"], default=None,
                        help="RAG mode: 'cheatsheet' (static file) or 'context7' (dynamic per-task docs)")
    parser.add_argument("--build-cache", action="store_true",
                        help="Pre-fetch Context7 docs for all tasks (rate-limited, saves to cache file)")
    args = parser.parse_args()

    if args.build_cache:
        build_context7_cache(hard=args.hard)
        sys.exit(0)

    if args.timeout:
        EXECUTION_TIMEOUT = args.timeout

    run_benchmark(args)
