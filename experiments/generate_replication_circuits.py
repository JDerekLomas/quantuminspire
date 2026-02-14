"""
Generate native cQASM 3.0 circuits for Tuna-9 hardware replication experiments.

Uses the sector-projected 2-qubit Hamiltonian approach from compute_h2_coefficients.py:
  H = g0*I + g1*Z0 + g2*Z1 + g3*Z0Z1 + g4*X0X1 + g5*Y0Y1
  where g2=-g1, g3=0, g4=g5 (H2/HeH+ STO-3G symmetries)

Circuit: 1-CZ gate preparation of |ψ(α)⟩ = cos(α/2)|10⟩ + sin(α/2)|01⟩
  X q_a; Ry(α) q_b; CZ q_b,q_a; (CNOT target dressing on q_a)

Experiments:
  1. Sagastizabal2019 — H2 VQE + symmetry verification (2-qubit, 7 distances)
  2. Peruzzo2014 — HeH+ VQE cross-platform (2-qubit, 7 distances)
  3. Kandala2017 — H2 depth-1 hardware-efficient (4-qubit JW, 1 distance)
"""

import numpy as np
import json
from pathlib import Path
from datetime import datetime, timezone

import pennylane as qml


# ── Tuna-9 topology ──────────────────────────────────────────────
# Best 2-qubit pair: q4-q6 (93.5% Bell fidelity)
# Best 4-qubit chain: q2-q4-q6-q8 (all connected)
BEST_2Q = (4, 6)
BEST_4Q = (2, 4, 6, 8)

# Index in 4-qubit computational basis
IDX_HF = 12   # |1100> = 0b1100 = 12
IDX_EX = 3    # |0011> = 0b0011 = 3


# ── Hamiltonian computation ──────────────────────────────────────

def compute_2q_hamiltonian(symbols, coordinates, charge=0, mult=1):
    """Compute 2-qubit sector-projected Hamiltonian from molecular geometry.

    Returns (g0, g1, g4, fci_energy, hf_energy, optimal_alpha, projected_energy).
    Uses g2=-g1, g3=0, g5=g4 (STO-3G symmetries).
    """
    coords_bohr = np.array(coordinates) * 1.8897259886  # Angstrom → Bohr
    H, qubits = qml.qchem.molecular_hamiltonian(
        symbols, coords_bohr, basis="sto-3g", charge=charge, mult=mult
    )
    H_mat = qml.matrix(H)

    # Exact eigenvalues
    eigvals = np.linalg.eigvalsh(H_mat)
    fci_energy = float(eigvals[0])

    # Extract 2x2 block in {|1100⟩, |0011⟩} sector
    h_10_10 = float(np.real(H_mat[IDX_HF, IDX_HF]))   # HF energy
    h_01_01 = float(np.real(H_mat[IDX_EX, IDX_EX]))    # doubly-excited
    h_10_01 = float(np.real(H_mat[IDX_HF, IDX_EX]))    # coupling

    # Decompose: g0 = (h₁₁+h₂₂)/2, g1 = (h₂₂-h₁₁)/4, g4 = h₁₂/2
    g0 = (h_01_01 + h_10_10) / 2
    g1 = (h_01_01 - h_10_10) / 4
    g4 = h_10_01 / 2

    # Optimal alpha: minimize E(α) = cos²(α/2)·h₁₀ + sin²(α/2)·h₀₁ + sin(α)·h_coupling
    alphas = np.linspace(-np.pi, np.pi, 10000)
    energies = (np.cos(alphas / 2)**2 * h_10_10 +
                np.sin(alphas / 2)**2 * h_01_01 +
                np.sin(alphas) * h_10_01)
    opt_idx = np.argmin(energies)
    opt_alpha = float(alphas[opt_idx])
    opt_energy = float(energies[opt_idx])

    return {
        "g0": g0, "g1": g1, "g4": g4,
        "fci_energy": fci_energy,
        "hf_energy": h_10_10,
        "optimal_alpha": opt_alpha,
        "projected_energy": opt_energy,
    }


# ── cQASM circuit generation ────────────────────────────────────

