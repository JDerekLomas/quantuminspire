#!/usr/bin/env python3
"""
Watson et al. 2018 Replication — Bell States, Deutsch-Josza, Grover on Tuna-9
==============================================================================
Replicates key 2-qubit experiments from:
  "A programmable two-qubit quantum processor in silicon"
  Watson et al., Nature 555, 633-637 (2018)

Original platform: Si/SiGe spin qubits (2 qubits)
Our platform: QI Tuna-9 superconducting transmons (9 qubits, using best pair)

Experiments:
  1. Bell state preparation (4 states, Z/X/Y tomography) — 12 circuits
  2. Deutsch-Josza algorithm (4 oracles) — 4 circuits
  3. Grover search (4 targets) — 4 circuits

Qubit pair: q[4]-q[6] (best Bell fidelity 93.5%)
"""
import json
import time
import math

# =============================================================================
# Configuration
# =============================================================================
QUBIT_A = 4   # logical qubit 0 → physical q4
QUBIT_B = 6   # logical qubit 1 → physical q6
N_QUBITS = 9  # Tuna-9 has 9 qubits
SHOTS = 4096

print("=" * 72)
print("  Watson et al. 2018 Replication on QI Tuna-9")
print(f"  Qubit pair: q[{QUBIT_A}]-q[{QUBIT_B}]")
print("=" * 72)

qa, qb = QUBIT_A, QUBIT_B


def cqasm_header():
    return f"version 3.0\n\nqubit[{N_QUBITS}] q\nbit[{N_QUBITS}] b\n\n"


# Use H and CNOT directly — known to work in qxelarator and on Tuna-9
def H(q):
    return f"H q[{q}]\n"

def X(q):
    return f"X q[{q}]\n"

def CNOT(ctrl, tgt):
    return f"CNOT q[{ctrl}], q[{tgt}]\n"

def Sdag(q):
    return f"Sdag q[{q}]\n"

# CZ via CNOT: CZ(a,b) = H(b) CNOT(a,b) H(b)
def CZ(a, b):
    return H(b) + CNOT(a, b) + H(b)

def measure_all():
    return "b = measure q\n"


# =============================================================================
# Experiment 1: Bell State Preparation + Tomography
# =============================================================================
print("\n--- Experiment 1: Bell State Tomography ---")

# Bell states:
#   |Phi+> = (|00>+|11>)/sqrt(2)  →  H(A), CNOT(A,B)
#   |Phi-> = (|00>-|11>)/sqrt(2)  →  X(A), H(A), CNOT(A,B)
#   |Psi+> = (|01>+|10>)/sqrt(2)  →  H(A), CNOT(A,B), X(B)
#   |Psi-> = (|01>-|10>)/sqrt(2)  →  X(A), H(A), CNOT(A,B), X(B)

bell_states = {
    "PhiPlus": {
        "label": "|Phi+> = (|00>+|11>)/sqrt(2)",
        "prep": H(qa) + CNOT(qa, qb),
    },
    "PhiMinus": {
        "label": "|Phi-> = (|00>-|11>)/sqrt(2)",
        "prep": X(qa) + H(qa) + CNOT(qa, qb),
    },
    "PsiPlus": {
        "label": "|Psi+> = (|01>+|10>)/sqrt(2)",
        "prep": H(qa) + CNOT(qa, qb) + X(qb),
    },
    "PsiMinus": {
        "label": "|Psi-> = (|01>-|10>)/sqrt(2)",
        "prep": X(qa) + H(qa) + CNOT(qa, qb) + X(qb),
    },
}


def basis_rotation(q, basis):
    """Rotate to measure in X or Y basis."""
    if basis == "Z":
        return ""
    elif basis == "X":
        return H(q)
    elif basis == "Y":
        return Sdag(q) + H(q)
    return ""


bell_circuits = {}
for state_name, state_info in bell_states.items():
    for basis_a, basis_b in [("Z", "Z"), ("X", "X"), ("Y", "Y")]:
        circuit_name = f"bell_{state_name}_{basis_a}{basis_b}"
        cq = cqasm_header()
        cq += f"// Bell state: {state_info['label']}\n"
        cq += f"// Measure in {basis_a}{basis_b} basis\n\n"
        cq += state_info["prep"]
        cq += "\n"
        cq += basis_rotation(qa, basis_a)
        cq += basis_rotation(qb, basis_b)
        cq += "\n"
        cq += measure_all()
        bell_circuits[circuit_name] = cq

print(f"  Generated {len(bell_circuits)} Bell tomography circuits")

# =============================================================================
# Experiment 2: Deutsch-Josza Algorithm
# =============================================================================
print("\n--- Experiment 2: Deutsch-Josza Algorithm ---")

# 1-bit DJ: input qubit (qa) + ancilla qubit (qb)
# |0>|1> → H⊗H → Oracle → H(input) → Measure input
# Constant → measure |0>; Balanced → measure |1>

