#!/usr/bin/env python3
"""LiH VQE with ZNE error mitigation on IBM Fez.

Uses IBM's EstimatorV2 with resilience_level=2 (Zero-Noise Extrapolation)
to replicate Kandala et al.'s Richardson extrapolation approach.

This is the modern IBM equivalent of Kandala's error mitigation:
  - Kandala (2017): manually ran circuits at 1x, 1.5x, 2x stretch factors
  - EstimatorV2 ZNE: automatically inserts identity gates, extrapolates to zero noise

Replaces lih_trex.py (resilience_level=1, readout-only mitigation).
ZNE also mitigates gate errors, which dominated the TREX results.

Usage:
  1. Run lih_replication.py first to generate optimal parameters
  2. Run this script to submit to IBM with ZNE
  3. Or: modify BOND_DISTANCE to run at a specific R value
"""
import json
import sys
import time

from qiskit.circuit import QuantumCircuit
from qiskit.quantum_info import SparsePauliOp
from qiskit import transpile
from qiskit_ibm_runtime import QiskitRuntimeService, EstimatorV2

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BOND_DISTANCE = 1.6  # Default: equilibrium. Change for dissociation curve.
BACKEND_NAME = "ibm_fez"
RESILIENCE_LEVEL = 2  # ZNE (vs 1=TREX)

# Load results from lih_replication.py
REPLICATION_FILE = "/Users/dereklomas/haiqu/experiments/lih_replication_output.json"

try:
    with open(REPLICATION_FILE) as f:
        replication_data = json.load(f)
except FileNotFoundError:
    print(f"ERROR: Run lih_replication.py first to generate {REPLICATION_FILE}")
    sys.exit(1)

# Find the data for our bond distance
point = None
for r in replication_data["dissociation_curve"]:
    if abs(r["R"] - BOND_DISTANCE) < 0.01:
        point = r
        break

if point is None:
    available = [r["R"] for r in replication_data["dissociation_curve"]]
    print(f"ERROR: R={BOND_DISTANCE} not found. Available: {available}")
    sys.exit(1)

pauli_terms = point["pauli_terms"]
optimal_params = point["optimal_params"]
E_qubit_gs = point["E_qubit_gs"]
E_CASCI = point["E_CASCI"]
E_FCI = point["E_FCI_full"]
E_HF = point["E_HF"]
offset = point["offset"]

n_qubits = 4
depth = replication_data["method"]["ansatz"].split("depth=")[1].split(",")[0]
depth = int(depth)

print("=" * 72)
print(f"  LiH VQE — ZNE ERROR MITIGATION (R = {BOND_DISTANCE} A)")
print(f"  EstimatorV2 resilience_level={RESILIENCE_LEVEL}")
print(f"  Reference: Kandala et al., Nature 549, 242 (2017)")
print("=" * 72)

# ---------------------------------------------------------------------------
# Build ansatz circuit (NO measurements — Estimator handles those)
# ---------------------------------------------------------------------------
qc = QuantumCircuit(n_qubits)

# HF state
qc.x(0)
qc.x(1)

idx = 0

# Initial Ry layer
for i in range(n_qubits):
    qc.ry(optimal_params[idx], i)
    idx += 1

# Entangling blocks
for d in range(depth):
    for i in range(n_qubits - 1):
        qc.cx(i, i + 1)
    for i in range(n_qubits):
        qc.ry(optimal_params[idx], i)
        idx += 1
        qc.rz(optimal_params[idx], i)
        idx += 1

print(f"\n  Ansatz: SU(2) depth={depth}, {len(optimal_params)} params")
print(qc)

# ---------------------------------------------------------------------------
# Build Hamiltonian as SparsePauliOp
# ---------------------------------------------------------------------------
# Our convention: "ABCD" = A on q0. Qiskit: rightmost = q0. Reverse labels.
qiskit_terms = [(label[::-1], coeff) for label, coeff in pauli_terms.items()]
hamiltonian = SparsePauliOp.from_list(qiskit_terms).simplify()

# Individual observables for per-term analysis
individual_obs = {}
for label, coeff in pauli_terms.items():
    if label == "I" * n_qubits:
        continue
    individual_obs[label] = SparsePauliOp.from_list([(label[::-1], 1.0)])

print(f"\n  Hamiltonian: {len(pauli_terms)} Pauli terms")
print(f"  Ideal energy (qubit frame): {E_qubit_gs:.6f} Ha")

# ---------------------------------------------------------------------------
# Connect to IBM and transpile
# ---------------------------------------------------------------------------
print(f"\n  Connecting to IBM Quantum...")
service = QiskitRuntimeService()
backend = service.backend(BACKEND_NAME)
print(f"  Backend: {backend.name} ({backend.num_qubits} qubits)")

print("  Transpiling...")
isa_circuit = transpile(qc, target=backend.target, optimization_level=1,
                        translation_method='translator')
print(f"  Depth: {isa_circuit.depth()}, gates: {isa_circuit.count_ops()}")

# Apply layout to observables
isa_hamiltonian = hamiltonian.apply_layout(isa_circuit.layout)
isa_individual = {
    label: obs.apply_layout(isa_circuit.layout)
    for label, obs in individual_obs.items()
}

# ---------------------------------------------------------------------------
# Submit with ZNE (resilience_level=2)
# ---------------------------------------------------------------------------
print(f"\n  Submitting with ZNE (resilience_level={RESILIENCE_LEVEL})...")
print(f"  (ZNE automatically amplifies noise + extrapolates to zero)")

