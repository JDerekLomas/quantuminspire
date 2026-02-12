#!/usr/bin/env python3
"""Compare VQE results: IBM Fez vs IBM Torino (both corrected circuits)."""
import numpy as np

g0, g1, g2, g3, g4, g5 = -0.8692, 0.3435, -0.3435, 0.5596, 0.091, 0.091
a_opt = np.pi + np.arctan((g4 + g5) / (g1 - g2))
total = 4096

def pauli_from_counts(counts):
    p = {k: v/total for k, v in counts.items()}
    ZI = (p.get("00",0) + p.get("10",0)) - (p.get("01",0) + p.get("11",0))
    IZ = (p.get("00",0) + p.get("01",0)) - (p.get("10",0) + p.get("11",0))
    ZZ = (p.get("00",0) + p.get("11",0)) - (p.get("01",0) + p.get("10",0))
    return ZI, IZ, ZZ

def energy_from_hw(z_counts, x_counts, y_counts):
    ZI, IZ, ZZ = pauli_from_counts(z_counts)
    _, _, XX = pauli_from_counts(x_counts)
    _, _, YY = pauli_from_counts(y_counts)
    E = g0 + g1*ZI + g2*IZ + g3*ZZ + g4*XX + g5*YY
    return E, {"ZI": ZI, "IZ": IZ, "ZZ": ZZ, "XX": XX, "YY": YY}

# Ideal
ZI_id, IZ_id, ZZ_id = np.cos(a_opt), -np.cos(a_opt), -1.0
XX_id, YY_id = np.sin(a_opt), np.sin(a_opt)
E_ideal = g0 + g1*ZI_id + g2*IZ_id + g3*ZZ_id + g4*XX_id + g5*YY_id
E_hf = g0 + g1 - g2 - g3
ideal = {"ZI": ZI_id, "IZ": IZ_id, "ZZ": ZZ_id, "XX": XX_id, "YY": YY_id}

# IBM Fez (156-qubit Heron)
fez_E, fez_p = energy_from_hw(
    {"01": 3670, "11": 126, "00": 189, "10": 111},
    {"11": 616, "00": 873, "10": 1338, "01": 1269},
    {"00": 669, "10": 1492, "11": 849, "01": 1086},
)

# IBM Torino (133-qubit Heron)
tor_E, tor_p = energy_from_hw(
    {"01": 3114, "11": 366, "10": 316, "00": 300},
    {"01": 1226, "10": 1170, "11": 849, "00": 851},
    {"11": 890, "10": 1207, "01": 1198, "00": 801},
)

print("=" * 72)
print("  VQE H2 RESULTS: IBM FEZ vs IBM TORINO")
print("=" * 72)
print(f"\n  Backend       | Qubits | Chip    | Transpiled depth")
print(f"  ibm_fez       | 156    | Heron   | 9 gates")
print(f"  ibm_torino    | 133    | Heron   | 9 gates")

print(f"\n{'':2}{'':6} | {'Ideal':>10} | {'Fez':>10} | {'Torino':>10} | {'Fez err':>10} | {'Tor err':>10}")
print(f"  {'-'*6}-+-{'-'*10}-+-{'-'*10}-+-{'-'*10}-+-{'-'*10}-+-{'-'*10}")
for term in ["ZI", "IZ", "ZZ", "XX", "YY"]:
    i, f, t = ideal[term], fez_p[term], tor_p[term]
    print(f"  {term:>6} | {i:>+10.4f} | {f:>+10.4f} | {t:>+10.4f} | {f-i:>+10.4f} | {t-i:>+10.4f}")

print(f"\n  {'ENERGY':>6} | {E_ideal:>10.4f} | {fez_E:>10.4f} | {tor_E:>10.4f} | {(fez_E-E_ideal)*1000:>+9.1f}m | {(tor_E-E_ideal)*1000:>+9.1f}m")

corr_total = E_hf - E_ideal
fez_corr = (E_hf - fez_E) / corr_total * 100
tor_corr = (E_hf - tor_E) / corr_total * 100

print(f"\n  Hartree-Fock energy:          {E_hf:.4f} Ha")
print(f"  Exact (FCI) energy:           {E_ideal:.4f} Ha")
print(f"  Correlation energy:           {corr_total*1000:.1f} mHa")
print(f"\n  Fez:    {fez_E:.4f} Ha  ({fez_corr:.1f}% correlation captured, {abs(fez_E-E_ideal)*1000:.0f} mHa noise)")
print(f"  Torino: {tor_E:.4f} Ha  ({tor_corr:.1f}% correlation captured, {abs(tor_E-E_ideal)*1000:.0f} mHa noise)")

winner = "ibm_fez" if abs(fez_E - E_ideal) < abs(tor_E - E_ideal) else "ibm_torino"
print(f"\n  More accurate: {winner}")

print(f"\n  Z-basis histograms (dominant state should be |01> = 98.3%):")
print(f"    Fez:    |01>: 89.6%  |00>: 4.6%  |10>: 2.7%  |11>: 3.1%")
print(f"    Torino: |01>: {3114/4096*100:.1f}%  |00>: {300/4096*100:.1f}%  |10>: {316/4096*100:.1f}%  |11>: {366/4096*100:.1f}%")
print(f"    (Fez has less state leakage -> cleaner qubits)")
