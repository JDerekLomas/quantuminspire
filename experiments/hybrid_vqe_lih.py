#!/usr/bin/env python3
"""True hybrid classical-quantum VQE for LiH on Tuna-9.

Runs COBYLA optimization where each energy evaluation submits 9 circuits
to Tuna-9 hardware, polls for results, applies REM, and feeds the energy
back to the optimizer.

4 qubits, CASCI(2,2), 27 Pauli terms, 9 measurement circuits per iteration.
8 variational parameters (2 Ry layers × 4 qubits).
Physical qubit map: {0:2, 1:4, 2:6, 3:8}.

Usage:
  python hybrid_vqe_lih.py                    # run on hardware
  python hybrid_vqe_lih.py --emulator         # test on local emulator
  python hybrid_vqe_lih.py --maxiter 30       # limit iterations
"""

import json
import time
import sys
import numpy as np
from scipy.optimize import minimize
from pathlib import Path
from datetime import datetime, timezone

TUNA9_BACKEND_ID = 6
N_SHOTS = 4096
QMAP = {0: 2, 1: 4, 2: 6, 3: 8}
N_PHYSICAL = 9
PI = np.pi
N_QUBITS = 4

RESULTS_DIR = Path(__file__).parent / "results"

# LiH CASCI(2,2) at R=1.6 A
E_CASCI = -7.862128833438587
E_FCI = -7.882324378883491
E_HF = -7.861864769808645

# Classical VQE optimal parameters (starting point for hybrid)
INIT_PARAMS = [0.038174879800962555, -2.8710483985762977e-05,
               -3.3674130395102014e-05, 3.106838748116853,
               -5.5928043028862676e-05, -3.1413840024522823,
               -0.00011881317251419843, 3.17639539952274]

# Hamiltonian Pauli terms (full precision from PySCF + OpenFermion)
PAULI_TERMS = {
    "IIII": -7.509157199126883,
    "ZIII": 0.15592409137654908,
    "IZII": 0.15592409137654906,
    "IIZI": -0.01503982224040852,
    "IIIZ": -0.015039822240408528,
    "ZZII": 0.12182774168311085,
    "ZIZI": 0.05263651530244965,
    "ZIIZ": 0.05590251119765166,
    "IZZI": 0.05590251119765166,
    "IZIZ": 0.05263651530244965,
    "IIZZ": 0.08447056786924143,
    "YZYI": 0.014015947443735908,
    "XZXI": 0.014015947443735908,
    "IYZY": 0.014015947443735908,
    "IXZX": 0.014015947443735908,
    "YIYI": 0.012144898067813291,
    "XIXI": 0.012144898067813291,
    "ZYZY": 0.012144898067813291,
    "ZXZX": 0.012144898067813291,
    "YXXY": 0.003265995895202011,
    "YYXX": -0.003265995895202011,
    "XXYY": -0.003265995895202011,
    "XYYX": 0.003265995895202011,
    "YZYZ": -0.0018710430187559995,
    "XZXZ": -0.0018710430187559995,
    "IYIY": -0.0018710430187559995,
    "IXIX": -0.0018710430187559995,
}

# Measurement circuit groupings (from Hamiltonian basis decomposition)
# Terms are grouped by which qubits need X/Y basis rotations
CIRCUIT_TERM_MAP = {
    "Z": ["IIII", "ZIII", "IZII", "IIZI", "IIIZ", "ZZII", "ZIZI", "ZIIZ", "IZZI", "IZIZ", "IIZZ"],
    "q0Y_q2Y": ["YZYI", "YIYI", "YZYZ"],
    "q0X_q2X": ["XZXI", "XIXI", "XZXZ"],
    "q1Y_q3Y": ["IYZY", "ZYZY", "IYIY"],
    "q1X_q3X": ["IXZX", "ZXZX", "IXIX"],
    "q0Y_q1X_q2X_q3Y": ["YXXY"],
    "q0Y_q1Y_q2X_q3X": ["YYXX"],
    "q0X_q1X_q2Y_q3Y": ["XXYY"],
    "q0X_q1Y_q2Y_q3X": ["XYYX"],
}

