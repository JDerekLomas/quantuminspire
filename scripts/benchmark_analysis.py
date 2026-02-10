#!/usr/bin/env python3
"""
Qiskit HumanEval Benchmark — Failure Analysis across 4 configurations.

Compares: Gemini baseline, Opus baseline, Gemini+Context7, Opus+Context7
Categorizes failures, identifies RAG impact, and produces a summary report.
"""

import json
import re
from collections import defaultdict, Counter
from pathlib import Path

BASE = Path("/Users/dereklomas/quantuminspire")

# --- File paths ---
FILES = {
    "gemini_base": BASE / "benchmark_results/results_standard_gemini-3-flash-preview_20260209_234106.json",
    "opus_base": BASE / "benchmark_results/results_standard_claude-opus-4-6_20260210_110315.json",
    "gemini_rag": BASE / "benchmark_results/results_standard_rag_context7_gemini-3-flash-preview_20260210_163102.json",
    "opus_rag": BASE / "benchmark_results/results_standard_rag_context7_claude-opus-4-6_20260210_184650.json",
}
TASKS_FILE = BASE / "qiskit_humaneval.json"

# --- Load data ---
def load_results(path):
    with open(path) as f:
        data = json.load(f)
    # Index by task_id
    return {r["task_id"]: r for r in data["results"]}, data

def load_tasks(path):
    with open(path) as f:
        tasks = json.load(f)
    return {t["task_id"]: t for t in tasks}

results = {}
meta = {}
for key, path in FILES.items():
    results[key], meta[key] = load_results(path)

tasks = load_tasks(TASKS_FILE)

# Sanity: all should have 151 tasks
for key in results:
    assert len(results[key]) == 151, f"{key} has {len(results[key])} tasks, expected 151"

all_task_ids = sorted(tasks.keys(), key=lambda x: int(x.split("/")[1]))

# --- Classify failure mode from stderr/stdout ---
def classify_failure(result):
    """Classify a failing result into a failure mode category."""
    stderr = result.get("stderr", "")
    stdout = result.get("stdout", "")
    completion = result.get("completion", "")

    # Infrastructure: empty completion, API error, timeout
    if not completion or completion.strip() == "":
        return "infrastructure"
    if "INFRASTRUCTURE_FAILURE" in stdout or "INFRASTRUCTURE_FAILURE" in stderr:
        return "infrastructure"
    if "rate limit" in stderr.lower() or "quota" in stderr.lower():
        return "infrastructure"

    # API staleness: deprecated imports, missing attributes, module not found
    staleness_patterns = [
        r"ImportError",
        r"ModuleNotFoundError",
        r"has no attribute",
        r"AttributeError",
        r"cannot import name",
        r"No module named",
        r"got an unexpected keyword argument",
        r"missing \d+ required positional argument",
        r"takes \d+ positional argument",
        r"is not a valid",
        r"was deprecated",
        r"has been removed",
    ]
    for pat in staleness_patterns:
        if re.search(pat, stderr):
            return "api_staleness"

    # Type/signature mismatch: code runs but wrong type returned
    type_patterns = [
        r"TypeError",
        r"assert isinstance",
        r"AssertionError.*type",
    ]
    # Check for TypeError that isn't an API staleness issue
    if "TypeError" in stderr and not any(re.search(p, stderr) for p in staleness_patterns[:6]):
        return "type_signature"

    # Logic/algorithm error: BENCHMARK_FAIL but no crash
    if "BENCHMARK_FAIL" in stdout and not stderr.strip():
        return "logic_error"
    if "AssertionError" in stderr or "AssertionError" in stderr or "assert " in stderr.lower():
        # Assertion failure = wrong result
        return "logic_error"

    # Catch remaining TypeErrors and ValueErrors
    if "ValueError" in stderr:
        return "logic_error"
    if "NameError" in stderr:
        return "api_staleness"  # likely tried to use something not imported
    if "SyntaxError" in stderr:
        return "other"
    if "RuntimeError" in stderr:
        return "other"

    # Default
    return "other"


# ============================================================
# SECTION 1: Overall pass rates
# ============================================================
print("=" * 80)
print("QISKIT HUMANEVAL BENCHMARK — FAILURE ANALYSIS")
print("=" * 80)

print("\n## 1. Overall Pass Rates\n")
print(f"{'Config':<30} {'Passed':>7} {'Failed':>7} {'Rate':>7}")
print("-" * 55)
labels = {
    "gemini_base": "Gemini 3 Flash (baseline)",
    "opus_base": "Opus 4.6 (baseline)",
    "gemini_rag": "Gemini 3 Flash + Context7",
    "opus_rag": "Opus 4.6 + Context7",
}
for key in ["gemini_base", "opus_base", "gemini_rag", "opus_rag"]:
    m = meta[key]
    passed = m["passed"]
    failed = m["total_tasks"] - passed
    rate = m["pass_rate"]
    print(f"{labels[key]:<30} {passed:>7} {failed:>7} {rate:>6.1f}%")

