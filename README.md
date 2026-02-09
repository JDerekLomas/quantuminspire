# AI x Quantum — TU Delft / Quantum Inspire

**How might generative AI accelerate quantum computing?**

An open research initiative exploring AI-driven quantum computing research. We're building autonomous agent infrastructure that continuously runs quantum experiments, replicates published papers, and discovers optimization opportunities.

## Live site

Deployed at the Vercel URL after `vercel --prod`.

## What's here

### Experiments

| Experiment | Status | Description |
|---|---|---|
| **Qiskit HumanEval Benchmark** | Running | 151 quantum coding tasks evaluated against frontier LLMs (Pass@1) |
| **AI Paper Replication** | Complete | Autonomous replication of Sagastizabal et al. (2019) — VQE for H₂ with symmetry verification |
| **AI Circuit Transpilation** | Planned | LLM-optimized circuits vs Qiskit transpiler for QI hardware |
| **AI Error Characterization** | Planned | Autonomous device characterization and mitigation strategy selection |
| **Quantum Literature Scout** | Planned | arxiv monitoring + automated replication planning |

### Agent architecture

A system of specialized AI agents for continuous quantum research:

- **Orchestrator** — Coordinates experiments, allocates compute, tracks results
- **Literature Scout** — Monitors arxiv, identifies replicable experiments
- **Benchmark Runner** — Continuous LLM evaluation on quantum tasks
- **Replication Agent** — Autonomous paper replication
- **Circuit Optimizer** — Hardware-aware circuit optimization
- **Results Dashboard** — Auto-generated visualizations and reports

### Files

| File | Description |
|---|---|
| `benchmark_harness.py` | Qiskit HumanEval benchmark runner (LLM call + sandboxed execution + grading) |
| `replicate_sagastizabal.py` | Full VQE replication of Sagastizabal et al. (2019) |
| `qiskit_humaneval.json` | 151 standard Qiskit coding tasks |
| `qiskit_humaneval_hard.json` | Hard variant (open-ended problem descriptions) |
| `test_*.py` | Quantum algorithm tests (Bell, GHZ, Grover, QFT, VQE, etc.) |
| `app/` | Next.js research website |

## Quick start

```bash
# Website
npm run dev

# Python experiments
source .venv/bin/activate
secret-lover run -- python benchmark_harness.py --limit 10
python replicate_sagastizabal.py
```

## Stack

- **Quantum**: Qiskit 2.1, Qiskit Aer, PennyLane, Quantum Inspire SDK v3, OpenSquirrel
- **AI**: Claude, Gemini, GPT (via respective APIs)
- **Web**: Next.js 14, Tailwind, Three.js
- **Hardware**: Quantum Inspire — Starmon-7 (7q), Tuna-5 (5q), Tuna-9 (9q)

## Links

- [Quantum Inspire](https://www.quantum-inspire.com)
- [QuTech](https://qutech.nl)
- [TU Delft](https://www.tudelft.nl)
- [Qiskit HumanEval paper](https://arxiv.org/abs/2406.02132)
- [Sagastizabal et al. (2019)](https://arxiv.org/abs/1902.11258)
