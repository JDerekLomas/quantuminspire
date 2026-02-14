---
name: vqe-pipeline
description: End-to-end VQE pipeline. Hamiltonian generation (PySCF + OpenFermion), circuit construction, optimization, and hardware submission.
---

# VQE Pipeline

End-to-end Variational Quantum Eigensolver workflow from molecule specification to hardware results.

## Pipeline Steps

1. **Molecular Hamiltonian** (PySCF) → active space integrals
2. **Qubit Hamiltonian** (OpenFermion + JW) → Pauli terms
3. **Measurement grouping** → commuting Pauli groups → circuit set
4. **Ansatz + VQE optimization** → optimal parameters (classical emulator)
5. **Circuit generation** → cQASM 3.0
6. **Native gate conversion** → CZ, Ry, Rz only
7. **Emulator verification** → qi_run_local
8. **Hardware submission** → qi_submit_circuit with CompileStage.ROUTING
9. **Result analysis** → energy, error bars, post-selection

## Step 1-2: Hamiltonian Generation

Use `.venv/bin/python` — system python lacks pyscf.

### PySCF → OpenFermion (CRITICAL conventions)

```python
from pyscf import gto, scf, mcscf, ao2mo
from openfermion import InteractionOperator, jordan_wigner
from openfermion.chem.molecular_data import spinorb_from_spatial

# PySCF setup
mol = gto.M(atom='H 0 0 0; H 0 0 0.735', basis='sto-3g')
mf = scf.RHF(mol).run()
mc = mcscf.CASCI(mf, ncas=2, nelecas=2)  # or CASSCF
mc.run()

# Extract integrals
h1e, ecore = mc.get_h1eff()
h2e_packed = mc.get_h2eff()
h2e = ao2mo.restore(1, h2e_packed, mc.ncas)  # 2D packed → 4D

# CRITICAL: chemist's → physicist's notation for OpenFermion
h2e_of = h2e.transpose(0, 2, 3, 1)

# Spin-orbital mapping (correct way — DON'T do manual spin assignment)
one_body, two_body = spinorb_from_spatial(h1e, h2e_of)

# InteractionOperator (0.5 factor on two-body!)
iop = InteractionOperator(ecore, one_body, 0.5 * two_body)
qubit_hamiltonian = jordan_wigner(iop)
```

### HF Reference State

DON'T assume qubits 0..N are occupied. PySCF orbital ordering after spinorb_from_spatial
may place occupied orbitals at higher indices. Verify by computing `<basis|H|basis>` for
candidate states.

## Step 3: Measurement Grouping

Group Pauli terms that are tensor products of {I, Z} (Z-basis), {I, X} (X-basis), etc.
Terms in the same group commute and share one circuit.

Each group needs a different measurement circuit:
- Z-basis: no rotation before measurement
- X-basis: H on measured qubits (Rz(π); Ry(π/2) in native)
- Y-basis: Sdag then H (Rz(-π/2); Rz(π); Ry(π/2) → Rz(π/2); Ry(π/2) in native)

## Step 4: Ansatz

### Simple (Ry + CNOT chain)
Good for 2-4 qubits. Depth-1: alternating Ry layers with CNOT entanglement.

### SU(2) (Rz-Ry-Rz per qubit)
Better for capturing more correlations. Each qubit gets 3 parameters per layer.

### For 8+ qubits
Ry+CNOT chain hits barren plateaus. Need UCCSD or ADAPT-VQE.

## Step 5-6: Circuit Generation + Native Conversion

See `/submit-tuna9` skill for native gate decomposition rules.

Key decompositions:
```
CNOT(a,b) → Ry(-π/2) b; CZ a,b; Ry(π/2) b
H          → Rz(π); Ry(π/2)
Sdag       → Rz(-π/2)
```

## Step 7-9: Submission + Analysis

See `/submit-tuna9` and `/analyze-results` skills.

## File Conventions

- Hamiltonian data: `experiments/results/<mol>-hamiltonian.json`
- VQE parameters: `experiments/results/<mol>-vqe-params.json`
- Circuits (original): `experiments/results/<mol>-circuits.json`
- Circuits (native): `experiments/results/<mol>-circuits-native.json`
- Job IDs: `experiments/results/<mol>-tuna9-jobids.json`
- Hardware results: `experiments/results/<mol>-tuna9-hardware-results.json`
- Analysis: `experiments/results/<mol>-tuna9-analysis.json`

## Quick Reference

- Python: `.venv/bin/python`
- Tuna-9 backend_type_id: 6
- Max shots: 4096 per circuit
- Best 4-qubit subgraph: q4, q6, q7, q8
- 8-qubit path (avoids q0): 7-8-6-3-1-4-2-5
- Chemical accuracy threshold: 1.6 mHa
