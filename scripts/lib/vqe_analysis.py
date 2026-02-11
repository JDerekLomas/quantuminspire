"""Shared VQE analysis utilities for H2 readout error mitigation.

Used by ibm_vqe_rem.py, iqm_vqe_rem.py, and tuna9_rem_reanalysis.py.
Platform-specific code (circuit building, job submission) stays in each script.
"""

import numpy as np

# ── H2 Hamiltonian (sector-projected, R=0.735 A, STO-3G) ───────────────────
H2_COEFFS = {
    "g0": -0.321124, "g1": 0.397937, "g2": -0.397937,
    "g3": 0.0, "g4": 0.090466, "g5": 0.090466,
}
H2_FCI = -1.137306
H2_ALPHA = -0.2234  # Optimal VQE angle
HA_TO_KCAL = 627.509


def extract_qubit_bits(bitstring: str, q0_idx: int, q1_idx: int) -> tuple[int, int]:
    """Extract qubit values from a bitstring.

    Args:
        bitstring: Measurement result string (e.g., "01", "10")
        q0_idx: Index of qubit 0 in the bitstring.
            IBM: -(q+1) from right. IQM/Tuna-9: q from left.
        q1_idx: Index of qubit 1 in the bitstring.
    """
    return int(bitstring[q0_idx]), int(bitstring[q1_idx])


def confusion_matrix_1q(
    counts_prep_0: dict, counts_prep_1: dict,
    qubit_char_idx: int
) -> np.ndarray:
    """Build 2x2 confusion matrix for one qubit.

    Args:
        counts_prep_0: Counts when qubit was prepared in |0>.
        counts_prep_1: Counts when qubit was prepared in |1>.
        qubit_char_idx: Character index in the bitstring for this qubit.
            IBM: -(q+1) from right. IQM: q from left.
    """
    total_0 = sum(counts_prep_0.values())
    total_1 = sum(counts_prep_1.values())

    p0_given_0 = sum(c for bs, c in counts_prep_0.items()
                     if bs[qubit_char_idx] == '0') / total_0
    p1_given_0 = 1 - p0_given_0
    p0_given_1 = sum(c for bs, c in counts_prep_1.items()
                     if bs[qubit_char_idx] == '0') / total_1
    p1_given_1 = 1 - p0_given_1

    return np.array([[p0_given_0, p0_given_1],
                     [p1_given_0, p1_given_1]])


def expectations_from_counts(
    counts: dict, q0_idx: int, q1_idx: int
) -> tuple[float, float, float]:
    """Compute <Z0>, <Z1>, <Z0Z1> from 2-qubit bitstring counts.

    Args:
        counts: Bitstring -> count mapping.
        q0_idx, q1_idx: Character indices for qubit 0 and 1.
    """
    total = sum(counts.values())
    z0, z1, z0z1 = 0.0, 0.0, 0.0
    for bs, c in counts.items():
        b0, b1 = extract_qubit_bits(bs, q0_idx, q1_idx)
        z0 += (1 - 2*b0) * c
        z1 += (1 - 2*b1) * c
        z0z1 += (1 - 2*b0) * (1 - 2*b1) * c
    return z0/total, z1/total, z0z1/total


def expectations_from_probs(
    probs: dict, q0_idx: int, q1_idx: int
) -> tuple[float, float, float]:
    """Compute <Z0>, <Z1>, <Z0Z1> from probability distribution."""
    z0 = sum((1 - 2*int(k[q0_idx])) * v for k, v in probs.items())
    z1 = sum((1 - 2*int(k[q1_idx])) * v for k, v in probs.items())
    z0z1 = sum((1 - 2*int(k[q0_idx])) * (1 - 2*int(k[q1_idx])) * v
               for k, v in probs.items())
    return z0, z1, z0z1


def apply_rem(counts: dict, M0_inv: np.ndarray, M1_inv: np.ndarray,
              kron_order: str = "q1_q0") -> dict:
    """Apply readout error mitigation via confusion matrix inversion.

    Args:
        counts: Bitstring -> count mapping.
        M0_inv, M1_inv: Inverse confusion matrices for qubit 0 and 1.
        kron_order: "q1_q0" for IBM (rightmost=q0), "q0_q1" for IQM/Tuna-9.
    """
    total = sum(counts.values())
    states = ["00", "01", "10", "11"]
    p = np.array([counts.get(s, 0) / total for s in states])

    if kron_order == "q1_q0":
        M_inv = np.kron(M1_inv, M0_inv)
    else:
        M_inv = np.kron(M0_inv, M1_inv)

    p_corr = M_inv @ p
    p_corr = np.maximum(p_corr, 0)
    if p_corr.sum() > 0:
        p_corr /= p_corr.sum()
    return {s: p_corr[i] for i, s in enumerate(states)}


def compute_h2_energy(
    exp_z0: float, exp_z1: float, exp_z0z1: float,
    exp_x0x1: float, exp_y0y1: float,
    coeffs: dict | None = None,
) -> float:
    """Compute H2 energy from expectation values.

    Args:
        coeffs: Dict with keys g0-g5. Defaults to H2_COEFFS.
    """
    c = coeffs or H2_COEFFS
    return (c["g0"] + c["g1"]*exp_z0 + c["g2"]*exp_z1 +
            c["g3"]*exp_z0z1 + c["g4"]*exp_x0x1 + c["g5"]*exp_y0y1)


def postselect_odd_parity(
    counts: dict, q0_idx: int, q1_idx: int
) -> tuple[dict, float]:
    """Filter counts to odd-parity states only.

    Returns:
        Filtered counts dict and keep fraction.
    """
    filtered = {bs: c for bs, c in counts.items()
                if (int(bs[q0_idx]) + int(bs[q1_idx])) % 2 == 1}
    total = sum(counts.values())
    keep = sum(filtered.values()) / total if total > 0 else 0
    return filtered, keep


def energy_error(energy: float, fci: float = H2_FCI) -> dict:
    """Compute error metrics for a VQE energy."""
    ha = abs(energy - fci)
    kcal = ha * HA_TO_KCAL
    return {
        "error_hartree": round(ha, 6),
        "error_kcal_mol": round(kcal, 2),
        "chemical_accuracy": kcal < 1.6,
    }
