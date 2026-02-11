"""
Cross-validation oracle: builds the same circuits as lib/quantum.ts
using Qiskit and outputs expected state vectors as JSON.

Run:  python cross_validate_quantum.py
Compare output against: npx vitest run lib/quantum.test.ts

This provides an independent ground truth from a trusted quantum library.
"""

import json
import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, DensityMatrix, partial_trace, entropy, concurrence

def sv_to_list(sv):
    """Convert Qiskit Statevector to [[re, im], ...] matching our TS format."""
    return [[float(c.real), float(c.imag)] for c in sv.data]

def run_all():
    results = {}

    # --- Single-qubit gates on |0⟩ ---

    # H|0⟩
    qc = QuantumCircuit(1); qc.h(0)
    results['H|0>'] = sv_to_list(Statevector.from_instruction(qc))

    # X|0⟩
    qc = QuantumCircuit(1); qc.x(0)
    results['X|0>'] = sv_to_list(Statevector.from_instruction(qc))

    # Y|0⟩
    qc = QuantumCircuit(1); qc.y(0)
    results['Y|0>'] = sv_to_list(Statevector.from_instruction(qc))

    # Z|0⟩
    qc = QuantumCircuit(1); qc.z(0)
    results['Z|0>'] = sv_to_list(Statevector.from_instruction(qc))

    # H|1⟩ = |->
    qc = QuantumCircuit(1); qc.x(0); qc.h(0)
    results['H|1>'] = sv_to_list(Statevector.from_instruction(qc))

    # S|1⟩
    qc = QuantumCircuit(1); qc.x(0); qc.s(0)
    results['S|1>'] = sv_to_list(Statevector.from_instruction(qc))

    # T|1⟩
    qc = QuantumCircuit(1); qc.x(0); qc.t(0)
    results['T|1>'] = sv_to_list(Statevector.from_instruction(qc))

    # Rx(π)|0⟩
    qc = QuantumCircuit(1); qc.rx(np.pi, 0)
    results['Rx(pi)|0>'] = sv_to_list(Statevector.from_instruction(qc))

    # Ry(π)|0⟩
    qc = QuantumCircuit(1); qc.ry(np.pi, 0)
    results['Ry(pi)|0>'] = sv_to_list(Statevector.from_instruction(qc))

    # Rz(π)|0⟩
    qc = QuantumCircuit(1); qc.rz(np.pi, 0)
    results['Rz(pi)|0>'] = sv_to_list(Statevector.from_instruction(qc))

    # --- Bell states ---
    # Phi+ = (|00⟩ + |11⟩)/√2
    qc = QuantumCircuit(2); qc.h(0); qc.cx(0, 1)
    sv_bell = Statevector.from_instruction(qc)
    results['Bell_Phi+'] = sv_to_list(sv_bell)

    # Phi- = (|00⟩ - |11⟩)/√2
    qc = QuantumCircuit(2); qc.h(0); qc.cx(0, 1); qc.z(0)
    results['Bell_Phi-'] = sv_to_list(Statevector.from_instruction(qc))

    # Psi+ = (|01⟩ + |10⟩)/√2
    qc = QuantumCircuit(2); qc.h(0); qc.cx(0, 1); qc.x(0)
    results['Bell_Psi+'] = sv_to_list(Statevector.from_instruction(qc))

    # Psi- = (|01⟩ - |10⟩)/√2
    qc = QuantumCircuit(2); qc.h(0); qc.cx(0, 1); qc.x(0); qc.z(0)
    results['Bell_Psi-'] = sv_to_list(Statevector.from_instruction(qc))

    # Bell state entanglement metrics
    qc = QuantumCircuit(2); qc.h(0); qc.cx(0, 1)
    rho = DensityMatrix(Statevector.from_instruction(qc))
    rho_a = partial_trace(rho, [1])  # trace out qubit 1
    results['Bell_Phi+_entropy'] = float(entropy(rho_a, base=2))
    results['Bell_Phi+_concurrence'] = float(concurrence(rho))

    # --- GHZ states ---
    # 3-qubit: (|000⟩ + |111⟩)/√2
    qc = QuantumCircuit(3); qc.h(0); qc.cx(0, 1); qc.cx(0, 2)
    results['GHZ_3'] = sv_to_list(Statevector.from_instruction(qc))

    # 4-qubit
    qc = QuantumCircuit(4); qc.h(0); qc.cx(0, 1); qc.cx(0, 2); qc.cx(0, 3)
    results['GHZ_4'] = sv_to_list(Statevector.from_instruction(qc))

    # --- W state (manually constructed) ---
    # |W⟩ = (|001⟩ + |010⟩ + |100⟩)/√3
    amp = 1 / np.sqrt(3)
    w_vec = np.zeros(8, dtype=complex)
    w_vec[1] = amp  # |001⟩
    w_vec[2] = amp  # |010⟩
    w_vec[4] = amp  # |100⟩
    results['W_3'] = [[float(c.real), float(c.imag)] for c in w_vec]

    # --- Bloch sphere coordinates ---
    # |0⟩ → (0, 0, 1)
    sv = Statevector.from_label('0')
    results['Bloch_|0>'] = list(sv.to_dict().keys())  # just verify state
    # Manually: θ=0 → (sin0*cosφ, sin0*sinφ, cos0) = (0,0,1)
    results['Bloch_coords'] = {
        '|0>': [0, 0, 1],
        '|1>': [0, 0, -1],
        '|+>': [1, 0, 0],
        '|->': [-1, 0, 0],
    }

    # --- Product state entanglement = 0 ---
    qc = QuantumCircuit(2)  # |00⟩
    rho = DensityMatrix(Statevector.from_instruction(qc))
    results['|00>_concurrence'] = float(concurrence(rho))
    rho_a = partial_trace(rho, [1])
    results['|00>_entropy'] = float(entropy(rho_a, base=2))

    # --- Print results ---
    print(json.dumps(results, indent=2))

    # --- Summary validation ---
    print("\n--- Cross-validation summary ---")
    s2 = 1 / np.sqrt(2)
    checks = [
        ('H|0>', [[s2, 0], [s2, 0]]),
        ('X|0>', [[0, 0], [1, 0]]),
        ('Y|0>', [[0, 0], [0, 1]]),
        ('Bell_Phi+', [[s2, 0], [0, 0], [0, 0], [s2, 0]]),
    ]
    all_pass = True
    for name, expected in checks:
        actual = results[name]
        match = all(
            abs(a[0] - e[0]) < 1e-10 and abs(a[1] - e[1]) < 1e-10
            for a, e in zip(actual, expected)
        )
        status = "PASS" if match else "FAIL"
        if not match:
            all_pass = False
        print(f"  {status}: {name}")

    print(f"\n  Bell Phi+ concurrence: {results['Bell_Phi+_concurrence']:.6f} (expected 1.0)")
    print(f"  Bell Phi+ entropy:     {results['Bell_Phi+_entropy']:.6f} (expected 1.0)")
    print(f"  |00> concurrence:      {results['|00>_concurrence']:.6f} (expected 0.0)")
    print(f"  |00> entropy:          {results['|00>_entropy']:.6f} (expected 0.0)")

    if all_pass:
        print("\n  All cross-validation checks PASSED")
    else:
        print("\n  SOME CHECKS FAILED — investigate discrepancies")

    return results


if __name__ == '__main__':
    run_all()
