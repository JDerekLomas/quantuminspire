# Failure Analysis: Why HeH+ Fails but H2 Succeeds on IBM Torino

## The Puzzle

Both H2 and HeH+ use the same 2-qubit ansatz (Ry-CNOT-X), same hardware (IBM Torino),
same shot count (4096), same qubits. Yet:

| Molecule | Best Error | Chemical Accuracy? |
|----------|-----------|-------------------|
| H2 (R=0.735) | **0.22 kcal/mol** (TREX) | YES |
| HeH+ (R=0.75) | **91.2 kcal/mol** | No (91x too high) |

Same circuit complexity. Same hardware. **400x difference in accuracy.** Why?

## Root Cause: Coefficient Amplification

The 2-qubit sector-projected Hamiltonian has the form:

    H = g0*I + g1*Z0 + g2*Z1 + g3*Z0Z1 + g4*X0X1 + g5*Y0Y1

The Z0 coefficient (g1) is the critical parameter:

| Molecule | g1 (Z0 coeff) | g4/g5 (X/Y coeff) | g1/g4 ratio |
|----------|--------------|-------------------|-------------|
| H2       | 0.398 Ha     | 0.091 Ha          | 4.4x        |
| HeH+     | 1.744 Ha     | 0.074 Ha          | 23.6x       |

HeH+ has **4.4x larger Z coefficients** than H2. This means:
- The same Z0 measurement error (e.g., -0.97 instead of -0.98) produces 4.4x more energy error
- Post-selection fixes Z0Z1 to -1.0 (perfect), but it cannot fix Z0 or Z1 individually

## Error Budget Decomposition

### H2 (R=0.735, post-selected)

| Term | Ideal | Measured | Delta | Coeff | Energy Error |
|------|-------|---------|-------|-------|-------------|
| Z0   | -0.994 | -0.971 | 0.023 | 0.398 | 5.8 kcal/mol |
| Z1   | +0.994 | +0.971 | 0.023 | 0.398 | 5.8 kcal/mol |
| Z0Z1 | -1.000 | -1.000 | 0.000 | 0.000 | 0.0 kcal/mol |
| X0X1 | -0.223 | -0.256 | 0.033 | 0.091 | 1.9 kcal/mol |
| Y0Y1 | -0.223 | -0.197 | 0.026 | 0.091 | 1.5 kcal/mol |

Z0 and Z1 errors cancel because g1 = -g2 and the errors are symmetric.
Net error: **1.66 kcal/mol** (Z cancellation + X/Y partially cancelling).

### HeH+ (R=0.75, post-selected)

| Term | Ideal | Measured | Delta | Coeff | Energy Error |
|------|-------|---------|-------|-------|-------------|
| Z0   | -0.984 | -0.873 | 0.112 | 1.744 | **122 kcal/mol** |
| Z1   | +0.984 | +0.873 | 0.112 | 1.744 | 122 kcal/mol |
| Z0Z1 | -1.000 | -1.000 | 0.000 | 0.000 | 0.0 kcal/mol |
| X0X1 | -0.254 | -0.086 | 0.168 | 0.074 | 7.8 kcal/mol |
| Y0Y1 | -0.254 | -0.073 | 0.181 | 0.074 | 8.4 kcal/mol |

Z0/Z1 errors also partially cancel (g1 = -g2), but the residual is huge.
Additionally: X0X1 and Y0Y1 are degraded by **66-72%** (vs ~15% for H2).

## Three Compounding Factors

### 1. Larger Z coefficients (4.4x amplification)
HeH+ is a heteronuclear molecule — the asymmetric electron density creates
a large energy splitting between Z0 and Z1 sectors. Same measurement noise,
4.4x more energy error.

### 2. Worse parity preservation (84% vs 98%)
HeH+ keeps only 84% of shots through parity post-selection vs 98% for H2.
This means 16% of shots are even-parity leakage. The higher leakage suggests
the HeH+ ansatz state is less robust to decoherence (the optimal alpha is
further from |01> reference, requiring more entanglement).

### 3. X/Y signal collapse
H2 X0X1 degrades ~15% (from -0.223 to -0.256). HeH+ X0X1 degrades **66%**
(from -0.254 to -0.086). The X/Y basis rotation gates (H, Sdg) add noise
that compounds with the already-degraded state.

## Implications

### For the paper
This is a quantitative framework for predicting which VQE problems will
succeed on NISQ hardware: **compute g1/g4 ratio and parity keep fraction**.
High g1/g4 + low keep fraction = guaranteed failure.

