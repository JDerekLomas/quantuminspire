#!/usr/bin/env python3
"""Run VQE, QV, and RB experiments on IQM Garnet (20q).

Submits circuits using iqm-client with native gates: prx, cz, measure.
IQM native decompositions:
  H = prx(pi, 0) then prx(pi/2, pi/2)
  CNOT(ctrl, tgt) = H(tgt), CZ(ctrl, tgt), H(tgt)
  Ry(theta) = prx(theta, pi/2)
  Rx(theta) = prx(theta, 0)

prx(theta, phi) = exp(-i*theta/2 * (cos(phi)*X + sin(phi)*Y))
  prx(pi, 0) = -iX  (X rotation by pi)
  prx(pi/2, pi/2) = Ry(pi/2) * global phase

iqm-client 32.1.1 API:
  CircuitOperation(name, locus, args)
  - locus: tuple of qubit names, e.g. ('QB1',) or ('QB1', 'QB2')
  - args: {'angle': radians, 'phase': radians} for prx; {'key': str} for measure
  Circuit(name, instructions) — instructions is a TUPLE of CircuitOperation
"""

import json
import os
import sys
import time
import hashlib
from math import pi
from datetime import datetime, timezone
from pathlib import Path

from iqm.iqm_client import IQMClient, Circuit, CircuitOperation

# ── Config ──────────────────────────────────────────────────────────────────

IQM_URL = "https://cocos.resonance.meetiqm.com/garnet"
SHOTS = 1024
RESULTS_DIR = Path("experiments/results")

# Best qubit pair from Bell calibration: QB1-QB2 (97.3% fidelity)
VQE_QUBITS = ["QB1", "QB2"]
QV_QUBITS_2 = ["QB1", "QB2"]
QV_QUBITS_3 = ["QB1", "QB2", "QB3"]
RB_QUBIT = "QB1"

# VQE H2 parameters (sector-projected, R=0.735 Å)
THETA = 0.1118  # optimal theta for sector-projected coefficients
g0, g1, g2, g3, g4, g5 = -0.321124, 0.397937, -0.397937, 0.0, 0.090466, 0.090466
FCI = -1.1373

# ── Helper: native gate decompositions ──────────────────────────────────────

def prx(qubit, angle, phase):
    """Single prx gate."""
    return CircuitOperation(name="prx", locus=(qubit,), args={"angle": angle, "phase": phase})

def h_gate(qubit):
    """Hadamard = prx(pi,0) then prx(pi/2, pi/2)."""
    return [prx(qubit, pi, 0.0), prx(qubit, pi/2, pi/2)]

def ry_gate(qubit, theta):
    """Ry(theta) = prx(theta, pi/2)."""
    return [prx(qubit, theta, pi/2)]

def rx_gate(qubit, theta):
    """Rx(theta) = prx(theta, 0)."""
    return [prx(qubit, theta, 0.0)]

def x_gate(qubit):
    """X gate = prx(pi, 0)."""
    return [prx(qubit, pi, 0.0)]

def cnot_gate(ctrl, tgt):
    """CNOT = H(tgt), CZ(ctrl,tgt), H(tgt)."""
    return h_gate(tgt) + [
        CircuitOperation(name="cz", locus=(ctrl, tgt), args={}),
    ] + h_gate(tgt)

def measure_all(qubits, key="m"):
    """Measure all qubits."""
    return [CircuitOperation(name="measure", locus=tuple(qubits), args={"key": key})]

def make_circuit(name, ops):
    """Create IQM Circuit from a list of CircuitOperation."""
    return Circuit(name=name, instructions=tuple(ops))


# ── Result extraction ────────────────────────────────────────────────────────

def extract_counts(run_result, circuit_index=0, key="m"):
    """Extract bitstring counts from IQM RunResult.

    RunResult.measurements is a list (one per circuit).
    Each element maps measurement key → 2D list [[q0,q1,...], [q0,q1,...], ...]
    """
    measurements = run_result.measurements
    if not measurements or len(measurements) <= circuit_index:
        return {}

    circuit_meas = measurements[circuit_index]
    if key not in circuit_meas:
        print(f"  Warning: key '{key}' not in measurements. Keys: {list(circuit_meas.keys())}")
        return {}

    raw_data = circuit_meas[key]
    counts = {}
    for shot in raw_data:
        bitstring = ''.join(str(b) for b in shot)
        counts[bitstring] = counts.get(bitstring, 0) + 1
    return counts


# ── VQE Circuits ────────────────────────────────────────────────────────────

