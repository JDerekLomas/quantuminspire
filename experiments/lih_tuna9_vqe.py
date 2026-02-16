#!/usr/bin/env python3
"""LiH 4-qubit VQE on Tuna-9 hardware.

End-to-end: PySCF integrals → classical VQE → native cQASM → submit.
Uses CASCI(2,2) active space → 4 qubits via Jordan-Wigner.
Physical qubit map: {0:2, 1:4, 2:6, 3:8} (linear chain on Tuna-9).

Gate set: CZ, Ry, Rz, X only.
CNOT(c,t) → Ry(-π/2) t; CZ c,t; Ry(π/2) t
H(q)      → Rz(π) q; Ry(π/2) q
Sdg(q)    → Rz(-π/2) q
"""

import json
import sys
import numpy as np
from pathlib import Path
from itertools import product
from scipy.optimize import minimize

# ── PySCF + OpenFermion: compute Hamiltonian ──────────────────────────────

def compute_hamiltonian(R=1.6):
    """Compute 4-qubit LiH Hamiltonian via CASCI(2,2)."""
    import pyscf
    from pyscf import gto, scf, mcscf, ao2mo
    from openfermion import InteractionOperator, get_fermion_operator
    from openfermion.transforms import jordan_wigner
    from openfermion.utils import count_qubits
    from openfermion.linalg import get_sparse_operator
    from openfermion.chem.molecular_data import spinorb_from_spatial
    from openfermionpyscf import run_pyscf
    from openfermion.chem import MolecularData

    # Full molecule for reference energies
    geometry = [("Li", (0, 0, 0)), ("H", (0, 0, R))]
    mol_data = MolecularData(geometry, "sto-3g", 1, 0)
    mol_data = run_pyscf(mol_data, run_scf=True, run_fci=True)
    E_HF_full = mol_data.hf_energy
    E_FCI_full = mol_data.fci_energy

    # CASCI(2,2) active space
    mol = gto.M(atom=f"Li 0 0 0; H 0 0 {R}", basis="sto-3g", verbose=0)
    mf = scf.RHF(mol).run()
    mc = mcscf.CASCI(mf, ncas=2, nelecas=2)
    mc.kernel()
    E_CASCI = mc.e_tot

    # Active space integrals
    h1e, ecore = mc.get_h1eff()
    h2e = ao2mo.restore(1, mc.get_h2eff(), 2)

    # PySCF chemist's notation → OpenFermion physicist's notation
    h2e_of = np.asarray(h2e.transpose(0, 2, 3, 1), order='C')
    one_body, two_body = spinorb_from_spatial(h1e, h2e_of)
    active_h = InteractionOperator(ecore, one_body, 0.5 * two_body)
    qubit_h = jordan_wigner(get_fermion_operator(active_h))

    # Extract Pauli terms
    n_qubits = count_qubits(qubit_h)
    pauli_terms = {}
    for term, coeff in qubit_h.terms.items():
        if abs(coeff) < 1e-10:
            continue
        coeff = float(np.real(coeff))
        pauli_str = ["I"] * n_qubits
        for qubit_idx, pauli_op in term:
            pauli_str[qubit_idx] = pauli_op
        key = "".join(pauli_str)
        pauli_terms[key] = pauli_terms.get(key, 0) + coeff
    pauli_terms = {k: v for k, v in pauli_terms.items() if abs(v) > 1e-10}

    # Build Hamiltonian matrix for classical VQE
    H_mat = get_sparse_operator(qubit_h).toarray()

    # Verify: diagonalize
    eigenvalues = np.linalg.eigvalsh(H_mat)
    E_exact = eigenvalues[0]
    assert abs(E_exact - E_CASCI) < 1e-6, f"Mismatch: {E_exact} vs {E_CASCI}"

    print(f"  LiH at R = {R} A")
    print(f"  E_HF (full)  = {E_HF_full:.6f} Ha")
    print(f"  E_FCI (full) = {E_FCI_full:.6f} Ha")
    print(f"  E_CASCI(2,2) = {E_CASCI:.6f} Ha  ← target")
    print(f"  Pauli terms: {len(pauli_terms)}")
    print(f"  Correlation captured: {(E_CASCI - E_HF_full)/(E_FCI_full - E_HF_full)*100:.1f}%")

    return {
        "R": R,
        "n_qubits": n_qubits,
        "pauli_terms": pauli_terms,
        "H_mat": H_mat,
        "E_HF": float(E_HF_full),
        "E_FCI": float(E_FCI_full),
        "E_CASCI": float(E_CASCI),
        "E_exact": float(E_exact),
    }


