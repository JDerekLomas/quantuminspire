"""
Run H2 VQE on Quantum Inspire hardware.
Uses cQASM 3.0 circuits via the QI hybrid interface.

Usage: qi files run run_qi_hardware.py
"""
import math


def execute(quantum_interface):
    """Run VQE circuits at multiple angles for H2 at equilibrium."""
    # Angles to sweep (optimal is ~0.2256 from simulation)
    angles = [0.0, 0.1, 0.15, 0.2, 0.2256, 0.3, 0.4, 0.6]

    for angle in angles:
        # cQASM 3.0 circuit: 2-qubit VQE ansatz
        # Prepare |01> (HF state), apply Ry rotation + CNOT entanglement
        circuit = f"""version 3.0

qubit[2] q
bit[2] b

// HF initial state |01>
X q[0]

// Parameterized rotation
Ry({angle}) q[0]

// Entangling gate
CNOT q[0], q[1]

// Measure
b = measure q
"""
        quantum_interface.execute_circuit(circuit, 4096)


def finalize(results):
    """Collect measurement results from all angle circuits."""
    angles = [0.0, 0.1, 0.15, 0.2, 0.2256, 0.3, 0.4, 0.6]
    output = {}

    if isinstance(results, list):
        for i, result in enumerate(results):
            angle = angles[i] if i < len(angles) else i
            output[f"theta_{angle}"] = result if isinstance(result, dict) else str(result)
    else:
        output["raw"] = str(results)

    return output
