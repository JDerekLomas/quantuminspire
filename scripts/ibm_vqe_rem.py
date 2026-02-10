#!/usr/bin/env python3
"""IBM Torino: Readout calibration + VQE H2 with hybrid PS+REM.

Submits 7 circuits as a single batch job:
  - 4 readout calibration (prep |00⟩, |01⟩, |10⟩, |11⟩)
  - 3 VQE basis measurements (Z, X, Y)

Computes confusion matrices, applies hybrid PS+REM, saves results.
"""

import json
import sys
import time
import numpy as np
from pathlib import Path
from datetime import datetime, timezone

# ── Config ──────────────────────────────────────────────────────────────────
BACKEND_NAME = "ibm_torino"
SHOTS = 4096
ALPHA = -0.2234  # Optimal VQE angle for H2 R=0.735

# H2 Hamiltonian (sector-projected, R=0.735 Å)
g0, g1, g2, g3, g4, g5 = -0.321124, 0.397937, -0.397937, 0.0, 0.090466, 0.090466
FCI = -1.137306

RESULTS_DIR = Path(__file__).parent.parent / "experiments" / "results"

# ── Build circuits ──────────────────────────────────────────────────────────
from qiskit import QuantumCircuit, transpile

def make_readout_cal_circuits():
    """4 circuits preparing |00⟩, |01⟩, |10⟩, |11⟩."""
    circuits = []
    for label, x_qubits in [("prep_00", []), ("prep_01", [1]), ("prep_10", [0]), ("prep_11", [0, 1])]:
        qc = QuantumCircuit(2, 2, name=label)
        for q in x_qubits:
            qc.x(q)
        qc.measure([0, 1], [0, 1])
        circuits.append((label, qc))
    return circuits

def make_vqe_circuits():
    """3 VQE circuits for Z, X, Y basis measurement."""
    circuits = []

    # Z-basis
    qc_z = QuantumCircuit(2, 2, name="vqe_z")
    qc_z.ry(ALPHA, 0)
    qc_z.cx(0, 1)
    qc_z.x(0)
    qc_z.measure([0, 1], [0, 1])
    circuits.append(("z_basis", qc_z))

    # X-basis: ansatz + H on both
    qc_x = QuantumCircuit(2, 2, name="vqe_x")
    qc_x.ry(ALPHA, 0)
    qc_x.cx(0, 1)
    qc_x.x(0)
    qc_x.h(0)
    qc_x.h(1)
    qc_x.measure([0, 1], [0, 1])
    circuits.append(("x_basis", qc_x))

    # Y-basis: ansatz + Sdg+H on both
    qc_y = QuantumCircuit(2, 2, name="vqe_y")
    qc_y.ry(ALPHA, 0)
    qc_y.cx(0, 1)
    qc_y.x(0)
    qc_y.sdg(0)
    qc_y.h(0)
    qc_y.sdg(1)
    qc_y.h(1)
    qc_y.measure([0, 1], [0, 1])
    circuits.append(("y_basis", qc_y))

    return circuits

