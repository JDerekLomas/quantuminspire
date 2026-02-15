#!/usr/bin/env python3
"""QAOA parameter sweep on emulator via qi_run_local.
Generates cQASM for each (gamma, beta) pair and prints results.
"""

import subprocess
import json
import math
import sys

sys.path.insert(0, "/Users/dereklomas/haiqu/experiments")
from tuna9_trio import qaoa_maxcut_circuit, qaoa_cost_from_bitstring, EDGES, PARTITION_A

PI = math.pi
N = 9
MAX_CUT = 12

def run_local(circuit, shots=2048):
    """Run circuit on local QI emulator via qxelarator."""
    # Use the Python API directly
    from quantuminspire.sdk.qiskit.circuit import QiskitCircuit
    # Actually, let's just use subprocess to call a helper
    pass


def bit_at(bitstring, q):
    """QI convention: rightmost bit = q[0]."""
    return int(bitstring[-(q + 1)])


def qaoa_cost_qi(bitstring):
    """MaxCut cost using QI bit convention."""
    cost = 0
    for i, j in EDGES:
        if bit_at(bitstring, i) != bit_at(bitstring, j):
            cost += 1
    return cost


def analyze(results):
    total = sum(results.values())
    expected_cost = sum(qaoa_cost_qi(bs) * c / total for bs, c in results.items())

    # Optimal bitstrings (QI convention: q0 rightmost)
    opt_a = "".join(reversed(["0" if q in PARTITION_A else "1" for q in range(9)]))
    opt_b = "".join(reversed(["1" if q in PARTITION_A else "0" for q in range(9)]))
    p_opt = (results.get(opt_a, 0) + results.get(opt_b, 0)) / total

    return expected_cost, expected_cost / MAX_CUT, p_opt


# Generate and print circuits for manual submission to qi_run_local MCP tool
# We'll output them as a batch
sweep_points = []
for gi in range(1, 9):
    for bi in range(1, 9):
        gamma = gi * PI / 8
        beta = bi * PI / 16
        sweep_points.append((gamma, beta))

# Just print the top candidates based on theory
# For bipartite graphs, optimal QAOA p=1 angles are approximately:
# gamma ~ pi/4, beta ~ pi/8 (standard for regular bipartite)
# But our graph is irregular, so let's test a few
print("Generating QAOA circuits for manual sweep...")
print("Theoretical: for bipartite graphs, try gamma ~ pi/4, beta ~ pi/8")
print()

candidates = [
    (PI/8, PI/16),
    (PI/8, PI/8),
    (PI/4, PI/8),
    (PI/4, PI/4),
    (PI/3, PI/8),
    (PI/3, PI/6),
    (3*PI/8, PI/8),
    (3*PI/8, PI/4),
    (PI/2, PI/8),
    (PI/2, PI/4),
    (PI/2, 3*PI/8),
]

for gamma, beta in candidates:
    circ = qaoa_maxcut_circuit(gamma, beta)
    fname = f"/Users/dereklomas/haiqu/experiments/circuits/qaoa_sweep_g{gamma:.4f}_b{beta:.4f}.qasm"
    with open(fname, "w") as f:
        f.write(circ)
    print(f"γ={gamma:.4f} ({gamma/PI:.3f}π), β={beta:.4f} ({beta/PI:.3f}π) → {fname}")

print(f"\nGenerated {len(candidates)} QAOA circuits for sweep")
print("Submit each to qi_run_local and collect expected cost values")
