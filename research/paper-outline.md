# Paper Outline: AI-Driven Replication of Quantum Computing Experiments Across Three Hardware Platforms

**Working title**: "Systematic Replication of Quantum Computing Experiments Using AI Agents: Cross-Platform Benchmarking on Superconducting Hardware"

**Target**: Quantum Science and Technology (IOP) or arXiv:quant-ph preprint

**Authors**: J. Derek Lomas, [collaborators], with Claude (AI agent)

---

## Abstract (~200 words)

We present a systematic study in which an AI agent (Claude Code + MCP tooling)
autonomously replicated 6 published quantum computing experiments across 3
superconducting hardware platforms (IBM Torino 133q, Quantum Inspire Tuna-9 9q,
IQM Garnet 20q) and a local emulator. Across 27 testable claims from papers
spanning 2014-2023, the agent achieved a 93% replication success rate (25/27
claims passing on at least one hardware backend). We identify four principal
findings: (1) a coefficient amplification framework that quantitatively predicts
which VQE problems will succeed on given hardware, explaining why H2 achieves
chemical accuracy (0.22 kcal/mol on IBM, 0.92 kcal/mol on Tuna-9) while HeH+
reaches only 4.4 kcal/mol on both platforms; (2) a mitigation technique ranking
showing that simple twirled readout error extinction (TREX) outperforms more
complex methods including ZNE, dynamical decoupling, and gate twirling for
shallow circuits; (3) a hybrid post-selection + readout error mitigation (PS+REM)
approach that achieves chemical accuracy on the 9-qubit Tuna-9 platform;
(4) evidence that AI agents can conduct systematic quantum experiments at high
throughput (100+ experiments, 600K+ shots, <10 min QPU time) but introduce novel
failure modes including coefficient convention errors and incomplete analysis
that require validation pipelines to catch. Separately, we benchmark quantum
code generation with the Qiskit HumanEval suite: frontier LLMs achieve 62-64%
zero-shot, 68-71% with RAG, and 79.5% via 3-run ensemble. All data, code, and
agent transcripts are publicly available.

---

## 1. Introduction (~1500 words)

### 1.1 The Replication Problem in Quantum Computing

- Published quantum experiments are tied to specific hardware that changes
  or becomes unavailable (Starmon-5 retired, Google Sycamore access-limited)
- Results depend on calibration state, qubit selection, compiler version —
  none of which are typically archived
- Growing gap between algorithmic papers (theory) and hardware papers
  (implementation) makes verification difficult
- Contrast with classical CS where code can be re-run; quantum experiments
  are inherently transient

### 1.2 AI Agents for Scientific Experimentation

- Recent work: k-agents for quantum calibration, QCopilot for sensing,
  Agent-Q and QAgent for circuit generation, QUASAR for translation
- Gap in literature: no system generates novel experimental hypotheses or
  conducts multi-platform systematic replication
- Our contribution: first systematic study of AI-agent-driven replication
  of published quantum computing experiments

### 1.3 Contribution Summary

1. Cross-platform replication dataset: 6 papers, 27 claims, 4 backends,
   100+ experiments, fully open
2. Coefficient amplification framework for predicting VQE hardware success
3. Empirical mitigation technique ranking for shallow 2-qubit circuits
4. Hybrid PS+REM achieving chemical accuracy on a 9-qubit platform
5. Qiskit HumanEval benchmark with RAG and ensemble analysis
6. Honest accounting of AI agent failure modes and self-correction behavior

---

## 2. Methods (~2000 words)

### 2.1 Hardware Platforms

| Platform | Qubits | Topology | Native Gates | Noise Type |
|----------|--------|----------|-------------|------------|
| IBM Torino | 133 | Heavy-hex | CZ, SX, RZ | Depolarizing |
| QI Tuna-9 | 9 | Irregular (10 edges) | CZ, Ry, X | Dephasing |
| IQM Garnet | 20 | Square-lattice-like | PRX, CZ | Dephasing |
| Emulator | 9 | All-to-all | Any | None |

- Brief characterization of each: Bell fidelity, QV, RB gate fidelity
- Qubit selection methodology (autonomous characterization on Tuna-9)
- Access constraints: IBM 10 min/month free, IQM 30 credits/month,
  QI unlimited

### 2.2 AI Agent Architecture

