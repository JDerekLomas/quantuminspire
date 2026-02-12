#!/usr/bin/env python3
"""LiH VQE with TREX error mitigation on IBM Fez.

Uses IBM's EstimatorV2 with resilience_level=1 (Twirled Readout EXtraction)
to get error-mitigated expectation values for the LiH Hamiltonian.

LiH at R=1.6 A, STO-3G basis, CASCI(2,2) active space.
4 qubits, 27 Pauli terms.

Comparison: raw Sampler results gave 354 mHa error.
TREX on H2 achieved chemical accuracy (0.22 kcal/mol = 0.35 mHa).

REPLICATION NOTE: TREX (readout twirling) is not the error mitigation used in
any cited paper. O'Malley used post-selection; Kandala used Richardson/ZNE.
TREX only fixes measurement errors, not gate errors — which dominate for 3-CNOT
circuits. Use resilience_level=2 (ZNE) to replicate Kandala's mitigation approach.
See .claude/handoffs/2026-02-12-vqe-experiments.md for full analysis.
"""
import json
import sys
import time

from qiskit.circuit import QuantumCircuit
from qiskit.quantum_info import SparsePauliOp
from qiskit import transpile
from qiskit_ibm_runtime import QiskitRuntimeService, EstimatorV2

# ---------------------------------------------------------------------------
# Hamiltonian (27 Pauli terms)
# Our convention: "ABCD" = A on q0, B on q1, C on q2, D on q3
# ---------------------------------------------------------------------------
pauli_terms = {
    "IIII": -8.35590992423199,
    "ZIII": 0.6166576277429734,
    "YZYI": 0.034563657541850486,
    "XZXI": 0.034563657541850486,
    "IZII": 0.6166576277429735,
    "IYZY": 0.034563657541850486,
    "IXZX": 0.034563657541850486,
    "IIZI": 0.370979366498277,
    "IIIZ": 0.37097936649827695,
    "ZZII": -0.12182774168311085,
    "ZYZY": -0.012144898067813291,
    "ZXZX": -0.012144898067813291,
    "YIYI": -0.012144898067813291,
    "XIXI": -0.012144898067813291,
    "YXXY": -0.003265995895202011,
    "YYXX": 0.003265995895202011,
    "XXYY": 0.003265995895202011,
    "XYYX": -0.003265995895202011,
    "ZIZI": -0.05263651530244966,
    "ZIIZ": -0.05590251119765166,
    "YZYZ": 0.0018710430187559995,
    "XZXZ": 0.0018710430187559995,
    "IZZI": -0.05590251119765166,
    "IYIY": 0.0018710430187559995,
    "IXIX": 0.0018710430187559995,
    "IZIZ": -0.05263651530244966,
    "IIZZ": -0.08447056786924143,
}

# Reference energies
E_VQE_ideal = -10.75456027230527
E_HF = -7.861864769808645
E_FCI = -7.882324378883491
E_CASCI = -7.862128833438587
offset = E_VQE_ideal - E_CASCI  # Maps active-space energy to molecular energy

# Optimal parameters from classical VQE
optimal_params = [
    -3.7070287006695962e-06,
    3.1416311869975133,
    2.422909564567009e-05,
    0.1827039191751927,
    2.3473523619385464e-05,
    -5.9733646291766766e-05,
    1.421176402472e-05,
    0.18270817005344223,
]

# ---------------------------------------------------------------------------
# Build ansatz circuit (NO measurements — Estimator handles those)
# ---------------------------------------------------------------------------
qc = QuantumCircuit(4)

# Hartree-Fock initial state |0011>
qc.x(0)
qc.x(1)

# Layer 1: Ry rotations
qc.ry(optimal_params[0], 0)
qc.ry(optimal_params[1], 1)
qc.ry(optimal_params[2], 2)
qc.ry(optimal_params[3], 3)

# Entangling layer: CNOT chain
qc.cx(0, 1)
qc.cx(1, 2)
qc.cx(2, 3)

# Layer 2: Ry rotations
qc.ry(optimal_params[4], 0)
qc.ry(optimal_params[5], 1)
qc.ry(optimal_params[6], 2)
qc.ry(optimal_params[7], 3)

print("Ansatz circuit:")
print(qc)
print()

# ---------------------------------------------------------------------------
# Build Hamiltonian as SparsePauliOp (Qiskit convention: rightmost = q0)
# ---------------------------------------------------------------------------
qiskit_terms = [(label[::-1], coeff) for label, coeff in pauli_terms.items()]
hamiltonian = SparsePauliOp.from_list(qiskit_terms).simplify()

print(f"Hamiltonian: {len(pauli_terms)} Pauli terms")
print(f"Ideal energy: {E_VQE_ideal:.6f} Ha")
print()

# Also build individual observables for per-term analysis
individual_obs = {}
for label, coeff in pauli_terms.items():
    if label == "IIII":
        continue
    qiskit_label = label[::-1]
    individual_obs[label] = SparsePauliOp.from_list([(qiskit_label, 1.0)])

# ---------------------------------------------------------------------------
# Connect to IBM and transpile
# ---------------------------------------------------------------------------
print("Connecting to IBM Quantum...")
service = QiskitRuntimeService()
backend = service.backend("ibm_fez")
print(f"Backend: {backend.name} ({backend.num_qubits} qubits)")

print("Transpiling circuit...")
isa_circuit = transpile(qc, target=backend.target, optimization_level=1,
                        translation_method='translator')
print(f"Transpiled depth: {isa_circuit.depth()}, gates: {isa_circuit.count_ops()}")

# Apply layout to all observables
isa_hamiltonian = hamiltonian.apply_layout(isa_circuit.layout)
isa_individual = {
    label: obs.apply_layout(isa_circuit.layout)
    for label, obs in individual_obs.items()
}