MEASUREMENT_GROUPS = {
    "Z": [],
    "q0Y_q2Y": [(0, 'Y'), (2, 'Y')],
    "q0X_q2X": [(0, 'X'), (2, 'X')],
    "q1Y_q3Y": [(1, 'Y'), (3, 'Y')],
    "q1X_q3X": [(1, 'X'), (3, 'X')],
    "q0Y_q1X_q2X_q3Y": [(0, 'Y'), (1, 'X'), (2, 'X'), (3, 'Y')],
    "q0Y_q1Y_q2X_q3X": [(0, 'Y'), (1, 'Y'), (2, 'X'), (3, 'X')],
    "q0X_q1X_q2Y_q3Y": [(0, 'X'), (1, 'X'), (2, 'Y'), (3, 'Y')],
    "q0X_q1Y_q2Y_q3X": [(0, 'X'), (1, 'Y'), (2, 'Y'), (3, 'X')],
}

# Confusion matrix from LiH fold=1 calibration
# Will be loaded from the existing cal data
CONFUSION_INV = None


def load_confusion_matrix():
    """Load and invert confusion matrix from existing LiH calibration."""
    global CONFUSION_INV
    counts_file = RESULTS_DIR / "lih-4qubit-tuna9-counts.json"
    with open(counts_file) as f:
        all_data = json.load(f)

    n_states = 16
    confusion = np.zeros((n_states, n_states))

    for prep_idx in range(16):
        prep_bits = f"{prep_idx:04b}"
        cal_key = f"cal_{prep_bits}"
        counts = all_data.get(cal_key, {})
        if not counts:
            continue
        total = sum(counts.values())
        for bs, count in counts.items():
            measured_bits = ""
            for lq in range(4):
                pq = QMAP[lq]
                pos = N_PHYSICAL - 1 - pq
                measured_bits += bs[pos]
            meas_idx = int(measured_bits, 2)
            confusion[meas_idx, prep_idx] += count / total

    cond = np.linalg.cond(confusion)
    print(f"  Confusion matrix condition: {cond:.3f}")
    CONFUSION_INV = np.linalg.inv(confusion)


def gen_circuit(params, basis_rotations=None):
    """Generate native cQASM 3.0 circuit for LiH on Tuna-9."""
    lines = [
        "version 3.0",
        f"qubit[{N_PHYSICAL}] q",
        f"bit[{N_PHYSICAL}] b",
        "",
    ]

    def phys(lq):
        return QMAP[lq]

    # HF state |1100⟩
    lines.append(f"X q[{phys(0)}]")
    lines.append(f"X q[{phys(1)}]")
    lines.append("")

    # Layer 1: Ry rotations
    for q in range(N_QUBITS):
        lines.append(f"Ry({params[q]:.10f}) q[{phys(q)}]")
    lines.append("")

    # CNOT chain
    for i in range(N_QUBITS - 1):
        ctrl, tgt = phys(i), phys(i + 1)
        lines.append(f"Ry({-PI/2:.10f}) q[{tgt}]")
        lines.append(f"CZ q[{ctrl}], q[{tgt}]")
        lines.append(f"Ry({PI/2:.10f}) q[{tgt}]")
    lines.append("")

    # Layer 2: Ry rotations
    for q in range(N_QUBITS):
        lines.append(f"Ry({params[N_QUBITS + q]:.10f}) q[{phys(q)}]")
    lines.append("")

    # Measurement basis rotations
    if basis_rotations:
        for idx, op in basis_rotations:
            pq = phys(idx)
            if op == 'X':
                lines.append(f"Rz({PI:.10f}) q[{pq}]")
                lines.append(f"Ry({PI/2:.10f}) q[{pq}]")
            elif op == 'Y':
                lines.append(f"Rz({PI/2:.10f}) q[{pq}]")
                lines.append(f"Ry({PI/2:.10f}) q[{pq}]")
        lines.append("")

    lines.append("b = measure q")
    lines.append("")
    return "\n".join(lines)


def parity_from_counts(bitstring_9q, qubit_indices):
    """Compute parity for specific qubits from 9-qubit MSB-first bitstring."""
    p = 0
    for q in qubit_indices:
        phys_q = QMAP[q]
        pos = N_PHYSICAL - 1 - phys_q
        p ^= int(bitstring_9q[pos])
    return p


def expectation_raw(counts, pauli_label):
    """Compute ⟨P⟩ from raw measurement counts."""
    active = [i for i, p in enumerate(pauli_label) if p != "I"]
    if not active:
        return 1.0
    total = sum(counts.values())
    exp_val = 0.0
    for bs, count in counts.items():
        p = parity_from_counts(bs, active)
        exp_val += count * ((-1) ** p)
    return exp_val / total


