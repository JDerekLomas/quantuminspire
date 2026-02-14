#!/usr/bin/env python3
"""
Quantum Poetry: Decoherence Gradient
======================================

GHZ state should produce exactly 2 poems (all-tenderness or all-resentment).
Run GHZ chains of increasing length on Tuna-9. As depth grows, decoherence
leaks meaning into intermediate states. The poem dissolves.

Linear CNOT chains on Tuna-9's Hamiltonian path: 3->1->4->2->5->7->8->6
(avoids q0, which has 12.3% error rate).

| Circuit | Qubits         | CNOTs | CZs | Expected fidelity |
|---------|---------------|-------|-----|-------------------|
| GHZ-3   | q3,q1,q4       | 2     | 2   | ~92%+             |
| GHZ-5   | +q2,q5         | 4     | 4   | ~85%              |
| GHZ-7   | +q7,q8         | 6     | 6   | ~78%              |
| GHZ-9   | full tree      | 8     | 8   | existing data     |

All native gates (H->Rz+Ry, CNOT->Ry+CZ+Ry). CompileStage.ROUTING.

Hardware: Quantum Inspire Tuna-9 (9 superconducting qubits)
"""

import json
import math
import os
import sys
import time
from collections import Counter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".venv", "lib", "python3.12", "site-packages"))

RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")
PI = math.pi
HP = PI / 2    # pi/2
HM = -PI / 2   # -pi/2

# Hamiltonian path avoiding q0: 3 -> 1 -> 4 -> 2 -> 5 -> 7 -> 8 -> 6
# Edges used: 1-3, 1-4, 2-4, 2-5, 5-7, 7-8, 6-8
CHAIN = [3, 1, 4, 2, 5, 7, 8, 6]

# Which qubits are used at each depth
GHZ_CONFIGS = {
    3: CHAIN[:3],   # q3, q1, q4
    5: CHAIN[:5],   # q3, q1, q4, q2, q5
    7: CHAIN[:7],   # q3, q1, q4, q2, q5, q7, q8
}


def circuit_ghz_chain(n_qubits: int) -> str:
    """
    Generate cQASM 3.0 GHZ circuit using linear chain of n_qubits.
    All native gates. Uses Tuna-9 physical edges.

    H(q_first) followed by CNOT chain along the Hamiltonian path.
    CNOT(a,b) = Ry(-pi/2,b); CZ(a,b); Ry(pi/2,b)
    H(q) = Rz(pi); Ry(pi/2)
    """
    qubits = GHZ_CONFIGS[n_qubits]
    n_total = 9  # Always declare all 9 qubits (Tuna-9 requirement)

    lines = [
        "version 3.0",
        f"qubit[{n_total}] q",
        f"bit[{n_total}] b",
        "",
        f"// GHZ-{n_qubits} state via linear CNOT chain",
        f"// Qubits: {', '.join(f'q{q}' for q in qubits)}",
        f"// Path: {' -> '.join(str(q) for q in qubits)}",
        "",
        f"// H on q{qubits[0]}: Rz(pi); Ry(pi/2)",
        f"Rz({PI:.6f}) q[{qubits[0]}]",
        f"Ry({HP:.6f}) q[{qubits[0]}]",
    ]

    # CNOT chain
    for i in range(1, len(qubits)):
        a, b = qubits[i - 1], qubits[i]
        lines += [
            "",
            f"// CNOT(q{a}, q{b}): Ry(-pi/2,{b}); CZ({a},{b}); Ry(pi/2,{b})",
            f"Ry({HM:.6f}) q[{b}]",
            f"CZ q[{a}], q[{b}]",
            f"Ry({HP:.6f}) q[{b}]",
        ]

    lines += ["", "b = measure q"]
    return "\n".join(lines)


def analyze_ghz(counts: dict, n_qubits: int, total: int) -> dict:
    """Analyze GHZ fidelity and decoherence metrics."""
    qubits = GHZ_CONFIGS.get(n_qubits, list(range(n_qubits)))

    # For subsets: extract only the relevant qubit bits
    # MSB-first: bitstring[0]=q8, bitstring[8]=q0
    # So qubit i is at position (8-i) in the 9-bit string
    all_zero = 0
    all_one = 0

    for bs, count in counts.items():
        # Extract bits for our qubits
        bits = []
        for q in qubits:
            bits.append(int(bs[8 - q]))

        if all(b == 0 for b in bits):
            all_zero += count
        elif all(b == 1 for b in bits):
            all_one += count

    fidelity = (all_zero + all_one) / total
    ideal_frac_zero = all_zero / total
    ideal_frac_one = all_one / total

    # Entropy of the relevant-qubit distribution
    # Marginalize out non-GHZ qubits
    ghz_counts = Counter()
    for bs, count in counts.items():
        sub_bs = "".join(str(int(bs[8 - q])) for q in qubits)
        ghz_counts[sub_bs] += count

    probs = {k: v / total for k, v in ghz_counts.items()}
    entropy = -sum(p * math.log2(p) for p in probs.values() if p > 0)
    max_entropy = n_qubits  # log2(2^n) = n

    return {
        "n_qubits": n_qubits,
        "qubits_used": qubits,
        "total_shots": total,
        "all_zero_count": all_zero,
        "all_one_count": all_one,
        "ghz_fidelity": round(fidelity, 4),
        "ideal_frac_zero": round(ideal_frac_zero, 4),
        "ideal_frac_one": round(ideal_frac_one, 4),
        "unique_outcomes": len(ghz_counts),
        "entropy_bits": round(entropy, 3),
        "max_entropy_bits": max_entropy,
        "entropy_fraction": round(entropy / max_entropy, 3),
        "top_outcomes": [
            {"bitstring": bs, "count": c, "probability": round(c / total, 4)}
            for bs, c in ghz_counts.most_common(10)
        ],
    }


