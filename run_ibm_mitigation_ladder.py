#!/usr/bin/env python3
"""IBM VQE Error Mitigation Ladder.

Systematically applies mitigation techniques to push IBM H2 VQE toward chemical accuracy.
Phase 0: Offline reanalysis of existing data (0 IBM minutes)
Phase 1: EstimatorV2 baseline + TREX (1 min)
Phase 2: DD + Twirling (1 min)
Phase 3: ZNE (2 min)
Phase 4: High shots with best config (2 min)
Phase 5: SamplerV2 + manual post-selection comparison (1 min)

Usage:
    python run_ibm_mitigation_ladder.py --offline-only   # Phase 0 only (no hardware)
    python run_ibm_mitigation_ladder.py --phase 1        # Run specific phase
    python run_ibm_mitigation_ladder.py                  # Run all phases
"""
import json
import sys
import argparse
import numpy as np
from datetime import datetime, timezone
from pathlib import Path
from collections import Counter

# ============================================================
# Constants
# ============================================================
RESULTS_DIR = Path("experiments/results")
HAMILTONIAN_FILE = Path("experiments/hamiltonians/h2_sto3g_0735.json")
FCI_ENERGY = -1.1373  # Hartree
KCAL_PER_HARTREE = 627.509
CHEMICAL_ACCURACY_KCAL = 1.0
CHEMICAL_ACCURACY_HA = CHEMICAL_ACCURACY_KCAL / KCAL_PER_HARTREE

# Sector-projected coefficients (from canonical Hamiltonian file)
COEFFS = {
    'g0': -0.321124,
    'g1': 0.397937,   # Z0
    'g2': -0.397937,  # Z1
    'g3': 0.0,        # Z0Z1
    'g4': 0.090466,   # X0X1
    'g5': 0.090466,   # Y0Y1
}

THETA = -0.2235  # optimal for sector-projected coefficients


# ============================================================
# Core Utilities
# ============================================================

def parity_postselect(counts):
    """Filter Z-basis counts to odd-parity bitstrings (|01>, |10>).

    For BK-reduced 2-qubit H2, valid states have odd parity.
    Even-parity states (|00>, |11>) are hardware noise leakage.
    """
    filtered = {}
    for bs, count in counts.items():
        bits = bs[-2:]
        parity = int(bits[0]) ^ int(bits[1])
        if parity == 1:
            filtered[bs] = count
    return filtered


def expval_from_counts(counts, qubits, total):
    """Compute Z-type expectation value from measurement counts.

    Qiskit bitstring convention: rightmost character = qubit 0.
    """
    ev = 0.0
    for bs, count in counts.items():
        sign = 1
        for q in qubits:
            if bs[-(q + 1)] == '1':
                sign *= -1
        ev += sign * count
    return ev / total


def compute_energy(z_counts, x_counts, y_counts,
                   z_total=None, x_total=None, y_total=None, coeffs=None):
    """Compute H2 energy from 3-basis measurement counts.

    H = g0*I + g1*Z0 + g2*Z1 + g3*Z0Z1 + g4*X0X1 + g5*Y0Y1
    """
    if coeffs is None:
        coeffs = COEFFS
    if z_total is None:
        z_total = sum(z_counts.values())
    if x_total is None:
        x_total = sum(x_counts.values())
    if y_total is None:
        y_total = sum(y_counts.values())

    ez0 = expval_from_counts(z_counts, [0], z_total)
    ez1 = expval_from_counts(z_counts, [1], z_total)
    ez0z1 = expval_from_counts(z_counts, [0, 1], z_total)
    ex0x1 = expval_from_counts(x_counts, [0, 1], x_total)
    ey0y1 = expval_from_counts(y_counts, [0, 1], y_total)

    energy = (coeffs['g0']
              + coeffs['g1'] * ez0
              + coeffs['g2'] * ez1
              + coeffs['g3'] * ez0z1
              + coeffs['g4'] * ex0x1
              + coeffs['g5'] * ey0y1)

    evs = {'Z0': ez0, 'Z1': ez1, 'Z0Z1': ez0z1, 'X0X1': ex0x1, 'Y0Y1': ey0y1}
    return energy, evs


def counts_to_bitstrings(counts):
    """Expand count dict to list of bitstrings for bootstrap resampling."""
    bitstrings = []
    for bs, count in counts.items():
        bitstrings.extend([bs] * count)
    return bitstrings


def bitstrings_to_counts(bitstrings):
    """Convert list of bitstrings back to count dict."""
    return dict(Counter(bitstrings))


