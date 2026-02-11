# Prism Prompt: AI-Driven Replication of Quantum Computing Experiments

Copy this into OpenAI Prism (https://prism.openai.com/) to draft the paper. All data is publicly available on GitHub — links below.

---

## DATA LINKS (all public on GitHub)

### Organized Dataset (CSV summaries)
- **Experiment summary**: https://github.com/JDerekLomas/quantuminspire/blob/main/research/dataset/experiment_summary.csv
- **Hardware comparison**: https://github.com/JDerekLomas/quantuminspire/blob/main/research/dataset/hardware_comparison.csv
- **Benchmark summary**: https://github.com/JDerekLomas/quantuminspire/blob/main/research/dataset/benchmark_summary.csv
- **Replication summary**: https://github.com/JDerekLomas/quantuminspire/blob/main/research/dataset/replication_summary.csv
- **Dataset README**: https://github.com/JDerekLomas/quantuminspire/blob/main/research/dataset/README.md

### Raw Experiment Results (JSON)
- **Bell state (emulator)**: https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/bell-calibration-001.json
- **Bell state (IBM)**: https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/bell-calibration-001-ibm.json
- **Bell state (Tuna-9)**: https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/bell-calibration-001-tuna9.json
- **GHZ 3q (emulator)**: https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/ghz-003.json
- **GHZ 3q (IBM)**: https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/ghz-003-ibm.json
- **GHZ 3q (Tuna-9)**: https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/ghz-003-tuna9.json
- **VQE H2 (emulator)**: https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/vqe-equilibrium-001.json
- **VQE H2 (IBM Marrakesh)**: https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/vqe-equilibrium-001-ibm.json
- **VQE H2 (IBM Torino)**: https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/vqe-equilibrium-002-ibm-torino.json
- **VQE H2 (Tuna-9)**: https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/vqe-equilibrium-001-tuna9.json
- **VQE H2 bond sweep (emulator)**: https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/vqe-h2-sweep-emulator.json
- **VQE H2 bond sweep (reference)**: https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/vqe-h2-sweep-reference.json
- **HeH+ VQE sweep (Peruzzo)**: https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/peruzzo2014-heh-sweep.json
- **Quantum Volume**: https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/qv-001.json
- **Randomized Benchmarking**: https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/rb-1qubit-001.json
- **QAOA MaxCut**: https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/qaoa-maxcut-001.json
- **QRNG Certification**: https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/qrng-certification-001.json
- **Connectivity Probe (Tuna-9)**: https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/connectivity-probe-001-tuna9.json
- **Repetition Code (Tuna-9)**: https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/repetition-code-001-tuna9.json

### Paper Replication Reports
- **Sagastizabal 2019 (JSON)**: https://github.com/JDerekLomas/quantuminspire/blob/main/research/replication-reports/sagastizabal2019.json
- **Sagastizabal 2019 (analysis)**: https://github.com/JDerekLomas/quantuminspire/blob/main/research/replication-reports/sagastizabal2019.md
- **Peruzzo 2014 (JSON)**: https://github.com/JDerekLomas/quantuminspire/blob/main/research/replication-reports/peruzzo2014.json
- **Peruzzo 2014 (analysis)**: https://github.com/JDerekLomas/quantuminspire/blob/main/research/replication-reports/peruzzo2014.md
- **Cross 2019 (JSON)**: https://github.com/JDerekLomas/quantuminspire/blob/main/research/replication-reports/cross2019.json
- **Cross 2019 (analysis)**: https://github.com/JDerekLomas/quantuminspire/blob/main/research/replication-reports/cross2019.md

### LLM Benchmark Results
- **Claude Opus 4.6 (best run)**: https://github.com/JDerekLomas/quantuminspire/blob/main/benchmark_results/results_standard_claude-opus-4-6_20260210_110315.json
- **Gemini 3 Flash (best run)**: https://github.com/JDerekLomas/quantuminspire/blob/main/benchmark_results/results_standard_gemini-3-flash-preview_20260210_094345.json
- **All benchmark results**: https://github.com/JDerekLomas/quantuminspire/tree/main/benchmark_results

### Agent Source Code
- **Experiment daemon**: https://github.com/JDerekLomas/quantuminspire/blob/main/agents/experiment_daemon.py
- **Replication agent**: https://github.com/JDerekLomas/quantuminspire/blob/main/agents/replication_agent.py
- **Replication analyzer**: https://github.com/JDerekLomas/quantuminspire/blob/main/agents/replication_analyzer.py
- **Benchmark harness**: https://github.com/JDerekLomas/quantuminspire/blob/main/scripts/benchmark_harness.py
- **MCP servers**: https://github.com/JDerekLomas/quantuminspire/tree/main/mcp-servers
- **Sagastizabal replication script**: https://github.com/JDerekLomas/quantuminspire/blob/main/scripts/replications/replicate_sagastizabal.py
- **Peruzzo replication script**: https://github.com/JDerekLomas/quantuminspire/blob/main/scripts/replications/replicate_peruzzo.py

### Research Documents
- **Research plan**: https://github.com/JDerekLomas/quantuminspire/blob/main/research/replication-research-plan.md
- **Full repository**: https://github.com/JDerekLomas/quantuminspire

---

## PROMPT

I need help writing a scientific paper for submission to a journal like Quantum Science and Technology, npj Quantum Information, or Physical Review Research. The paper reports on an experiment where **AI agents attempted to replicate published quantum computing experiments** across multiple hardware platforms.

### Title (working)

**"AI-Driven Replication of Quantum Computing Experiments: What Breaks When Agents Try to Reproduce Published Results"**

### Authors

Derek Lomas and AI Research Agents (Claude Opus 4.6, Gemini 3 Flash)
Affiliation: TU Delft / QuTech / Quantum Inspire

### Core Thesis

The replication crisis exists in quantum computing too — most published results cannot be independently verified because they require specific hardware, custom calibration, and implicit knowledge not captured in papers. We built an AI agent pipeline that attempts to replicate published quantum experiments from their descriptions alone, running them on 4 different backends (QI emulator, QI Tuna-9, IBM Marrakesh, IBM Torino). **The failure modes themselves are the research contribution** — they reveal systematic gaps between what papers describe and what's needed to reproduce results.

### Hardware Platforms Used

| Platform | Qubits | Type | Provider |
|---|---|---|---|
| qxelarator | N/A | Local emulator | Quantum Inspire SDK |
| QI Tuna-9 | 9 | Superconducting transmon | QuTech / TU Delft |
| IBM Marrakesh | 156 | Superconducting Eagle r3 | IBM Quantum |
| IBM Torino | 133 | Superconducting Heron r2 | IBM Quantum |

### Key Results

#### 1. Paper Replications (3 papers attempted)

**Sagastizabal et al. 2019** — "Error Mitigation by Symmetry Verification on a VQE" (Phys. Rev. A 100, 010302)
- System: H2 ground state at R=0.735 Å, 2-qubit BK-reduced ansatz
- Emulator: -1.1385 Ha vs FCI -1.1373 Ha = **0.75 kcal/mol error (PASS — chemical accuracy)**
- IBM Marrakesh: -1.0956 Ha = **26.15 kcal/mol error (FAIL)**
- IBM Torino: -0.9436 Ha = **121.54 kcal/mol error (FAIL)**
- QI Tuna-9: -1.0045 Ha = **83.35 kcal/mol error (FAIL)**
- Symmetry verification improvement on IBM: 1.14x (published: 2.0x ± 1.0x)
- 7 claims tested, 3 passed on emulator, 0 passed on hardware

**Peruzzo et al. 2014** — "A variational eigenvalue solver on a photonic quantum processor" (Nature Communications 5, 4213)
- System: HeH+ potential energy curve, 11 bond distances (0.5–3.0 Å)
- Emulator ideal MAE: 0.00012 Ha (published: ≤0.001 Ha) — **PASS**
- Emulator noisy MAE: 0.18061 Ha — **FAIL** (simulated noise)
- Symmetry verification improvement: 2.85x (published: 1.5x) — **PASS**
- 3/3 claims replicated on emulator

**Cross et al. 2019** — "Validating quantum computers using randomized model circuits" (Phys. Rev. A 100, 032328)
- Quantum Volume: 2q PASS (77.21% heavy output > 66.67% threshold), 3q PASS (85.06%)
- Randomized benchmarking: 99.95% 1-qubit gate fidelity
- 3/3 claims replicated on emulator

#### 2. Cross-Platform Hardware Comparison

| Experiment | Emulator | IBM Marrakesh | IBM Torino | QI Tuna-9 |
|---|---|---|---|---|
| Bell fidelity | 100% | 99.05% | — | 87.28% |
| GHZ (3q) fidelity | 100% | 98.14% | — | 86.6% |
| VQE H2 energy (Ha) | -1.1385 | -1.0956 | -0.9436 | -1.0045 |
| VQE H2 error (kcal/mol) | 0.75 | 26.15 | 121.54 | 83.35 |
| Parity leakage (Bell) | 0% | 0.95% | — | 12.72% |
| Parity leakage (GHZ) | 0% | 1.86% | — | 13.4% |

#### 3. LLM Quantum Code Generation Benchmark

Using the Qiskit HumanEval benchmark (151 tasks, 3 difficulty levels):

| Model | Pass@1 | Notes |
|---|---|---|
| Claude Opus 4.6 (baseline) | 63.6% (96/151) | Zero-shot |
| Gemini 3 Flash (baseline) | 62.3% (94/151) | Zero-shot |
| Claude Opus 4.6 + Context7 RAG | 70.9% (107/151) | +14% relative |
| Gemini 3 Flash + Context7 RAG | 68-71% (103-107/151) | 2.7pp run-to-run variance at temp=0 |
| 3-run ensemble (union) | 79.5% (120/151) | Hard floor: 31 tasks unsolved by any run |

Failure taxonomy (34 core failures — both models fail with RAG): 41% logic errors, 26% API staleness, 3% type signature, 29% other.

**Key insights**: (1) RAG fixes API staleness but not reasoning errors. (2) Temperature=0 does not guarantee determinism — 16/151 tasks (10.6%) are flaky. (3) Union of 3 runs reaches 79.5%, but majority vote only 71.5% (high inter-run correlation).

#### 4. QRNG Certification

Tuna-9 superconducting qubits produce random numbers with 48.1% ones (biased). After von Neumann debiasing (75% bit discard), all 8 NIST SP 800-22 tests pass (p > 0.01 for all).

#### 5. Additional Experiments (emulator only)

- QAOA MaxCut on triangle graph: 87.4% approximation ratio
- Quantum Volume: QV=8 (2q and 3q pass)
- Randomized benchmarking: 99.95% gate fidelity

### Agent Infrastructure

The pipeline consists of:
1. **experiment_daemon.py** (1441 lines) — Queue-based pipeline that generates cQASM 3.0 circuits, submits to QI backends, polls for results, analyzes outcomes, stores results as JSON
2. **replication_agent.py** — Paper registry + automated replication execution
3. **replication_analyzer.py** — Compares measured results against published claims, classifies failure modes
4. **benchmark_harness.py** (536 lines) — Qiskit HumanEval runner for LLM code generation testing
5. **MCP servers** — Model Context Protocol servers giving Claude Code direct tool access to QI hardware and quantum random number generators

All code: https://github.com/JDerekLomas/quantuminspire

### Identified Failure Modes

From our replications, we observe these systematic failure modes:

1. **Noise-dominated collapse** — Hardware noise overwhelms the signal. VQE energies are 26-121 kcal/mol above FCI on real hardware. Bell/GHZ fidelities drop to 87% on Tuna-9.
2. **Basis measurement limitations** — IBM circuits were limited to Z-basis measurements, preventing recovery of X/Y correlation terms needed for full Hamiltonian expectation values.
3. **Calibration gap** — Published papers report results from specifically calibrated qubits. Our agent uses whatever qubits are assigned by the queue, with no qubit selection or recalibration.
4. **Implicit knowledge** — Papers describe circuits but omit transpilation strategies, qubit mapping, dynamical decoupling sequences, and measurement error mitigation details that are essential for hardware reproduction.
5. **API version mismatch** — LLMs trained on Qiskit 1.x generate code that fails on Qiskit 2.x (9/57 benchmark failures).

### Paper Structure Request

Please help me write the following sections:

1. **Abstract** (200 words)
2. **Introduction** — Frame the replication crisis in quantum computing. Cite recent work on AI for quantum (AlphaQubit [Nature 2024], k-agents [Patterns 2025], QUASAR [arXiv:2510.00967]). State our contribution.
3. **Related Work** — Paper replication efforts, AI for quantum computing, cross-platform benchmarking.
4. **Methods** — Agent architecture, hardware platforms, experiment selection criteria, replication protocol.
5. **Results** — Present all data tables above. Subsections for: (a) paper replications, (b) cross-platform comparison, (c) LLM code generation, (d) failure mode taxonomy.
6. **Discussion** — What the failure modes reveal about reproducibility in quantum computing. Why emulator success doesn't predict hardware success. The role of implicit knowledge. Implications for "self-driving quantum labs."
7. **Conclusion** — Summary, limitations (only 3 papers, limited qubit counts, no error mitigation beyond symmetry verification), future work (more papers, adaptive error mitigation, feedback loops).

### Style Notes

- Target audience: quantum computing researchers and AI-for-science community
- Tone: empirical, honest about limitations, not hype
- Use LaTeX formatting (equations, tables, figures)
- Chemical accuracy threshold = 1.6 kcal/mol (1 millihartree)
- Include proper citations in BibTeX format

### Key References

- Sagastizabal et al., Phys. Rev. A 100, 010302 (2019). arXiv:1902.11258
- Peruzzo et al., Nature Communications 5, 4213 (2014). arXiv:1304.3061
- Cross et al., Phys. Rev. A 100, 032328 (2019). arXiv:1811.12926
- Bausch et al. (AlphaQubit), Nature (2024). doi:10.1038/s41586-024-08148-8
- k-agents, Patterns / Cell Press (2025). arXiv:2412.07978
- QUASAR, arXiv:2510.00967 (2025)
- QCoder, arXiv:2510.26101 (2025)
- Qiskit HumanEval, arXiv:2406.02132 (2024)
- "AI tools expand scientists' impact but contract science's focus", Nature (2026). doi:10.1038/s41586-025-09922-y
