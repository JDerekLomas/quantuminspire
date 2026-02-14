# AI x Quantum — TU Delft / Quantum Inspire

**How might generative AI accelerate quantum computing?**

An open research initiative exploring AI-driven quantum computing research. We build autonomous agents that run quantum experiments across multiple hardware backends, replicate published papers, and benchmark LLM capabilities on quantum tasks.

**Live site**: https://quantuminspire.vercel.app

## Current results

### Experiments (22 results across 7 study types)

| Study | Backends | Key result |
|---|---|---|
| Bell State Calibration | Emulator, IBM Marrakesh, IBM Torino, Tuna-9 | 100% / 99.05% / varies fidelity |
| GHZ State (3q) | Emulator, IBM Marrakesh, IBM Torino, Tuna-9 | 100% / 98.14% fidelity |
| H2 VQE (2q) | Emulator, IBM Marrakesh, IBM Torino, Tuna-9 | -1.1385 Ha emulator (chemical accuracy) |
| QRNG Certification | Tuna-9 raw + debiased, Emulator | Raw fails NIST; debiased passes all |
| Randomized Benchmarking | Emulator | 99.95% gate fidelity |
| QAOA MaxCut | Emulator | 87% approximation ratio |
| Quantum Volume | Emulator + Tuna-9 | QV 16 (4q pass, 8/10 circuits) |

Additional hardware experiments: connectivity probe (Tuna-9 topology), repetition code (3q QEC), detection code (emulator).

### Paper replications (3 papers, 13 claims)

| Paper | Claims tested | Pass rate |
|---|---|---|
| Sagastizabal 2019 (H2 VQE) | 7 | 43% (emulator pass, hardware fail) |
| Peruzzo 2014 (HeH+ VQE) | 3 | 100% (emulator) |
| Cross 2019 (Quantum Volume) | 3 | 100% (emulator) |

## Hardware access

| Backend | Qubits | Access |
|---|---|---|
| QI Emulator (qxelarator) | Configurable | Local, no auth needed |
| QI Tuna-9 | 9 (6 usable) | QI member 2108 |
| IBM Marrakesh | 156 | IBM Quantum (free tier, 10 min/month) |
| IBM Torino | 133 | IBM Quantum |
| IBM Fez | 156 | IBM Quantum |

## Quick start

```bash
# 1. Website
npm install
npm run dev
# Deploy
vercel --prod

# 2. Python environment (Python 3.9-3.13 supported — 3.14 breaks qxelarator)
python3 -m venv .venv
source .venv/bin/activate
pip install -r mcp-servers/requirements.txt

# 3. MCP servers for Claude Code (optional — starts automatically)
#    The .mcp.json in this repo configures three quantum MCP servers.
#    They use .venv/bin/python, so step 2 must be done first.
#    Auth setup (needed for hardware, not for emulator):
#      - Quantum Inspire: qi login
#      - IBM Quantum: python -c "from qiskit_ibm_runtime import QiskitRuntimeService; QiskitRuntimeService.save_account(channel='ibm_cloud', token='YOUR_TOKEN')"

# 4. Run experiments
source .venv/bin/activate
python scripts/benchmark_harness.py --limit 10
python scripts/replications/replicate_sagastizabal.py
python scripts/replications/replicate_peruzzo.py
python agents/experiment_daemon.py

# 5. Tests
npm test                              # JS/TS (Vitest)
python -m pytest tests/               # Python
```

## Architecture

### Website (Next.js 14 + Tailwind + Three.js)

| Route | Description |
|---|---|
| `/` | Research home — hero, experiments overview, agent architecture |
| `/experiments` | Experiment dashboard — grouped by type, backend badges |
| `/experiments/[id]` | Study detail — abstract, research question, results, visualizations |
| `/replications` | Paper replication dashboard — claims vs measured, cross-backend |
| `/blog` | Research blog (7 posts) |
| `/learn` | Interactive quantum learning page |
| `/bloch-sphere`, `/state-vector`, etc. | Interactive quantum visualizations |

### Agents (`agents/`)

| Agent | Purpose |
|---|---|
| `orchestrator.py` | Pipeline coordinator |
| `experiment_daemon.py` | Queue -> submit -> analyze -> store results |
| `benchmark_agent.py` | LLM benchmark runner |
| `replication_agent.py` | Paper registry + run/analyze replications |
| `replication_analyzer.py` | Compare results vs published claims |
| `qec_decoder.py` | Quantum error correction decoder |

### MCP servers (`mcp-servers/`)

| Server | Purpose |
|---|---|
| `qi-circuits` | Submit/check circuits on Quantum Inspire hardware |
| `qrng` | Quantum random number generation |
| `ibm-quantum` | IBM Quantum hardware access |

## Experiment result JSON schema (v1.0)

All result files in `experiments/results/` follow this schema:

```json
{
  "schema_version": "1.0",
  "id": "bell-calibration-001-ibm",
  "type": "bell_calibration",
  "backend": "ibm_marrakesh",
  "backend_qubits": 156,
  "job_id": "d65kqpoqbmes739d1k2g",
  "submitted": "2026-02-10T15:24:38Z",
  "completed": "2026-02-10T15:24:38Z",
  "parameters": { "shots": 4096 },
  "raw_counts": { ... },
  "analysis": { ... },
  "circuit_cqasm": "version 3.0\n...",
  "errors": null
}
```

- `schema_version`: always "1.0"
- `backend_qubits`: qubit count of backend (null for emulators)
- `job_id`: hardware job ID (null for emulator/local runs)

## Stack

- **Quantum**: Qiskit 2.1, PennyLane 0.44, QI SDK 3.5.1, OpenFermion, PySCF
- **AI**: Claude, Gemini, GPT (via respective APIs)
- **Web**: Next.js 14, Tailwind, Three.js
- **Hardware**: Quantum Inspire Tuna-9 (9q), IBM Marrakesh (156q), IBM Torino (133q), IBM Fez (156q)
- **Python**: 3.9-3.13 (3.14 breaks qxelarator)

## Links

- [Quantum Inspire](https://www.quantum-inspire.com)
- [QuTech](https://qutech.nl)
- [TU Delft](https://www.tudelft.nl)
- [Qiskit HumanEval paper](https://arxiv.org/abs/2406.02132)
- [Sagastizabal et al. (2019)](https://arxiv.org/abs/1902.11258)
- [Peruzzo et al. (2014)](https://doi.org/10.1038/ncomms5213)
- [Cross et al. (2019)](https://doi.org/10.1103/PhysRevA.100.032328)