def bootstrap_energy(z_counts, x_counts, y_counts,
                     n_resamples=10000, postselect=True, rng=None):
    """Bootstrap resample to get energy confidence interval.

    Resamples each basis independently (they come from separate shot runs).
    """
    if rng is None:
        rng = np.random.default_rng(42)

    z_bs = np.array(counts_to_bitstrings(z_counts))
    x_bs = np.array(counts_to_bitstrings(x_counts))
    y_bs = np.array(counts_to_bitstrings(y_counts))

    energies = []
    for _ in range(n_resamples):
        z_idx = rng.integers(0, len(z_bs), size=len(z_bs))
        x_idx = rng.integers(0, len(x_bs), size=len(x_bs))
        y_idx = rng.integers(0, len(y_bs), size=len(y_bs))

        z_c = bitstrings_to_counts(z_bs[z_idx])
        x_c = bitstrings_to_counts(x_bs[x_idx])
        y_c = bitstrings_to_counts(y_bs[y_idx])

        if postselect:
            z_c = parity_postselect(z_c)

        z_tot = sum(z_c.values())
        if z_tot == 0:
            continue

        e, _ = compute_energy(z_c, x_c, y_c, z_total=z_tot)
        energies.append(e)

    energies = np.array(energies)
    return {
        'mean': float(np.mean(energies)),
        'std': float(np.std(energies)),
        'ci_95_low': float(np.percentile(energies, 2.5)),
        'ci_95_high': float(np.percentile(energies, 97.5)),
        'n_valid': len(energies),
    }


def merge_counts(*count_dicts):
    """Merge multiple count dicts by summing counts."""
    merged = {}
    for d in count_dicts:
        for k, v in d.items():
            merged[k] = merged.get(k, 0) + v
    return merged


# ============================================================
# Data Loading
# ============================================================

def load_existing_datasets():
    """Load all 3 existing IBM VQE datasets."""
    datasets = []

    # Run 1: vqe-equilibrium-001-ibm.json
    with open(RESULTS_DIR / "vqe-equilibrium-001-ibm.json") as f:
        d1 = json.load(f)
    datasets.append({
        'name': 'Run 1 (equilibrium-001)',
        'z': d1['raw_counts']['z_basis'],
        'x': d1['raw_counts']['x_basis'],
        'y': d1['raw_counts']['y_basis'],
        'shots': 4096,
        'job_ids': d1.get('job_ids', {}),
    })

    # Run 2: variance-analysis rerun
    with open(RESULTS_DIR / "variance-analysis-001.json") as f:
        d2 = json.load(f)
    run2 = d2['ibm_vqe']['rerun']
    datasets.append({
        'name': 'Run 2 (variance rerun)',
        'z': run2['raw_counts']['z'],
        'x': run2['raw_counts']['x'],
        'y': run2['raw_counts']['y'],
        'shots': 4096,
        'job_ids': run2.get('job_ids', {}),
    })

    # Run 3: sagastizabal replication
    with open(RESULTS_DIR / "vqe-h2-sagastizabal-ibm.json") as f:
        d3 = json.load(f)
    datasets.append({
        'name': 'Run 3 (sagastizabal)',
        'z': d3['raw_counts']['zz_basis'],
        'x': d3['raw_counts']['xx_basis'],
        'y': d3['raw_counts']['yy_basis'],
        'shots': 4096,
        'job_ids': d3.get('job_ids', {}),
    })

    return datasets


# ============================================================
# Phase 0: Offline Reanalysis
# ============================================================