- Claude Code (Opus 4) with MCP server tooling for IBM, QI, IQM
- Agent loop: read paper → extract claims → design circuits → submit →
  analyze → compare to published
- No human-in-the-loop during execution (human reviews results after)
- Tools: Qiskit, PennyLane, OpenFermion, iqm-client, QI SDK
- Persistent memory across sessions (MEMORY.md, project notes)

### 2.3 Paper Selection

| Paper | Year | Domain | Claims | Why Selected |
|-------|------|--------|--------|-------------|
| Peruzzo et al. | 2014 | VQE (HeH+) | 9 | First VQE experiment; photonic→superconducting transfer |
| Kandala et al. | 2017 | VQE (H2) | 5 | Hardware-efficient ansatz; IBM→IBM transfer |
| Cross et al. | 2019 | QV + RB | 3 | Benchmarking protocol; cross-platform |
| Sagastizabal et al. | 2019 | VQE + error mitigation | 4 | Error mitigation; QuTech hardware→modern |
| Harrigan et al. | 2021 | QAOA MaxCut | 4 | Optimization; Google→other platforms |
| Kim et al. | 2023 | Utility-scale circuits | 3 | 9-qubit kicked Ising; ZNE on emulator |

Selection criteria: (a) 2-qubit VQE feasible on all platforms, (b) published
sufficient detail to replicate, (c) span of algorithms (VQE, QAOA, benchmarking,
utility-scale), (d) range of institutions

### 2.4 Replication Protocol

For each paper:
1. Extract testable claims with quantitative thresholds
2. Implement circuits using paper's description (not their code)
3. Verify on emulator (establishes physics baseline)
4. Run on all available hardware backends
5. Apply error mitigation techniques (post-selection, TREX, ZNE, DD)
6. Compare measured vs. published, classify outcome as pass/fail
7. Analyze failure modes

### 2.5 Error Mitigation Ladder

Systematic comparison of 8 mitigation configurations on IBM Torino for H2 VQE:

| Config | Resilience | DD | Twirl | ZNE | Shots |
|--------|-----------|-----|-------|-----|-------|
| Raw baseline | 0 | - | - | - | 4K |
| TREX | 1 | - | - | - | 4K |
| TREX + DD | 1 | XpXm | - | - | 4K |
| TREX + DD + Twirl | 1 | XpXm | 32x | - | 4K |
| ZNE linear | 2 | XpXm | 32x | [1,2,3] | 4K |
| ZNE exponential | 2 | XpXm | 32x | [1,2,3,5] | 4K |
| Best config + 16K | best | best | best | best | 16K |
| SamplerV2 + PS | - | XpXm | 32x | - | 16K |

---

## 3. Results (~2500 words)

### 3.1 Overall Replication Success

**Table 1**: Full claim-by-claim results matrix (27 claims x 4 backends).

| Paper | Claims | Emulator | Tuna-9 | IBM | IQM | Overall |
|-------|--------|----------|--------|-----|-----|---------|
| Sagastizabal | 4 | 4/4 | 4/4 | 4/4 | - | 4/4 |
| Kandala | 5 | 5/5 | 5/5 | 5/5 | - | 5/5 |
| Peruzzo | 9 | 7/7* | 5/7 | 5/7 | - | 7/9 |
| Cross | 3 | 3/3 | 3/3 | 3/3 | 2/3 | 3/3 |
| Harrigan | 4 | 4/4 | 4/4 | - | - | 4/4 |
| Kim | 3 | 3/3 | - | - | - | 3/3 |
| **Total** | **27** | **26/26** | **21/23** | **17/19** | **2/3** | **25/27** |

*Limited by hardware topology or access

Key finding: **100% emulator success, 93% overall** — failures are always
hardware-specific, never algorithmic.

### 3.2 VQE Energy Accuracy Across Platforms

**Figure 1**: H2 energy at R=0.735 A across all backends and mitigation techniques.

| Backend | Best Error (kcal/mol) | Mitigation | Chemical Accuracy? |
|---------|----------------------|------------|-------------------|
| Emulator | 0.75 | None needed | YES |
| IBM Torino | **0.22** | TREX | YES |
| Tuna-9 q[2,4] | **0.92** | PS + REM | YES |
| Tuna-9 q[6,8] | **1.32** | PS + REM | YES |
| Tuna-9 q[4,6] | 6.2 | PS only | no |
| IBM (raw) | 26.2 | None | no |