def gen_2q_circuit(alpha, phys_qa, phys_qb, basis='Z'):
    """Generate 2-qubit VQE circuit with 1 CZ gate.

    Prepares |ψ(α)⟩ = cos(α/2)|10⟩ + sin(α/2)|01⟩

    Circuit (logical → physical mapping: q0→qa, q1→qb):
      X qa              (prepare |10⟩)
      Ry(α) qb          (rotate qb)
      Ry(-π/2) qa       (CNOT target dressing)
      CZ qb, qa         (CZ = native)
      Ry(π/2) qa        (CNOT target dressing)

    After this: |ψ⟩ = cos(α/2)|10⟩ + sin(α/2)|01⟩ on (qa, qb)

    Measurement basis rotations (appended before measure):
      Z: nothing (measure I, Z0, Z1, Z0Z1)
      X: Ry(-π/2) on both (measure X0X1 → Z0Z1 in rotated basis)
      Y: Rx(π/2) on both = Rz(-π/2) Ry(π/2) Rz(π/2) (measure Y0Y1)
    """
    lines = ["version 3.0", "qubit[9] q"]

    # State preparation: 1 CZ = CNOT(qb→qa)
    lines.append(f"X q[{phys_qa}]")
    lines.append(f"Ry({alpha:.6f}) q[{phys_qb}]")
    lines.append(f"Ry(-1.570796) q[{phys_qa}]")
    lines.append(f"CZ q[{phys_qb}], q[{phys_qa}]")
    lines.append(f"Ry(1.570796) q[{phys_qa}]")

    # Basis rotation
    if basis == 'X':
        # X basis: Ry(-π/2) on both → Z measurement gives X expectation
        lines.append(f"Ry(-1.570796) q[{phys_qa}]")
        lines.append(f"Ry(-1.570796) q[{phys_qb}]")
    elif basis == 'Y':
        # Y basis: Rx(π/2) on both = Rz(-π/2) Ry(π/2) Rz(π/2)
        lines.append(f"Rz(-1.570796) q[{phys_qa}]")
        lines.append(f"Ry(1.570796) q[{phys_qa}]")
        lines.append(f"Rz(1.570796) q[{phys_qa}]")
        lines.append(f"Rz(-1.570796) q[{phys_qb}]")
        lines.append(f"Ry(1.570796) q[{phys_qb}]")
        lines.append(f"Rz(1.570796) q[{phys_qb}]")

    # Measure
    lines.append("bit[9] b")
    lines.append("b = measure q")
    return '\n'.join(lines)


def cnot_native(ctrl, tgt):
    """CNOT in native gates."""
    return [
        f"Ry(-1.570796) q[{tgt}]",
        f"CZ q[{ctrl}], q[{tgt}]",
        f"Ry(1.570796) q[{tgt}]",
    ]


def gen_kandala_d1_circuit(params, phys_qubits):
    """Kandala d=1 hardware-efficient ansatz (4 qubits, 3 CZ gates).

    |HF⟩ → [RX·RZ]×4 → CNOT ladder → [RZ·RX·RZ]×4 → measure Z basis
    """
    q = phys_qubits
    lines = ["version 3.0", "qubit[9] q"]

    # HF state: |1100⟩
    lines.append(f"X q[{q[0]}]")
    lines.append(f"X q[{q[1]}]")

    # Initial RX-RZ layer (8 params)
    idx = 0
    for i in range(4):
        # RX(p) = Rz(-π/2) Ry(p) Rz(π/2)
        lines.append(f"Rz(-1.570796) q[{q[i]}]")
        lines.append(f"Ry({params[idx]:.6f}) q[{q[i]}]")
        lines.append(f"Rz(1.570796) q[{q[i]}]")
        idx += 1
        lines.append(f"Rz({params[idx]:.6f}) q[{q[i]}]")
        idx += 1

    # CNOT ladder: q0→q1, q1→q2, q2→q3 (3 CZ gates)
    for i in range(3):
        lines.extend(cnot_native(q[i], q[i + 1]))

    # Final RZ-RX-RZ layer (12 params)
    for i in range(4):
        lines.append(f"Rz({params[idx]:.6f}) q[{q[i]}]")
        idx += 1
        lines.append(f"Rz(-1.570796) q[{q[i]}]")
        lines.append(f"Ry({params[idx]:.6f}) q[{q[i]}]")
        lines.append(f"Rz(1.570796) q[{q[i]}]")
        idx += 1
        lines.append(f"Rz({params[idx]:.6f}) q[{q[i]}]")
        idx += 1

    lines.append("bit[9] b")
    lines.append("b = measure q")
    return '\n'.join(lines)


# ── Experiment generators ────────────────────────────────────────