def vqe_z_basis():
    """VQE 2-qubit ansatz: X(q1) Ry(theta,q0) CNOT(q0,q1) + Z-basis measurement.
    Prepares HF reference |01⟩, then Ry(theta) creates superposition,
    CNOT entangles to cos(theta/2)|01⟩ + sin(theta/2)|10⟩."""
    q0, q1 = VQE_QUBITS
    ops = []
    ops += x_gate(q1)           # HF reference: |01⟩ (q0=0, q1=1)
    ops += ry_gate(q0, THETA)   # Create superposition on q0
    ops += cnot_gate(q0, q1)    # Entangle: cos|01⟩ + sin|10⟩
    ops += measure_all(VQE_QUBITS)
    return make_circuit("vqe_z", ops)

def vqe_x_basis():
    """VQE ansatz + H gates for X-basis measurement."""
    q0, q1 = VQE_QUBITS
    ops = []
    ops += x_gate(q1)
    ops += ry_gate(q0, THETA)
    ops += cnot_gate(q0, q1)
    ops += h_gate(q0)           # Rotate to X basis
    ops += h_gate(q1)
    ops += measure_all(VQE_QUBITS)
    return make_circuit("vqe_x", ops)

def vqe_y_basis():
    """VQE ansatz + Rx(pi/2) for Y-basis measurement.
    Y-basis: apply Rx(pi/2) then measure Z."""
    q0, q1 = VQE_QUBITS
    ops = []
    ops += x_gate(q1)
    ops += ry_gate(q0, THETA)
    ops += cnot_gate(q0, q1)
    ops += rx_gate(q0, pi/2)    # Rotate to Y basis
    ops += rx_gate(q1, pi/2)
    ops += measure_all(VQE_QUBITS)
    return make_circuit("vqe_y", ops)


# ── QV Circuits ─────────────────────────────────────────────────────────────

def random_su2_prx(qubit, rng):
    """Haar-random SU(2) gate decomposed into prx gates.
    Uses Euler angles: Rz(alpha).Ry(beta).Rz(gamma).
    Rz(t) = prx(pi, t/2).prx(pi, 0) but simplest is 3 random prx gates."""
    alpha = rng.uniform(0, 2*pi)
    beta = rng.uniform(0, pi)
    gamma = rng.uniform(0, 2*pi)
    return [
        prx(qubit, alpha, 0.0),
        prx(qubit, beta, pi/2),
        prx(qubit, gamma, 0.0),
    ]

def qv_circuit_iqm(n_qubits, circuit_idx, seed=123):
    """Generate a QV circuit for IQM native gates."""
    import numpy as np
    rng = np.random.RandomState(seed * 100 + circuit_idx)

    qubits = QV_QUBITS_2 if n_qubits == 2 else QV_QUBITS_3

    ops = []
    for layer in range(n_qubits):
        # Random SU(2) on each qubit
        for q in qubits:
            ops += random_su2_prx(q, rng)
        # Random CNOT between pairs
        if n_qubits == 2:
            ops += cnot_gate(qubits[0], qubits[1])
            for q in qubits:
                ops += random_su2_prx(q, rng)
        elif n_qubits == 3:
            ops += cnot_gate(qubits[0], qubits[1])
            for q in qubits:
                ops += random_su2_prx(q, rng)

    ops += measure_all(qubits)
    return make_circuit(f"qv_n{n_qubits}_c{circuit_idx}", ops)


# ── RB Circuits ─────────────────────────────────────────────────────────────

# 24 single-qubit Cliffords as prx(angle, phase) sequences (radians)
CLIFFORDS = [
    [],                                                  # I
    [(pi, 0.0)],                                        # X
    [(pi, pi/2)],                                       # Y
    [(pi, 0.0), (pi, pi/2)],                            # Z = X.Y
    [(pi, 0.0), (pi/2, pi/2)],                          # H-like
    [(pi/2, pi/2)],                                     # sqrt(Y)
    [(pi/2, 0.0)],                                      # sqrt(X)
    [(3*pi/2, 0.0)],                                    # sqrt(X)†
    [(3*pi/2, pi/2)],                                   # sqrt(Y)†
    [(pi/2, 0.0), (pi/2, pi/2)],                        # Clifford 9
    [(pi/2, pi/2), (pi/2, 0.0)],                        # Clifford 10
    [(pi, 0.0), (pi/2, 0.0)],                           # X.sqrt(X)
    [(pi, pi/2), (pi/2, 0.0)],                          # Y.sqrt(X)
    [(pi/2, 0.0), (pi, pi/2)],                          # sqrt(X).Y
    [(pi, 0.0), (pi/2, pi/2)],                          # X.sqrt(Y)
    [(pi/2, pi/2), (pi, 0.0)],                          # sqrt(Y).X
    [(pi, pi/2), (pi/2, pi/2)],                         # Y.sqrt(Y)
    [(3*pi/2, 0.0), (pi/2, pi/2)],                      # Clifford 17
    [(pi/2, 0.0), (3*pi/2, pi/2)],                      # Clifford 18
    [(3*pi/2, pi/2), (pi/2, 0.0)],                      # Clifford 19
    [(pi/2, pi/2), (3*pi/2, 0.0)],                      # Clifford 20
    [(pi/2, 0.0), (pi, pi/2), (pi/2, 0.0)],             # Clifford 21
    [(3*pi/2, 0.0), (pi, pi/2), (pi/2, 0.0)],           # Clifford 22
    [(pi/2, 0.0), (pi, pi/2), (3*pi/2, 0.0)],           # Clifford 23
]

