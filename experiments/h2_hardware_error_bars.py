#!/usr/bin/env python3
"""Compute hardware error bars on existing H2 VQE results.

Uses raw measurement counts from IBM Torino and QI Tuna-9 (Sagastizabal 2-qubit H2).
Computes analytical shot noise + bootstrap resampling error bars.
"""

import json
import numpy as np
from pathlib import Path

RESULTS_DIR = Path(__file__).parent / "results"

# ── Hamiltonian: H2 at R=0.735 A, Sagastizabal sector-projected ──────

# H = g0*I + g1*Z0 + g2*Z1 + g3*Z0Z1 + g4*X0X1 + g5*Y0Y1
HAMILTONIAN = {
    "II": -0.321124,
    "ZI": 0.397937,
    "IZ": -0.397937,
    "ZZ": 0.0,
    "XX": 0.090466,
    "YY": 0.090466,
}
E_FCI = -1.1373060

# Map: measurement basis -> which Pauli terms it measures
BASIS_TERM_MAP = {
    "zz_basis": ["II", "ZI", "IZ", "ZZ"],
    "z_basis": ["II", "ZI", "IZ", "ZZ"],  # Tuna-9 variant
    "xx_basis": ["XX"],
    "x_basis": ["XX"],  # Tuna-9 variant
    "yy_basis": ["YY"],
    "y_basis": ["YY"],  # Tuna-9 variant
}


def parity_2q_ibm(bitstring, term):
    """Compute parity for 2-qubit IBM-convention bitstrings.

    IBM MSB-first: bitstring[0]=q1, bitstring[1]=q0
    Pauli label: position 0 = qubit 0, position 1 = qubit 1
    """
    n = len(bitstring)
    p = 0
    for i, ch in enumerate(term):
        if ch != "I":
            # qubit i -> bitstring[n-1-i]
            p ^= int(bitstring[n - 1 - i])
    return p


def parity_tuna9(bitstring, term, physical_qubits):
    """Compute parity for Tuna-9 bitstrings (9-char, MSB-first in result files).

    physical_qubits: [q0_phys, q1_phys] mapping logical to physical qubits.
    File convention is MSB-first: bitstring[0] = q_{n-1}, bitstring[n-1] = q_0.
    So qubit q is at bitstring[n-1-q].
    """
    n = len(bitstring)
    p = 0
    for i, ch in enumerate(term):
        if ch != "I":
            phys_q = physical_qubits[i]
            p ^= int(bitstring[n - 1 - phys_q])
    return p


def expectation(counts, term, convention, physical_qubits=None):
    """Compute <P> from measurement counts."""
    active = [i for i, ch in enumerate(term) if ch != "I"]
    if not active:
        return 1.0

    total = sum(counts.values())
    exp_val = 0.0
    for bs, count in counts.items():
        if convention == "ibm":
            p = parity_2q_ibm(bs, term)
        elif convention == "tuna9":
            p = parity_tuna9(bs, term, physical_qubits)
        else:
            raise ValueError(f"Unknown convention: {convention}")
        exp_val += count * ((-1) ** p)
    return exp_val / total