def run_phase0():
    """Reanalyze existing IBM data with post-selection + bootstrap CIs."""
    print("=" * 60)
    print("PHASE 0: Offline Reanalysis (0 IBM minutes)")
    print("=" * 60)

    datasets = load_existing_datasets()
    results = []

    for ds in datasets:
        print(f"\n--- {ds['name']} ---")

        # Raw energy
        e_raw, evs_raw = compute_energy(ds['z'], ds['x'], ds['y'])
        err_raw = abs(e_raw - FCI_ENERGY) * KCAL_PER_HARTREE

        # Post-selected energy
        z_ps = parity_postselect(ds['z'])
        z_kept = sum(z_ps.values())
        keep_frac = z_kept / ds['shots']
        e_ps, evs_ps = compute_energy(z_ps, ds['x'], ds['y'], z_total=z_kept)
        err_ps = abs(e_ps - FCI_ENERGY) * KCAL_PER_HARTREE

        # Bootstrap CIs
        boot_ps = bootstrap_energy(ds['z'], ds['x'], ds['y'],
                                   n_resamples=10000, postselect=True)
        boot_raw = bootstrap_energy(ds['z'], ds['x'], ds['y'],
                                    n_resamples=10000, postselect=False)

        # Check if chemical accuracy falls within CI
        ci_contains_fci = boot_ps['ci_95_low'] <= FCI_ENERGY <= boot_ps['ci_95_high']
        ci_err_low = abs(boot_ps['ci_95_high'] - FCI_ENERGY) * KCAL_PER_HARTREE
        ci_err_high = abs(boot_ps['ci_95_low'] - FCI_ENERGY) * KCAL_PER_HARTREE

        print(f"  Raw:      {e_raw:.5f} Ha ({err_raw:.2f} kcal/mol)")
        print(f"  PS:       {e_ps:.5f} Ha ({err_ps:.2f} kcal/mol)")
        print(f"  PS keep:  {keep_frac:.1%} ({z_kept}/{ds['shots']})")
        print(f"  Boot CI:  [{boot_ps['ci_95_low']:.5f}, {boot_ps['ci_95_high']:.5f}] Ha")
        print(f"  Boot std: {boot_ps['std'] * KCAL_PER_HARTREE:.2f} kcal/mol")
        print(f"  FCI in CI: {ci_contains_fci}")

        results.append({
            'name': ds['name'],
            'shots': ds['shots'],
            'energy_raw': round(e_raw, 6),
            'error_raw_kcal': round(err_raw, 2),
            'energy_postselected': round(e_ps, 6),
            'error_postselected_kcal': round(err_ps, 2),
            'postselection_keep_fraction': round(keep_frac, 4),
            'expectation_values_raw': {k: round(v, 5) for k, v in evs_raw.items()},
            'expectation_values_postselected': {k: round(v, 5) for k, v in evs_ps.items()},
            'bootstrap_postselected': boot_ps,
            'bootstrap_raw': boot_raw,
            'fci_within_95ci': ci_contains_fci,
            'job_ids': ds['job_ids'],
        })

    # Combined shot pool (merge all 3 runs)
    total_shots = sum(ds['shots'] for ds in datasets)
    print(f"\n--- Combined (all 3 runs, {total_shots} effective shots/basis) ---")

    z_merged = merge_counts(*[ds['z'] for ds in datasets])
    x_merged = merge_counts(*[ds['x'] for ds in datasets])
    y_merged = merge_counts(*[ds['y'] for ds in datasets])

    e_raw_m, _ = compute_energy(z_merged, x_merged, y_merged)
    err_raw_m = abs(e_raw_m - FCI_ENERGY) * KCAL_PER_HARTREE

    z_ps_m = parity_postselect(z_merged)
    z_kept_m = sum(z_ps_m.values())
    e_ps_m, _ = compute_energy(z_ps_m, x_merged, y_merged, z_total=z_kept_m)
    err_ps_m = abs(e_ps_m - FCI_ENERGY) * KCAL_PER_HARTREE

    boot_m = bootstrap_energy(z_merged, x_merged, y_merged,
                              n_resamples=10000, postselect=True)

    print(f"  Raw:      {e_raw_m:.5f} Ha ({err_raw_m:.2f} kcal/mol)")
    print(f"  PS:       {e_ps_m:.5f} Ha ({err_ps_m:.2f} kcal/mol)")
    print(f"  PS keep:  {z_kept_m}/{total_shots} ({z_kept_m / total_shots:.1%})")
    print(f"  Boot CI:  [{boot_m['ci_95_low']:.5f}, {boot_m['ci_95_high']:.5f}] Ha")
    print(f"  Boot std: {boot_m['std'] * KCAL_PER_HARTREE:.2f} kcal/mol")

    # Inverse-variance weighted mean across runs
    ps_energies = [r['energy_postselected'] for r in results]
    ps_stds = [r['bootstrap_postselected']['std'] for r in results]
    weights = [1.0 / s**2 if s > 0 else 0 for s in ps_stds]
    w_total = sum(weights)
    if w_total > 0:
        weighted_mean = sum(e * w for e, w in zip(ps_energies, weights)) / w_total
        weighted_std = (1.0 / w_total) ** 0.5
    else:
        weighted_mean = np.mean(ps_energies)
        weighted_std = np.std(ps_energies)
    err_weighted = abs(weighted_mean - FCI_ENERGY) * KCAL_PER_HARTREE

    print(f"\n--- Weighted Mean ---")
    print(f"  Energy:   {weighted_mean:.5f} Ha ({err_weighted:.2f} kcal/mol)")
    print(f"  Std:      {weighted_std * KCAL_PER_HARTREE:.2f} kcal/mol")

    combined = {
        'total_shots_per_basis': total_shots,
        'energy_raw': round(e_raw_m, 6),
        'error_raw_kcal': round(err_raw_m, 2),
        'energy_postselected': round(e_ps_m, 6),
        'error_postselected_kcal': round(err_ps_m, 2),
        'postselection_keep_fraction': round(z_kept_m / total_shots, 4),
        'bootstrap_postselected': boot_m,
        'weighted_mean': round(weighted_mean, 6),
        'weighted_std': round(weighted_std, 6),
        'weighted_error_kcal': round(err_weighted, 2),
    }

    return {
        'phase': 'phase_0_offline',
        'description': 'Reanalysis of 3 existing IBM VQE datasets with parity post-selection + bootstrap CIs',
        'per_run': results,
        'combined': combined,
        'ibm_minutes_used': 0,
    }