# ── Classical VQE ─────────────────────────────────────────────────────────

def ansatz_statevector(params, n_qubits=4):
    """Hardware-efficient ansatz: HF |1100⟩ → Ry layer → CNOT chain → Ry layer.

    Uses OpenFermion MSB convention: qubit 0 = MSB (leftmost in ket).
    |1100⟩ means q0=1, q1=1, q2=0, q3=0 → index = 8+4 = 12.
    This matches get_sparse_operator so H_mat @ state gives correct energy.
    """
    dim = 2 ** n_qubits
    # HF state: q0=1, q1=1 (lowest spin-orbitals occupied)
    # In MSB convention: |1100⟩ = index 12
    state = np.zeros(dim, dtype=complex)
    state[0b1100] = 1.0

    def ry(theta):
        c, s = np.cos(theta / 2), np.sin(theta / 2)
        return np.array([[c, -s], [s, c]], dtype=complex)

    def apply_1q(state, gate, q):
        """Apply gate to qubit q (MSB convention: q=0 is MSB)."""
        n = len(state)
        bit_pos = n_qubits - 1 - q
        new = np.zeros(n, dtype=complex)
        for i in range(n):
            bit = (i >> bit_pos) & 1
            i0 = i & ~(1 << bit_pos)
            i1 = i0 | (1 << bit_pos)
            if bit == 0:
                new[i] += gate[0, 0] * state[i0] + gate[0, 1] * state[i1]
            else:
                new[i] += gate[1, 0] * state[i0] + gate[1, 1] * state[i1]
        return new

    def apply_cnot(state, ctrl, tgt):
        """Apply CNOT (MSB convention)."""
        ctrl_pos = n_qubits - 1 - ctrl
        tgt_pos = n_qubits - 1 - tgt
        new = state.copy()
        for i in range(len(state)):
            if (i >> ctrl_pos) & 1:
                j = i ^ (1 << tgt_pos)
                new[i], new[j] = state[j], state[i]
        return new

    # Layer 1: Ry rotations
    for q in range(n_qubits):
        state = apply_1q(state, ry(params[q]), q)

    # CNOT chain
    for q in range(n_qubits - 1):
        state = apply_cnot(state, q, q + 1)

    # Layer 2: Ry rotations
    for q in range(n_qubits):
        state = apply_1q(state, ry(params[n_qubits + q]), q)

    return state


def classical_vqe(H_mat, n_qubits=4, n_trials=50):
    """Find optimal parameters via classical VQE."""
    n_params = 2 * n_qubits

    def cost(params):
        state = ansatz_statevector(params, n_qubits)
        return float(np.real(state.conj() @ H_mat @ state))

    # Eigenvalue bounds for sanity checking
    eigenvalues = np.linalg.eigvalsh(H_mat)
    E_ground = eigenvalues[0]

    best_E = 1e10
    best_params = None
    np.random.seed(42)

    for trial in range(n_trials):
        x0 = np.random.randn(n_params) * 0.5
        res = minimize(cost, x0, method='COBYLA',
                       options={'maxiter': 5000, 'rhobeg': 0.3})
        if res.fun < best_E:
            best_E = res.fun
            best_params = res.x.copy()

    error_mHa = abs(best_E - E_ground) * 1000
    print(f"  VQE energy:  {best_E:.6f} Ha")
    print(f"  Exact:       {E_ground:.6f} Ha")
    print(f"  VQE error:   {error_mHa:.3f} mHa")
    print(f"  Params: {best_params}")

    # Sanity check: VQE energy should be >= ground state
    assert best_E >= E_ground - 0.001, f"VQE below ground state: {best_E} < {E_ground}"

    return best_params, best_E


