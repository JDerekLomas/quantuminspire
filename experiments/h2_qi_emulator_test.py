#!/usr/bin/env python3
"""Quick test: run H2 VQE circuits on QI local emulator and compute energy.

Reads circuits from h2_replication_output.json, runs all 5 measurement
circuits, reconstructs energy from shot statistics.
"""
import json
import numpy as np
import qxelarator

# Load circuits and Hamiltonian data
with open("/Users/dereklomas/haiqu/experiments/h2_replication_output.json") as f:
    data = json.load(f)

circuits_qi = data["circuits_qi"]
term_map = data["circuit_term_map"]

# Find equilibrium data (R=0.735)
eq = next(r for r in data["pes_data"] if r["R"] == 0.735)
pauli_terms = eq["pauli_terms"]
E_FCI = eq["E_FCI"]
E_VQE = eq["E_VQE"]

SHOTS = 8192

print("=" * 60)
print("  H2 VQE — QI Emulator Test (R=0.735 A)")
print("=" * 60)

# Run each circuit
all_counts = {}
for name, circuit in circuits_qi.items():
    result = qxelarator.execute_string(circuit, iterations=SHOTS)
    counts = result.results
    all_counts[name] = counts
    total = sum(counts.values())
    top3 = sorted(counts.items(), key=lambda x: -x[1])[:3]
    print(f"\n  {name}: {total} shots")
    for bs, c in top3:
        print(f"    {bs}: {c} ({c/total*100:.1f}%)")


def parity(bitstring, qubit_indices):
    """Compute parity of specified qubits in bitstring.

    Pauli labels use OpenFermion convention: position i = OpenFermion qubit i.
    OpenFermion qubit 0 = MSB of state vector = bitstring[0] in MSB-first.
    So bitstring[q] extracts OpenFermion qubit q directly.
    """
    p = 0
    for q in qubit_indices:
        p ^= int(bitstring[q])
    return p


def expectation_from_counts(counts, pauli_label):
    """Compute <P> from measurement counts.

    For Z-type measurements: eigenvalue = (-1)^parity of measured qubits.
    For X/Y measurements: same, after basis rotation (already in circuit).
    """
    n_qubits = len(pauli_label)
    # Which qubits are non-identity?
    active_qubits = [i for i, p in enumerate(pauli_label) if p != "I"]

    if not active_qubits:  # Identity
        return 1.0

    total = sum(counts.values())
    exp_val = 0.0
    for bs, count in counts.items():
        p = parity(bs, active_qubits)
        exp_val += count * ((-1) ** p)
    return exp_val / total


# Compute energy
print("\n" + "=" * 60)
print("  ENERGY RECONSTRUCTION")
print("=" * 60)

energy = 0.0
var_energy = 0.0  # analytical shot noise variance
print(f"\n  {'Term':>16} | {'Coeff':>10} | {'<P>':>10} | {'Contrib':>10} | {'sigma':>8}")
print(f"  {'-'*16}-+-{'-'*10}-+-{'-'*10}-+-{'-'*10}-+-{'-'*8}")

for circuit_name, terms in term_map.items():
    counts = all_counts[circuit_name]
    n_shots = sum(counts.values())
    for term_label in terms:
        coeff = pauli_terms[term_label]
        if term_label == "I" * 4:
            exp_val = 1.0
            term_var = 0.0
        else:
            exp_val = expectation_from_counts(counts, term_label)
            # Var(<P>) = (1 - <P>^2) / N, Var(c*<P>) = c^2 * Var(<P>)
            term_var = coeff**2 * (1 - exp_val**2) / n_shots
        contrib = coeff * exp_val
        energy += contrib
        var_energy += term_var
        if abs(coeff) > 0.01:  # Only print significant terms
            print(f"  {term_label:>16} | {coeff:>+10.6f} | {exp_val:>+10.4f} | {contrib:>+10.6f} | {term_var**0.5 * 1000:>7.2f}")

sigma_energy = var_energy**0.5

