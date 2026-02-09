"""
Test quantum algorithm implementations:
1. Deutsch-Jozsa algorithm
2. Grover's search algorithm
3. Quantum Fourier Transform
4. VQE (Variational Quantum Eigensolver) via PennyLane
"""
import numpy as np
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
from qiskit.quantum_info import Statevector

sim = AerSimulator()

# ============================================================
# 1. DEUTSCH-JOZSA ALGORITHM
# Determines if a function is constant or balanced in one query
# ============================================================
print("=" * 60)
print("ALGORITHM 1: Deutsch-Jozsa")
print("=" * 60)

def deutsch_jozsa(oracle_type="balanced", n=3):
    """Implement Deutsch-Jozsa for n-bit input."""
    qc = QuantumCircuit(n + 1, n)

    # Initialize output qubit to |->
    qc.x(n)
    qc.barrier()

    # Apply Hadamard to all qubits
    for i in range(n + 1):
        qc.h(i)
    qc.barrier()

    # Oracle
    if oracle_type == "constant":
        pass  # f(x) = 0 for all x (identity oracle)
    elif oracle_type == "balanced":
        # f(x) = x_0 XOR x_1 XOR ... (balanced)
        for i in range(n):
            qc.cx(i, n)
    qc.barrier()

    # Apply Hadamard to input qubits
    for i in range(n):
        qc.h(i)

    # Measure input qubits
    qc.measure(range(n), range(n))
    return qc

for oracle in ["constant", "balanced"]:
    qc = deutsch_jozsa(oracle, n=3)
    result = sim.run(qc, shots=1024).result()
    counts = result.get_counts()
    all_zeros = counts.get("000", 0)
    verdict = "CONSTANT" if all_zeros == 1024 else "BALANCED"
    print(f"  Oracle={oracle}: measured {counts} -> {verdict}")

# ============================================================
# 2. GROVER'S SEARCH ALGORITHM
# Finds marked item in O(sqrt(N)) queries
# ============================================================
print("\n" + "=" * 60)
print("ALGORITHM 2: Grover's Search (3 qubits, searching for |101>)")
print("=" * 60)

def grovers_search(target="101"):
    n = len(target)
    qc = QuantumCircuit(n, n)

    # Initialize superposition
    for i in range(n):
        qc.h(i)

    # Number of Grover iterations: ~pi/4 * sqrt(N)
    num_iterations = int(np.pi / 4 * np.sqrt(2**n))

    for _ in range(num_iterations):
        # Oracle: flip phase of target state
        for i, bit in enumerate(reversed(target)):
            if bit == "0":
                qc.x(i)
        qc.h(n - 1)
        qc.mcx(list(range(n - 1)), n - 1)  # Multi-controlled X
        qc.h(n - 1)
        for i, bit in enumerate(reversed(target)):
            if bit == "0":
                qc.x(i)

        # Diffusion operator
        for i in range(n):
            qc.h(i)
            qc.x(i)
        qc.h(n - 1)
        qc.mcx(list(range(n - 1)), n - 1)
        qc.h(n - 1)
        for i in range(n):
            qc.x(i)
            qc.h(i)

    qc.measure(range(n), range(n))
    return qc

qc_grover = grovers_search("101")
result_g = sim.run(qc_grover, shots=4096).result()
counts_g = result_g.get_counts()
total = sum(counts_g.values())
print(f"  Target |101> probability: {counts_g.get('101', 0)/total*100:.1f}%")
print(f"  Top 3 outcomes:")
for state, count in sorted(counts_g.items(), key=lambda x: -x[1])[:3]:
    print(f"    |{state}>: {count/total*100:.1f}%")

# ============================================================
# 3. QUANTUM FOURIER TRANSFORM
# ============================================================
print("\n" + "=" * 60)
print("ALGORITHM 3: Quantum Fourier Transform (4 qubits)")
print("=" * 60)

