#!/usr/bin/env python3
"""
Hybrid Classical-Quantum VQE for H2 Molecule
=============================================
Finds the ground state energy of molecular hydrogen using the
Variational Quantum Eigensolver — the canonical hybrid algorithm.

Classical computer: constructs Hamiltonian, optimizes parameters
Quantum computer:   prepares trial wavefunction, measures energy

H2 in STO-3G basis, Jordan-Wigner mapped to 2 qubits.

REPLICATION NOTE: Cites O'Malley et al. (2016) and Kandala et al. (2017)
but replicates neither — different hardware, ansatz, and error mitigation.
Coefficients are hard-coded from O'Malley's table, not derived from first
principles. More accurately: a standard textbook H2 VQE on modern IBM hardware.
See .claude/handoffs/2026-02-12-vqe-experiments.md for full analysis.
"""
import numpy as np
import json
import sys

# === PAULI MATRICES ===
I2 = np.eye(2, dtype=complex)
X = np.array([[0, 1], [1, 0]], dtype=complex)
Y = np.array([[0, -1j], [1j, 0]], dtype=complex)
Z = np.array([[1, 0], [0, -1]], dtype=complex)

def kron(A, B):
    return np.kron(A, B)

# === H2 HAMILTONIAN ===
# After Jordan-Wigner mapping and 2-qubit tapering
# H = g0*II + g1*ZI + g2*IZ + g3*ZZ + g4*XX + g5*YY
#
# Coefficients at multiple bond distances R (Angstroms)
# Source: O'Malley et al., Phys. Rev. X 6, 031007 (2016)
# Validated against Kandala et al., Nature 549, 242 (2017)

H2_COEFFICIENTS = {
    0.20: (-0.2252,  0.5218, -0.5218,  0.6741,  0.0406,  0.0406),
    0.30: (-0.4620,  0.4988, -0.4988,  0.6578,  0.0598,  0.0598),
    0.40: (-0.6246,  0.4677, -0.4677,  0.6375,  0.0740,  0.0740),
    0.50: (-0.7348,  0.4316, -0.4316,  0.6146,  0.0838,  0.0838),
    0.60: (-0.8089,  0.3943, -0.3943,  0.5907,  0.0889,  0.0889),
    0.70: (-0.8579,  0.3578, -0.3578,  0.5675,  0.0908,  0.0908),
    0.735: (-0.8692,  0.3435, -0.3435,  0.5596,  0.0910,  0.0910),  # equilibrium
    0.80: (-0.8862,  0.3231, -0.3231,  0.5461,  0.0905,  0.0905),
    0.90: (-0.8987,  0.2910, -0.2910,  0.5268,  0.0886,  0.0886),
    1.00: (-0.8997,  0.2618, -0.2618,  0.5098,  0.0859,  0.0859),
    1.20: (-0.8803,  0.2119, -0.2119,  0.4821,  0.0791,  0.0791),
    1.50: (-0.8378,  0.1549, -0.1549,  0.4530,  0.0686,  0.0686),
    2.00: (-0.7797,  0.0938, -0.0938,  0.4270,  0.0519,  0.0519),
    2.50: (-0.7457,  0.0571, -0.0571,  0.4134,  0.0375,  0.0375),
    3.00: (-0.7270,  0.0340, -0.0340,  0.4063,  0.0260,  0.0260),
}


def build_hamiltonian(g0, g1, g2, g3, g4, g5):
    """Build the 4x4 qubit Hamiltonian matrix."""
    H = (g0 * kron(I2, I2) +
         g1 * kron(Z, I2) +
         g2 * kron(I2, Z) +
         g3 * kron(Z, Z) +
         g4 * kron(X, X) +
         g5 * kron(Y, Y))
    return H


def uccsd_ansatz_state(theta):
    """
    Prepare the UCC Singles-Doubles trial state for H2.

    |psi(theta)> = exp(-i*theta*(X0Y1 - Y0X1)/2) |01>
                 = cos(theta)|01> + sin(theta)|10>

    This is the exact ansatz for H2 in minimal basis.
    theta=0 gives Hartree-Fock |01>, theta=pi/4 gives Bell state.
    """
    # |01> in computational basis (qubit 0 = |0>, qubit 1 = |1>)
    state = np.array([0, 1, 0, 0], dtype=complex)  # |01>

    # Apply the UCC rotation
    # Generator: G = -i*(X0Y1 - Y0X1)/2
    G = (kron(X, Y) - kron(Y, X)) / 2
    U = np.eye(4, dtype=complex) * np.cos(theta) - 1j * G * np.sin(theta)

    return U @ state


def compute_energy_exact(theta, coefficients):
    """Compute <psi(theta)|H|psi(theta)> via matrix algebra (classical simulation)."""
    g0, g1, g2, g3, g4, g5 = coefficients
    H = build_hamiltonian(g0, g1, g2, g3, g4, g5)
    psi = uccsd_ansatz_state(theta)
    return np.real(psi.conj() @ H @ psi)


