# AI-Driven Adaptive Quantum Experimentation: State of the Art (2023--2026)

**Survey date:** February 2026
**Scope:** Autonomous quantum labs, Bayesian/active learning for quantum, AI experiment design, closed-loop optimization, open problems

---

## 1. Autonomous / Self-Driving Quantum Laboratories

### 1.1 k-agents: LLM Agents for Self-Driving Quantum Labs

**Paper:** Cao, Zhang, Alghadeer, Fasciati, Piscitelli, Bakr, Leek, Aspuru-Guzik. "Agents for self-driving laboratories applied to quantum computing." arXiv:2412.07978 (Dec 2024). Published in *Patterns* (Cell Press), 2025.
https://arxiv.org/abs/2412.07978

**Hardware:** 16-qubit superconducting quantum processor (coaxmon qubits -- transmon variant with coaxial geometry). Experiments used a subset of 3 adjacent qubits.

**What they did:**
- Built the **k-agents framework**: LLM-based agents that encapsulate laboratory knowledge (operations, analysis methods, procedures) and automate multi-step experiments via agent-based state machines.
- Agent types: **Code Translation Agents** (17 agents, activated by embedding similarity), **Procedure Translation Agents** (multi-step workflows), **Inspection Agents** (multimodal, analyze experimental figures), **Execution Agent** (coordinator, manages closed-loop feedback).
- Demonstrated three experimental campaigns:
  1. **Single-qubit calibration** -- autonomous frequency, amplitude, and DRAG parameter adjustment, validated by randomized benchmarking.
  2. **Two-qubit gate discovery** -- 3-hour autonomous parameter search for siZZle gate, performing Hamiltonian tomography on the ZZ interaction rate (continuous-time and repeated-gate methods). Found optimal parameters (4,726 MHz, amplitude 0.3049) within 100 experiments.
  3. **GHZ state generation** -- autonomously produced and characterized a 3-qubit Greenberger-Horne-Zeilinger entangled state via state and process tomography.

**Feedback loop:** Execution agent decomposes procedures into state machines. At each step, it invokes code translation agents to generate instrument commands, runs experiments, passes results to inspection agents for analysis, and uses analyzed results to drive state transitions. Fully closed-loop.

**Results:** Achieved human-level performance in calibration tasks. Ran autonomously for hours. GPT-4o achieved 97% code translation accuracy. The 3-hour two-qubit search cost <$5 in API tokens (1.37M input tokens, 168K output tokens).

**Significance:** First demonstration of LLM agents autonomously calibrating a superconducting quantum processor end-to-end, from single-qubit tuneup through entangled state characterization.

---

### 1.2 QCopilot: Multi-Agent Copilot for Quantum Sensors

**Paper:** Sha, Wang, Yang, Ma, Wu, Yan, Zhou, Liu, Wang, Yan, Zhu. "LLM-based Multi-Agent Copilot for Quantum Sensor." arXiv:2508.05421 (May 2025).
https://arxiv.org/abs/2508.05421

**Hardware:** Cold-atom quantum sensor (atom cooling apparatus).

**What they did:**
- Built a multi-agent framework integrating commercial LLMs with few-shot prompting, a vector knowledge base, active learning, and uncertainty quantification.
- Specialized agents: **Decision Maker**, **Experimenter**, **Analyst**, **Multimodal Diagnoser**, **Web Searcher**, **Recorder**.
- Applied to atom cooling experiments: adaptively selected optimization methods, automated modeling/analysis, performed autonomous fault diagnosis.

**Feedback loop:** Agents continuously accumulate prior knowledge, enable dynamic modeling, and autonomously identify anomalous parameters in multi-parameter settings. The system adaptively selects optimization strategies based on current experimental state.

**Results:** Generated 10^8 sub-microkelvin atoms without human intervention within a few hours. ~100x speedup over manual experimentation. Autonomously diagnosed anomalous parameters in complex multi-parameter settings.