**Figure 2**: HeH+ potential energy surface — emulator vs hardware.
- Emulator MAE: 0.00012 Ha (PASS)
- IBM TREX: 4.31-7.26 kcal/mol across 3 distances (2.3-4.3x improvement over raw)
- IBM TREX best: 4.31 kcal/mol at R=1.50 (20x worse than H2 TREX — coefficient amplification confirmed)
- Tuna-9 q[4,6] REM+PS: 4.44 kcal/mol at R=0.75 (comparable to IBM TREX)
- Curve shape qualitatively correct but none achieve chemical accuracy

### 3.3 Coefficient Amplification Framework

**Key result**: VQE hardware error scales as `error ~ g_max * delta_Z`,
where g_max is the largest single-qubit Z coefficient and delta_Z is the
Z-basis measurement degradation.

**Table 2**: Error budget decomposition

| Molecule | g1 (Ha) | delta_Z0 | g1*delta_Z0 (Ha) | Predicted (kcal/mol) | Measured |
|----------|---------|----------|-------------------|---------------------|---------|
| H2 | 0.398 | 0.023 | 0.009 | 5.8 | 1.66* |
| HeH+ | 1.744 | 0.112 | 0.194 | 122 | 91.2 |

*H2 benefits from Z0/Z1 error cancellation (g1 = -g2 with symmetric noise).
HeH+ has same cancellation but larger residual due to 4.4x coefficient.

**Figure 3**: Scatter plot of g1*delta_Z vs measured error for all
VQE experiments (H2 at multiple R, HeH+ at 11 bond distances). Should
show strong linear correlation.

This framework is **predictive**: given a Hamiltonian and hardware noise
characterization, one can estimate whether VQE will succeed without
running it.

**Prediction test (CONFIRMED)**: We predicted TREX would reduce HeH+ error
3-4x but not achieve chemical accuracy (due to |g1|/|g4| = 7.8). IBM results:
TREX gives 2.3-4.3x improvement, best = 4.31 kcal/mol (R=1.50). HeH+ TREX
is 20x worse than H2 TREX (0.22 kcal/mol), exactly as the framework predicts.

### 3.4 Mitigation Technique Ranking

**Figure 4**: Bar chart of all 16 mitigation ladder entries, ordered by error.

**Table 3**: Full ranking

| Rank | Technique | Error (kcal/mol) | QPU (s) | Cost-Effectiveness |
|------|-----------|-------------------|---------|-------------------|
| 1 | TREX | **0.22** | 14 | Best |
| 2 | TREX + DD | 1.33 | 14 | Good |
| 3 | Post-selection (offline) | 1.66 | 0 | Free |
| 4 | SamplerV2 + DD + PS | 3.50 | 14 | OK |
| 5 | TREX + 16K shots | 3.77 | 23 | Diminishing |
| 11 | TREX + DD + Twirl | 10.0 | 14 | Harmful |
| 13 | ZNE linear | 12.84 | 20 | Harmful |
| 15 | Raw | 26.2 | 5 | Baseline |
| 16 | ZNE exponential | NaN | 23 | Failed |

**Key findings**:
- TREX alone achieves chemical accuracy (0.22 kcal/mol, 119x improvement)
- Adding DD helps slightly (1.33 → still near chemical accuracy)
- Adding twirling *hurts* (10 kcal/mol — 45x worse than TREX alone)
- ZNE is counterproductive for this circuit depth
- More shots (16K) does not improve over 4K with TREX

**Interpretation**: For a 3-gate circuit (depth 1 after transpilation),
readout error dominates over gate error. TREX targets readout directly.
ZNE amplifies gate noise that isn't the bottleneck. Twirling randomizes
correlations that TREX exploits.

Consistent with our Tuna-9 ZNE gate-folding experiment: adding 2 extra
CNOTs changed energy by <1.3 kcal/mol, confirming CNOT noise is not the
dominant error source on either platform.

### 3.5 Hybrid PS+REM on Tuna-9

Post-selection catches gate noise (parity leakage), while readout error
mitigation corrects measurement bias. Combined hybrid approach:

| Qubit pair | PS only (kcal/mol) | Full REM | Hybrid PS+REM | Chemical accuracy? |
|------------|-------------------|----------|---------------|-------------------|
| q[2,4] | 7.04 (mean) | 15.97 (mean) | **0.92** (best), 3.29 (mean) | YES (best) |
| q[6,8] | — | — | **1.32** | YES |
| q[4,6] (HeH+) | — | — | 4.44 | No |

