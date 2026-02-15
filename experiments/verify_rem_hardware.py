"""Hardware verification of REM pipeline.

Compares fresh calibration data with original calibration,
then verifies VQE energy at R=0.735 using both old and new
confusion matrices.

Fresh jobs (2026-02-15 verification run):
  Cal |00⟩: 429925    Cal |10⟩: 429926
  Cal |01⟩: 429927    Cal |11⟩: 429928
  VQE Z:    429929    VQE X:    429930    VQE Y: 429931

Original jobs:
  Cal |00⟩: 429924    Cal |10⟩: 429921
  Cal |01⟩: 429922    Cal |11⟩: 429923
  VQE Z:    426705    VQE X:    426703    VQE Y: 426704
"""

import json
import numpy as np
from pathlib import Path

# Physical qubit positions in 9-bit MSB-first bitstring
Q0_POS = 4  # q4
Q1_POS = 2  # q6

# Hamiltonian coefficients for R=0.735
G0 = -0.32112409
G1 = 0.39793745
G4 = 0.0904656
FCI = -1.13730604


def extract_2q_probs(counts, pos0=Q0_POS, pos1=Q1_POS):
    """Extract 2-qubit probability vector from 9-bit counts."""
    total = sum(counts.values())
    probs = np.zeros(4)
    for bitstring, count in counts.items():
        b0 = int(bitstring[pos0])
        b1 = int(bitstring[pos1])
        idx = b0 * 2 + b1
        probs[idx] += count
    return probs / total


def build_confusion_matrix(cal_counts):
    """Build 4x4 joint confusion matrix. M[i,j] = P(measure i | prepared j)."""
    M = np.zeros((4, 4))
    prepared_states = ["00", "01", "10", "11"]
    for j, prep in enumerate(prepared_states):
        probs = extract_2q_probs(cal_counts[prep])
        M[:, j] = probs
    return M


def expval_from_probs(probs):
    """Compute Z0, Z1, Z0Z1 from 2-qubit probability vector."""
    z0 = (probs[0] + probs[1]) - (probs[2] + probs[3])
    z1 = (probs[0] + probs[2]) - (probs[1] + probs[3])
    zz = (probs[0] + probs[3]) - (probs[1] + probs[2])
    return z0, z1, zz


def compute_energy(z0, z1, xx, yy):
    """E = g0 + g1*(Z0 - Z1) + g4*(X0X1 + Y0Y1)"""
    return G0 + G1 * (z0 - z1) + G4 * (xx + yy)


def apply_rem_and_energy(counts_z, counts_x, counts_y, M_inv):
    """Full pipeline: extract probs → apply M_inv → compute energy."""
    raw_z = extract_2q_probs(counts_z)
    raw_x = extract_2q_probs(counts_x)
    raw_y = extract_2q_probs(counts_y)

    corr_z = np.maximum(M_inv @ raw_z, 0); corr_z /= corr_z.sum()
    corr_x = np.maximum(M_inv @ raw_x, 0); corr_x /= corr_x.sum()
    corr_y = np.maximum(M_inv @ raw_y, 0); corr_y /= corr_y.sum()

    z0, z1, z0z1 = expval_from_probs(corr_z)
    _, _, xx = expval_from_probs(corr_x)
    _, _, yy = expval_from_probs(corr_y)

    energy = compute_energy(z0, z1, xx, yy)
    raw_z0, raw_z1, raw_z0z1 = expval_from_probs(raw_z)
    _, _, raw_xx = expval_from_probs(raw_x)
    _, _, raw_yy = expval_from_probs(raw_y)
    raw_energy = compute_energy(raw_z0, raw_z1, raw_xx, raw_yy)

    return {
        "raw_energy": raw_energy,
        "rem_energy": energy,
        "raw_error_mHa": abs(raw_energy - FCI) * 1000,
        "rem_error_mHa": abs(energy - FCI) * 1000,
        "z0z1": z0z1,
        "raw_z0z1": raw_z0z1,
    }


# ── Load data ──────────────────────────────────────────────────