**Significance:** Extends the self-driving lab paradigm beyond qubits to quantum sensors. The 100x speedup is remarkable and directly addresses the bottleneck of scaling quantum sensor deployment.

---

### 1.3 Other Autonomous Quantum Systems

**Quantum Machines QUAlibrate** (2024): Open-source calibration framework for quantum computers. Completed multi-qubit calibration of superconducting qubits in 140 seconds. Not AI-driven per se, but provides the calibration graph infrastructure that AI agents can orchestrate.
https://www.quantum-machines.co/press-release/quantum-machines-launches-qualibrate-an-open-source-framework-that-cuts-quantum-computer-calibration-from-hours-to-minutes/

**Q-CTRL Boulder Opal Scale Up** (2024-2025): World's first commercial autonomous calibration software for quantum processors. Uses AI agents for plug-and-play startup without manual tuning. Demonstrated up to 9,000x improvement in quantum algorithm performance, 10x reduction in measurement overhead for IQ mixer calibration. Applied to superconducting qubits (LLNL collaboration on SWAP operations) and other modalities.
https://q-ctrl.com/technology/quantum-computer-autocalibration

---

## 2. Bayesian Optimization / Active Learning for Quantum

### 2.1 Physics-Informed Bayesian Optimization for VQE

**Paper:** Nicoli, Anders, Funcke et al. "Physics-Informed Bayesian Optimization of Variational Quantum Circuits." NeurIPS 2023 (arXiv: 2406.06150, updated 2024).
https://arxiv.org/abs/2406.06150

**Key innovation:** Derived a **VQE-kernel** for Gaussian processes that exactly matches the known functional form of VQE objective functions, incorporating circuit structure as prior information. Proposed the **EMICoRe** (Expected Maximum Improvement over Confident Regions) acquisition function that treats low-uncertainty regions as indirectly observed.

**Results:** As few as 3 observations can determine the complete objective function along a 1D subspace. State-of-the-art performance on VQE optimization benchmarks.

**Follow-up (2025):** Alternative threshold functions for EMICoRe proposed, improving results for the Ising Hamiltonian (arXiv:2507.20570).

### 2.2 Bayesian Parameter Shift Rule

**Paper:** "Bayesian Parameter Shift Rule in Variational Quantum Eigensolvers." arXiv:2502.02625 (Feb 2025).
https://arxiv.org/abs/2502.02625

**Key innovation:** Replaces standard parameter-shift gradients with Gaussian process-estimated gradients using the VQE kernel. Crucially, reuses observations from previous SGD iterations, improving gradient estimation accuracy and accelerating convergence.

**Significance:** Directly reduces the number of quantum circuit evaluations needed per optimization step -- a critical resource constraint on real hardware.

### 2.3 Bayesian Optimization with Information Sharing (BOIS)

**Paper:** "Bayesian optimisation with improved information sharing for the variational quantum eigensolver." arXiv:2405.14353 (May 2024).
https://arxiv.org/abs/2405.14353

**Key innovation:** New information-sharing scheme across parallel VQE evaluations. Trades parallelizability for significant reduction in total quantum computing resources until convergence.

### 2.4 Adaptive Bayesian Single-Shot Quantum Sensing

**Paper:** Researchers from Eindhoven UT and King's College London. "Adaptive Bayesian Single-Shot Quantum Sensing." arXiv:2507.16477 (Jul 2025).
https://arxiv.org/abs/2507.16477

**Key innovation:** Variational quantum sensing framework where the quantum sensor acts as an active experimenter, using Bayesian beliefs about the parameter of interest to design sensing policies maximizing active information gain. Includes a multi-agent extension where multiple sensors fuse estimates via principled Bayesian methods.

**Hardware:** Validated on quantum magnetometry (NV-center style sensing).

**Results:** Robust single-shot parameter estimation in both noise-free and noisy regimes. Multi-agent fusion reduces uncertainty beyond individual sensor limits.

