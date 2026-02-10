#!/usr/bin/env python3
"""IBM Torino Quantum Volume circuits.

Generates random QV circuits for n=2..7, simulates ideal heavy outputs,
then submits to hardware. Saves ideal results for later comparison.
"""

import json
import sys
import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit.quantum_info import random_unitary, Statevector
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2

SHOTS = 4096
BACKEND_NAME = "ibm_torino"
NUM_TRIALS = 5  # trials per QV level
RNG = np.random.default_rng(42)


def make_qv_circuit(n_qubits):
    """Create a single random QV circuit (n_qubits width, n_qubits depth)."""
    qc = QuantumCircuit(n_qubits, n_qubits)
    for layer in range(n_qubits):
        # Random permutation of qubits
        perm = list(RNG.permutation(n_qubits))
        # Apply random SU(4) to each pair
        for i in range(0, n_qubits - 1, 2):
            q0, q1 = perm[i], perm[i + 1]
            su4 = random_unitary(4, seed=int(RNG.integers(0, 2**31)))
            qc.unitary(su4, [q0, q1])
    qc.measure(range(n_qubits), range(n_qubits))
    return qc


def get_ideal_heavy_outputs(qc_no_meas, n_qubits):
    """Simulate ideal circuit and return set of heavy output bitstrings."""
    sv = Statevector.from_instruction(qc_no_meas)
    probs = sv.probabilities_dict()
    median_prob = np.median(list(probs.values()))
    heavy = {bs for bs, p in probs.items() if p > median_prob}
    return heavy, probs


def main():
    print("Connecting to IBM Quantum...", file=sys.stderr)
    service = QiskitRuntimeService(channel='ibm_cloud')
    backend = service.backend(BACKEND_NAME)
    print(f"Backend: {backend.name} ({backend.num_qubits} qubits)", file=sys.stderr)

    all_circuits = []
    ideal_data = {}

    for n in range(2, 8):  # QV levels 2-7 (QV=4 to QV=128)
        print(f"\nQV level n={n}:", file=sys.stderr)
        ideal_data[n] = []
        for trial in range(NUM_TRIALS):
            qc = make_qv_circuit(n)

            # Get ideal heavy outputs (remove measurements for simulation)
            qc_no_meas = qc.remove_final_measurements(inplace=False)
            heavy, probs = get_ideal_heavy_outputs(qc_no_meas, n)
            ideal_data[n].append({
                "trial": trial,
                "heavy_outputs": sorted(heavy),
                "n_heavy": len(heavy),
                "n_total": 2**n,
            })

            all_circuits.append((qc, f"qv_n{n}_t{trial}"))
            print(f"  trial {trial}: {len(heavy)}/{2**n} heavy outputs", file=sys.stderr)

    # Transpile
    print(f"\nTranspiling {len(all_circuits)} QV circuits...", file=sys.stderr)
    transpiled = []
    for qc, name in all_circuits:
        try:
            t = transpile(qc, backend=backend, optimization_level=1)
        except Exception:
            t = transpile(
                qc,
                coupling_map=backend.coupling_map,
                basis_gates=list(backend.operation_names),
                optimization_level=1,
            )
        transpiled.append((t, name))
        print(f"  {name}: depth={t.depth()}", file=sys.stderr)

    # Submit batch
    sampler = SamplerV2(backend)
    pubs = [t for t, _ in transpiled]
    print(f"\nSubmitting {len(pubs)} QV circuits...", file=sys.stderr)
    job = sampler.run(pubs, shots=SHOTS)
    job_id = job.job_id()
    print(f"Job submitted: {job_id}", file=sys.stderr)

    # Save ideal data + job info
    result = {
        "job_id": job_id,
        "backend": backend.name,
        "shots": SHOTS,
        "num_trials": NUM_TRIALS,
        "qv_levels": list(range(2, 8)),
        "ideal_data": {str(k): v for k, v in ideal_data.items()},
        "circuit_names": [name for _, name in transpiled],
        "circuit_depths": [t.depth() for t, _ in transpiled],
    }

    # Save to file
    outfile = "experiments/results/ibm-torino-qv-ideal.json"
    with open(outfile, "w") as f:
        json.dump(result, f, indent=2)
    print(f"\nIdeal data saved to {outfile}", file=sys.stderr)
    print(json.dumps({"job_id": job_id, "circuits": len(pubs)}))


if __name__ == "__main__":
    main()