# New calibration (fresh hardware run)
new_cal = {
    "00": {"000000000": 3720, "000000001": 42, "000000010": 5, "000000100": 75, "000000101": 1, "000000110": 1, "000001000": 11, "000001100": 1, "000010000": 74, "000010100": 1, "000011000": 1, "000100000": 34, "000100001": 1, "000110000": 1, "001000000": 60, "001000100": 2, "001100000": 2, "010000000": 50, "010000100": 2, "010010000": 3, "011000000": 1, "100000000": 7, "101000000": 1},
    "10": {"000000000": 78, "000000001": 2, "000000100": 2, "000010000": 3698, "000010001": 49, "000010010": 11, "000010100": 71, "000010101": 1, "000010110": 2, "000011000": 12, "000011100": 1, "000100000": 2, "000110000": 40, "000110100": 1, "001000000": 2, "001010000": 67, "001010100": 2, "010000000": 1, "010010000": 38, "010010100": 2, "010110000": 1, "011010000": 1, "100010000": 12},
    "01": {"000000000": 79, "000000001": 1, "000000100": 3, "000010000": 2, "000100000": 1, "000101000": 1, "001000000": 3655, "001000001": 49, "001000010": 6, "001000011": 1, "001000100": 75, "001001000": 2, "001010000": 72, "001010001": 1, "001011000": 1, "001100000": 30, "010000000": 3, "011000000": 89, "011000001": 2, "011000010": 1, "011000100": 4, "011010000": 3, "011100000": 5, "100000000": 1, "101000000": 8, "101000001": 1},
    "11": {"000000000": 1, "000010000": 92, "000010001": 2, "000010100": 4, "000011000": 2, "001000000": 58, "001000001": 1, "001010000": 3652, "001010001": 41, "001010010": 4, "001010011": 2, "001010100": 67, "001011000": 14, "001100000": 1, "001110000": 25, "010010000": 3, "011000000": 3, "011010000": 110, "011010001": 1, "011010100": 3, "011110000": 4, "101010000": 5, "101010100": 1},
}

# New VQE R=0.735 (fresh hardware run)
new_vqe_z = {"000000000": 70, "000000010": 1, "000000100": 3, "000010000": 3660, "000010001": 45, "000010010": 10, "000010100": 74, "000010101": 1, "000011000": 8, "000011001": 1, "000100000": 1, "000110000": 30, "001000000": 70, "001000100": 1, "001001000": 1, "001010000": 49, "001010001": 1, "001010010": 1, "001010100": 2, "010010000": 49, "010010100": 2, "010110000": 1, "011010000": 1, "100010000": 13, "101000000": 1}
new_vqe_x = {"000000000": 767, "000000001": 9, "000000100": 23, "000000101": 1, "000001000": 1, "000010000": 1155, "000010001": 19, "000010010": 1, "000010100": 34, "000011000": 4, "000011100": 1, "000100000": 4, "000100010": 1, "000110000": 14, "000110001": 1, "001000000": 1107, "001000001": 7, "001000010": 2, "001000100": 30, "001001000": 3, "001001100": 1, "001010000": 792, "001010001": 9, "001010010": 1, "001010100": 13, "001011000": 3, "001100000": 10, "001110000": 4, "001110100": 1, "010000000": 16, "010000100": 1, "010010000": 14, "010110000": 1, "011000000": 20, "011000100": 1, "011010000": 14, "011010100": 1, "100000000": 2, "100010000": 6, "101000000": 1, "101010000": 1}
new_vqe_y = {"000000000": 785, "000000001": 8, "000000010": 2, "000000100": 24, "000000101": 1, "000001000": 1, "000010000": 1159, "000010001": 15, "000010010": 5, "000010100": 18, "000010101": 1, "000011000": 2, "000100000": 6, "000110000": 11, "001000000": 1136, "001000001": 16, "001000010": 1, "001000100": 24, "001010000": 744, "001010001": 14, "001010100": 22, "001100000": 9, "001110000": 10, "010000000": 20, "010000100": 1, "010010000": 20, "010100000": 1, "011000000": 16, "011010000": 16, "100000000": 3, "100010000": 3, "101010000": 2}

# Old calibration
old_cal_file = Path("experiments/results/readout-cal-q4q6-counts.json")
with open(old_cal_file) as f:
    old_cal = json.load(f)

# Old VQE R=0.735 (from raw counts)
old_vqe_file = Path("experiments/results/h2-2qubit-tuna9-raw-counts-v3.json")
with open(old_vqe_file) as f:
    old_vqe_all = json.load(f)