# By difficulty
print("\n## 2. Pass Rates by Difficulty\n")
for diff in ["basic", "intermediate", "difficult"]:
    print(f"### {diff.title()}")
    print(f"  {'Config':<30} {'Passed':>7} {'Total':>7} {'Rate':>7}")
    for key in ["gemini_base", "opus_base", "gemini_rag", "opus_rag"]:
        d = meta[key]["by_difficulty"].get(diff, {})
        print(f"  {labels[key]:<30} {d.get('passed',0):>7} {d.get('total',0):>7} {d.get('pass_rate',0):>6.1f}%")
    print()

# ============================================================
# SECTION 2: Per-task cross-config comparison
# ============================================================
print("\n## 3. Cross-Configuration Task Analysis\n")

# Build pass/fail matrix
pass_matrix = {}
for tid in all_task_ids:
    pass_matrix[tid] = {
        key: results[key][tid]["passed"] for key in results
    }

# Count patterns
all_pass = []        # pass in all 4
all_fail = []        # fail in all 4
base_only_fail = []  # fail both baselines, pass both RAG
rag_only_fail = []   # pass both baselines, fail both RAG
mixed = []           # anything else

for tid in all_task_ids:
    pm = pass_matrix[tid]
    gb = pm["gemini_base"]
    ob = pm["opus_base"]
    gr = pm["gemini_rag"]
    orr = pm["opus_rag"]

    if gb and ob and gr and orr:
        all_pass.append(tid)
    elif not gb and not ob and not gr and not orr:
        all_fail.append(tid)
    else:
        mixed.append(tid)

print(f"All 4 configs PASS:  {len(all_pass)}")
print(f"All 4 configs FAIL:  {len(all_fail)}")
print(f"Mixed results:       {len(mixed)}")

# ============================================================
# SECTION 3: Core failures — tasks both RAG configs fail
# ============================================================
both_rag_fail = [tid for tid in all_task_ids
                 if not pass_matrix[tid]["gemini_rag"] and not pass_matrix[tid]["opus_rag"]]

print(f"\n## 4. Core Failures (Both RAG configs fail): {len(both_rag_fail)} tasks\n")

# Classify each failure using BOTH RAG results
failure_modes = defaultdict(list)
for tid in both_rag_fail:
    # Use gemini_rag and opus_rag stderr to classify
    cat_g = classify_failure(results["gemini_rag"][tid])
    cat_o = classify_failure(results["opus_rag"][tid])
    # Use the more informative classification (prefer non-"other")
    if cat_g == cat_o:
        cat = cat_g
    elif cat_g == "other":
        cat = cat_o
    elif cat_o == "other":
        cat = cat_g
    else:
        cat = cat_g  # default to gemini's classification
    failure_modes[cat].append(tid)

mode_labels = {
    "api_staleness": "API Staleness (deprecated/removed APIs)",
    "logic_error": "Logic/Algorithm Error (wrong result)",
    "infrastructure": "Infrastructure Failure (API error/timeout/empty)",
    "type_signature": "Type/Signature Mismatch",
    "other": "Other",
}

for mode in ["api_staleness", "logic_error", "infrastructure", "type_signature", "other"]:
    tids = failure_modes[mode]
    if not tids:
        continue
    print(f"\n### {mode_labels[mode]} ({len(tids)} tasks)")
    print()
    for tid in tids:
        task = tasks[tid]
        idx = tid.split("/")[1]
        diff = task.get("difficulty_scale", "?")
        entry = task["entry_point"]

        # Get the stderr from both RAG configs (truncated)
        stderr_g = results["gemini_rag"][tid].get("stderr", "").strip()
        stderr_o = results["opus_rag"][tid].get("stderr", "").strip()
        # Use whichever is more informative
        stderr = stderr_g if len(stderr_g) >= len(stderr_o) else stderr_o
        # Extract key error line
        error_lines = [l for l in stderr.split("\n") if l.strip() and not l.startswith("  ")]
        key_error = error_lines[-1][:120] if error_lines else "(no error message)"

        print(f"  [{idx:>3}] {entry:<45} ({diff})")
        print(f"        {key_error}")

# ============================================================
# SECTION 4: RAG Impact — fixed and broken tasks
# ============================================================
print("\n\n## 5. RAG Impact Analysis\n")

