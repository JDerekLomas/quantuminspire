# QuantumAgentBench: Benchmarking AI Agents for Quantum Computing Research

## The Problem

Frontier AI models are already transforming software engineering. But quantum computing — where researchers juggle unfamiliar math, brittle hardware, rapidly-changing SDKs, and cross-framework workflows — may be where AI assistants deliver the most leverage.

Existing benchmarks miss this entirely:

| Benchmark | What it measures | What it misses |
|-----------|-----------------|----------------|
| **Qiskit HumanEval** (IBM, 2024) | Qiskit code completion (151 tasks) | Debugging, reasoning, other frameworks |
| **QuanBench** (2025) | Multi-framework code generation | No iteration, no hardware awareness |
| **QCircuitBench** (2025) | Circuit generation from NL descriptions | No scientific reasoning |
| **QHackBench** (2025) | CTF-style quantum puzzles | Narrow scope, puzzle-oriented |

None of them test what a quantum computing researcher actually needs: an AI that can debug a VQE that won't converge, migrate legacy code to Qiskit 2.x, design circuits for real hardware topologies, reason about quantum mechanics (not just syntax), and work across the fragmented SDK ecosystem.

**QuantumAgentBench** evaluates AI coding assistants on the tasks that matter — grounded in real research workflows at Google, IBM, QuTech, and across the quantum ecosystem.

## Why Now: AI Is Already Changing Quantum

Recent results show AI is not hypothetically useful for quantum — it's already being deployed:

- **AlphaQubit** (Google DeepMind, 2024): Neural QEC decoder achieves lower logical error rates than previous SOTA on Google's Sycamore, but doesn't scale past distance-5 due to training data explosion
- **AlphaTensor-Quantum** (Google DeepMind, 2024): Discovers novel circuit decompositions with 37-47% fewer T-gates than human-designed circuits
- **IBM AI Transpiler** (2024-25): AI-driven circuit optimization achieves ~50% gate count reduction over heuristic methods on heavy-hex topologies
- **GPT-QE** (2025): LLM-guided quantum chemistry pipeline automates molecule-to-circuit workflows
- **k-agents** (Argonne National Lab, 2025): Autonomous AI agents run real quantum experiments for hours without human intervention
- **Quantum Inspire** (QuTech/TU Delft): The only publicly accessible spin qubit processor — a unique testbed for hardware-aware AI

The question is no longer "can AI help quantum?" but "how much, and where are the gaps?" This benchmark provides a quantitative answer.

## Benchmark Design

### Design Principles

1. **Research-grounded**: Every task maps to a real workflow at a quantum lab
2. **Multi-framework**: Qiskit (IBM), PennyLane (Xanadu), Cirq (Google), OpenQASM, QI SDK (QuTech)
3. **Agentic**: Most tasks require iteration — run, observe, debug, fix, verify
4. **Hardware-aware**: Tasks reference real device topologies (IBM Eagle/Heron, Google Sycamore, QI Spin-2)
5. **Scientifically rigorous**: Correct answers require understanding physics, not just generating syntactically valid code

### Track 1: Quantum Error Correction (15 tasks)

*The central challenge of building a fault-tolerant quantum computer. Google, IBM, and QuTech are all racing toward logical qubits.*

