#!/usr/bin/env python3
"""
Final analysis: Hybrid Classical-Quantum VQE for H2
Compares ideal (noiseless) vs real IBM quantum hardware results.
"""
import numpy as np

# H2 Hamiltonian coefficients at R=0.735 A
g0, g1, g2, g3, g4, g5 = -0.8692, 0.3435, -0.3435, 0.5596, 0.091, 0.091

# Optimal Ry angle from classical optimization
a_opt = np.pi + np.arctan((g4 + g5) / (g1 - g2))

print("=" * 70)
print("  HYBRID VQE FOR H2: FINAL RESULTS")
print("  Classical optimization + IBM Quantum hardware measurement")
print("=" * 70)

print(f"\n  Molecule:        H2 (hydrogen)")
print(f"  Basis set:       STO-3G (minimal)")
print(f"  Bond distance:   0.735 A (equilibrium)")
print(f"  Qubit mapping:   Jordan-Wigner (2 qubits)")
print(f"  Ansatz:          UCCSD (1 parameter)")
print(f"  Optimal angle:   {a_opt:.4f} rad")

# === IBM FEZ HARDWARE RESULTS (correct VQE circuit) ===
# Backend: ibm_fez, 156-qubit Heron processor
fez_z = {"01": 3670, "11": 126, "00": 189, "10": 111}
fez_x = {"11": 616, "00": 873, "10": 1338, "01": 1269}
fez_y = {"00": 669, "10": 1492, "11": 849, "01": 1086}
total = 4096

def pauli_from_counts(counts, total):
    """Compute Z-basis Pauli expectations."""
    p = {k: v/total for k, v in counts.items()}
    # IBM convention: "ab" where a=c[1], b=c[0]
    ZI = (p.get("00",0) + p.get("10",0)) - (p.get("01",0) + p.get("11",0))
    IZ = (p.get("00",0) + p.get("01",0)) - (p.get("10",0) + p.get("11",0))
    ZZ = (p.get("00",0) + p.get("11",0)) - (p.get("01",0) + p.get("10",0))
    return ZI, IZ, ZZ

# Z-basis measurements
ZI_hw, IZ_hw, ZZ_hw = pauli_from_counts(fez_z, total)
# X-basis: the ZZ-like correlator gives XX
_, _, XX_hw = pauli_from_counts(fez_x, total)
# Y-basis: the ZZ-like correlator gives YY
_, _, YY_hw = pauli_from_counts(fez_y, total)

# Ideal expectations
ZI_id = np.cos(a_opt)
IZ_id = -np.cos(a_opt)
ZZ_id = -1.0
XX_id = np.sin(a_opt)
YY_id = np.sin(a_opt)

# Energies
E_ideal = g0 + g1*ZI_id + g2*IZ_id + g3*ZZ_id + g4*XX_id + g5*YY_id
E_hw = g0 + g1*ZI_hw + g2*IZ_hw + g3*ZZ_hw + g4*XX_hw + g5*YY_hw
E_hf = g0 + g1*1 + g2*(-1) + g3*(-1) + g4*0 + g5*0  # theta=0

# FCI from diagonalization
I2 = np.eye(2, dtype=complex)
X = np.array([[0,1],[1,0]], dtype=complex)
Y = np.array([[0,-1j],[1j,0]], dtype=complex)
Z = np.array([[1,0],[0,-1]], dtype=complex)
H_mat = (g0*np.kron(I2,I2) + g1*np.kron(Z,I2) + g2*np.kron(I2,Z) +
         g3*np.kron(Z,Z) + g4*np.kron(X,X) + g5*np.kron(Y,Y))
E_fci = np.linalg.eigvalsh(H_mat)[0]

print("\n" + "-" * 70)
print("  PAULI EXPECTATION VALUES")
print("-" * 70)
print(f"  {'Term':>6} | {'Ideal':>10} | {'IBM Fez':>10} | {'Error':>10}")
print(f"  {'-'*6}-+-{'-'*10}-+-{'-'*10}-+-{'-'*10}")
for name, ideal, hw in [("ZI", ZI_id, ZI_hw), ("IZ", IZ_id, IZ_hw),
                         ("ZZ", ZZ_id, ZZ_hw), ("XX", XX_id, XX_hw),
                         ("YY", YY_id, YY_hw)]:
    print(f"  {name:>6} | {ideal:>+10.4f} | {hw:>+10.4f} | {hw-ideal:>+10.4f}")

print("\n" + "-" * 70)
print("  ENERGY COMPARISON")
print("-" * 70)
print(f"  Hartree-Fock (no correlation):     {E_hf:.6f} Ha")
print(f"  VQE Ideal (noiseless simulation):  {E_ideal:.6f} Ha")
print(f"  VQE IBM Fez (real quantum HW):     {E_hw:.6f} Ha")
print(f"  Exact FCI (full diagonalization):   {E_fci:.6f} Ha")

print(f"\n  Hardware noise error:              {abs(E_hw - E_ideal)*1000:.1f} mHa")
print(f"  Chemical accuracy threshold:       1.6 mHa (1 kcal/mol)")

# Correlation energy analysis
corr_total = E_hf - E_fci
corr_hw = E_hf - E_hw
pct = (corr_hw / corr_total * 100) if corr_total != 0 else 0
print(f"\n  Total correlation energy:          {corr_total*1000:.1f} mHa")
print(f"  Captured by hardware VQE:          {corr_hw*1000:.1f} mHa ({pct:.1f}%)")

print("\n" + "-" * 70)
print("  HARDWARE DETAILS")
print("-" * 70)
print(f"  Backend:          ibm_fez (IBM Heron, 156 qubits)")
print(f"  Qubits used:      2 of 156")
print(f"  Transpiled depth: 9 gates")
print(f"  Native gates:     rz, sx, cz, measure")
print(f"  Shots per basis:  4,096")
print(f"  Total shots:      12,288 (3 measurement bases)")

print("\n" + "-" * 70)
print("  MEASUREMENT HISTOGRAMS (IBM Fez)")
print("-" * 70)
for name, counts in [("Z-basis", fez_z), ("X-basis", fez_x), ("Y-basis", fez_y)]:
    print(f"\n  {name}:")
    for bitstr in ["00", "01", "10", "11"]:
        c = counts.get(bitstr, 0)
        bar = "#" * int(c / total * 50)
        print(f"    |{bitstr}> : {c:4d} ({c/total*100:5.1f}%) {bar}")

print("\n" + "=" * 70)
print("  CONCLUSION")
print("=" * 70)
print(f"""
  This experiment demonstrated a genuine hybrid classical-quantum
  computation:

  CLASSICAL (this computer):
    - Constructed H2 molecular Hamiltonian (STO-3G basis)
    - Mapped to 2-qubit operator via Jordan-Wigner transformation
    - Optimized variational parameter theta = {a_opt:.4f} rad
    - Post-processed measurement statistics into energy

  QUANTUM (IBM Fez, Heron processor):
    - Prepared UCCSD trial wavefunction on superconducting qubits
    - Measured Pauli expectation values in Z, X, Y bases
    - 12,288 total shots across 3 circuits

  The hardware VQE energy ({E_hw:.4f} Ha) captures {pct:.0f}% of the
  electron correlation energy, with {abs(E_hw - E_ideal)*1000:.0f} mHa noise error.
  Real quantum hardware is noisy but the signal is clear.
""")
