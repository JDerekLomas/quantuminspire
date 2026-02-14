#!/usr/bin/env python3
"""H2 4-qubit VQE energy from Tuna-9 hardware or emulator.

Handles the 9-qubit physical qubit mapping correctly:
  label_position q → logical qubit (3-q) → physical qubit qmap[3-q]
  → bitstring position depends on convention (LSB-first for QI, MSB-first for IBM)

Usage:
    .venv/bin/python experiments/h2_tuna9_energy.py --emulator   # verify on emulator
    .venv/bin/python experiments/h2_tuna9_energy.py --hardware    # compute from hardware results
"""

import json
import sys
import numpy as np
from pathlib import Path

# ── Config ─────────────────────────────────────────────────────────────────

RESULTS_DIR = Path(__file__).parent / "results"
N_LOGICAL = 4
N_PHYSICAL = 9
QMAP = {0: 2, 1: 4, 2: 6, 3: 8}  # logical → physical

# Load Hamiltonian
with open(Path(__file__).parent / "h2_replication_output.json") as f:
    _data = json.load(f)
_eq = next(r for r in _data["pes_data"] if r["R"] == 0.735)
PAULI_TERMS = _eq["pauli_terms"]
CIRCUIT_TERM_MAP = _data["circuit_term_map"]
E_FCI = _eq["E_FCI"]
E_VQE = _eq["E_VQE"]


def parity_qi(bitstring_9q, qubit_indices):
    """Parity for QI/qxelarator MSB-first 9-qubit bitstrings.

    QI/qxelarator convention: MSB-first (bitstring[0] = q_{n-1}).
    OpenFermion kron: label position q acts on logical qubit (n_logical-1-q).
    Physical mapping: logical k → physical qmap[k].
    MSB-first position: phys_q → bitstring[n_physical-1-phys_q].
    """
    p = 0
    for q in qubit_indices:
        logical_q = N_LOGICAL - 1 - q  # label position → logical qubit
        phys_q = QMAP[logical_q]
        pos = N_PHYSICAL - 1 - phys_q  # MSB-first: qubit phys_q at position (8-phys_q)
        p ^= int(bitstring_9q[pos])
    return p


def expectation_qi(counts, pauli_label):
    """Compute <P> from QI measurement counts (LSB-first bitstrings)."""
    active_qubits = [i for i, p in enumerate(pauli_label) if p != "I"]
    if not active_qubits:
        return 1.0
    total = sum(counts.values())
    exp_val = 0.0
    for bs, count in counts.items():
        p = parity_qi(bs, active_qubits)
        exp_val += count * ((-1) ** p)
    return exp_val / total


