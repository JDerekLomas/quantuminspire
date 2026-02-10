#!/usr/bin/env python3
"""IBM HeH+ VQE Mitigation Ladder — Test Coefficient Amplification Prediction.

Tests the prediction from failure-analysis.md:
  "TREX will reduce HeH+ error from 91.2 to ~20-30 kcal/mol (3-4x improvement)
   but NOT achieve chemical accuracy, due to 4.4x larger Z coefficients."

Runs HeH+ at selected bond distances through the same mitigation techniques
that achieved 0.22 kcal/mol for H2 (TREX, DD, post-selection).

Usage:
    python run_ibm_heh_ladder.py --compute-only    # Compute coefficients, no hardware
    python run_ibm_heh_ladder.py                    # Run on IBM hardware
    python run_ibm_heh_ladder.py --distances 0.75   # Single distance
"""
import json
import argparse
import numpy as np
from datetime import datetime, timezone
from pathlib import Path
from scipy.optimize import minimize_scalar

RESULTS_DIR = Path("experiments/results")
KCAL_PER_HARTREE = 627.509
CHEMICAL_ACCURACY_KCAL = 1.0


class NumpyEncoder(json.JSONEncoder):
    """Handle numpy types in JSON serialization."""
    def default(self, obj):
        if isinstance(obj, (np.bool_,)):
            return bool(obj)
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)


# ============================================================
# Coefficient Computation (OpenFermion + PySCF)
# ============================================================

def compute_heh_coefficients(R):
    """Compute 2-qubit sector-projected HeH+ Hamiltonian at bond distance R.

    Returns dict with g0-g5 coefficients, FCI energy, optimal alpha, etc.

    Sector projection: from 4-qubit JW, project into {|1100>, |0011>}
    subspace (HF + double excitation for singlet).
    Maps to 2-qubit Hamiltonian:
        H = g0*I + g1*Z0 + g2*Z1 + g4*(X0X1 + Y0Y1)
    with g1 = -g2, g3 = 0, g4 = g5.
    """
    from openfermion import MolecularData, jordan_wigner, get_sparse_operator
    from openfermionpyscf import run_pyscf
    from scipy.linalg import eigh

    mol = MolecularData(
        [('He', (0, 0, 0)), ('H', (0, 0, R))],
        'sto-3g', multiplicity=1, charge=1,
    )
    mol = run_pyscf(mol, run_fci=True)

    jw_ham = jordan_wigner(mol.get_molecular_hamiltonian())
    H_sparse = get_sparse_operator(jw_ham).toarray()

    # 2x2 subspace: HF |1100> = index 12, DE |0011> = index 3
    H_2x2 = np.zeros((2, 2))
    H_2x2[0, 0] = H_sparse[12, 12].real  # <HF|H|HF>
    H_2x2[0, 1] = H_sparse[12, 3].real   # <HF|H|DE>
    H_2x2[1, 0] = H_sparse[3, 12].real   # <DE|H|HF>
    H_2x2[1, 1] = H_sparse[3, 3].real    # <DE|H|DE>

    # Map to Pauli form: H = g0*I + g1*Z0 + g2*Z1 + g4*(XX+YY)
    # In {|10>, |01>} subspace (HF->|10>, DE->|01>):
    #   <10|H|10> = g0 + g1 - g2 = E_HF
    #   <01|H|01> = g0 - g1 + g2 = E_DE
    #   <10|H|01> = g4 + g5 = V
    E_HF = H_2x2[0, 0]
    E_DE = H_2x2[1, 1]
    V = H_2x2[0, 1]

    g0 = (E_HF + E_DE) / 2
    g1 = (E_HF - E_DE) / 4  # from g1-g2 = (E_HF-E_DE)/2 with g1=-g2
    g2 = -g1
    g3 = 0.0
    g4 = V / 2
    g5 = V / 2

    # Optimal alpha (Qiskit Ry convention: Ry(a)|0> = cos(a/2)|0> + sin(a/2)|1>)
    # Circuit: X(q1), Ry(alpha,q0), CNOT(q0,q1) -> cos(a/2)|10> + sin(a/2)|01>
    # E(a) = g0 + (g1-g2)*cos(a) + (g4+g5)*sin(a)
    def energy_func(a):
        return g0 + (g1 - g2) * np.cos(a) + (g4 + g5) * np.sin(a)

    result = minimize_scalar(energy_func, bounds=(-np.pi, np.pi), method='bounded')
    alpha_opt = result.x
    e_opt = result.fun

    # 2x2 eigenvalues for reference
    evals_2x2 = eigh(H_2x2, eigvals_only=True)

    return {
        'bond_distance': R,
        'fci_energy': mol.fci_energy,
        'hf_energy': mol.hf_energy,
        'energy_2q_optimal': round(e_opt, 6),
        'energy_2q_gap_kcal': round((e_opt - mol.fci_energy) * KCAL_PER_HARTREE, 4),
        'alpha_optimal': round(alpha_opt, 6),
        'coefficients': {
            'g0': round(g0, 6),
            'g1': round(g1, 6),
            'g2': round(g2, 6),
            'g3': round(g3, 6),
            'g4': round(g4, 6),
            'g5': round(g5, 6),
        },
        'amplification_ratio': round(abs(g1) / abs(g4), 1) if abs(g4) > 1e-10 else float('inf'),
        'eigenvalues_2x2': [round(e, 6) for e in evals_2x2],
    }