# ============================================================
# Circuit / Hamiltonian Builders
# ============================================================

def build_vqe_circuit():
    """Build 2-qubit VQE ansatz (no measurements — for EstimatorV2)."""
    from qiskit import QuantumCircuit
    qc = QuantumCircuit(2)
    qc.ry(THETA, 0)
    qc.cx(0, 1)
    qc.x(0)
    return qc


def build_vqe_sampler_circuits():
    """Build VQE circuits with Z/X/Y basis measurements (for SamplerV2)."""
    from qiskit import QuantumCircuit
    circuits = {}
    for basis in ['z', 'x', 'y']:
        qc = QuantumCircuit(2)
        qc.ry(THETA, 0)
        qc.cx(0, 1)
        qc.x(0)
        if basis == 'x':
            qc.h(0)
            qc.h(1)
        elif basis == 'y':
            qc.sdg(0)
            qc.h(0)
            qc.sdg(1)
            qc.h(1)
        qc.measure_all()
        circuits[basis] = qc
    return circuits


def build_hamiltonian():
    """Build SparsePauliOp for H2 at R=0.735 (sector-projected)."""
    from qiskit.quantum_info import SparsePauliOp
    # Qiskit convention: 'IZ' = Z on q0, 'ZI' = Z on q1
    return SparsePauliOp.from_list([
        ('II', COEFFS['g0']),
        ('IZ', COEFFS['g1']),
        ('ZI', COEFFS['g2']),
        ('ZZ', COEFFS['g3']),
        ('XX', COEFFS['g4']),
        ('YY', COEFFS['g5']),
    ])


# ============================================================
# IBM Connection + Transpilation
# ============================================================

def connect_ibm():
    """Connect to IBM Quantum and get least busy backend."""
    from qiskit_ibm_runtime import QiskitRuntimeService
    print("\nConnecting to IBM Quantum...")
    service = QiskitRuntimeService(channel='ibm_cloud')
    backend = service.least_busy(operational=True, min_num_qubits=4)
    print(f"Backend: {backend.name} ({backend.num_qubits}q)")
    return service, backend


def transpile_for_estimator(qc, backend):
    """Transpile circuit for EstimatorV2 (ISA circuit)."""
    from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
    pm = generate_preset_pass_manager(
        optimization_level=3,
        backend=backend,
        translation_method='translator',
    )
    isa_circuit = pm.run(qc)
    print(f"  Transpiled: depth={isa_circuit.depth()}, ops={dict(isa_circuit.count_ops())}")
    return isa_circuit


# ============================================================
# Phase 1-5: Hardware Jobs
# ============================================================