# ── Measurement grouping ──────────────────────────────────────────────────

def group_pauli_terms(pauli_terms):
    """Group Pauli terms by measurement basis (commuting sets)."""
    def basis_key(term):
        return tuple((i, c) for i, c in enumerate(term) if c in ('X', 'Y'))

    groups = {}
    for term, coeff in pauli_terms.items():
        key = basis_key(term)
        if key not in groups:
            groups[key] = []
        groups[key].append((term, coeff))

    # Name each group
    named_groups = {}
    circuit_term_map = {}
    for key, terms in groups.items():
        if key == ():
            name = "Z"
        else:
            name = "_".join(f"q{idx}{op}" for idx, op in key)
        named_groups[name] = {"basis_rotations": list(key), "terms": terms}
        circuit_term_map[name] = [t[0] for t in terms]

    return named_groups, circuit_term_map


# ── Native cQASM 3.0 circuit generation ──────────────────────────────────

QMAP = {0: 2, 1: 4, 2: 6, 3: 8}  # logical → physical
N_PHYSICAL = 9
PI = np.pi


def gen_native_cqasm(params, basis_rotations=None, n_qubits=4):
    """Generate native cQASM 3.0 circuit for Tuna-9.

    Gate decompositions:
      X(q) → X q[phys]
      Ry(θ, q) → Ry(θ) q[phys]
      CNOT(c,t) → Ry(-π/2) q[phys_t]; CZ q[phys_c],q[phys_t]; Ry(π/2) q[phys_t]
      H(q) → Rz(π) q[phys]; Ry(π/2) q[phys]
      Sdg(q) → Rz(-π/2) q[phys]
    """
    lines = [
        "version 3.0",
        f"qubit[{N_PHYSICAL}] q",
        f"bit[{N_PHYSICAL}] b",
        "",
    ]

    def phys(logical_q):
        return QMAP[logical_q]

    # HF state |0011⟩: X on q0, q1
    lines.append(f"X q[{phys(0)}]")
    lines.append(f"X q[{phys(1)}]")
    lines.append("")

    # Layer 1: Ry rotations
    for q in range(n_qubits):
        lines.append(f"Ry({params[q]:.10f}) q[{phys(q)}]")
    lines.append("")

    # CNOT chain: cx q[i], q[i+1] → Ry(-π/2) target; CZ ctrl,target; Ry(π/2) target
    for i in range(n_qubits - 1):
        ctrl, tgt = phys(i), phys(i + 1)
        lines.append(f"Ry({-PI/2:.10f}) q[{tgt}]")
        lines.append(f"CZ q[{ctrl}], q[{tgt}]")
        lines.append(f"Ry({PI/2:.10f}) q[{tgt}]")
    lines.append("")

    # Layer 2: Ry rotations
    for q in range(n_qubits):
        lines.append(f"Ry({params[n_qubits + q]:.10f}) q[{phys(q)}]")
    lines.append("")

    # Measurement basis rotations
    if basis_rotations:
        for idx, op in basis_rotations:
            pq = phys(idx)
            if op == 'X':
                # H = Rz(π) Ry(π/2)
                lines.append(f"Rz({PI:.10f}) q[{pq}]")
                lines.append(f"Ry({PI/2:.10f}) q[{pq}]")
            elif op == 'Y':
                # Sdg + H = Rz(-π/2) then Rz(π) Ry(π/2) = Rz(π/2) Ry(π/2)
                lines.append(f"Rz({PI/2:.10f}) q[{pq}]")
                lines.append(f"Ry({PI/2:.10f}) q[{pq}]")
        lines.append("")

    # Measure all physical qubits
    lines.append("b = measure q")
    lines.append("")

    return "\n".join(lines)