def generate_h2_circuits(distances):
    """H2 VQE circuits at multiple bond distances (Sagastizabal + general H2)."""
    print("=" * 70)
    print("H2 VQE — 2-qubit circuits for Tuna-9")
    print("=" * 70)

    qa, qb = BEST_2Q
    circuits = {}
    metadata = []

    for R in distances:
        R = round(R, 4)
        coords = [0.0, 0.0, 0.0, 0.0, 0.0, R]
        result = compute_2q_hamiltonian(["H", "H"], coords)

        alpha = result["optimal_alpha"]
        fci = result["fci_energy"]
        proj_e = result["projected_energy"]
        err = abs(proj_e - fci) * 1000

        print(f"  R={R:.3f}A: FCI={fci:.6f}, proj={proj_e:.6f}, "
              f"err={err:.3f}mHa, alpha={alpha:.4f}")
        print(f"    g0={result['g0']:.6f}, g1={result['g1']:.6f}, "
              f"g4={result['g4']:.6f}")

        for basis in ['Z', 'X', 'Y']:
            key = f"h2_R{R:.3f}_{basis}"
            circuits[key] = gen_2q_circuit(alpha, qa, qb, basis=basis)

        metadata.append({
            "bond_distance": R,
            "fci_energy": round(fci, 8),
            "hf_energy": round(result["hf_energy"], 8),
            "projected_energy": round(proj_e, 8),
            "optimal_alpha": round(alpha, 6),
            "error_vs_fci_mHa": round(err, 4),
            "g0": round(result["g0"], 8),
            "g1": round(result["g1"], 8),
            "g2": round(-result["g1"], 8),
            "g3": 0.0,
            "g4": round(result["g4"], 8),
            "g5": round(result["g4"], 8),
            "physical_qubits": [qa, qb],
            "bases": ["Z", "X", "Y"],
        })

    return circuits, metadata


def generate_heh_circuits(distances):
    """HeH+ VQE circuits at multiple bond distances (Peruzzo)."""
    print("\n" + "=" * 70)
    print("HeH+ VQE — 2-qubit circuits for Tuna-9")
    print("=" * 70)

    qa, qb = BEST_2Q
    circuits = {}
    metadata = []

    for R in distances:
        R = round(R, 4)
        coords = [0.0, 0.0, 0.0, 0.0, 0.0, R]
        result = compute_2q_hamiltonian(["He", "H"], coords, charge=1)

        alpha = result["optimal_alpha"]
        fci = result["fci_energy"]
        proj_e = result["projected_energy"]
        err = abs(proj_e - fci) * 1000

        print(f"  R={R:.3f}A: FCI={fci:.6f}, proj={proj_e:.6f}, "
              f"err={err:.3f}mHa, alpha={alpha:.4f}")

        for basis in ['Z', 'X', 'Y']:
            key = f"heh_R{R:.3f}_{basis}"
            circuits[key] = gen_2q_circuit(alpha, qa, qb, basis=basis)

        metadata.append({
            "bond_distance": R,
            "fci_energy": round(fci, 8),
            "hf_energy": round(result["hf_energy"], 8),
            "projected_energy": round(proj_e, 8),
            "optimal_alpha": round(alpha, 6),
            "error_vs_fci_mHa": round(err, 4),
            "g0": round(result["g0"], 8),
            "g1": round(result["g1"], 8),
            "g4": round(result["g4"], 8),
            "physical_qubits": [qa, qb],
            "bases": ["Z", "X", "Y"],
        })

    return circuits, metadata