estimator = EstimatorV2(backend)
estimator.options.resilience_level = RESILIENCE_LEVEL

# PUB 0: Full Hamiltonian; PUBs 1+: Individual terms
pubs = [(isa_circuit, isa_hamiltonian)]
term_order = []
for label, isa_obs in isa_individual.items():
    pubs.append((isa_circuit, isa_obs))
    term_order.append(label)

job = estimator.run(pubs)
job_id = job.job_id()
print(f"  Job ID: {job_id}")
print(f"  PUBs: 1 (Hamiltonian) + {len(term_order)} (individual) = {len(pubs)}")

# ---------------------------------------------------------------------------
# Poll for results
# ---------------------------------------------------------------------------
print("\n  Waiting for results...")
while True:
    status = job.status()
    print(f"  Status: {status}", end="\r")
    if status in ("DONE", "ERROR", "CANCELLED"):
        break
    time.sleep(15)

print(f"\n  Final status: {job.status()}")

if job.status() != "DONE":
    print(f"  Job failed: {job.status()}")
    sys.exit(1)

result = job.result()

# ---------------------------------------------------------------------------
# Extract and display results
# ---------------------------------------------------------------------------
zne_energy = float(result[0].data.evs)
zne_std = float(result[0].data.stds)
zne_mol = zne_energy - offset

print("\n" + "=" * 72)
print(f"  LiH VQE — ZNE RESULTS (R = {BOND_DISTANCE} A, {BACKEND_NAME})")
print("=" * 72)

print(f"\n  ZNE energy (qubit frame): {zne_energy:.6f} +/- {zne_std:.6f} Ha")
print(f"  Ideal (qubit frame):      {E_qubit_gs:.6f} Ha")
print(f"  ZNE error vs ideal:       {(zne_energy - E_qubit_gs) * 1000:+.1f} mHa")

print(f"\n  Molecular energy frame:")
print(f"  {'Method':<30} | {'Energy (Ha)':>12} | {'vs FCI (mHa)':>14}")
print(f"  {'-' * 30}-+-{'-' * 12}-+-{'-' * 14}")
print(f"  {'FCI (exact)':<30} | {E_FCI:>12.6f} | {'---':>14}")
print(f"  {'CASCI(2,2) target':<30} | {E_CASCI:>12.6f} | {(E_CASCI - E_FCI) * 1000:>+13.1f}m")
print(f"  {'ZNE (IBM {BACKEND_NAME})':<30} | {zne_mol:>12.6f} | {(zne_mol - E_FCI) * 1000:>+13.1f}m")

# Compare with TREX (if available)
trex_file = "/Users/dereklomas/haiqu/experiments/lih_trex_results.json"
try:
    with open(trex_file) as f:
        trex = json.load(f)
    trex_mol = trex["trex_energy_molecular"]
    print(f"  {'TREX (previous, level=1)':<30} | {trex_mol:>12.6f} | {(trex_mol - E_FCI) * 1000:>+13.1f}m")
except FileNotFoundError:
    pass

chem_acc = 1.6  # mHa
zne_vs_casci = abs(zne_mol - E_CASCI) * 1000
print(f"\n  Chemical accuracy vs CASCI (< {chem_acc} mHa)?")
print(f"  ZNE: {'YES' if zne_vs_casci < chem_acc else 'NO'} ({zne_vs_casci:.1f} mHa)")

# Per-term analysis
print(f"\n  Per-term expectation values:")
print(f"  {'Pauli':>16} | {'Coeff':>10} | {'ZNE <P>':>10} | {'Std':>10}")
print(f"  {'-' * 16}-+-{'-' * 10}-+-{'-' * 10}-+-{'-' * 10}")

term_evs = {}
for i, label in enumerate(term_order):
    ev = float(result[i + 1].data.evs)
    std = float(result[i + 1].data.stds)
    term_evs[label] = {"evs": ev, "stds": std}
    coeff = pauli_terms[label]
    print(f"  {label:>16} | {coeff:>+10.6f} | {ev:>+10.4f} | {std:>10.4f}")

# ---------------------------------------------------------------------------
# Save results
# ---------------------------------------------------------------------------
results = {
    "experiment": "LiH VQE with ZNE (Kandala replication)",
    "reference": "Kandala et al., Nature 549, 242 (2017)",
    "backend": BACKEND_NAME,
    "job_id": job_id,
    "resilience_level": RESILIENCE_LEVEL,
    "bond_distance_angstrom": BOND_DISTANCE,
    "basis_set": "STO-3G",
    "active_space": "CASCI(2,2)",
    "n_qubits": n_qubits,
    "ansatz_depth": depth,
    "n_params": len(optimal_params),
    "zne_energy_qubit": zne_energy,
    "zne_std": zne_std,
    "zne_energy_molecular": zne_mol,
    "zne_error_vs_fci_mHa": (zne_mol - E_FCI) * 1000,
    "zne_error_vs_casci_mHa": zne_vs_casci,
    "chemical_accuracy_vs_casci": zne_vs_casci < chem_acc,
    "per_term_evs": term_evs,
    "reference_energies": {
        "E_FCI": E_FCI,
        "E_HF": E_HF,
        "E_CASCI": E_CASCI,
        "E_qubit_gs": E_qubit_gs,
    },
}

outpath = f"/Users/dereklomas/haiqu/experiments/lih_zne_R{BOND_DISTANCE}_results.json"
with open(outpath, "w") as f:
    json.dump(results, f, indent=2)

print(f"\n  Results saved to {outpath}")