# ============================================================
# Circuit / Hamiltonian Builders
# ============================================================

def build_heh_circuit(alpha):
    """Build 2-qubit HeH+ VQE ansatz (no measurements, for EstimatorV2).

    HeH+ convention: X on q1 (HF reference has q1=1, q0=0).
    H2 convention: X on q0 (HF reference has q0=1, q1=0).
    """
    from qiskit import QuantumCircuit
    qc = QuantumCircuit(2)
    qc.x(1)           # HF reference: |10>
    qc.ry(alpha, 0)   # variational rotation
    qc.cx(0, 1)       # entangle
    return qc


def build_heh_sampler_circuits(alpha):
    """Build VQE circuits with Z/X/Y basis measurements (for SamplerV2)."""
    from qiskit import QuantumCircuit
    circuits = {}
    for basis in ['z', 'x', 'y']:
        qc = QuantumCircuit(2)
        qc.x(1)
        qc.ry(alpha, 0)
        qc.cx(0, 1)
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


def build_heh_hamiltonian(coeffs):
    """Build SparsePauliOp from sector-projected coefficients."""
    from qiskit.quantum_info import SparsePauliOp
    return SparsePauliOp.from_list([
        ('II', coeffs['g0']),
        ('IZ', coeffs['g1']),
        ('ZI', coeffs['g2']),
        ('ZZ', coeffs['g3']),
        ('XX', coeffs['g4']),
        ('YY', coeffs['g5']),
    ])


# ============================================================
# IBM Connection
# ============================================================

def connect_ibm():
    """Connect to IBM Quantum and get least busy backend."""
    from qiskit_ibm_runtime import QiskitRuntimeService
    print("\nConnecting to IBM Quantum...")
    service = QiskitRuntimeService(channel='ibm_cloud')
    backend = service.least_busy(operational=True, min_num_qubits=4)
    print(f"Backend: {backend.name} ({backend.num_qubits}q)")
    return service, backend


def transpile_circuit(qc, backend):
    """Transpile for ISA compatibility."""
    from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
    pm = generate_preset_pass_manager(
        optimization_level=3,
        backend=backend,
        translation_method='translator',
    )
    isa = pm.run(qc)
    print(f"  Transpiled: depth={isa.depth()}, ops={dict(isa.count_ops())}")
    return isa


# ============================================================
# Estimator Job Runner
# ============================================================

def run_estimator_job(backend, isa_circuit, obs, label, fci_energy,
                      shots=4096, resilience_level=0, dd=False, twirl=False):
    """Submit one EstimatorV2 job and return results."""
    from qiskit_ibm_runtime import EstimatorV2

    print(f"\n  [{label}]")
    print(f"    Config: resilience={resilience_level}, DD={dd}, twirl={twirl}, shots={shots}")

    estimator = EstimatorV2(backend)
    estimator.options.default_shots = shots
    estimator.options.resilience_level = resilience_level

    if dd:
        estimator.options.dynamical_decoupling.enable = True
        estimator.options.dynamical_decoupling.sequence_type = "XpXm"

    if twirl:
        estimator.options.twirling.enable_gates = True
        estimator.options.twirling.num_randomizations = 32

    isa_obs = obs.apply_layout(isa_circuit.layout)
    job = estimator.run([(isa_circuit, isa_obs)])
    job_id = job.job_id()
    print(f"    Job ID: {job_id}")
    print(f"    Waiting...")

    result = job.result()
    energy = float(result[0].data.evs)
    std = float(result[0].data.stds)
    error_kcal = abs(energy - fci_energy) * KCAL_PER_HARTREE
    chem_acc = bool(error_kcal < CHEMICAL_ACCURACY_KCAL)

    try:
        metrics = job.metrics()
        qpu_seconds = metrics.get('usage', {}).get('quantum_seconds', None)
    except Exception:
        qpu_seconds = None

    marker = " ** CHEMICAL ACCURACY **" if chem_acc else ""
    print(f"    Energy: {energy:.6f} +/- {std:.6f} Ha")
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
        'energy_hartree': round(energy, 6),
        'std_hartree': round(std, 6),
        'error_kcal_mol': round(error_kcal, 2),
        'chemical_accuracy': chem_acc,
        'qpu_seconds': qpu_seconds,
    }