# ---------------------------------------------------------------------------
# Submit with TREX (resilience_level=1)
# ---------------------------------------------------------------------------
print("\nSubmitting with TREX (resilience_level=1)...")

estimator = EstimatorV2(backend)
estimator.options.resilience_level = 1  # TREX

# PUB 0: Full Hamiltonian
# PUBs 1-26: Individual Pauli terms (for per-term comparison)
pubs = [(isa_circuit, isa_hamiltonian)]
term_order = []
for label, isa_obs in isa_individual.items():
    pubs.append((isa_circuit, isa_obs))
    term_order.append(label)

job = estimator.run(pubs)
job_id = job.job_id()
print(f"Job submitted: {job_id}")
print(f"PUBs: 1 (full Hamiltonian) + {len(term_order)} (individual terms) = {len(pubs)}")

# ---------------------------------------------------------------------------
# Poll for results
# ---------------------------------------------------------------------------
print("\nWaiting for results...")
while True:
    status = job.status()
    print(f"  Status: {status}", end="\r")
    if status in ("DONE", "ERROR", "CANCELLED"):
        break
    time.sleep(15)

print(f"\nFinal status: {job.status()}")

if job.status() != "DONE":
    print(f"Job failed: {job.status()}")
    sys.exit(1)

result = job.result()

# ---------------------------------------------------------------------------
# Extract results
# ---------------------------------------------------------------------------
# Full Hamiltonian energy
trex_energy = float(result[0].data.evs)
trex_std = float(result[0].data.stds)

print("\n" + "=" * 72)
print("  LiH VQE — TREX ERROR MITIGATION RESULTS (IBM Fez)")
print("=" * 72)

print(f"\n  TREX energy (active-space): {trex_energy:.6f} +/- {trex_std:.6f} Ha")
print(f"  Ideal VQE energy:           {E_VQE_ideal:.6f} Ha")
print(f"  TREX error:                 {(trex_energy - E_VQE_ideal)*1000:+.1f} mHa")

# Convert to molecular energy
trex_mol = trex_energy - offset
raw_mol = -7.508  # From lih_compare.py: IBM Fez gave ~-10.400 active-space

print(f"\n  Molecular energy frame:")
print(f"  {'Method':<25} | {'Energy (Ha)':>12} | {'vs FCI (mHa)':>14}")
print(f"  {'-'*25}-+-{'-'*12}-+-{'-'*14}")
print(f"  {'FCI (exact)':<25} | {E_FCI:>12.6f} | {'---':>14}")
print(f"  {'CASCI(2,2) target':<25} | {E_CASCI:>12.6f} | {(E_CASCI-E_FCI)*1000:>+13.1f}m")
print(f"  {'TREX (IBM Fez)':<25} | {trex_mol:>12.6f} | {(trex_mol-E_FCI)*1000:>+13.1f}m")
print(f"  {'Raw Sampler (IBM Fez)':<25} | {-7.508:>12.3f}    | {(-7.508-E_FCI)*1000:>+13.1f}m")

# Chemical accuracy check
chem_acc = 1.6  # mHa
trex_vs_casci = abs(trex_mol - E_CASCI) * 1000
print(f"\n  Chemical accuracy (< {chem_acc} mHa)?")
print(f"  TREX vs CASCI target: {'YES' if trex_vs_casci < chem_acc else 'NO'} ({trex_vs_casci:.1f} mHa)")

# Per-term analysis
print(f"\n  Per-term expectation values (TREX vs raw Sampler):")
print(f"  {'Pauli':>12} | {'Coeff':>10} | {'TREX <P>':>10} | {'Std err':>10}")
print(f"  {'-'*12}-+-{'-'*10}-+-{'-'*10}-+-{'-'*10}")

term_evs = {}
for i, label in enumerate(term_order):
    ev = float(result[i + 1].data.evs)
    std = float(result[i + 1].data.stds)
    term_evs[label] = {"evs": ev, "stds": std}
    coeff = pauli_terms[label]
    print(f"  {label:>12} | {coeff:>+10.6f} | {ev:>+10.4f} | {std:>10.4f}")

# ---------------------------------------------------------------------------
# Save results
# ---------------------------------------------------------------------------
results = {
    "experiment": "LiH VQE with TREX",
    "backend": "ibm_fez",
    "job_id": job_id,
    "resilience_level": 1,
    "molecule": "LiH",
    "bond_distance_angstrom": 1.6,
    "basis_set": "STO-3G",
    "active_space": "CASCI(2,2)",
    "n_qubits": 4,
    "n_pauli_terms": 27,
    "trex_energy_active_space": trex_energy,
    "trex_std": trex_std,
    "trex_energy_molecular": trex_mol,
    "trex_error_mHa": (trex_mol - E_FCI) * 1000,
    "trex_vs_casci_mHa": trex_vs_casci,
    "chemical_accuracy": trex_vs_casci < chem_acc,
    "ideal_energy": E_VQE_ideal,
    "raw_sampler_error_mHa": 354.3,
    "improvement_factor": 354.3 / max(trex_vs_casci, 0.01),
    "per_term_evs": term_evs,
    "reference": {
        "E_FCI": E_FCI,
        "E_HF": E_HF,
        "E_CASCI": E_CASCI,
        "E_VQE_ideal": E_VQE_ideal,
    },
}

outpath = "/Users/dereklomas/haiqu/experiments/lih_trex_results.json"
with open(outpath, "w") as f:
    json.dump(results, f, indent=2)

print(f"\n  Results saved to {outpath}")
print(f"\n  TREX improvement: {354.3 / max(trex_vs_casci, 0.01):.1f}x better than raw Sampler")