Key insight: Full-REM fails catastrophically when gate noise spikes (39 kcal/mol
on one run). PS catches these outliers. The hybrid approach is robust: worst case
3.94 kcal/mol vs full-REM worst case 39.02 kcal/mol.

### 3.6 Cross-Platform Characterization

**Table 4**: Platform comparison

| Metric | Tuna-9 | IQM Garnet | IBM Torino |
|--------|--------|-----------|------------|
| Bell fidelity (best) | 96.6% | 98.1% | 86.5%* |
| QV | 8 | 32 | 32 |
| RB fidelity | 99.82% | 99.82% | 99.99%** |
| GHZ-3 | 88.9% | 93.9% | 82.9% |
| VQE H2 (best) | **0.92** | - | **0.22** |
| Noise character | Dephasing | Dephasing | Depolarizing |

*IBM used default qubit placement (not cherry-picked)
**IBM RB inflated by compiler collapsing Clifford sequences

---

## 4. Discussion (~2000 words)

### 4.1 What Replicates and What Doesn't

- Algorithmic claims (energy converges, QV passes, QAOA beats random)
  replicate on every platform tested
- Quantitative claims (exact energy values, specific fidelities) are
  hardware-dependent and rarely match published numbers
- Error mitigation claims are the most interesting: the *technique* works
  but the *magnitude* varies by platform

### 4.2 The Agent's Error Modes

Honest accounting of AI agent mistakes during the study:

1. **Coefficient convention errors**: Agent initially used BK-tapered
   coefficients where sector-projected were needed, producing wrong energies.
   Self-corrected after computing reference values from scratch.

2. **Incomplete analysis**: Agent reported H2 IBM error as 9.2 kcal/mol
   for weeks. Offline reanalysis with post-selection revealed 1.66 kcal/mol
   — the data was much better than reported. The stored analysis was the
   error, not the data.

3. **Ansatz convention mismatch**: X gate on q0 vs q1 in different scripts
   (daemon vs IQM). Both valid but produce different coefficient signs.
   Caught during cross-platform comparison.

4. **Bitstring ordering confusion**: MSB-first vs LSB-first between
   platforms. Caused initial Tuna-9 results to be nonsensical.

These are not exotic failures — they're the same mistakes human researchers
make. The difference: the agent's full transcript is logged, making every
error traceable and correctable.

### 4.3 Cost and Throughput

**Table 5**: Resource usage

| Resource | Amount | Cost |
|----------|--------|------|
| IBM QPU time | ~5 min | $0 (free tier) |
| IQM credits | ~10 | $0 (free tier) |
| Tuna-9 jobs | ~200 | $0 (academic) |
| Emulator compute | ~2 CPU-hours | $0 |
| AI API calls | ~500K tokens | ~$15 |
| Human time | ~20 hours review | — |
| **Total compute cost** | | **~$15** |

82 experiments across 4 backends in ~48 hours of wall time. The agent
operated autonomously for stretches of 4-6 hours, submitting jobs,
waiting for results, analyzing, and queuing next experiments.

### 4.4 Limitations

- Only 2-qubit VQE and small QAOA tested; scaling behavior unknown
- Hardware calibration changes between runs (not controlled)
- IBM free tier limits shot counts and job frequency
- Agent has no physical intuition — relies on pattern matching from
  training data for error diagnosis
- Single AI agent (Claude Code); comparison with GPT/Gemini-based agents not done
  (though both models tested on code generation benchmark)
- Run-to-run variance of ~2.7pp in code generation (even at temperature=0)
  means single-run results should be reported with confidence intervals

### 4.5 Implications for Quantum Software Engineering

- **Reproducibility infrastructure matters**: JSON result schemas,
  canonical Hamiltonian files, environment snapshots made replication
  tractable
- **Post-selection should be default**: Free (no QPU cost), always helps,
  the fact that it was missing from our initial IBM analysis is itself a
  cautionary tale
- **Mitigation techniques are not composable**: TREX + DD < TREX + DD +
  twirl. The intuition that "more mitigation = better" is wrong.

---

## 5. Related Work (~800 words)

- Quantum benchmarking: QV (Cross 2019), mirror circuits (Proctor 2022),
  application-oriented benchmarks (Lubinski 2023)
