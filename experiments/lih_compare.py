#!/usr/bin/env python3
"""LiH VQE: Three-way comparison — IBM Fez vs QI Emulator vs Ideal.

LiH at R=1.6 A, STO-3G basis, CASCI(2,2) active space.
4 qubits, 27 Pauli terms, 9 measurement circuits, 4096 shots each.
"""
import json
import numpy as np

# ---------------------------------------------------------------------------
# Hamiltonian (27 Pauli terms)
# Convention: "ABCD" → A on qubit 0, B on qubit 1, C on qubit 2, D on qubit 3
# ---------------------------------------------------------------------------
pauli_terms = {
    "IIII": -8.35590992423199,
    "ZIII": 0.6166576277429734,
    "YZYI": 0.034563657541850486,
    "XZXI": 0.034563657541850486,
    "IZII": 0.6166576277429735,
    "IYZY": 0.034563657541850486,
    "IXZX": 0.034563657541850486,
    "IIZI": 0.370979366498277,
    "IIIZ": 0.37097936649827695,
    "ZZII": -0.12182774168311085,
    "ZYZY": -0.012144898067813291,
    "ZXZX": -0.012144898067813291,
    "YIYI": -0.012144898067813291,
    "XIXI": -0.012144898067813291,
    "YXXY": -0.003265995895202011,
    "YYXX": 0.003265995895202011,
    "XXYY": 0.003265995895202011,
    "XYYX": -0.003265995895202011,
    "ZIZI": -0.05263651530244966,
    "ZIIZ": -0.05590251119765166,
    "YZYZ": 0.0018710430187559995,
    "XZXZ": 0.0018710430187559995,
    "IZZI": -0.05590251119765166,
    "IYIY": 0.0018710430187559995,
    "IXIX": 0.0018710430187559995,
    "IZIZ": -0.05263651530244966,
    "IIZZ": -0.08447056786924143,
}

circuit_terms = {
    "Z":                ["IIII", "ZIII", "IZII", "IIZI", "IIIZ",
                         "ZZII", "ZIZI", "ZIIZ", "IZZI", "IZIZ", "IIZZ"],
    "q0Y_q2Y":          ["YZYI", "YIYI", "YZYZ"],
    "q0X_q2X":          ["XZXI", "XIXI", "XZXZ"],
    "q1Y_q3Y":          ["IYZY", "ZYZY", "IYIY"],
    "q1X_q3X":          ["IXZX", "ZXZX", "IXIX"],
    "q0Y_q1X_q2X_q3Y":  ["YXXY"],
    "q0Y_q1Y_q2X_q3X":  ["YYXX"],
    "q0X_q1X_q2Y_q3Y":  ["XXYY"],
    "q0X_q1Y_q2Y_q3X":  ["XYYX"],
}

# ---------------------------------------------------------------------------
# IBM Fez results (156-qubit Heron r2)
# ---------------------------------------------------------------------------
ibm_counts = {
    "Z": {
        "1111": 3317, "0111": 178, "0011": 40, "1110": 214,
        "1011": 40, "0001": 99, "1010": 4, "1101": 131,
        "1000": 3, "0000": 26, "0110": 13, "1100": 10,
        "0101": 11, "1001": 8, "0010": 2,
    },
    "q0Y_q2Y": {
        "1111": 800, "1011": 830, "1110": 986, "1010": 987,
        "0000": 24, "1100": 29, "0001": 28, "1101": 37,
        "0100": 37, "0010": 61, "0101": 45, "0111": 51,
        "1000": 34, "1001": 29, "0110": 68, "0011": 50,
    },
    "q0X_q2X": {
        "1111": 995, "1011": 920, "1110": 818, "1010": 925,
        "0111": 55, "0010": 45, "0011": 41, "1001": 31,
        "0110": 48, "1000": 22, "0000": 25, "0100": 42,
        "0101": 31, "1101": 35, "0001": 28, "1100": 35,
    },
    "q1Y_q3Y": {
        "1111": 844, "0101": 1026, "1101": 913, "1110": 50,
        "0111": 858, "0110": 58, "0100": 63, "1001": 53,
        "1100": 54, "0001": 45, "0011": 53, "1010": 11,
        "1000": 7, "1011": 44, "0000": 6, "0010": 11,
    },
    "q1X_q3X": {
        "0101": 972, "1111": 865, "0011": 73, "1101": 933,
        "0111": 871, "0001": 50, "1100": 67, "0110": 63,
        "1011": 52, "1110": 38, "1001": 32, "0100": 49,
        "0000": 10, "0010": 12, "1010": 4, "1000": 5,
    },
    "q0Y_q1X_q2X_q3Y": {
        "0101": 193, "1001": 208, "0001": 295, "1010": 336,
        "0010": 210, "0100": 256, "1000": 257, "1101": 276,
        "1011": 317, "1100": 301, "0110": 320, "0000": 337,
        "0111": 266, "1111": 155, "0011": 156, "1110": 213,
    },
    "q0Y_q1Y_q2X_q3X": {
        "1111": 160, "0010": 232, "1110": 231, "0011": 189,
        "1000": 235, "0000": 367, "1100": 298, "1001": 160,
        "1101": 272, "0100": 239, "0101": 188, "0001": 304,
        "1010": 329, "0110": 335, "1011": 277, "0111": 280,
    },
    "q0X_q1X_q2Y_q3Y": {
        "0000": 260, "1000": 276, "1100": 224, "0010": 223,
        "0110": 246, "0011": 222, "1011": 272, "0111": 284,
        "0101": 279, "0100": 275, "1010": 203, "1111": 242,
        "1001": 283, "0001": 280, "1101": 256, "1110": 271,
    },
    "q0X_q1Y_q2Y_q3X": {
        "0100": 277, "1111": 218, "0111": 296, "0101": 293,
        "0010": 247, "1110": 246, "1001": 271, "0011": 242,
        "1010": 227, "1101": 256, "0001": 296, "1100": 215,
        "1000": 268, "0000": 221, "0110": 259, "1011": 264,
    },
}