def qft(n):
    qc = QuantumCircuit(n)
    for i in range(n):
        qc.h(i)
        for j in range(i + 1, n):
            qc.cp(np.pi / 2**(j - i), j, i)
    # Swap qubits for correct ordering
    for i in range(n // 2):
        qc.swap(i, n - 1 - i)
    return qc

# Prepare |0101> and apply QFT
qc_qft = QuantumCircuit(4)
qc_qft.x(0)  # Set qubit 0
qc_qft.x(2)  # Set qubit 2
qc_qft.barrier()
qc_qft = qc_qft.compose(qft(4))

sv = Statevector.from_instruction(qc_qft)
probs = sv.probabilities_dict()
print(f"  Input state: |0101>")
print(f"  QFT output probabilities (top 5):")
for state, prob in sorted(probs.items(), key=lambda x: -x[1])[:5]:
    print(f"    |{state}>: {prob:.4f}")

# ============================================================
# 4. VQE with PennyLane
# Find ground state energy of H2 molecule (simplified)
# ============================================================
print("\n" + "=" * 60)
print("ALGORITHM 4: VQE — Variational Quantum Eigensolver (PennyLane)")
print("=" * 60)

import pennylane as qml

# Simple 2-qubit Hamiltonian (Z0 Z1 + 0.5 X0 + 0.5 X1)
coeffs = [1.0, 0.5, 0.5]
obs = [qml.Z(0) @ qml.Z(1), qml.X(0), qml.X(1)]
H = qml.Hamiltonian(coeffs, obs)

dev = qml.device("default.qubit", wires=2)

@qml.qnode(dev)
def vqe_circuit(params):
    qml.RY(params[0], wires=0)
    qml.RY(params[1], wires=1)
    qml.CNOT(wires=[0, 1])
    qml.RY(params[2], wires=0)
    qml.RY(params[3], wires=1)
    return qml.expval(H)

# Optimize
opt = qml.GradientDescentOptimizer(stepsize=0.4)
params = np.random.uniform(0, 2 * np.pi, 4)
print(f"  Initial energy: {vqe_circuit(params):.4f}")

energies = []
for step in range(100):
    params = opt.step(vqe_circuit, params)
    energy = vqe_circuit(params)
    energies.append(energy)

print(f"  Final energy after 100 steps: {energies[-1]:.6f}")

# Exact ground state for comparison
H_matrix = qml.matrix(H)
eigenvalues = np.linalg.eigvalsh(H_matrix)
print(f"  Exact ground state energy: {eigenvalues[0]:.6f}")
print(f"  Error: {abs(energies[-1] - eigenvalues[0]):.6f}")

# ============================================================
# 5. Quantum Teleportation Protocol
# ============================================================
print("\n" + "=" * 60)
print("ALGORITHM 5: Quantum Teleportation")
print("=" * 60)

def teleportation_circuit(state_params):
    """Teleport an arbitrary single-qubit state from q0 to q2."""
    qc = QuantumCircuit(3, 2)

    # Prepare state to teleport on q0
    qc.ry(state_params[0], 0)
    qc.rz(state_params[1], 0)

    # Create Bell pair between q1 and q2
    qc.h(1)
    qc.cx(1, 2)
    qc.barrier()

    # Bell measurement on q0, q1
    qc.cx(0, 1)
    qc.h(0)
    qc.measure(0, 0)
    qc.measure(1, 1)

    # Conditional corrections on q2
    with qc.if_test((1, 1)):
        qc.x(2)
    with qc.if_test((0, 1)):
        qc.z(2)

    return qc

qc_tp = teleportation_circuit([np.pi/3, np.pi/4])
print(f"  Circuit depth: {qc_tp.depth()}")
print(f"  Gate count: {qc_tp.count_ops()}")
print("  Teleportation circuit created successfully (uses dynamic circuits / if_test)")

print("\nAll algorithm tests complete.")