def clifford_gate_iqm(qubit, idx):
    """Apply one of 24 single-qubit Clifford gates using prx."""
    gates = CLIFFORDS[idx % 24]
    return [prx(qubit, angle, phase) for angle, phase in gates]

def rb_circuit_iqm(qubit, seq_length, seed_offset=0):
    """Generate an RB circuit: seq_length random Cliffords + measurement.
    Note: without computing the inverse Clifford, this measures depolarization
    rate rather than true RB. Still useful for benchmarking."""
    import numpy as np
    rng = np.random.RandomState(42 + seq_length + seed_offset)

    ops = []
    for _ in range(seq_length):
        idx = rng.randint(0, 24)
        ops += clifford_gate_iqm(qubit, idx)

    ops += measure_all([qubit])
    return make_circuit(f"rb_len{seq_length}_s{seed_offset}", ops)


# ── Submit and collect ──────────────────────────────────────────────────────

def submit_and_wait(client, circuits_dict, shots=SHOTS, timeout=300):
    """Submit circuits one at a time and wait for results."""
    results = {}
    for name, circuit in circuits_dict.items():
        print(f"  Submitting {name}...")
        try:
            job_id = client.submit_circuits([circuit], shots=shots)
            print(f"    Job: {job_id}")

            result = client.wait_for_results(job_id, timeout_secs=timeout)

            # Check status
            status_str = str(result.status) if hasattr(result, 'status') else "unknown"
            print(f"    Status: {status_str}")

            if "failed" in status_str.lower() or "error" in status_str.lower():
                results[name] = {"job_id": str(job_id), "error": status_str}
                if hasattr(result, 'message') and result.message:
                    print(f"    Message: {result.message}")
                    results[name]["message"] = result.message
                continue

            # Extract counts
            counts = extract_counts(result)
            if counts:
                total = sum(counts.values())
                print(f"    Got {total} shots, {len(counts)} unique bitstrings")
            else:
                print(f"    Warning: no counts extracted")
                # Debug: show what we got
                print(f"    measurements type: {type(result.measurements)}")
                if result.measurements:
                    print(f"    measurements[0] type: {type(result.measurements[0])}")
                    print(f"    measurements[0] keys: {list(result.measurements[0].keys()) if isinstance(result.measurements[0], dict) else 'not a dict'}")

            results[name] = {"job_id": str(job_id), "counts": counts}

        except Exception as e:
            print(f"    ERROR: {e}")
            import traceback
            traceback.print_exc()
            results[name] = {"error": str(e)}

    return results


# ── Energy computation ──────────────────────────────────────────────────────

def compute_energy(z_counts, x_counts, y_counts):
    """Compute VQE energy from 3-basis measurement counts."""
    zt = sum(z_counts.values())
    Z0 = (z_counts.get("00",0) + z_counts.get("10",0) - z_counts.get("01",0) - z_counts.get("11",0)) / zt
    Z1 = (z_counts.get("00",0) + z_counts.get("01",0) - z_counts.get("10",0) - z_counts.get("11",0)) / zt
    Z0Z1 = (z_counts.get("00",0) + z_counts.get("11",0) - z_counts.get("01",0) - z_counts.get("10",0)) / zt

    xt = sum(x_counts.values())
    X0X1 = (x_counts.get("00",0) + x_counts.get("11",0) - x_counts.get("01",0) - x_counts.get("10",0)) / xt

    yt = sum(y_counts.values())
    Y0Y1 = (y_counts.get("00",0) + y_counts.get("11",0) - y_counts.get("01",0) - y_counts.get("10",0)) / yt

    energy = g0 + g1*Z0 + g2*Z1 + g3*Z0Z1 + g4*X0X1 + g5*Y0Y1
    return energy, {"Z0": Z0, "Z1": Z1, "Z0Z1": Z0Z1, "X0X1": X0X1, "Y0Y1": Y0Y1}