def run_estimator_job(backend, isa_circuit, obs, label, shots=4096,
                      resilience_level=0, dd=False, twirl=False,
                      zne_factors=None, zne_extrapolator=None):
    """Submit one EstimatorV2 job and return results."""
    from qiskit_ibm_runtime import EstimatorV2

    print(f"\n  [{label}]")
    print(f"    Config: resilience={resilience_level}, DD={dd}, twirl={twirl}, "
          f"ZNE={zne_factors or 'off'}")

    estimator = EstimatorV2(backend)
    estimator.options.default_shots = shots
    estimator.options.resilience_level = resilience_level

    if dd:
        estimator.options.dynamical_decoupling.enable = True
        estimator.options.dynamical_decoupling.sequence_type = "XpXm"

    if twirl:
        estimator.options.twirling.enable_gates = True
        estimator.options.twirling.num_randomizations = 32

    if zne_factors is not None and resilience_level >= 2:
        estimator.options.resilience.zne.noise_factors = zne_factors
        if zne_extrapolator:
            estimator.options.resilience.zne.extrapolator = zne_extrapolator

    isa_obs = obs.apply_layout(isa_circuit.layout)
    job = estimator.run([(isa_circuit, isa_obs)])
    job_id = job.job_id()
    print(f"    Job ID: {job_id}")
    print(f"    Waiting...")

    result = job.result()
    energy = float(result[0].data.evs)
    std = float(result[0].data.stds)
    error_kcal = abs(energy - FCI_ENERGY) * KCAL_PER_HARTREE
    chem_acc = error_kcal < CHEMICAL_ACCURACY_KCAL

    try:
        metrics = job.metrics()
        qpu_seconds = metrics.get('usage', {}).get('quantum_seconds', None)
    except Exception:
        qpu_seconds = None

    marker = " ** CHEMICAL ACCURACY **" if chem_acc else ""
    print(f"    Energy: {energy:.5f} +/- {std:.5f} Ha")
    print(f"    Error:  {error_kcal:.2f} kcal/mol{marker}")
    if qpu_seconds is not None:
        print(f"    QPU:    {qpu_seconds:.1f}s")

    return {
        'label': label,
        'job_id': job_id,
        'shots': shots,
        'resilience_level': resilience_level,
        'dynamical_decoupling': dd,
        'twirling': twirl,
        'zne_noise_factors': zne_factors,
        'zne_extrapolator': zne_extrapolator,
        'energy_hartree': round(energy, 6),
        'std_hartree': round(std, 6),
        'error_kcal_mol': round(error_kcal, 2),
        'chemical_accuracy': chem_acc,
        'qpu_seconds': qpu_seconds,
    }


def run_sampler_job(backend, circuits, label, shots=16384, dd=False, twirl=False):
    """Submit SamplerV2 job (3 bases) and return counts + post-selected energy."""
    from qiskit_ibm_runtime import SamplerV2
    from qiskit import transpile

    print(f"\n  [{label}]")
    print(f"    Config: shots={shots}, DD={dd}, twirl={twirl}")

    sampler = SamplerV2(backend)
    sampler.options.default_shots = shots

    if dd:
        sampler.options.dynamical_decoupling.enable = True
        sampler.options.dynamical_decoupling.sequence_type = "XpXm"

    if twirl:
        sampler.options.twirling.enable_gates = True
        sampler.options.twirling.num_randomizations = 32

    from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
    _pm = generate_preset_pass_manager(optimization_level=3, backend=backend, translation_method='translator')
    transpiled = [_pm.run(c) for c in [circuits['z'], circuits['x'], circuits['y']]]

    job = sampler.run(transpiled, shots=shots)
    job_id = job.job_id()
    print(f"    Job ID: {job_id}")
    print(f"    Waiting...")

    result = job.result()
    z_counts = result[0].data.meas.get_counts()
    x_counts = result[1].data.meas.get_counts()
    y_counts = result[2].data.meas.get_counts()

    # Raw energy
    e_raw, evs_raw = compute_energy(z_counts, x_counts, y_counts)
    err_raw = abs(e_raw - FCI_ENERGY) * KCAL_PER_HARTREE

    # Post-selected energy
    z_ps = parity_postselect(z_counts)
    z_kept = sum(z_ps.values())
    keep_frac = z_kept / shots
    e_ps, evs_ps = compute_energy(z_ps, x_counts, y_counts, z_total=z_kept)
    err_ps = abs(e_ps - FCI_ENERGY) * KCAL_PER_HARTREE

    # Bootstrap CI
    boot = bootstrap_energy(z_counts, x_counts, y_counts,
                            n_resamples=10000, postselect=True)

    try:
        metrics = job.metrics()
        qpu_seconds = metrics.get('usage', {}).get('quantum_seconds', None)
    except Exception:
        qpu_seconds = None

    chem_acc = err_ps < CHEMICAL_ACCURACY_KCAL
    marker = " ** CHEMICAL ACCURACY **" if chem_acc else ""
    print(f"    Raw:  {e_raw:.5f} Ha ({err_raw:.2f} kcal/mol)")
    print(f"    PS:   {e_ps:.5f} Ha ({err_ps:.2f} kcal/mol){marker}")
    print(f"    Keep: {keep_frac:.1%}")
    print(f"    CI:   [{boot['ci_95_low']:.5f}, {boot['ci_95_high']:.5f}] Ha")

    return {
        'label': label,
        'job_id': job_id,
        'shots': shots,
        'dynamical_decoupling': dd,
        'twirling': twirl,
        'energy_raw': round(e_raw, 6),
        'error_raw_kcal': round(err_raw, 2),
        'energy_postselected': round(e_ps, 6),
        'error_postselected_kcal': round(err_ps, 2),
        'postselection_keep_fraction': round(keep_frac, 4),
        'chemical_accuracy': chem_acc,
        'bootstrap': boot,
        'raw_counts': {
            'z_basis': z_counts,
            'x_basis': x_counts,
            'y_basis': y_counts,
        },
        'expectation_values_raw': {k: round(v, 5) for k, v in evs_raw.items()},
        'expectation_values_postselected': {k: round(v, 5) for k, v in evs_ps.items()},
        'qpu_seconds': qpu_seconds,
    }


