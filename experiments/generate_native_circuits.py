#!/usr/bin/env python3
"""Convert H2 VQE circuits to Tuna-9 native gate set: CZ, Ry, Rz (+ X).

Reads circuits from h2-4qubit-tuna9-circuits.json, decomposes non-native
gates, merges adjacent single-qubit rotations, and verifies equivalence
on the local emulator.

Decompositions (up to global phase):
  CNOT(a,b) -> Ry(-pi/2) b; CZ a,b; Ry(pi/2) b
  H         -> Rz(pi); Ry(pi/2)      [cQASM order: Rz first in time]
  Sdag      -> Rz(-pi/2)
  X         -> kept as-is (Tuna-9 handles it)
  Ry(t)     -> native
  Rz(t)     -> native
"""

import json
import math
import re
import sys

PI = 3.141593
HALF_PI = PI / 2

INPUT = "/Users/dereklomas/haiqu/experiments/results/h2-4qubit-tuna9-circuits.json"
OUTPUT = "/Users/dereklomas/haiqu/experiments/results/h2-4qubit-tuna9-circuits-native.json"


def parse_gate(line):
    """Parse a single cQASM gate line into (gate_name, params, qubits).

    Returns None for non-gate lines (comments, blank, headers).
    """
    line = line.strip()
    if not line or line.startswith("//"):
        return None
    if line.startswith("version") or line.startswith("qubit[") or line.startswith("bit["):
        return None
    if line.startswith("b = measure"):
        return None

    # Match: GateName(param) q[i], q[j]  OR  GateName q[i], q[j]
    m = re.match(
        r"(\w+)"           # gate name
        r"(?:\(([^)]+)\))?" # optional (param)
        r"\s+"
        r"(.+)",           # qubit arguments
        line,
    )
    if not m:
        raise ValueError(f"Cannot parse gate line: {line!r}")

    gate = m.group(1)
    param = float(m.group(2)) if m.group(2) else None
    qubits_str = m.group(3)
    qubits = re.findall(r"q\[\d+\]", qubits_str)

    return gate, param, qubits


def decompose_gate(gate, param, qubits):
    """Return list of (gate, param, qubit_str) tuples for native decomposition.

    Each tuple represents one native gate line.
    """
    if gate == "X":
        return [("X", None, qubits[0])]
    elif gate == "Ry":
        return [("Ry", param, qubits[0])]
    elif gate == "Rz":
        return [("Rz", param, qubits[0])]
    elif gate == "CZ":
        return [("CZ", None, f"{qubits[0]}, {qubits[1]}")]
    elif gate == "CNOT":
        # CNOT(a,b) = Ry(-pi/2) b; CZ a,b; Ry(pi/2) b
        a, b = qubits
        return [
            ("Ry", -HALF_PI, b),
            ("CZ", None, f"{a}, {b}"),
            ("Ry", HALF_PI, b),
        ]
    elif gate == "H":
        # H = Rz(pi); Ry(pi/2) in cQASM order (Rz applied first in time)
        q = qubits[0]
        return [
            ("Rz", PI, q),
            ("Ry", HALF_PI, q),
        ]
    elif gate == "Sdag":
        # Sdag = Rz(-pi/2)
        return [("Rz", -HALF_PI, qubits[0])]
    else:
        raise ValueError(f"Unknown gate: {gate}")


def format_gate(gate, param, qubit_str):
    """Format a native gate as a cQASM 3.0 line."""
    if param is not None:
        return f"{gate}({param:.6f}) {qubit_str}"
    else:
        return f"{gate} {qubit_str}"


def extract_single_qubit(qubit_str):
    """Extract qubit identifier from a single-qubit gate's qubit string.

    Returns the qubit (e.g. 'q[2]') or None if multi-qubit.
    """
    parts = re.findall(r"q\[\d+\]", qubit_str)
    if len(parts) == 1:
        return parts[0]
    return None


def merge_rotations(gates):
    """Merge consecutive Ry-Ry or Rz-Rz on the same qubit.

    Input/output: list of (gate, param, qubit_str) tuples.
    """
    merged = []
    for gate, param, qubit_str in gates:
        if merged and gate in ("Ry", "Rz"):
            prev_gate, prev_param, prev_qubit = merged[-1]
            if prev_gate == gate and prev_qubit == qubit_str:
                # Merge: Ry(a); Ry(b) -> Ry(a+b)
                new_param = prev_param + param
                merged[-1] = (gate, new_param, qubit_str)
                continue
        merged.append((gate, param, qubit_str))

    # Remove near-zero rotations (|angle| < 1e-9)
    result = []
    for gate, param, qubit_str in merged:
        if gate in ("Ry", "Rz") and abs(param) < 1e-9:
            continue
        result.append((gate, param, qubit_str))

    return result


