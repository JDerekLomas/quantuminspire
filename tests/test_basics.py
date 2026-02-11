"""
Test 1: Basic quantum circuit simulation capabilities.
Bell state, GHZ state, superposition, measurement.
"""
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
from qiskit.quantum_info import Statevector
import json

sim = AerSimulator()

# --- Bell State ---
print("=" * 60)
print("TEST 1: Bell State (2 entangled qubits)")
print("=" * 60)
qc = QuantumCircuit(2, 2)
qc.h(0)
qc.cx(0, 1)
qc.measure([0, 1], [0, 1])

result = sim.run(qc, shots=4096).result()
counts = result.get_counts()
print(f"Counts: {json.dumps(counts, indent=2)}")
print(f"Expected: ~50% |00>, ~50% |11>")
total = sum(counts.values())
for state, count in sorted(counts.items()):
    print(f"  |{state}>: {count/total*100:.1f}%")

# --- GHZ State (3 qubits) ---
print("\n" + "=" * 60)
print("TEST 2: GHZ State (3 entangled qubits)")
print("=" * 60)
qc3 = QuantumCircuit(3, 3)
qc3.h(0)
qc3.cx(0, 1)
qc3.cx(0, 2)
qc3.measure([0, 1, 2], [0, 1, 2])

result3 = sim.run(qc3, shots=4096).result()
counts3 = result3.get_counts()
total3 = sum(counts3.values())
print(f"Expected: ~50% |000>, ~50% |111>")
for state, count in sorted(counts3.items()):
    print(f"  |{state}>: {count/total3*100:.1f}%")

# --- Statevector simulation (exact) ---
print("\n" + "=" * 60)
print("TEST 3: Exact Statevector Simulation")
print("=" * 60)
qc_sv = QuantumCircuit(2)
qc_sv.h(0)
qc_sv.cx(0, 1)
sv = Statevector.from_instruction(qc_sv)
print(f"Statevector: {sv}")
print(f"Probabilities: {sv.probabilities_dict()}")

# --- Superposition of N qubits ---
print("\n" + "=" * 60)
print("TEST 4: Equal superposition of 5 qubits (32 states)")
print("=" * 60)
n = 5
qc5 = QuantumCircuit(n)
for i in range(n):
    qc5.h(i)
sv5 = Statevector.from_instruction(qc5)
probs = sv5.probabilities_dict()
print(f"Number of states with non-zero probability: {len(probs)}")
print(f"Each state probability: {list(probs.values())[0]:.6f} (expected: {1/2**n:.6f})")

# --- Larger simulation test ---
print("\n" + "=" * 60)
print("TEST 5: Scaling test — how many qubits can we simulate?")
print("=" * 60)
for n in [10, 15, 20, 25]:
    try:
        import time
        qc_n = QuantumCircuit(n, n)
        for i in range(n):
            qc_n.h(i)
        for i in range(n - 1):
            qc_n.cx(i, i + 1)
        qc_n.measure(range(n), range(n))
        t0 = time.time()
        result_n = sim.run(qc_n, shots=1024).result()
        dt = time.time() - t0
        print(f"  {n} qubits: OK ({dt:.2f}s, {len(result_n.get_counts())} unique outcomes)")
    except Exception as e:
        print(f"  {n} qubits: FAILED ({e})")

print("\nAll basic tests complete.")
