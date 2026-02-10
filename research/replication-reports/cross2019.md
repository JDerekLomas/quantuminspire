# Replication Report: Validating quantum computers using randomized model circuits

**Authors**: Cross et al.
**Journal**: Phys. Rev. A 100, 032328 (2019)
**arXiv**: [1811.12926](https://arxiv.org/abs/1811.12926)
**Original hardware**: IBM superconducting (various)
**Report generated**: 2026-02-10

---

## Summary

- **Claims tested**: 3
- **Successful replications**: 3
- **Success rate**: 100%
- **Backends tested**: emulator, emulator_rb

### Failure mode breakdown

| Mode | Count | Description |
|------|-------|-------------|
| success | 3 | Replication matches published results within error bars |

---

## Detailed Comparisons

### 2-qubit QV circuits pass heavy output test (> 2/3)

*Published in Fig. 3*

**Published**: Yes

| Backend | Measured | Discrepancy | kcal/mol | Status | Failure Mode |
|---------|----------|-------------|----------|--------|--------------|
| emulator | Yes | match | — | PASS | success |

### 3-qubit QV circuits pass heavy output test (> 2/3)

*Published in Fig. 3*

**Published**: Yes

| Backend | Measured | Discrepancy | kcal/mol | Status | Failure Mode |
|---------|----------|-------------|----------|--------|--------------|
| emulator | Yes | match | — | PASS | success |

### Randomized benchmarking gives gate fidelity > 99%

*Published in Section III*

**Published**: 0.99 +/- 0.01 fidelity

| Backend | Measured | Discrepancy | kcal/mol | Status | Failure Mode |
|---------|----------|-------------|----------|--------|--------------|
| emulator | 0.9995 | +0.0095 | — | PASS | success |

---

## Analysis

**Emulator**: 3/3 claims matched. 
The simulation pipeline correctly reproduces the published physics.