# Per model: RAG-fixed = fail baseline, pass RAG
# Per model: RAG-broken = pass baseline, fail RAG
for model_name, base_key, rag_key in [
    ("Gemini 3 Flash", "gemini_base", "gemini_rag"),
    ("Opus 4.6", "opus_base", "opus_rag"),
]:
    fixed = []
    broken = []
    for tid in all_task_ids:
        b = results[base_key][tid]["passed"]
        r = results[rag_key][tid]["passed"]
        if not b and r:
            fixed.append(tid)
        elif b and not r:
            broken.append(tid)

    print(f"### {model_name}")
    print(f"  RAG-fixed (baseline FAIL -> RAG PASS): {len(fixed)}")
    if fixed:
        for tid in fixed:
            idx = tid.split("/")[1]
            entry = tasks[tid]["entry_point"]
            diff = tasks[tid].get("difficulty_scale", "?")
            # What was the baseline failure mode?
            cat = classify_failure(results[base_key][tid])
            print(f"    [{idx:>3}] {entry:<45} ({diff}) was: {cat}")

    print(f"  RAG-broken (baseline PASS -> RAG FAIL): {len(broken)}")
    if broken:
        for tid in broken:
            idx = tid.split("/")[1]
            entry = tasks[tid]["entry_point"]
            diff = tasks[tid].get("difficulty_scale", "?")
            cat = classify_failure(results[rag_key][tid])
            print(f"    [{idx:>3}] {entry:<45} ({diff}) now: {cat}")
    print()


# ============================================================
# SECTION 5: Model disagreement with Context7
# ============================================================
print("\n## 6. Model Disagreement (Context7 configs)\n")
print("Tasks where one model passes and the other fails with Context7:\n")

gemini_only = []
opus_only = []
for tid in all_task_ids:
    gr = results["gemini_rag"][tid]["passed"]
    orr = results["opus_rag"][tid]["passed"]
    if gr and not orr:
        gemini_only.append(tid)
    elif not gr and orr:
        opus_only.append(tid)

print(f"Gemini passes, Opus fails: {len(gemini_only)}")
for tid in gemini_only:
    idx = tid.split("/")[1]
    entry = tasks[tid]["entry_point"]
    diff = tasks[tid].get("difficulty_scale", "?")
    cat = classify_failure(results["opus_rag"][tid])
    print(f"  [{idx:>3}] {entry:<45} ({diff}) Opus failure: {cat}")

print(f"\nOpus passes, Gemini fails: {len(opus_only)}")
for tid in opus_only:
    idx = tid.split("/")[1]
    entry = tasks[tid]["entry_point"]
    diff = tasks[tid].get("difficulty_scale", "?")
    cat = classify_failure(results["gemini_rag"][tid])
    print(f"  [{idx:>3}] {entry:<45} ({diff}) Gemini failure: {cat}")


# ============================================================
# SECTION 6: Detailed error analysis for the "core failures"
# ============================================================
print("\n\n## 7. Detailed Error Patterns in Core Failures\n")

# Collect all unique error signatures from both RAG configs for core failures
error_sigs = Counter()
for tid in both_rag_fail:
    for key in ["gemini_rag", "opus_rag"]:
        stderr = results[key][tid].get("stderr", "").strip()
        # Extract the final traceback line (the actual error)
        lines = stderr.split("\n")
        for line in reversed(lines):
            line = line.strip()
            if line and not line.startswith("File") and not line.startswith("Traceback"):
                # Normalize: remove specific values
                sig = re.sub(r"'[^']*'", "'...'", line)
                sig = re.sub(r"line \d+", "line N", sig)
                error_sigs[sig] = error_sigs.get(sig, 0) + 1
                break

print("Most common error signatures (across both RAG configs):\n")
for sig, count in sorted(error_sigs.items(), key=lambda x: -x[1])[:25]:
    print(f"  [{count:>2}x] {sig[:110]}")


# ============================================================
# SECTION 7: Specific deprecated API patterns
# ============================================================
print("\n\n## 8. Specific Deprecated API Patterns\n")

deprecated_apis = Counter()
for tid in both_rag_fail:
    for key in ["gemini_rag", "opus_rag"]:
        stderr = results[key][tid].get("stderr", "")
        # Look for specific API issues
        patterns = {
            "Sampler(backend=...)": r"SamplerV2.*unexpected keyword argument.*backend",
            "Sampler(backend=...) [old]": r"Sampler\(\).*unexpected keyword argument.*backend",
            "from qiskit.providers.aer": r"No module named '?qiskit.providers.aer",
            "from qiskit.tools": r"No module named '?qiskit.tools",
            "qiskit.execute()": r"cannot import name '?execute",
            "BasicAer": r"No module named '?qiskit.providers.basicaer|cannot import name '?BasicAer",
            "Aer.get_backend()": r"cannot import name '?Aer'?|No module named '?qiskit.Aer",
            "qiskit.visualization": r"No module named '?qiskit.visualization",
            "transpile() issues": r"transpile",
            "execute() removed": r"cannot import name '?execute'?",
            "QuantumInstance": r"QuantumInstance",
            "qi/opflow": r"qiskit.opflow|qiskit.algorithms.*opflow",
            "NoiseModel import": r"No module named '?qiskit.providers.aer.noise",
            "circuit_to_dag": r"cannot import name '?circuit_to_dag",
        }
        for label, pat in patterns.items():
            if re.search(pat, stderr):
                deprecated_apis[label] += 1