# ============================================================
# Offline Reanalysis of Existing IBM Data
# ============================================================

def reanalyze_existing_data():
    """Reanalyze existing Peruzzo IBM results with offline post-selection."""
    result_file = RESULTS_DIR / "peruzzo2014-ibm-torino.json"
    if not result_file.exists():
        print("  No existing IBM HeH+ data found, skipping offline reanalysis")
        return None

    with open(result_file) as f:
        data = json.load(f)

    print("\n--- Offline Reanalysis of Existing IBM HeH+ Data ---")
    reanalysis = []

    for sweep in data['analysis']['sweep_results']:
        R = sweep['bond_distance']
        fci = sweep['fci_energy']
        raw = sweep['raw_counts']

        # Recompute with post-selection on Z-basis
        z_counts = raw['z_basis']
        x_counts = raw['x_basis']
        y_counts = raw['y_basis']

        # The coefficients need to be computed for each distance
        heh = compute_heh_coefficients(R)
        coeffs = heh['coefficients']

        z_total = sum(z_counts.values())
        x_total = sum(x_counts.values())
        y_total = sum(y_counts.values())

        # Raw energy from counts
        def expval(counts, qubits, total):
            ev = 0.0
            for bs, count in counts.items():
                sign = 1
                for q in qubits:
                    if bs[-(q + 1)] == '1':
                        sign *= -1
                ev += sign * count
            return ev / total

        ez0_raw = expval(z_counts, [0], z_total)
        ez1_raw = expval(z_counts, [1], z_total)
        exx_raw = expval(x_counts, [0, 1], x_total)
        eyy_raw = expval(y_counts, [0, 1], y_total)

        # NOTE: The IBM Peruzzo results used circuit convention X(q0), Ry(q1),
        # CNOT(q1,q0). In that convention, Z0 = X qubit (= g2), Z1 = Ry qubit
        # (= g1). So we swap g1<->g2 relative to the measured Z0/Z1.
        e_raw = (coeffs['g0'] + coeffs['g2'] * ez0_raw + coeffs['g1'] * ez1_raw
                 + coeffs['g4'] * exx_raw + coeffs['g5'] * eyy_raw)

        # Post-selected (odd parity)
        z_ps = {}
        for bs, count in z_counts.items():
            bits = bs[-2:]
            if int(bits[0]) ^ int(bits[1]) == 1:
                z_ps[bs] = count
        z_ps_total = sum(z_ps.values())
        keep_frac = z_ps_total / z_total if z_total > 0 else 0

        if z_ps_total > 0:
            ez0_ps = expval(z_ps, [0], z_ps_total)
            ez1_ps = expval(z_ps, [1], z_ps_total)
            # Same swap: g2->Z0, g1->Z1
            e_ps = (coeffs['g0'] + coeffs['g2'] * ez0_ps + coeffs['g1'] * ez1_ps
                    + coeffs['g4'] * exx_raw + coeffs['g5'] * eyy_raw)
        else:
            e_ps = e_raw

        err_raw = abs(e_raw - fci) * KCAL_PER_HARTREE
        err_ps = abs(e_ps - fci) * KCAL_PER_HARTREE

        print(f"  R={R:.2f}: raw={err_raw:.1f}, PS={err_ps:.1f} kcal/mol "
              f"(keep={keep_frac:.1%}, |g1|/|g4|={heh['amplification_ratio']})")

        reanalysis.append({
            'bond_distance': R,
            'fci_energy': round(fci, 6),
            'energy_raw': round(e_raw, 6),
            'error_raw_kcal': round(err_raw, 2),
            'energy_postselected': round(e_ps, 6),
            'error_postselected_kcal': round(err_ps, 2),
            'postselection_keep_fraction': round(keep_frac, 4),
            'amplification_ratio': heh['amplification_ratio'],
            'improvement_factor': round(err_raw / err_ps, 2) if err_ps > 0 else float('inf'),
        })

    return reanalysis


