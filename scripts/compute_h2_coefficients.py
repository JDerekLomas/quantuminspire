#!/usr/bin/env python3
"""Compute 2-qubit sector-projected H2 Hamiltonian coefficients at multiple bond distances.

Uses PennyLane to build the 4-qubit JW Hamiltonian, then projects to the
{|1100>, |0011>} sector (HF ground + doubly-excited) to get the 2-qubit VQE
Hamiltonian:  H = g0*I + g1*Z0 + g2*Z1 + g3*Z0Z1 + g4*X0X1 + g5*Y0Y1

Exploits H2 STO-3G symmetries: g2 = -g1, g3 = 0, g4 = g5.
"""

import json
import numpy as np

DISTANCES = [0.5, 0.735, 1.0, 1.5, 2.0, 2.5]

# JW encoding: q0=1sα, q1=1sβ, q2=2sα, q3=2sβ
# HF ground: |1100> = index 12 → maps to |10> in 2-qubit space
# Doubly-excited: |0011> = index 3 → maps to |01> in 2-qubit space
IDX_HF = 12   # |1100>
IDX_EX = 3    # |0011>


def compute_coefficients(R):
    """Compute 2-qubit Hamiltonian coefficients for H2 at bond distance R (Å)."""
    import pennylane as qml

    symbols = ["H", "H"]
    coordinates = np.array([0.0, 0.0, 0.0, 0.0, 0.0, R * 1.8897259886])

    H, qubits = qml.qchem.molecular_hamiltonian(symbols, coordinates, basis="sto-3g")

    # Full 16x16 Hamiltonian matrix
    H_mat = qml.matrix(H)

    # FCI energy (exact)
    eigvals = np.linalg.eigvalsh(H_mat)
    fci_energy = float(eigvals[0])

    # Extract 2x2 effective Hamiltonian in {|0011>, |1100>} sector
    # |01> (2q) = |0011> (4q) = idx 3
    # |10> (2q) = |1100> (4q) = idx 12
    h_01_01 = float(np.real(H_mat[IDX_EX, IDX_EX]))   # <01|H|01>
    h_10_10 = float(np.real(H_mat[IDX_HF, IDX_HF]))   # <10|H|10> = HF energy
    h_10_01 = float(np.real(H_mat[IDX_HF, IDX_EX]))   # <10|H|01> = coupling

    # Decompose using H2 STO-3G symmetries: g2=-g1, g3=0, g4=g5
    # H_eff[|01>,|01>] = g0 + g1 - g2 - g3 = g0 + 2*g1
    # H_eff[|10>,|10>] = g0 - g1 + g2 - g3 = g0 - 2*g1
    # H_eff[|10>,|01>] = g4 + g5 = 2*g4
    g0 = (h_01_01 + h_10_10) / 2
    g1 = (h_01_01 - h_10_10) / 4
    g2 = -g1
    g3 = 0.0
    g4 = h_10_01 / 2
    g5 = g4

    # Find optimal alpha: E(a) = cos²(a/2)*h_10_10 + sin²(a/2)*h_01_01 + sin(a)*h_10_01
    alphas = np.linspace(-np.pi, np.pi, 10000)
    energies = (np.cos(alphas / 2)**2 * h_10_10 +
                np.sin(alphas / 2)**2 * h_01_01 +
                np.sin(alphas) * h_10_01)
    opt_idx = np.argmin(energies)
    opt_alpha = float(alphas[opt_idx])
    opt_energy = float(energies[opt_idx])

    return {
        "bond_distance": R,
        "g0": round(g0, 6),
        "g1": round(g1, 6),
        "g2": round(g2, 6),
        "g3": round(g3, 6),
        "g4": round(g4, 6),
        "g5": round(g5, 6),
        "fci_energy": round(fci_energy, 6),
        "optimal_alpha": round(opt_alpha, 4),
        "projected_ground_energy": round(opt_energy, 6),
        "hf_energy": round(h_10_10, 6),
        "error_vs_fci": round(abs(opt_energy - fci_energy) * 627.509, 4),
    }


if __name__ == "__main__":
    results = []
    for R in DISTANCES:
        print(f"R = {R:.3f} Å ... ", end="", flush=True)
        r = compute_coefficients(R)
        results.append(r)
        print(f"FCI={r['fci_energy']:.4f}  g0={r['g0']:.4f}  g1={r['g1']:.4f}  "
              f"g4={r['g4']:.4f}  alpha={r['optimal_alpha']:.4f}  "
              f"proj_err={r['error_vs_fci']:.2f} kcal/mol")

    # Verify R=0.735 matches known values
    r735 = next(r for r in results if r["bond_distance"] == 0.735)
    assert abs(r735["g0"] - (-0.321124)) < 0.001, f"g0 mismatch: {r735['g0']}"
    assert abs(r735["g4"] - 0.090466) < 0.001, f"g4 mismatch: {r735['g4']}"
    print("\nValidation passed: R=0.735 coefficients match known values.")

    out_path = "scripts/h2_coefficients.json"
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Saved to {out_path}")
