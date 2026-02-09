# Agent-Based Research Infrastructure

Autonomous AI agents for continuous quantum computing research.

## Architecture

```
                    ┌──────────────┐
                    │ Orchestrator │
                    │  (cron/CLI)  │
                    └──────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │  Literature  │ │  Benchmark  │ │ Replication │
    │    Scout     │ │   Runner    │ │    Agent    │
    └─────────────┘ └─────────────┘ └─────────────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
                    ┌──────▼───────┐
                    │   Results    │
                    │  Dashboard   │
                    └──────────────┘
```

## Agents

| Agent | File | Purpose |
|---|---|---|
| Orchestrator | `orchestrator.py` | Coordinates pipeline, schedules runs, tracks state |
| Benchmark Runner | `benchmark_agent.py` | Runs Qiskit HumanEval against new models |
| Replication Agent | `replication_agent.py` | Reproduces quantum papers autonomously |
| Literature Scout | (planned) | Monitors arxiv quant-ph |
| Circuit Optimizer | (planned) | Hardware-aware transpilation |

## Usage

```bash
# Run a single benchmark sweep
secret-lover run -- python agents/benchmark_agent.py --model gemini-3-flash-preview --limit 10

# Run the orchestrator (full pipeline)
secret-lover run -- python agents/orchestrator.py

# Check results
ls agents/results/
```
