#!/usr/bin/env python3
"""IQM Garnet: Readout calibration + VQE H2 with hybrid PS+REM.

Submits 7 circuits individually:
  - 4 readout calibration (prep |00⟩, |01⟩, |10⟩, |11⟩)
  - 3 VQE basis measurements (Z, X, Y)

Uses native prx/cz gates. Computes confusion matrices, applies hybrid PS+REM.
"""

import json
import os
import sys
import time
import numpy as np
from pathlib import Path
from datetime import datetime, timezone
from math import pi

# ── Config ──────────────────────────────────────────────────────────────────
IQM_URL = "https://cocos.resonance.meetiqm.com/garnet"
SHOTS = 4096
ALPHA = -0.2234
QUBITS = ("QB1", "QB2")  # Best pair from prior calibration (97.3% Bell fidelity)

# H2 Hamiltonian (sector-projected, R=0.735 Å)
g0, g1, g2, g3, g4, g5 = -0.321124, 0.397937, -0.397937, 0.0, 0.090466, 0.090466
FCI = -1.137306

RESULTS_DIR = Path(__file__).parent.parent / "experiments" / "results"

# ── IQM helpers ─────────────────────────────────────────────────────────────
from iqm.iqm_client import IQMClient, Circuit, CircuitOperation

def prx(qubit, angle, phase):
    return CircuitOperation(name="prx", locus=(qubit,),
                            args={"angle": float(angle), "phase": float(phase)})

def cz(q1, q2):
    return CircuitOperation(name="cz", locus=(q1, q2), args={})

def meas(qubits, key="m"):
    return CircuitOperation(name="measure", locus=tuple(qubits), args={"key": key})

# Gate decompositions into prx + cz
def x_gate(q):
    return [prx(q, pi, 0.0)]

def h_gate(q):
    return [prx(q, pi, 0.0), prx(q, pi/2, pi/2)]

def ry_gate(q, theta):
    return [prx(q, theta, pi/2)]

def sdg_gate(q):
    """S† = Rz(-π/2). In prx: prx(0, -π/4) sandwich... use Rz decomposition.
    Rz(θ) = prx(π, θ/2) · prx(π, 0) — but simpler:
    S† ≡ phase shift. For Y-basis measurement: Rx(π/2) works too.
    Actually: Y-basis measurement = Rx(π/2) then measure.
    Rx(θ) = prx(θ, 0).
    """
    pass  # We'll use Rx(π/2) for Y-basis instead

def cnot_gate(ctrl, tgt):
    """CNOT = Ry(π/2)·CZ·Ry(-π/2) on target.

    NOTE: H·CZ·H does NOT give standard CNOT on IQM!
    IQM's H = prx(π,0)·prx(π/2,π/2) = -iH_standard, and H·CZ·H
    introduces a -1 phase on |00⟩, flipping the sign of X0X1/Y0Y1.
    Using Ry rotations avoids this phase error.
    """
    return [
        prx(tgt, pi/2, 3*pi/2),  # Ry(-π/2)
        cz(ctrl, tgt),
        prx(tgt, pi/2, pi/2),    # Ry(π/2)
    ]

# ── Build circuits ──────────────────────────────────────────────────────────
def make_readout_cal_circuits():
    q0, q1 = QUBITS
    circuits = []

    # prep_00: just measure
    circuits.append(("prep_00", Circuit(
        name="prep_00",
        instructions=tuple([meas([q0, q1])])
    )))

    # prep_01: X on q1
    circuits.append(("prep_01", Circuit(
        name="prep_01",
        instructions=tuple(x_gate(q1) + [meas([q0, q1])])
    )))

    # prep_10: X on q0
    circuits.append(("prep_10", Circuit(
        name="prep_10",
        instructions=tuple(x_gate(q0) + [meas([q0, q1])])
    )))

    # prep_11: X on both
    circuits.append(("prep_11", Circuit(
        name="prep_11",
        instructions=tuple(x_gate(q0) + x_gate(q1) + [meas([q0, q1])])
    )))

    return circuits