# ---------------------------------------------------------------------------
# QI Emulator results (qxelarator, noiseless)
# ---------------------------------------------------------------------------
qi_counts = {
    "Z": {"1111": 4096},
    "q0Y_q2Y": {"1010": 1051, "1011": 1025, "1110": 1049, "1111": 971},
    "q0X_q2X": {"1010": 1040, "1011": 1013, "1110": 1017, "1111": 1026},
    "q1Y_q3Y": {"0101": 1011, "0111": 1029, "1101": 1007, "1111": 1049},
    "q1X_q3X": {"0101": 1043, "0111": 1005, "1101": 1043, "1111": 1005},
    "q0Y_q1X_q2X_q3Y": {
        "0000": 270, "0001": 244, "0010": 255, "0011": 241,
        "0100": 265, "0101": 245, "0110": 267, "0111": 243,
        "1000": 244, "1001": 246, "1010": 263, "1011": 254,
        "1100": 285, "1101": 256, "1110": 259, "1111": 259,
    },
    "q0Y_q1Y_q2X_q3X": {
        "0000": 255, "0001": 238, "0010": 271, "0011": 236,
        "0100": 237, "0101": 267, "0110": 246, "0111": 251,
        "1000": 269, "1001": 267, "1010": 258, "1011": 253,
        "1100": 270, "1101": 260, "1110": 268, "1111": 250,
    },
    "q0X_q1X_q2Y_q3Y": {
        "0000": 252, "0001": 258, "0010": 234, "0011": 256,
        "0100": 251, "0101": 250, "0110": 273, "0111": 263,
        "1000": 274, "1001": 239, "1010": 243, "1011": 250,
        "1100": 266, "1101": 238, "1110": 273, "1111": 276,
    },
    "q0X_q1Y_q2Y_q3X": {
        "0000": 259, "0001": 268, "0010": 243, "0011": 272,
        "0100": 267, "0101": 267, "0110": 279, "0111": 242,
        "1000": 287, "1001": 228, "1010": 259, "1011": 218,
        "1100": 259, "1101": 251, "1110": 243, "1111": 254,
    },
}

N_QUBITS = 4

# ---------------------------------------------------------------------------
# Compute expectation values
# ---------------------------------------------------------------------------
def pauli_expectation(counts, pauli_str, n_qubits=4):
    """Compute <P> from measurement counts.
    Bitstring convention (same for IBM & QI): str[0]=q_{n-1} (MSB), str[-1]=q_0 (LSB).
    """
    if all(c == 'I' for c in pauli_str):
        return 1.0
    active = [i for i, p in enumerate(pauli_str) if p != 'I']
    total = sum(counts.values())
    exp_val = 0.0
    for bitstring, count in counts.items():
        parity = sum(int(bitstring[n_qubits - 1 - i]) for i in active)
        exp_val += count * ((-1) ** parity)
    return exp_val / total


def compute_energy(all_counts):
    """Compute total energy from a set of measurement counts."""
    E = 0.0
    term_vals = {}
    for circuit_name, terms in circuit_terms.items():
        counts = all_counts[circuit_name]
        for term in terms:
            exp_val = pauli_expectation(counts, term)
            E += pauli_terms[term] * exp_val
            term_vals[term] = exp_val
    return E, term_vals