| ID | Task | Platforms | Difficulty |
|----|------|-----------|------------|
| QEC-01 | Implement 3-qubit bit-flip repetition code | Qiskit | Basic |
| QEC-02 | Implement 3-qubit phase-flip code | Qiskit | Basic |
| QEC-03 | Build distance-3 surface code syndrome extraction circuit | Qiskit | Intermediate |
| QEC-04 | Implement Steane [[7,1,3]] code encoder/decoder | Qiskit | Intermediate |
| QEC-05 | Decode surface code syndromes with MWPM (PyMatching) | Qiskit + PyMatching | Intermediate |
| QEC-06 | Estimate logical error rate vs physical error rate for repetition code | Qiskit | Intermediate |
| QEC-07 | Simulate the QEC threshold for surface code under depolarizing noise | Qiskit | Advanced |
| QEC-08 | Implement a lookup-table decoder for distance-3 surface code | Qiskit | Advanced |
| QEC-09 | Debug: surface code has wrong stabilizer generators (sign errors) | Qiskit | Intermediate |
| QEC-10 | Debug: syndrome extraction circuit has hook errors from CNOT ordering | Qiskit | Advanced |
| QEC-11 | "Why does my logical error rate plateau instead of decreasing with distance?" | Analysis | Advanced |
| QEC-12 | Compare MWPM vs. Union-Find decoder performance on biased noise | Qiskit + PyMatching | Advanced |
| QEC-13 | Design a QEC experiment for a heavy-hex topology (IBM Eagle constraints) | Qiskit | Advanced |
| QEC-14 | Implement color code on a hexagonal lattice | Qiskit | Advanced |
| QEC-15 | "Can a neural decoder outperform MWPM at distance-5? Estimate the training data required." | Analysis | Advanced |

### Track 2: Quantum Chemistry (15 tasks)

*The "killer app" of near-term quantum computing. The pipeline from molecule to energy is where most researchers struggle — and where AI can accelerate every step.*

| ID | Task | Platforms | Difficulty |
|----|------|-----------|------------|
| CHEM-01 | Compute H2 ground state energy with VQE using hardware-efficient ansatz | PennyLane | Intermediate |
| CHEM-02 | Build H2 Hamiltonian from molecular geometry using PySCF + OpenFermion | OpenFermion + PySCF | Intermediate |
| CHEM-03 | Compare Jordan-Wigner vs. Bravyi-Kitaev mappings for H2 | OpenFermion | Intermediate |
| CHEM-04 | Implement UCCSD ansatz for H2 | PennyLane | Advanced |
| CHEM-05 | Compute H2 dissociation curve (energy vs. bond length) | PennyLane | Intermediate |
| CHEM-06 | Design a VQE for LiH molecule (10 qubits before tapering) | PennyLane + OpenFermion | Advanced |
| CHEM-07 | Apply qubit tapering to reduce LiH qubit count | OpenFermion | Advanced |
| CHEM-08 | Debug: VQE converges to -0.5 Ha instead of -1.14 Ha for H2 | PennyLane | Intermediate |
| CHEM-09 | Debug: `numpy.array` instead of `pnp.array(requires_grad=True)` causes silent optimizer failure | PennyLane | Intermediate |
| CHEM-10 | Debug: ansatz lacks entangling gates, VQE trapped in local minimum | PennyLane | Intermediate |
| CHEM-11 | "Which ansatz gives chemical accuracy for H2 with fewest parameters?" | Analysis + Code | Advanced |
| CHEM-12 | Implement error mitigation (ZNE) for noisy VQE on H2 | Qiskit | Advanced |
| CHEM-13 | Trotterized time evolution of H2 Hamiltonian | Qiskit | Intermediate |
| CHEM-14 | Full pipeline: molecular geometry -> Hamiltonian -> qubit mapping -> VQE -> energy | Multi-framework | Advanced |
| CHEM-15 | "At what system size does quantum VQE outperform classical CCSD(T)? Estimate the crossover." | Analysis | Advanced |

### Track 3: Circuit Optimization and Compilation (15 tasks)

*Every quantum algorithm must be compiled to hardware-native gates. IBM's AI transpiler and Google's AlphaTensor-Quantum show AI can dramatically reduce circuit depth — but current LLMs struggle with this.*