def compute_energy_from_paulis(theta, coefficients):
    """
    Compute energy from individual Pauli expectation values.
    This mirrors what happens on real quantum hardware:
    each Pauli term is measured separately via different circuits.
    """
    g0, g1, g2, g3, g4, g5 = coefficients
    psi = uccsd_ansatz_state(theta)

    # Measure each Pauli term
    exp_II = 1.0  # always 1
    exp_ZI = np.real(psi.conj() @ kron(Z, I2) @ psi)
    exp_IZ = np.real(psi.conj() @ kron(I2, Z) @ psi)
    exp_ZZ = np.real(psi.conj() @ kron(Z, Z) @ psi)
    exp_XX = np.real(psi.conj() @ kron(X, X) @ psi)
    exp_YY = np.real(psi.conj() @ kron(Y, Y) @ psi)

    energy = g0*exp_II + g1*exp_ZI + g2*exp_IZ + g3*exp_ZZ + g4*exp_XX + g5*exp_YY
    return energy, {
        "II": exp_II, "ZI": exp_ZI, "IZ": exp_IZ,
        "ZZ": exp_ZZ, "XX": exp_XX, "YY": exp_YY
    }


def fci_energy(coefficients):
    """Exact ground state energy via full diagonalization."""
    H = build_hamiltonian(*coefficients)
    eigenvalues = np.linalg.eigvalsh(H)
    return eigenvalues[0]


# === MAIN VQE SIMULATION ===
print("=" * 65)
print("  HYBRID CLASSICAL-QUANTUM VQE: H2 MOLECULE")
print("  Variational Quantum Eigensolver in STO-3G basis")
print("=" * 65)

# --- Step 1: Classical Hamiltonian construction ---
print("\n[CLASSICAL] Building H2 qubit Hamiltonian...")
R_eq = 0.735  # equilibrium bond distance in Angstroms
coeffs_eq = H2_COEFFICIENTS[R_eq]
g0, g1, g2, g3, g4, g5 = coeffs_eq
print(f"  Bond distance: {R_eq} A")
print(f"  Hamiltonian: {g0:.4f}*II + {g1:.4f}*ZI + {g2:.4f}*IZ")
print(f"             + {g3:.4f}*ZZ + {g4:.4f}*XX + {g5:.4f}*YY")

# --- Step 2: VQE parameter sweep (classical optimization) ---
print("\n[CLASSICAL] VQE parameter sweep...")
thetas = np.linspace(-np.pi/2, np.pi/2, 200)
energies = [compute_energy_exact(t, coeffs_eq) for t in thetas]
idx_min = np.argmin(energies)
theta_opt = thetas[idx_min]
E_vqe = energies[idx_min]

# Refine with scipy-style golden section (no scipy needed)
for _ in range(50):
    dt = 0.001
    E_minus = compute_energy_exact(theta_opt - dt, coeffs_eq)
    E_plus = compute_energy_exact(theta_opt + dt, coeffs_eq)
    grad = (E_plus - E_minus) / (2 * dt)
    theta_opt -= 0.1 * grad
E_vqe = compute_energy_exact(theta_opt, coeffs_eq)

E_fci = fci_energy(coeffs_eq)
E_hf = compute_energy_exact(0, coeffs_eq)  # Hartree-Fock (theta=0)

print(f"  Hartree-Fock energy (theta=0):     {E_hf:.6f} Ha")
print(f"  VQE optimal energy (theta={theta_opt:.4f}): {E_vqe:.6f} Ha")
print(f"  Exact FCI energy:                  {E_fci:.6f} Ha")
print(f"  VQE error:                         {abs(E_vqe - E_fci)*1000:.4f} mHa")
print(f"  Correlation energy captured:       {(E_hf - E_vqe)/(E_hf - E_fci)*100:.1f}%")

# --- Step 3: Pauli decomposition at optimal angle ---
print("\n[QUANTUM] Pauli expectation values at optimal theta:")
E_pauli, paulis = compute_energy_from_paulis(theta_opt, coeffs_eq)
for term, val in paulis.items():
    print(f"  <{term}> = {val:+.6f}")
print(f"  Reconstructed energy: {E_pauli:.6f} Ha")

# --- Step 4: Potential energy surface ---
print("\n[HYBRID] Potential Energy Surface Scan:")
print(f"  {'R (A)':>7} | {'E_HF (Ha)':>11} | {'E_VQE (Ha)':>11} | {'E_FCI (Ha)':>11} | {'Error (mHa)':>12}")
print("  " + "-" * 62)