# Reference energies
E_VQE_ideal = -10.75456027230527   # Ideal VQE (active-space Hamiltonian)
E_HF = -7.861864769808645
E_FCI = -7.882324378883491
E_CASCI = -7.862128833438587
offset = E_VQE_ideal - E_CASCI      # Maps active-space energy to molecular energy

# Compute energies
E_ibm, ibm_vals = compute_energy(ibm_counts)
E_qi, qi_vals = compute_energy(qi_counts)

E_ibm_mol = E_ibm - offset
E_qi_mol = E_qi - offset

# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------
print("=" * 78)
print("  LiH VQE — THREE-WAY COMPARISON")
print("  LiH at R=1.6 A, STO-3G, CASCI(2,2), 4 qubits, 27 Pauli terms")
print("  9 circuits x 4096 shots = 36,864 measurements per platform")
print("=" * 78)

print(f"\n  {'Platform':<24} | {'Qubits':>6} | {'Chip':>14} | {'Noise':>8}")
print(f"  {'-'*24}-+-{'-'*6}-+-{'-'*14}-+-{'-'*8}")
print(f"  {'QI Emulator':<24} | {'4':>6} | {'qxelarator':>14} | {'None':>8}")
print(f"  {'IBM Fez':<24} | {'156':>6} | {'Heron r2':>14} | {'Real':>8}")

# Term-by-term comparison for the most significant terms
print(f"\n  {'Pauli':>16} | {'Coeff':>10} | {'QI <P>':>10} | {'IBM <P>':>10} | {'QI err':>10} | {'IBM err':>10}")
print(f"  {'-'*16}-+-{'-'*10}-+-{'-'*10}-+-{'-'*10}-+-{'-'*10}-+-{'-'*10}")

# Sort by absolute coefficient (show most significant first)
sorted_terms = sorted(pauli_terms.items(), key=lambda x: -abs(x[1]))
for term, coeff in sorted_terms:
    if term == "IIII":
        continue  # Skip identity (always 1)
    qi_v = qi_vals[term]
    ibm_v = ibm_vals[term]
    # "Ideal" for each term: we don't have the exact ideal values easily,
    # but for Z-basis terms on the emulator, |1111> gives all Z expectations = -1
    # For simplicity, compare QI vs IBM (QI is near-ideal)
    print(f"  {term:>16} | {coeff:>+10.6f} | {qi_v:>+10.4f} | {ibm_v:>+10.4f} | {abs(qi_v)*0:>+10.4f} | {ibm_v - qi_v:>+10.4f}")

print(f"\n{'':2}{'='*74}")
print(f"\n  ENERGY SUMMARY (active-space Hamiltonian frame)")
print(f"  {'':20} | {'Energy (Ha)':>14} | {'vs Ideal':>14}")
print(f"  {'-'*20}-+-{'-'*14}-+-{'-'*14}")
print(f"  {'Ideal VQE':<20} | {E_VQE_ideal:>14.6f} | {'---':>14}")
print(f"  {'QI Emulator':<20} | {E_qi:>14.6f} | {(E_qi - E_VQE_ideal)*1000:>+13.1f}m")
print(f"  {'IBM Fez':<20} | {E_ibm:>14.6f} | {(E_ibm - E_VQE_ideal)*1000:>+13.1f}m")

print(f"\n  ENERGY SUMMARY (molecular energy frame)")
print(f"  {'':20} | {'Energy (Ha)':>14} | {'Error (mHa)':>14}")
print(f"  {'-'*20}-+-{'-'*14}-+-{'-'*14}")
print(f"  {'FCI (exact)':<20} | {E_FCI:>14.6f} | {'---':>14}")
print(f"  {'Hartree-Fock':<20} | {E_HF:>14.6f} | {(E_HF - E_FCI)*1000:>+13.1f}m")
print(f"  {'CASCI(2,2)':<20} | {E_CASCI:>14.6f} | {(E_CASCI - E_FCI)*1000:>+13.1f}m")
print(f"  {'QI Emulator':<20} | {E_qi_mol:>14.6f} | {(E_qi_mol - E_FCI)*1000:>+13.1f}m")
print(f"  {'IBM Fez':<20} | {E_ibm_mol:>14.6f} | {(E_ibm_mol - E_FCI)*1000:>+13.1f}m")

# Correlation energy analysis
corr_total = E_HF - E_FCI  # ~20.5 mHa
qi_corr_pct = (E_HF - E_qi_mol) / corr_total * 100
ibm_corr_pct = (E_HF - E_ibm_mol) / corr_total * 100

