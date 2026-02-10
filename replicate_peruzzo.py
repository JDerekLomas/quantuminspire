"""
Replication: "A variational eigenvalue solver on a photonic quantum processor"
Peruzzo et al., Nature Communications 5, 4213 (2014)
https://arxiv.org/abs/1304.3061

The original VQE paper. 2-qubit HeH+ ground state energy using BK encoding.
We replicate this on:
  1. PennyLane statevector simulator (exact)
  2. PennyLane noisy simulator (depolarizing noise)
  3. Export for QI/IBM hardware comparison

The paper used a photonic processor; we use superconducting qubits.
This is itself an interesting replication gap: different hardware modality.
"""

import numpy as np
import pennylane as qml
from pennylane import numpy as pnp
from scipy.optimize import minimize_scalar
from openfermion import MolecularData, jordan_wigner, bravyi_kitaev
from openfermionpyscf import run_pyscf
import json
from pathlib import Path
from datetime import datetime, timezone


def heh_plus_system(R):
    """Compute HeH+ Hamiltonian and FCI energy at bond distance R.

    HeH+ is a 2-electron system in STO-3G basis (2 spatial orbitals = 4 qubits JW).
    With BK + Z2 tapering, reduces to 2 qubits.
    """
    mol = MolecularData(
        [('He', (0, 0, 0)), ('H', (0, 0, R))],
        'sto-3g',
        multiplicity=1,
        charge=1,  # HeH+ is a cation
    )
    mol = run_pyscf(mol, run_fci=True)

    # Get the JW Hamiltonian (4 qubit)
    qh = jordan_wigner(mol.get_molecular_hamiltonian())

    coeffs, ops = [], []
    for term, coeff in qh.terms.items():
        if abs(coeff) < 1e-10:
            continue
        if len(term) == 0:
            ops.append(qml.Identity(0))
        else:
            pauli_ops = []
            for q, p in term:
                if p == 'X': pauli_ops.append(qml.X(q))
                elif p == 'Y': pauli_ops.append(qml.Y(q))
                elif p == 'Z': pauli_ops.append(qml.Z(q))
            ops.append(qml.prod(*pauli_ops) if len(pauli_ops) > 1 else pauli_ops[0])
        coeffs.append(coeff.real)

    return qml.Hamiltonian(coeffs, ops), mol.fci_energy, mol


def run_vqe_ideal(H, n_qubits=4):
    """Exact statevector VQE using DoubleExcitation ansatz."""
    dev = qml.device('default.qubit', wires=n_qubits)

    @qml.qnode(dev)
    def circuit(theta):
        # HeH+ has 2 electrons: |1100> is the HF state
        qml.BasisState(np.array([1, 1, 0, 0]), wires=list(range(n_qubits)))
        qml.DoubleExcitation(theta, wires=[0, 1, 2, 3])
        return qml.expval(H)

    result = minimize_scalar(
        lambda t: float(circuit(pnp.array(t))),
        bounds=(-np.pi, np.pi),
        method='bounded',
    )
    return float(circuit(pnp.array(result.x))), float(result.x)


def run_vqe_noisy(H, n_qubits=4, shots=8192, noise_strength=0.05):
    """Noisy VQE with depolarizing noise."""
    dev = qml.device('default.mixed', wires=n_qubits, shots=shots)

    @qml.qnode(dev)
    def circuit(theta):
        qml.BasisState(np.array([1, 1, 0, 0]), wires=list(range(n_qubits)))
        if noise_strength > 0:
            for w in range(n_qubits):
                qml.DepolarizingChannel(noise_strength, wires=w)
        qml.DoubleExcitation(theta, wires=[0, 1, 2, 3])
        if noise_strength > 0:
            for w in range(n_qubits):
                qml.DepolarizingChannel(noise_strength * 2, wires=w)
        return qml.expval(H)

    best_e, best_t = 1e9, 0
    for theta in np.linspace(-np.pi, np.pi, 80):
        e = float(circuit(pnp.array(theta, requires_grad=False)))
        if e < best_e:
            best_e, best_t = e, theta
    return best_e, best_t


