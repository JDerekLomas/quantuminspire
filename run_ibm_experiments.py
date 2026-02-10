"""
Submit Bell, GHZ, and VQE experiments to IBM Quantum hardware.
Matches the same experiments as the QI Tuna-9 pipeline for cross-platform comparison.
"""
import json
import numpy as np
from datetime import datetime, timezone
from pathlib import Path
from qiskit import QuantumCircuit, transpile
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2

RESULTS_DIR = Path("experiments/results")

def build_bell_circuit():
    """Bell state: H + CNOT on qubits 0,1."""
    qc = QuantumCircuit(2)
    qc.h(0)
    qc.cx(0, 1)
    qc.measure_all()
    return qc

def build_ghz_circuit(n=3):
    """GHZ state: H + CNOT chain on n qubits."""
    qc = QuantumCircuit(n)
    qc.h(0)
    for i in range(n - 1):
        qc.cx(i, i + 1)
    qc.measure_all()
    return qc

def build_vqe_circuits(theta=0.2286):
    """2-qubit BK-reduced VQE ansatz in Z, X, Y bases."""
    circuits = {}
    for basis in ['z', 'x', 'y']:
        qc = QuantumCircuit(2)
        # HF state |01> in BK basis
        qc.x(0)
        # Ry ansatz
        qc.cx(0, 1)
        qc.ry(theta, 0)
        qc.cx(1, 0)
        qc.ry(-theta, 0)
        qc.cx(1, 0)
        qc.cx(0, 1)
        # Basis rotation
        if basis == 'x':
            qc.h(0)
            qc.h(1)
        elif basis == 'y':
            qc.sdg(0)
            qc.h(0)
            qc.sdg(1)
            qc.h(1)
        qc.measure_all()
        circuits[f"{basis}_basis"] = qc
    return circuits


def analyze_bell(counts, shots):
    correct = sum(v for k, v in counts.items() if k in ('00', '11'))
    wrong = shots - correct
    return {
        "fidelity": correct / shots,
        "parity_leakage": wrong / shots,
        "correct_parity": correct,
        "wrong_parity": wrong,
        "total_shots": shots,
    }


def analyze_ghz(counts, shots, n=3):
    all_zero = counts.get('0' * n, 0)
    all_one = counts.get('1' * n, 0)
    correct = all_zero + all_one
    return {
        "fidelity": correct / shots,
        "parity_leakage": (shots - correct) / shots,
        "p_all_zero": all_zero / shots,
        "p_all_one": all_one / shots,
        "total_shots": shots,
    }


def parity_postselect(counts):
    """Filter Z-basis counts to odd-parity bitstrings only.

    For BK-reduced 2-qubit H2, valid states are |01> and |10> (odd parity).
    Even-parity states (|00>, |11>) are leakage from hardware noise.
    """
    filtered = {}
    for bs, count in counts.items():
        bits = bs[-2:]
        parity = int(bits[0]) ^ int(bits[1])
        if parity == 1:  # odd parity = valid
            filtered[bs] = count
    return filtered


def analyze_vqe(z_counts, x_counts, y_counts, shots):
    """Reconstruct H2 energy from 3-basis measurement.

    BK-reduced 2-qubit H2 Hamiltonian at R=0.735:
    H = g0*I + g1*Z0 + g2*Z1 + g3*Z0Z1 + g4*X0X1 + g5*Y0Y1
    """
    # Coefficients for H2 at R=0.735 Angstrom (BK-reduced, 2-qubit tapered)
    # Computed via OpenFermion + PySCF: bravyi_kitaev + Z2 tapering sector (1,-1)
    g0 = -0.2087094462
    g1 = +0.5701213985
    g2 = -0.2257535169
    g3 = +0.1124146374
    g4 = -0.0904655984
    g5 = -0.0904655984

    def expval_z(counts, qubits, total):
        ev = 0.0
        for bs, count in counts.items():
            sign = 1
            for q in qubits:
                if bs[-(q + 1)] == '1':
                    sign *= -1
            ev += sign * count
        return ev / total

    fci_energy = -1.137306  # exact FCI for H2 STO-3G at R=0.735 A

    # Raw energy (no mitigation)
    ez0 = expval_z(z_counts, [0], shots)
    ez1 = expval_z(z_counts, [1], shots)
    ez0z1 = expval_z(z_counts, [0, 1], shots)
    ex0x1 = expval_z(x_counts, [0, 1], shots)
    ey0y1 = expval_z(y_counts, [0, 1], shots)
    energy_raw = g0 + g1 * ez0 + g2 * ez1 + g3 * ez0z1 + g4 * ex0x1 + g5 * ey0y1

    # Post-selected energy (filter Z-basis to odd-parity states only)
    z_filtered = parity_postselect(z_counts)
    z_kept = sum(z_filtered.values())
    keep_fraction = z_kept / shots if shots > 0 else 0

    if z_kept > 0:
        ps_z0 = expval_z(z_filtered, [0], z_kept)
        ps_z1 = expval_z(z_filtered, [1], z_kept)
        ps_z0z1 = expval_z(z_filtered, [0, 1], z_kept)
        energy_ps = g0 + g1 * ps_z0 + g2 * ps_z1 + g3 * ps_z0z1 + g4 * ex0x1 + g5 * ey0y1
    else:
        energy_ps = energy_raw
        ps_z0, ps_z1, ps_z0z1 = ez0, ez1, ez0z1

    return {
        "energy_hartree": energy_ps,
        "energy_raw": energy_raw,
        "energy_postselected": energy_ps,
        "postselection_keep_fraction": keep_fraction,
        "fci_energy": fci_energy,
        "error_hartree": abs(energy_ps - fci_energy),
        "error_millihartree": abs(energy_ps - fci_energy) * 1000,
        "error_raw_millihartree": abs(energy_raw - fci_energy) * 1000,
        "error_kcal_mol": abs(energy_ps - fci_energy) * 627.509,
        "chemical_accuracy": abs(energy_ps - fci_energy) < 0.0016,
        "expectation_values": {
            "Z0": ps_z0, "Z1": ps_z1, "Z0Z1": ps_z0z1,
            "X0X1": ex0x1, "Y0Y1": ey0y1,
        },
        "total_shots_per_basis": shots,
    }


