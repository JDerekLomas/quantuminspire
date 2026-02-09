"""
Fixed VQE with proper PennyLane numpy for autodiff.
"""
import pennylane as qml
from pennylane import numpy as pnp  # PennyLane's autograd-aware numpy

# Hamiltonian: Z0 Z1 + 0.5 X0 + 0.5 X1
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

# Use PennyLane numpy with requires_grad=True
params = pnp.array([0.5, 0.5, 0.5, 0.5], requires_grad=True)
opt = qml.GradientDescentOptimizer(stepsize=0.4)

print(f"Initial energy: {vqe_circuit(params):.6f}")

for step in range(200):
    params = opt.step(vqe_circuit, params)
    if step % 50 == 0 or step == 199:
        energy = vqe_circuit(params)
        print(f"  Step {step:3d}: energy = {energy:.6f}")

final_energy = vqe_circuit(params)

# Exact ground state
import numpy as np
H_matrix = qml.matrix(H)
eigenvalues = np.linalg.eigvalsh(H_matrix)

print(f"\nFinal VQE energy:    {final_energy:.6f}")
print(f"Exact ground state:  {eigenvalues[0]:.6f}")
print(f"Error:               {abs(final_energy - eigenvalues[0]):.6f}")
print(f"All eigenvalues:     {eigenvalues}")
