#!/usr/bin/env python3
"""IBM Torino Diagnostic Suite — cross-platform comparison.

Submits Bell pairs, noise tomography, and GHZ scaling circuits.
Prints job IDs for later result retrieval.
"""

import json
import sys
from qiskit import QuantumCircuit, transpile

# Import IBM runtime
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2

SHOTS = 4096
BACKEND_NAME = "ibm_torino"

def make_bell_z():
    """Bell state, Z-basis measurement."""
    qc = QuantumCircuit(2, 2)
    qc.h(0)
    qc.cx(0, 1)
    qc.measure([0, 1], [0, 1])
    return qc, "bell_z"

def make_bell_x():
    """Bell state, X-basis measurement (tomography)."""
    qc = QuantumCircuit(2, 2)
    qc.h(0)
    qc.cx(0, 1)
    qc.h(0)
    qc.h(1)
    qc.measure([0, 1], [0, 1])
    return qc, "bell_x"

def make_bell_y():
    """Bell state, Y-basis measurement (tomography)."""
    qc = QuantumCircuit(2, 2)
    qc.h(0)
    qc.cx(0, 1)
    qc.sdg(0)
    qc.h(0)
    qc.sdg(1)
    qc.h(1)
    qc.measure([0, 1], [0, 1])
    return qc, "bell_y"

def make_ghz(n):
    """GHZ-n circuit."""
    qc = QuantumCircuit(n, n)
    qc.h(0)
    for i in range(n - 1):
        qc.cx(i, i + 1)
    qc.measure(range(n), range(n))
    return qc, f"ghz_{n}"

def main():
    print("Connecting to IBM Quantum...", file=sys.stderr)
    service = QiskitRuntimeService(channel='ibm_cloud')
    backend = service.backend(BACKEND_NAME)
    print(f"Backend: {backend.name} ({backend.num_qubits} qubits)", file=sys.stderr)

    # Build all circuits
    circuits = []
    circuits.append(make_bell_z())      # Bell Z-basis
    circuits.append(make_bell_x())      # Bell X-basis (tomography)
    circuits.append(make_bell_y())      # Bell Y-basis (tomography)
    circuits.append(make_ghz(3))        # GHZ-3
    circuits.append(make_ghz(5))        # GHZ-5
    circuits.append(make_ghz(10))       # GHZ-10
    circuits.append(make_ghz(20))       # GHZ-20 (IBM scale test)
    circuits.append(make_ghz(50))       # GHZ-50 (extreme scale)

    # Transpile all circuits
    print(f"Transpiling {len(circuits)} circuits...", file=sys.stderr)
    transpiled = []
    for qc, name in circuits:
        try:
            t = transpile(qc, backend=backend, optimization_level=1)
        except Exception:
            # Fallback: bypass backend plugin config
            t = transpile(
                qc,
                coupling_map=backend.coupling_map,
                basis_gates=list(backend.operation_names),
                optimization_level=1,
            )
        transpiled.append((t, name))
        print(f"  {name}: depth={t.depth()}, gates={dict(t.count_ops())}", file=sys.stderr)

    # Submit all as a single SamplerV2 batch
    sampler = SamplerV2(backend)
    pubs = [t for t, _ in transpiled]
    print(f"Submitting {len(pubs)} circuits as batch...", file=sys.stderr)
    job = sampler.run(pubs, shots=SHOTS)

    job_id = job.job_id()
    print(f"Job submitted: {job_id}", file=sys.stderr)

    # Output structured result
    result = {
        "job_id": job_id,
        "backend": backend.name,
        "shots": SHOTS,
        "circuits": [],
    }
    for (t, name) in transpiled:
        result["circuits"].append({
            "name": name,
            "qubits": t.num_qubits,
            "depth": t.depth(),
            "gates": dict(t.count_ops()),
        })

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
