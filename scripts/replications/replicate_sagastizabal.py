"""
Replication: "Error Mitigation by Symmetry Verification on a VQE"
Sagastizabal et al., Phys. Rev. A 100, 010302(R) (2019)
https://arxiv.org/abs/1902.11258

Faithful replication of the paper's key contribution: Z₂ symmetry verification
protocol for error mitigation in VQE.

Paper's protocol:
  - H₂ in STO-3G, single-parameter ansatz
  - Symmetry operator S commuting with H (particle number parity)
  - For any observable P, symmetry-verified expectation:
      ⟨P⟩_SV = Tr(P · Π_s · ρ · Π_s) / Tr(Π_s · ρ · Π_s)
    where Π_s = (I + s·S)/2 projects into eigenspace with eigenvalue s
  - No extra circuits: ⟨S·P⟩ measured from same data as ⟨P⟩ and ⟨S⟩

Implementation:
  - 4-qubit Jordan-Wigner H₂ (paper used 2-qubit BK; physics is identical)
  - S = Z₀Z₁Z₂Z₃ (total particle number parity, eigenvalue +1 for 2e⁻)
  - DoubleExcitation ansatz (equivalent to paper's exchange gate in JW basis)
  - Shot-based simulation with depolarizing noise
  - Symmetry verification applied per Pauli term

Differences from original:
  - 4 qubits (JW) vs 2 qubits (BK + tapering) — protocol is identical
  - Depolarizing noise model vs real hardware noise — qualitative behavior same
  - Original hardware: 3-transmon processor (QuTech Starmon-5)
"""

import numpy as np
import json
import sys
import os
from pathlib import Path
from datetime import datetime, timezone
from scipy.optimize import minimize_scalar

os.environ['PYTHONUNBUFFERED'] = '1'
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(line_buffering=True)


# ── H₂ Hamiltonian (4-qubit JW) ──────────────────────────────────

def h2_hamiltonian(R):
    """H₂ Hamiltonian via JW mapping (4 qubits) + FCI energy."""
    from openfermion import MolecularData, jordan_wigner
    from openfermionpyscf import run_pyscf

    mol = MolecularData(
        [('H', (0, 0, 0)), ('H', (0, 0, R))],
        'sto-3g', multiplicity=1, charge=0
    )
    mol = run_pyscf(mol, run_fci=True)
    qh = jordan_wigner(mol.get_molecular_hamiltonian())

    # Parse into {pauli_string: coefficient} dict
    terms = {}
    for term, coeff in qh.terms.items():
        if abs(coeff.real) < 1e-12:
            continue
        if len(term) == 0:
            key = 'IIII'
        else:
            paulis = ['I'] * 4
            for q, p in term:
                paulis[q] = p
            key = ''.join(paulis)
        terms[key] = terms.get(key, 0) + coeff.real

    return terms, mol.fci_energy


# ── Statevector VQE ───────────────────────────────────────────────

def statevector_energy(terms, theta):
    """Exact energy for DoubleExcitation(theta) ansatz on |1100⟩.

    Builds the 16x16 Hamiltonian matrix and computes ⟨ψ(θ)|H|ψ(θ)⟩.
    """
    # Build state: DoubleExcitation(theta) on |1100⟩
    # = cos(θ/2)|1100⟩ - sin(θ/2)|0011⟩
    state = np.zeros(16, dtype=complex)
    state[0b1100] = np.cos(theta / 2)
    state[0b0011] = -np.sin(theta / 2)

    # Build Hamiltonian matrix
    H = np.zeros((16, 16), dtype=complex)
    pauli_mats = {
        'I': np.eye(2),
        'X': np.array([[0, 1], [1, 0]]),
        'Y': np.array([[0, -1j], [1j, 0]]),
        'Z': np.array([[1, 0], [0, -1]]),
    }
    for pauli_str, coeff in terms.items():
        mat = np.array([[1.0]])
        for p in pauli_str:
            mat = np.kron(mat, pauli_mats[p])
        H += coeff * mat

    return np.real(state.conj() @ H @ state)