def convert_circuit(circuit_str):
    """Convert a full cQASM 3.0 circuit to native gates."""
    lines = circuit_str.split("\n")

    # Extract header and footer
    header_lines = []
    gate_lines = []
    footer_lines = []
    in_gates = False
    past_gates = False

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("//") or stripped == "":
            # Skip comments and blank lines entirely
            continue
        if stripped.startswith("version") or stripped.startswith("qubit["):
            header_lines.append(stripped)
            continue
        if stripped.startswith("bit["):
            footer_lines.append(stripped)
            past_gates = True
            continue
        if stripped.startswith("b = measure"):
            footer_lines.append(stripped)
            continue
        if past_gates:
            footer_lines.append(stripped)
            continue
        # It's a gate line
        gate_lines.append(stripped)

    # Parse and decompose all gates
    native_gates = []
    for line in gate_lines:
        parsed = parse_gate(line)
        if parsed is None:
            continue
        gate, param, qubits = parsed
        decomposed = decompose_gate(gate, param, qubits)
        native_gates.extend(decomposed)

    # Merge consecutive same-axis rotations on same qubit
    native_gates = merge_rotations(native_gates)

    # Build output circuit
    out_lines = []
    out_lines.extend(header_lines)
    for gate, param, qubit_str in native_gates:
        out_lines.append(format_gate(gate, param, qubit_str))
    out_lines.extend(footer_lines)

    return "\n".join(out_lines)


def verify_circuits(original_data, native_data, shots=16384):
    """Run both original and native circuits on emulator, compare distributions."""
    import qxelarator

    print("=" * 60)
    print("  VERIFICATION: original vs native on local emulator")
    print(f"  Shots per circuit: {shots}")
    print("=" * 60)

    all_ok = True
    for name in original_data["circuits"]:
        orig_circuit = original_data["circuits"][name]
        native_circuit = native_data["circuits"][name]

        orig_result = qxelarator.execute_string(orig_circuit, iterations=shots)
        native_result = qxelarator.execute_string(native_circuit, iterations=shots)

        orig_counts = orig_result.results
        native_counts = native_result.results

        # Get all bitstrings from both
        all_bs = set(orig_counts.keys()) | set(native_counts.keys())

        # Compute total variation distance
        tvd = 0.0
        for bs in all_bs:
            p_orig = orig_counts.get(bs, 0) / shots
            p_native = native_counts.get(bs, 0) / shots
            tvd += abs(p_orig - p_native)
        tvd /= 2  # TVD = 0.5 * sum |p-q|

        # Expected TVD from shot noise alone: ~ sqrt(|support| / shots)
        support_size = max(len(all_bs), 1)
        expected_tvd = math.sqrt(support_size / shots)

        ok = tvd < 3 * expected_tvd + 0.02  # generous tolerance
        status = "OK" if ok else "MISMATCH"
        if not ok:
            all_ok = False

        print(f"\n  {name}:")
        print(f"    TVD = {tvd:.4f}  (expected noise ~ {expected_tvd:.4f})  [{status}]")

        # Show top bitstrings
        top_orig = sorted(orig_counts.items(), key=lambda x: -x[1])[:4]
        top_native = sorted(native_counts.items(), key=lambda x: -x[1])[:4]
        print(f"    Original top: {', '.join(f'{bs}:{c}' for bs, c in top_orig)}")
        print(f"    Native top:   {', '.join(f'{bs}:{c}' for bs, c in top_native)}")

    print("\n" + "=" * 60)
    if all_ok:
        print("  ALL CIRCUITS VERIFIED -- native matches original")
    else:
        print("  WARNING: some circuits show unexpected deviation")
    print("=" * 60)

    return all_ok


def main():
    # Load original circuits
    with open(INPUT) as f:
        original = json.load(f)

    print(f"Loaded {len(original['circuits'])} circuits from {INPUT}")

    # Convert each circuit
    native_circuits = {}
    for name, circuit_str in original["circuits"].items():
        native_circuits[name] = convert_circuit(circuit_str)
        # Count gates
        orig_lines = [l.strip() for l in circuit_str.split("\n")
                       if l.strip() and not l.strip().startswith("//")
                       and not l.strip().startswith("version")
                       and not l.strip().startswith("qubit[")
                       and not l.strip().startswith("bit[")
                       and not l.strip().startswith("b = measure")]
        native_lines = [l for l in native_circuits[name].split("\n")
                        if l.strip() and not l.startswith("version")
                        and not l.startswith("qubit[")
                        and not l.startswith("bit[")
                        and not l.startswith("b = measure")]
        print(f"  {name}: {len(orig_lines)} gates -> {len(native_lines)} gates")

    # Build output
    output = {
        "qubit_map": original["qubit_map"],
        "circuits": native_circuits,
        "note": "Native gate set: CZ, Ry, Rz, X only. No H/CNOT/Sdag.",
    }

    # Save
    with open(OUTPUT, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nSaved native circuits to {OUTPUT}")

    # Print one example circuit
    first_name = list(native_circuits.keys())[0]
    print(f"\nExample circuit ({first_name}):")
    print("-" * 40)
    print(native_circuits[first_name])
    print("-" * 40)

    # Verify
    verify_circuits(original, output)


if __name__ == "__main__":
    main()
