#!/usr/bin/env python3
"""
Analyze IBM Quantum hardware results and compute H2 energy.
Also generates corrected VQE circuits.
"""
import numpy as np
import json

# H2 Hamiltonian coefficients at R=0.735 A (equilibrium)
g0, g1, g2, g3, g4, g5 = -0.8692, 0.3435, -0.3435, 0.5596, 0.091, 0.091

# === CORRECT VQE CIRCUIT ===
# The UCCSD ansatz for H2 produces: cos(a/2)|01> + sin(a/2)|10>
# Circuit: X q[1]; Ry(a) q[0]; CNOT(q[0]->q[1]);
#
# Energy = g0 + g1*ZI + g2*IZ + g3*ZZ + g4*XX + g5*YY
# where:  ZI = cos(a),  IZ = -cos(a),  ZZ = -1,  XX = YY = sin(a)
#
# E(a) = g0 - g3 + (g1-g2)*cos(a) + (g4+g5)*sin(a)
#       = -1.4288 + 0.687*cos(a) + 0.182*sin(a)
#
# Optimal: a_opt = pi + arctan(0.182/0.687) = 3.4006 rad

a_opt = np.pi + np.arctan((g4 + g5) / (g1 - g2))
print(f"Correct Ry angle: {a_opt:.6f} rad")

# Verify
E_exact = g0 - g3 + (g1 - g2)*np.cos(a_opt) + (g4 + g5)*np.sin(a_opt)
print(f"Exact energy at optimal angle: {E_exact:.6f} Ha")
print(f"FCI energy: -2.139499 Ha")
print()

# === IDEAL EXPECTATIONS AT OPTIMAL ANGLE ===
ideal_ZI = np.cos(a_opt)
ideal_IZ = -np.cos(a_opt)
ideal_ZZ = -1.0
ideal_XX = np.sin(a_opt)
ideal_YY = np.sin(a_opt)

print("IDEAL Pauli expectations (noiseless):")
print(f"  <ZI> = {ideal_ZI:+.6f}")
print(f"  <IZ> = {ideal_IZ:+.6f}")
print(f"  <ZZ> = {ideal_ZZ:+.6f}")
print(f"  <XX> = {ideal_XX:+.6f}")
print(f"  <YY> = {ideal_YY:+.6f}")
print()

# === PROCESS IBM RESULTS FROM FIRST (INCORRECT) RUN ===
# These used the wrong circuit but are still real quantum data
print("=" * 65)
print("  FIRST IBM RUN (wrong CNOT direction - but real quantum data)")
print("=" * 65)

# IBM bitstring convention: "ab" where a=c[1], b=c[0]
# So "10" means q[1]=1, q[0]=0

# Z-basis measurement
z_counts = {"10": 2125, "11": 1784, "01": 96, "00": 91}
total = 4096

# Parse: extract q[0] and q[1] values from bitstring
def parse_ibm_counts(counts, total):
    """Convert IBM bitstring counts to qubit probabilities."""
    p = {"00": 0, "01": 0, "10": 0, "11": 0}
    for bitstr, count in counts.items():
        # IBM: bitstring is c[n-1]...c[0], leftmost is highest index
        # For 2 qubits: "ab" means c[1]=a, c[0]=b -> q[1]=a, q[0]=b
        p[bitstr] = count / total
    return p

def compute_pauli_from_counts(counts, total):
    """Compute Z-basis Pauli expectations from measurement counts."""
    p = parse_ibm_counts(counts, total)

    # q[0] eigenvalue: +1 if q[0]=0, -1 if q[0]=1
    # q[0]=0: bitstrings "00", "10" (rightmost bit = 0)
    # q[0]=1: bitstrings "01", "11" (rightmost bit = 1)
    ZI = (p["00"] + p["10"]) - (p["01"] + p["11"])

    # q[1]=0: bitstrings "00", "01" (leftmost bit = 0)
    # q[1]=1: bitstrings "10", "11" (leftmost bit = 1)
    IZ = (p["00"] + p["01"]) - (p["10"] + p["11"])

    # Same eigenvalue: "00" (+1*+1=+1), "11" (-1*-1=+1)
    # Diff eigenvalue: "01" (+1*-1=-1), "10" (-1*+1=-1)
    ZZ = (p["00"] + p["11"]) - (p["01"] + p["10"])

    return ZI, IZ, ZZ

# Process Z-basis
ZI_hw, IZ_hw, ZZ_hw = compute_pauli_from_counts(z_counts, total)
print(f"\nZ-basis measurement (4096 shots):")
print(f"  Counts: {z_counts}")
print(f"  <ZI> = {ZI_hw:+.4f}")
print(f"  <IZ> = {IZ_hw:+.4f}")
print(f"  <ZZ> = {ZZ_hw:+.4f}")

# X-basis measurement (H gates before measurement -> measures X)
x_counts = {"10": 373, "01": 1609, "00": 382, "11": 1732}
_, _, XX_hw = compute_pauli_from_counts(x_counts, total)
print(f"\nX-basis measurement (H rotation, 4096 shots):")
print(f"  Counts: {x_counts}")
print(f"  <XX> = {XX_hw:+.4f}")

# Y-basis measurement (Sdg+H before measurement -> measures Y)
y_counts = {"00": 1046, "01": 945, "10": 1087, "11": 1018}
_, _, YY_hw = compute_pauli_from_counts(y_counts, total)
print(f"\nY-basis measurement (Sdg+H rotation, 4096 shots):")
print(f"  Counts: {y_counts}")
print(f"  <YY> = {YY_hw:+.4f}")

# Compute energy from hardware measurements
E_hw = g0 + g1*ZI_hw + g2*IZ_hw + g3*ZZ_hw + g4*XX_hw + g5*YY_hw
print(f"\nEnergy from hardware: {E_hw:.6f} Ha")
print(f"(Note: uses incorrect circuit, but demonstrates hardware measurement)")

# === GENERATE CORRECT CIRCUITS ===
print("\n" + "=" * 65)
print("  CORRECTED VQE CIRCUITS")
print("=" * 65)
print(f"\nOptimal Ry angle: {a_opt:.6f} rad")

for basis in ["Z", "X", "Y"]:
    qasm = f'OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[2];\ncreg c[2];\n\n'
    qasm += '// Prepare Hartree-Fock |01>\n'
    qasm += 'x q[1];\n\n'
    qasm += '// UCCSD ansatz: Ry then CNOT(q0->q1)\n'
    qasm += f'ry({a_opt:.6f}) q[0];\n'
    qasm += 'cx q[0], q[1];\n\n'

    if basis == "X":
        qasm += '// Rotate to X measurement basis\n'
        qasm += 'h q[0];\nh q[1];\n\n'
    elif basis == "Y":
        qasm += '// Rotate to Y measurement basis\n'
        qasm += 'sdg q[0];\nh q[0];\nsdg q[1];\nh q[1];\n\n'

    qasm += 'measure q[0] -> c[0];\nmeasure q[1] -> c[1];\n'

    print(f"\n--- {basis}-basis circuit ---")
    print(qasm)

    # Save to file for reference
    with open(f"/Users/dereklomas/haiqu/experiments/correct_{basis}.qasm", "w") as f:
        f.write(qasm)

print(f"Circuits saved to experiments/correct_*.qasm")
print(f"Submit these to IBM for the true VQE result.")