def compute_energy_and_errorbars(raw_counts, convention, physical_qubits=None, n_elec=1):
    """Compute energy with analytical + bootstrap error bars.

    For post-selection on Tuna-9: keep bitstrings with exactly n_elec 1s
    among the physical qubits.
    """
    energy = 0.0
    var_energy = 0.0

    details = []

    for basis, counts in raw_counts.items():
        terms = BASIS_TERM_MAP.get(basis, [])
        n_shots = sum(counts.values())

        for term in terms:
            coeff = HAMILTONIAN.get(term, 0.0)
            if term == "II":
                exp_val = 1.0
                term_var = 0.0
            else:
                exp_val = expectation(counts, term, convention, physical_qubits)
                term_var = coeff ** 2 * (1 - exp_val ** 2) / n_shots

            energy += coeff * exp_val
            var_energy += term_var
            details.append((term, coeff, exp_val, coeff * exp_val, term_var))

    sigma = var_energy ** 0.5

    # Post-selection (for Tuna-9: keep bitstrings with n_elec 1s on physical qubits)
    ps_energy = None
    ps_sigma = None
    ps_kept = None
    if convention == "tuna9" and physical_qubits is not None:
        ps_energy = 0.0
        var_ps = 0.0
        kept_fracs = []
        for basis, counts in raw_counts.items():
            terms = BASIS_TERM_MAP.get(basis, [])
            is_z_basis = basis in ("zz_basis", "z_basis")

            if is_z_basis:
                # Post-selection: keep bitstrings with exactly n_elec 1s
                # on physical qubits. Only meaningful in computational basis.
                ps_counts = {}
                for bs, c in counts.items():
                    n = len(bs)
                    n_ones = sum(int(bs[n - 1 - q]) for q in physical_qubits)
                    if n_ones == n_elec:
                        ps_counts[bs] = c
                kept = sum(ps_counts.values())
                total = sum(counts.values())
                kept_fracs.append(kept / total if total > 0 else 0)
            else:
                # X/Y bases: rotations before measurement scramble particle
                # number — use raw counts, no post-selection
                ps_counts = counts
                kept = sum(counts.values())

            for term in terms:
                coeff = HAMILTONIAN.get(term, 0.0)
                if term == "II":
                    ps_energy += coeff
                    var_ps += 0
                elif ps_counts and kept > 0:
                    ev = expectation(ps_counts, term, convention, physical_qubits)
                    ps_energy += coeff * ev
                    var_ps += coeff ** 2 * (1 - ev ** 2) / kept
                else:
                    var_ps += coeff ** 2

        ps_sigma = var_ps ** 0.5
        ps_kept = np.mean(kept_fracs) * 100 if kept_fracs else 0

    # Bootstrap resampling
    M = 2000
    rng = np.random.default_rng(42)
    boot_energies = []
    boot_ps_energies = []

    for _ in range(M):
        e_boot = 0.0
        e_ps = 0.0
        for basis, counts in raw_counts.items():
            terms = BASIS_TERM_MAP.get(basis, [])
            bitstrings = list(counts.keys())
            freqs = np.array([counts[bs] for bs in bitstrings], dtype=float)
            n = int(freqs.sum())
            probs = freqs / freqs.sum()
            resampled = rng.multinomial(n, probs)
            rc = {bs: int(c) for bs, c in zip(bitstrings, resampled) if c > 0}

            for term in terms:
                coeff = HAMILTONIAN.get(term, 0.0)
                if term == "II":
                    e_boot += coeff
                else:
                    e_boot += coeff * expectation(rc, term, convention, physical_qubits)

            # Post-selected bootstrap (Tuna-9 only)
            if convention == "tuna9" and physical_qubits is not None:
                is_z_basis = basis in ("zz_basis", "z_basis")
                if is_z_basis:
                    rc_ps = {}
                    for bs, c in rc.items():
                        nb = len(bs)
                        n_ones = sum(int(bs[nb - 1 - q]) for q in physical_qubits)
                        if n_ones == n_elec:
                            rc_ps[bs] = c
                else:
                    rc_ps = rc  # no post-selection for x/y bases
                for term in terms:
                    coeff = HAMILTONIAN.get(term, 0.0)
                    if term == "II":
                        e_ps += coeff
                    elif rc_ps and sum(rc_ps.values()) > 0:
                        e_ps += coeff * expectation(rc_ps, term, convention, physical_qubits)

        boot_energies.append(e_boot)
        if convention == "tuna9":
            boot_ps_energies.append(e_ps)

    boot_sigma = np.std(boot_energies)
    boot_ps_sigma = np.std(boot_ps_energies) if boot_ps_energies else None

    return {
        "energy": energy,
        "sigma_analytical": sigma,
        "sigma_bootstrap": boot_sigma,
        "ps_energy": ps_energy,
        "ps_sigma_analytical": ps_sigma,
        "ps_sigma_bootstrap": boot_ps_sigma,
        "ps_kept_pct": ps_kept,
        "details": details,
    }


def print_results(name, r):
    """Print formatted results."""
    error = abs(r["energy"] - E_FCI) * 1000
    print(f"\n{'=' * 64}")
    print(f"  {name}")
    print(f"{'=' * 64}")
    print(f"\n  Raw energy:        {r['energy']:.6f} Ha")
    print(f"  Error vs FCI:      {error:.1f} mHa")
    print(f"  Chemical accuracy: {'YES' if error < 1.6 else 'NO'}")

    print(f"\n  {'Error bar method':<28} | {'σ (mHa)':>10} | {'Error/σ':>10}")
    print(f"  {'-' * 28}-+-{'-' * 10}-+-{'-' * 10}")
    print(f"  {'Analytical shot noise':.<28} | {r['sigma_analytical'] * 1000:>10.2f} | {error / (r['sigma_analytical'] * 1000):>10.1f}σ")
    print(f"  {'Bootstrap (M=2000)':.<28} | {r['sigma_bootstrap'] * 1000:>10.2f} | {error / (r['sigma_bootstrap'] * 1000):>10.1f}σ")
    print(f"  {'Ratio boot/anal':.<28} | {r['sigma_bootstrap'] / r['sigma_analytical']:>10.3f} |")

    if r["ps_energy"] is not None:
        ps_error = abs(r["ps_energy"] - E_FCI) * 1000
        print(f"\n  Post-selected energy: {r['ps_energy']:.6f} Ha  (kept {r['ps_kept_pct']:.0f}%)")
        print(f"  Post-sel. error:     {ps_error:.1f} mHa")
        print(f"  PS chem. accuracy:   {'YES' if ps_error < 1.6 else 'NO'}")
        print(f"\n  {'PS analytical':.<28} | {r['ps_sigma_analytical'] * 1000:>10.2f} | {ps_error / (r['ps_sigma_analytical'] * 1000):>10.1f}σ")
        print(f"  {'PS bootstrap':.<28} | {r['ps_sigma_bootstrap'] * 1000:>10.2f} | {ps_error / (r['ps_sigma_bootstrap'] * 1000):>10.1f}σ")