| ID | Task | Platforms | Difficulty |
|----|------|-----------|------------|
| OPT-01 | Transpile a 5-qubit QFT to IBM heavy-hex basis gates | Qiskit | Basic |
| OPT-02 | Decompose a Toffoli gate into CNOT + single-qubit gates | Qiskit | Basic |
| OPT-03 | Optimize a circuit using Qiskit's preset pass manager (compare levels 0-3) | Qiskit | Basic |
| OPT-04 | Route a 10-qubit circuit onto IBM Eagle's 127-qubit topology | Qiskit | Intermediate |
| OPT-05 | Manually optimize a parameterized circuit by canceling adjacent inverse gates | Qiskit | Intermediate |
| OPT-06 | Transpile a circuit for Google Sycamore's grid topology | Cirq | Intermediate |
| OPT-07 | Convert a Qiskit circuit to Cirq, preserving gate count | Qiskit -> Cirq | Intermediate |
| OPT-08 | Write an OpenQASM 3.0 representation of a 3-qubit Toffoli decomposition | OpenQASM | Intermediate |
| OPT-09 | Debug: circuit uses gates not in backend's basis gate set | Qiskit | Intermediate |
| OPT-10 | Debug: SWAP routing introduces more CNOTs than necessary | Qiskit | Advanced |
| OPT-11 | Profile circuit depth vs. fidelity tradeoff for a VQE ansatz on noisy simulator | Qiskit | Advanced |
| OPT-12 | Implement KAK decomposition for arbitrary 2-qubit unitary | Qiskit | Advanced |
| OPT-13 | "Given this circuit, find an equivalent with 30% fewer CNOTs" | Qiskit | Advanced |
| OPT-14 | Design a topology-aware ansatz for IBM Heron (heavy-hex, 156 qubits) | Qiskit | Advanced |
| OPT-15 | "What is the theoretical minimum CNOT count for this unitary? How close is the transpiler?" | Analysis | Advanced |

### Track 4: NISQ Algorithms and Applications (15 tasks)

*Variational algorithms (VQE, QAOA, QML) are the workhorses of near-term quantum computing. Debugging them requires understanding both quantum mechanics and numerical optimization.*

| ID | Task | Platforms | Difficulty |
|----|------|-----------|------------|
| NISQ-01 | Implement QAOA for MaxCut on a 4-node graph | Qiskit | Intermediate |
| NISQ-02 | Implement a variational quantum classifier (iris dataset) | PennyLane | Intermediate |
| NISQ-03 | Build a parameterized quantum kernel and compare to classical SVM | PennyLane + sklearn | Intermediate |
| NISQ-04 | Implement quantum approximate counting using QPE | Qiskit | Advanced |
| NISQ-05 | Implement quantum random number generator with Bell-test certification | Qiskit | Advanced |
| NISQ-06 | Debug: QAOA optimizer stuck (learning rate too high, energy oscillates) | Qiskit | Intermediate |
| NISQ-07 | Debug: VQE Hamiltonian has wrong Pauli coefficients | Qiskit | Advanced |
| NISQ-08 | Debug: QML model not learning (barren plateau in deep circuit) | PennyLane | Advanced |
| NISQ-09 | Debug: measurement results look random (endianness confusion) | Qiskit | Basic |
| NISQ-10 | "Diagnose this barren plateau: compute gradient variance vs. circuit depth" | PennyLane | Advanced |
| NISQ-11 | "How many shots do I need for 99% confidence in this expectation value?" | Analysis + Code | Basic |
| NISQ-12 | "Will QAOA with p=3 outperform brute force for this 12-node MaxCut?" | Analysis + Code | Advanced |
| NISQ-13 | Implement quantum state tomography for 2 qubits | Qiskit | Intermediate |
| NISQ-14 | Build a noise-aware VQE that simulates T1/T2 decoherence | Qiskit | Advanced |
| NISQ-15 | "My quantum kernel performs worse than classical. Why, and can it be fixed?" | Analysis + Code | Intermediate |

### Track 5: Cross-Platform and SDK Fluency (20 tasks)

*Quantum computing is fragmented across SDKs. A useful AI assistant must be fluent in the ecosystem — translating between frameworks, adapting to API changes, and integrating with real hardware platforms.*