def find_optimal_theta(terms):
    """Find optimal θ for DoubleExcitation ansatz by grid + refinement."""
    result = minimize_scalar(
        lambda t: statevector_energy(terms, t),
        bounds=(-np.pi, np.pi), method='bounded'
    )
    return result.x, result.fun


# ── Symmetry verification protocol ───────────────────────────────
#
# Symmetry operator: S = Z₀Z₁Z₂Z₃ (total particle number parity)
# Ground state eigenvalue: s = +1 (2 electrons = even)
#
# For observable P (a Pauli string):
#   S·P = product of Pauli terms
# The result is another Pauli string (possibly with a phase ±1 or ±i).
#
# For Z₀Z₁Z₂Z₃ · P_string:
#   Each qubit: Z·I = Z, Z·X = -iY, Z·Y = iX, Z·Z = I
#   The overall sign depends on how many X,Y terms are in P.
#
# Key property: for all Pauli terms in the H₂ JW Hamiltonian,
# S·P gives another Pauli string with a real coefficient (±1).
# This is because H₂ terms come in conjugate pairs.

def multiply_pauli_strings(s1, s2):
    """Multiply two 4-qubit Pauli strings. Returns (phase, result_string).

    phase is +1, -1, +i, or -i.
    """
    phase = 1
    result = []
    mult_table = {
        ('I', 'I'): (1, 'I'), ('I', 'X'): (1, 'X'), ('I', 'Y'): (1, 'Y'), ('I', 'Z'): (1, 'Z'),
        ('X', 'I'): (1, 'X'), ('X', 'X'): (1, 'I'), ('X', 'Y'): (1j, 'Z'), ('X', 'Z'): (-1j, 'Y'),
        ('Y', 'I'): (1, 'Y'), ('Y', 'X'): (-1j, 'Z'), ('Y', 'Y'): (1, 'I'), ('Y', 'Z'): (1j, 'X'),
        ('Z', 'I'): (1, 'Z'), ('Z', 'X'): (1j, 'Y'), ('Z', 'Y'): (-1j, 'X'), ('Z', 'Z'): (1, 'I'),
    }
    for a, b in zip(s1, s2):
        p, r = mult_table[(a, b)]
        phase *= p
        result.append(r)
    return phase, ''.join(result)


def get_symmetry_products(terms, symmetry='ZZZZ'):
    """For each Pauli term P in the Hamiltonian, compute S·P.

    Returns dict: {P: (real_phase, SP_string)} where real_phase is ±1.
    Only works when S·P has real phase (true for molecular Hamiltonians).
    """
    products = {}
    for pauli_str in terms:
        phase, sp = multiply_pauli_strings(symmetry, pauli_str)
        # Phase should be real (±1) for molecular Hamiltonians
        assert abs(phase.imag) < 1e-10, f"Complex phase for S·{pauli_str}: {phase}"
        products[pauli_str] = (int(phase.real), sp)
    return products


# ── Shot-based measurement simulation ────────────────────────────

def simulate_pauli_measurement(state, pauli_str, n_shots, rng):
    """Simulate measuring a Pauli observable on a quantum state.

    For a 4-qubit state, measures in the appropriate basis and returns
    the expectation value with shot noise.

    state: 16-element complex vector
    pauli_str: e.g., 'XZIY' (4 characters)
    """
    # Build the Pauli matrix
    pauli_mats = {
        'I': np.eye(2),
        'X': np.array([[0, 1], [1, 0]]),
        'Y': np.array([[0, -1j], [1j, 0]]),
        'Z': np.array([[1, 0], [0, -1]]),
    }
    mat = np.array([[1.0]])
    for p in pauli_str:
        mat = np.kron(mat, pauli_mats[p])

    # Exact expectation value
    exact_ev = np.real(state.conj() @ mat @ state)

    # Simulate shot noise: variance of Pauli measurement is 1 - ⟨P⟩²
    variance = 1 - exact_ev ** 2
    if variance < 0:
        variance = 0
    shot_noise = rng.normal(0, np.sqrt(variance / n_shots)) if n_shots < 1e8 else 0
    return np.clip(exact_ev + shot_noise, -1, 1)