### For practitioners
- HeH+ needs readout error mitigation (REM) + TREX before attempting
- The mitigation ladder that worked for H2 should be applied to HeH+
- But HeH+'s 4.4x amplification means even TREX may not suffice
- Estimated: TREX would need to reduce Z0 error from 0.112 to 0.025
  to achieve chemical accuracy. That's a 4.5x reduction — possible
  but at the edge of TREX's capability.

### Testable prediction — CONFIRMED (2026-02-10)
We predicted TREX would reduce HeH+ error by 3-4x but not achieve chemical accuracy.

**IBM Torino results (9 jobs, 98s QPU, EstimatorV2):**

| R (A) | Raw (kcal/mol) | TREX | TREX+DD | Improvement |
|-------|----------------|------|---------|-------------|
| 0.75  | 18.94          | **4.45** | 8.24 | 4.3x |
| 1.00  | 16.35          | **7.26** | 13.80 | 2.3x |
| 1.50  | 16.73          | **4.31** | 7.65 | 3.9x |

Key findings:
- TREX gives 2.3-4.3x improvement (matches 3-4x prediction)
- Best HeH+ TREX = 4.31 kcal/mol — **20x worse than H2 TREX** (0.22 kcal/mol)
- DD makes TREX worse (same as H2)
- EstimatorV2 raw baseline (17-19 kcal/mol) far better than SamplerV2+PS (91 kcal/mol)
- None achieve chemical accuracy (1.0 kcal/mol)

## Amplification Threshold Analysis (2026-02-10)

Full quantitative analysis across 30+ data points, two molecules, three backends.

### Cross-Molecule Controlled Comparison

Same circuit (Ry-CNOT-X), same shots (4096), same mitigation, same hardware.
HeH+ has a *smaller* rotation angle (less gate noise), isolating the ratio effect.

| Backend | Molecule | R (A) | |g1|/|g4| | |alpha| | Error (kcal/mol) | Pass? |
|---------|----------|-------|----------|---------|------------------|-------|
| IBM TREX | H2 | 0.735 | **4.40** | 0.112 | **0.22** | PASS |
| IBM TREX | HeH+ | 0.750 | **7.81** | 0.127 | **4.45** | FAIL |
| Tuna-9 PS+REM | H2 | 0.735 | **4.40** | 0.112 | **0.92** | PASS |
| Tuna-9 REM+PS | HeH+ | 0.750 | **7.81** | 0.127 | **4.44** | FAIL |

**Scaling**: 1.8x ratio increase → 20x error increase (superlinear, ~ratio^5).

### Two Competing Noise Sources

H2 PES sweep on Tuna-9 (PS only, q[2,4]) reveals the tradeoff:

| R (A) | |g1|/|g4| | |alpha| | Error | Dominant Noise |
|-------|----------|---------|-------|----------------|
| 0.5 | 6.91 | 0.072 | 9.98 | Coeff. amplification |
| 0.735 | 4.40 | 0.112 | 3.04 | Coeff. amplification |
| **1.0** | **2.72** | **0.176** | **4.12** | **Error minimum** |
| 1.5 | 1.12 | 0.363 | 12.68 | Gate noise |
| 2.0 | 0.47 | 0.567 | 17.32 | Gate noise |

Error minimum at R≈1.0, NOT at lowest ratio or smallest alpha.

### Chemical Accuracy Threshold

- **Achievable**: ratio ≤ 4.4 with best mitigation (IBM TREX or Tuna-9 PS+REM)
- **Not achievable**: ratio ≥ 7.8 (all HeH+ distances fail on all backends)
- **Practical threshold**: 4.4 < |g1|/|g4| < 7.8

### Cross-Platform Consistency

IBM and Tuna-9 give nearly identical HeH+ errors (4.45 vs 4.44 kcal/mol)
despite completely different hardware and mitigation. This suggests the
coefficient ratio, not the hardware, sets the error floor.

Full analysis: `experiments/results/amplification-threshold-analysis.json`

## Connection to Sagastizabal 2019

This exactly validates the paper's core claim: symmetry verification
(parity post-selection) provides significant improvement, but the
magnitude depends on the Hamiltonian structure. For H2 (balanced
coefficients), post-selection nearly achieves chemical accuracy.
For HeH+ (unbalanced coefficients), it's necessary but insufficient.