# ============================================================
# Main
# ============================================================

def main():
    parser = argparse.ArgumentParser(description='IBM HeH+ VQE Mitigation Ladder')
    parser.add_argument('--compute-only', action='store_true',
                        help='Compute coefficients only, no hardware')
    parser.add_argument('--distances', type=float, nargs='+',
                        default=[0.75, 1.0, 1.5],
                        help='Bond distances to test (default: 0.75 1.0 1.5)')
    parser.add_argument('--shots', type=int, default=4096)
    args = parser.parse_args()

    print("=" * 65)
    print("HeH+ VQE MITIGATION LADDER — Coefficient Amplification Test")
    print("=" * 65)
    print(f"\nPrediction: TREX will reduce error from ~91 to ~20-30 kcal/mol")
    print(f"            (3-4x improvement, NOT chemical accuracy)")
    print(f"            Reason: |g1|/|g4| = 7.8 (vs 4.4 for H2)")

    # Step 1: Compute coefficients for all distances
    print(f"\n--- Computing HeH+ sector-projected coefficients ---")
    configs = []
    for R in args.distances:
        heh = compute_heh_coefficients(R)
        c = heh['coefficients']
        print(f"\n  R={R:.2f} A:")
        print(f"    FCI = {heh['fci_energy']:.6f} Ha")
        print(f"    2q optimal = {heh['energy_2q_optimal']:.6f} Ha "
              f"(gap: {heh['energy_2q_gap_kcal']:.2f} kcal/mol)")
        print(f"    alpha = {heh['alpha_optimal']:.6f} rad")
        print(f"    g0={c['g0']:.6f}, g1={c['g1']:.6f}, g2={c['g2']:.6f}")
        print(f"    g4={c['g4']:.6f}, g5={c['g5']:.6f}")
        print(f"    |g1|/|g4| = {heh['amplification_ratio']}")
        configs.append(heh)

    # Step 2: Offline reanalysis of existing IBM data
    print(f"\n--- Offline Reanalysis ---")
    reanalysis = reanalyze_existing_data()

    if args.compute_only:
        # Save coefficient data
        output = {
            'id': 'heh-coefficients',
            'generated': datetime.now(timezone.utc).isoformat(),
            'configs': configs,
            'reanalysis': reanalysis,
            'h2_comparison': {
                'g1': 0.397937,
                'g4': 0.090466,
                'ratio': 4.4,
                'trex_error_kcal': 0.22,
            },
        }
        out_path = RESULTS_DIR / 'heh-coefficients.json'
        with open(out_path, 'w') as f:
            json.dump(output, f, indent=2, cls=NumpyEncoder)
        print(f"\nSaved: {out_path}")
        return

    # Step 3: Connect to IBM and run mitigation ladder
    service, backend = connect_ibm()

    all_results = []
    for cfg in configs:
        R = cfg['bond_distance']
        alpha = cfg['alpha_optimal']
        coeffs = cfg['coefficients']
        fci = cfg['fci_energy']

        print(f"\n{'='*65}")
        print(f"R = {R:.2f} A (FCI = {fci:.6f} Ha, alpha = {alpha:.6f})")
        print(f"{'='*65}")

        qc = build_heh_circuit(alpha)
        obs = build_heh_hamiltonian(coeffs)
        isa = transpile_circuit(qc, backend)

        distance_results = {
            'bond_distance': R,
            'fci_energy': round(fci, 6),
            'alpha': round(alpha, 6),
            'coefficients': coeffs,
            'amplification_ratio': cfg['amplification_ratio'],
            'jobs': [],
        }

        # Job 1: Raw baseline (resilience=0)
        job = run_estimator_job(
            backend, isa, obs, f"R={R:.2f} Raw (resilience=0)",
            fci_energy=fci, shots=args.shots, resilience_level=0)
        distance_results['jobs'].append(job)

        # Job 2: TREX (resilience=1) — the key test
        job = run_estimator_job(
            backend, isa, obs, f"R={R:.2f} TREX (resilience=1)",
            fci_energy=fci, shots=args.shots, resilience_level=1)
        distance_results['jobs'].append(job)

        # Job 3: TREX + DD
        job = run_estimator_job(
            backend, isa, obs, f"R={R:.2f} TREX+DD",
            fci_energy=fci, shots=args.shots, resilience_level=1, dd=True)
        distance_results['jobs'].append(job)

        all_results.append(distance_results)

    # Step 4: Build ranking and save
    print(f"\n{'='*80}")
    print("HeH+ MITIGATION LADDER RESULTS")
    print(f"{'='*80}")
    print(f"{'Rank':<5} {'R(A)':<6} {'Method':<30} {'Error(kcal)':<14} {'ChemAcc':<9} {'Job ID'}")
    print("-" * 80)

    all_jobs = []
    for dr in all_results:
        for job in dr['jobs']:
            all_jobs.append({**job, 'bond_distance': dr['bond_distance']})
    all_jobs.sort(key=lambda j: j['error_kcal_mol'])

    for i, j in enumerate(all_jobs, 1):
        ca = "YES" if j['chemical_accuracy'] else "no"
        print(f"{i:<5} {j['bond_distance']:<6.2f} {j['label']:<30} "
              f"{j['error_kcal_mol']:<14.2f} {ca:<9} {j['job_id'][:12]}")

    # Prediction evaluation
    print(f"\n--- Prediction Evaluation ---")
    trex_jobs = [j for j in all_jobs if 'TREX' in j['label'] and 'DD' not in j['label']]
    raw_jobs = [j for j in all_jobs if 'Raw' in j['label']]

    for r_trex in trex_jobs:
        R = r_trex['bond_distance']
        r_raw = next((j for j in raw_jobs if j['bond_distance'] == R), None)
        if r_raw:
            improvement = r_raw['error_kcal_mol'] / r_trex['error_kcal_mol']
            print(f"  R={R:.2f}: Raw={r_raw['error_kcal_mol']:.1f} -> TREX={r_trex['error_kcal_mol']:.1f} "
                  f"kcal/mol ({improvement:.1f}x improvement)")
            if r_trex['error_kcal_mol'] < CHEMICAL_ACCURACY_KCAL:
                print(f"    SURPRISE: Chemical accuracy achieved! Prediction WRONG.")
            elif r_trex['error_kcal_mol'] < 30:
                print(f"    Prediction CONFIRMED: TREX helps but insufficient for chem. accuracy")
            else:
                print(f"    Prediction PARTIALLY confirmed: TREX improvement less than expected")

    # H2 vs HeH+ comparison
    print(f"\n--- H2 vs HeH+ Comparison ---")
    print(f"  H2 (R=0.735):  TREX = 0.22 kcal/mol  (|g1|/|g4| = 4.4)")
    for r_trex in trex_jobs:
        R = r_trex['bond_distance']
        cfg = next(c for c in configs if c['bond_distance'] == R)
        print(f"  HeH+ (R={R:.2f}): TREX = {r_trex['error_kcal_mol']:.2f} kcal/mol  "
              f"(|g1|/|g4| = {cfg['amplification_ratio']})")
        ratio = r_trex['error_kcal_mol'] / 0.22
        print(f"    HeH+ TREX error is {ratio:.0f}x worse than H2 TREX")

    # Save results
    output = {
        'schema_version': '1.0',
        'id': 'vqe-heh-mitigation-ladder-001-ibm',
        'type': 'vqe_mitigation_ladder',
        'molecule': 'HeH+',
        'backend': backend.name,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'prediction': {
            'source': 'research/failure-analysis.md',
            'claim': 'TREX reduces HeH+ error 3-4x but not to chemical accuracy',
            'reason': 'Coefficient amplification: |g1|/|g4| = 7.8 vs 4.4 for H2',
        },
        'h2_reference': {
            'trex_error_kcal': 0.22,
            'raw_error_kcal': 26.2,
            'g1_g4_ratio': 4.4,
        },
        'distances': all_results,
        'ranking': [{
            'rank': i + 1,
            'bond_distance': j['bond_distance'],
            'label': j['label'],
            'error_kcal': j['error_kcal_mol'],
            'chemical_accuracy': j['chemical_accuracy'],
            'job_id': j['job_id'],
        } for i, j in enumerate(all_jobs)],
        'reanalysis_existing': reanalysis,
        'configs': configs,
        'environment': 'experiments/environment.json',
    }

    out_path = RESULTS_DIR / 'vqe-heh-mitigation-ladder-001-ibm.json'
    with open(out_path, 'w') as f:
        json.dump(output, f, indent=2, cls=NumpyEncoder)
    print(f"\nSaved: {out_path}")


if __name__ == '__main__':
    main()
