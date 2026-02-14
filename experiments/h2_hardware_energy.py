#!/usr/bin/env python3
"""Reconstruct H2 VQE energy from IBM Quantum hardware measurement results.

Fetches results for submitted jobs, computes energy with analytical and
bootstrap error bars. Handles IBM's MSB-first bitstring convention.

Usage:
    .venv/bin/python experiments/h2_hardware_energy.py
"""

import json
import sys
import numpy as np
from pathlib import Path

# ── Job IDs ──────────────────────────────────────────────────────────────

BACKENDS = {
    "ibm_fez": {
        "Z": "d67rmt3e4kfs73d2baug",
        "q0Y_q1X_q2X_q3Y": "d67rmtre4kfs73d2bavg",
        "q0Y_q1Y_q2X_q3X": "d67rmutbujdc73d0bsf0",
        "q0X_q1X_q2Y_q3Y": "d67rmvlbujdc73d0bsg0",
        "q0X_q1Y_q2Y_q3X": "d67rn0gqbmes739fqcqg",
    },
    "ibm_torino": {
        "Z": "d67rcr9v6o8c73d5u1pg",
        "q0Y_q1X_q2X_q3Y": "d67rcroqbmes739fq0kg",
        "q0Y_q1Y_q2X_q3X": "d67rcsdbujdc73d0bgcg",
        "q0X_q1X_q2Y_q3Y": "d67rcthv6o8c73d5u1v0",
        "q0X_q1Y_q2Y_q3X": "d67rcube4kfs73d2auig",
    },
    "ibm_marrakesh": {
        "Z": "d67ri99v6o8c73d5u8u0",
        "q0Y_q1X_q2X_q3Y": "d67ria5bujdc73d0bn5g",
        "q0Y_q1Y_q2X_q3X": "d67rib1v6o8c73d5u910",
        "q0X_q1X_q2Y_q3Y": "d67ric1v6o8c73d5u92g",
        "q0X_q1Y_q2Y_q3X": "d67ricpv6o8c73d5u940",
    },
}

# ── H2 Hamiltonian at R=0.735 A ─────────────────────────────────────────

with open(Path(__file__).parent / "h2_replication_output.json") as f:
    _data = json.load(f)
_eq = next(r for r in _data["pes_data"] if r["R"] == 0.735)

PAULI_TERMS = _eq["pauli_terms"]
CIRCUIT_TERM_MAP = _data["circuit_term_map"]
E_FCI = _eq["E_FCI"]
E_VQE = _eq["E_VQE"]
N_QUBITS = 4
N_ELEC = 2  # for post-selection


def parity_ibm(bitstring, qubit_indices, n_qubits):
    """Compute parity of specified qubits from MSB-first bitstring.

    OpenFermion kron convention: label position 0 = MSB of state index.
    MSB-first bitstring: bitstring[0] = MSB of state index.
    So label position i → bitstring[i] (direct mapping).

    This works for both IBM and QI/qxelarator, since both return MSB-first.
    """
    p = 0
    for q in qubit_indices:
        p ^= int(bitstring[q])
    return p


def expectation_ibm(counts, pauli_label, n_qubits):
    """Compute <P> from IBM measurement counts."""
    active_qubits = [i for i, p in enumerate(pauli_label) if p != "I"]
    if not active_qubits:
        return 1.0
    total = sum(counts.values())
    exp_val = 0.0
    for bs, count in counts.items():
        p = parity_ibm(bs, active_qubits, n_qubits)
        exp_val += count * ((-1) ** p)
    return exp_val / total