def compute_energy(all_counts, post_select=False, n_elec=2):
    """Compute VQE energy from measurement counts."""
    energy = 0.0
    var_energy = 0.0

    for circuit_name, terms in CIRCUIT_TERM_MAP.items():
        counts = all_counts.get(circuit_name)
        if counts is None:
            print(f"  WARNING: missing counts for {circuit_name}")
            continue
        n_shots = sum(counts.values())
        for term_label in terms:
            coeff = PAULI_TERMS[term_label]
            if term_label == "I" * N_LOGICAL:
                exp_val = 1.0
                term_var = 0.0
            else:
                exp_val = expectation_qi(counts, term_label)
                term_var = coeff ** 2 * (1 - exp_val ** 2) / n_shots
            energy += coeff * exp_val
            var_energy += term_var

    sigma = var_energy ** 0.5

    if not post_select:
        return energy, sigma

    # Post-selection: keep bitstrings with exactly n_elec ones
    # on the LOGICAL qubits only (MSB-first positions)
    logical_positions = [N_PHYSICAL - 1 - QMAP[k] for k in range(N_LOGICAL)]

    ps_energy = 0.0
    var_ps = 0.0
    kept_fracs = []

    for circuit_name, terms in CIRCUIT_TERM_MAP.items():
        counts = all_counts.get(circuit_name, {})
        # Only post-select Z-basis measurements
        if circuit_name != "Z":
            for term_label in terms:
                coeff = PAULI_TERMS[term_label]
                if term_label == "I" * N_LOGICAL:
                    ps_energy += coeff
                else:
                    n_shots = sum(counts.values())
                    exp_val = expectation_qi(counts, term_label)
                    tv = coeff ** 2 * (1 - exp_val ** 2) / n_shots if n_shots > 0 else coeff ** 2
                    ps_energy += coeff * exp_val
                    var_ps += tv
            continue

        # Z-basis: post-select on logical qubit electron count
        ps_counts = {}
        for bs, c in counts.items():
            n_ones = sum(int(bs[pos]) for pos in logical_positions)
            if n_ones == n_elec:
                ps_counts[bs] = c

        kept = sum(ps_counts.values())
        total = sum(counts.values())
        kept_fracs.append(kept / total if total > 0 else 0)

        for term_label in terms:
            coeff = PAULI_TERMS[term_label]
            if term_label == "I" * N_LOGICAL:
                ps_energy += coeff
                # no variance for identity
            elif ps_counts and kept > 0:
                exp_val = expectation_qi(ps_counts, term_label)
                tv = coeff ** 2 * (1 - exp_val ** 2) / kept
                ps_energy += coeff * exp_val
                var_ps += tv
            else:
                ps_energy += 0.0
                var_ps += coeff ** 2

    sigma_ps = var_ps ** 0.5
    avg_kept = np.mean(kept_fracs) * 100 if kept_fracs else 0
    return energy, sigma, ps_energy, sigma_ps, avg_kept


def bootstrap_energy(all_counts, n_elec=2, M=1000, seed=42):
    """Bootstrap resampling for energy uncertainty."""
    rng = np.random.default_rng(seed)
    logical_positions = [N_PHYSICAL - 1 - QMAP[k] for k in range(N_LOGICAL)]
    boot_energies = []
    boot_ps_energies = []

    for _ in range(M):
        e_boot = 0.0
        e_ps = 0.0
        for circuit_name, terms in CIRCUIT_TERM_MAP.items():
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
                coeff = PAULI_TERMS[term_label]
                if term_label == "I" * N_LOGICAL:
                    e_boot += coeff
                    e_ps += coeff
                else:
                    e_boot += coeff * expectation_qi(rc, term_label)

            # Post-selection for Z-basis only
            if circuit_name == "Z":
                rc_ps = {bs: c for bs, c in rc.items()
                         if sum(int(bs[pos]) for pos in logical_positions) == n_elec}
                n_ps = sum(rc_ps.values()) if rc_ps else 0
                for term_label in terms:
                    coeff = PAULI_TERMS[term_label]
                    if term_label == "I" * N_LOGICAL:
                        pass  # already added
                    elif rc_ps and n_ps > 0:
                        e_ps += coeff * expectation_qi(rc_ps, term_label)
            else:
                for term_label in terms:
                    coeff = PAULI_TERMS[term_label]
                    if term_label == "I" * N_LOGICAL:
                        pass  # already added
                    else:
                        e_ps += coeff * expectation_qi(rc, term_label)

        boot_energies.append(e_boot)
        boot_ps_energies.append(e_ps)

    return np.std(boot_energies), np.std(boot_ps_energies)


def run_emulator(circuit_file, n_shots=100000):
    """Run all circuits on qxelarator emulator and return counts."""
    import qxelarator

    with open(circuit_file) as f:
        data = json.load(f)

    all_counts = {}
    for name, circuit in data["circuits"].items():
        result = qxelarator.execute_string(circuit, iterations=n_shots)
        if hasattr(result, 'results'):
            all_counts[name] = result.results
            total = sum(result.results.values())
            top3 = sorted(result.results.items(), key=lambda x: -x[1])[:3]
            print(f"  {name}: {total} shots, top: {', '.join(f'{bs}={c}' for bs, c in top3)}")
        else:
            print(f"  {name}: FAILED - {result}")
            return None

    return all_counts