| ID | Task | Platforms | Difficulty |
|----|------|-----------|------------|
| SDK-01 | Translate Bell state circuit from Qiskit to PennyLane | Qiskit -> PennyLane | Basic |
| SDK-02 | Translate Bell state circuit from Qiskit to Cirq | Qiskit -> Cirq | Basic |
| SDK-03 | Convert Qiskit circuit to OpenQASM 3.0 and back | Qiskit <-> OpenQASM | Basic |
| SDK-04 | Translate a VQE from PennyLane to Qiskit primitives (SamplerV2/EstimatorV2) | PennyLane -> Qiskit | Intermediate |
| SDK-05 | Import OpenQASM 2.0 circuit into PennyLane | OpenQASM -> PennyLane | Intermediate |
| SDK-06 | Migrate Qiskit 0.x code (using `execute()`, `Aer`) to Qiskit 2.x | Qiskit migration | Intermediate |
| SDK-07 | Migrate `qiskit.providers.aer` imports to `qiskit_aer` | Qiskit migration | Basic |
| SDK-08 | Fix `SamplerV2.__init__()` keyword argument error | Qiskit 2.x | Basic |
| SDK-09 | Run a circuit on Quantum Inspire simulator via QI SDK | Qiskit + QI SDK | Intermediate |
| SDK-10 | Set up a Quantum Inspire hybrid quantum-classical job | QI SDK | Advanced |
| SDK-11 | Build pipeline: PennyLane VQE -> Qiskit transpilation -> backend execution | Multi-framework | Advanced |
| SDK-12 | Generate equivalent circuits in Qiskit, PennyLane, and Cirq; verify statevectors match | Cross-validation | Intermediate |
| SDK-13 | Transpile for IBM Eagle (127-qubit heavy-hex topology) | Qiskit + hardware | Intermediate |
| SDK-14 | Transpile for Google Sycamore (53-qubit grid topology) | Cirq + hardware | Intermediate |
| SDK-15 | Adapt a textbook CNOT-heavy circuit to QI Spin-2 connectivity constraints | QI SDK + hardware | Advanced |
| SDK-16 | Compare noise models: Qiskit AerSimulator vs. PennyLane default.mixed | Cross-framework | Advanced |
| SDK-17 | Debug: Cirq circuit uses `cirq.CNOT` where `cirq.ZZPowGate` is needed for Sycamore | Cirq | Intermediate |
| SDK-18 | Convert a Cirq circuit to Qiskit and verify equivalence | Cirq -> Qiskit | Intermediate |
| SDK-19 | Build a backend-agnostic VQE that runs on any simulator (Aer, PennyLane, Cirq) | Multi-framework | Advanced |
| SDK-20 | Profile the same algorithm across 3 simulators and compare accuracy/speed | Multi-framework | Advanced |

## Evaluation Protocol

### Scoring

Each task is scored on a 0-3 scale:

| Score | Meaning |
|-------|---------|
| 0 | No meaningful output or completely wrong |
| 1 | Reasonable approach but does not run or produce correct results |
| 2 | Runs and partially correct (e.g., right algorithm, wrong parameters) |
| 3 | Fully correct, verified by automated test |

### Verification by Track

**Code generation tasks**: `check()` function with assertions. Binary pass/fail.

**Debugging tasks**: Provided buggy code + test. Agent must identify and fix the bug so the test passes.

**Scientific reasoning tasks** (IDs ending in analysis questions):
- Code component: must run and produce correct numerical values
- Reasoning component: evaluated against rubric by a judge model (Claude Opus 4.6 or GPT-4.1)

**Cross-framework tasks**: Statevector or distribution equivalence checks across frameworks (tolerance: 1e-6 for statevector, chi-squared for distributions).

### Agent Protocol

For debugging and multi-step tasks, the agent receives:
1. A working directory with starter files
2. Access to run Python in a subprocess
3. Up to N turns (configurable, default 10) to iterate

This tests the full agentic loop: read -> think -> write -> execute -> observe error -> debug -> iterate.

### Metrics

| Metric | Description |
|--------|-------------|
| **Pass@1** | Fraction of tasks solved on first attempt |
| **Solve@N** | Fraction of tasks solved within N agentic turns |
| **Time to solve** | Wall clock time per task |
| **Token efficiency** | Total tokens used per successful solve |
| **Error recovery rate** | % of initially-failing attempts debugged to success |
| **Track scores** | Per-track pass rates (QEC, Chemistry, Optimization, NISQ, SDK) |

