# Replication Report: Error Mitigation by Symmetry Verification on a VQE

**Authors**: Sagastizabal et al.
**Journal**: Phys. Rev. A 100, 010302(R) (2019)
**arXiv**: [1902.11258](https://arxiv.org/abs/1902.11258)
**Original hardware**: 2-qubit transmon (Starmon-5)
**Report generated**: 2026-02-10

---

## Summary

- **Claims tested**: 7
- **Successful replications**: 3
- **Success rate**: 43%
- **Backends tested**: emulator, ibm, tuna9

### Failure mode breakdown

| Mode | Count | Description |
|------|-------|-------------|
| noise_dominated | 2 | Hardware noise overwhelms the signal |
| partial_noise | 2 | Hardware noise degrades result but qualitative behavior preserved |
| success | 3 | Replication matches published results within error bars |

---

## Detailed Comparisons

### H2 ground state energy at equilibrium (R=0.735 A)

*Published in Fig. 2*

**Published**: -1.1373 +/- 0.002 Hartree

| Backend | Measured | Discrepancy | kcal/mol | Status | Failure Mode |
|---------|----------|-------------|----------|--------|--------------|
| emulator | -1.1385 | -0.0012 | 0.75 | PASS | success |
| ibm | -0.9436 | +0.1937 | 121.54 | FAIL | noise_dominated |
| tuna9 | -1.0045 | +0.1328 | 83.35 | FAIL | noise_dominated |

### Symmetry verification reduces VQE error vs raw noisy measurement

*Published in Fig. 3*

**Published**: 2.0 +/- 1.0 x improvement

| Backend | Measured | Discrepancy | kcal/mol | Status | Failure Mode |
|---------|----------|-------------|----------|--------|--------------|
| emulator | — | — | — | no data | — |
| ibm | 1.1395 | -0.8605 | — | PASS | success |
| tuna9 | — | — | — | no data | — |

### VQE achieves chemical accuracy (< 1.6 mHa) with error mitigation

*Published in Fig. 2*

**Published**: Yes

| Backend | Measured | Discrepancy | kcal/mol | Status | Failure Mode |
|---------|----------|-------------|----------|--------|--------------|
| emulator | Yes | match | — | PASS | success |
| ibm | No | mismatch | — | FAIL | partial_noise |
| tuna9 | No | mismatch | — | FAIL | partial_noise |

---

## Analysis

**Emulator**: 2/3 claims matched. 
Some claims not matched even in simulation — indicates protocol differences.

**IBM Quantum**: 1/3 claims matched. 
Average energy error: 121.5 kcal/mol.

**QI Tuna-9**: 0/3 claims matched. 
Average energy error: 83.3 kcal/mol.