def compute_energy(all_counts, pauli_terms, circuit_term_map, n_qubits,
                   n_elec=None, post_select=False):
    """Compute VQE energy from measurement counts.

    Returns (energy, sigma_analytical, ps_energy, ps_sigma) if post_select,
    else (energy, sigma_analytical).
    """
    energy = 0.0
    var_energy = 0.0

    for circuit_name, terms in circuit_term_map.items():
        counts = all_counts.get(circuit_name)
        if counts is None:
            print(f"  WARNING: missing counts for circuit {circuit_name}")
            continue
        n_shots = sum(counts.values())
        for term_label in terms:
            coeff = pauli_terms[term_label]
            if term_label == "I" * n_qubits:
                exp_val = 1.0
                term_var = 0.0
            else:
                exp_val = expectation_ibm(counts, term_label, n_qubits)
                term_var = coeff ** 2 * (1 - exp_val ** 2) / n_shots
            energy += coeff * exp_val
            var_energy += term_var

    sigma = var_energy ** 0.5

    if not post_select or n_elec is None:
        return energy, sigma

    # Post-selection: keep bitstrings with exactly n_elec ones
    ps_energy = 0.0
    var_ps = 0.0
    kept_fracs = []
    for circuit_name, terms in circuit_term_map.items():
        counts = all_counts.get(circuit_name, {})
        ps_counts = {bs: c for bs, c in counts.items()
                     if bs.count("1") == n_elec}
        kept = sum(ps_counts.values())
        total = sum(counts.values())
        kept_fracs.append(kept / total if total > 0 else 0)
        for term_label in terms:
            coeff = pauli_terms[term_label]
            if term_label == "I" * n_qubits:
                exp_val = 1.0
                tv = 0.0
            elif ps_counts and kept > 0:
                exp_val = expectation_ibm(ps_counts, term_label, n_qubits)
                tv = coeff ** 2 * (1 - exp_val ** 2) / kept
            else:
                exp_val = 0.0
                tv = coeff ** 2
            ps_energy += coeff * exp_val
            var_ps += tv

    sigma_ps = var_ps ** 0.5
    avg_kept = np.mean(kept_fracs) * 100
    return energy, sigma, ps_energy, sigma_ps, avg_kept


def bootstrap_energy(all_counts, pauli_terms, circuit_term_map, n_qubits,
                     n_elec=None, M=1000, seed=42):
    """Bootstrap resampling for energy uncertainty."""
    rng = np.random.default_rng(seed)
    boot_energies = []
    boot_ps_energies = []

    for _ in range(M):
        e_boot = 0.0
        e_ps = 0.0
        for circuit_name, terms in circuit_term_map.items():
            counts = all_counts.get(circuit_name, {})
            if not counts:
                continue
            bitstrings = list(counts.keys())
            freqs = np.array([counts[bs] for bs in bitstrings], dtype=float)
            n = int(freqs.sum())
            probs = freqs / freqs.sum()
            resampled = rng.multinomial(n, probs)
            rc = {bs: int(c) for bs, c in zip(bitstrings, resampled) if c > 0}

            for term_label in terms:
                coeff = pauli_terms[term_label]
                if term_label == "I" * n_qubits:
                    e_boot += coeff
                    e_ps += coeff
                else:
                    e_boot += coeff * expectation_ibm(rc, term_label, n_qubits)

            if n_elec is not None:
                rc_ps = {bs: c for bs, c in rc.items()
                         if bs.count("1") == n_elec}
                n_ps = sum(rc_ps.values()) if rc_ps else 0
                for term_label in terms:
                    coeff = pauli_terms[term_label]
                    if term_label == "I" * n_qubits:
                        pass  # already added
                    elif rc_ps and n_ps > 0:
                        e_ps += coeff * expectation_ibm(rc_ps, term_label, n_qubits)

        boot_energies.append(e_boot)
        if n_elec is not None:
            boot_ps_energies.append(e_ps)

    sigma_boot = np.std(boot_energies)
    sigma_ps_boot = np.std(boot_ps_energies) if boot_ps_energies else None
    return sigma_boot, sigma_ps_boot