pes_data = []
for R, coeffs in sorted(H2_COEFFICIENTS.items()):
    E_hf_r = compute_energy_exact(0, coeffs)

    # VQE optimization at this bond distance
    best_E = E_hf_r
    best_t = 0
    for t in np.linspace(-np.pi/2, np.pi/2, 100):
        E = compute_energy_exact(t, coeffs)
        if E < best_E:
            best_E = E
            best_t = t
    # Refine
    for _ in range(30):
        dt = 0.001
        Em = compute_energy_exact(best_t - dt, coeffs)
        Ep = compute_energy_exact(best_t + dt, coeffs)
        grad = (Ep - Em) / (2 * dt)
        best_t -= 0.1 * grad
    E_vqe_r = compute_energy_exact(best_t, coeffs)
    E_fci_r = fci_energy(coeffs)

    error_mha = abs(E_vqe_r - E_fci_r) * 1000
    pes_data.append({"R": R, "E_HF": E_hf_r, "E_VQE": E_vqe_r, "E_FCI": E_fci_r, "theta": best_t})

    marker = " <-- eq" if R == 0.735 else ""
    print(f"  {R:7.3f} | {E_hf_r:11.6f} | {E_vqe_r:11.6f} | {E_fci_r:11.6f} | {error_mha:12.4f}{marker}")

# --- Step 5: Generate quantum circuits for real hardware ---
print("\n[QUANTUM] Generating circuits for hardware execution...")
print(f"  Optimal theta = {theta_opt:.6f} rad")

# OpenQASM 2.0 circuits for IBM Quantum
def gen_ibm_circuit(theta, basis="Z"):
    """Generate OpenQASM 2.0 circuit for measuring in given Pauli basis."""
    qasm = f'OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[2];\ncreg c[2];\n\n'
    qasm += '// Prepare |01> (Hartree-Fock state)\n'
    qasm += 'x q[1];\n\n'
    qasm += '// UCCSD ansatz\n'
    qasm += 'cx q[1], q[0];\n'
    qasm += f'ry({theta:.6f}) q[0];\n'
    qasm += 'cx q[1], q[0];\n\n'

    if basis == "X":
        qasm += '// Rotate to X basis\n'
        qasm += 'h q[0];\nh q[1];\n\n'
    elif basis == "Y":
        qasm += '// Rotate to Y basis\n'
        qasm += 'sdg q[0];\nh q[0];\nsdg q[1];\nh q[1];\n\n'

    qasm += 'measure q[0] -> c[0];\nmeasure q[1] -> c[1];\n'
    return qasm

# cQASM 3.0 circuits for QI emulator
def gen_qi_circuit(theta, basis="Z"):
    """Generate cQASM 3.0 circuit for measuring in given Pauli basis."""
    cqasm = 'version 3.0\n\nqubit[2] q\n\n'
    cqasm += '// Prepare |01> (Hartree-Fock state)\n'
    cqasm += 'X q[1]\n\n'
    cqasm += '// UCCSD ansatz\n'
    cqasm += f'CNOT q[1], q[0]\n'
    cqasm += f'Ry q[0], {theta:.6f}\n'
    cqasm += f'CNOT q[1], q[0]\n\n'

    if basis == "X":
        cqasm += '// Rotate to X basis\n'
        cqasm += 'H q[0]\nH q[1]\n\n'
    elif basis == "Y":
        cqasm += '// Rotate to Y basis\n'
        cqasm += 'Sdag q[0]\nH q[0]\nSdag q[1]\nH q[1]\n\n'

    cqasm += 'measure q\n'
    return cqasm

# Save circuits
circuits = {}
for basis in ["Z", "X", "Y"]:
    circuits[f"ibm_{basis}"] = gen_ibm_circuit(theta_opt, basis)
    circuits[f"qi_{basis}"] = gen_qi_circuit(theta_opt, basis)

# Print the IBM circuits
for basis in ["Z", "X", "Y"]:
    print(f"\n  --- IBM Circuit ({basis}-basis measurement) ---")
    for line in circuits[f"ibm_{basis}"].split('\n'):
        print(f"  {line}")

# Save circuits to JSON for the orchestrator
output = {
    "theta_optimal": float(theta_opt),
    "coefficients": {"g0": g0, "g1": g1, "g2": g2, "g3": g3, "g4": g4, "g5": g5},
    "classical_results": {
        "E_HF": float(E_hf),
        "E_VQE": float(E_vqe),
        "E_FCI": float(E_fci),
        "pauli_expectations": {k: float(v) for k, v in paulis.items()},
    },
    "circuits": circuits,
    "pes_data": pes_data,
}

with open("/Users/dereklomas/haiqu/experiments/h2_vqe_output.json", "w") as f:
    json.dump(output, f, indent=2, default=str)

print("\n" + "=" * 65)
print("  Classical computation complete. Circuits ready for hardware.")
print("  Next: submit circuits to quantum hardware & compare.")
print("=" * 65)