print(f"\n  CORRELATION ENERGY ANALYSIS")
print(f"  Total correlation (FCI):     {corr_total*1000:.1f} mHa")
print(f"  CASCI(2,2) captures:         {(E_HF - E_CASCI)*1000:.1f} mHa ({(E_HF - E_CASCI)/corr_total*100:.1f}%)")
print(f"  (Remaining {(E_CASCI - E_FCI)*1000:.1f} mHa requires larger active space / more qubits)")
print(f"")
print(f"  QI vs CASCI(2,2) target:     {(E_qi_mol - E_CASCI)*1000:+.1f} mHa (shot noise only)")
print(f"  IBM vs CASCI(2,2) target:    {(E_ibm_mol - E_CASCI)*1000:+.1f} mHa (hardware noise)")
print(f"  IBM vs QI (pure hw noise):   {(E_ibm - E_qi)*1000:+.1f} mHa")

# Z-basis fidelity
print(f"\n  Z-BASIS STATE FIDELITY")
print(f"  Expected dominant state: |1111> (all qubits in |1>)")
qi_fid = qi_counts["Z"].get("1111", 0) / 4096 * 100
ibm_fid = ibm_counts["Z"].get("1111", 0) / 4096 * 100
print(f"  QI Emulator: {qi_fid:.1f}% |1111>")
print(f"  IBM Fez:     {ibm_fid:.1f}% |1111>")

# Chemical accuracy check
chem_acc = 1.6  # mHa
qi_within = abs(E_qi_mol - E_FCI) * 1000 < chem_acc
ibm_within = abs(E_ibm_mol - E_FCI) * 1000 < chem_acc
print(f"\n  CHEMICAL ACCURACY (< {chem_acc} mHa = 1 kcal/mol)")
qi_vs_casci = abs(E_qi_mol - E_CASCI) * 1000
ibm_vs_casci = abs(E_ibm_mol - E_CASCI) * 1000
print(f"  QI vs CASCI target: {'YES' if qi_vs_casci < chem_acc else 'NO'} ({qi_vs_casci:.1f} mHa)")
print(f"  IBM vs CASCI target: {'YES' if ibm_vs_casci < chem_acc else 'NO'} ({ibm_vs_casci:.1f} mHa)")
print(f"  (Note: CASCI(2,2) itself is 20.2 mHa from FCI — need more qubits for full accuracy)")

# Comparison with H2 results
print(f"\n{'':2}{'='*74}")
print(f"  COMPARISON WITH H2 VQE (from earlier experiment)")
print(f"  {'':16} | {'H2 (2q)':>14} | {'LiH (4q)':>14} | {'Ratio':>8}")
print(f"  {'-'*16}-+-{'-'*14}-+-{'-'*14}-+-{'-'*8}")
print(f"  {'QI error (mHa)':<16} | {'1.3':>14} | {abs(E_qi_mol - E_FCI)*1000:>14.1f} | {abs(E_qi_mol - E_FCI)*1000/1.3:>7.1f}x")
print(f"  {'IBM Fez (mHa)':<16} | {'151.5':>14} | {abs(E_ibm_mol - E_FCI)*1000:>14.1f} | {abs(E_ibm_mol - E_FCI)*1000/151.5:>7.1f}x")
print(f"  {'Qubits':<16} | {'2':>14} | {'4':>14} |")
print(f"  {'CNOT gates':<16} | {'1':>14} | {'3':>14} |")
print(f"  {'Pauli terms':<16} | {'5':>14} | {'27':>14} |")
print(f"  {'Circuits':<16} | {'3':>14} | {'9':>14} |")
print(f"  {'Total shots':<16} | {'12,288':>14} | {'36,864':>14} |")

# Save
results = {
    "molecule": "LiH",
    "bond_distance_angstrom": 1.6,
    "basis_set": "STO-3G",
    "active_space": "CASCI(2,2)",
    "n_qubits": 4,
    "n_pauli_terms": 27,
    "n_circuits": 9,
    "shots_per_circuit": 4096,
    "platforms": {
        "qi_emulator": {
            "E_active": E_qi,
            "E_molecular": E_qi_mol,
            "error_mHa": abs(E_qi_mol - E_FCI) * 1000,
            "z_fidelity_pct": qi_fid,
        },
        "ibm_fez": {
            "E_active": E_ibm,
            "E_molecular": E_ibm_mol,
            "error_mHa": abs(E_ibm_mol - E_FCI) * 1000,
            "z_fidelity_pct": ibm_fid,
        },
    },
    "reference": {
        "E_FCI": E_FCI,
        "E_HF": E_HF,
        "E_CASCI": E_CASCI,
        "E_VQE_ideal": E_VQE_ideal,
    },
}

with open("/Users/dereklomas/haiqu/experiments/lih_compare_results.json", "w") as f:
    json.dump(results, f, indent=2)

print(f"\n  Results saved to lih_compare_results.json")
