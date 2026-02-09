# Quantum Computing Dev Environment

Python 3.12 venv with Qiskit 2.1, Qiskit Aer, PennyLane, Quantum Inspire SDK v3, OpenSquirrel, and QX emulator.

## Activate

```bash
source ~/quantuminspire/.venv/bin/activate
```

## Quick Examples

### Qiskit local simulation

```python
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

qc = QuantumCircuit(2, 2)
qc.h(0)
qc.cx(0, 1)
qc.measure([0, 1], [0, 1])

result = AerSimulator().run(qc, shots=1024).result()
print(result.get_counts())  # {'00': ~512, '11': ~512}
```

### QI local emulator

Write a hybrid file with `execute()` and `finalize()` hooks, then run:

```bash
qi files run bell_state_hybrid.py
```

`execute()` submits cQASM 3.0 circuits via `QuantumInterface`. `finalize()` must return a `dict`. See `bell_state_hybrid.py` for a working example.

### QI remote hardware

```bash
qi login          # authenticate once
qi files upload my_algorithm.py
qi files run my_algorithm.py --backend Starmon-7
```

Available backends: Starmon-7 (7q), Tuna-5 (5q), Tuna-9 (9q). Requires a [Quantum Inspire](https://www.quantum-inspire.com) account.

## Test Files

| File | Contents |
|------|----------|
| `test_basics.py` | Bell state, GHZ, statevector, qubit scaling |
| `test_algorithms.py` | Deutsch-Jozsa, Grover, QFT, teleportation, Bernstein-Vazirani |
| `test_vqe_fixed.py` | VQE with PennyLane autodiff |
| `test_visualization.py` | Circuit drawing and measurement plots |
| `benchmark_harness.py` | Performance benchmarks |
| `bell_state_hybrid.py` | QI hybrid format example (local emulator) |

## Gotchas

- Python 3.14 breaks libqasm and other C extensions. Stick with 3.12.
- PennyLane params must be `pnp.array(..., requires_grad=True)` or the optimizer silently does nothing.
- QI hybrid files need both `execute()` and `finalize()`. `finalize` must return a `dict`.
- QI SDK v2 is archived. This env uses v3 (`quantuminspire` 3.5.1 + `qiskit-quantuminspire`).

## Links

- [Quantum Inspire](https://www.quantum-inspire.com)
- [Qiskit Docs](https://docs.quantum.ibm.com)
- [PennyLane Docs](https://docs.pennylane.ai)
