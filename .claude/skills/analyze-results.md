---
name: analyze-results
description: Fetch and analyze quantum hardware job results. Computes VQE energies, error bars, post-selection, and compares to exact values.
---

# Analyze Quantum Results

Fetch completed job results and compute physics from measurement counts.

## Fetching Results

### QI (Tuna-9)
```
qi_check_job(job_id=ID)     → status: PLANNED/RUNNING/COMPLETED/FAILED
qi_get_results(job_id=ID)   → {"counts": {"000": 512, "001": 256, ...}}
```

### IBM
```
ibm_check_job(job_id=ID)    → status: QUEUED/RUNNING/DONE/ERROR
ibm_get_results(job_id=ID)  → measurement histogram
```

## VQE Energy Computation

For a qubit Hamiltonian H = Σ_i c_i P_i (Pauli terms):

1. **Group Pauli terms by measurement basis** (commuting groups share one circuit)
2. **For each bitstring** in counts, compute parity of active qubits
3. **Expectation value**: `<P> = Σ_bs (-1)^parity(bs) * count(bs) / total`
4. **Energy**: `E = Σ_i c_i * <P_i>`

### Bitstring Parity (9-qubit Tuna-9 mapping)

For OpenFermion label position q with 4 logical qubits mapped to 9 physical:
```python
logical_q = N_LOGICAL - 1 - q          # label → logical
phys_q = QMAP[logical_q]               # logical → physical
pos = N_PHYSICAL - 1 - phys_q          # physical → MSB-first position
bit = int(bitstring[pos])              # read the bit
```

Standard QMAP for H2 4-qubit on Tuna-9: `{0: 2, 1: 4, 2: 6, 3: 8}`

### Post-Selection

For VQE with known electron count, discard bitstrings where logical qubit occupation != expected:
```python
logical_positions = [N_PHYSICAL - 1 - QMAP[k] for k in range(N_LOGICAL)]
n_ones = sum(int(bs[pos]) for pos in logical_positions)
keep = (n_ones == n_electrons)
```

Post-selection helps at 4 qubits (52 mHa vs 303 mHa raw for H2) but hurts at 8 qubits (discards 69% of shots).

## Error Metrics

- **Error (mHa)**: `|E_measured - E_exact| * 1000`
- **Chemical accuracy**: error < 1.6 mHa
- **Shot noise σ**: `σ² = Σ_i c_i² (1 - <P_i>²) / N_shots`
- **Bootstrap σ**: resample counts M=1000 times, take std of energies

## Results Format

Save analysis to `experiments/results/<experiment>-results.json`:
```json
{
  "experiment": "H2 4-qubit VQE",
  "backend": "tuna9",
  "energy_raw": -1.1234,
  "energy_ps": -1.1456,
  "error_raw_mHa": 303.2,
  "error_ps_mHa": 52.1,
  "ps_retention_pct": 71.0,
  "sigma_mHa": 2.3,
  "E_exact": -1.1457,
  "chemical_accuracy": false
}
```

## Comparison Baselines

From previous experiments:
- **H2 2q**: QI emulator 1.3 mHa, Fez 87 mHa
- **H2 4q**: Tuna-9 raw 303 mHa, PS 52 mHa; Fez+TREX 160 mHa
- **LiH 4q**: QI emulator 0.2 mHa, Fez 354 mHa, Fez+TREX 160 mHa
- **LiH 8q**: Emulator 1.3 mHa (no post-selection)

## Quick Analysis Script Pattern

```python
import json, numpy as np
results_dir = "experiments/results"

# Load job results
with open(f"{results_dir}/experiment-results.json") as f:
    data = json.load(f)

# Load Hamiltonian
with open(f"{results_dir}/hamiltonian.json") as f:
    ham = json.load(f)

# Compute energy from counts + Hamiltonian terms
# ... (use parity convention above)
```