old_vqe_z = old_vqe_all["426705"]  # Z-basis for R=0.735
old_vqe_x = old_vqe_all["426703"]  # X-basis
old_vqe_y = old_vqe_all["426704"]  # Y-basis


# ── Analysis ───────────────────────────────────────────────────

print("=" * 80)
print("HARDWARE VERIFICATION: REM PIPELINE")
print("=" * 80)

# 1. Compare confusion matrices
print("\n1. CONFUSION MATRIX COMPARISON")
print("-" * 60)

M_old = build_confusion_matrix(old_cal)
M_new = build_confusion_matrix(new_cal)

labels = ["00", "01", "10", "11"]
print(f"\n{'':>14} {'|00⟩':>8} {'|01⟩':>8} {'|10⟩':>8} {'|11⟩':>8}")
print("OLD confusion matrix:")
for i, label in enumerate(labels):
    row = "  ".join(f"{M_old[i,j]:.4f}" for j in range(4))
    print(f"  P({label}|prep):  {row}")
print("NEW confusion matrix:")
for i, label in enumerate(labels):
    row = "  ".join(f"{M_new[i,j]:.4f}" for j in range(4))
    print(f"  P({label}|prep):  {row}")
print("DIFFERENCE (new - old):")
diff = M_new - M_old
for i, label in enumerate(labels):
    row = "  ".join(f"{diff[i,j]:+.4f}" for j in range(4))
    print(f"  P({label}|prep):  {row}")

max_diff = np.max(np.abs(diff))
print(f"\nMax element-wise difference: {max_diff:.4f}")
print(f"Frobenius norm of difference: {np.linalg.norm(diff, 'fro'):.4f}")

# Per-qubit readout errors
def per_qubit_errors(M):
    e0_01 = M[2, 0] + M[3, 0]  # P(q4=1 | q4 prepared 0)
    e0_10 = M[0, 2] + M[1, 2]  # P(q4=0 | q4 prepared 1)
    e1_01 = M[1, 0] + M[3, 0]  # P(q6=1 | q6 prepared 0)
    e1_10 = M[0, 1] + M[2, 1]  # P(q6=0 | q6 prepared 1)
    return e0_01, e0_10, e1_01, e1_10

old_errs = per_qubit_errors(M_old)
new_errs = per_qubit_errors(M_new)
print(f"\nPer-qubit readout errors:")
print(f"  q4 P(1|0): OLD={old_errs[0]:.4f}  NEW={new_errs[0]:.4f}  diff={new_errs[0]-old_errs[0]:+.4f}")
print(f"  q4 P(0|1): OLD={old_errs[1]:.4f}  NEW={new_errs[1]:.4f}  diff={new_errs[1]-old_errs[1]:+.4f}")
print(f"  q6 P(1|0): OLD={old_errs[2]:.4f}  NEW={new_errs[2]:.4f}  diff={new_errs[2]-old_errs[2]:+.4f}")
print(f"  q6 P(0|1): OLD={old_errs[3]:.4f}  NEW={new_errs[3]:.4f}  diff={new_errs[3]-old_errs[3]:+.4f}")

cond_old = np.linalg.cond(M_old)
cond_new = np.linalg.cond(M_new)
print(f"\nCondition number: OLD={cond_old:.2f}  NEW={cond_new:.2f}")

# 2. Cross-validation: apply all 4 combinations
print("\n\n2. CROSS-VALIDATION: R=0.735 Å  (FCI = -1.13730604 Ha)")
print("-" * 60)

M_inv_old = np.linalg.inv(M_old)
M_inv_new = np.linalg.inv(M_new)

# 4 combinations: (old/new cal) × (old/new VQE data)
combos = [
    ("Old cal × Old VQE", M_inv_old, old_vqe_z, old_vqe_x, old_vqe_y),
    ("Old cal × New VQE", M_inv_old, new_vqe_z, new_vqe_x, new_vqe_y),
    ("New cal × Old VQE", M_inv_new, old_vqe_z, old_vqe_x, old_vqe_y),
    ("New cal × New VQE", M_inv_new, new_vqe_z, new_vqe_x, new_vqe_y),
]

print(f"\n{'Combination':>25} {'Raw (mHa)':>10} {'REM (mHa)':>10} {'Z0Z1':>8} {'REM Z0Z1':>9}")
results = []
for name, M_inv, cz, cx, cy in combos:
    r = apply_rem_and_energy(cz, cx, cy, M_inv)
    results.append((name, r))
    print(f"  {name:>23}: {r['raw_error_mHa']:>8.1f}   {r['rem_error_mHa']:>8.1f}   "
          f"{r['raw_z0z1']:>+.4f}  {r['z0z1']:>+.4f}")