if __name__ == "__main__":
    print("Connecting to IBM Quantum...")
    service = QiskitRuntimeService(channel='ibm_cloud')
    backend = service.least_busy(operational=True, min_num_qubits=4)
    print(f"Backend: {backend.name} ({backend.num_qubits}q)")

    SHOTS = 4096

    # Build all circuits
    bell = build_bell_circuit()
    ghz = build_ghz_circuit(3)
    vqe = build_vqe_circuits(theta=0.2286)

    all_circuits = [bell, ghz, vqe['z_basis'], vqe['x_basis'], vqe['y_basis']]
    labels = ['bell', 'ghz', 'vqe_z', 'vqe_x', 'vqe_y']

    print(f"\nTranspiling {len(all_circuits)} circuits...")
    transpiled = transpile(all_circuits, backend=backend, optimization_level=3)
    for label, qc_t in zip(labels, transpiled):
        print(f"  {label}: depth={qc_t.depth()}, gates={qc_t.count_ops()}")

    print(f"\nSubmitting to {backend.name} ({SHOTS} shots each)...")
    sampler = SamplerV2(backend)
    sampler.options.resilience_level = 1  # readout error mitigation
    job = sampler.run(transpiled, shots=SHOTS)
    job_id = job.job_id()
    print(f"Job ID: {job_id}")
    print("Waiting for results (this may take a few minutes)...")
    result = job.result()
    now = datetime.now(timezone.utc).isoformat()

    # Extract counts
    bell_counts = result[0].data.meas.get_counts()
    ghz_counts = result[1].data.meas.get_counts()
    vqe_z_counts = result[2].data.meas.get_counts()
    vqe_x_counts = result[3].data.meas.get_counts()
    vqe_y_counts = result[4].data.meas.get_counts()

    print(f"\n{'='*60}")
    print(f"Results from {backend.name} (job {job_id})")
    print(f"{'='*60}")

    # Bell analysis
    bell_analysis = analyze_bell(bell_counts, SHOTS)
    print(f"\nBell State:")
    print(f"  Counts: {bell_counts}")
    print(f"  Fidelity: {bell_analysis['fidelity']:.1%}")
    print(f"  Parity leakage: {bell_analysis['parity_leakage']:.1%}")

    # GHZ analysis
    ghz_analysis = analyze_ghz(ghz_counts, SHOTS, 3)
    print(f"\nGHZ (3-qubit):")
    print(f"  Counts: {ghz_counts}")
    print(f"  Fidelity: {ghz_analysis['fidelity']:.1%}")
    print(f"  Parity leakage: {ghz_analysis['parity_leakage']:.1%}")

    # VQE analysis
    vqe_analysis = analyze_vqe(vqe_z_counts, vqe_x_counts, vqe_y_counts, SHOTS)
    print(f"\nVQE H2 (R=0.735 A):")
    print(f"  Z counts: {vqe_z_counts}")
    print(f"  X counts: {vqe_x_counts}")
    print(f"  Y counts: {vqe_y_counts}")
    print(f"  Energy (raw):           {vqe_analysis['energy_raw']:.5f} Ha ({vqe_analysis['error_raw_millihartree']:.1f} mHa error)")
    print(f"  Energy (post-selected): {vqe_analysis['energy_postselected']:.5f} Ha ({vqe_analysis['error_millihartree']:.1f} mHa error)")
    print(f"  FCI:                    {vqe_analysis['fci_energy']:.5f} Ha")
    print(f"  Post-selection kept:    {vqe_analysis['postselection_keep_fraction']:.1%}")

    # Save results
    for exp_id, exp_type, analysis, raw_counts in [
        ("bell-calibration-001-ibm", "bell_calibration", bell_analysis, {"z_basis": bell_counts}),
        ("ghz-003-ibm", "ghz_state", ghz_analysis, {"z_basis": ghz_counts}),
        ("vqe-equilibrium-001-ibm", "vqe_h2", vqe_analysis,
         {"z_basis": vqe_z_counts, "x_basis": vqe_x_counts, "y_basis": vqe_y_counts}),
    ]:
        result_data = {
            "id": exp_id,
            "type": exp_type,
            "backend": backend.name,
            "backend_qubits": backend.num_qubits,
            "submitted": now,
            "completed": datetime.now(timezone.utc).isoformat(),
            "job_id": job_id,
            "parameters": {"shots": SHOTS},
            "raw_counts": raw_counts,
            "analysis": analysis,
            "errors": None,
        }
        out_path = RESULTS_DIR / f"{exp_id}.json"
        with open(out_path, "w") as f:
            json.dump(result_data, f, indent=2)
        print(f"\nSaved: {out_path}")

    print("\nDone!")