# ── Submit ──────────────────────────────────────────────────────────────────
def main():
    from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2

    print(f"Connecting to IBM Quantum ({BACKEND_NAME})...")
    service = QiskitRuntimeService(channel="ibm_cloud")
    backend = service.backend(BACKEND_NAME)
    print(f"Backend: {backend.name}, {backend.num_qubits} qubits")

    # Build all circuits
    cal_circuits = make_readout_cal_circuits()
    vqe_circuits = make_vqe_circuits()

    all_labels = [l for l, _ in cal_circuits] + [l for l, _ in vqe_circuits]
    all_qcs = [qc for _, qc in cal_circuits] + [qc for _, qc in vqe_circuits]

    # Transpile
    print("Transpiling 7 circuits...")
    try:
        transpiled = transpile(all_qcs, backend=backend, optimization_level=1)
    except Exception as e:
        print(f"Transpile with backend failed ({e}), using fallback...")
        transpiled = transpile(
            all_qcs,
            coupling_map=backend.coupling_map,
            basis_gates=list(backend.operation_names),
            optimization_level=1,
        )

    # Log physical qubit mapping from first transpiled circuit
    phys_qubits = set()
    for instr in transpiled[0].data:
        for q in instr.qubits:
            phys_qubits.add(transpiled[0].qubits.index(q))
    print(f"Physical qubits: {sorted(phys_qubits)}")

    # Submit batch
    print(f"Submitting {len(transpiled)} circuits ({SHOTS} shots each)...")
    submitted_at = datetime.now(timezone.utc).isoformat()
    sampler = SamplerV2(backend)
    job = sampler.run(transpiled, shots=SHOTS)
    job_id = job.job_id()
    print(f"Job ID: {job_id}")

    # Wait for results
    print("Waiting for results...")
    t0 = time.time()
    result = job.result()
    elapsed = time.time() - t0
    completed_at = datetime.now(timezone.utc).isoformat()
    print(f"Results received in {elapsed:.1f}s")

    # ── Extract counts ──────────────────────────────────────────────────────
    counts_by_label = {}
    for i, label in enumerate(all_labels):
        # SamplerV2 returns BitArray; convert to counts dict
        pub_result = result[i]
        creg_name = list(pub_result.data.__dict__.keys())[0]
        bit_array = getattr(pub_result.data, creg_name)
        counts = bit_array.get_counts()
        counts_by_label[label] = counts
        print(f"  {label}: {dict(sorted(counts.items(), key=lambda x: -x[1])[:4])}...")

    # ── Readout calibration ─────────────────────────────────────────────────
    print("\n=== READOUT CALIBRATION ===")

    def confusion_matrix_1q(counts_0, counts_1, qubit_idx):
        """Build 2x2 confusion matrix for one qubit.
        qubit_idx: 0 or 1 (IBM: rightmost bit = q0)
        """
        total_0 = sum(counts_0.values())
        total_1 = sum(counts_1.values())

        # Marginalize to single qubit
        p0_given_0 = sum(c for bs, c in counts_0.items() if bs[-(qubit_idx+1)] == '0') / total_0
        p1_given_0 = 1 - p0_given_0
        p0_given_1 = sum(c for bs, c in counts_1.items() if bs[-(qubit_idx+1)] == '0') / total_1
        p1_given_1 = 1 - p0_given_1

        M = np.array([[p0_given_0, p0_given_1],
                       [p1_given_0, p1_given_1]])
        return M

    # For qubit 0: use prep_00 (q0=0) and prep_10 (q0=1)
    M0 = confusion_matrix_1q(counts_by_label["prep_00"], counts_by_label["prep_10"], 0)
    # For qubit 1: use prep_00 (q1=0) and prep_01 (q1=1)
    M1 = confusion_matrix_1q(counts_by_label["prep_00"], counts_by_label["prep_01"], 1)

    M0_inv = np.linalg.inv(M0)
    M1_inv = np.linalg.inv(M1)

    q0_err = 1 - (M0[0,0] + M0[1,1]) / 2
    q1_err = 1 - (M1[0,0] + M1[1,1]) / 2

    print(f"  q0 confusion: [[{M0[0,0]:.4f}, {M0[0,1]:.4f}], [{M0[1,0]:.4f}, {M0[1,1]:.4f}]]")
    print(f"  q1 confusion: [[{M1[0,0]:.4f}, {M1[0,1]:.4f}], [{M1[1,0]:.4f}, {M1[1,1]:.4f}]]")
    print(f"  q0 error: {q0_err:.2%}, q1 error: {q1_err:.2%}")

    # Save readout cal result
    cal_result = {
        "id": "readout-cal-ibm-torino-001",
        "type": "readout_calibration",
        "backend": "ibm-torino",
        "submitted": submitted_at,
        "completed": completed_at,
        "job_id": job_id,
        "parameters": {"shots": SHOTS, "qubits": [0, 1]},
        "raw_counts": {k: counts_by_label[k] for k in ["prep_00", "prep_01", "prep_10", "prep_11"]},
        "analysis": {
            "confusion_matrix_q0": M0.tolist(),
            "confusion_matrix_q1": M1.tolist(),
            "inverse_matrix_q0": M0_inv.tolist(),
            "inverse_matrix_q1": M1_inv.tolist(),
            "readout_error_q0": round(q0_err, 6),
            "readout_error_q1": round(q1_err, 6),
            "q0_flip_0to1": round(float(M0[1,0]), 6),
            "q0_flip_1to0": round(float(M0[0,1]), 6),
            "q1_flip_0to1": round(float(M1[1,0]), 6),
            "q1_flip_1to0": round(float(M1[0,1]), 6),
        },
    }
    cal_path = RESULTS_DIR / "readout-cal-ibm-torino-001.json"
    with open(cal_path, "w") as f:
        json.dump(cal_result, f, indent=2)
    print(f"  Saved: {cal_path}")

    # ── VQE Analysis ────────────────────────────────────────────────────────
    print("\n=== VQE ANALYSIS ===")

    z_counts = counts_by_label["z_basis"]
    x_counts = counts_by_label["x_basis"]
    y_counts = counts_by_label["y_basis"]

    def expectations_from_counts(counts):
        """Compute <Z0>, <Z1>, <Z0Z1> from 2-qubit bitstring counts.
        IBM format: rightmost bit = q0.
        """
        total = sum(counts.values())
        z0, z1, z0z1 = 0, 0, 0
        for bs, c in counts.items():
            b0 = int(bs[-1])   # q0 = rightmost
            b1 = int(bs[-2])   # q1
            z0 += (1 - 2*b0) * c
            z1 += (1 - 2*b1) * c
            z0z1 += (1 - 2*b0) * (1 - 2*b1) * c
        return z0/total, z1/total, z0z1/total

    # Raw
    exp_z0, exp_z1, exp_z0z1 = expectations_from_counts(z_counts)
    _, _, exp_x0x1 = expectations_from_counts(x_counts)
    _, _, exp_y0y1 = expectations_from_counts(y_counts)
    energy_raw = g0 + g1*exp_z0 + g2*exp_z1 + g3*exp_z0z1 + g4*exp_x0x1 + g5*exp_y0y1

    # Post-selected (odd parity on Z-basis)
    z_ps = {bs: c for bs, c in z_counts.items()
            if (int(bs[-1]) + int(bs[-2])) % 2 == 1}
    z_ps_total = sum(z_ps.values())
    keep_fraction = z_ps_total / sum(z_counts.values())

    ps_z0, ps_z1, ps_z0z1 = expectations_from_counts(z_ps) if z_ps_total > 0 else (exp_z0, exp_z1, exp_z0z1)
    energy_ps = g0 + g1*ps_z0 + g2*ps_z1 + g3*ps_z0z1 + g4*exp_x0x1 + g5*exp_y0y1

    # REM correction
    def apply_rem(counts, M0_inv, M1_inv):
        """Apply readout error mitigation to 2-qubit counts."""
        total = sum(counts.values())
        states = ["00", "01", "10", "11"]
        p = np.array([counts.get(s, 0) / total for s in states])
        M_inv = np.kron(M1_inv, M0_inv)  # Note: IBM ordering q1⊗q0
        p_corr = M_inv @ p
        p_corr = np.maximum(p_corr, 0)
        if p_corr.sum() > 0:
            p_corr /= p_corr.sum()
        return {s: p_corr[i] for i, s in enumerate(states)}

    z_rem = apply_rem(z_counts, M0_inv, M1_inv)
    x_rem = apply_rem(x_counts, M0_inv, M1_inv)
    y_rem = apply_rem(y_counts, M0_inv, M1_inv)

    def exp_from_probs(probs):
        z0 = sum((1-2*int(k[-1]))*v for k,v in probs.items())
        z1 = sum((1-2*int(k[-2]))*v for k,v in probs.items())
        z0z1 = sum((1-2*int(k[-1]))*(1-2*int(k[-2]))*v for k,v in probs.items())
        return z0, z1, z0z1

    rem_z0, rem_z1, rem_z0z1 = exp_from_probs(z_rem)
    _, _, rem_x0x1 = exp_from_probs(x_rem)
    _, _, rem_y0y1 = exp_from_probs(y_rem)
    energy_rem = g0 + g1*rem_z0 + g2*rem_z1 + g3*rem_z0z1 + g4*rem_x0x1 + g5*rem_y0y1

    # Hybrid: PS for Z + REM for X/Y
    energy_hybrid = g0 + g1*ps_z0 + g2*ps_z1 + g3*ps_z0z1 + g4*rem_x0x1 + g5*rem_y0y1

    # Print summary
    print(f"  Raw:     {energy_raw:.6f} Ha ({abs(energy_raw - FCI) * 627.509:.2f} kcal/mol)")
    print(f"  PS:      {energy_ps:.6f} Ha ({abs(energy_ps - FCI) * 627.509:.2f} kcal/mol) [keep={keep_fraction:.1%}]")
    print(f"  REM:     {energy_rem:.6f} Ha ({abs(energy_rem - FCI) * 627.509:.2f} kcal/mol)")
    print(f"  Hybrid:  {energy_hybrid:.6f} Ha ({abs(energy_hybrid - FCI) * 627.509:.2f} kcal/mol)")
    print(f"  FCI:     {FCI:.6f} Ha")
    print(f"  Chem acc: {abs(energy_hybrid - FCI) < 0.0016}")

    # Save VQE result
    best_energy = energy_hybrid
    vqe_result = {
        "id": "vqe-ibm-torino-rem-001",
        "type": "vqe_h2",
        "backend": "ibm-torino",
        "submitted": submitted_at,
        "completed": completed_at,
        "job_id": job_id,
        "parameters": {
            "shots": SHOTS,
            "bond_distance": 0.735,
            "alpha": ALPHA,
            "qubits": [0, 1],
            "g0": g0, "g1": g1, "g2": g2, "g3": g3, "g4": g4, "g5": g5,
            "fci_energy": FCI,
            "readout_cal_file": "readout-cal-ibm-torino-001",
        },
        "raw_counts": {
            "z_basis": z_counts,
            "x_basis": x_counts,
            "y_basis": y_counts,
        },
        "analysis": {
            "energy_hartree": round(best_energy, 6),
            "energy_raw": round(energy_raw, 6),
            "energy_postselected": round(energy_ps, 6),
            "energy_rem": round(energy_rem, 6),
            "energy_hybrid": round(energy_hybrid, 6),
            "postselection_keep_fraction": round(keep_fraction, 4),
            "fci_energy": FCI,
            "error_hartree": round(abs(best_energy - FCI), 6),
            "error_kcal_mol": round(abs(best_energy - FCI) * 627.509, 2),
            "error_raw_kcal_mol": round(abs(energy_raw - FCI) * 627.509, 2),
            "error_ps_kcal_mol": round(abs(energy_ps - FCI) * 627.509, 2),
            "error_rem_kcal_mol": round(abs(energy_rem - FCI) * 627.509, 2),
            "error_hybrid_kcal_mol": round(abs(energy_hybrid - FCI) * 627.509, 2),
            "chemical_accuracy": bool(abs(best_energy - FCI) < 0.0016),
            "expectation_values": {
                "Z0": round(ps_z0, 4), "Z1": round(ps_z1, 4),
                "Z0Z1": round(ps_z0z1, 4),
                "X0X1": round(exp_x0x1, 4), "Y0Y1": round(exp_y0y1, 4),
            },
            "rem_expectation_values": {
                "Z0": round(rem_z0, 4), "Z1": round(rem_z1, 4),
                "Z0Z1": round(rem_z0z1, 4),
                "X0X1": round(rem_x0x1, 4), "Y0Y1": round(rem_y0y1, 4),
            },
            "readout_cal_file": "readout-cal-ibm-torino-001",
        },
    }
    vqe_path = RESULTS_DIR / "vqe-ibm-torino-rem-001.json"
    with open(vqe_path, "w") as f:
        json.dump(vqe_result, f, indent=2)
    print(f"\n  Saved: {vqe_path}")

    # Summary comparison with other platforms
    print("\n=== CROSS-PLATFORM COMPARISON ===")
    print(f"  IBM Torino (hybrid PS+REM): {abs(energy_hybrid - FCI) * 627.509:.2f} kcal/mol")
    print(f"  IBM Torino (TREX, prior):   0.22 kcal/mol")
    print(f"  Tuna-9 (hybrid PS+REM):     0.92 kcal/mol (best), 3.29 mean")
    print(f"  Emulator:                   0.75 kcal/mol")


if __name__ == "__main__":
    main()