### 2.5 Neural Adaptive Quantum State Tomography

**Foundational:** Quek et al. "Adaptive quantum state tomography with neural networks." npj Quantum Information (2021).

**Recent extensions (2024-2025):**
- **Neural-Shadow QST** (2024, Phys. Rev. Research): Combines neural networks with classical shadow formalism; robust against noise without error mitigation.
- **Physics-Informed Neural Networks for QST** (Dec 2025, arXiv:2512.14543): Integrates quantum mechanical constraints via adaptive constraint weighting and Cholesky parameterization. Automatically adjusts constraint strength based on noise severity.
- **Constrained Measurement QST** (2024, Quantum Info. Processing): Unified NN approach for QST under limited copies, incomplete measurements, and noisy measurements.

---

## 3. AI for Quantum Experiment Design

### 3.1 Generative Models: Diffusion-Based Quantum Circuit Synthesis

**Paper:** Furrutter et al. "Quantum circuit synthesis with diffusion models." Nature Machine Intelligence (2024). arXiv:2311.02041.
https://www.nature.com/articles/s42256-024-00831-9

**What they did:** Applied denoising diffusion models to generate quantum circuits from textual prompts. The **genQC** framework produces circuits that are immediately deployable on target hardware.

**Follow-up -- Q-Fusion (2025):** Penn State researchers extended this to produce 100% valid quantum circuits for 2-qubit/8-gate circuits, with >40% functionally unique outputs. Incorporates hardware-specific connectivity and native gate constraints.

**Follow-up -- Parameterized Circuits (2025):** arXiv:2505.20863. Diffusion models generate parameterized quantum circuits (PQCs), bypassing the expensive parameter training phase during circuit architecture search.

**Gap:** These models do not yet incorporate deeper quantum reasoning (e.g., recognizing canceling gates).

### 3.2 LLM-Based Quantum Circuit Generation

**Agent-Q** (Apr 2025, arXiv:2504.11109): Fine-tuned LLMs on 14,000 quantum circuits covering 12 optimization problem types (QAOA, VQE, adaptive VQE). Generates syntactically correct parameterized circuits in OpenQASM 3.0. Superior to base LLMs, produces usable starting points for further optimization.
https://arxiv.org/abs/2504.11109

**QAgent** (Aug 2025, arXiv:2508.20134): Hierarchical multi-agent framework for autonomous OpenQASM programming. Uses dynamic few-shot coding + tools-augmented coding with RAG and chain-of-thought reasoning. Improves QASM generation accuracy by 71.6% over static LLM approaches.
https://arxiv.org/abs/2508.20134

**QUASAR** (Oct 2025, arXiv:2510.00967): Agentic RL framework where LLMs interact directly with quantum simulators. Hierarchical four-level reward mechanism enforces correctness as prerequisite. A 4B-parameter LLM achieved 99.31% validity at Pass@1 and 100% at Pass@10, outperforming GPT-4o, GPT-5, and DeepSeek-V3.
https://arxiv.org/abs/2510.00967

**Data Verification Position Paper** (Feb 2026, arXiv:2602.04072): Argues that LLM hallucinations are mathematically inevitable for quantum circuit generation. Verification must constrain generation (not just filter outputs) because valid designs occupy exponentially shrinking subspaces. Without verification, LLMs plateau at ~79% circuit optimization accuracy.
https://arxiv.org/abs/2602.04072

### 3.3 AI-Assisted Hypothesis Generation

**GPT-5 as Research Assistant** (Sep 2025): Aaronson and Witteveen used GPT-5 to prove a theorem about QMA proof system completeness bounds. After ~30 minutes of interaction, GPT-5 proposed a key mathematical function for analyzing eigenvalue behavior that became the critical breakthrough. First documented case of an LLM contributing a substantive step to quantum complexity theory.
https://thequantuminsider.com/2025/09/29/gpt-5-serves-as-research-assistant-in-proving-one-of-quantum-computing-theorys-trickiest-theorems/

