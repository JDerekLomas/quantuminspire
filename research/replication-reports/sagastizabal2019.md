# Replication Report: Error Mitigation by Symmetry Verification on a VQE

**Authors**: Sagastizabal et al.
**Journal**: Phys. Rev. A 100, 010302(R) (2019)
**arXiv**: [1902.11258](https://arxiv.org/abs/1902.11258)
**Original hardware**: 2-qubit transmon (Starmon-5)
**Report generated**: 2026-02-10

---

## Summary

- **Claims tested**: 4
- **Successful replications**: 2
- **Success rate**: 50%
- **Backends tested**: emulator, tuna9

### Failure mode breakdown

| Mode | Count | Description |
|------|-------|-------------|
| noise_dominated | 1 | Hardware noise overwhelms the signal |
| partial_noise | 1 | Hardware noise degrades result but qualitative behavior preserved |
| success | 2 | Replication matches published results within error bars |

---

## Detailed Comparisons

### H2 ground state energy at equilibrium (R=0.735 A)

*Published in Fig. 2*

**Published**: -1.1373 +/- 0.002 Hartree

| Backend | Measured | Discrepancy | kcal/mol | Status | Failure Mode |
|---------|----------|-------------|----------|--------|--------------|
| emulator | -1.1385 | -0.0012 | 0.75 | PASS | success |
| tuna9 | -1.0045 | +0.1328 | 83.35 | FAIL | noise_dominated |

### Symmetry verification reduces VQE error vs raw noisy measurement

*Published in Fig. 3*

**Published**: 2.0 +/- 1.0 x improvement

| Backend | Measured | Discrepancy | kcal/mol | Status | Failure Mode |
|---------|----------|-------------|----------|--------|--------------|
| emulator | — | — | — | no data | — |
| tuna9 | — | — | — | no data | — |

### VQE achieves chemical accuracy (< 1.6 mHa) with error mitigation

*Published in Fig. 2*

**Published**: Yes

| Backend | Measured | Discrepancy | kcal/mol | Status | Failure Mode |
|---------|----------|-------------|----------|--------|--------------|
| emulator | Yes | match | — | PASS | success |
| tuna9 | No | mismatch | — | FAIL | partial_noise |

---

## Analysis

**Emulator**: 2/3 claims matched. 
Some claims not matched even in simulation — indicates protocol differences.

**QI Tuna-9**: 0/3 claims matched. 
Average energy error: 83.3 kcal/mol.
