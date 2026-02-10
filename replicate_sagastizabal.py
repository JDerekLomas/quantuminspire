"""
Replication: "Error Mitigation by Symmetry Verification on a VQE"
Sagastizabal et al., Phys. Rev. A 100, 010302 (2019)
https://arxiv.org/abs/1902.11258

2-qubit VQE for H2 with symmetry verification, from QuTech/TU Delft.
"""

import numpy as np
import pennylane as qml
from pennylane import numpy as pnp
from scipy.optimize import minimize_scalar
from openfermion import MolecularData, jordan_wigner
from openfermionpyscf import run_pyscf


def h2_system(R):
    """Compute H2 Hamiltonian and FCI energy at bond distance R."""
    mol = MolecularData([('H', (0, 0, 0)), ('H', (0, 0, R))], 'sto-3g', 1, 0)
    mol = run_pyscf(mol, run_fci=True)
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

    return qml.Hamiltonian(coeffs, ops), mol.fci_energy


def noisy_ansatz(theta, noise_strength):
    """HF state + depolarizing noise + DoubleExcitation + noise."""
    qml.BasisState(np.array([1, 1, 0, 0]), wires=[0, 1, 2, 3])
    if noise_strength > 0:
        for w in range(4):
            qml.DepolarizingChannel(noise_strength, wires=w)
    qml.DoubleExcitation(theta, wires=[0, 1, 2, 3])
    if noise_strength > 0:
        for w in range(4):
            qml.DepolarizingChannel(noise_strength * 2, wires=w)


def run_vqe_ideal(H):
    """Exact statevector VQE using Brent's method (1D optimization)."""
    dev = qml.device('default.qubit', wires=4)

    @qml.qnode(dev)
    def circuit(theta):
        qml.BasisState(np.array([1, 1, 0, 0]), wires=[0, 1, 2, 3])
        qml.DoubleExcitation(theta, wires=[0, 1, 2, 3])
        return qml.expval(H)

    result = minimize_scalar(lambda t: float(circuit(pnp.array(t))),
                             bounds=(-np.pi, np.pi), method='bounded')
    return float(circuit(pnp.array(result.x))), float(result.x)


def run_vqe_noisy(H, shots=8192, noise_strength=0.05):
    """Noisy VQE using PennyLane's built-in expval."""
    dev = qml.device('default.mixed', wires=4, shots=shots)

    @qml.qnode(dev)
    def circuit(theta):
        noisy_ansatz(theta, noise_strength)
        return qml.expval(H)

    best_e, best_t = 1e9, 0
    for theta in np.linspace(-np.pi, np.pi, 80):
        e = float(circuit(pnp.array(theta, requires_grad=False)))
        if e < best_e:
            best_e, best_t = e, theta
    return best_e, best_t


def run_vqe_symmetry_verified(H, shots=8192, noise_strength=0.05):
    """Noisy VQE + symmetry verification via parity post-selection on Z-terms.

    The H2 JW Hamiltonian has two types of terms:
      - Z-diagonal (I, Zi, ZiZj): measured in computational basis
      - XXYY (X0X1Y2Y3 etc.): measured in rotated basis

    The symmetry operator is P = Z0*Z1*Z2*Z3 (particle number parity).
    For Z-diagonal terms, we post-select samples with even parity.
    For XXYY terms, P anticommutes so post-selection doesn't help;
    we measure those normally.
    """
    dev = qml.device('default.mixed', wires=4, shots=shots)

    # Parse the OpenFermion Hamiltonian into explicit term lists
    h_coeffs_list = list(H.coeffs)
    h_ops_list = list(H.ops)

    # Separate identity, Z-only, and XXYY terms
    identity_val = 0.0
    z_terms = []  # (coeff, [(qubit, 'Z'), ...])
    xxyy_terms = []  # (coeff, op)

    for coeff, op in zip(h_coeffs_list, h_ops_list):
        coeff = float(coeff)
        if isinstance(op, qml.Identity):
            identity_val += coeff
            continue
        # Check if Z-only
        op_str = str(op)
        if 'X' not in op_str and 'Y' not in op_str:
            # Extract qubit indices
            wires = list(op.wires)
            z_terms.append((coeff, wires))
        else:
            xxyy_terms.append((coeff, op))

    @qml.qnode(dev)
    def z_samples_circuit(theta):
        noisy_ansatz(theta, noise_strength)
        return qml.sample(wires=[0, 1, 2, 3])

    @qml.qnode(dev)
    def xxyy_expval_circuit(theta):
        """Measure just the XXYY terms."""
        noisy_ansatz(theta, noise_strength)
        if not xxyy_terms:
            return qml.expval(qml.Identity(0))
        xxyy_H = qml.Hamiltonian([c for c, _ in xxyy_terms], [o for _, o in xxyy_terms])
        return qml.expval(xxyy_H)

    best_noisy, best_sv, best_t = 1e9, 1e9, 0

    for theta in np.linspace(-np.pi, np.pi, 80):
        t = pnp.array(theta, requires_grad=False)
        samples = z_samples_circuit(t)  # shape (shots, 4)
        xxyy_ev = float(xxyy_expval_circuit(t))

        # Compute Z-term energies: raw and post-selected
        e_z_raw = identity_val
        e_z_sv = identity_val

        for coeff, wires in z_terms:
            # Raw expectation
            signs = np.ones(len(samples))
            for w in wires:
                signs *= (1 - 2 * samples[:, w])
            ev_raw = float(np.mean(signs))

            # Post-selected: keep even-parity samples
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
    bond_distances = np.arange(0.3, 2.51, 0.2)

    print("Computing H2 Hamiltonians...")
    systems = {}
    for R in bond_distances:
        R = round(R, 2)
        H, fci = h2_system(R)
        systems[R] = (H, fci)
        print(f"  R={R:.1f}: FCI = {fci:.6f} Ha")

    print(f"\n{'R':>5} | {'Exact':>9} | {'Ideal':>9} | {'Noisy':>9} | {'SV':>9} | {'Err_n':>7} | {'Err_sv':>7}")
    print("-" * 75)

    all_exact, all_ideal, all_noisy, all_sv = [], [], [], []

    for R in bond_distances:
        R = round(R, 2)
        H, fci = systems[R]

        e_ideal, _ = run_vqe_ideal(H)
        e_noisy, e_sv, _ = run_vqe_symmetry_verified(H)

        all_exact.append(fci)
        all_ideal.append(e_ideal)
        all_noisy.append(e_noisy)
        all_sv.append(e_sv)

        print(f"{R:5.1f} | {fci:9.5f} | {e_ideal:9.5f} | {e_noisy:9.5f} | {e_sv:9.5f} | {abs(e_noisy-fci):7.4f} | {abs(e_sv-fci):7.4f}")

    exact = np.array(all_exact)
    ideal = np.array(all_ideal)
    noisy = np.array(all_noisy)
    sv = np.array(all_sv)

    print(f"\nMAE ideal:              {np.mean(np.abs(ideal - exact)):.6f} Ha")
    print(f"MAE noisy:              {np.mean(np.abs(noisy - exact)):.6f} Ha")
    print(f"MAE symmetry-verified:  {np.mean(np.abs(sv - exact)):.6f} Ha")
    if np.mean(np.abs(sv - exact)) > 0:
        print(f"Improvement (noisy/SV): {np.mean(np.abs(noisy - exact)) / np.mean(np.abs(sv - exact)):.1f}x")