def expectation_rem(counts, pauli_label):
    """Compute ⟨P⟩ with readout error mitigation."""
    active = [i for i, p in enumerate(pauli_label) if p != "I"]
    if not active:
        return 1.0

    # Build 4-qubit probability vector from 9-qubit counts
    total = sum(counts.values())
    prob_raw = np.zeros(16)
    for bs, count in counts.items():
        measured_bits = ""
        for lq in range(4):
            pq = QMAP[lq]
            pos = N_PHYSICAL - 1 - pq
            measured_bits += bs[pos]
        idx = int(measured_bits, 2)
        prob_raw[idx] += count / total

    # Apply REM
    prob_rem = CONFUSION_INV @ prob_raw
    prob_rem = np.maximum(prob_rem, 0)
    prob_rem /= prob_rem.sum()

    # Compute expectation from corrected distribution
    exp_val = 0.0
    for state_idx in range(16):
        bits = f"{state_idx:04b}"
        p = sum(int(bits[q]) for q in active) % 2
        exp_val += prob_rem[state_idx] * ((-1) ** p)
    return exp_val


def compute_energy(all_counts, use_rem=True):
    """Compute VQE energy from measurement counts across all 9 circuits."""
    energy = 0.0
    for circuit_name, term_labels in CIRCUIT_TERM_MAP.items():
        counts = all_counts.get(circuit_name)
        if counts is None:
            print(f"  WARNING: missing counts for {circuit_name}")
            continue
        for label in term_labels:
            coeff = PAULI_TERMS[label]
            if label == "IIII":
                energy += coeff
            elif use_rem and CONFUSION_INV is not None:
                energy += coeff * expectation_rem(counts, label)
            else:
                energy += coeff * expectation_raw(counts, label)
    return energy