def gen_cal_circuits():
    """Generate REM calibration circuits for 4 logical qubits.

    Prepare |00⟩, |01⟩, |10⟩, |11⟩ on logical qubits 0,1
    (physical qubits 2,4) and measure all.
    Also for logical qubits 2,3 (physical 6,8).
    """
    cals = {}
    # 2-qubit calibration on all 4 logical qubits
    for bits in ["0000", "0001", "0010", "0011",
                 "0100", "0101", "0110", "0111",
                 "1000", "1001", "1010", "1011",
                 "1100", "1101", "1110", "1111"]:
        lines = [
            "version 3.0",
            f"qubit[{N_PHYSICAL}] q",
            f"bit[{N_PHYSICAL}] b",
            "",
        ]
        for i, bit in enumerate(bits):
            pq = QMAP[i]
            if bit == "1":
                lines.append(f"X q[{pq}]")
            else:
                # No-op: Ry(0) to avoid empty circuit bug
                lines.append(f"Ry(0) q[{pq}]")
        lines.append("")
        lines.append("b = measure q")
        lines.append("")
        cals[f"cal_{bits}"] = "\n".join(lines)

    return cals


# ── Energy computation from counts ───────────────────────────────────────

def parity_from_counts(bitstring_9q, qubit_indices):
    """Compute parity for specific qubits from 9-qubit MSB-first bitstring.

    Convention: label position q = OpenFermion qubit q = logical qubit q.
    No reversal needed since classical VQE uses MSB convention matching OpenFermion.
    """
    p = 0
    for q in qubit_indices:
        phys_q = QMAP[q]  # direct mapping: label position = logical qubit
        pos = N_PHYSICAL - 1 - phys_q  # MSB-first position
        p ^= int(bitstring_9q[pos])
    return p


def expectation(counts, pauli_label):
    """Compute ⟨P⟩ from measurement counts."""
    active = [i for i, p in enumerate(pauli_label) if p != "I"]
    if not active:
        return 1.0
    total = sum(counts.values())
    exp_val = 0.0
    for bs, count in counts.items():
        p = parity_from_counts(bs, active)
        exp_val += count * ((-1) ** p)
    return exp_val / total


def compute_energy(all_counts, circuit_term_map, pauli_terms):
    """Compute VQE energy from measurement counts."""
    energy = 0.0
    for circuit_name, term_labels in circuit_term_map.items():
        counts = all_counts.get(circuit_name)
        if counts is None:
            print(f"  WARNING: missing counts for {circuit_name}")
            continue
        for label in term_labels:
            coeff = pauli_terms[label]
            if label == "IIII":
                energy += coeff
            else:
                energy += coeff * expectation(counts, label)
    return energy