def run_phase1(backend, isa_circuit, obs):
    """Phase 1: EstimatorV2 baseline."""
    print("\n" + "=" * 60)
    print("PHASE 1: EstimatorV2 Baseline (est. 1 IBM min)")
    print("=" * 60)

    jobs = []
    jobs.append(run_estimator_job(backend, isa_circuit, obs,
                                  "1a: Raw (resilience=0)",
                                  shots=4096, resilience_level=0))
    jobs.append(run_estimator_job(backend, isa_circuit, obs,
                                  "1b: TREX (resilience=1)",
                                  shots=4096, resilience_level=1))
    return {'phase': 'phase_1_estimator_baseline', 'jobs': jobs}


def run_phase2(backend, isa_circuit, obs):
    """Phase 2: DD + Twirling."""
    print("\n" + "=" * 60)
    print("PHASE 2: DD + Twirling (est. 1 IBM min)")
    print("=" * 60)

    jobs = []
    jobs.append(run_estimator_job(backend, isa_circuit, obs,
                                  "2a: TREX + DD",
                                  shots=4096, resilience_level=1, dd=True))
    jobs.append(run_estimator_job(backend, isa_circuit, obs,
                                  "2b: TREX + DD + Twirl",
                                  shots=4096, resilience_level=1, dd=True, twirl=True))
    return {'phase': 'phase_2_dd_twirling', 'jobs': jobs}


def run_phase3(backend, isa_circuit, obs):
    """Phase 3: ZNE."""
    print("\n" + "=" * 60)
    print("PHASE 3: ZNE (est. 2 IBM min)")
    print("=" * 60)

    jobs = []
    jobs.append(run_estimator_job(backend, isa_circuit, obs,
                                  "3a: ZNE linear [1,2,3]",
                                  shots=4096, resilience_level=2,
                                  dd=True, twirl=True,
                                  zne_factors=[1, 2, 3],
                                  zne_extrapolator="linear"))
    jobs.append(run_estimator_job(backend, isa_circuit, obs,
                                  "3b: ZNE exp [1,2,3,5]",
                                  shots=4096, resilience_level=2,
                                  dd=True, twirl=True,
                                  zne_factors=[1, 2, 3, 5],
                                  zne_extrapolator="exponential"))
    return {'phase': 'phase_3_zne', 'jobs': jobs}


def run_phase4(backend, isa_circuit, obs, best_config):
    """Phase 4: High shots with best config from Phases 1-3."""
    print("\n" + "=" * 60)
    print("PHASE 4: High Shots (est. 2 IBM min)")
    print("=" * 60)

    job = run_estimator_job(
        backend, isa_circuit, obs,
        f"4: Best ({best_config['label']}) + 16K shots",
        shots=16384,
        resilience_level=best_config['resilience_level'],
        dd=best_config.get('dynamical_decoupling', False),
        twirl=best_config.get('twirling', False),
        zne_factors=best_config.get('zne_noise_factors'),
        zne_extrapolator=best_config.get('zne_extrapolator'),
    )
    return {'phase': 'phase_4_high_shots', 'jobs': [job]}