print("Deprecated API references in core failures:\n")
for api, count in sorted(deprecated_apis.items(), key=lambda x: -x[1]):
    if count > 0:
        print(f"  [{count:>2}x] {api}")


# ============================================================
# SECTION 8: Summary statistics
# ============================================================
print("\n\n## 9. Summary Statistics\n")

# Count how many tasks each model uniquely solves
gemini_base_only = sum(1 for tid in all_task_ids if results["gemini_base"][tid]["passed"] and not results["opus_base"][tid]["passed"])
opus_base_only = sum(1 for tid in all_task_ids if results["opus_base"][tid]["passed"] and not results["gemini_base"][tid]["passed"])
both_base_pass = sum(1 for tid in all_task_ids if results["gemini_base"][tid]["passed"] and results["opus_base"][tid]["passed"])

gemini_rag_only_ct = sum(1 for tid in all_task_ids if results["gemini_rag"][tid]["passed"] and not results["opus_rag"][tid]["passed"])
opus_rag_only_ct = sum(1 for tid in all_task_ids if results["opus_rag"][tid]["passed"] and not results["gemini_rag"][tid]["passed"])
both_rag_pass = sum(1 for tid in all_task_ids if results["gemini_rag"][tid]["passed"] and results["opus_rag"][tid]["passed"])

print(f"Baseline overlap:")
print(f"  Both pass:       {both_base_pass}")
print(f"  Gemini only:     {gemini_base_only}")
print(f"  Opus only:       {opus_base_only}")
print(f"  Union pass:      {both_base_pass + gemini_base_only + opus_base_only}")
print()
print(f"Context7 overlap:")
print(f"  Both pass:       {both_rag_pass}")
print(f"  Gemini only:     {gemini_rag_only_ct}")
print(f"  Opus only:       {opus_rag_only_ct}")
print(f"  Union pass:      {both_rag_pass + gemini_rag_only_ct + opus_rag_only_ct}")
print()

# RAG lift
for model_name, base_key, rag_key in [
    ("Gemini", "gemini_base", "gemini_rag"),
    ("Opus", "opus_base", "opus_rag"),
]:
    base_p = meta[base_key]["passed"]
    rag_p = meta[rag_key]["passed"]
    lift = rag_p - base_p
    print(f"{model_name} RAG lift: {base_p} -> {rag_p} (+{lift} tasks, +{lift/151*100:.1f}pp)")

print()

# Failure mode breakdown for core failures
print(f"Core failures breakdown ({len(both_rag_fail)} tasks that BOTH RAG configs fail):")
for mode in ["api_staleness", "logic_error", "infrastructure", "type_signature", "other"]:
    count = len(failure_modes[mode])
    if count > 0:
        pct = count / len(both_rag_fail) * 100
        print(f"  {mode_labels[mode]:<50} {count:>3} ({pct:.0f}%)")


# ============================================================
# SECTION 9: Full task-level results table for core failures
# ============================================================
print("\n\n## 10. Full Core Failure Matrix\n")
print(f"{'ID':>4} {'Entry Point':<45} {'Diff':<13} {'GB':>3} {'OB':>3} {'GR':>3} {'OR':>3} {'Mode'}")
print("-" * 110)
for tid in both_rag_fail:
    idx = tid.split("/")[1]
    entry = tasks[tid]["entry_point"]
    diff = tasks[tid].get("difficulty_scale", "?")
    gb = "P" if results["gemini_base"][tid]["passed"] else "F"
    ob = "P" if results["opus_base"][tid]["passed"] else "F"
    gr = "P" if results["gemini_rag"][tid]["passed"] else "F"
    orr = "P" if results["opus_rag"][tid]["passed"] else "F"
    # Determine mode
    cat_g = classify_failure(results["gemini_rag"][tid])
    cat_o = classify_failure(results["opus_rag"][tid])
    cat = cat_g if cat_g == cat_o else f"{cat_g}/{cat_o}"
    print(f"{idx:>4} {entry:<45} {diff:<13} {gb:>3} {ob:>3} {gr:>3} {orr:>3} {cat}")
