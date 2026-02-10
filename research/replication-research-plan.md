# Research Plan: AI-Driven Quantum Paper Replication

**Project**: Quantum Inspire — AI x Quantum (TU Delft / QuTech)
**Date**: February 2026
**Research question**: Can AI agents systematically replicate quantum computing experiments, and what do we learn from the gaps between published results and AI-reproduced results?

---

## 1. Thesis

The replication crisis is a known problem in science broadly, but quantum computing has a unique twist: **most published results cannot be independently verified** because they require specific hardware, custom calibration, and implicit knowledge not captured in papers. An AI agent that attempts to replicate published experiments from their descriptions will expose these gaps systematically — and the failure modes themselves become the research contribution.

**Core insight**: The interesting result is not "we replicated paper X" — it's **what went wrong when we tried**, and how the agent adapted.

---

## 2. What We Have

### Completed experiments (6)
| Experiment | Emulator | IBM | QI Tuna-9 |
|-----------|----------|-----|-----------|
| Bell state | 100% | 99.05% | result exists |
| GHZ (3q) | 100% | 98.14% | result exists |
| VQE H2 | -1.1385 Ha | -1.0956 Ha | result exists |

### Infrastructure
- **experiment_daemon.py** (1441 lines): Queue-based pipeline, cQASM generation, QI submission, analysis. Supports Bell, GHZ, VQE, RB, QAOA, QV.
- **replication_agent.py** (149 lines): Paper registry + subprocess runner. Only Sagastizabal 2019 implemented.
- **replicate_sagastizabal.py** (216 lines): PennyLane 4-qubit VQE with symmetry verification. Sweeps bond distances, compares ideal/noisy/post-selected.
- **benchmark_harness.py** (536 lines): LLM code generation benchmark (Qiskit HumanEval, 151 tasks).
- 3 hardware backends: IBM Quantum (ibm_torino), QI Tuna-9, QI emulator.

### Key gap
The system is **fire-and-forget**. Experiments are queued, executed, and logged, but results don't feed back into parameter selection. The replication agent runs a script and records exit code — it doesn't analyze *what* matched the paper and what didn't.

---

## 3. Paper Selection

### Selection criteria
1. **Published on real quantum hardware** (not just simulation)
2. **2-9 qubits** (within our hardware limits: Tuna-9, ibm_torino)
3. **Reproducible protocol** (circuit descriptions, parameter values, or open-source code)
4. **QuTech/TU Delft authorship preferred** (institutional alignment, potential author access)
5. **Diverse experiment types** (not just VQE — also characterization, error mitigation, algorithms)

### Tier 1: Immediate targets (can start now)

| # | Paper | Qubits | Type | Why |
|---|-------|--------|------|-----|
| 1 | **Sagastizabal 2019** — Symmetry verification VQE | 2 | VQE + error mitigation | Already implemented; extend to real hardware comparison |
| 2 | **Kandala 2017** — Hardware-efficient VQE (Nature) | 2-6 | VQE | Foundational VQE paper; H2, LiH, BeH2. Well-documented circuits |
| 3 | **Peruzzo 2014** — First VQE (Nature) | 2 | VQE | The original VQE paper; simple circuit, historical significance |
| 4 | **Cross 2019** — Quantum Volume (IBM) | 2-5 | Characterization | Already have QV circuits; compare our measurement vs published QV numbers |

### Tier 2: Next wave (after Tier 1 pipeline is validated)

| # | Paper | Qubits | Type | Why |
|---|-------|--------|------|-----|
| 5 | **Harrigan 2021** — QAOA on Google hardware (Nature Physics) | 3-23 | Optimization | Can replicate small instances on our hardware |
| 6 | **Kim 2023** — Evidence of utility (Nature, IBM) | up to 127 | Error mitigation | We can't match the qubit count but can replicate the error mitigation protocol on small instances |
| 7 | **Watson 2022** — 6-qubit silicon (Nature) | 6 | Spin qubits | QuTech paper; directly relevant to QI's spin qubit hardware |
| 8 | **Philips 2022** — Universal 4-qubit silicon (Nature) | 4 | Spin qubits | QuTech; tests our ability to replicate spin qubit results on transmon hardware |

### Tier 3: Stretch goals

| # | Paper | Qubits | Type | Why |
|---|-------|--------|------|-----|
| 9 | **Google Quantum AI 2023** — Phase transition measurement | 5-7 | Many-body physics | Tests whether AI can handle physics-heavy protocols |
| 10 | **Satzinger 2021** — Topological phase (Science) | up to 31 | Topological | Tests scaling; our subset would be partial replication |

---

## 4. The Replication Pipeline

### Current state (v0)
```
Paper → Human writes script → Script runs → Exit code logged
```

### Target state (v1)
```
Paper → Agent extracts protocol → Agent generates circuits →
  Agent runs on emulator → Agent compares to published →
    Agent identifies discrepancies → Agent proposes fixes →
      Agent runs on hardware → Agent writes report
```

### Concrete steps for v1

#### Phase A: Structured replication metadata (Week 1)
Extend `PAPER_REGISTRY` to capture:
- Published figures/tables to reproduce (with target values)
- Circuit descriptions (gate sequences, parameters)
- Hardware details (qubit count, connectivity, gate set, noise model)
- Error mitigation techniques used
- Claimed accuracy/fidelity numbers