def run_vqe_symmetry_verified(H, n_qubits=4, shots=8192, noise_strength=0.05):
    """Noisy VQE with symmetry verification (parity post-selection)."""
    dev = qml.device('default.mixed', wires=n_qubits, shots=shots)

    h_coeffs_list = list(H.coeffs)
    h_ops_list = list(H.ops)

    # Separate terms
    identity_val = 0.0
    z_terms = []
    xxyy_terms = []

    for coeff, op in zip(h_coeffs_list, h_ops_list):
        coeff = float(coeff)
        if isinstance(op, qml.Identity):
            identity_val += coeff
            continue
        op_str = str(op)
        if 'X' not in op_str and 'Y' not in op_str:
            wires = list(op.wires)
            z_terms.append((coeff, wires))
        else:
            xxyy_terms.append((coeff, op))

    @qml.qnode(dev)
    def z_samples_circuit(theta):
        qml.BasisState(np.array([1, 1, 0, 0]), wires=list(range(n_qubits)))
        if noise_strength > 0:
            for w in range(n_qubits):
                qml.DepolarizingChannel(noise_strength, wires=w)
        qml.DoubleExcitation(theta, wires=[0, 1, 2, 3])
        if noise_strength > 0:
            for w in range(n_qubits):
                qml.DepolarizingChannel(noise_strength * 2, wires=w)
        return qml.sample(wires=list(range(n_qubits)))

    @qml.qnode(dev)
    def xxyy_expval_circuit(theta):
        qml.BasisState(np.array([1, 1, 0, 0]), wires=list(range(n_qubits)))
        if noise_strength > 0:
            for w in range(n_qubits):
                qml.DepolarizingChannel(noise_strength, wires=w)
        qml.DoubleExcitation(theta, wires=[0, 1, 2, 3])
        if noise_strength > 0:
            for w in range(n_qubits):
                qml.DepolarizingChannel(noise_strength * 2, wires=w)
        if not xxyy_terms:
            return qml.expval(qml.Identity(0))
        xxyy_H = qml.Hamiltonian([c for c, _ in xxyy_terms], [o for _, o in xxyy_terms])
        return qml.expval(xxyy_H)

    best_noisy, best_sv, best_t = 1e9, 1e9, 0

    for theta in np.linspace(-np.pi, np.pi, 80):
        t = pnp.array(theta, requires_grad=False)
        samples = z_samples_circuit(t)
        xxyy_ev = float(xxyy_expval_circuit(t))

        e_z_raw = identity_val
        e_z_sv = identity_val

        for coeff, wires in z_terms:
            signs = np.ones(len(samples))
            for w in wires:
                signs *= (1 - 2 * samples[:, w])
            ev_raw = float(np.mean(signs))

            parity = np.sum(samples, axis=1) % 2
            even_mask = parity == 0
            if np.sum(even_mask) > 0:
                ev_sv = float(np.mean(signs[even_mask]))
            else:
                ev_sv = ev_raw

            e_z_raw += coeff * ev_raw
            e_z_sv += coeff * ev_sv

        e_noisy = e_z_raw + xxyy_ev
        e_sv = e_z_sv + xxyy_ev

        if e_noisy < best_noisy:
            best_noisy = e_noisy
        if e_sv < best_sv:
            best_sv = e_sv
            best_t = theta

    return best_noisy, best_sv, best_t