def run_phase5(backend):
    """Phase 5: SamplerV2 + manual post-selection comparison."""
    print("\n" + "=" * 60)
    print("PHASE 5: SamplerV2 + Post-Selection (est. 1.5 IBM min)")
    print("=" * 60)

    circuits = build_vqe_sampler_circuits()
    job = run_sampler_job(backend, circuits,
                          "5: SamplerV2 + DD + Twirl + PS",
                          shots=16384, dd=True, twirl=True)
    return {'phase': 'phase_5_sampler_postselection', 'jobs': [job]}


# ============================================================
# Analysis + Output
# ============================================================

def find_best_config(phases):
    """Find best mitigation config from Phase 1-3 results."""
    best = None
    for phase in phases:
        for job in phase.get('jobs', []):
            if best is None or job['error_kcal_mol'] < best['error_kcal_mol']:
                best = job
    return best


def build_ranking_table(ladder):
    """Build ranked list of all techniques by error."""
    rows = []

    # Phase 0
    if 'phase_0_offline' in ladder:
        p0 = ladder['phase_0_offline']
        for r in p0['per_run']:
            rows.append({
                'label': f"P0: {r['name']} (raw)",
                'energy': r['energy_raw'],
                'error_kcal': r['error_raw_kcal'],
                'chemical_accuracy': r['error_raw_kcal'] < CHEMICAL_ACCURACY_KCAL,
                'job_id': 'offline',
            })
            rows.append({
                'label': f"P0: {r['name']} (PS)",
                'energy': r['energy_postselected'],
                'error_kcal': r['error_postselected_kcal'],
                'chemical_accuracy': r['error_postselected_kcal'] < CHEMICAL_ACCURACY_KCAL,
                'job_id': 'offline',
            })
        rows.append({
            'label': 'P0: Combined 3 runs (PS)',
            'energy': p0['combined']['energy_postselected'],
            'error_kcal': p0['combined']['error_postselected_kcal'],
            'chemical_accuracy': p0['combined']['error_postselected_kcal'] < CHEMICAL_ACCURACY_KCAL,
            'job_id': 'offline',
        })
        rows.append({
            'label': 'P0: Weighted mean (PS)',
            'energy': p0['combined']['weighted_mean'],
            'error_kcal': p0['combined']['weighted_error_kcal'],
            'chemical_accuracy': p0['combined']['weighted_error_kcal'] < CHEMICAL_ACCURACY_KCAL,
            'job_id': 'offline',
        })

    # Phases 1-5
    for key in ['phase_1_estimator_baseline', 'phase_2_dd_twirling',
                'phase_3_zne', 'phase_4_high_shots', 'phase_5_sampler_postselection']:
        if key not in ladder:
            continue
        for job in ladder[key].get('jobs', []):
            err = job.get('error_kcal_mol', job.get('error_postselected_kcal'))
            eng = job.get('energy_hartree', job.get('energy_postselected'))
            if err is not None:
                rows.append({
                    'label': job['label'],
                    'energy': eng,
                    'error_kcal': err,
                    'chemical_accuracy': job.get('chemical_accuracy', False),
                    'job_id': job.get('job_id', 'unknown'),
                })

    rows.sort(key=lambda r: r['error_kcal'])
    return rows


def print_ranking(ranking):
    """Print formatted ranking table."""
    print("\n" + "=" * 85)
    print("MITIGATION LADDER RANKING")
    print("=" * 85)
    print(f"{'Rank':<5} {'Error (kcal/mol)':<18} {'Energy (Ha)':<14} {'ChemAcc':<9} {'Label'}")
    print("-" * 85)
    for i, r in enumerate(ranking, 1):
        ca = "YES" if r['chemical_accuracy'] else "no"
        print(f"{i:<5} {r['error_kcal']:<18.2f} {r['energy']:<14.5f} {ca:<9} {r['label']}")
    print("-" * 85)


def build_interpretation(ranking):
    """Build human-readable interpretation string."""
    if not ranking:
        return "No results."
    best = ranking[0]
    worst = ranking[-1]
    n_chem = sum(1 for r in ranking if r['chemical_accuracy'])

    interp = f"Best: {best['label']} at {best['error_kcal']:.2f} kcal/mol. "
    interp += f"Worst: {worst['label']} at {worst['error_kcal']:.2f} kcal/mol. "
    if n_chem > 0:
        interp += (f"{n_chem}/{len(ranking)} techniques achieved chemical accuracy "
                   f"(<{CHEMICAL_ACCURACY_KCAL} kcal/mol). ")
    else:
        gap = best['error_kcal'] - CHEMICAL_ACCURACY_KCAL
        interp += (f"No technique achieved chemical accuracy. "
                   f"Gap: {gap:.2f} kcal/mol from best result. ")
    return interp


