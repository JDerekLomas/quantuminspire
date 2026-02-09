"""
Test visualization capabilities — circuit diagrams, state analysis.
"""
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, DensityMatrix, partial_trace
from qiskit.visualization import circuit_drawer
import numpy as np

# --- Circuit text visualization ---
print("=" * 60)
print("VIZ 1: Circuit Diagram (text)")
print("=" * 60)

qc = QuantumCircuit(3, 3)
qc.h(0)
qc.cx(0, 1)
qc.cx(0, 2)
qc.barrier()
qc.ry(np.pi/4, 1)
qc.cz(1, 2)
qc.measure([0, 1, 2], [0, 1, 2])

print(qc.draw(output='text'))

# --- Circuit stats ---
print("\n" + "=" * 60)
print("VIZ 2: Circuit Analysis")
print("=" * 60)
print(f"  Depth: {qc.depth()}")
print(f"  Width: {qc.width()}")
print(f"  Gate counts: {dict(qc.count_ops())}")
print(f"  Num qubits: {qc.num_qubits}")
print(f"  Num classical bits: {qc.num_clbits}")

# --- Statevector analysis ---
print("\n" + "=" * 60)
print("VIZ 3: Statevector Analysis")
print("=" * 60)

qc_sv = QuantumCircuit(3)
qc_sv.h(0)
qc_sv.cx(0, 1)
qc_sv.cx(0, 2)

sv = Statevector.from_instruction(qc_sv)
print(f"  State: {sv}")
print(f"  Probabilities: {sv.probabilities_dict()}")
print(f"  Is valid: {sv.is_valid()}")
print(f"  Purity: {sv.purity():.4f}")

# Entanglement check via partial trace
dm = DensityMatrix(sv)
dm_0 = partial_trace(dm, [1, 2])
dm_12 = partial_trace(dm, [0])
print(f"  Purity of qubit 0 (traced out 1,2): {dm_0.purity():.4f}")
print(f"  Purity of qubits 1,2 (traced out 0): {dm_12.purity():.4f}")
print(f"  (Purity < 1 means entangled with the rest)")

# --- Noise model ---
print("\n" + "=" * 60)
print("VIZ 4: Noise Simulation")
print("=" * 60)

from qiskit_aer import AerSimulator
from qiskit_aer.noise import NoiseModel, depolarizing_error

noise_model = NoiseModel()
error_1q = depolarizing_error(0.01, 1)  # 1% single-qubit error
error_2q = depolarizing_error(0.05, 2)  # 5% two-qubit error
noise_model.add_all_qubit_quantum_error(error_1q, ['h', 'ry', 'rz'])
noise_model.add_all_qubit_quantum_error(error_2q, ['cx', 'cz'])

sim_noisy = AerSimulator(noise_model=noise_model)
sim_ideal = AerSimulator()

qc_bell = QuantumCircuit(2, 2)
qc_bell.h(0)
qc_bell.cx(0, 1)
qc_bell.measure([0, 1], [0, 1])

result_ideal = sim_ideal.run(qc_bell, shots=10000).result().get_counts()
result_noisy = sim_noisy.run(qc_bell, shots=10000).result().get_counts()

print(f"  Ideal Bell state:  {result_ideal}")
print(f"  Noisy Bell state:  {result_noisy}")
print(f"  (Noise introduces |01> and |10> errors)")

# --- Save circuit to QASM ---
print("\n" + "=" * 60)
print("VIZ 5: OpenQASM Export")
print("=" * 60)
from qiskit.qasm3 import dumps
qc_export = QuantumCircuit(2)
qc_export.h(0)
qc_export.cx(0, 1)
qasm_str = dumps(qc_export)
print(qasm_str)

print("\nAll visualization tests complete.")