# 3. Compare with stored result
print("\n\n3. COMPARISON WITH STORED RESULT")
print("-" * 60)

stored_file = Path("experiments/results/h2-2qubit-vqe-tuna9-rem-analysis.json")
with open(stored_file) as f:
    stored = json.load(f)

# Find R=0.735 in stored results
stored_r0735 = next(r for r in stored["results"] if r["bond_distance"] == 0.735)
print(f"  Stored REM energy:  {stored_r0735['rem_energy']:.8f} Ha ({stored_r0735['rem_error_mHa']:.1f} mHa)")
print(f"  Stored raw energy:  {stored_r0735['raw_energy']:.8f} Ha ({stored_r0735['raw_error_mHa']:.1f} mHa)")

# Old cal × Old VQE should reproduce stored result exactly
reproduced = results[0][1]
print(f"  Reproduced REM:     {reproduced['rem_energy']:.8f} Ha ({reproduced['rem_error_mHa']:.1f} mHa)")
match = abs(reproduced['rem_energy'] - stored_r0735['rem_energy']) < 1e-6
print(f"  Exact match: {'YES' if match else 'NO'}")

# 4. Raw data sanity checks
print("\n\n4. RAW DATA SANITY CHECKS")
print("-" * 60)

# Z-basis: should be mostly |10⟩ (q4=1, q6=0) with small |01⟩
for name, counts_z in [("Old Z", old_vqe_z), ("New Z", new_vqe_z)]:
    p = extract_2q_probs(counts_z)
    print(f"  {name}: P(00)={p[0]:.4f} P(01)={p[1]:.4f} P(10)={p[2]:.4f} P(11)={p[3]:.4f}")
    print(f"    Expected: ~0 / ~0.012 / ~0.988 / ~0")
    dominant = "10" if p[2] > 0.9 else "WRONG"
    print(f"    Dominant state: {dominant} {'✓' if dominant == '10' else '✗'}")

# X-basis: XX correlator should be ≈ sin(α) = sin(-0.2234) ≈ -0.222
for name, counts_x in [("Old X", old_vqe_x), ("New X", new_vqe_x)]:
    p = extract_2q_probs(counts_x)
    _, _, xx = expval_from_probs(p)
    print(f"  {name}: XX={xx:.4f} (expected ≈ -0.222)")

# Y-basis: YY correlator should be ≈ sin(α) ≈ -0.222
for name, counts_y in [("Old Y", old_vqe_y), ("New Y", new_vqe_y)]:
    p = extract_2q_probs(counts_y)
    _, _, yy = expval_from_probs(p)
    print(f"  {name}: YY={yy:.4f} (expected ≈ -0.222)")

# 5. Summary
print("\n\n5. VERIFICATION SUMMARY")
print("=" * 60)
old_old = results[0][1]
new_new = results[3][1]
print(f"  Original run (old cal × old data):")
print(f"    Raw: {old_old['raw_error_mHa']:.1f} mHa → REM: {old_old['rem_error_mHa']:.1f} mHa")
print(f"  Fresh run (new cal × new data):")
print(f"    Raw: {new_new['raw_error_mHa']:.1f} mHa → REM: {new_new['rem_error_mHa']:.1f} mHa")
delta = abs(old_old['rem_error_mHa'] - new_new['rem_error_mHa'])
print(f"  REM error difference: {delta:.1f} mHa")
print(f"  Bootstrap σ from original: {stored_r0735['rem_sigma_mHa']:.1f} mHa")
within_sigma = delta < 2 * stored_r0735['rem_sigma_mHa']
print(f"  Within 2σ: {'YES' if within_sigma else 'NO'} (Δ={delta:.1f} vs 2σ={2*stored_r0735['rem_sigma_mHa']:.1f})")

conf_stable = max_diff < 0.01
print(f"  Confusion matrix stable: {'YES' if conf_stable else 'NO'} (max Δ={max_diff:.4f})")

all_pass = match and within_sigma and conf_stable
print(f"\n  OVERALL: {'PASS ✓' if all_pass else 'NEEDS REVIEW'}")
