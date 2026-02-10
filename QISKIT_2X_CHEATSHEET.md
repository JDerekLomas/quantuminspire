# Qiskit 2.x API Cheat Sheet for LLM Prompt Injection

> Concise reference of breaking changes from Qiskit 0.x/1.x to 2.x.
> Prepend this to LLM prompts that generate Qiskit code to prevent common failures.

---

## 1. REMOVED: `qiskit.execute()` and `assemble()`

These functions no longer exist. Do NOT use them.

```python
# BROKEN (removed in 1.0, gone in 2.0)
from qiskit import execute, assemble
result = execute(circuit, backend).result()

# CORRECT: Use primitives (preferred)
from qiskit.primitives import StatevectorSampler
sampler = StatevectorSampler()
job = sampler.run([circuit])
result = job.result()
counts = result[0].data.meas.get_counts()

# CORRECT: Use transpile + backend.run (still works on BackendV2)
from qiskit import transpile
transpiled = transpile(circuit, backend)
job = backend.run(transpiled)
result = job.result()
```

---

## 2. Primitives V1 -> V2 (the biggest API change)

V1 primitives (`Sampler`, `Estimator` without version suffix) are **removed** in Qiskit 2.0. Only V2 exists.

### Sampler

```python
# BROKEN (V1 - removed)
from qiskit.primitives import Sampler
sampler = Sampler()
job = sampler.run([circuit1, circuit2], [params1, params2])
quasi_dists = job.result().quasi_dists

# CORRECT (V2 - current)
from qiskit.primitives import StatevectorSampler
sampler = StatevectorSampler()
# Pass list of PUBs: (circuit,) or (circuit, param_values) or (circuit, param_values, shots)
job = sampler.run([(circuit1, params1), (circuit2, params2)])
result = job.result()
counts = result[0].data.meas.get_counts()       # dict {"00": 512, "11": 512}
bitstrings = result[0].data.meas.get_bitstrings() # list of strings
```

### Estimator

```python
# BROKEN (V1 - removed)
from qiskit.primitives import Estimator
estimator = Estimator()
job = estimator.run([circuit], [observable])
values = job.result().values

# CORRECT (V2 - current)
from qiskit.primitives import StatevectorEstimator
estimator = StatevectorEstimator()
# PUB: (circuit, observable) or (circuit, observable, param_values) or (circuit, observable, param_values, precision)
job = estimator.run([(circuit, observable)])
result = job.result()
evs = result[0].data.evs    # expectation values (numpy array)
stds = result[0].data.stds  # standard errors
```

### Key PUB (Primitive Unified Bloc) rules:
- `run()` takes a **list of PUBs**, not separate circuit/param lists
- Sampler PUB: `(circuit,)` or `(circuit, param_values)` or `(circuit, param_values, shots)`
- Estimator PUB: `(circuit, observable)` or `(circuit, observable, param_values)`
- Results indexed by PUB: `result[0]`, `result[1]`, etc.
- Sampler results accessed via classical register name: `result[i].data.meas` (for `measure_all()`)
- Estimator results: `result[i].data.evs` and `result[i].data.stds`

---

## 3. Renamed primitive classes in `qiskit.primitives`

| Removed (Qiskit 2.0)      | Replacement                          |
|---------------------------|--------------------------------------|
| `Sampler`                 | `StatevectorSampler`                 |
| `Estimator`               | `StatevectorEstimator`               |
| `BackendSampler`          | `BackendSamplerV2`                   |
| `BackendEstimator`        | `BackendEstimatorV2`                 |

For IBM Runtime (cloud):
```python
from qiskit_ibm_runtime import SamplerV2 as Sampler
from qiskit_ibm_runtime import EstimatorV2 as Estimator
```

For Aer (local noisy simulation):
```python
from qiskit_aer.primitives import SamplerV2, EstimatorV2
```

---

## 4. `qiskit.providers.aer` -> `qiskit_aer`

The `qiskit.Aer` and `qiskit.providers.aer` import paths have been gone since Qiskit 1.0.

```python
# BROKEN
from qiskit import Aer
backend = Aer.get_backend('aer_simulator')

# BROKEN
from qiskit.providers.aer import AerSimulator

# CORRECT
from qiskit_aer import AerSimulator
backend = AerSimulator()

# CORRECT (with noise)
from qiskit_aer import AerSimulator
from qiskit_aer.noise import NoiseModel
noise_model = NoiseModel.from_backend(real_backend)
backend = AerSimulator(noise_model=noise_model)

# CORRECT (Aer primitives)
from qiskit_aer.primitives import SamplerV2
sampler = SamplerV2()
```

Note: `qiskit-aer` must be installed separately: `pip install qiskit-aer`

---

## 5. REMOVED: `c_if()` classical conditioning

```python
# BROKEN
qc.x(0).c_if(classical_reg, 1)

# CORRECT
with qc.if_test((classical_reg, 1)):
    qc.x(0)
```

---

## 6. REMOVED: `qiskit.pulse` module (entire module gone)

All of these are removed in Qiskit 2.0:
- `qiskit.pulse.*`
- `qiskit.scheduler`
- `QuantumCircuit.calibrations`
- `QuantumCircuit.add_calibration()`
- `QuantumCircuit.has_calibration_for()`

No direct replacement. Use fractional gates on Heron hardware for low-level control.

---

## 7. REMOVED: BackendV1, BackendProperties, Qobj

