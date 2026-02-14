# VQE Experiments Session — 2026-02-12

## What was done

Hybrid classical-quantum VQE experiments on two molecules across three platforms.

### H2 (2 qubits)
- Classical VQE simulation with PES (15 bond distances)
- Ran on IBM Fez (89.2% correlation, 151 mHa error), IBM Torino (71.9%, 392 mHa), QI emulator (99.9%, 1.3 mHa)
- Full H2 PES on QI emulator: 45 circuits, 10/15 within chemical accuracy

**Replication caveats:** Cites O'Malley et al. (2016) and Kandala et al. (2017) but replicates neither. O'Malley used trapped ions with post-selection; Kandala used ibmqx4 with a hardware-efficient ansatz (Rz-Ry-Rz, not UCCSD) and Richardson extrapolation. Our experiment uses a UCCSD circuit on modern IBM Heron with no error mitigation — a third, distinct setup. The Hamiltonian coefficients are borrowed from O'Malley but not independently derived. More accurately described as "standard textbook H2 VQE on modern hardware" than a replication.

**Next steps to make it a real replication:**
- Derive H2 coefficients from first principles (PySCF pipeline, as done for LiH) instead of hard-coding from a table
- Implement Richardson extrapolation (Kandala's method): run at 1x, 1.5x, 2x CNOT stretch factors, extrapolate to zero noise
- Or implement post-selection (O'Malley's method): discard shots that violate particle-number symmetry
- Compare error-mitigated results against the original papers' reported values at matching bond distances

### LiH (4 qubits)
- Hamiltonian computed from first principles: PySCF + OpenFermion, CASCI(2,2) active space
- 27 Pauli terms, 9 measurement circuits (Z + 4 two-qubit rotations + 4 four-qubit rotations)
- Hardware-efficient ansatz: 2x(Ry layer + CNOT chain), 8 parameters
- QI emulator: 0.2 mHa error (chemical accuracy vs CASCI target)
- IBM Fez: 354 mHa error, 81% Z-basis fidelity
- CASCI(2,2) only captures 1.3% of full correlation — active space too small

**Replication caveats:** Implicitly follows Kandala et al. (2017), which also did LiH on 4 qubits, but diverges in three key ways. (1) Active space is minimal: CASCI(2,2) captures 0.264 of 20.5 mHa total correlation (1.3%). The "chemical accuracy" claim for QI (0.2 mHa) is accuracy vs. the tiny active-space target, not the true molecular ground state — which is 20.2 mHa away regardless of hardware quality. (2) Ansatz uses only Ry rotations (1 angle/qubit/layer), not full SU(2) Rz-Ry-Rz (3 angles/qubit/layer) as in Kandala. Works here only because the active space is so small. (3) Uses Jordan-Wigner mapping; Kandala used parity mapping with 2-qubit reduction, producing different circuits. The integral pipeline (PySCF + OpenFermion) is correct, verified by FCI matching CASCI. The energy offset between active-space and molecular frames is handled via an empirical difference rather than derived from Hamiltonian construction, which obscures the physics.

**Next steps to make it a real replication:**
- Expand active space to CASCI(4,4) or (6,6) — needs 8-12 qubits but captures meaningful correlation
- Switch to parity mapping with 2-qubit reduction (matches Kandala, potentially fewer qubits)
- Use full SU(2) rotations in the ansatz (Rz-Ry-Rz per qubit per layer)
- Derive the active-space↔molecular energy offset analytically from the IIII coefficient rather than empirically
- Run at multiple bond distances to produce a dissociation curve (the key result in Kandala)

### LiH TREX (EstimatorV2, resilience_level=1)
- IBM Fez job: d66r8ohv6o8c73d4lj80 (27 PUBs, DONE)
- TREX energy: -7.703 Ha (160 mHa error vs CASCI target)
- Raw Sampler was 354 mHa → TREX is 2.2x better
- TREX fixes readout (ZIII: -0.867 → -0.999) but not gate errors (IZII: -0.859 → -0.902)
- NOT chemical accuracy — gate errors from 3 CNOTs dominate

**Replication caveats:** TREX (readout twirling) is not the error mitigation used in any cited paper. O'Malley used post-selection; Kandala used Richardson extrapolation (ZNE). TREX only corrects measurement errors, not gate errors. For circuits with 3 CNOTs, gate errors account for ~50% of total error, which is why TREX hits a 160 mHa floor. The raw vs. TREX comparison is a valid A/B test of readout mitigation, but doesn't address the dominant error source and doesn't replicate published mitigation strategies.

**Next steps for meaningful error mitigation:**
- Implement ZNE via EstimatorV2 with `resilience_level=2` (digital ZNE: amplify noise by inserting identity-equivalent gate pairs, extrapolate to zero)
- Or implement PEC (`resilience_level=3`) for exact cancellation at the cost of sampling overhead
- Compare ZNE results against Kandala's reported Richardson extrapolation improvements
- Combine with the expanded active space from LiH next steps above — fixing mitigation on a toy active space has limited scientific value

## Key files
### Original experiments
- `experiments/h2_vqe.py` — H2 classical simulation (hard-coded coefficients)
- `experiments/h2_vqe_compare.py` — H2 Fez vs Torino
- `experiments/lih_vqe.py` — LiH from first principles (Ry-only ansatz)
- `experiments/lih_circuits.json` — 9 OpenQASM circuits + Hamiltonian data
- `experiments/lih_compare.py` — LiH three-way comparison
- `experiments/lih_ibm_analyze.py` — IBM-only analysis
- `experiments/lih_trex.py` — LiH TREX via EstimatorV2
- `experiments/lih_trex_results.json` — TREX results (per-term + total)

### Replication scripts (new)
- `experiments/h2_replication.py` — H2 from first principles, SU(2) ansatz, 15 distances
- `experiments/h2_replication_output.json` — H2 results + circuits
- `experiments/lih_replication.py` — LiH Kandala-style, SU(2) ansatz, 12 distances
- `experiments/lih_replication_output.json` — LiH results + circuits
- `experiments/lih_zne.py` — LiH ZNE submission to IBM (not yet run)

### Infrastructure
- `mcp-servers/qi-circuits/qi_server.py` — Modified QI MCP server (monkey-patch for image_id)

## IBM Job IDs (for reference)
### H2 (corrected circuits, ibm_fez)
- Z: completed, X: completed, Y: completed

### LiH (ibm_fez, all completed)
- Z: d66qn7je4kfs73d12fjg
- q0Y_q2Y: d66qn88qbmes739ei1k0
- q0X_q2X: d66qn8oqbmes739ei1kg
- q1Y_q3Y: d66qn9gqbmes739ei1n0
- q1X_q3X: d66qna3e4kfs73d12fp0
- q0Y_q1X_q2X_q3Y: d66qnare4kfs73d12fqg
- q0Y_q1Y_q2X_q3X: d66qnblbujdc73cv4090
- q0X_q1X_q2Y_q3Y: d66qnc9v6o8c73d4kpcg
- q0X_q1Y_q2Y_q3X: d66qnd9v6o8c73d4kpf0

## Lessons learned
- cQASM 3.0: `Ry(angle) q[0]` not `Ry q[0], angle`; need `bit[N] b; b = measure q`
- qxelarator: call `qxelarator.execute_string()` directly, QI's LocalBackend wrapper is buggy
- IBM bitstring: "abcd" = q3(MSB) q2 q1 q0(LSB), same convention for QI
- IBM Fez consistently outperforms Torino for these circuits
- PySCF `mc.get_h2eff()` returns 2D packed integrals; use `ao2mo.restore(1, h2e, norb)` for 4D
- qiskit 1.2.4 + qiskit-ibm-runtime 0.45.0: `transpile()` needs `translation_method='translator'` (ibm_dynamic_circuits plugin not found)
- SparsePauliOp uses reversed qubit order: our "ZIII" (Z on q0) = Qiskit "IIIZ"
- TREX (resilience_level=1) only fixes readout errors — for 3+ CNOTs, gate errors dominate

## Replication scripts (new, 2026-02-12)

Created three new scripts that address the replication gaps identified above:

### h2_replication.py — H2 from first principles
- Derives H2 Hamiltonian at 15 bond distances via PySCF + OpenFermion (no hard-coded coefficients)
- 4-qubit Jordan-Wigner mapping, SU(2) ansatz (Ry+Rz, depth=2, 20 params), 30 random starts
- Classical VQE converges to 0.000 mHa for R=0.2–1.5 and R=2.5–3.0
- **R=2.0 still fails** (24 mHa) — deep strong-correlation regime, COBYLA gets stuck
- O'Malley comparison: their 2-qubit BK-tapered Hamiltonian has a different encoding than our 4-qubit JW, so absolute eigenvalues differ by ~1 Ha. FCI validated against PySCF directly.
- Generates IBM (OpenQASM) and QI (cQASM) circuits with measurement basis rotations
- Post-selection function ready for hardware error mitigation
- Output: `experiments/h2_replication_output.json`

### lih_replication.py — LiH Kandala-style dissociation curve
- 12 bond distances (R=0.5–4.0 Å) matching Kandala Fig. 3 range
- SU(2) ansatz (Ry+Rz per qubit, depth=2, 20 params) matching Kandala's structure
- Corrected integral pipeline: `transpose(0,2,3,1)` + `spinorb_from_spatial` + `0.5*two_body`
- VQE converges well: max error 1.5 mHa at R=3.0 (where CASCI(2,2) captures only 18% of correlation)
- At equilibrium (R=1.6): VQE error = 0.057 mHa
- CAS/FCI coverage ranges from 0.8% (equilibrium) to 78% (dissociation limit)
- Generates circuits at all 12 distances for hardware submission
- Output: `experiments/lih_replication_output.json`

### lih_zne.py — LiH ZNE submission to IBM
- Reads optimized params from lih_replication_output.json
- Submits to IBM Fez with EstimatorV2 `resilience_level=2` (ZNE)
- Modern equivalent of Kandala's Richardson extrapolation
- Per-term expectation value analysis + comparison with previous TREX results
- **Submitted:** job `d66seq0qbmes739ek700` on ibm_fez, 27 PUBs, currently QUEUED
- Transpiled circuit: depth 27, 32 Rz + 28 Sx + 6 CZ gates

## Remaining gaps

### What's now replicated
- H2 and LiH Hamiltonians derived from first principles (PySCF + OpenFermion)
- SU(2) hardware-efficient ansatz matching Kandala's structure
- Dissociation curves at multiple bond distances
- Post-selection (O'Malley) and ZNE (Kandala) error mitigation ready

### What's still different from the cited papers
- **Qubit mapping:** Jordan-Wigner (4 qubits) vs Kandala's parity with 2-qubit reduction
- **Active space:** CASCI(2,2) captures minimal correlation — OK for demonstrating method, not for chemical predictions
- **Hardware:** IBM Heron (Fez/Torino) vs Kandala's ibmqx4 Canary — modern hardware is better but has different error profiles
- **Ansatz depth:** We use depth=2 (6 CNOTs); Kandala used depth=3 (9 CNOTs) — more depth = more expressivity but more gate errors
- **H2 at R=2.0:** VQE still fails (24 mHa), likely needs more optimizer starts or depth=3

### Next steps
- Retrieve LiH ZNE results when job `d66seq0qbmes739ek700` completes
- Submit H2 to QI Tuna-9 emulator and hardware for cross-platform comparison
- Consider depth=3 for H2 at R=2.0 (or accept it as a known limitation)
- Consider parity mapping with tapering for a closer Kandala match

## Batch Hardware Experiments — 2026-02-13

### Completed experiments on QI Tuna-9 (32 jobs, all COMPLETED)

#### QV=16 (Cross 2019) — CERTIFIED
- 10 random SU(4) circuits, 4 qubits (q4,q6,q7,q8), 4 layers, 8 CNOTs each
- 8/10 pass (HOF > 2/3), mean HOF = 0.7084 +/- 0.0423
- 2-sigma lower bound 0.6816 > threshold 0.6667
- First QV=16 result for Tuna-9
- Jobs: 425239-425266
- Results: `experiments/results/qv16-tuna9-hardware.json`
- Report updated: `research/replication-reports/cross2019.json`

#### Kicked Ising 12-edge (Kim 2023)
- Full 12-edge Tuna-9 topology (vs prior 10-edge), Clifford point
- Mz decay: d1=0.913, d3=0.767, d5=0.657
- ZNE (fold 1,3): extrapolated Mz=1.011, 8.0x improvement (best hardware ZNE result)
- Prior 10-edge was 3.1x; 12 edges give more uniform noise amplification
- Jobs: 425203-425208
- Results: `experiments/results/kim2023-ising-tuna9-hardware.json`
- Report updated: `research/replication-reports/kim2023.json`

#### QAOA MaxCut on 4-cycles (Harrigan 2021) — FAILED
- 3 circuits on two 4-cycle subgraphs: cycle_a (q4-q6-q8-q7), cycle_b (q2-q4-q7-q5)
- All ratios ~0.34, below random baseline 0.50
- T1 decay biases toward |0000> (0 cuts), pulling ratio below random
- 8+ CNOTs exceed Tuna-9 noise budget; p=2 (16 CNOTs) even worse
- Emulator achieves 0.75 on same cycles — confirms hardware noise as cause
- Jobs: 425280-425282
- Results: `experiments/results/qaoa-tuna9-hardware.json`
- Report updated: `research/replication-reports/harrigan2021.json`

#### VQE H2 PS+REM repeatability (Sagastizabal 2019)
- 5 identical runs for statistical analysis (PS only, no confusion-matrix calibration)
- Mean energy: -1.099 Ha, error 38.13 mHa, std 16.97 mHa
- NOT chemical accuracy — confirms REM calibration is essential (0.92 kcal/mol WITH vs 23.9 kcal/mol WITHOUT)
- Run 004 was outlier (66 mHa), runs 005-008 better (22-39 mHa)
- Jobs: 425234-425279
- Results: `experiments/results/vqe-tuna9-rem-004-008.json`
- Report updated: `research/replication-reports/sagastizabal2019.json`

### Key analysis scripts
- `experiments/analyze_batch1.py` — Ising 12-edge, VQE REM-004, QV c0/c1
- `experiments/analyze_batch2.py` — All remaining: QV c2-c9, VQE 005-008, QAOA

#### Watson 2018 Replication (Bell, Deutsch-Josza, Grover)
- **Paper:** Watson et al., "A programmable two-qubit quantum processor in silicon", Nature 555, 633-637 (2018)
- **Original:** Si/SiGe spin qubits at QuTech/TU Delft — 2 qubits
- **Our platform:** Tuna-9 superconducting transmons, best pair q[4]-q[6] (93.5% Bell fidelity)
- **20 circuits total:** 12 Bell tomography (4 states x ZZ/XX/YY) + 4 Deutsch-Josza + 4 Grover
- **Critical bug found & fixed:** qxelarator/QI bitstring convention is MSB-first (bs[0]=q_{n-1}), not LSB-first. Prior VQE experiments used total observables (sum over all qubits) which are convention-independent, masking this. Discovered by running known Bell states and checking which bits flip.

**Results — Bell State Tomography:**
| State | ZZ | XX | YY | Fidelity | Concurrence |
|-------|------|------|------|----------|-------------|
| Phi+ | +0.780 | +0.790 | -0.742 | 0.828 | 0.656 |
| Phi- | +0.786 | -0.739 | +0.708 | 0.808 | 0.617 |
| Psi+ | -0.801 | +0.794 | +0.772 | 0.842 | 0.684 |
| Psi- | -0.805 | -0.813 | -0.741 | 0.840 | 0.680 |
| **Mean** | | | | **0.829** | **0.659** |
| Watson | | | | 0.85-0.89 | 0.73-0.82 |

- Tuna-9 slightly below Watson. Expected: Watson's chip was purpose-built for 2-qubit experiments; Tuna-9 uses 2 of 9 qubits on a general-purpose processor.
- YY correlators consistently weakest → suggests phase coherence (T2*) is the limiting factor.

**Results — Deutsch-Josza:**
- 4/4 correct (matches Watson)
- Constant oracles: P(correct) = 99.3-99.6%
- Balanced oracles: P(correct) = 87.1-87.3%
- Mean success probability: 93.3%

**Results — Grover Search:**
| Target | P(target) | Watson |
|--------|-----------|--------|
| \|00> | 89.8% | ~80% |
| \|01> | 91.4% | ~80% |
| \|10> | 87.5% | ~80% |
| \|11> | 88.0% | ~80% |
| **Mean** | **89.2%** | **~80%** |

- **Tuna-9 EXCEEDS Watson's silicon results by ~9 percentage points.** The Grover circuit has 5 CNOTs (oracle + diffusion); superconducting 2-qubit gates accumulate less error than Si/SiGe exchange gates over this depth.
- Interesting asymmetry: targets requiring q6=1 (01, 11) slightly lower — q6 has higher error rate than q4.

**Key insight:** Platform comparison reveals that superconducting transmons outperform Si/SiGe spin qubits for multi-gate algorithms (Grover) but not for single-gate entanglement (Bell states). This makes physical sense: superconducting gates are individually noisier but faster, so cumulative decoherence over many gates can be lower.

- Jobs: 425359-425378
- Scripts: `experiments/watson2018_replication.py` (circuit generation + emulator), `experiments/watson2018_analyze.py` (hardware analysis)
- Results: `experiments/results/watson2018-tuna9-hardware.json`
- Report: `research/replication-reports/watson2018.json`

#### LiH CASCI(4,4) 8-Qubit VQE (emulator, COMPLETED)
- Expanded active space: CASCI(4,4) → 8 qubits, 193 Pauli terms, 85 measurement circuits
- CASCI(4,4) captures 1.2 of 20.5 mHa correlation (5.8%) — still small but 5x more than CASCI(2,2)
- VQE converged: 0.176 mHa error (chemical accuracy)
- HF reference state: |00001111> (occupied qubits [4,5,6,7])
- 14 CNOTs per circuit, 40 variational parameters
- **Emulator result: 1.3 mHa error** (chemical accuracy on emulator!)
- Post-selection hurts (5.6 mHa) — discards 69% of shots, statistical noise > filtering benefit at 8 qubits
- Script: `experiments/lih_8qubit_vqe.py`
- Results: `experiments/results/lih-8qubit-vqe-emulator.json`

**Critical bitstring convention lesson:**
- The initial emulator run gave 6019 mHa error due to incorrect bitstring indexing
- OpenFermion Pauli labels use qubit 0 = MSB of state vector = bitstring[0] in MSB-first ordering
- Physical qubit 0 = LSB = bitstring[-1] in MSB-first ordering
- For OpenFermion-labeled code: `bitstring[q]` is correct (NOT `bitstring[-(q+1)]`)
- For physical-qubit-labeled code (Ising, Bell tests): `bitstring[-(q+1)]` is correct
- This dual convention is now documented in MEMORY.md

### Pending
- IBM ZNE job `d66seq0qbmes739ek700` — quota exceeded, pending