**Significance:** This is not automated experiment design per se, but it demonstrates AI contributing to the "what should we investigate?" question in quantum theory -- the highest level of scientific agency.

---

## 4. Closed-Loop Quantum Optimization

### 4.1 Q-CTRL: AI-Driven Closed-Loop Hardware Optimization

**Platform:** Boulder Opal (commercial product).
https://docs.q-ctrl.com/boulder-opal/automate/automate-closed-loop-optimization/automate-quantum-experiments-with-ai

**How it works:** AI agents connect directly to quantum hardware and autonomously tune experimental parameters. Pre-tuned agents available for quantum gate design, PID controller tuning (laser stabilization), RF signal calibration, IQ mixer optimization, and DDS configuration. Model-free approach: treats quantum system as black box, uses hardware feedback directly.

**Hardware:** Superconducting qubits (IBM, LLNL), general-purpose signal chain components. Multi-modality support.

**Results:** Up to 9,000x improvement in quantum algorithm performance. 4x boost in solvable optimization problem size on IBM utility-scale hardware (Jun 2024). Partnership with QuantWare and TreQ for autonomous calibration of third-party processors (May 2025).

### 4.2 IBM AI Transpiler

**Paper:** Kremer, Villar, Paik, Duran, Faro, Cruz-Benito. "Practical and efficient quantum circuit synthesis and transpiling with Reinforcement Learning." arXiv:2405.13196 (May 2024, updated Feb 2025).
https://arxiv.org/abs/2405.13196

**What they did:** Integrated RL into Qiskit's transpilation pipeline for circuit synthesis and routing. RL agents learn to minimize two-qubit gate depth/count.

**Results:**
- Near-optimal synthesis of Linear Function circuits (up to 9 qubits), Clifford circuits (up to 11 qubits), Permutation circuits (up to 65 qubits)
- Significant reduction in two-qubit gate depth/count for routing up to 133 qubits
- Outperforms SABRE routing heuristic
- Orders of magnitude faster than SAT solvers
- Now available in Qiskit Transpiler Service (IBM Quantum Premium Plan)

**Feedback loop nature:** Not real-time closed-loop with hardware. The RL agents are trained offline on circuit optimization objectives and deployed as transpiler passes. However, the Qiskit Transpiler Service integrates with cloud infrastructure for hardware-aware optimization.

### 4.3 Reinforcement Learning for Quantum Control

**Key recent papers:**

| Paper | Year | Hardware/Simulation | Key Result |
|-------|------|-------------------|------------|
| RL pulses for transmon entangling gates (arXiv:2311.03684) | 2024 | Transmon simulation | RL-designed PWC pulses; agent generalizes to drifted parameters |
| RL for quantum control under physical constraints (arXiv:2501.14372) | 2025 | Transmon simulation | Novel reset waveforms with order-of-magnitude higher reset fidelity |
| RL from Demonstration for robust quantum control (arXiv:2503.21085) | 2025 | Simulation | Handles >1000-piece pulse discretization without fidelity loss |
| Fast robust entangling gates via RL (arXiv:2511.07076) | 2025 | Simulation | Near-optimal entangling gates under noisy conditions |
| RL control of quantum error correction (arXiv:2511.08493) | 2025 | Simulation | Pushes beyond state-of-the-art traditional calibration + human-expert tuning |
| Automatic re-calibration by RL (arXiv:2404.10726) | 2024 | Model-free | Continuous recalibration without system model |

### 4.4 Meta-Learning for Quantum Control

**metaQctrl** (Zhang, Miao et al. npj Quantum Information, 2025): Meta-RL algorithm that provides a generic agent adaptable to different quantum system parameters. Achieves 99.99% fidelity gates even under uncertainties -- an order of magnitude better than GA and GRAPE.
https://www.nature.com/articles/s41534-025-01034-9

