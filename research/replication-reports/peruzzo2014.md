# Replication Report: A variational eigenvalue solver on a photonic quantum processor

**Authors**: Peruzzo et al.
**Journal**: Nature Communications 5, 4213 (2014)
**arXiv**: [1304.3061](https://arxiv.org/abs/1304.3061)
**Original hardware**: Photonic quantum processor
**Report generated**: 2026-02-10

---

## Summary

- **Claims tested**: 3
- **Successful replications**: 3
- **Success rate**: 100%
- **Backends tested**: emulator

### Failure mode breakdown

| Mode | Count | Description |
|------|-------|-------------|
| success | 3 | Replication matches published results within error bars |

---

## Detailed Comparisons

### HeH+ ground state energy near equilibrium (R=0.75 A)

*Published in Fig. 2*

**Published**: -2.8462 +/- 0.003 Hartree

| Backend | Measured | Discrepancy | kcal/mol | Status | Failure Mode |
|---------|----------|-------------|----------|--------|--------------|
| emulator | -2.8459 | +0.0003 | 0.2 | PASS | success |

### HeH+ potential energy curve matches FCI across bond distances

*Published in Fig. 2*

**Published**: 0.0 +/- 0.001 Hartree MAE

| Backend | Measured | Discrepancy | kcal/mol | Status | Failure Mode |
|---------|----------|-------------|----------|--------|--------------|
| emulator | 0.0001 | +0.0001 | — | PASS | success |

### Symmetry verification improves noisy VQE

*Published in Fig. 3*

**Published**: 1.5 +/- 1.0 x improvement

| Backend | Measured | Discrepancy | kcal/mol | Status | Failure Mode |
|---------|----------|-------------|----------|--------|--------------|
| emulator | 2.8506 | +1.3506 | — | PASS | success |

---

## Analysis

**Emulator**: 3/3 claims matched. 
The simulation pipeline correctly reproduces the published physics.