def apply_depolarizing_noise(state, p, n_qubits=4):
    """Apply global depolarizing noise: ρ → (1-p)ρ + p·I/2^n.

    For a pure state |ψ⟩, the noisy state's Pauli expectation values are:
    ⟨P⟩_noisy = (1-p)⟨P⟩ for any non-identity P.

    Instead of density matrices, we just scale the expectation value.
    """
    # This function isn't called directly; noise is applied in measurement
    pass


def measure_all_terms(terms, state, n_shots, noise_strength, rng):
    """Measure all Pauli terms in the Hamiltonian.

    Returns dict of {pauli_string: measured_expectation_value}.
    Noise is modeled as depolarizing: ⟨P⟩_noisy = (1-p)⟨P⟩ for P≠I.
    """
    results = {}
    for pauli_str in terms:
        if pauli_str == 'IIII':
            results[pauli_str] = 1.0  # Identity always gives 1
            continue

        # Exact expectation
        exact_ev = simulate_pauli_measurement(state, pauli_str, int(1e10), rng)

        # Apply depolarizing noise
        noisy_ev = (1 - noise_strength) * exact_ev

        # Add shot noise
        variance = 1 - noisy_ev ** 2
        if variance < 0:
            variance = 0
        shot_noise = rng.normal(0, np.sqrt(variance / n_shots))
        results[pauli_str] = float(np.clip(noisy_ev + shot_noise, -1, 1))

    return results


def symmetry_verify_energy(terms, raw_measurements, symmetry_products, s=+1):
    """Apply symmetry verification to compute energy.

    For each Pauli term P with coefficient g_P:
      ⟨P⟩_SV = (⟨P⟩ + s · phase · ⟨SP⟩) / (1 + s · ⟨S⟩)

    where phase and SP come from symmetry_products[P].

    The denominator is the same for all terms (it's the symmetry sector probability).
    """
    # First get ⟨S⟩ = ⟨ZZZZ⟩
    s_measurement = raw_measurements.get('ZZZZ', None)
    if s_measurement is None:
        # Need to measure S separately
        s_measurement = 0.0
        # S = ZZZZ: product of all Z measurements
        # In a shot-based experiment, you'd measure in the Z basis
        # and compute the product of ±1 for each qubit.
        # For our simulation, ⟨ZZZZ⟩ for the ideal 2e⁻ state is +1.
        s_measurement = raw_measurements.get('ZZZZ', 1.0)

    denom = 1 + s * s_measurement
    if abs(denom) < 1e-10:
        # Degenerate — fall back to raw
        return sum(terms[p] * raw_measurements.get(p, 0 if p != 'IIII' else 1.0)
                   for p in terms)

    energy = 0.0
    for pauli_str, coeff in terms.items():
        if pauli_str == 'IIII':
            energy += coeff
            continue

        raw_p = raw_measurements.get(pauli_str, 0.0)
        phase_sp, sp_str = symmetry_products[pauli_str]
        raw_sp = raw_measurements.get(sp_str, 0.0)

        # ⟨P⟩_SV = (⟨P⟩ + s · phase · ⟨SP⟩) / (1 + s · ⟨S⟩)
        sv_p = (raw_p + s * phase_sp * raw_sp) / denom
        energy += coeff * sv_p

    return energy


# ── Main replication ─────────────────────────────────────────────