def print_results(label, all_counts, post_select=True):
    """Compute and print energy results."""
    if post_select:
        energy, sigma, ps_energy, sigma_ps, avg_kept = compute_energy(
            all_counts, post_select=True)
    else:
        energy, sigma = compute_energy(all_counts, post_select=False)

    error = abs(energy - E_FCI) * 1000
    print(f"\n{'=' * 60}")
    print(f"  {label}")
    print(f"{'=' * 60}")
    print(f"  Raw energy:     {energy:.6f} Ha")
    print(f"  Exact FCI:      {E_FCI:.6f} Ha")
    print(f"  Ideal VQE:      {E_VQE:.6f} Ha")
    print(f"  Raw error:      {error:.2f} mHa")
    print(f"  Analytical σ:   {sigma * 1000:.2f} mHa")
    print(f"  Chem. accuracy: {'YES' if error < 1.6 else 'NO'}")

    if post_select:
        ps_error = abs(ps_energy - E_FCI) * 1000
        print(f"\n  Post-selected:  {ps_energy:.6f} Ha")
        print(f"  PS error:       {ps_error:.2f} mHa")
        print(f"  PS σ:           {sigma_ps * 1000:.2f} mHa")
        print(f"  PS kept:        {avg_kept:.1f}%")
        print(f"  PS chem. acc.:  {'YES' if ps_error < 1.6 else 'NO'}")

        # Bootstrap
        sigma_boot, sigma_ps_boot = bootstrap_energy(all_counts, M=1000)
        print(f"\n  Bootstrap σ:    {sigma_boot * 1000:.2f} mHa")
        print(f"  PS boot σ:      {sigma_ps_boot * 1000:.2f} mHa")

        return {
            "energy": float(energy),
            "error_mHa": float(error),
            "sigma_mHa": float(sigma * 1000),
            "ps_energy": float(ps_energy),
            "ps_error_mHa": float(ps_error),
            "ps_sigma_mHa": float(sigma_ps * 1000),
            "ps_kept_pct": float(avg_kept),
            "sigma_boot_mHa": float(sigma_boot * 1000),
            "ps_sigma_boot_mHa": float(sigma_ps_boot * 1000),
            "chemical_accuracy": ps_error < 1.6,
        }
    else:
        return {
            "energy": float(energy),
            "error_mHa": float(error),
            "sigma_mHa": float(sigma * 1000),
            "chemical_accuracy": error < 1.6,
        }


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "--emulator"

    if mode == "--emulator":
        # Test both circuit sets on emulator
        for label, filename in [
            ("Ry-based circuits", "h2-4qubit-tuna9-circuits.json"),
            ("Ry-free circuits (H+Rz decomp)", "h2-4qubit-tuna9-circuits-nory.json"),
        ]:
            circuit_file = RESULTS_DIR / filename
            if not circuit_file.exists():
                print(f"  Skipping {filename}: not found")
                continue
            print(f"\n--- Running {label} on emulator ---")
            counts = run_emulator(circuit_file, n_shots=100000)
            if counts:
                print_results(f"{label} — Emulator (100K shots)", counts)

    elif mode == "--hardware":
        # Load hardware results
        for backend_name in ["tuna9"]:
            counts_file = RESULTS_DIR / f"h2-4qubit-vqe-{backend_name}.json"
            if not counts_file.exists():
                print(f"  No results file: {counts_file}")
                continue
            with open(counts_file) as f:
                all_counts = json.load(f)
            result = print_results(f"H2 VQE — {backend_name} hardware", all_counts)
            # Save summary
            summary = {
                "experiment": "H2 4-qubit VQE on Tuna-9",
                "R_angstrom": 0.735,
                "E_FCI": E_FCI,
                "E_VQE_ideal": E_VQE,
                "n_qubits_logical": N_LOGICAL,
                "n_qubits_physical": N_PHYSICAL,
                "qubit_map": QMAP,
                "backend": backend_name,
                **result,
            }
            out = RESULTS_DIR / f"h2-4qubit-vqe-{backend_name}-summary.json"
            with open(out, "w") as f:
                json.dump(summary, f, indent=2)
            print(f"\n  Summary saved: {out}")

    else:
        print(f"Usage: {sys.argv[0]} [--emulator | --hardware]")


if __name__ == "__main__":
    main()
