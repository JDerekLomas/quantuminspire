# Replication Report: Hardware-efficient variational quantum eigensolver for small molecules and quantum magnets

**Authors**: Kandala et al.
**Journal**: Nature 549, 242-246 (2017)
**arXiv**: [1704.05018](https://arxiv.org/abs/1704.05018)
**Original hardware**: 6-qubit superconducting transmon
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

### H2 ground state energy at equilibrium (R~0.7 A)

*Published in Fig. 3a*

**Published**: -1.1373 +/- 0.005 Hartree

| Backend | Measured | Discrepancy | kcal/mol | Status | Failure Mode |
|---------|----------|-------------|----------|--------|--------------|
| emulator | -1.1362 | +0.0011 | 0.7 | PASS | success |

### H2 potential energy curve tracks FCI (d=1 sufficient)

*Published in Fig. 3a*

**Published**: 0.0 +/- 1.6 mHartree MAE

| Backend | Measured | Discrepancy | kcal/mol | Status | Failure Mode |
|---------|----------|-------------|----------|--------|--------------|
| emulator | 0.0000 | +0.0000 | — | PASS | success |

### H2 achieves chemical accuracy at d=1

*Published in Fig. 3a / Supp.*

**Published**: Yes

| Backend | Measured | Discrepancy | kcal/mol | Status | Failure Mode |
|---------|----------|-------------|----------|--------|--------------|
| emulator | Yes | match | — | PASS | success |

---

## Analysis

**Emulator**: 3/3 claims matched. 
The simulation pipeline correctly reproduces the published physics.
