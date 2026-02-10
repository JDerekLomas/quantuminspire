# Quantum Computing: Open Problems & Research Landscape (February 2026)

Research compiled for the "AI x Quantum" project at TU Delft / Quantum Inspire.

---

## 1. Quantum Error Correction (QEC)

### Current State

QEC went from theoretical milestone to engineering reality in 2024-2025. The field is now in a "code explosion" -- 120 peer-reviewed QEC papers published by October 2025, up from 36 in all of 2024. Seven code families have been demonstrated on real hardware: surface codes, color codes, qLDPC codes, and others.

**Google Willow** (December 2024, published Nature 2025): First demonstration of exponential error suppression with increasing surface code distance. Key numbers:
- 105 superconducting qubits
- Distance-7 surface code logical memory on a ~101-qubit patch
- Logical error rate suppressed by factor Lambda = 2.14 +/- 0.02 when increasing code distance by 2
- 0.143% +/- 0.003% error per cycle at distance-7
- Logical memory lifetime 2.4x longer than best physical qubit (beyond breakeven)
- Real-time decoding at 63 microsecond average latency (distance-5), with 1.1 microsecond cycle time
- Qubit T1 improved from ~20 microseconds (Sycamore) to 68 +/- 13 microseconds

Source: [Quantum error correction below the surface code threshold (Nature)](https://www.nature.com/articles/s41586-024-08449-y)

**IBM's Roadmap to Fault Tolerance:**
- 2025: Loon processor -- experimental chip demonstrating all key fault-tolerant components, with new crosstalk-avoiding c-couplers for LDPC code connectivity
- 2026: Kookaburra -- first QEC-enabled module, first processor capable of storing information in a qLDPC memory and processing it with an attached Logical Processing Unit (LPU)
- 2029: Starling -- 200 logical qubits running 100 million gates
- Real-time qLDPC decoding demonstrated at <480 nanoseconds

Source: [IBM lays out clear path to fault-tolerant quantum computing](https://www.ibm.com/quantum/blog/large-scale-ftqc)

**Microsoft Majorana 1** (February 2025): World's first topological qubit processor.
- Tetron architecture: aluminum nanowires in an H-shape, each H = one qubit with four Majorana Zero Modes
- Built on indium arsenide (semiconductor) + aluminum (superconductor) heterostructure
- 8 topological qubits placed on chip designed for 1 million
- 4x2 tetron array demonstrated quantum error detection on two logical qubits
- Claims 1,000-fold reduction in error rates via topological protection
- On track for DARPA US2QC fault-tolerant prototype "in years, not decades"

Source: [Microsoft unveils Majorana 1](https://azure.microsoft.com/en-us/blog/quantum/2025/02/19/microsoft-unveils-majorana-1-the-worlds-first-quantum-processor-powered-by-topological-qubits/)

**China**: Constructed a distance-7 surface-code logical qubit using microwaves, with error-suppression factor of 1.4, comparable in scale to Google's demonstrations.

Source: [China Demonstrates Quantum Error Correction Using Microwaves](https://thequantuminsider.com/2025/12/26/china-demonstrates-quantum-error-correction-using-microwaves-narrowing-gap-with-google/)

### Key Open Problems in QEC

**1. The Full Fault-Tolerance Integration Problem**
No team has yet realized a logical qubit that maintains below-threshold error rates in a *fully integrated* setting -- combining encoding, stabilizer measurement, real-time decoding, and continuous correction across arbitrarily deep circuits. Current demonstrations are memories or short-depth circuits; sustained computation with active error correction remains undemonstrated.

**2. Magic State Distillation -- The T Gate Bottleneck**
QEC codes naturally support only Clifford gates (which alone can't achieve quantum advantage). Non-Clifford gates (especially the T gate) require "magic states." The problem: raw magic states have error rates ~10^-3, but quantum advantage requires ~10^-7, and large-scale algorithms need ~10^-15 or lower.

Major 2025 breakthrough: Theoretically optimal scaling for magic state distillation has been achieved (scaling exponent gamma = 0), resolving a longstanding open problem. QuEra/Harvard/MIT demonstrated the first experimental logical-level magic state distillation on a neutral-atom computer (July 2025). But the resource overhead remains enormous in practice.

Source: [Optimal scaling for magic state distillation achieved](https://phys.org/news/2025-11-optimal-scaling-magic-state-distillation.html)

**3. qLDPC Codes vs. Surface Codes**
Surface codes are well-understood but require enormous physical-to-logical qubit ratios (~1000:1). qLDPC (quantum Low-Density Parity Check) codes promise dramatically better ratios:
- IBM's bivariate bicycle (BB) codes: high encoding rates relative to surface codes
- SHYPS codes (Photonic Inc): up to 20x fewer physical qubits per logical qubit than surface codes
- Tri-variate tricycle (TT) codes: possess "meta-checks" enabling single-shot error correction for Z checks

Open question: Which code family (or hybrid) will win for each hardware platform? IBM is betting on qLDPC for 2026+. Others will likely follow. The decoder design problem for qLDPC codes is significantly harder than for surface codes.

Source: [Introducing SHYPS: Low-Overhead QLDPC](https://photonic.com/blog/introducing-shyps/)

**4. Real-Time Decoding at Scale**
Decoding must happen faster than the error correction cycle time. Google achieved 63 microsecond latency at distance-5. But as code distance grows, decoder complexity explodes. Training transformer decoders beyond distance-9 may require 10^13 to 10^14 training examples. NVIDIA's DGX Quantum achieves <4 microsecond roundtrip latency -- 1,000x faster than alternatives -- but this must scale to much larger codes.

Source: [NVIDIA CUDA-Q QEC Real-Time Decoding](https://developer.nvidia.com/blog/real-time-decoding-algorithmic-gpu-decoders-and-ai-inference-enhancements-in-nvidia-cuda-q-qec/)

**5. The Classical Control Bottleneck**
Current systems use room-temperature electronics connected via thousands of coaxial cables to cryogenic qubits. This approach doesn't scale beyond a few hundred qubits. Cryogenic classical control is an unsolved engineering problem.

---

## 2. Quantum Chemistry & Simulation

### What's Being Targeted

The core promise: simulating molecular electronic structure problems that are intractable for classical computers due to exponential scaling of the many-body Schrodinger equation. Specific targets in 2025-2026:

**Currently Tractable on Near-Term Hardware:**
- Small molecules: H2, H2O, CO2, benzene, pyridine, naphthalene
- Hydrogen rings and cyclohexane conformers (27-32 qubits)
- Ground-state energies within 1 kcal/mol of classical benchmarks (chemical accuracy)

**Key Hybrid Methods Making This Work:**
- DMET-SQD (Density Matrix Embedding Theory + Sample-Based Quantum Diagonalization): Partitions large molecules into small fragments solvable on current hardware. Demonstrated on IBM's Cleveland Clinic quantum device.
- Quantum DFT embedding: Scalable, chemically interpretable bridge between near-term hardware and realistic molecular applications.
- Transcorrelated methods: Reduce basis set requirements, bringing calculations closer to chemical accuracy on noisy hardware.

Source: [Study Suggests Today's Quantum Computers Could Aid Molecular Simulation](https://thequantuminsider.com/2025/07/15/study-suggests-todays-quantum-computers-could-aid-molecular-simulation/)

**The Quantum-Classical Gap:**
The gap is real but narrowing from both sides:
- Classical methods (DMRG, tensor networks, neural network wavefunctions like FermiNet/PauliNet) keep improving
- Quantum methods improve through better error mitigation, smarter partitioning, and hardware advances
- The crossover point where quantum beats classical for useful chemistry problems is estimated at 100-1000 logical qubits with error rates ~10^-6

**What Would Be Genuinely Useful:**
- Nitrogen fixation catalysis (Haber-Bosch alternative)
- Battery electrolyte design (lithium-sulfur, solid-state)
- High-temperature superconductor mechanism (strongly correlated electron systems)
- Drug binding affinity prediction for large proteins
- Materials with strongly interacting electrons and lattice models appear closest to achieving quantum advantage

Source: [Quantum Algorithms for Quantum Molecular Systems: A Survey](https://wires.onlinelibrary.wiley.com/doi/10.1002/wcms.70020)

### Open Problems

**1. Active Space Selection**: Choosing which orbitals to include in the quantum calculation is still largely manual and requires expert chemical intuition. AI could help here directly.

**2. Basis Set Convergence**: Quantum calculations use finite basis sets that introduce systematic errors. The transcorrelated approach helps but adds circuit complexity.

**3. Scaling the Embedding**: DMET-SQD works but hasn't been demonstrated for systems large enough to beat classical methods. The fragment boundary problem (how correlations across fragments are handled) remains open.

**4. Dynamic Correlation**: Most quantum chemistry demonstrations capture static correlation (the hard part for classical). Capturing dynamic correlation simultaneously is needed for true chemical accuracy on industrially relevant molecules.

---

## 3. Quantum Advantage

### Where We Actually Stand

**Demonstrated (Narrow) Quantum Advantage:**
- Google's Random Circuit Sampling: Willow completed a benchmark in ~5 minutes that would take 10^25 years classically. But RCS has no known practical application.
- Google's "quantum echoes" (October 2025): Computed molecular structure with 13,000x speedup over Frontier supercomputer using 65 qubits. This is closer to useful but still a carefully chosen problem.
- Q-CTRL: First commercial quantum advantage in GPS-denied navigation using quantum sensors (50-100x outperformance over classical). Note: this is quantum sensing, not computing.
- IonQ: Claimed quantum advantage in medical device simulations (12% outperformance over classical HPC).

Source: [Q-CTRL 2025 Year in Review](https://q-ctrl.com/blog/2025-year-in-review-realizing-true-commercial-quantum-advantage-in-the-international-year-of-quantum)

**The Spoofing Problem:**
RCS-based advantage claims remain contested. A seminal study established that RCS experiments with constant error rate per gate are polynomial-time classically simulatable in the asymptotic limit. Tensor network methods can spoof the Linear Cross-Entropy Benchmark in milliseconds after learning the final circuit layer. This doesn't invalidate finite-size demonstrations but limits the paradigm.

Source: [A Herculean task: classical simulation of quantum computers](https://www.sciencedirect.com/science/article/pii/S2095927325010382)

**The Honest Assessment:**
- Useful quantum advantage (solving a problem someone actually cares about, faster or better than any classical method) has NOT been convincingly demonstrated for quantum computing as of early 2026
- Quantum sensing has achieved genuine commercial advantage (Q-CTRL navigation)
- IBM predicts useful computational quantum advantage by end of 2026
- The transition will be gradual, not a single "quantum supremacy" moment

### Most Promising Near-Term Applications

1. **Materials science**: Strongly correlated electron problems, lattice models
2. **Quantum chemistry**: Small-molecule simulation with hybrid methods
3. **Optimization**: Portfolio optimization, logistics (but classical competition is fierce)
4. **Quantum simulation**: Condensed matter physics, many-body dynamics
5. **Cryptography/QKD**: China planning 4-satellite QKD constellation in 2026

---

## 4. NISQ Algorithms: VQE, QAOA, and Alternatives

### The Verdict on VQE and QAOA

**VQE (Variational Quantum Eigensolver):**
- Delivers useful results for small molecules on current hardware when combined with error mitigation
- Fundamentally limited by barren plateaus: gradient vanishes exponentially with number of layers
- Noise-induced barren plateaus compound the problem -- even without architectural issues, hardware noise flattens the landscape
- Requires many circuit evaluations (measurement shots), making wall-clock time prohibitive for large problems
- The optimization landscape is highly non-convex with many local minima

**QAOA (Quantum Approximate Optimization Algorithm):**
- Similarly plagued by barren plateaus as system size increases
- Optimizing QAOA angles is a major bottleneck due to non-convex energy landscapes
- For MAX-CUT on 3-regular graphs, QAOA at depth p=11 barely beats the best classical algorithm (Goemans-Williamson)
- Advantage unclear for most practical optimization problems

Source: [Optimization Strategies for Variational Quantum Algorithms in Noisy Landscapes](https://arxiv.org/html/2506.01715v1)

### Emerging Alternatives (2025-2026)

**1. Fixed-Angle QAOA**: Bypasses barren plateaus entirely by using pre-computed angles from regular tree models. Works well for problems on large d-regular graphs that resemble trees locally. No optimization loop needed.

**2. Algorithmic Fault Tolerance (AFT)**: QuEra/Harvard/Yale's approach that reduces runtime cost of error correction by 10-100x, making deeper circuits practical. Changes the calculus for which algorithms are viable.

**3. Sample-Based Quantum Diagonalization (SQD)**: IBM's approach that uses quantum circuits to generate samples, then solves a classical eigenvalue problem. Hybrid method that's less sensitive to noise than pure VQE.

**4. Quantum Annealing Hybrids**: A 2025 traffic optimization study showed hybrid quantum annealing achieving solutions within 1% of classical Gurobi solver while reducing congestion by 25% over shortest-path routing.

**5. Adiabatically-Inspired Variational Methods**: Bridge between VQE (too shallow) and full adiabatic quantum computing (circuits too deep for NISQ). Active research area.

**6. Meta-Heuristic Optimizers**: Recent work systematically evaluated 50+ optimization algorithms (evolutionary, swarm-based, music-inspired) for navigating VQE's noisy landscape. Some dramatically outperform gradient descent.

Source: [Quantum Optimization Algorithms Guide](https://www.bqpsim.com/blogs/quantum-optimization-algorithms-guide)

---

## 5. Quantum Machine Learning (QML)

### The Consensus (Mixed)

**Evidence FOR Quantum Advantage in ML:**
- Lewis et al. designed an efficient quantum algorithm for learning periodic neurons over non-uniform distributions, showing exponential quantum advantage over a broad class of classical algorithms (published Nature Communications 2025)
- Google's 13,000x speedup on physics simulations has ML-adjacent implications
- Theoretical results show quantum kernels can learn certain function classes exponentially faster

Source: [Quantum advantage for learning shallow neural networks](https://www.nature.com/articles/s41467-025-68097-2)

**Evidence AGAINST (Dequantization):**
The dequantization program has been devastating to many QML claims:
- Random Fourier Features can efficiently simulate many quantum neural network architectures classically
- Recent work (2025) extended dequantization to classification tasks, not just regression
- Kernel-based dequantization works without Random Fourier Features for many variational QML models
- Critical finding: "For QML models to be effective, they must be both trainable and non-dequantizable" -- and these properties are in tension. Models that avoid barren plateaus are often easily dequantizable.

Source: [On the Relation between Trainability and Dequantization (ICLR 2025)](https://openreview.net/forum?id=TdqaZbQvdi)

**The Honest Assessment:**
- Most QML claims of practical advantage have not survived scrutiny
- The narrow cases where quantum advantage exists (periodic function learning, certain kernel problems) don't correspond to typical ML workloads
- QML market projected at $150B but meaningful commercial applications likely 2028-2030 at earliest
- Partial error correction may reduce hardware demands for QML (December 2025 result)
- The field is increasingly focused on identifying the specific, narrow conditions where quantum provides genuine advantage rather than making broad claims

---

## 6. Hardware Landscape

### Superconducting Qubits (IBM, Google, Rigetti, IQM)

**Strengths:** Fastest gate speeds, largest qubit counts, most mature fabrication
**2025-2026 Milestones:**
- Google Willow: 105 qubits, below-threshold QEC
- IBM: Roadmap to 1,386 qubits (Kookaburra, multi-chip) in 2025; Loon experimental processor for fault-tolerance
- Fujitsu/RIKEN: 256-qubit machine announced April 2025; 1,000-qubit planned for 2026
- IQM: European leader, tackling QEC with surface and color codes

**Challenges:** Short coherence times (~68 microseconds for Willow), cryogenic cooling to 15 millikelvin, crosstalk between qubits, manufacturing yield

### Trapped Ions (Quantinuum, IonQ, Oxford Ionics)

**Strengths:** Highest gate fidelity, all-to-all connectivity, long coherence times
**2025-2026 Milestones:**
- Quantinuum H2-1: 56 trapped-ion qubits, first "three 9s" (99.9%) two-qubit gate fidelity across all pairs in production
- Quantinuum Helios: 98-qubit machine with novel "X" junction architecture
- 200-ion linear chain demonstrated (Quantum Art)
- 99.9993% SPAM (state preparation and measurement) accuracy
- Microsoft + Quantinuum: 12 logical qubits, hybrid chemistry simulation
- Apollo (fully fault-tolerant, universal) planned for 2029

Source: [Quantinuum H-Series 56 qubits](https://www.quantinuum.com/blog/quantinuums-h-series-hits-56-physical-qubits-that-are-all-to-all-connected-and-departs-the-era-of-classical-simulation)

**Challenges:** Slower gate speeds than superconducting, scaling beyond hundreds of ions, laser control complexity

### Neutral Atoms (QuEra, Atom Computing/Microsoft, Pasqal)

**Strengths:** Massive parallelism, reconfigurable connectivity, natural scaling to thousands of qubits
**2025-2026 Milestones:**
- QuEra: 3,000-qubit array operating continuously for 2+ hours; up to 96 logical qubits with below-threshold error rates
- First logical-level magic state distillation (QuEra/Harvard/MIT)
- Transversal Algorithmic Fault Tolerance: 10-100x faster algorithm execution
- $230M+ raised in 2025; QuEra at AIST: 37 logical / 260 physical qubits
- Microsoft/Atom Computing: tens of logical qubits planned for 2026-2027

Source: [Neutral Atom Quantum Computing: 2026's Big Leap (IEEE Spectrum)](https://spectrum.ieee.org/neutral-atom-quantum-computing)

**Challenges:** Atom loss during computation, slower gate speeds, readout fidelity

### Photonic (PsiQuantum, Xanadu, Photonic Inc.)

**Strengths:** Room-temperature operation, natural networking capability, speed
**2025-2026 Milestones:**
- PsiQuantum: $1B funding round (September 2025)
- Photonic Inc.: SHYPS qLDPC code family designed for photonic architectures (20x fewer physical qubits)
- 1000x speed increases demonstrated on selected tasks

**Challenges:** Photon loss, non-deterministic gates, lack of quantum memory

### Semiconductor Spin Qubits (QuTech/TU Delft, Intel)

**Strengths:** Smallest qubit footprint, compatible with CMOS fabrication, potentially billions of qubits on a chip
**2025-2026 Milestones:**
- QuTech: 10-qubit germanium processor with >99% single-qubit gate fidelities, 2D layout with 4-neighbor connectivity
- Silicon spin qubits on 300mm industrial wafers with >99% fidelity (Nature 2025)
- Digital control breakthrough: bypasses analog limitations, simplifies scaling
- Germanium substrates shown to produce "quieter" qubits with longer coherence times
- Quantum Inspire 2.0: Spin-2+ processor publicly accessible online

Source: [Industry-compatible silicon spin-qubit unit cells exceeding 99% fidelity (Nature)](https://www.nature.com/articles/s41586-025-09531-9)

**Challenges:** Very short coherence times (microseconds), two-qubit gate fidelity still lags other platforms, control signal density

### Topological (Microsoft)

**Strengths:** Inherent error protection, potentially very low overhead for fault tolerance
**2025-2026 Milestones:**
- Majorana 1 chip: 8 topological qubits, tetron architecture
- Demonstrated quantum error detection on 2 logical qubits
- Distinct parity lifetimes shown in topological qubit prototype (July 2025)

**Challenges:** Only 8 qubits demonstrated; enormous gap between theoretical promise and current reality; years behind other modalities in qubit count; scientific controversy about whether Majorana zero modes are truly topological

---

## 7. QuTech / TU Delft / Quantum Inspire

### Research Focus Areas

**1. Semiconductor Spin Qubits -- The Core Bet**

QuTech's primary hardware bet is that semiconductor spin qubits (in silicon and germanium) will ultimately win the scaling race because they're compatible with existing CMOS fabrication. If you can make a qubit that looks like a transistor, you inherit 60 years of semiconductor manufacturing expertise.

Key 2025 breakthroughs:
- **10-qubit germanium processor**: Planar 2D layout with 4-neighbor connectivity (critical for surface codes). All single-qubit gates >99% fidelity. Published November 2025.
- **Quieter germanium substrates**: Switching from silicon to germanium substrate significantly reduced charge noise. Published Nature Materials 2025.
- **Electron shuttling**: Successfully transported a single electron spin across extended distance in Si/SiGe heterostructure using traveling wave potential. Key for scaling beyond nearest-neighbor connectivity.
- **Digital control**: Shift from analog to digital qubit control simplifies scaling and reduces signal crosstalk.

Source: [From Complexity to Control: a 10-spin qubit array in germanium](https://qutech.nl/2025/11/27/from-complexity-to-control-a-10-spin-qubit-array-in-germanium/)

**2. Quantum Internet / Networking**

QuTech is a world leader in quantum networking:
- Demonstrated 25 km entanglement distribution over deployed underground telecom fiber between Delft and The Hague -- a world record for quantum processor networking
- Next-generation network nodes based on tin-vacancy (SnV) centers in diamond, coupled to on-chip photonic waveguides
- Working on quantum repeater decision protocols: when to produce entanglement, when to swap, when to keep, when to expire
- Mission: first fully functional quantum networks

Source: [25 km quantum network link between Dutch cities](https://phys.org/news/2024-10-km-quantum-network-link-dutch.html)

**3. Quantum Inspire 2.0 Platform**

Launched February 2025 with major upgrades:
- **Three hardware backends**: Tuna-5 (superconducting, tunable couplers), Starmon-7 (superconducting), Spin-2+ (semiconductor spin qubits)
- **QX-emulator** backend for simulation
- **SDK**: Python-based, open source on GitHub (QuTech-Delft/quantuminspire2)
- **Framework support**: Qiskit and PennyLane integration
- **Hybrid computing**: Built-in integration with SURF supercomputer node for quantum-classical workflows
- **Open architecture**: Modular, interoperable components -- distinct from closed IBM/Google ecosystems

Source: [Quantum Inspire 2.0 is live](https://qutech.nl/2025/02/25/quantum-inspire-2-0-is-live-with-updated-software-and-hardware/)

In May 2025, the Delft quantum ecosystem (HQ/2 collaboration) launched a full open-architecture quantum computer: the Tuna-5 system integrating interoperable hardware and software from QuTech, TNO, Qblox, Orange Quantum Systems, and QuantWare.

Source: [Delft quantum ecosystem launches open-architecture quantum computer](https://qutech.nl/2025/05/15/delft-quantum-ecosystem-launches-open-architecture-quantum-computer/)

**4. EU Quantum Flagship: OpenSuperQPlus**

QuTech/Delft is one of three European demonstrator sites for the OpenSuperQPlus project targeting a 100-qubit quantum computer by September 2026.

### What's Unique About QuTech's Approach

1. **Spin qubits as the long game**: While others chase qubit count on superconducting/trapped-ion platforms, QuTech bets on CMOS compatibility for million-qubit scaling
2. **Open architecture**: Unlike IBM/Google's vertically integrated stacks, QI 2.0 is modular and interoperable
3. **Quantum internet pioneer**: No other group has demonstrated comparable metropolitan-distance quantum networking
4. **Multiple hardware backends on one platform**: Users can compare superconducting vs. spin qubit results
5. **Public accessibility**: Spin-2+ is the only semiconductor spin qubit processor in the world available for public online access
6. **European strategic position**: Central to EU Quantum Flagship, Netherlands national quantum strategy

---

## 8. Where AI Can Help Most

Based on the above landscape, here are the specific bottlenecks where an AI coding assistant could accelerate quantum computing research:

### Tier 1: High Impact, Currently Feasible

**A. Quantum Error Correction Decoder Design**
- Problem: Decoders must be fast (sub-microsecond), accurate, and scale to large code distances. Current best (AlphaQubit) works for distance-3 and distance-5 but training data requirements explode for larger codes.
- AI opportunity: Reinforcement learning agents that design decoder strategies. Transfer learning from small codes to large codes. Synthetic data generation for training.
- Specific tool: An AI assistant that helps researchers implement and benchmark custom decoders against AlphaQubit/MWPM baselines on Quantum Inspire hardware noise profiles.

Source: [AlphaQubit (Google DeepMind)](https://blog.google/technology/google-deepmind/alphaqubit-quantum-error-correction/)

**B. Circuit Compilation and Transpilation**
- Problem: Mapping abstract quantum algorithms to specific hardware topologies with minimal gate overhead. IBM's AI transpiler already achieves 42% reduction in two-qubit gate counts.
- AI opportunity: Hardware-specific optimization for Quantum Inspire backends (Tuna-5, Starmon-7, Spin-2+ each have different connectivity and native gate sets). RL-based synthesis for Pauli networks.
- Specific tool: An AI agent that automatically selects the best transpilation strategy for a given circuit on a given QI backend, learns from execution results, and improves over time.

Source: [Optimize quantum circuits with AI-powered transpiler passes (IBM)](https://www.ibm.com/quantum/blog/ai-transpiler-passes)

**C. Quantum Code Generation and Debugging**
- Problem: Quantum programming is error-prone. Our Qiskit HumanEval benchmark shows even the best LLMs achieve only 62.25% Pass@1. API version mismatches are the #1 error category.
- AI opportunity: Fine-tuned models for Qiskit 2.x, cQASM (Quantum Inspire's native language), and PennyLane. RAG systems with up-to-date documentation. QUASAR achieved 99.31% circuit validity with RAG.
- Specific tool: A coding assistant with Quantum Inspire SDK knowledge baked in, capable of writing correct cQASM/Qiskit code for QI backends and debugging failed jobs.

**D. VQE/Variational Algorithm Optimization**
- Problem: Barren plateaus, local minima, noise sensitivity. The optimization landscape is the main bottleneck.
- AI opportunity: Meta-learning the best optimizer for a given ansatz and hardware combination. Pre-computing initial parameters from classical approximations. Using AI to navigate the 50+ optimizer landscape.
- Specific tool: An AI assistant that suggests ansatz structures, initial parameters, and optimization strategies based on the target Hamiltonian and available hardware.

### Tier 2: High Impact, Emerging

**E. Automated Experiment Design on Real Hardware**
- Problem: Running experiments on quantum hardware involves many design choices (circuit depth, error mitigation strategy, number of shots, post-processing method). Most researchers use trial and error.
- AI opportunity: Bayesian optimization over experiment configurations. Learn from previous runs to suggest next experiments. Autonomous experimentation loops.
- Why QI-specific: Quantum Inspire's open architecture and multiple backends make it ideal for comparative automated experiments.

**F. Active Space Selection for Quantum Chemistry**
- Problem: Choosing which molecular orbitals to simulate on a quantum computer requires expert chemical intuition. Wrong choices waste quantum resources.
- AI opportunity: ML models trained on classical chemistry data to predict optimal active spaces. Could dramatically lower the barrier to quantum chemistry experiments.

**G. Noise Characterization and Mitigation**
- Problem: Each quantum processor has a unique noise profile that changes over time. Error mitigation techniques (ZNE, PEC, probabilistic error cancellation) need accurate noise models.
- AI opportunity: Continuous noise learning from calibration data. Adaptive error mitigation that adjusts in real-time. Transfer learning of noise models across similar devices.

### Tier 3: Longer-Term, Foundational

**H. Quantum Code Discovery**
- Problem: Finding new QEC codes, better magic state protocols, novel ansatz structures. Currently requires deep theoretical expertise.
- AI opportunity: AlphaEvolve-style evolutionary search for quantum codes. RL-based exploration of code spaces. This is speculative but high-ceiling.

**I. Classical Simulation Acceleration**
- Problem: Classical simulation (tensor networks, MPS, DMRG) is needed to validate quantum results and find the classical-quantum crossover point.
- AI opportunity: ML-enhanced tensor network contraction ordering. Neural network wavefunctions (FermiNet/PauliNet) as classical baselines. Faster classical simulation sharpens the quantum advantage question.

**J. Quantum Software Verification**
- Problem: Verifying quantum program correctness is fundamentally harder than classical (probabilistic outputs, exponential state spaces, entanglement dependencies, noise).
- AI opportunity: Formal verification tools assisted by AI. Property-based testing frameworks. Automated equivalence checking between ideal and transpiled circuits.

### Where Our Project Specifically Fits

Given that we're building an AI x Quantum research platform at TU Delft with access to Quantum Inspire 2.0:

1. **Immediate value**: Items C (code generation) and D (VQE optimization) -- we're already benchmarking LLM quantum code generation and replicating VQE experiments
2. **Unique contribution**: Items B and E -- hardware-specific circuit optimization and automated experiment design on QI's open-architecture, multi-backend platform
3. **Strategic positioning**: Items A and G -- decoder design and noise characterization for QuTech's spin qubit platform would be a novel contribution that leverages our hardware access advantage
4. **Publication opportunity**: Comparing AI-assisted vs. manual quantum experiment workflows on real hardware across multiple backends is a study nobody else can easily do

---

## Key Sources

### Quantum Error Correction
- [Google: Quantum error correction below the surface code threshold (Nature)](https://www.nature.com/articles/s41586-024-08449-y)
- [IBM: Clear path to fault-tolerant quantum computing](https://www.ibm.com/quantum/blog/large-scale-ftqc)
- [Riverlane: QEC 2025 trends and 2026 predictions](https://www.riverlane.com/blog/quantum-error-correction-our-2025-trends-and-2026-predictions)
- [Microsoft: Majorana 1 announcement](https://azure.microsoft.com/en-us/blog/quantum/2025/02/19/microsoft-unveils-majorana-1-the-worlds-first-quantum-processor-powered-by-topological-qubits/)
- [Photonic Inc: SHYPS qLDPC codes](https://photonic.com/blog/introducing-shyps/)

### Quantum Chemistry & Simulation
- [Quantum computers aid molecular simulation (The Quantum Insider)](https://thequantuminsider.com/2025/07/15/study-suggests-todays-quantum-computers-could-aid-molecular-simulation/)
- [Quantinuum: Scalable chemistry simulations](https://www.quantinuum.com/blog/unlocking-scalable-chemistry-simulations-for-quantum-supercomputing)
- [Quantum algorithms for quantum molecular systems (WIREs)](https://wires.onlinelibrary.wiley.com/doi/10.1002/wcms.70020)
- [Programmable simulations of molecules (Nature Physics)](https://www.nature.com/articles/s41567-024-02738-z)

### Quantum Advantage
- [Q-CTRL: 2025 year in review -- commercial quantum advantage](https://q-ctrl.com/blog/2025-year-in-review-realizing-true-commercial-quantum-advantage-in-the-international-year-of-quantum)
- [IBM: Scaling for quantum advantage](https://www.ibm.com/quantum/blog/qdc-2025)
- [Classical simulation challenges (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S2095927325010382)
- [Top quantum breakthroughs of 2025 (Network World)](https://www.networkworld.com/article/4088709/top-quantum-breakthroughs-of-2025.html)

### NISQ Algorithms
- [Optimization strategies for VQAs in noisy landscapes (arXiv)](https://arxiv.org/html/2506.01715v1)
- [Quantum optimization algorithms survey (arXiv)](https://arxiv.org/abs/2511.12379)
- [Barren plateaus in variational quantum computing (Nature Comms)](https://www.nature.com/articles/s41467-021-27045-6)

### Quantum Machine Learning
- [Quantum advantage for learning shallow neural networks (Nature Comms)](https://www.nature.com/articles/s41467-025-68097-2)
- [Trainability vs. dequantization (ICLR 2025)](https://openreview.net/forum?id=TdqaZbQvdi)
- [Dequantization via random Fourier features (Quantum Journal)](https://quantum-journal.org/papers/q-2025-02-20-1640/)
- [Quantum ML nears practicality (Phys.org)](https://phys.org/news/2025-12-quantum-machine-nears-partial-error.html)

### Hardware
- [Quantinuum 56-qubit trapped-ion computer](https://www.quantinuum.com/press-releases/quantinuum-launches-industry-first-trapped-ion-56-qubit-quantum-computer-that-challenges-the-worlds-best-supercomputers)
- [QuEra 2025 milestones](https://www.prnewswire.com/news-releases/quera-computing-marks-record-2025-as-the-year-of-fault-tolerance-and-over-230m-of-new-capital-to-accelerate-industrial-deployment-302635960.html)
- [Neutral atom quantum computing (IEEE Spectrum)](https://spectrum.ieee.org/neutral-atom-quantum-computing)
- [Silicon spin-qubit unit cells >99% fidelity (Nature)](https://www.nature.com/articles/s41586-025-09531-9)

### QuTech / Quantum Inspire
- [Quantum Inspire 2.0 launch](https://qutech.nl/2025/02/25/quantum-inspire-2-0-is-live-with-updated-software-and-hardware/)
- [Delft open-architecture quantum computer](https://qutech.nl/2025/05/15/delft-quantum-ecosystem-launches-open-architecture-quantum-computer/)
- [10-spin qubit array in germanium](https://qutech.nl/2025/11/27/from-complexity-to-control-a-10-spin-qubit-array-in-germanium/)
- [Spin qubits ride the wave](https://qutech.nl/2025/06/10/spin-qubits-ride-the-wave/)
- [Quantum-engineering germanium for quieter qubits](https://qutech.nl/2025/07/09/quantum-engineering-of-germanium-for-scaling-quieter-qubits/)
- [QuTech germanium quantum circuit demo (The Quantum Insider)](https://thequantuminsider.com/2025/02/19/qutech-demonstrates-first-of-its-kind-quantum-circuit-with-germanium-qubits/)
- [Quantum Inspire SDK (GitHub)](https://github.com/QuTech-Delft/quantuminspire2)
- [IEEE Spectrum: Architect of Quantum Inspire](https://spectrum.ieee.org/quantum-inspire-launches)

### AI for Quantum Computing
- [Artificial intelligence for quantum computing (Nature Comms)](https://www.nature.com/articles/s41467-025-65836-3)
- [NVIDIA and QuEra decode quantum errors with AI](https://developer.nvidia.com/blog/nvidia-and-quera-decode-quantum-errors-with-ai/)
- [AI is quantum computing's missing ingredient (The Quantum Insider)](https://thequantuminsider.com/2025/12/03/ai-is-emerging-as-quantum-computings-missing-ingredient-nvidia-led-research-team-asserts/)
- [IBM AI transpiler passes](https://www.ibm.com/quantum/blog/ai-transpiler-passes)
- [AlphaQubit (Google DeepMind)](https://blog.google/technology/google-deepmind/alphaqubit-quantum-error-correction/)
- [NVIDIA CUDA-Q QEC real-time decoding](https://developer.nvidia.com/blog/real-time-decoding-algorithmic-gpu-decoders-and-ai-inference-enhancements-in-nvidia-cuda-q-qec/)
- [RIKEN: Boosting QEC using AI](https://www.riken.jp/en/news_pubs/research_news/rr/20250509_2/index.html)

---

*Last updated: February 2026*
*Project: AI x Quantum -- TU Delft / Quantum Inspire*
*Repository: https://github.com/JDerekLomas/quantuminspire*
