# Comprehensive Benchmarking of the Quantum Inspire Tuna-9 Superconducting Processor

**Target venues:** Quantum (open access), Physical Review A, or Physical Review Applied

## Abstract
We present a comprehensive benchmarking study of the Quantum Inspire Tuna-9, a 9-qubit superconducting transmon processor. Our evaluation spans four complementary protocols: quantum volume certification, single-qubit randomized benchmarking, variational quantum eigensolver with error mitigation, and a true hybrid classical-quantum optimization loop. We certify QV=16 with high confidence (mean heavy output fraction 0.757, 97/100 circuits passing). Using readout error mitigation and zero-noise extrapolation on H2 molecular energy calculations, we demonstrate [X] mHa accuracy at equilibrium bond length, approaching chemical accuracy. To our knowledge, this is the first comprehensive benchmarking study of a publicly accessible European quantum processor combining application-level and gate-level characterization.

## 1. Introduction
- Quantum processor benchmarking: need for standardized, reproducible characterization
- Gap: most benchmarking studies focus on IBM/Google/IonQ; European processors underrepresented
- Quantum Inspire platform: publicly accessible, free, European (QuTech/TU Delft)
- Tuna-9: 9-qubit superconducting transmon, star+ring topology
- Our contribution: first comprehensive study combining QV + RB + VQE + hybrid VQE + error mitigation
- All code and data publicly available (reproducibility)

## 2. The Tuna-9 Processor
### 2.1 Architecture
- 9 superconducting transmon qubits
- Star topology: q0 central hub, q1-q8 on ring
- Native gate set: CZ, Ry(θ), Rz(φ), X
- Connectivity graph (figure)
- cQASM 3.0 programming interface

### 2.2 Qubit Characterization (from RB)
- T1, T2 (if available from QI specs)
- Single-qubit gate fidelities from RB (9 qubits)
- Error per Clifford, depolarizing parameter
- Identification of best qubit pairs/subgraphs

## 3. Quantum Volume Certification
### 3.1 Protocol
- Cross et al. 2019 standard
- 100 random 4-qubit circuits, depth 4
- Physical qubits: q4, q6, q7, q8 (best 4-cycle subgraph)
- Native gate compilation (no server-side transpilation)
- 1024 shots per circuit

### 3.2 Results
- QV=16 certified: mean HOF = 0.757, 2σ lower = 0.746 >> 2/3
- 97/100 circuits pass individually
- HOF distribution (figure)
- Comparison with other processors at similar qubit counts

## 4. Single-Qubit Randomized Benchmarking
### 4.1 Protocol
- Standard Clifford RB on all 9 qubits independently
- 24 single-qubit Cliffords via BFS from {H, S, X}
- ZYZ decomposition to native Ry/Rz gates
- Sequence lengths: [1, 4, 8, 16, 32, 64], 5 random seeds each
- 1024 shots per circuit

### 4.2 Results
- Survival probability vs sequence length (figure)
- Per-qubit EPC and average gate fidelity (table)
- Best/worst qubit identification
- Correlation with QV performance

## 5. Variational Quantum Eigensolver for H2
### 5.1 Molecular Setup
- H2 in STO-3G basis, Jordan-Wigner mapping
- 2-qubit reduction via particle number conservation
- Sagastizabal parametrization: single variational parameter α
- 3 measurement bases (Z, X, Y) for 5 Pauli terms
- Physical qubits: q4, q6 (best CZ pair)

### 5.2 Circuit Construction
- Native gate compilation: X, Ry(α), Ry(-π/2), CZ, basis rotations
- 1 CZ gate per circuit (minimal entangling depth)
- Measurement in X/Y bases via Ry/Rz rotations

### 5.3 Error Mitigation
#### 5.3.1 Readout Error Mitigation (REM)
- Confusion matrix calibration (4 computational basis states)
- Matrix inversion with positivity constraint
- Condition number 1.08 (well-conditioned)
- Readout errors: q4 P(1|0)=1.8%, P(0|1)=1.7%; q6 P(1|0)=1.4%, P(0|1)=2.4%

#### 5.3.2 Zero-Noise Extrapolation (ZNE)
- Local CZ gate folding: fold factors 1, 3, 5
- CZ self-inverse: CZ^(2k+1) = CZ
- Richardson extrapolation: linear (f=1,3) and quadratic (f=1,3,5)
- Combined REM+ZNE pipeline

### 5.4 Results
#### Pre-optimized parameters (dissociation curve)
- 7 bond distances (0.5–2.0 Å), 5 independent repetitions
- Raw vs REM vs REM+ZNE accuracy (figure: mitigation ladder)
- Error bars from statistical repetitions
- Best result: R=0.735 at [X] mHa (REM+ZNE)

#### Hybrid VQE (closed-loop optimization)
- COBYLA optimizer with hardware-in-the-loop
- Convergence trajectory (figure)
- Final energy vs pre-optimized result
- Number of hardware calls to convergence
- Comparison: hybrid loop vs pre-optimized parameters

### 5.5 Comparison with IBM Quantum
- Same circuits on IBM Fez (156-qubit Heron)
- IBM Torino comparison
- TREX (twirled readout error extinction) vs our REM
- Gate noise vs readout noise decomposition

## 6. Discussion
### 6.1 Error Budget
- Readout vs gate error contributions
- REM improvement quantified
- ZNE improvement quantified
- Residual error attribution (gate noise, crosstalk, decoherence)

### 6.2 Platform Comparison
- Tuna-9 vs IBM free tier: accessibility, queue times, noise levels
- QV=16 in context: where does Tuna-9 sit among current processors?
- European quantum computing landscape

### 6.3 Limitations
- 9-qubit system limits scalability studies
- No native two-qubit RB (limited connectivity)
- No dynamical decoupling or pulse-level access
- Calibration drift between runs

## 7. Conclusion
- First comprehensive benchmarking of Tuna-9
- QV=16 certified, gate fidelities characterized
- VQE with stacked error mitigation approaches chemical accuracy
- True hybrid VQE loop demonstrated
- All code/data open source for reproducibility

## Figures
1. Tuna-9 topology and connectivity graph
2. QV=16: HOF distribution histogram
3. RB: survival probability curves for all 9 qubits
4. H2 dissociation curve: raw vs REM vs REM+ZNE vs exact
5. Error mitigation ladder: stacked improvements per bond distance
6. Hybrid VQE convergence trajectory
7. Platform comparison table (Tuna-9 vs IBM Fez vs literature)

## Tables
1. Single-qubit gate fidelities (all 9 qubits from RB)
2. QV certification summary
3. VQE energy errors at all bond distances (raw, REM, ZNE)
4. Comparison with other small-qubit benchmarking studies

## Data/Code Availability
- All experiment scripts, raw counts, and analysis code on GitHub
- Reproducible pipeline: submit → poll → analyze
- Hamiltonian coefficients from PySCF + OpenFermion
