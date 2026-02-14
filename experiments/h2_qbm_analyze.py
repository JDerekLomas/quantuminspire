#!/usr/bin/env python3
"""
Analyze QBM hardware results from IBM Fez and QI Tuna-9.
Reads job IDs, fetches results, computes energies, compares with exact.
"""
import json
import numpy as np

# H2 Hamiltonian coefficients
COEFFS = {
    'II': -0.8692, 'ZI': 0.3435, 'IZ': -0.3435,
    'ZZ':  0.5596, 'XX': 0.0910, 'YY':  0.0910,
}

# Hardware job IDs
IBM_JOBS = {
    'T0.1_Z': 'd67123gqbmes739epltg',
    'T0.1_X': 'd67124dbujdc73cvbc50',
    'T0.1_Y': 'd671258qbmes739epm0g',
    'T0.5_Z': 'd671269v6o8c73d4sgu0',
    'T0.5_X': 'd671279v6o8c73d4sgvg',
    'T0.5_Y': 'd671283e4kfs73d1a290',
    'T2.0_Z': 'd67129dbujdc73cvbcbg',
    'T2.0_X': 'd6712a9v6o8c73d4sh5g',
    'T2.0_Y': 'd6712bhv6o8c73d4sh70',
}

QI_JOBS = {
    'T0.1_Z': 423552,
    'T0.1_X': 423553,
    'T0.1_Y': 423554,
    'T0.5_Z': 423555,
    'T0.5_X': 423556,
    'T0.5_Y': 423557,
    'T2.0_Z': 423558,
    'T2.0_X': 423559,
    'T2.0_Y': 423560,
}

# Exact energies at each temperature (from QBM classical simulation)
EXACT = {
    '0.1': -2.139498,
    '0.5': -1.979994,
    '2.0': -1.195405,
}


def pauli_expect(counts, q0_pauli, q1_pauli):
    """
    Compute Pauli expectation from 4-qubit measurement counts.
    System qubits: q0, q1 (traced over ancilla q2, q3).
    Bitstring MSB-first: str[0]=q3, str[1]=q2, str[2]=q1, str[3]=q0.
    """
    total = sum(counts.values())
    val = 0
    for bs, n in counts.items():
        q0 = int(bs[-1])   # q0 is last char (LSB)
        q1 = int(bs[-2])   # q1 is second to last
        sign = 1
        if q0_pauli == 'Z': sign *= (-1)**q0
        if q1_pauli == 'Z': sign *= (-1)**q1
        val += sign * n
    return val / total


def energy_from_counts(z_counts, x_counts, y_counts):
    """Reconstruct <H> from Z, X, Y basis measurement counts."""
    E = COEFFS['II']
    E += COEFFS['ZI'] * pauli_expect(z_counts, 'Z', 'I')
    E += COEFFS['IZ'] * pauli_expect(z_counts, 'I', 'Z')
    E += COEFFS['ZZ'] * pauli_expect(z_counts, 'Z', 'Z')
    E += COEFFS['XX'] * pauli_expect(x_counts, 'Z', 'Z')
    E += COEFFS['YY'] * pauli_expect(y_counts, 'Z', 'Z')
    return E


def analyze_results(results_dict, label):
    """Analyze results for one backend (IBM or QI)."""
    print(f"\n{'='*55}")
    print(f"  {label}")
    print(f"{'='*55}")
    print(f"  {'T':>5} {'Measured U':>12} {'Exact U':>10} {'ΔU mHa':>10}")
    print("  " + "-" * 42)

    energies = {}
    for T_str in ['0.1', '0.5', '2.0']:
        z_key = f'T{T_str}_Z'
        x_key = f'T{T_str}_X'
        y_key = f'T{T_str}_Y'

        if z_key not in results_dict or x_key not in results_dict or y_key not in results_dict:
            print(f"  {T_str:>5}  [missing results]")
            continue

        E = energy_from_counts(results_dict[z_key], results_dict[x_key], results_dict[y_key])
        exact = EXACT[T_str]
        delta = abs(E - exact) * 1000
        energies[T_str] = E
        print(f"  {T_str:>5} {E:>12.6f} {exact:>10.6f} {delta:>10.1f}")

    return energies


if __name__ == '__main__':
    # This script is meant to be run after fetching results.
    # Usage: populate ibm_results and qi_results dicts, then call analyze_results.
    print("QBM Hardware Analysis")
    print("Paste fetched results into this script or import and call analyze_results().")
    print()
    print("IBM Fez job IDs:")
    for k, v in IBM_JOBS.items():
        print(f"  {k}: {v}")
    print()
    print("QI Tuna-9 job IDs:")
    for k, v in QI_JOBS.items():
        print(f"  {k}: {v}")