def apply_rem(all_counts, cal_counts, circuit_term_map, pauli_terms):
    """Apply readout error mitigation using confusion matrix."""
    # Build 4-qubit confusion matrix from calibration data
    n_states = 16
    confusion = np.zeros((n_states, n_states))

    for prep_idx, prep_bits in enumerate(
        [f"{i:04b}" for i in range(16)]
    ):
        cal_key = f"cal_{prep_bits}"
        counts = cal_counts.get(cal_key, {})
        if not counts:
            continue
        total = sum(counts.values())
        for bs, count in counts.items():
            # Extract logical qubit values from 9-qubit bitstring
            measured_bits = ""
            for lq in range(4):
                pq = QMAP[lq]
                pos = N_PHYSICAL - 1 - pq
                measured_bits += bs[pos]
            meas_idx = int(measured_bits, 2)
            confusion[meas_idx, prep_idx] += count / total

    # Invert confusion matrix
    cond = np.linalg.cond(confusion)
    print(f"  Confusion matrix condition number: {cond:.3f}")

    if cond > 100:
        print("  WARNING: ill-conditioned confusion matrix, skipping REM")
        return compute_energy(all_counts, circuit_term_map, pauli_terms)

    confusion_inv = np.linalg.inv(confusion)

    # Apply REM to each circuit's counts
    rem_energy = 0.0
    for circuit_name, term_labels in circuit_term_map.items():
        counts = all_counts.get(circuit_name)
        if counts is None:
            continue

        # Build probability vector
        total = sum(counts.values())
        prob_raw = np.zeros(n_states)
        for bs, count in counts.items():
            measured_bits = ""
            for lq in range(4):
                pq = QMAP[lq]
                pos = N_PHYSICAL - 1 - pq
                measured_bits += bs[pos]
            idx = int(measured_bits, 2)
            prob_raw[idx] += count / total

        # Correct
        prob_rem = confusion_inv @ prob_raw
        # Clip negative probabilities
        prob_rem = np.maximum(prob_rem, 0)
        prob_rem /= prob_rem.sum()

        # Compute expectations from corrected distribution
        for label in term_labels:
            coeff = pauli_terms[label]
            if label == "IIII":
                rem_energy += coeff
            else:
                active = [i for i, p in enumerate(label) if p != "I"]
                exp_val = 0.0
                for state_idx in range(n_states):
                    bits = f"{state_idx:04b}"
                    p = sum(int(bits[q]) for q in active) % 2
                    exp_val += prob_rem[state_idx] * ((-1) ** p)
                rem_energy += coeff * exp_val

    return rem_energy