## Preliminary Results: Qiskit HumanEval Baseline

We ran the existing Qiskit HumanEval benchmark (151 code completion tasks) to establish baselines:

| Model | Pass@1 | Basic (79) | Intermediate (67) | Difficult (5) | Notes |
|-------|--------|------------|-------------------|---------------|-------|
| IBM granite-8b | 46.5% | -- | -- | -- | Fine-tuned on Qiskit |
| QSpark ORPO | 56.3% | -- | -- | -- | RL fine-tuned on Qiskit |
| QuanBench frontier models | <40% | -- | -- | -- | Zero-shot |
| **Gemini 3 Flash Preview** | **62.3%** | 65.8% | 62.7% | 0.0% | Zero-shot, Feb 2026 |
| **Claude Opus 4.6** | **63.6%** | 67.1% | 62.7% | 20.0% | Zero-shot via CLI, Feb 2026 |

Key findings from baseline:
- General-purpose frontier models now **beat fine-tuned quantum-specific models** at Qiskit code generation
- Both Gemini and Claude fail at "difficult" tasks that require multi-step reasoning or obscure API knowledge
- Common failure modes: deprecated Qiskit 2.x APIs (SamplerV2 signature), endianness confusion, incorrect parameter binding
- **This is exactly why we need QuantumAgentBench** — code completion is becoming trivial; the hard part is debugging, reasoning, and hardware awareness

## Implementation Plan

### Phase 1: Task Specification (Weeks 1-2)
- Write all 80 task specifications with test harnesses and canonical solutions
- Validate each canonical solution runs correctly in our environment
- Peer review difficulty ratings with quantum computing researchers

### Phase 2: Harness Development (Weeks 2-3)
- Extend `benchmark_harness.py` to support multi-turn agentic evaluation
- Add cross-framework equivalence checking (statevector comparison across Qiskit/PennyLane/Cirq)
- Add judge model integration for scientific reasoning evaluation
- Build results dashboard (integrate with quantuminspire.vercel.app)

### Phase 3: Baseline Runs (Weeks 3-4)
- **Code completion models**: Gemini 3 Flash, Gemini 2.5 Pro, Claude Sonnet 4.5, Claude Opus 4.6, GPT-4.1
- **Agentic evaluation**: Claude Code, Codex CLI, Gemini with tool use on Tracks 1-5
- **Specialized models**: IBM Granite-8b-Qiskit (if accessible), QSpark
- Collect and analyze results by track

### Phase 4: Publication (Weeks 4+)
- Write up methodology and results
- Open-source the benchmark (GitHub)
- Submit to relevant venue: IEEE QCE 2026, NeurIPS 2026 Quantum workshop, or arXiv preprint

## Ecosystem Context

This benchmark is developed at **TU Delft / QuTech** in the context of the **Quantum Inspire** platform, but is designed to be relevant across the quantum computing ecosystem:

- **IBM**: Heavy-hex topologies (Eagle 127q, Heron 156q), Qiskit 2.x migration challenges, AI transpiler advances
- **Google**: Sycamore grid topology, Cirq framework, AlphaQubit/AlphaTensor-Quantum breakthroughs, Willow processor QEC milestones
- **QuTech/TU Delft**: Quantum Inspire platform with the world's only publicly accessible spin qubit processor, unique noise profiles
- **Xanadu**: PennyLane as the dominant framework for variational quantum algorithms and quantum machine learning
- **Cross-ecosystem**: OpenQASM 3.0 as the emerging interoperability standard

The overarching question: **How might AI accelerate quantum computing research?**

This benchmark provides a quantitative answer — not by testing whether AI can autocomplete Qiskit boilerplate, but by measuring whether AI can do the real work of a quantum computing researcher: debugging hardware-specific failures, reasoning about physics, navigating a fragmented toolchain, and iterating toward correct solutions.
