# Qiskit HumanEval Benchmark Results

Results from running the [Qiskit HumanEval](https://arxiv.org/abs/2406.02132) benchmark (151 quantum programming tasks) against frontier LLMs. See the [blog post](https://haiqu.org/blog/quantum-code-benchmark) for analysis.

## Canonical Runs

| File | Configuration | Pass@1 | Tasks |
|------|--------------|--------|-------|
| `results_standard_claude-opus-4-6_20260210_110315.json` | Claude Opus 4.6 baseline | 63.6% (96/151) | 151 |
| `results_standard_gemini-3-flash-preview_20260209_234106.json` | Gemini 3 Flash baseline | 62.3% (94/151) | 151 |
| `results_standard_gemini-3-flash-preview_20260210_094345.json` | Gemini 3 Flash baseline (run 2) | 62.3% (94/151) | 151 |
| `results_standard_rag_gemini-3-flash-preview_20260210_144039.json` | Gemini + static cheatsheet | 62.3% (94/151) | 151 |
| `results_standard_rag_context7_gemini-3-flash-preview_20260210_163102.json` | Gemini + Context7 RAG (run 1) | 70.9% (107/151) | 151 |
| `results_standard_rag_context7_claude-opus-4-6_20260210_184650.json` | Claude Opus + Context7 RAG | 70.9% (107/151) | 151 |
| `results_standard_rag_context7_gemini-3-flash-preview_20260210_204214.json` | Gemini + Context7 RAG (run 2) | 68.2% (103/151) | 151 |

## JSON Schema

Each file contains:

```json
{
  "model": "claude-opus-4-6",
  "variant": "standard",
  "timestamp": "20260210_110315",
  "total_tasks": 151,
  "passed": 96,
  "pass_rate": 63.58,
  "total_input_tokens": 30235,
  "total_output_tokens": 10085,
  "by_difficulty": {
    "basic": { "total": 79, "passed": 53, "pass_rate": 67.09 },
    "intermediate": { "total": 67, "passed": 42, "pass_rate": 62.69 },
    "difficult": { "total": 5, "passed": 1, "pass_rate": 20.0 }
  },
  "results": [
    {
      "task_id": "qiskitHumanEval/0",
      "difficulty": "basic",
      "passed": true,
      "error": null,
      "generated_code": "...",
      "input_tokens": 200,
      "output_tokens": 67
    }
  ]
}
```

## Partial Runs

The `partial/` directory contains aborted or test runs (1-10 tasks each) from development iterations. These are not cited in any analysis.