```python
# BROKEN
from qiskit.providers import BackendV1
from qiskit.providers.models import BackendProperties, BackendConfiguration

# CORRECT: Use BackendV2 and Target
from qiskit.providers import BackendV2
from qiskit.transpiler import Target, InstructionProperties
```

All fake backends ending in `V1` are removed (e.g., `Fake5QV1`).

---

## 8. `generate_preset_pass_manager` / `transpile` changes

```python
# BROKEN: loose constraints removed
pm = generate_preset_pass_manager(
    backend_properties=props,
    instruction_durations=durations,
    inst_map=inst_map
)

# CORRECT: use Target
from qiskit.transpiler import Target, InstructionProperties
target = Target.from_configuration(
    basis_gates=["cx", "id", "rz", "sx", "x"],
    num_qubits=5,
    coupling_map=coupling_map
)
pm = generate_preset_pass_manager(target=target)
# or
transpiled = transpile(circuit, target=target)

# SIMPLEST (if you have a backend):
transpiled = transpile(circuit, backend=backend)
```

---

## 9. REMOVED: `QuantumInstance`

```python
# BROKEN
from qiskit.utils import QuantumInstance
qi = QuantumInstance(backend, shots=1024)
vqe = VQE(ansatz, optimizer, quantum_instance=qi)

# CORRECT: algorithms now take primitives
from qiskit_algorithms import VQE
from qiskit.primitives import StatevectorEstimator
estimator = StatevectorEstimator()
vqe = VQE(estimator, ansatz, optimizer)
```

Note: `qiskit.algorithms` moved to separate package `qiskit-algorithms` (`pip install qiskit-algorithms`).

---

## 10. REMOVED: `Instruction.duration`, `Instruction.unit`, `Instruction.condition`

```python
# BROKEN
gate.duration  # AttributeError
gate.unit      # AttributeError
gate.condition # AttributeError

# CORRECT: Query the Target for duration/unit
properties = target["cx"][(0, 1)]
duration = properties.duration
```

---

## 11. Observables: Use `SparsePauliOp`

```python
# BROKEN (PauliSumOp removed from qiskit)
from qiskit.opflow import PauliSumOp

# CORRECT
from qiskit.quantum_info import SparsePauliOp

# Create a Hamiltonian
H = SparsePauliOp.from_list([
    ("II", 1.0),
    ("IZ", 0.5),
    ("ZI", -0.5),
    ("ZZ", 0.25),
    ("XX", 0.25)
])

# Use with EstimatorV2
from qiskit.primitives import StatevectorEstimator
estimator = StatevectorEstimator()
job = estimator.run([(circuit, H)])
expectation = job.result()[0].data.evs
```

---

## 12. Complete working example (Qiskit 2.x)

```python
from qiskit import QuantumCircuit, transpile
from qiskit.primitives import StatevectorSampler, StatevectorEstimator
from qiskit.quantum_info import SparsePauliOp
import numpy as np

# --- Sampling ---
qc = QuantumCircuit(2)
qc.h(0)
qc.cx(0, 1)
qc.measure_all()  # Required for Sampler! Creates classical register "meas"

sampler = StatevectorSampler(seed=42)
job = sampler.run([qc], shots=1024)
result = job.result()
counts = result[0].data.meas.get_counts()
print(counts)  # {"00": ~512, "11": ~512}

# --- Estimation ---
qc2 = QuantumCircuit(2)
qc2.h(0)
qc2.cx(0, 1)
# NO measurements for Estimator

observable = SparsePauliOp.from_list([("ZZ", 1.0)])
estimator = StatevectorEstimator()
job = estimator.run([(qc2, observable)])
print(job.result()[0].data.evs)  # ~1.0

# --- With Aer (noisy simulation) ---
# pip install qiskit-aer
from qiskit_aer import AerSimulator
from qiskit_aer.primitives import SamplerV2 as AerSampler

aer_sampler = AerSampler(default_shots=4096)
job = aer_sampler.run([qc])
counts = job.result()[0].data.meas.get_counts()
```

---

## Quick reference: what's gone

| Removed | Replacement |
|---------|-------------|
| `qiskit.execute()` | `StatevectorSampler.run()` or `transpile()` + `backend.run()` |
| `qiskit.assemble()` | Removed entirely, not needed |
| `qiskit.Aer` | `qiskit_aer.AerSimulator` (separate package) |
| `qiskit.providers.aer` | `import qiskit_aer` |
| `qiskit.opflow` | `qiskit.quantum_info.SparsePauliOp` |
| `Sampler` (unversioned) | `StatevectorSampler` |
| `Estimator` (unversioned) | `StatevectorEstimator` |
| `BackendSampler` | `BackendSamplerV2` |
| `BackendEstimator` | `BackendEstimatorV2` |
| `BackendV1` | `BackendV2` |
| `QuantumInstance` | Primitives (`StatevectorSampler`, `StatevectorEstimator`) |
| `qiskit.pulse.*` | Removed (use fractional gates) |
| `qiskit.algorithms` | `qiskit_algorithms` (separate package) |
| `qiskit.utils.QuantumInstance` | Primitives |
| `.c_if()` | `with qc.if_test():` |
| `result.quasi_dists` | `result[i].data.meas.get_counts()` |
| `result.values` (Estimator) | `result[i].data.evs` |
| `Instruction.duration/unit` | `target[gate][(qubits)].duration` |
| `BackendProperties` | `Target` |
| `Qobj` / `QasmQobj` | Removed entirely |