def test_emulator():
    """Run GHZ-3, GHZ-5, GHZ-7 on local emulator."""
    import qxelarator

    print("=" * 60)
    print("  DECOHERENCE GRADIENT — EMULATOR TEST")
    print("=" * 60)

    results = {}
    for n in [3, 5, 7]:
        print(f"\n--- GHZ-{n} ---")
        cqasm = circuit_ghz_chain(n)
        sim = qxelarator.execute_string(cqasm, 4096)
        counts = sim.results
        total = sum(counts.values())

        analysis = analyze_ghz(counts, n, total)
        print(f"  Qubits: {', '.join(f'q{q}' for q in analysis['qubits_used'])}")
        print(f"  Fidelity: {analysis['ghz_fidelity']:.4f}")
        print(f"  |000...0⟩: {analysis['all_zero_count']} ({analysis['ideal_frac_zero']:.1%})")
        print(f"  |111...1⟩: {analysis['all_one_count']} ({analysis['ideal_frac_one']:.1%})")
        print(f"  Unique outcomes: {analysis['unique_outcomes']}")
        print(f"  Entropy: {analysis['entropy_bits']:.3f} / {analysis['max_entropy_bits']:.1f} bits")

        results[f"ghz_{n}"] = {
            "circuit": cqasm,
            "raw_counts": dict(counts),
            "analysis": analysis,
        }

    # Save
    outpath = os.path.join(RESULTS_DIR, "poetry-decoherence-emulator.json")
    with open(outpath, "w") as f:
        json.dump({
            "experiment": "poetry-decoherence-gradient",
            "backend": "qxelarator emulator",
            "date": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "shots": 4096,
            "chain_path": "3 -> 1 -> 4 -> 2 -> 5 -> 7 -> 8 -> 6",
            "results": results,
        }, f, indent=2)
    print(f"\nEmulator results saved to {outpath}")
    return results


def submit_tuna9():
    """Submit GHZ-3, GHZ-5, GHZ-7 to Tuna-9."""
    from quantuminspire.util.api.remote_backend import RemoteBackend
    from quantuminspire.sdk.models.cqasm_algorithm import CqasmAlgorithm
    from quantuminspire.sdk.models.job_options import JobOptions
    from compute_api_client import CompileStage

    # Monkey-patch for image_id length bug
    from compute_api_client.models.backend_type import BackendType as BT
    for field in BT.__fields__.values():
        if field.alias == 'image_id' and hasattr(field, 'max_length'):
            field.max_length = 64

    backend = RemoteBackend()
    options = JobOptions(number_of_shots=4096)

    job_ids = {}
    for n in [3, 5, 7]:
        name = f"decoherence-ghz-{n}"
        cqasm = circuit_ghz_chain(n)
        print(f"Submitting {name}...")

        class _NativeAlgo(CqasmAlgorithm):
            @property
            def compile_stage(self):
                return CompileStage.ROUTING

        algo = _NativeAlgo(platform_name="Quantum Inspire", program_name=name)
        algo._content = cqasm
        job_id = backend.run(algo, backend_type_id=6, options=options)
        job_ids[name] = {"job_id": job_id, "n_qubits": n}
        print(f"  Job ID: {job_id}")

    # Save
    outpath = os.path.join(RESULTS_DIR, "poetry-decoherence-tuna9-jobs.json")
    result = {
        "experiment": "poetry-decoherence-gradient",
        "date": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "backend": "Tuna-9 (backend_type_id=6)",
        "shots": 4096,
        "compile_stage": "ROUTING",
        "chain_path": "3 -> 1 -> 4 -> 2 -> 5 -> 7 -> 8 -> 6",
        "note": "GHZ-9 data from marriage experiment (job 426095)",
        "existing_jobs": {
            "marriage-ghz (GHZ-9)": 426095,
        },
        "new_jobs": job_ids,
    }
    with open(outpath, "w") as f:
        json.dump(result, f, indent=2)
    print(f"\nJob IDs saved to {outpath}")
    return job_ids


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Quantum Poetry: Decoherence Gradient")
    parser.add_argument("action", choices=["test", "submit", "both"],
                        help="test=emulator, submit=Tuna-9, both=test then submit")
    args = parser.parse_args()

    if args.action in ("test", "both"):
        test_emulator()

    if args.action in ("submit", "both"):
        submit_tuna9()
