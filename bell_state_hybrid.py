"""Bell state on Quantum Inspire local emulator (hybrid format)."""

from quantuminspire.sdk.quantum_interface import QuantumInterface

def execute(quantum_interface: QuantumInterface):
    circuit = """
    version 3.0
    qubit[2] q
    bit[2] b
    H q[0]
    CNOT q[0], q[1]
    b = measure q
    """
    result = quantum_interface.execute_circuit(circuit, number_of_shots=1024)
    print(f"Bell state results: {result}")

def finalize(results):
    combined = {}
    for r in results:
        combined.update(r)
    return combined