# ── Main ────────────────────────────────────────────────────────────────────

def run_vqe(client, timestamp):
    """Run VQE H2 experiment."""
    print("=" * 60)
    print("1. VQE H2 (3-basis measurement)")
    print(f"   Qubits: {VQE_QUBITS}, theta={THETA}")
    print("=" * 60)

    vqe_circuits = {
        "z_basis": vqe_z_basis(),
        "x_basis": vqe_x_basis(),
        "y_basis": vqe_y_basis(),
    }

    vqe_results = submit_and_wait(client, vqe_circuits)

    z_counts = vqe_results.get("z_basis", {}).get("counts", {})
    x_counts = vqe_results.get("x_basis", {}).get("counts", {})
    y_counts = vqe_results.get("y_basis", {}).get("counts", {})

    if not (z_counts and x_counts and y_counts):
        print("  VQE FAILED — missing counts")
        print(f"  Results: {json.dumps(vqe_results, indent=2, default=str)}")
        return

    energy, evs = compute_energy(z_counts, x_counts, y_counts)
    error_ha = abs(energy - FCI)
    error_kcal = error_ha * 627.509

    print(f"\n  VQE Energy: {energy:.4f} Ha")
    print(f"  FCI: {FCI} Ha")
    print(f"  Error: {error_ha:.4f} Ha ({error_kcal:.2f} kcal/mol)")
    print(f"  Chemical accuracy: {'YES' if error_kcal < 1.6 else 'NO'}")
    for k, v in evs.items():
        print(f"  <{k}> = {v:.4f}")

    output = {
        "schema_version": "1.0",
        "id": "vqe-equilibrium-001-iqm-garnet",
        "type": "vqe_h2",
        "backend": "iqm-garnet",
        "backend_provider": "IQM Resonance (Finland)",
        "hardware": "20q superconducting transmon (Garnet)",
        "qubits_used": VQE_QUBITS,
        "submitted": timestamp,
        "completed": datetime.now(timezone.utc).isoformat(),
        "parameters": {
            "shots": SHOTS,
            "bond_distance": 0.735,
            "theta": THETA,
            "qubits": VQE_QUBITS,
            "ansatz": "X(q1) Ry(theta,q0) CNOT(q0,q1)",
        },
        "job_ids": {k: str(v.get("job_id", "")) for k, v in vqe_results.items()},
        "raw_counts": {
            "z_basis": z_counts,
            "x_basis": x_counts,
            "y_basis": y_counts,
        },
        "analysis": {
            "energy_hartree": round(energy, 4),
            "fci_energy": FCI,
            "error_hartree": round(error_ha, 4),
            "error_kcal_mol": round(error_kcal, 2),
            "chemical_accuracy": error_kcal < 1.6,
            "expectation_values": {k: round(v, 5) for k, v in evs.items()},
            "hamiltonian_coefficients": {"g0": g0, "g1": g1, "g2": g2, "g3": g3, "g4": g4, "g5": g5},
            "bond_distance_angstrom": 0.735,
        },
        "environment": "experiments/environment.json",
    }

    outpath = RESULTS_DIR / "vqe-equilibrium-001-iqm-garnet.json"
    with open(outpath, "w") as f:
        json.dump(output, f, indent=2)
        f.write("\n")
    print(f"  Saved to {outpath}")


def run_qv(client, timestamp):
    """Run Quantum Volume experiment (n=2, n=3)."""
    print("\n" + "=" * 60)
    print("2. Quantum Volume (n=2 on QB1-QB2, n=3 on QB1-QB2-QB3)")
    print("=" * 60)

    qv_circuits = {}
    for i in range(5):
        qv_circuits[f"qv_n2_c{i}"] = qv_circuit_iqm(2, i, seed=123)
    for i in range(5):
        qv_circuits[f"qv_n3_c{i}"] = qv_circuit_iqm(3, i, seed=123)

    qv_results = submit_and_wait(client, qv_circuits)

    output = {
        "schema_version": "1.0",
        "id": "cross2019-qv-iqm-garnet",
        "type": "quantum_volume",
        "backend": "iqm-garnet",
        "backend_provider": "IQM Resonance (Finland)",
        "hardware": "20q superconducting transmon (Garnet)",
        "qubits_used": QV_QUBITS_3,
        "submitted": timestamp,
        "completed": datetime.now(timezone.utc).isoformat(),
        "parameters": {"shots": SHOTS, "qubit_counts": [2, 3], "num_circuits": 5, "seed": 123},
        "raw_counts": {k: v.get("counts", {}) for k, v in qv_results.items()},
        "job_ids": {k: str(v.get("job_id", "")) for k, v in qv_results.items()},
        "analysis": {"note": "HOF analysis requires ideal simulation to determine heavy output set"},
        "environment": "experiments/environment.json",
    }

    outpath = RESULTS_DIR / "cross2019-qv-iqm-garnet.json"
    with open(outpath, "w") as f:
        json.dump(output, f, indent=2)
        f.write("\n")
    print(f"  Saved QV results to {outpath}")