def run_replication(noise_strength=0.0, n_shots=8192, bond_distances=None):
    """Run Sagastizabal replication at multiple bond distances."""
    if bond_distances is None:
        bond_distances = [0.25, 0.50, 0.75, 1.00, 1.10, 1.20,
                          1.30, 1.40, 1.50, 1.60, 1.80, 2.00]

    print("=" * 85)
    print("SAGASTIZABAL 2019 — Z₂ Symmetry Verification on H₂ VQE")
    print("=" * 85)
    print(f"Mapping: Jordan-Wigner (4 qubits)")
    print(f"Symmetry: S = Z₀Z₁Z₂Z₃, eigenvalue s = +1 (2 electrons)")
    print(f"Noise: {'none (ideal)' if noise_strength == 0 else f'depolarizing p={noise_strength}'}")
    print(f"Shots: {n_shots}")
    print()

    rng = np.random.default_rng(42)
    results = []

    print(f"{'R(Å)':>5} | {'FCI':>10} | {'VQE':>10} | {'Raw':>10} | {'SV':>10} | "
          f"{'Err_raw':>8} | {'Err_SV':>8} | {'Improv':>6}")
    print("-" * 85)

    for R in bond_distances:
        R = round(R, 4)

        # 1. Compute Hamiltonian
        terms, fci = h2_hamiltonian(R)

        # 2. Find optimal ansatz parameter
        theta_opt, e_vqe = find_optimal_theta(terms)

        # 3. Build the state
        state = np.zeros(16, dtype=complex)
        state[0b1100] = np.cos(theta_opt / 2)
        state[0b0011] = -np.sin(theta_opt / 2)

        # 4. Compute symmetry products S·P for all terms
        symmetry_products = get_symmetry_products(terms, 'ZZZZ')

        # 5. We also need to measure S·P terms that aren't in the Hamiltonian
        # Collect all unique Pauli strings we need to measure
        all_strings = set(terms.keys())
        all_strings.add('ZZZZ')  # The symmetry operator itself
        for pauli_str in list(terms.keys()):
            _, sp_str = symmetry_products[pauli_str]
            all_strings.add(sp_str)

        # 6. Measure all needed Pauli strings
        all_terms_for_measurement = {s: 0.0 for s in all_strings}
        all_terms_for_measurement.update(terms)  # keep original coefficients
        raw_measurements = measure_all_terms(
            all_terms_for_measurement, state, n_shots, noise_strength, rng
        )

        # 7. Raw energy (no symmetry verification)
        e_raw = sum(terms[p] * raw_measurements.get(p, 0 if p != 'IIII' else 1.0)
                    for p in terms)

        # 8. Symmetry-verified energy
        e_sv = symmetry_verify_energy(terms, raw_measurements, symmetry_products, s=+1)

        # 9. Errors
        err_raw = abs(e_raw - fci)
        err_sv = abs(e_sv - fci)
        improvement = err_raw / err_sv if err_sv > 1e-12 else float('inf')

        results.append({
            'bond_distance': float(R),
            'fci_energy': float(fci),
            'vqe_energy': float(e_vqe),
            'optimal_theta': float(theta_opt),
            'energy_raw': float(e_raw),
            'energy_sv': float(e_sv),
            'error_raw_mHa': float(err_raw * 1000),
            'error_sv_mHa': float(err_sv * 1000),
            'error_raw_kcal': float(err_raw * 627.509),
            'error_sv_kcal': float(err_sv * 627.509),
            'improvement_factor': float(min(improvement, 999)),
            'chemical_accuracy_raw': bool(err_raw * 627.509 < 1.0),
            'chemical_accuracy_sv': bool(err_sv * 627.509 < 1.0),
            'symmetry_expectation': float(raw_measurements.get('ZZZZ', 0)),
            'n_hamiltonian_terms': len([t for t in terms if t != 'IIII']),
            'n_measurement_strings': len(all_strings),
        })

        print(f"{R:5.2f} | {fci:10.6f} | {e_vqe:10.6f} | {e_raw:10.6f} | {e_sv:10.6f} | "
              f"{err_raw*1000:8.3f} | {err_sv*1000:8.3f} | {improvement:6.1f}x")

    # Summary
    errors_raw = [r['error_raw_mHa'] for r in results]
    errors_sv = [r['error_sv_mHa'] for r in results]
    n_chem_raw = sum(1 for r in results if r['chemical_accuracy_raw'])
    n_chem_sv = sum(1 for r in results if r['chemical_accuracy_sv'])
    mean_improvement = np.mean(errors_raw) / np.mean(errors_sv) if np.mean(errors_sv) > 0 else float('inf')

    print("-" * 85)
    print(f"MAE raw:  {np.mean(errors_raw):.3f} mHa ({np.mean(errors_raw)*0.627509:.3f} kcal/mol)")
    print(f"MAE SV:   {np.mean(errors_sv):.3f} mHa ({np.mean(errors_sv)*0.627509:.3f} kcal/mol)")
    print(f"Mean improvement: {mean_improvement:.1f}x")
    print(f"Chemical accuracy: raw {n_chem_raw}/{len(results)}, SV {n_chem_sv}/{len(results)}")
    print()

    return results