def generate_kandala_circuit():
    """Kandala d=1 at equilibrium H2 (4-qubit JW, 3 CZ gates)."""
    print("\n" + "=" * 70)
    print("KANDALA 2017 — H2 d=1 VQE for Tuna-9")
    print("=" * 70)

    from pennylane import numpy as pnp
    from scipy.optimize import minimize

    R = 0.735
    coords_bohr = np.array([0.0, 0.0, 0.0, 0.0, 0.0, R * 1.8897259886])
    H, n_qubits = qml.qchem.molecular_hamiltonian(
        ["H", "H"], coords_bohr, basis="sto-3g"
    )
    H_mat = qml.matrix(H)
    fci = float(np.linalg.eigvalsh(H_mat)[0])

    n_params = 4 * (3 * 1 + 2)  # 20 for d=1
    dev = qml.device('default.qubit', wires=4)

    @qml.qnode(dev)
    def circuit(params):
        qml.BasisState(np.array([1, 1, 0, 0]), wires=[0, 1, 2, 3])
        idx = 0
        for q in range(4):
            qml.RX(params[idx], wires=q)
            idx += 1
            qml.RZ(params[idx], wires=q)
            idx += 1
        for q in range(3):
            qml.CNOT(wires=[q, q + 1])
        for q in range(4):
            qml.RZ(params[idx], wires=q)
            idx += 1
            qml.RX(params[idx], wires=q)
            idx += 1
            qml.RZ(params[idx], wires=q)
            idx += 1
        return qml.expval(H)

    best_energy = float('inf')
    best_params = None
    for seed in range(15):
        rng = np.random.RandomState(seed)
        p0 = rng.uniform(-0.3, 0.3, n_params)
        try:
            result = minimize(
                lambda p: float(circuit(pnp.array(p))),
                p0, method='COBYLA',
                options={'maxiter': 1000, 'rhobeg': 0.5}
            )
            if result.fun < best_energy:
                best_energy = result.fun
                best_params = result.x.copy()
        except Exception:
            pass

    err = abs(best_energy - fci) * 1000
    print(f"  R={R}A: FCI={fci:.6f}, VQE={best_energy:.6f}, err={err:.3f}mHa")

    cqasm = gen_kandala_d1_circuit(best_params, list(BEST_4Q))

    circuits = {"h2_kandala_d1_R0.735_Z": cqasm}
    metadata = [{
        "bond_distance": R,
        "fci_energy": round(fci, 8),
        "vqe_energy": round(best_energy, 8),
        "error_mHa": round(err, 4),
        "optimal_params": [round(float(p), 6) for p in best_params],
        "n_params": n_params,
        "depth": 1,
        "n_cz_gates": 3,
        "physical_qubits": list(BEST_4Q),
    }]

    return circuits, metadata


# ── Main ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    h2_distances = [0.50, 0.70, 0.735, 0.90, 1.10, 1.50, 2.00]
    heh_distances = [0.50, 0.75, 1.00, 1.25, 1.50, 2.00, 2.50]

    all_circuits = {}
    report = {
        "generated": datetime.now(timezone.utc).isoformat(),
        "backend": "tuna-9",
        "gate_set": "native (CZ, Ry, Rz, X)",
        "compile_stage": "routing",
        "shots": 4096,
        "qubit_pair": list(BEST_2Q),
        "qubit_chain": list(BEST_4Q),
    }

    # 1. H2 (Sagastizabal + general)
    h2_circuits, h2_meta = generate_h2_circuits(h2_distances)
    all_circuits.update(h2_circuits)
    report["sagastizabal2019"] = {
        "experiment": "H2 VQE + symmetry verification",
        "paper": "Sagastizabal et al., PRA 100, 010302(R) (2019)",
        "encoding": "sector-projected 2 qubits",
        "ansatz": "single excitation (1 CZ gate)",
        "symmetry": "S = Z0Z1, eigenvalue -1",
        "n_circuits": len(h2_circuits),
        "distances": h2_meta,
    }

    # 2. HeH+ (Peruzzo)
    heh_circuits, heh_meta = generate_heh_circuits(heh_distances)
    all_circuits.update(heh_circuits)
    report["peruzzo2014"] = {
        "experiment": "HeH+ VQE cross-platform",
        "paper": "Peruzzo et al., Nature Comms 5, 4213 (2014)",
        "encoding": "sector-projected 2 qubits",
        "ansatz": "single excitation (1 CZ gate)",
        "n_circuits": len(heh_circuits),
        "distances": heh_meta,
    }

    # 3. Kandala (4-qubit)
    kan_circuits, kan_meta = generate_kandala_circuit()
    all_circuits.update(kan_circuits)
    report["kandala2017"] = {
        "experiment": "H2 depth-1 hardware-efficient VQE",
        "paper": "Kandala et al., Nature 549, 242 (2017)",
        "encoding": "Jordan-Wigner (4 qubits)",
        "ansatz": "hardware-efficient RX-RZ + CNOT ladder, d=1",
        "n_circuits": len(kan_circuits),
        "details": kan_meta,
    }

    # Save
    report["circuits"] = all_circuits
    report["total_circuits"] = len(all_circuits)

    outfile = Path("experiments/results/replication-tuna9-circuits.json")
    with open(outfile, "w") as f:
        json.dump(report, f, indent=2)

    print(f"\n{'=' * 70}")
    print(f"TOTAL: {len(all_circuits)} circuits")
    print(f"  H2 (Sagastizabal): {len(h2_circuits)} ({len(h2_meta)} dist × 3 bases)")
    print(f"  HeH+ (Peruzzo):    {len(heh_circuits)} ({len(heh_meta)} dist × 3 bases)")
    print(f"  Kandala d=1:       {len(kan_circuits)}")
    print(f"Saved to: {outfile}")
