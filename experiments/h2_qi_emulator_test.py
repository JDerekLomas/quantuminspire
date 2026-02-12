#!/usr/bin/env python3
"""Quick test: run H2 VQE circuits on QI local emulator and compute energy.

Reads circuits from h2_replication_output.json, runs all 5 measurement
circuits, reconstructs energy from shot statistics.
"""
import json
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

    QI/qxelarator convention (LSB-first): "abcd" where a=q0, b=q1, c=q2, d=q3.
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
print(f"\n  {'Term':>16} | {'Coeff':>10} | {'<P>':>10} | {'Contrib':>10}")
print(f"  {'-'*16}-+-{'-'*10}-+-{'-'*10}-+-{'-'*10}")

for circuit_name, terms in term_map.items():
    counts = all_counts[circuit_name]
    for term_label in terms:
        coeff = pauli_terms[term_label]
        if term_label == "I" * 4:
            exp_val = 1.0
        else:
            exp_val = expectation_from_counts(counts, term_label)
        contrib = coeff * exp_val
        energy += contrib
        if abs(coeff) > 0.01:  # Only print significant terms
            print(f"  {term_label:>16} | {coeff:>+10.6f} | {exp_val:>+10.4f} | {contrib:>+10.6f}")

print(f"\n  Emulator energy: {energy:.6f} Ha")
print(f"  Ideal VQE:       {E_VQE:.6f} Ha")
print(f"  Exact FCI:       {E_FCI:.6f} Ha")
print(f"  Emulator error:  {abs(energy - E_FCI) * 1000:.1f} mHa")
print(f"  Shot noise:      ~{1/SHOTS**0.5 * 1000:.1f} mHa (statistical)")

# Post-selection
print("\n  --- With post-selection (N=2 only) ---")
energy_ps = 0.0
for circuit_name, terms in term_map.items():
    counts = all_counts[circuit_name]
    # Keep only bitstrings with exactly 2 ones
    ps_counts = {bs: c for bs, c in counts.items() if bs.count("1") == 2}
    kept = sum(ps_counts.values())
    total = sum(counts.values())
    for term_label in terms:
        coeff = pauli_terms[term_label]
        if term_label == "I" * 4:
            exp_val = 1.0
        else:
            exp_val = expectation_from_counts(ps_counts, term_label) if ps_counts else 0
        energy_ps += coeff * exp_val

print(f"  Post-selected energy: {energy_ps:.6f} Ha")
print(f"  Post-selected error:  {abs(energy_ps - E_FCI) * 1000:.1f} mHa")