def process_backend(backend_name, counts_file):
    """Process results for one backend."""
    with open(counts_file) as f:
        all_counts = json.load(f)

    print(f"\n{'=' * 64}")
    print(f"  H2 VQE — {backend_name} (R=0.735 A)")
    print(f"{'=' * 64}")

    # Show shot counts and top bitstrings
    for circ_name in CIRCUIT_TERM_MAP:
        counts = all_counts.get(circ_name, {})
        total = sum(counts.values())
        top3 = sorted(counts.items(), key=lambda x: -x[1])[:3]
        print(f"\n  {circ_name}: {total} shots")
        for bs, c in top3:
            print(f"    {bs}: {c} ({c / total * 100:.1f}%)")

    # Energy reconstruction
    energy, sigma, ps_energy, sigma_ps, avg_kept = compute_energy(
        all_counts, PAULI_TERMS, CIRCUIT_TERM_MAP, N_QUBITS,
        n_elec=N_ELEC, post_select=True)

    # Bootstrap
    sigma_boot, sigma_ps_boot = bootstrap_energy(
        all_counts, PAULI_TERMS, CIRCUIT_TERM_MAP, N_QUBITS,
        n_elec=N_ELEC, M=1000)

    error = abs(energy - E_FCI) * 1000
    ps_error = abs(ps_energy - E_FCI) * 1000

    print(f"\n{'=' * 64}")
    print(f"  ENERGY RESULTS — {backend_name}")
    print(f"{'=' * 64}")
    print(f"\n  Raw energy:         {energy:.6f} Ha")
    print(f"  Post-selected:      {ps_energy:.6f} Ha  (kept {avg_kept:.0f}%)")
    print(f"  Ideal VQE:          {E_VQE:.6f} Ha")
    print(f"  Exact FCI:          {E_FCI:.6f} Ha")
    print(f"\n  Raw error:          {error:.1f} mHa")
    print(f"  Post-sel. error:    {ps_error:.1f} mHa")
    print(f"  Chemical accuracy:  {'YES' if ps_error < 1.6 else 'NO'}")

    print(f"\n  {'Method':<28} | {'Raw σ (mHa)':>12} | {'PS σ (mHa)':>12}")
    print(f"  {'-' * 28}-+-{'-' * 12}-+-{'-' * 12}")
    print(f"  {'Analytical':.<28} | {sigma * 1000:>12.2f} | {sigma_ps * 1000:>12.2f}")
    print(f"  {'Bootstrap (M=1000)':.<28} | {sigma_boot * 1000:>12.2f} | {sigma_ps_boot * 1000:>12.2f}")
    print(f"  {'Raw error / boot σ':.<28} | {error / (sigma_boot * 1000):>12.1f}σ |")
    print(f"  {'PS error / boot σ':.<28} | {'':>12} | {ps_error / (sigma_ps_boot * 1000):>12.1f}σ")

    return {
        "backend": backend_name,
        "energy": float(energy),
        "error_mHa": float(error),
        "sigma_analytical_mHa": float(sigma * 1000),
        "sigma_bootstrap_mHa": float(sigma_boot * 1000),
        "ps_energy": float(ps_energy),
        "ps_error_mHa": float(ps_error),
        "ps_sigma_analytical_mHa": float(sigma_ps * 1000),
        "ps_sigma_bootstrap_mHa": float(sigma_ps_boot * 1000),
        "ps_kept_pct": float(avg_kept),
        "chemical_accuracy": ps_error < 1.6,
    }


def main():
    results_dir = Path(__file__).parent / "results"

    # Look for hardware count files
    backends_found = []
    for backend_name in BACKENDS:
        counts_file = results_dir / f"h2-vqe-hardware-{backend_name}.json"
        if counts_file.exists():
            backends_found.append((backend_name, counts_file))
        else:
            print(f"  [{backend_name}] No results file yet: {counts_file}")

    if not backends_found:
        print("\nNo hardware results available yet.")
        print("Use the MCP tools to fetch completed IBM job results,")
        print("then save counts as experiments/results/h2-vqe-hardware-<backend>.json")
        print("Format: {\"Z\": {\"0000\": 1234, ...}, \"q0Y_q1X_q2X_q3Y\": {...}, ...}")
        sys.exit(0)

    all_results = []
    for backend_name, counts_file in backends_found:
        result = process_backend(backend_name, counts_file)
        all_results.append(result)

    # Summary comparison
    if len(all_results) > 1:
        print(f"\n{'=' * 64}")
        print(f"  CROSS-BACKEND COMPARISON")
        print(f"{'=' * 64}")
        print(f"\n  {'Backend':<18} | {'Raw (mHa)':>10} | {'PS (mHa)':>10} | {'Boot σ':>8} | {'Chem.Acc.':>9}")
        print(f"  {'-' * 18}-+-{'-' * 10}-+-{'-' * 10}-+-{'-' * 8}-+-{'-' * 9}")
        for r in all_results:
            print(f"  {r['backend']:<18} | {r['error_mHa']:>10.1f} | {r['ps_error_mHa']:>10.1f} | {r['ps_sigma_bootstrap_mHa']:>8.2f} | {'YES' if r['chemical_accuracy'] else 'NO':>9}")

    # Save summary
    summary_file = results_dir / "h2-vqe-hardware-summary.json"
    with open(summary_file, "w") as f:
        json.dump({
            "experiment": "H2 VQE hardware error bars",
            "R_angstrom": 0.735,
            "E_FCI": E_FCI,
            "E_VQE_ideal": E_VQE,
            "backends": all_results,
        }, f, indent=2)
    print(f"\n  Summary saved: {summary_file}")


if __name__ == "__main__":
    main()