**Scaling Laws** (arXiv:2601.18973, Jan 2026): Derives explicit scaling laws for meta-learning in quantum control. Adaptation gain saturates exponentially with gradient steps and scales linearly with task variance. Key finding: negligible benefits for low-variance tasks, but >40% fidelity gains for two-qubit gates under extreme out-of-distribution conditions (10x training noise).

### 4.5 AlphaQubit: Neural Network QEC Decoder

**Paper:** Google DeepMind + Google Quantum AI. "Learning high-accuracy error decoding for quantum processors." Nature (2024).
https://www.nature.com/articles/s41586-024-08148-8

**Hardware:** Trained on data from 49-qubit Sycamore processor. Tested on simulations up to 241 qubits.

**Architecture:** Recurrent transformer-based neural network. Handles cross-talk, leakage, and soft readouts.

**Results:** 6% fewer errors than tensor network methods (accurate but slow), 30% fewer errors than correlated matching (fast but less accurate).

**Limitation:** Not yet fast enough for real-time decoding on superconducting processors (need ~1 MHz decoding rate). Addressed by follow-up Mamba-based decoder (arXiv:2510.22724, Oct 2025) with O(d^2) complexity vs O(d^4) for transformers, achieving higher error threshold (0.0104 vs 0.0097).

### 4.6 Quantum Dot Autotuning

**Paper:** "Experimental Online Quantum Dots Charge Autotuning Using Neural Networks." Nano Letters (2025). arXiv:2409.20320.
https://pubs.acs.org/doi/10.1021/acs.nanolett.4c04889

**Hardware:** Semiconductor quantum dot device (spin qubits).

**What they did:** CNN integrated into closed-loop calibration system. Explores gate voltage space to localize charge transition lines, isolating single-electron regime without human intervention. Uses uncertainty estimation to minimize measurements while reducing failure risk.

**Results:** 95% success rate across 20 experimental runs. Average 2h9min per tuning run (limited by measurement speed, not algorithm).

---

## 5. Hamiltonian Learning and System Identification

**Dual-Capability ML Models** (Phys. Rev. Lett., Mar 2025): ML model that both infers time-dependent Hamiltonian parameters from local observables and predicts observable evolution from parameters. Validated on NMR quantum computer, then tested on superconducting processor with initially unknown parameters -- successfully inferred them.
https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.134.120202

**Robust Hamiltonian Learning for Superconducting Processors** (Nature Comms, 2024): Scalable algorithm robust against SPAM errors. Precise estimation from time-series data on up to 14 qubits.
https://www.nature.com/articles/s41467-024-52629-3

---

## 6. What's Missing / Open Problems

### 6.1 The Experiment Design Gap

The most conspicuous absence in the literature is a system that decides **what experiments to run** at a strategic level. Current systems automate known calibration procedures (k-agents), optimize known objectives (BO for VQE), or generate circuits for specified problems (QUASAR, Agent-Q). No system yet:

- **Generates novel experimental hypotheses** about quantum hardware behavior
- **Proposes new Hamiltonian models** to test based on observed anomalies
- **Autonomously identifies interesting quantum phenomena** during exploration
- **Designs experiments to discriminate between competing physical theories**

The GPT-5 theorem-proving result is a tantalizing hint, but it was a one-off collaboration, not a systematic pipeline.

### 6.2 The Sim-to-Real Gap

The Nature Communications review (Rached et al., 2025) identifies this as critical: "Many AI models generalize poorly when real hardware deviates from the noise distributions used during training." Specific manifestations:

- AlphaQubit trained on simulated data; real-hardware performance unknown at scale
- RL gate controllers trained in simulation may fail on actual devices with unknown noise
- Quantum dot autotuning achieved 95% success but needed 2+ hours due to measurement bottlenecks
- Transfer across hardware platforms is essentially unsolved