def save_results(ladder, ranking):
    """Save full mitigation ladder results to JSON."""
    now = datetime.now(timezone.utc).isoformat()

    output = {
        'schema_version': '1.0',
        'id': 'vqe-mitigation-ladder-001-ibm',
        'type': 'vqe_mitigation_ladder',
        'backend': 'ibm_torino',
        'timestamp': now,
        'parameters': {
            'molecule': 'H2',
            'bond_distance': 0.735,
            'basis_set': 'STO-3G',
            'theta': THETA,
            'fci_energy': FCI_ENERGY,
            'coefficients': COEFFS,
            'ansatz': 'Ry(theta, q0) -> CNOT(q0,q1) -> X(q0)',
        },
        'ladder': ladder,
        'analysis': {
            'ranking': ranking,
            'best_technique': ranking[0] if ranking else None,
            'chemical_accuracy_achieved': any(r['chemical_accuracy'] for r in ranking),
            'interpretation': build_interpretation(ranking),
        },
        'environment': 'experiments/environment.json',
    }

    out_path = RESULTS_DIR / 'vqe-mitigation-ladder-001-ibm.json'
    with open(out_path, 'w') as f:
        json.dump(output, f, indent=2)
    print(f"\nSaved: {out_path}")
    return output


# ============================================================
# Main
# ============================================================

def main():
    parser = argparse.ArgumentParser(description='IBM VQE Error Mitigation Ladder')
    parser.add_argument('--phase', type=int, default=None,
                        help='Run specific phase (0-5). Default: all.')
    parser.add_argument('--offline-only', action='store_true',
                        help='Run Phase 0 only (no IBM hardware)')
    parser.add_argument('--resume', type=str, default=None,
                        help='Path to partial results JSON to resume from')
    args = parser.parse_args()

    # Load partial results if resuming
    if args.resume:
        with open(args.resume) as f:
            saved = json.load(f)
        ladder = saved.get('ladder', {})
        print(f"Resumed from {args.resume} with phases: {list(ladder.keys())}")
    else:
        ladder = {}

    # Phase 0 always runs (offline, free)
    if 'phase_0_offline' not in ladder:
        ladder['phase_0_offline'] = run_phase0()

    if args.offline_only or args.phase == 0:
        ranking = build_ranking_table(ladder)
        print_ranking(ranking)
        save_results(ladder, ranking)
        return

    # Hardware phases require IBM connection
    service, backend = connect_ibm()

    qc = build_vqe_circuit()
    obs = build_hamiltonian()
    isa_circuit = transpile_for_estimator(qc, backend)

    run_all = args.phase is None

    if run_all or args.phase == 1:
        if 'phase_1_estimator_baseline' not in ladder:
            ladder['phase_1_estimator_baseline'] = run_phase1(backend, isa_circuit, obs)
            # Save checkpoint after each phase
            ranking = build_ranking_table(ladder)
            save_results(ladder, ranking)

    if run_all or args.phase == 2:
        if 'phase_2_dd_twirling' not in ladder:
            ladder['phase_2_dd_twirling'] = run_phase2(backend, isa_circuit, obs)
            ranking = build_ranking_table(ladder)
            save_results(ladder, ranking)

    if run_all or args.phase == 3:
        if 'phase_3_zne' not in ladder:
            ladder['phase_3_zne'] = run_phase3(backend, isa_circuit, obs)
            ranking = build_ranking_table(ladder)
            save_results(ladder, ranking)

    if run_all or args.phase == 4:
        if 'phase_4_high_shots' not in ladder:
            hw_phases = [ladder[k] for k in ['phase_1_estimator_baseline',
                                              'phase_2_dd_twirling',
                                              'phase_3_zne']
                         if k in ladder]
            best = find_best_config(hw_phases)
            if best:
                ladder['phase_4_high_shots'] = run_phase4(backend, isa_circuit, obs, best)
                ranking = build_ranking_table(ladder)
                save_results(ladder, ranking)
            else:
                print("Skipping Phase 4: no Phase 1-3 results to determine best config")

    if run_all or args.phase == 5:
        if 'phase_5_sampler_postselection' not in ladder:
            ladder['phase_5_sampler_postselection'] = run_phase5(backend)

    # Final save
    ranking = build_ranking_table(ladder)
    print_ranking(ranking)
    save_results(ladder, ranking)
    print("\nDone! Total QPU time logged in result file.")


if __name__ == '__main__':
    main()