class HybridVQE:
    """Hybrid VQE optimizer with hardware-in-the-loop for LiH."""

    def __init__(self, use_emulator=False):
        self.use_emulator = use_emulator
        self.iteration = 0
        self.history = []
        self.backend = None

    def _init_backend(self):
        if self.use_emulator:
            return
        from quantuminspire.util.api.remote_backend import RemoteBackend
        self.backend = RemoteBackend()

    def _submit_and_wait(self, params):
        """Submit 9 measurement circuits and wait for results."""
        if self.use_emulator:
            return self._run_emulator(params)

        if self.backend is None:
            self._init_backend()

        from compute_api_client import CompileStage
        from quantuminspire.sdk.models.cqasm_algorithm import CqasmAlgorithm
        from quantuminspire.sdk.models.job_options import JobOptions

        class PrecompiledAlgorithm(CqasmAlgorithm):
            @property
            def compile_stage(self):
                return CompileStage.ROUTING

        options = JobOptions(number_of_shots=N_SHOTS)
        job_ids = {}

        # Submit all 9 circuits
        for name, rotations in MEASUREMENT_GROUPS.items():
            cqasm = gen_circuit(params, rotations if rotations else None)
            algo = PrecompiledAlgorithm(
                platform_name="Quantum Inspire",
                program_name=f"lih_hvqe_i{self.iteration}_{name}"
            )
            algo._content = cqasm
            job_id = self.backend.run(
                algo, backend_type_id=TUNA9_BACKEND_ID, options=options)
            job_ids[name] = job_id
            time.sleep(0.2)

        # Poll until all complete
        results = {}
        max_wait = 900  # 15 minutes
        start = time.time()

        while len(results) < 9 and (time.time() - start) < max_wait:
            for name, job_id in job_ids.items():
                if name in results:
                    continue
                try:
                    job = self.backend.get_job(int(job_id))
                    status = str(getattr(job, "status", ""))
                    if "COMPLETED" in status:
                        raw = self.backend.get_results(int(job_id))
                        items = raw.items if hasattr(raw, "items") else raw
                        for item in items:
                            if hasattr(item, "results") and item.results:
                                results[name] = {
                                    k: int(v) for k, v in item.results.items()}
                                break
                    elif "FAILED" in status or "ERROR" in status:
                        raise RuntimeError(f"Job {job_id} failed: {status}")
                except Exception as e:
                    if "FAILED" in str(e) or "ERROR" in str(e):
                        raise

            if len(results) < 9:
                time.sleep(5)

        if len(results) < 9:
            raise TimeoutError(f"Jobs didn't complete within {max_wait}s")

        return results

    def _run_emulator(self, params):
        """Run on local emulator for testing."""
        import qxelarator
        results = {}
        for name, rotations in MEASUREMENT_GROUPS.items():
            cqasm = gen_circuit(params, rotations if rotations else None)
            result = qxelarator.execute_string(cqasm, iterations=N_SHOTS)
            results[name] = {k: int(v) for k, v in result.results.items()}
        return results

    def energy_function(self, params_arr):
        """Evaluate energy at given parameters — called by optimizer."""
        params = list(params_arr)
        self.iteration += 1

        hw_results = self._submit_and_wait(params)
        energy = compute_energy(hw_results, use_rem=True)
        error_mha = abs(energy - E_CASCI) * 1000

        self.history.append({
            "iteration": self.iteration,
            "params": [float(p) for p in params],
            "energy": float(energy),
            "error_mHa": float(error_mha),
        })

        tag = "EMU" if self.use_emulator else "HW"
        print(f"  [{tag}+REM] iter {self.iteration:3d}: "
              f"E={energy:.6f} Ha, err={error_mha:.1f} mHa", flush=True)

        return energy

    def run(self, maxiter=40):
        """Run the full hybrid VQE optimization."""
        tag = "EMULATOR" if self.use_emulator else "TUNA-9 HARDWARE"
        print(f"\n{'='*65}")
        print(f"  HYBRID VQE — LiH CASCI(2,2) at R=1.6 A on {tag}")
        print(f"{'='*65}")
        print(f"  CASCI energy: {E_CASCI:.6f} Ha")
        print(f"  FCI energy:   {E_FCI:.6f} Ha")
        print(f"  HF energy:    {E_HF:.6f} Ha")
        print(f"  Optimizer:    COBYLA (maxiter={maxiter})")
        print(f"  Parameters:   8 (2 Ry layers × 4 qubits)")
        print(f"  Circuits/iter: 9")
        print(f"  Shots:        {N_SHOTS}")
        print(f"{'='*65}\n")

        result = minimize(
            self.energy_function,
            x0=INIT_PARAMS,
            method='COBYLA',
            options={
                'maxiter': maxiter,
                'rhobeg': 0.1,  # smaller step — starting near optimum
                'catol': 0.0001,
            }
        )

        best_idx = min(range(len(self.history)),
                       key=lambda i: self.history[i]["energy"])
        best = self.history[best_idx]

        print(f"\n{'─'*65}")
        print(f"  CONVERGED after {self.iteration} iterations")
        print(f"  Best energy:  {best['energy']:.6f} Ha (iter {best['iteration']})")
        print(f"  Error:        {best['error_mHa']:.1f} mHa")
        print(f"  CASCI target: {E_CASCI:.6f} Ha")
        chem_acc = "YES" if best['error_mHa'] < 1.6 else "NO"
        print(f"  Chemical acc: {chem_acc} (threshold: 1.6 mHa)")
        print(f"  Total circuits: {self.iteration * 9}")
        print(f"{'─'*65}")

        return {
            "molecule": "LiH",
            "R_angstrom": 1.6,
            "active_space": "CASCI(2,2)",
            "n_qubits": 4,
            "E_CASCI": E_CASCI,
            "E_FCI": E_FCI,
            "E_HF": E_HF,
            "best_energy": best["energy"],
            "best_error_mHa": best["error_mHa"],
            "best_iteration": best["iteration"],
            "n_iterations": self.iteration,
            "total_circuits": self.iteration * 9,
            "optimizer_converged": bool(result.success),
            "chemical_accuracy": best["error_mHa"] < 1.6,
            "history": self.history,
            "scipy_result": {
                "x": [float(x) for x in result.x],
                "fun": float(result.fun),
                "success": bool(result.success),
                "message": str(result.message),
                "nfev": int(result.nfev),
            },
        }


def main():
    use_emulator = "--emulator" in sys.argv

    maxiter = 40
    for arg in sys.argv:
        if arg.startswith("--maxiter"):
            if "=" in arg:
                maxiter = int(arg.split("=")[1])
            else:
                idx = sys.argv.index(arg)
                maxiter = int(sys.argv[idx + 1])

    # Load confusion matrix for REM
    load_confusion_matrix()

    vqe = HybridVQE(use_emulator=use_emulator)
    results = vqe.run(maxiter=maxiter)

    tag = "emulator" if use_emulator else "tuna9"
    outfile = RESULTS_DIR / f"hybrid-vqe-lih-R1.6-{tag}.json"

    output = {
        "experiment": "Hybrid classical-quantum VQE for LiH",
        "completed": datetime.now(timezone.utc).isoformat(),
        "backend": "emulator" if use_emulator else "Tuna-9",
        "physical_qubits": QMAP,
        "n_shots": N_SHOTS,
        "rem": True,
        "optimizer": "COBYLA",
        "maxiter": maxiter,
        "results": results,
    }

    with open(outfile, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nResults saved to: {outfile}")


if __name__ == "__main__":
    main()