### 6.3 Real-Time Constraints

AI decoders (AlphaQubit, Mamba) are still too slow for the ~1 MHz decoding rate demanded by superconducting QEC. The review notes that only shallow neural networks have been demonstrated for real-time mid-circuit feedback. This is a fundamental tension: the most capable AI models are the slowest.

### 6.4 Data Efficiency

Long training times and extensive data collection from quantum hardware remain bottlenecks. Key tension: BO and active learning methods reduce measurements, but meta-learning and RL methods require large training datasets. The scaling laws paper (arXiv:2601.18973) provides useful guidance on when adaptation is worth the overhead.

### 6.5 Verification and Trust

The data verification position paper (arXiv:2602.04072) highlights that LLM hallucinations are **mathematically inevitable** for quantum circuit generation. Without architectural verification primitives, LLMs plateau at ~79% accuracy. Current autonomous lab agents "cannot yet fully recover from all error cases, still requiring human intervention."

### 6.6 Cross-Platform and Cross-Modality Transfer

Transferring circuit designs, control policies, and calibration procedures across hardware platforms is an open problem with limited work. Each new chip requires re-training or re-calibration. This is perhaps the biggest barrier to practical autonomous quantum labs at scale.

### 6.7 What Would Be Novel

Based on the gaps identified above, the following research directions appear under-explored:

1. **Autonomous scientific discovery agents for quantum**: An agent that doesn't just calibrate or optimize, but formulates and tests hypotheses about quantum hardware -- e.g., identifying unknown noise channels, discovering new gate mechanisms, or proposing error mitigation strategies not in its training data.

2. **Transfer learning across quantum processors**: Learning calibration strategies on one chip and transferring to another (similar chip or different modality). The meta-learning scaling laws paper hints at feasibility but no one has demonstrated cross-chip transfer in practice.

3. **End-to-end AI pipeline from problem specification to hardware results**: A system that takes a high-level problem (e.g., "find the ground state energy of this molecule"), selects the algorithm, designs the circuit, transpiles for hardware, runs with closed-loop error mitigation, and validates the result -- all without human intervention.

4. **AI-in-the-loop quantum error correction**: Real-time neural decoders that adapt their strategy based on observed error patterns during a computation, not just decode with a fixed trained model.

5. **Multi-objective experiment planning**: Balancing exploration (learning about the hardware) with exploitation (running useful computations) in a principled Bayesian framework. No current system explicitly manages this trade-off.

6. **Verified autonomous operation**: Combining formal verification with autonomous agents so the system can guarantee (not just statistically estimate) correctness of its experimental procedures and results.

---

## Summary Table: Key Systems

| System | Year | Type | Hardware | Feedback Loop | Key Result |
|--------|------|------|----------|---------------|------------|
| k-agents | 2024 | Self-driving lab | 16-qubit SC processor | LLM state machines | Human-level calibration, GHZ state |
| QCopilot | 2025 | Sensor copilot | Cold-atom sensor | Multi-agent + active learning | 10^8 sub-uK atoms, 100x speedup |
| Q-CTRL Boulder Opal | 2024-25 | Closed-loop opt | Multi-platform | AI agent + hardware feedback | 9,000x algorithm improvement |
| AlphaQubit | 2024 | QEC decoder | Sycamore 49-qubit | Trained offline | 6% fewer errors than tensor networks |
| EMICoRe/VQE-kernel | 2024 | BO for VQE | Simulation | Physics-informed BO | 3 observations per 1D subspace |
| IBM RL Transpiler | 2024 | Circuit optimization | Up to 133 qubits | RL-trained passes | Outperforms SABRE routing |
| QUASAR | 2025 | Circuit generation | Simulation | Agentic RL + simulator | 99.31% validity, beats GPT-5 |
| metaQctrl | 2025 | Gate calibration | Simulation | Meta-RL | 99.99% fidelity under noise |
| QDot Autotuning | 2025 | Device calibration | Semiconductor QD | CNN + closed-loop | 95% success, fully autonomous |