def make_vqe_circuits():
    q0, q1 = QUBITS
    circuits = []

    # Ansatz: Ry(α) on q0, CNOT q0→q1, X on q0
    ansatz = ry_gate(q0, ALPHA) + cnot_gate(q0, q1) + x_gate(q0)

    # Z-basis: ansatz + measure
    circuits.append(("z_basis", Circuit(
        name="vqe_z",
        instructions=tuple(ansatz + [meas([q0, q1])])
    )))

    # X-basis: ansatz + H on both + measure
    circuits.append(("x_basis", Circuit(
        name="vqe_x",
        instructions=tuple(ansatz + h_gate(q0) + h_gate(q1) + [meas([q0, q1])])
    )))

    # Y-basis: ansatz + Rx(π/2) on both + measure
    # Y-basis measurement: rotate |+y⟩→|0⟩, |-y⟩→|1⟩
    # Rx(π/2) = prx(π/2, 0) does this
    y_rot = [prx(q0, pi/2, 0.0), prx(q1, pi/2, 0.0)]
    circuits.append(("y_basis", Circuit(
        name="vqe_y",
        instructions=tuple(ansatz + y_rot + [meas([q0, q1])])
    )))

    return circuits

def extract_counts(result, circuit_idx=0):
    """Extract counts dict from IQM result."""
    measurements = result.measurements[circuit_idx]["m"]
    counts = {}
    for shot in measurements:
        bs = ''.join(str(b) for b in shot)
        counts[bs] = counts.get(bs, 0) + 1
    return counts