#### Phase B: Automated comparison (Week 2)
Build an `analyze_replication()` function that:
1. Runs the replication script
2. Captures all numerical outputs (energies, fidelities, counts)
3. Compares each to the published value
4. Computes discrepancy metrics (absolute error, relative error, statistical significance)
5. Generates a structured JSON report + markdown summary

#### Phase C: Multi-backend execution (Week 3)
For each paper, run the replication on:
1. PennyLane/Qiskit ideal simulator (baseline)
2. QI emulator (qxelarator — noiseless but tests cQASM translation)
3. QI Tuna-9 (real hardware)
4. IBM Quantum (real hardware, different architecture)

The **cross-backend comparison** is the novel contribution: same circuit, different hardware, systematic gap analysis.

#### Phase D: Adaptive refinement (Week 4+)
When a replication fails:
1. Agent classifies the failure (noise, circuit translation, parameter mismatch, missing detail in paper)
2. Agent proposes and tests fixes (error mitigation, parameter optimization, circuit simplification)
3. Agent records what fixed it
4. This builds a **knowledge base of replication failure modes**

---

## 5. Research Questions

### Primary
**RQ1**: What fraction of published quantum experimental results can an AI agent reproduce within stated error bars, given the paper text + supplementary materials?

### Secondary
**RQ2**: What are the dominant failure modes when AI agents attempt quantum paper replication? (Hypothesis: API version drift, implicit calibration knowledge, hardware-specific parameters)

**RQ3**: How does replication fidelity vary across backends? (Emulator vs. IBM vs. QI — systematic cross-platform comparison)

**RQ4**: Can the gap between published results and AI-replicated results be closed by automated error mitigation, and which techniques are most effective?

**RQ5**: Does the replication process generate useful insights that the original paper missed? (E.g., sensitivity to parameters not reported, alternative circuits that work better)

---

## 6. Expected Contributions

1. **A replication benchmark**: The first systematic attempt to replicate N quantum computing papers using AI agents, with quantified success/failure metrics.

2. **A taxonomy of replication failures**: Categorized by root cause (hardware drift, implicit knowledge, API changes, insufficient detail, noise model mismatch).

3. **Cross-platform comparison data**: Same experiments on IBM, QI, and emulators — rare in the literature because most groups only have access to one platform.

4. **An open replication pipeline**: The enhanced `replication_agent.py` as open-source tooling for the community.

5. **A blog series**: Each replication attempt becomes a blog post on quantuminspire.vercel.app, with interactive visualizations of the results.

---

## 7. Implementation Plan

### Immediate next steps (this week)

1. **Extend Sagastizabal replication to real hardware**: Run `replicate_sagastizabal.py` results through the experiment daemon on Tuna-9 and IBM, comparing the 4-qubit PennyLane simulation to 2-qubit hardware runs.

2. **Add Kandala 2017 to the registry**: Implement the hardware-efficient VQE for H2 (simplest case: 2 qubits, single Ry-CNOT layer). This is almost identical to what we already have.

3. **Build the comparison framework**: `agents/replication_analyzer.py` — takes a replication result JSON and a published-values JSON, outputs a structured comparison report.

4. **Add a replication dashboard page**: `app/replications/page.tsx` — shows each paper, replication status, key metrics, and discrepancy analysis.

### This month

5. **Peruzzo 2014 replication** (original VQE paper)
6. **Quantum Volume comparison** (match our QV numbers against published IBM/QI values)
7. **First cross-backend analysis** (same VQE circuit on emulator + Tuna-9 + IBM)
8. **Write first blog post**: "Replicating the First VQE: What AI Gets Right and Wrong"

### Next month

9. **QAOA replication** (Harrigan 2021, small instances)
10. **Error mitigation comparison** (Kim 2023 ZNE protocol, simplified)
11. **Spin qubit translation** (Watson/Philips → what happens when you replicate spin qubit experiments on transmon hardware?)
12. **Publish replication benchmark** (N papers attempted, M succeeded, systematic failure analysis)

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| Papers attempted | 6+ by end of March |
| Papers with emulator match (< 5% error) | 4+ |
| Papers with hardware match (within stated error bars) | 2+ |
| Failure modes identified and categorized | 10+ distinct modes |
| Cross-backend comparisons | 3+ experiments on 3+ backends |
| Blog posts published | 3+ |

---

## 9. Relationship to Prior Work

**What exists**: k-agents autonomously calibrate hardware. QCopilot runs sensor experiments. QUASAR generates circuits. Our benchmark_harness tests code generation.

**What's novel**: Nobody has built a system that reads a quantum paper, extracts the experimental protocol, attempts to reproduce it on multiple backends, and systematically analyzes the discrepancies. This is the "replication" angle — and it sits squarely in the gap identified by our literature survey (Section 6.1: "the experiment design gap").

The closest work is Agent-Q (generates circuits for specified problems) and QAgent (autonomous QASM programming), but neither attempts to reproduce published experimental results and compare them.

---

## 10. Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Hardware access limits (IBM 10 min/month, QI quotas) | Prioritize emulator runs; use hardware sparingly for validation |
| Papers don't report enough detail to replicate | This *is* the finding — document what's missing |
| Results too boring (emulator always works, hardware always fails) | Focus on the *interesting* middle: partial success, fixable failures |
| Scope creep into general autonomous experimentation | Stay focused on replication; save hypothesis generation for future work |
| Our hardware is too noisy to match published results | Compare noise levels; use error mitigation; document the gap quantitatively |