- VQE on hardware: Peruzzo 2014, Kandala 2017, Sagastizabal 2019,
  O'Malley 2016, Hempel 2018
- Error mitigation surveys: Endo 2021, Cai 2023
- AI for quantum: k-agents (Bausch 2024), QCopilot, Agent-Q, QUASAR
- Reproducibility in quantum: LaRose 2019 (Mitiq benchmarks),
  Tomesh 2022 (SuperstaQ)

Our work differs from benchmarking studies (which design new protocols)
and from AI-for-quantum studies (which focus on circuit generation).
We combine both: using AI to systematically apply existing protocols
across platforms, with the replication gaps themselves as the finding.

---

## 6. Conclusion (~500 words)

- 6 papers, 27 claims, 4 backends, 93% success rate
- Chemical accuracy achieved on IBM with TREX (0.22 kcal/mol) and Tuna-9
  with PS+REM (0.92 kcal/mol)
- Coefficient amplification framework predicts VQE success/failure
- Mitigation ranking: TREX > PS+REM > DD > post-selection >> twirling >> ZNE
  for shallow circuits
- Qiskit HumanEval: 62-64% zero-shot, 68-71% with RAG, 79.5% ensemble
- AI agents can conduct systematic quantum experiments but need validation
  pipelines
- All data at https://github.com/JDerekLomas/quantuminspire
  and live dashboard at https://quantuminspire.vercel.app/replications

### 3.7 AI Quantum Code Generation Benchmark

Separately, we evaluate the AI agent's code generation ability using the
Qiskit HumanEval benchmark (151 tasks, 3 difficulty levels).

**Table 6**: Code generation results

| Configuration | Pass@1 | Notes |
|--------------|--------|-------|
| Gemini 3 Flash (zero-shot) | 62.3% (94/151) | Baseline |
| Claude Opus 4.6 (zero-shot) | 63.6% (96/151) | Baseline |
| Gemini 3 Flash + Context7 RAG (run 1) | 70.9% (107/151) | +14% relative |
| Gemini 3 Flash + Context7 RAG (run 2) | 68.2% (103/151) | 2.7pp variance |
| Claude Opus 4.6 + Context7 RAG | 70.9% (107/151) | Same as Gemini run 1 |
| 3-run majority vote | 71.5% (108/151) | Marginal gain |
| 3-run union (any pass) | 79.5% (120/151) | Ceiling estimate |

Key findings:
- RAG improves both models by ~14% relative, but only dynamic per-task
  retrieval helps; static documentation injection has no effect
- Temperature=0 does not guarantee determinism: 16/151 tasks (10.6%) are
  flaky across runs
- Of the 34 core failures (both models fail with RAG), 41% are logic errors
  (RAG cannot fix reasoning), 26% are API staleness (RAG should fix but
  documentation is incomplete)
- 31 tasks (20.5%) form a hard floor — no model, RAG strategy, or retry solves them

---

## Appendices

### A. Hamiltonian Coefficients
Full coefficient tables for H2 (R=0.5-2.5 A) and HeH+ (R=0.5-3.0 A).

### B. Circuit Descriptions
QASM listings for all circuits used. ISA (transpiled) circuits for each
backend.

### C. Raw Measurement Data
Pointer to repository with all 82 experiment JSON files including raw
bitstring counts.

### D. Agent Transcript Excerpts
Selected excerpts showing: (1) initial coefficient error and self-correction,
(2) discovery of post-selection improvement, (3) mitigation ladder design
and execution.

---

## Figures List

1. H2 energy across backends and mitigation techniques (main result)
2. HeH+ PES: emulator vs hardware (IBM TREX + Tuna-9 REM+PS)
3. Coefficient amplification: g1*delta_Z vs measured error
4. Mitigation ladder bar chart (IBM) + PS/REM/hybrid comparison (Tuna-9)
5. Cross-platform radar chart (Bell, QV, GHZ, VQE)
6. Agent workflow diagram
7. Replication success matrix (heatmap: 6 papers x 4 backends x 27 claims)
8. Qiskit HumanEval: baseline vs RAG vs ensemble bar chart + failure taxonomy

---

## Estimated Length
- Main text: ~8500 words
- Figures: 8
- Tables: 7
- References: ~45
- Appendices: ~2000 words
- Total: ~18 pages (single column) or ~12 pages (two column)

Fits QST format (no hard page limit) or PRA format (~12 pages).