---

## References

### Autonomous Labs
- Cao et al. arXiv:2412.07978 / Patterns (2025) -- https://arxiv.org/abs/2412.07978
- Sha et al. arXiv:2508.05421 (2025) -- https://arxiv.org/abs/2508.05421
- QUAlibrate -- https://www.quantum-machines.co/press-release/quantum-machines-launches-qualibrate-an-open-source-framework-that-cuts-quantum-computer-calibration-from-hours-to-minutes/
- Q-CTRL -- https://q-ctrl.com/technology/quantum-computer-autocalibration

### Bayesian Optimization / Active Learning
- Nicoli et al. arXiv:2406.06150 / NeurIPS 2023 -- https://arxiv.org/abs/2406.06150
- Bayesian PSR arXiv:2502.02625 -- https://arxiv.org/abs/2502.02625
- BOIS arXiv:2405.14353 -- https://arxiv.org/abs/2405.14353
- Adaptive Bayesian Sensing arXiv:2507.16477 -- https://arxiv.org/abs/2507.16477
- Alternative EMICoRe arXiv:2507.20570 -- https://arxiv.org/abs/2507.20570

### AI Experiment Design / Circuit Generation
- genQC: Nature Machine Intelligence (2024) -- https://www.nature.com/articles/s42256-024-00831-9
- Agent-Q arXiv:2504.11109 -- https://arxiv.org/abs/2504.11109
- QAgent arXiv:2508.20134 -- https://arxiv.org/abs/2508.20134
- QUASAR arXiv:2510.00967 -- https://arxiv.org/abs/2510.00967
- Data Verification arXiv:2602.04072 -- https://arxiv.org/abs/2602.04072
- Q-Fusion diffusion circuits -- https://thequantuminsider.com/2025/07/01/ai-powered-diffusion-model-generates-quantum-circuits-opens-path-to-automated-quantum-programming/

### Closed-Loop Optimization
- IBM RL Transpiler arXiv:2405.13196 -- https://arxiv.org/abs/2405.13196
- AlphaQubit: Nature (2024) -- https://www.nature.com/articles/s41586-024-08148-8
- Mamba decoder arXiv:2510.22724 -- https://arxiv.org/abs/2510.22724
- metaQctrl: npj Quantum Information (2025) -- https://www.nature.com/articles/s41534-025-01034-9
- Meta-learning scaling laws arXiv:2601.18973 -- https://arxiv.org/abs/2601.18973
- Q-CTRL closed-loop docs -- https://docs.q-ctrl.com/boulder-opal/automate/automate-closed-loop-optimization/automate-quantum-experiments-with-ai
- QDot autotuning: Nano Letters (2025) -- https://pubs.acs.org/doi/10.1021/acs.nanolett.4c04889
- RL quantum control under constraints arXiv:2501.14372 -- https://arxiv.org/abs/2501.14372
- RL from Demonstration arXiv:2503.21085 -- https://arxiv.org/abs/2503.21085
- RL QEC control arXiv:2511.08493 -- https://arxiv.org/abs/2511.08493
- RL re-calibration arXiv:2404.10726 -- https://arxiv.org/abs/2404.10726

### Hamiltonian Learning
- Dual-capability ML: Phys. Rev. Lett. 134, 120202 (2025) -- https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.134.120202
- Robust Hamiltonian learning: Nature Comms (2024) -- https://www.nature.com/articles/s41467-024-52629-3

### Reviews
- Rached et al. "Artificial intelligence for quantum computing." Nature Communications (2025) -- https://www.nature.com/articles/s41467-025-65836-3
- Autonomous SDL review: Royal Society Open Science (2025) -- https://royalsocietypublishing.org/rsos/article/12/7/250646/235354/Autonomous-self-driving-laboratories-a-review-of