dj_oracles = {
    "constant_0": {
        "label": "f(x)=0 (constant)",
        "expected": "constant",
        "oracle": "",
    },
    "constant_1": {
        "label": "f(x)=1 (constant)",
        "expected": "constant",
        "oracle": X(qb),
    },
    "balanced_id": {
        "label": "f(x)=x (balanced)",
        "expected": "balanced",
        "oracle": CNOT(qa, qb),
    },
    "balanced_not": {
        "label": "f(x)=NOT(x) (balanced)",
        "expected": "balanced",
        "oracle": X(qa) + CNOT(qa, qb) + X(qa),
    },
}

dj_circuits = {}
for oracle_name, oracle_info in dj_oracles.items():
    circuit_name = f"dj_{oracle_name}"
    cq = cqasm_header()
    cq += f"// Deutsch-Josza: {oracle_info['label']}\n\n"
    cq += X(qb)           # ancilla to |1>
    cq += H(qa) + H(qb)   # Hadamard both
    cq += oracle_info["oracle"]  # Oracle
    cq += H(qa)            # H on input
    cq += "\n"
    cq += measure_all()
    dj_circuits[circuit_name] = cq

print(f"  Generated {len(dj_circuits)} Deutsch-Josza circuits")

# =============================================================================
# Experiment 3: Grover Search
# =============================================================================
print("\n--- Experiment 3: Grover Search ---")

# 2-qubit Grover: H⊗H → Oracle → Diffusion → Measure
# Oracle marks target |t> with phase -1
# Diffusion = H⊗H (2|00><00| - I) H⊗H = H⊗H X⊗X CZ X⊗X H⊗H

grover_targets = {
    "target_00": {"label": "Search for |00>", "target": "00",
                  "oracle": X(qa) + X(qb) + CZ(qa, qb) + X(qa) + X(qb)},
    "target_01": {"label": "Search for |01>", "target": "01",
                  "oracle": X(qa) + CZ(qa, qb) + X(qa)},
    "target_10": {"label": "Search for |10>", "target": "10",
                  "oracle": X(qb) + CZ(qa, qb) + X(qb)},
    "target_11": {"label": "Search for |11>", "target": "11",
                  "oracle": CZ(qa, qb)},
}

diffusion = (
    H(qa) + H(qb) +
    X(qa) + X(qb) +
    CZ(qa, qb) +
    X(qa) + X(qb) +
    H(qa) + H(qb)
)

grover_circuits = {}
for target_name, target_info in grover_targets.items():
    circuit_name = f"grover_{target_name}"
    cq = cqasm_header()
    cq += f"// Grover: {target_info['label']}\n\n"
    cq += H(qa) + H(qb)           # Superposition
    cq += target_info["oracle"]    # Oracle
    cq += diffusion                # Diffusion
    cq += "\n"
    cq += measure_all()
    grover_circuits[circuit_name] = cq

print(f"  Generated {len(grover_circuits)} Grover circuits")

# =============================================================================
# Emulator Test
# =============================================================================
print("\n--- Emulator Verification ---")

all_circuits = {}
all_circuits.update(bell_circuits)
all_circuits.update(dj_circuits)
all_circuits.update(grover_circuits)
print(f"  Total circuits: {len(all_circuits)}")