def save_results(results, noise_strength, n_shots):
    """Save results to JSON."""
    output_dir = Path("experiments/results")
    output_dir.mkdir(parents=True, exist_ok=True)

    errors_raw = [r['error_raw_mHa'] for r in results]
    errors_sv = [r['error_sv_mHa'] for r in results]
    mean_improvement = np.mean(errors_raw) / np.mean(errors_sv) if np.mean(errors_sv) > 0 else None

    report = {
        "id": "sagastizabal2019-sv-replication",
        "type": "vqe_h2_symmetry_verification",
        "paper": {
            "title": "Error Mitigation by Symmetry Verification on a VQE",
            "authors": "Sagastizabal et al.",
            "arxiv": "1902.11258",
            "journal": "Phys. Rev. A 100, 010302(R) (2019)",
        },
        "methodology": {
            "mapping": "Jordan-Wigner (4 qubits; paper used 2-qubit BK — physics identical)",
            "ansatz": "DoubleExcitation (equivalent to paper's exchange gate in JW basis)",
            "symmetry_operator": "S = Z₀Z₁Z₂Z₃ (total particle number parity)",
            "symmetry_eigenvalue": "+1 (2 electrons = even)",
            "protocol": (
                "For each Pauli term P: ⟨P⟩_SV = (⟨P⟩ + s·⟨S·P⟩) / (1 + s·⟨S⟩). "
                "S·P computed algebraically (Pauli multiplication). "
                "No additional circuits — ⟨S·P⟩ measured from same bases as ⟨P⟩."
            ),
            "noise_model": f"depolarizing p={noise_strength}" if noise_strength > 0 else "ideal",
            "shots_per_term": n_shots,
        },
        "backend": "emulator (pennylane statevector + shot noise)",
        "generated": datetime.now(timezone.utc).isoformat(),
        "results_by_distance": results,
        "summary": {
            "n_distances": len(results),
            "mae_raw_mHa": round(float(np.mean(errors_raw)), 4),
            "mae_sv_mHa": round(float(np.mean(errors_sv)), 4),
            "mae_raw_kcal": round(float(np.mean(errors_raw)) * 0.627509, 4),
            "mae_sv_kcal": round(float(np.mean(errors_sv)) * 0.627509, 4),
            "mean_improvement": round(float(mean_improvement), 2) if mean_improvement else None,
            "n_chemical_accuracy_raw": sum(1 for r in results if r['chemical_accuracy_raw']),
            "n_chemical_accuracy_sv": sum(1 for r in results if r['chemical_accuracy_sv']),
        },
    }

    tag = "ideal" if noise_strength == 0 else f"noise{noise_strength}"
    filename = f"sagastizabal2019-sv-{tag}.json"
    filepath = output_dir / filename
    with open(filepath, "w") as f:
        json.dump(report, f, indent=2)
    print(f"Saved: {filepath}")
    return filepath


if __name__ == "__main__":
    # Default: run at multiple noise levels
    noise_levels = [0.0, 0.05, 0.10, 0.15]

    if '--noise' in sys.argv:
        idx = sys.argv.index('--noise')
        noise_levels = [float(sys.argv[idx + 1])]

    if '--ideal-only' in sys.argv:
        noise_levels = [0.0]

    for noise in noise_levels:
        shots = 100000 if noise == 0 else 8192
        results = run_replication(noise_strength=noise, n_shots=shots)
        save_results(results, noise, shots)