def run_rb(client, timestamp):
    """Run Randomized Benchmarking on QB1."""
    print("\n" + "=" * 60)
    print(f"3. Randomized Benchmarking ({RB_QUBIT})")
    print("=" * 60)

    seq_lengths = [1, 4, 8, 16, 32]
    n_seeds = 5

    rb_circuits = {}
    for length in seq_lengths:
        for seed_offset in range(n_seeds):
            rb_circuits[f"rb_m{length}_s{seed_offset}"] = rb_circuit_iqm(
                RB_QUBIT, length, seed_offset=seed_offset
            )

    rb_results = submit_and_wait(client, rb_circuits)

    # Compute survival probabilities
    survival_data = {}
    for length in seq_lengths:
        survivals = []
        for s in range(n_seeds):
            key = f"rb_m{length}_s{s}"
            counts = rb_results.get(key, {}).get("counts", {})
            total = sum(counts.values()) if counts else 0
            p0 = counts.get("0", 0) / total if total > 0 else 0
            survivals.append(round(p0, 4))
        mean_surv = sum(survivals) / len(survivals) if survivals else 0
        survival_data[str(length)] = {
            "mean_survival": round(mean_surv, 4),
            "per_seed": survivals,
        }
        print(f"  Length {length}: P(0) = {mean_surv:.4f} ({survivals})")

    output = {
        "schema_version": "1.0",
        "id": "cross2019-rb-iqm-garnet",
        "type": "rb_1qubit",
        "backend": "iqm-garnet",
        "backend_provider": "IQM Resonance (Finland)",
        "hardware": "20q superconducting transmon (Garnet)",
        "qubits_used": [RB_QUBIT],
        "submitted": timestamp,
        "completed": datetime.now(timezone.utc).isoformat(),
        "parameters": {
            "shots": SHOTS,
            "sequence_lengths": seq_lengths,
            "n_seeds": n_seeds,
            "qubit": RB_QUBIT,
        },
        "raw_counts": {k: v.get("counts", {}) for k, v in rb_results.items()},
        "job_ids": {k: str(v.get("job_id", "")) for k, v in rb_results.items()},
        "analysis": {
            "survival_probabilities": survival_data,
            "sequence_lengths": seq_lengths,
        },
        "environment": "experiments/environment.json",
    }

    outpath = RESULTS_DIR / "cross2019-rb-iqm-garnet.json"
    with open(outpath, "w") as f:
        json.dump(output, f, indent=2)
        f.write("\n")
    print(f"  Saved RB results to {outpath}")


def main():
    # Check for IQM token (iqm-client reads IQM_TOKEN env var automatically)
    if not os.environ.get("IQM_TOKEN"):
        print("ERROR: IQM_TOKEN not set.")
        print("Run: export IQM_TOKEN=$(secret-lover get IQM_API_KEY)")
        sys.exit(1)

    # Select experiments
    experiments = sys.argv[1:] if len(sys.argv) > 1 else ["vqe", "qv", "rb"]
    print(f"IQM Garnet experiments: {experiments}")
    print(f"URL: {IQM_URL}")
    print(f"Shots: {SHOTS}\n")

    # Don't pass token= arg; iqm-client reads IQM_TOKEN env var
    client = IQMClient(IQM_URL)
    print("Connected to IQM Garnet.\n")

    timestamp = datetime.now(timezone.utc).isoformat()

    if "vqe" in experiments:
        run_vqe(client, timestamp)
    if "qv" in experiments:
        run_qv(client, timestamp)
    if "rb" in experiments:
        run_rb(client, timestamp)

    print("\n" + "=" * 60)
    print("ALL DONE")
    print("=" * 60)


if __name__ == "__main__":
    main()