try:
    import qxelarator

    emulator_results = {}
    t0 = time.time()

    for name, circuit in all_circuits.items():
        result = qxelarator.execute_string(circuit, iterations=SHOTS)
        emulator_results[name] = result.results

    elapsed = time.time() - t0
    print(f"  All {len(all_circuits)} circuits completed in {elapsed:.1f}s")

    # --- Helper functions ---
    def extract_2q_probs(counts, qa_idx, qb_idx):
        """Extract 2-qubit marginal from 9-qubit counts.
        qxelarator uses MSB-first: bs[0]=q_{n-1}, bs[n-1]=q_0.
        To read qubit j: bs[n-1-j] where n=len(bs).
        """
        probs = {"00": 0, "01": 0, "10": 0, "11": 0}
        total = sum(counts.values())
        for bs, count in counts.items():
            n = len(bs)
            ba = bs[n - 1 - qa_idx]
            bb = bs[n - 1 - qb_idx]
            probs[ba + bb] += count / total
        return probs

    def correlator(probs):
        """<ZZ> = P(00) + P(11) - P(01) - P(10)"""
        return probs["00"] + probs["11"] - probs["01"] - probs["10"]

    # --- Bell States ---
    print("\n  === Bell State Tomography (Emulator) ===")

    bell_analysis = {}
    for state_name in bell_states:
        analysis = {}
        for bases in ["ZZ", "XX", "YY"]:
            key = f"bell_{state_name}_{bases}"
            probs = extract_2q_probs(emulator_results[key], QUBIT_A, QUBIT_B)
            corr = correlator(probs)
            analysis[bases] = {"probs": probs, "correlator": corr}
        bell_analysis[state_name] = analysis

        zz = analysis["ZZ"]["correlator"]
        xx = analysis["XX"]["correlator"]
        yy = analysis["YY"]["correlator"]

        # Bell fidelity from correlators
        if state_name == "PhiPlus":
            fid = (1 + zz + xx - yy) / 4
        elif state_name == "PhiMinus":
            fid = (1 + zz - xx + yy) / 4
        elif state_name == "PsiPlus":
            fid = (1 - zz + xx + yy) / 4
        elif state_name == "PsiMinus":
            fid = (1 - zz - xx - yy) / 4

        concurrence = max(0, 2 * fid - 1)
        bell_analysis[state_name]["fidelity"] = fid
        bell_analysis[state_name]["concurrence"] = concurrence

        print(f"    {state_name}: ZZ={zz:+.3f}, XX={xx:+.3f}, YY={yy:+.3f}"
              f" → F={fid:.3f}, C={concurrence:.3f}")

    # --- Deutsch-Josza ---
    print("\n  === Deutsch-Josza (Emulator) ===")

    dj_analysis = {}
    for oracle_name, oracle_info in dj_oracles.items():
        key = f"dj_{oracle_name}"
        counts = emulator_results[key]
        total = sum(counts.values())
        # MSB-first: qubit j is at position n-1-j
        qa_pos = N_QUBITS - 1 - QUBIT_A
        p_qa0 = sum(c for bs, c in counts.items() if bs[qa_pos] == "0") / total
        p_qa1 = 1 - p_qa0

        expected = oracle_info["expected"]
        prediction = "constant" if p_qa0 > 0.5 else "balanced"
        success = p_qa0 if expected == "constant" else p_qa1
        correct = prediction == expected

        dj_analysis[oracle_name] = {
            "expected": expected, "prediction": prediction,
            "correct": correct, "p_qa0": p_qa0, "p_qa1": p_qa1,
            "success_prob": success,
        }
        status = "PASS" if correct else "FAIL"
        print(f"    {oracle_name}: P(qa=0)={p_qa0:.3f}, P(qa=1)={p_qa1:.3f}"
              f" → {prediction} (expect {expected}) [{status}]")

    # --- Grover ---
    print("\n  === Grover Search (Emulator) ===")

    grover_analysis = {}
    for target_name, target_info in grover_targets.items():
        key = f"grover_{target_name}"
        probs = extract_2q_probs(emulator_results[key], QUBIT_A, QUBIT_B)
        target_bs = target_info["target"]
        target_prob = probs[target_bs]
        success = target_prob > 0.5

        grover_analysis[target_name] = {
            "target": target_bs, "target_prob": target_prob,
            "all_probs": probs, "success": success,
        }
        status = "PASS" if success else "FAIL"
        print(f"    {target_name}: P(|{target_bs}>)={target_prob:.3f} [{status}]"
              f"  ({probs})")

    # --- Summary ---
    print("\n  === Summary ===")
    bell_fids = [bell_analysis[s]["fidelity"] for s in bell_states]
    bell_concs = [bell_analysis[s]["concurrence"] for s in bell_states]
    dj_pass = sum(1 for d in dj_analysis.values() if d["correct"])
    grover_probs = [grover_analysis[t]["target_prob"] for t in grover_targets]

    print(f"    Bell: mean F = {sum(bell_fids)/len(bell_fids):.3f}"
          f" (range {min(bell_fids):.3f}-{max(bell_fids):.3f})")
    print(f"    Bell: mean C = {sum(bell_concs)/len(bell_concs):.3f}")
    print(f"    DJ: {dj_pass}/4 correct")
    print(f"    Grover: mean P(target) = {sum(grover_probs)/len(grover_probs):.3f}"
          f" (range {min(grover_probs):.3f}-{max(grover_probs):.3f})")

except ImportError:
    print("  qxelarator not available — skipping")
    bell_analysis = dj_analysis = grover_analysis = emulator_results = None
except Exception as e:
    print(f"  Error: {e}")
    import traceback; traceback.print_exc()
    bell_analysis = dj_analysis = grover_analysis = emulator_results = None

# =============================================================================
# Save Results
# =============================================================================
print("\n--- Saving Results ---")

output = {
    "experiment": "Watson et al. 2018 Replication",
    "paper": {
        "title": "A programmable two-qubit quantum processor in silicon",
        "authors": "Watson et al.",
        "journal": "Nature 555, 633-637 (2018)",
        "arxiv": "1708.04214",
    },
    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
    "backend": "emulator (qxelarator)",
    "qubit_pair": [QUBIT_A, QUBIT_B],
    "shots": SHOTS,
    "experiments": {
        "bell_tomography": {
            "n_circuits": len(bell_circuits),
            "states": list(bell_states.keys()),
            "bases": ["ZZ", "XX", "YY"],
            "analysis": bell_analysis,
            "watson_published": {
                "fidelity_range": [0.85, 0.89],
                "concurrence_range": [0.73, 0.82],
            },
        },
        "deutsch_josza": {
            "n_circuits": len(dj_circuits),
            "oracles": list(dj_oracles.keys()),
            "analysis": dj_analysis,
        },
        "grover_search": {
            "n_circuits": len(grover_circuits),
            "targets": list(grover_targets.keys()),
            "analysis": grover_analysis,
        },
    },
    "circuits_cqasm": all_circuits,
}

outpath = "/Users/dereklomas/haiqu/experiments/results/watson2018-replication-emulator.json"
with open(outpath, "w") as f:
    json.dump(output, f, indent=2)

print(f"  Saved to {outpath}")