def main():
    results = {}

    # ── IBM Torino (Sagastizabal) ────────────────────────────────────
    with open(RESULTS_DIR / "vqe-h2-sagastizabal-ibm.json") as f:
        ibm_data = json.load(f)
    r_torino = compute_energy_and_errorbars(ibm_data["raw_counts"], "ibm")
    print_results("IBM Torino — H2 VQE (2q Sagastizabal)", r_torino)
    results["ibm_torino"] = r_torino

    # ── IBM Marrakesh ────────────────────────────────────────────────
    with open(RESULTS_DIR / "vqe-equilibrium-001-ibm-marrakesh.json") as f:
        marr_data = json.load(f)
    r_marr = compute_energy_and_errorbars(marr_data["raw_counts"], "ibm")
    print_results("IBM Marrakesh — H2 VQE (2q Sagastizabal)", r_marr)
    results["ibm_marrakesh"] = r_marr

    # ── QI Tuna-9 ────────────────────────────────────────────────────
    with open(RESULTS_DIR / "vqe-h2-sagastizabal-tuna9-q68.json") as f:
        tuna_data = json.load(f)
    # Physical qubits: logical q0 → physical q6, logical q1 → physical q8
    r_tuna = compute_energy_and_errorbars(
        tuna_data["raw_counts"], "tuna9",
        physical_qubits=[6, 8], n_elec=1)
    print_results("QI Tuna-9 — H2 VQE (2q Sagastizabal, q6-q8)", r_tuna)
    results["tuna9"] = r_tuna

    # ── Summary table ────────────────────────────────────────────────
    print(f"\n{'=' * 64}")
    print(f"  HARDWARE ERROR BAR SUMMARY — H2 VQE (R=0.735 A)")
    print(f"{'=' * 64}")
    print(f"\n  FCI energy: {E_FCI:.6f} Ha")
    print(f"\n  {'Backend':<18} | {'E (Ha)':>10} | {'Err (mHa)':>10} | {'σ_boot':>8} | {'Err/σ':>6} | {'Chem.Acc':>8}")
    print(f"  {'-' * 18}-+-{'-' * 10}-+-{'-' * 10}-+-{'-' * 8}-+-{'-' * 6}-+-{'-' * 8}")
    for name, r in results.items():
        error = abs(r["energy"] - E_FCI) * 1000
        sigma = r["sigma_bootstrap"] * 1000
        ca = "YES" if error < 1.6 else "NO"
        print(f"  {name:<18} | {r['energy']:>10.6f} | {error:>10.1f} | {sigma:>8.2f} | {error / sigma:>6.1f}σ | {ca:>8}")

    if results.get("tuna9", {}).get("ps_energy") is not None:
        r = results["tuna9"]
        ps_error = abs(r["ps_energy"] - E_FCI) * 1000
        ps_sigma = r["ps_sigma_bootstrap"] * 1000
        ca = "YES" if ps_error < 1.6 else "NO"
        print(f"  {'tuna9 (PS)':<18} | {r['ps_energy']:>10.6f} | {ps_error:>10.1f} | {ps_sigma:>8.2f} | {ps_error / ps_sigma:>6.1f}σ | {ca:>8}")

    # Save results
    summary = {
        "experiment": "H2 VQE hardware error bars (2q Sagastizabal)",
        "E_FCI": E_FCI,
        "backends": {},
    }
    for name, r in results.items():
        error = abs(r["energy"] - E_FCI) * 1000
        entry = {
            "energy_Ha": float(r["energy"]),
            "error_mHa": float(error),
            "sigma_analytical_mHa": float(r["sigma_analytical"] * 1000),
            "sigma_bootstrap_mHa": float(r["sigma_bootstrap"] * 1000),
            "error_over_sigma": float(error / (r["sigma_bootstrap"] * 1000)),
            "chemical_accuracy": error < 1.6,
        }
        if r["ps_energy"] is not None:
            ps_error = abs(r["ps_energy"] - E_FCI) * 1000
            entry["ps_energy_Ha"] = float(r["ps_energy"])
            entry["ps_error_mHa"] = float(ps_error)
            entry["ps_sigma_analytical_mHa"] = float(r["ps_sigma_analytical"] * 1000)
            entry["ps_sigma_bootstrap_mHa"] = float(r["ps_sigma_bootstrap"] * 1000)
            entry["ps_kept_pct"] = float(r["ps_kept_pct"])
        summary["backends"][name] = entry

    out_file = RESULTS_DIR / "h2-vqe-hardware-error-bars.json"
    with open(out_file, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"\n  Saved: {out_file}")


if __name__ == "__main__":
    main()