# ── Submit & analyze ────────────────────────────────────────────────────────
def main():
    # secret-lover stores as IQM_API_KEY; IQM client reads IQM_TOKEN
    token = os.environ.get("IQM_TOKEN") or os.environ.get("IQM_API_KEY")
    if not token:
        print("ERROR: IQM_TOKEN/IQM_API_KEY not set. Run: secret-lover run -- python3 scripts/iqm_vqe_rem.py")
        sys.exit(1)
    os.environ["IQM_TOKEN"] = token

    print(f"Connecting to IQM Garnet...")
    client = IQMClient(IQM_URL)

    cal_circuits = make_readout_cal_circuits()
    vqe_circuits = make_vqe_circuits()
    all_circuits = cal_circuits + vqe_circuits

    submitted_at = datetime.now(timezone.utc).isoformat()
    counts_by_label = {}

    for label, circuit in all_circuits:
        print(f"  Submitting {label}...", end=" ", flush=True)
        t0 = time.time()
        job_id = client.submit_circuits([circuit], shots=SHOTS)
        result = client.wait_for_results(job_id, timeout_secs=600)
        counts = extract_counts(result)
        counts_by_label[label] = counts
        elapsed = time.time() - t0
        top = sorted(counts.items(), key=lambda x: -x[1])[:3]
        print(f"done ({elapsed:.1f}s) {dict(top)}")

    completed_at = datetime.now(timezone.utc).isoformat()

    # ── Readout calibration ─────────────────────────────────────────────────
    print("\n=== READOUT CALIBRATION ===")

    def confusion_matrix_1q(counts_0, counts_1, qubit_idx):
        """Build 2x2 confusion matrix for one qubit.
        IQM format: leftmost bit = first qubit in locus (QB1).
        qubit_idx: 0 = QB1 (left), 1 = QB2 (right)
        """
        total_0 = sum(counts_0.values())
        total_1 = sum(counts_1.values())

        p0_given_0 = sum(c for bs, c in counts_0.items() if bs[qubit_idx] == '0') / total_0
        p1_given_0 = 1 - p0_given_0
        p0_given_1 = sum(c for bs, c in counts_1.items() if bs[qubit_idx] == '0') / total_1
        p1_given_1 = 1 - p0_given_1

        return np.array([[p0_given_0, p0_given_1],
                         [p1_given_0, p1_given_1]])

    # QB1 (idx 0): prep_00 (QB1=0) vs prep_10 (QB1=1)
    M0 = confusion_matrix_1q(counts_by_label["prep_00"], counts_by_label["prep_10"], 0)
    # QB2 (idx 1): prep_00 (QB2=0) vs prep_01 (QB2=1)
    M1 = confusion_matrix_1q(counts_by_label["prep_00"], counts_by_label["prep_01"], 1)

    M0_inv = np.linalg.inv(M0)
    M1_inv = np.linalg.inv(M1)

    q0_err = 1 - (M0[0,0] + M0[1,1]) / 2
    q1_err = 1 - (M1[0,0] + M1[1,1]) / 2

    print(f"  QB1 confusion: [[{M0[0,0]:.4f}, {M0[0,1]:.4f}], [{M0[1,0]:.4f}, {M0[1,1]:.4f}]]")
    print(f"  QB2 confusion: [[{M1[0,0]:.4f}, {M1[0,1]:.4f}], [{M1[1,0]:.4f}, {M1[1,1]:.4f}]]")
    print(f"  QB1 error: {q0_err:.2%}, QB2 error: {q1_err:.2%}")

    cal_result = {
        "id": "readout-cal-iqm-garnet-001",
        "type": "readout_calibration",
        "backend": "iqm-garnet",
        "submitted": submitted_at,
        "completed": completed_at,
        "parameters": {"shots": SHOTS, "qubits": list(QUBITS)},
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
    cal_path = RESULTS_DIR / "readout-cal-iqm-garnet-001.json"
    with open(cal_path, "w") as f:
        json.dump(cal_result, f, indent=2)
    print(f"  Saved: {cal_path}")

    # ── VQE Analysis ────────────────────────────────────────────────────────
    print("\n=== VQE ANALYSIS ===")

    z_counts = counts_by_label["z_basis"]
    x_counts = counts_by_label["x_basis"]
    y_counts = counts_by_label["y_basis"]

    def expectations_from_counts(counts):
        """IQM format: leftmost bit = QB1 (q0), rightmost = QB2 (q1)."""
        total = sum(counts.values())
        z0, z1, z0z1 = 0, 0, 0
        for bs, c in counts.items():
            b0 = int(bs[0])   # QB1
            b1 = int(bs[1])   # QB2
            z0 += (1 - 2*b0) * c
            z1 += (1 - 2*b1) * c
            z0z1 += (1 - 2*b0) * (1 - 2*b1) * c
        return z0/total, z1/total, z0z1/total

    # Raw
    exp_z0, exp_z1, exp_z0z1 = expectations_from_counts(z_counts)
    _, _, exp_x0x1 = expectations_from_counts(x_counts)
    _, _, exp_y0y1 = expectations_from_counts(y_counts)
    energy_raw = g0 + g1*exp_z0 + g2*exp_z1 + g3*exp_z0z1 + g4*exp_x0x1 + g5*exp_y0y1

    # Post-selected (odd parity)
    z_ps = {bs: c for bs, c in z_counts.items()
            if (int(bs[0]) + int(bs[1])) % 2 == 1}
    z_ps_total = sum(z_ps.values())
    keep_fraction = z_ps_total / sum(z_counts.values()) if z_counts else 0

    ps_z0, ps_z1, ps_z0z1 = expectations_from_counts(z_ps) if z_ps_total > 0 else (exp_z0, exp_z1, exp_z0z1)
    energy_ps = g0 + g1*ps_z0 + g2*ps_z1 + g3*ps_z0z1 + g4*exp_x0x1 + g5*exp_y0y1

    # REM
    def apply_rem(counts, M0_inv, M1_inv):
        total = sum(counts.values())
        states = ["00", "01", "10", "11"]
        p = np.array([counts.get(s, 0) / total for s in states])
        M_inv = np.kron(M0_inv, M1_inv)  # IQM: QB1⊗QB2
        p_corr = M_inv @ p
        p_corr = np.maximum(p_corr, 0)
        if p_corr.sum() > 0:
            p_corr /= p_corr.sum()
        return {s: p_corr[i] for i, s in enumerate(states)}

    z_rem = apply_rem(z_counts, M0_inv, M1_inv)
    x_rem = apply_rem(x_counts, M0_inv, M1_inv)
    y_rem = apply_rem(y_counts, M0_inv, M1_inv)

    def exp_from_probs(probs):
        z0 = sum((1-2*int(k[0]))*v for k,v in probs.items())
        z1 = sum((1-2*int(k[1]))*v for k,v in probs.items())
        z0z1 = sum((1-2*int(k[0]))*(1-2*int(k[1]))*v for k,v in probs.items())
        return z0, z1, z0z1

    rem_z0, rem_z1, rem_z0z1 = exp_from_probs(z_rem)
    _, _, rem_x0x1 = exp_from_probs(x_rem)
    _, _, rem_y0y1 = exp_from_probs(y_rem)
    energy_rem = g0 + g1*rem_z0 + g2*rem_z1 + g3*rem_z0z1 + g4*rem_x0x1 + g5*rem_y0y1

    # Hybrid: PS for Z + REM for X/Y
    energy_hybrid = g0 + g1*ps_z0 + g2*ps_z1 + g3*ps_z0z1 + g4*rem_x0x1 + g5*rem_y0y1

    print(f"  Raw:     {energy_raw:.6f} Ha ({abs(energy_raw - FCI) * 627.509:.2f} kcal/mol)")
    print(f"  PS:      {energy_ps:.6f} Ha ({abs(energy_ps - FCI) * 627.509:.2f} kcal/mol) [keep={keep_fraction:.1%}]")
    print(f"  REM:     {energy_rem:.6f} Ha ({abs(energy_rem - FCI) * 627.509:.2f} kcal/mol)")
    print(f"  Hybrid:  {energy_hybrid:.6f} Ha ({abs(energy_hybrid - FCI) * 627.509:.2f} kcal/mol)")
    print(f"  FCI:     {FCI:.6f} Ha")
    print(f"  Chem acc: {abs(energy_hybrid - FCI) < 0.0016}")

    best_energy = energy_hybrid
    vqe_result = {
        "id": "vqe-iqm-garnet-rem-001",
        "type": "vqe_h2",
        "backend": "iqm-garnet",
        "submitted": submitted_at,
        "completed": completed_at,
        "parameters": {
            "shots": SHOTS,
            "bond_distance": 0.735,
            "alpha": ALPHA,
            "qubits": list(QUBITS),
            "g0": g0, "g1": g1, "g2": g2, "g3": g3, "g4": g4, "g5": g5,
            "fci_energy": FCI,
            "readout_cal_file": "readout-cal-iqm-garnet-001",
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
            "readout_cal_file": "readout-cal-iqm-garnet-001",
        },
    }
    vqe_path = RESULTS_DIR / "vqe-iqm-garnet-rem-001.json"
    with open(vqe_path, "w") as f:
        json.dump(vqe_result, f, indent=2)
    print(f"\n  Saved: {vqe_path}")

    # Summary
    print("\n=== CROSS-PLATFORM COMPARISON ===")
    print(f"  IQM Garnet (hybrid PS+REM): {abs(energy_hybrid - FCI) * 627.509:.2f} kcal/mol")
    print(f"  IBM Torino (TREX, prior):   0.22 kcal/mol")
    print(f"  Tuna-9 (hybrid PS+REM):     0.92 kcal/mol (best), 3.29 mean")
    print(f"  Emulator:                   0.75 kcal/mol")


if __name__ == "__main__":
    main()