print(f"\n  Emulator energy: {energy:.6f} +/- {sigma_energy:.6f} Ha")
print(f"  Ideal VQE:       {E_VQE:.6f} Ha")
print(f"  Exact FCI:       {E_FCI:.6f} Ha")
print(f"  Emulator error:  {abs(energy - E_FCI) * 1000:.1f} mHa")
print(f"  Shot noise (1σ): {sigma_energy * 1000:.1f} mHa")
print(f"  Error / sigma:   {abs(energy - E_FCI) / sigma_energy:.1f}σ")

# Post-selection
print("\n  --- With post-selection (N=2 only) ---")
energy_ps = 0.0
var_ps = 0.0
for circuit_name, terms in term_map.items():
    counts = all_counts[circuit_name]
    # Keep only bitstrings with exactly 2 ones
    ps_counts = {bs: c for bs, c in counts.items() if bs.count("1") == 2}
    n_ps = sum(ps_counts.values()) if ps_counts else 0
    for term_label in terms:
        coeff = pauli_terms[term_label]
        if term_label == "I" * 4:
            exp_val = 1.0
            term_var = 0.0
        elif ps_counts and n_ps > 0:
            exp_val = expectation_from_counts(ps_counts, term_label)
            term_var = coeff**2 * (1 - exp_val**2) / n_ps
        else:
            exp_val = 0
            term_var = coeff**2  # maximal uncertainty
        energy_ps += coeff * exp_val
        var_ps += term_var

sigma_ps = var_ps**0.5
print(f"  Post-selected energy: {energy_ps:.6f} +/- {sigma_ps:.6f} Ha")
print(f"  Post-selected error:  {abs(energy_ps - E_FCI) * 1000:.1f} mHa")
print(f"  Shot noise (1σ):      {sigma_ps * 1000:.1f} mHa")

# Bootstrap resampling — model-free cross-check of analytical error bars
print("\n" + "=" * 60)
print("  BOOTSTRAP RESAMPLING (M=1000)")
print("=" * 60)

M_BOOT = 1000
n_qubits = 4
rng = np.random.default_rng(42)

boot_energies = []
boot_ps_energies = []
for _ in range(M_BOOT):
    e_boot = 0.0
    e_ps_boot = 0.0
    for circuit_name, terms in term_map.items():
        counts = all_counts[circuit_name]
        bitstrings = list(counts.keys())
        freqs = np.array([counts[bs] for bs in bitstrings], dtype=float)
        n = int(freqs.sum())
        probs = freqs / freqs.sum()
        resampled = rng.multinomial(n, probs)
        rc = {bs: int(c) for bs, c in zip(bitstrings, resampled) if c > 0}
        # Post-selected resample
        rc_ps = {bs: c for bs, c in rc.items() if bs.count("1") == 2}
        n_ps = sum(rc_ps.values()) if rc_ps else 0
        for term_label in terms:
            coeff = pauli_terms[term_label]
            if term_label == "I" * n_qubits:
                e_boot += coeff
                e_ps_boot += coeff
            else:
                e_boot += coeff * expectation_from_counts(rc, term_label)
                if rc_ps and n_ps > 0:
                    e_ps_boot += coeff * expectation_from_counts(rc_ps, term_label)
    boot_energies.append(e_boot)
    boot_ps_energies.append(e_ps_boot)

boot_sigma = np.std(boot_energies)
boot_ps_sigma = np.std(boot_ps_energies)

print(f"\n  {'Method':<22} | {'σ (mHa)':>10} | {'σ (Ha)':>12}")
print(f"  {'-'*22}-+-{'-'*10}-+-{'-'*12}")
print(f"  {'Analytical':.<22} | {sigma_energy*1000:>10.2f} | {sigma_energy:>12.6f}")
print(f"  {'Bootstrap (M=1000)':.<22} | {boot_sigma*1000:>10.2f} | {boot_sigma:>12.6f}")
print(f"  {'Ratio (boot/anal)':.<22} | {boot_sigma/sigma_energy:>10.3f} |")
print(f"\n  Post-selection:")
print(f"  {'Analytical':.<22} | {sigma_ps*1000:>10.2f} | {sigma_ps:>12.6f}")
print(f"  {'Bootstrap (M=1000)':.<22} | {boot_ps_sigma*1000:>10.2f} | {boot_ps_sigma:>12.6f}")
print(f"  {'Ratio (boot/anal)':.<22} | {boot_ps_sigma/sigma_ps:>10.3f} |")