if __name__ == "__main__":
    # The paper's key result is the HeH+ potential energy curve
    # Equilibrium bond distance for HeH+ is ~0.775 Angstroms
    bond_distances = np.arange(0.5, 3.01, 0.25)

    print("=" * 70)
    print("Replicating: Peruzzo et al., Nature Comms 5, 4213 (2014)")
    print("  'A variational eigenvalue solver on a photonic quantum processor'")
    print("  Molecule: HeH+ (helium hydride cation)")
    print("  Basis: STO-3G, 4 qubits (JW), DoubleExcitation ansatz")
    print("=" * 70)

    print("\nComputing HeH+ Hamiltonians...")
    systems = {}
    for R in bond_distances:
        R = round(R, 2)
        H, fci, mol = heh_plus_system(R)
        systems[R] = (H, fci, mol)
        print(f"  R={R:.2f}: FCI = {fci:.6f} Ha, HF = {mol.hf_energy:.6f} Ha")

    print(f"\n{'R':>5} | {'Exact':>9} | {'Ideal':>9} | {'Noisy':>9} | {'SV':>9} | {'Err_n':>7} | {'Err_sv':>7}")
    print("-" * 75)

    results = []
    all_exact, all_ideal, all_noisy, all_sv = [], [], [], []

    for R in bond_distances:
        R = round(R, 2)
        H, fci, mol = systems[R]

        e_ideal, theta_ideal = run_vqe_ideal(H)
        e_noisy, e_sv, theta_sv = run_vqe_symmetry_verified(H)

        all_exact.append(fci)
        all_ideal.append(e_ideal)
        all_noisy.append(e_noisy)
        all_sv.append(e_sv)

        results.append({
            "bond_distance": R,
            "fci_energy": round(fci, 6),
            "hf_energy": round(mol.hf_energy, 6),
            "vqe_ideal": round(e_ideal, 6),
            "vqe_noisy": round(e_noisy, 6),
            "vqe_symmetry_verified": round(e_sv, 6),
            "optimal_theta_ideal": round(theta_ideal, 6),
            "optimal_theta_sv": round(theta_sv, 6),
            "error_ideal": round(abs(e_ideal - fci), 6),
            "error_noisy_kcal": round(abs(e_noisy - fci) * 627.509, 2),
            "error_sv_kcal": round(abs(e_sv - fci) * 627.509, 2),
        })

        print(f"{R:5.2f} | {fci:9.5f} | {e_ideal:9.5f} | {e_noisy:9.5f} | {e_sv:9.5f} | {abs(e_noisy-fci):7.4f} | {abs(e_sv-fci):7.4f}")

    exact = np.array(all_exact)
    ideal = np.array(all_ideal)
    noisy = np.array(all_noisy)
    sv = np.array(all_sv)

    print(f"\nMAE ideal:              {np.mean(np.abs(ideal - exact)):.6f} Ha")
    print(f"MAE noisy:              {np.mean(np.abs(noisy - exact)):.6f} Ha")
    print(f"MAE symmetry-verified:  {np.mean(np.abs(sv - exact)):.6f} Ha")
    if np.mean(np.abs(sv - exact)) > 0:
        print(f"Improvement (noisy/SV): {np.mean(np.abs(noisy - exact)) / np.mean(np.abs(sv - exact)):.1f}x")

    # Save results
    output_dir = Path("experiments/results")
    output_dir.mkdir(parents=True, exist_ok=True)

    report = {
        "id": "peruzzo2014-heh-sweep",
        "type": "vqe_heh_plus",
        "paper": {
            "title": "A variational eigenvalue solver on a photonic quantum processor",
            "authors": "Peruzzo et al.",
            "arxiv": "1304.3061",
            "journal": "Nature Communications 5, 4213 (2014)",
        },
        "backend": "pennylane (default.qubit + default.mixed)",
        "generated": datetime.now(timezone.utc).isoformat(),
        "molecule": "HeH+",
        "basis_set": "STO-3G",
        "encoding": "Jordan-Wigner (4 qubit)",
        "ansatz": "DoubleExcitation",
        "noise_model": "depolarizing (p=0.05 pre, p=0.10 post)",
        "results_by_distance": results,
        "summary": {
            "mae_ideal_hartree": round(float(np.mean(np.abs(ideal - exact))), 6),
            "mae_noisy_hartree": round(float(np.mean(np.abs(noisy - exact))), 6),
            "mae_sv_hartree": round(float(np.mean(np.abs(sv - exact))), 6),
            "mae_ideal_kcal": round(float(np.mean(np.abs(ideal - exact))) * 627.509, 2),
            "mae_noisy_kcal": round(float(np.mean(np.abs(noisy - exact))) * 627.509, 2),
            "mae_sv_kcal": round(float(np.mean(np.abs(sv - exact))) * 627.509, 2),
            "equilibrium_distance": 0.75,
            "num_bond_distances": len(bond_distances),
        },
    }

    output_file = output_dir / "peruzzo2014-heh-sweep.json"
    with open(output_file, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nResults saved to {output_file}")