# ── Main ──────────────────────────────────────────────────────────────────

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "generate"
    results_dir = Path(__file__).parent / "results"

    if mode == "generate":
        print("=" * 60)
        print("  LiH 4-qubit VQE — Generate circuits for Tuna-9")
        print("=" * 60)

        # Step 1: Hamiltonian
        print("\n--- Hamiltonian ---")
        ham = compute_hamiltonian(R=1.6)

        # Step 2: Classical VQE
        print("\n--- Classical VQE ---")
        params, E_vqe = classical_vqe(ham["H_mat"], n_qubits=4, n_trials=50)

        # Step 3: Group Pauli terms
        groups, circuit_term_map = group_pauli_terms(ham["pauli_terms"])
        print(f"\n  Measurement circuits: {len(groups)}")
        for name, g in groups.items():
            print(f"    {name}: {len(g['terms'])} terms")

        # Step 4: Generate native cQASM circuits
        print("\n--- Native cQASM circuits ---")
        circuits = {}
        for name, g in groups.items():
            rotations = g["basis_rotations"] if g["basis_rotations"] else None
            circuits[name] = gen_native_cqasm(params, rotations)

        # Step 5: Calibration circuits
        cal_circuits = gen_cal_circuits()
        print(f"  Cal circuits: {len(cal_circuits)}")

        # Save everything
        output = {
            "molecule": "LiH",
            "R_angstrom": 1.6,
            "basis": "sto-3g",
            "active_space": "CASCI(2,2)",
            "n_qubits": 4,
            "n_params": len(params),
            "optimal_params": params.tolist(),
            "E_HF": ham["E_HF"],
            "E_FCI": ham["E_FCI"],
            "E_CASCI": ham["E_CASCI"],
            "E_VQE_classical": float(E_vqe),
            "pauli_terms": ham["pauli_terms"],
            "circuit_term_map": circuit_term_map,
            "qubit_map": QMAP,
            "physical_qubits": N_PHYSICAL,
            "circuits": circuits,
            "cal_circuits": cal_circuits,
        }

        outfile = results_dir / "lih-4qubit-tuna9-native.json"
        with open(outfile, "w") as f:
            json.dump(output, f, indent=2)
        print(f"\n  Saved: {outfile}")
        print(f"  Total circuits: {len(circuits)} VQE + {len(cal_circuits)} cal")

        # Verify on emulator
        print("\n--- Emulator verification ---")
        try:
            import qxelarator
            all_counts = {}
            for name, circuit in circuits.items():
                result = qxelarator.execute_string(circuit, iterations=100000)
                if hasattr(result, 'results'):
                    all_counts[name] = result.results
                    total = sum(result.results.values())
                    print(f"  {name}: {total} shots OK")
                else:
                    print(f"  {name}: FAILED")

            if all_counts:
                energy = compute_energy(all_counts, circuit_term_map, ham["pauli_terms"])
                error = abs(energy - ham["E_CASCI"]) * 1000
                print(f"\n  Emulator energy: {energy:.6f} Ha")
                print(f"  Target (CASCI):  {ham['E_CASCI']:.6f} Ha")
                print(f"  Error:           {error:.2f} mHa")
                print(f"  Chemical acc.:   {'YES' if error < 1.6 else 'NO'}")
        except ImportError:
            print("  qxelarator not available, skipping verification")

    elif mode == "submit":
        # Load generated circuits and submit to Tuna-9
        infile = results_dir / "lih-4qubit-tuna9-native.json"
        with open(infile) as f:
            data = json.load(f)

        print("=" * 60)
        print("  LiH 4-qubit VQE — Submit to Tuna-9")
        print("=" * 60)

        from compute_api_client import CompileStage
        from quantuminspire.util.api.remote_backend import RemoteBackend
        from quantuminspire.sdk.models.cqasm_algorithm import CqasmAlgorithm
        from quantuminspire.sdk.models.job_options import JobOptions
        import time

        class PrecompiledAlgorithm(CqasmAlgorithm):
            @property
            def compile_stage(self):
                return CompileStage.ROUTING

        backend = RemoteBackend()
        options = JobOptions(number_of_shots=4096)
        BACKEND_TYPE_ID = 6

        def submit(name, circuit):
            algo = PrecompiledAlgorithm(
                platform_name="Quantum Inspire", program_name=f"lih_{name}")
            algo._content = circuit
            return backend.run(algo, backend_type_id=BACKEND_TYPE_ID, options=options)

        job_ids = {}

        # Submit calibration circuits first
        print("\n--- Calibration circuits ---")
        for name, circuit in data["cal_circuits"].items():
            job_id = submit(name, circuit)
            job_ids[name] = job_id
            print(f"  {name}: job_id={job_id}")
            time.sleep(0.5)

        # Submit VQE circuits (5 reps for statistics)
        n_reps = 5
        print(f"\n--- VQE circuits ({n_reps} reps) ---")
        for rep in range(n_reps):
            for name, circuit in data["circuits"].items():
                key = f"rep{rep}_{name}"
                job_id = submit(key, circuit)
                job_ids[key] = job_id
                print(f"  {key}: job_id={job_id}")
                time.sleep(0.5)

        # Submit end calibration
        print("\n--- End calibration ---")
        for name, circuit in data["cal_circuits"].items():
            end_name = f"end_{name}"
            job_id = submit(end_name, circuit)
            job_ids[end_name] = job_id
            print(f"  {end_name}: job_id={job_id}")
            time.sleep(0.5)

        total = len(job_ids)
        print(f"\n  Total submitted: {total} circuits")
        print(f"    Cal: {len(data['cal_circuits'])} start + {len(data['cal_circuits'])} end")
        print(f"    VQE: {len(data['circuits'])} × {n_reps} reps = {len(data['circuits']) * n_reps}")

        # Save job IDs
        outfile = results_dir / "lih-4qubit-tuna9-jobids.json"
        with open(outfile, "w") as f:
            json.dump({
                "experiment": "LiH 4-qubit VQE on Tuna-9",
                "backend": "Tuna-9",
                "n_shots": 4096,
                "n_reps": n_reps,
                "circuits_file": str(infile),
                "job_ids": job_ids,
            }, f, indent=2)
        print(f"  Job IDs saved: {outfile}")

    elif mode == "analyze":
        # Analyze results
        infile = results_dir / "lih-4qubit-tuna9-native.json"
        with open(infile) as f:
            data = json.load(f)

        counts_file = results_dir / "lih-4qubit-tuna9-counts.json"
        with open(counts_file) as f:
            all_data = json.load(f)

        pauli_terms = data["pauli_terms"]
        circuit_term_map = data["circuit_term_map"]
        E_CASCI = data["E_CASCI"]

        print("=" * 60)
        print("  LiH 4-qubit VQE — Tuna-9 Results Analysis")
        print("=" * 60)

        # Extract calibration counts
        cal_counts = {k: v for k, v in all_data.items() if k.startswith("cal_")}

        # Extract per-rep VQE counts
        n_reps = 5
        rep_energies_raw = []
        rep_energies_rem = []

        for rep in range(n_reps):
            rep_counts = {}
            for name in data["circuits"]:
                key = f"rep{rep}_{name}"
                if key in all_data:
                    rep_counts[name] = all_data[key]

            if not rep_counts:
                print(f"  Rep {rep}: no data")
                continue

            # Raw energy
            E_raw = compute_energy(rep_counts, circuit_term_map, pauli_terms)
            err_raw = abs(E_raw - E_CASCI) * 1000
            rep_energies_raw.append(E_raw)

            # REM energy
            E_rem = apply_rem(rep_counts, cal_counts, circuit_term_map, pauli_terms)
            err_rem = abs(E_rem - E_CASCI) * 1000
            rep_energies_rem.append(E_rem)

            print(f"  Rep {rep}: raw={E_raw:.6f} ({err_raw:.1f} mHa), "
                  f"REM={E_rem:.6f} ({err_rem:.1f} mHa)")

        if rep_energies_raw:
            raw_arr = np.array(rep_energies_raw)
            rem_arr = np.array(rep_energies_rem)

            raw_mean = np.mean(raw_arr)
            raw_std = np.std(raw_arr)
            rem_mean = np.mean(rem_arr)
            rem_std = np.std(rem_arr)

            raw_err = abs(raw_mean - E_CASCI) * 1000
            rem_err = abs(rem_mean - E_CASCI) * 1000

            print(f"\n  --- Summary ({len(rep_energies_raw)} reps) ---")
            print(f"  Raw:  {raw_mean:.6f} ± {raw_std*1000:.1f} mHa  (error: {raw_err:.1f} mHa)")
            print(f"  REM:  {rem_mean:.6f} ± {rem_std*1000:.1f} mHa  (error: {rem_err:.1f} mHa)")
            print(f"  Target (CASCI): {E_CASCI:.6f} Ha")
            print(f"  Chemical accuracy (REM): {'YES' if rem_err < 1.6 else 'NO'}")

            # Save analysis
            analysis = {
                "experiment": "LiH 4-qubit VQE on Tuna-9",
                "molecule": "LiH",
                "R_angstrom": 1.6,
                "E_CASCI": E_CASCI,
                "E_HF": data["E_HF"],
                "E_FCI": data["E_FCI"],
                "n_reps": len(rep_energies_raw),
                "raw": {
                    "energies": [float(e) for e in rep_energies_raw],
                    "mean": float(raw_mean),
                    "std": float(raw_std),
                    "error_mHa": float(raw_err),
                },
                "rem": {
                    "energies": [float(e) for e in rep_energies_rem],
                    "mean": float(rem_mean),
                    "std": float(rem_std),
                    "error_mHa": float(rem_err),
                    "chemical_accuracy": bool(rem_err < 1.6),
                },
            }
            outfile = results_dir / "lih-4qubit-tuna9-analysis.json"
            with open(outfile, "w") as f:
                json.dump(analysis, f, indent=2)
            print(f"\n  Analysis saved: {outfile}")

    else:
        print(f"Usage: {sys.argv[0]} [generate|submit|analyze]")
        print("  generate: compute Hamiltonian, optimize VQE, generate native circuits")
        print("  submit:   submit circuits to Tuna-9 hardware")
        print("  analyze:  analyze hardware results")


if __name__ == "__main__":
    main()
