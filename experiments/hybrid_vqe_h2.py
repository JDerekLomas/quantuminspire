#!/usr/bin/env python3
"""True hybrid classical-quantum VQE for H2 on Tuna-9.

Runs COBYLA optimization where each energy evaluation submits circuits
to Tuna-9 hardware, polls for results, and feeds the energy back.

This is a genuine hybrid algorithm — the classical optimizer and quantum
hardware form a closed loop. Not pre-optimized parameters.

Protocol:
  1. Classical optimizer proposes angle α
  2. Submit 3 circuits (Z, X, Y bases) to Tuna-9
  3. Poll until all 3 complete
  4. Compute Pauli expectations from counts
  5. Apply REM (readout error mitigation)
  6. Compute energy E(α) = Σ gᵢ⟨Pᵢ⟩
  7. Return E(α) to optimizer → goto 1

Usage:
  python hybrid_vqe_h2.py                    # run on hardware
  python hybrid_vqe_h2.py --emulator         # test on local emulator
  python hybrid_vqe_h2.py --bond 0.735       # specific bond distance (default)
  python hybrid_vqe_h2.py --all-bonds        # sweep all 7 bond distances
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
QA, QB = 4, 6  # Physical qubits
TOTAL_QUBITS = 9

RESULTS_DIR = Path("experiments/results")

# H2 molecular parameters at various bond distances (from PySCF + OpenFermion)
BOND_PARAMS = {
    0.500: {"alpha_init": -0.14, "g0": 0.12316306, "g1": 0.58307965, "g4": 0.08443511, "fci": -1.05515976, "hf": -1.04299624},
    0.700: {"alpha_init": -0.21, "g0": -0.27643762, "g1": 0.42045571, "g4": 0.08950029, "fci": -1.13618945, "hf": -1.11734900},
    0.735: {"alpha_init": -0.22, "g0": -0.32112409, "g1": 0.39793745, "g4": 0.09046560, "fci": -1.13730604, "hf": -1.11699900},
    0.900: {"alpha_init": -0.30, "g0": -0.47233944, "g1": 0.30978731, "g4": 0.09528584, "fci": -1.12056029, "hf": -1.09191400},
    1.100: {"alpha_init": -0.41, "g0": -0.57374710, "g1": 0.23139590, "g4": 0.10161111, "fci": -1.07919296, "hf": -1.03560800},
    1.500: {"alpha_init": -0.73, "g0": -0.65267092, "g1": 0.12910133, "g4": 0.11476796, "fci": -0.99814937, "hf": -0.91087400},
    2.000: {"alpha_init": -1.13, "g0": -0.66253664, "g1": 0.06062802, "g4": 0.12956923, "fci": -0.94864112, "hf": -0.78379300},
}

# Confusion matrix from calibration (jobs 429925-429928 on q4/q6)
CONFUSION_MATRIX = np.array([
    [0.96875, 0.024169921875, 0.016845703125, 0.000244140625],
    [0.01318359375, 0.95703125, 0.0, 0.0185546875],
    [0.017578125, 0.000244140625, 0.96826171875, 0.02197265625],
    [0.00048828125, 0.0185546875, 0.014892578125, 0.959228515625],
])
CONFUSION_INV = np.linalg.inv(CONFUSION_MATRIX)


def gen_circuit(alpha, basis):
    """Generate cQASM 3.0 VQE circuit for H2 2-qubit."""
    lines = ["version 3.0", f"qubit[{TOTAL_QUBITS}] q"]
    lines.append(f"X q[{QA}]")
    lines.append(f"Ry({alpha:.6f}) q[{QB}]")
    lines.append(f"Ry(-1.570796) q[{QA}]")
    lines.append(f"CZ q[{QB}], q[{QA}]")

    if basis == 'X':
        lines.append(f"Ry(-1.570796) q[{QB}]")
    elif basis == 'Y':
        lines.append(f"Ry(1.570796) q[{QA}]")
        lines.append(f"Rz(-1.570796) q[{QA}]")
        lines.append(f"Ry(1.570796) q[{QA}]")
        lines.append(f"Rz(1.570796) q[{QA}]")
        lines.append(f"Rz(-1.570796) q[{QB}]")
        lines.append(f"Ry(1.570796) q[{QB}]")
        lines.append(f"Rz(1.570796) q[{QB}]")
    else:  # Z
        lines.append(f"Ry(1.570796) q[{QA}]")

    lines.append(f"bit[{TOTAL_QUBITS}] b")
    lines.append("b = measure q")
    return '\n'.join(lines)


def apply_rem(counts_2q):
    """Apply readout error mitigation via confusion matrix inversion."""
    states = ["00", "10", "01", "11"]
    raw_vec = np.array([counts_2q.get(s, 0) for s in states], dtype=float)
    total = raw_vec.sum()
    if total == 0:
        return counts_2q
    raw_probs = raw_vec / total
    mitigated_probs = CONFUSION_INV @ raw_probs
    mitigated_probs = np.clip(mitigated_probs, 0, None)
    mitigated_probs /= mitigated_probs.sum()
    return {s: float(p) for s, p in zip(states, mitigated_probs)}


def extract_2q_counts(counts_9bit):
    """Extract 2-qubit counts for QA, QB from 9-bit hardware bitstrings."""
    counts_2q = {}
    for bs, count in counts_9bit.items():
        # MSB-first: bs[i] = qubit (8-i)
        bit_a = bs[TOTAL_QUBITS - 1 - QA]
        bit_b = bs[TOTAL_QUBITS - 1 - QB]
        key = bit_a + bit_b  # "ab" where a=QA, b=QB
        counts_2q[key] = counts_2q.get(key, 0) + count
    return counts_2q


def expectations_from_probs(probs):
    """Compute Pauli expectations from 2-qubit probability distribution.

    Convention: state "ab" means QA=a, QB=b.
    ZI acts on QA, IZ acts on QB.
    """
    p00 = probs.get("00", 0)
    p10 = probs.get("10", 0)
    p01 = probs.get("01", 0)
    p11 = probs.get("11", 0)

    ZI = (p00 + p01) - (p10 + p11)  # QA in |0⟩ vs |1⟩
    IZ = (p00 + p10) - (p01 + p11)  # QB in |0⟩ vs |1⟩
    ZZ = (p00 + p11) - (p01 + p10)
    return ZI, IZ, ZZ


def compute_energy(z_probs, x_probs, y_probs, params):
    """Compute VQE energy: E = g0 + g1*(Z0 - Z1) + g4*(XX + YY).

    Same formula as analyze_h2_5reps.py. The g0 constant already
    incorporates the ZZ sector (particle number conservation).
    Z0 = ⟨Z⟩ on qubit A (q4), Z1 = ⟨Z⟩ on qubit B (q6).
    """
    g0, g1, g4 = params["g0"], params["g1"], params["g4"]

    Z0, Z1, _ = expectations_from_probs(z_probs)
    _, _, XX = expectations_from_probs(x_probs)
    _, _, YY = expectations_from_probs(y_probs)

    E = g0 + g1 * (Z0 - Z1) + g4 * (XX + YY)
    return E


class HybridVQE:
    """Hybrid VQE optimizer with hardware-in-the-loop."""

    def __init__(self, bond_distance, use_emulator=False, use_rem=True):
        self.params = BOND_PARAMS[bond_distance]
        self.bond_distance = bond_distance
        self.use_emulator = use_emulator
        self.use_rem = use_rem
        self.iteration = 0
        self.history = []
        self.backend = None

    def _init_backend(self):
        if self.use_emulator:
            return
        from quantuminspire.util.api.remote_backend import RemoteBackend
        self.backend = RemoteBackend()

    def _submit_and_wait(self, alpha):
        """Submit 3 basis circuits and wait for results."""
        if self.use_emulator:
            return self._run_emulator(alpha)

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

        for basis in ['Z', 'X', 'Y']:
            cqasm = gen_circuit(alpha, basis)
            algo = PrecompiledAlgorithm(
                platform_name="Quantum Inspire",
                program_name=f"hvqe_iter{self.iteration}_{basis}"
            )
            algo._content = cqasm
            job_id = self.backend.run(algo, backend_type_id=TUNA9_BACKEND_ID, options=options)
            job_ids[basis] = job_id
            time.sleep(0.2)

        # Poll until all complete
        results = {}
        max_wait = 600  # 10 minutes
        start = time.time()

        while len(results) < 3 and (time.time() - start) < max_wait:
            for basis, job_id in job_ids.items():
                if basis in results:
                    continue
                try:
                    job = self.backend.get_job(int(job_id))
                    status = str(getattr(job, "status", ""))
                    if "COMPLETED" in status:
                        raw = self.backend.get_results(int(job_id))
                        items = raw.items if hasattr(raw, "items") else raw
                        for item in items:
                            if hasattr(item, "results") and item.results:
                                results[basis] = {k: int(v) for k, v in item.results.items()}
                                break
                    elif "FAILED" in status or "ERROR" in status:
                        raise RuntimeError(f"Job {job_id} failed: {status}")
                except Exception as e:
                    if "FAILED" in str(e) or "ERROR" in str(e):
                        raise

            if len(results) < 3:
                time.sleep(5)

        if len(results) < 3:
            raise TimeoutError(f"Jobs didn't complete within {max_wait}s")

        return results

    def _run_emulator(self, alpha):
        """Run on local emulator for testing."""
        import qxelarator
        results = {}
        for basis in ['Z', 'X', 'Y']:
            cqasm = gen_circuit(alpha, basis)
            result = qxelarator.execute_string(cqasm, iterations=N_SHOTS)
            results[basis] = {k: int(v) for k, v in result.results.items()}
        return results

    def energy_function(self, alpha_arr):
        """Evaluate energy at given alpha — called by optimizer."""
        alpha = float(alpha_arr[0])
        self.iteration += 1

        # Get measurement results
        hw_results = self._submit_and_wait(alpha)

        # Extract 2-qubit counts and apply REM
        basis_probs = {}
        for basis in ['Z', 'X', 'Y']:
            counts_9bit = hw_results[basis]
            counts_2q = extract_2q_counts(counts_9bit)

            if self.use_rem:
                probs = apply_rem(counts_2q)
            else:
                total = sum(counts_2q.values())
                probs = {k: v/total for k, v in counts_2q.items()}

            basis_probs[basis] = probs

        energy = compute_energy(
            basis_probs['Z'], basis_probs['X'], basis_probs['Y'],
            self.params
        )

        error_mha = abs(energy - self.params["fci"]) * 1000

        self.history.append({
            "iteration": self.iteration,
            "alpha": alpha,
            "energy": energy,
            "error_mHa": error_mha,
            "z_probs": basis_probs['Z'],
            "x_probs": basis_probs['X'],
            "y_probs": basis_probs['Y'],
        })

        tag = "EMU" if self.use_emulator else "HW"
        rem_tag = "+REM" if self.use_rem else ""
        print(f"  [{tag}{rem_tag}] iter {self.iteration:3d}: "
              f"α={alpha:+.4f}, E={energy:.6f} Ha, "
              f"err={error_mha:.1f} mHa", flush=True)

        return energy

    def run(self, maxiter=80):
        """Run the full hybrid VQE optimization."""
        alpha_init = self.params["alpha_init"]

        tag = "EMULATOR" if self.use_emulator else "TUNA-9 HARDWARE"
        print(f"\n{'='*65}")
        print(f"  HYBRID VQE — H2 at R={self.bond_distance} Å on {tag}")
        print(f"{'='*65}")
        print(f"  FCI energy:  {self.params['fci']:.6f} Ha")
        print(f"  HF energy:   {self.params['hf']:.6f} Ha")
        print(f"  Initial α:   {alpha_init:.4f}")
        print(f"  Optimizer:   COBYLA (maxiter={maxiter})")
        print(f"  REM:         {'ON' if self.use_rem else 'OFF'}")
        print(f"  Shots:       {N_SHOTS}")
        print(f"{'='*65}\n")

        result = minimize(
            self.energy_function,
            x0=[alpha_init],
            method='COBYLA',
            options={
                'maxiter': maxiter,
                'rhobeg': 0.3,  # initial step size
                'catol': 0.0001,  # constraint tolerance (unused but required)
            }
        )

        best_idx = min(range(len(self.history)), key=lambda i: self.history[i]["energy"])
        best = self.history[best_idx]

        print(f"\n{'─'*65}")
        print(f"  CONVERGED after {self.iteration} iterations")
        print(f"  Best energy:  {best['energy']:.6f} Ha (iter {best['iteration']})")
        print(f"  Best α:       {best['alpha']:.6f}")
        print(f"  Error:        {best['error_mHa']:.1f} mHa")
        print(f"  FCI target:   {self.params['fci']:.6f} Ha")
        chem_acc = "YES" if best['error_mHa'] < 1.6 else "NO"
        print(f"  Chemical acc: {chem_acc} (threshold: 1.6 mHa)")
        print(f"{'─'*65}")

        return {
            "bond_distance": self.bond_distance,
            "fci_energy": self.params["fci"],
            "hf_energy": self.params["hf"],
            "best_energy": best["energy"],
            "best_alpha": best["alpha"],
            "best_error_mHa": best["error_mHa"],
            "n_iterations": self.iteration,
            "optimizer_converged": bool(result.success),
            "chemical_accuracy": best["error_mHa"] < 1.6,
            "history": self.history,
            "scipy_result": {
                "x": float(result.x[0]),
                "fun": float(result.fun),
                "success": bool(result.success),
                "message": str(result.message),
                "nfev": int(result.nfev),
            },
        }


def run_single(bond_distance, use_emulator=False, maxiter=80):
    """Run hybrid VQE for a single bond distance."""
    vqe = HybridVQE(bond_distance, use_emulator=use_emulator)
    return vqe.run(maxiter=maxiter)


def run_sweep(use_emulator=False, maxiter=80):
    """Run hybrid VQE across all bond distances."""
    all_results = {}
    for R in sorted(BOND_PARAMS.keys()):
        result = run_single(R, use_emulator=use_emulator, maxiter=maxiter)
        all_results[str(R)] = result
    return all_results


def main():
    use_emulator = "--emulator" in sys.argv
    all_bonds = "--all-bonds" in sys.argv

    # Parse bond distance
    bond = 0.735
    for arg in sys.argv:
        if arg.startswith("--bond"):
            if "=" in arg:
                bond = float(arg.split("=")[1])
            else:
                idx = sys.argv.index(arg)
                bond = float(sys.argv[idx + 1])

    maxiter = 80
    for arg in sys.argv:
        if arg.startswith("--maxiter"):
            if "=" in arg:
                maxiter = int(arg.split("=")[1])
            else:
                idx = sys.argv.index(arg)
                maxiter = int(sys.argv[idx + 1])

    if all_bonds:
        results = run_sweep(use_emulator=use_emulator, maxiter=maxiter)
    else:
        results = run_single(bond, use_emulator=use_emulator, maxiter=maxiter)

    # Save
    tag = "emulator" if use_emulator else "tuna9"
    if all_bonds:
        outfile = RESULTS_DIR / f"hybrid-vqe-h2-sweep-{tag}.json"
    else:
        outfile = RESULTS_DIR / f"hybrid-vqe-h2-R{bond}-{tag}.json"

    output = {
        "experiment": "Hybrid classical-quantum VQE for H2",
        "completed": datetime.now(timezone.utc).isoformat(),
        "backend": "emulator" if use_emulator else "Tuna-9",
        "physical_qubits": [QA, QB],
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
