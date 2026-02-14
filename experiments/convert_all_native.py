#!/usr/bin/env python3
"""Convert all emulator-only experiments to Tuna-9 native gate set.

Handles: Watson 2018 (20 circuits), QV=16 (10), QAOA 4-cycle (3), H2 sweep (~42).
Outputs individual JSON files with native-gate circuits ready for CompileStage.ROUTING.

Native gate set: CZ, Ry, Rz, X
Decompositions:
  CNOT(a,b) -> Ry(-pi/2,b); CZ(a,b); Ry(pi/2,b)
  H          -> Rz(pi); Ry(pi/2)
  Sdag       -> Rz(-pi/2)
  Rx(theta)  -> Rz(-pi/2); Ry(theta); Rz(pi/2)
"""

import json
import math
import re
import sys

PI = 3.141593
HALF_PI = PI / 2
RESULTS = "/Users/dereklomas/haiqu/experiments/results"


# ===== Gate conversion (reused from generate_native_circuits.py) =====

def parse_gate(line):
    line = line.strip()
    if not line or line.startswith("//"):
        return None
    if line.startswith("version") or line.startswith("qubit[") or line.startswith("bit["):
        return None
    if "measure" in line:
        return None

    m = re.match(r"(\w+)(?:\(([^)]+)\))?\s+(.+)", line)
    if not m:
        raise ValueError(f"Cannot parse: {line!r}")

    gate = m.group(1)
    param = float(m.group(2)) if m.group(2) else None
    qubits = re.findall(r"q\[\d+\]", m.group(3))
    return gate, param, qubits


def decompose_gate(gate, param, qubits):
    if gate == "X":
        return [("X", None, qubits[0])]
    elif gate == "Ry":
        return [("Ry", param, qubits[0])]
    elif gate == "Rz":
        return [("Rz", param, qubits[0])]
    elif gate == "CZ":
        return [("CZ", None, f"{qubits[0]}, {qubits[1]}")]
    elif gate == "CNOT":
        a, b = qubits
        return [
            ("Ry", -HALF_PI, b),
            ("CZ", None, f"{a}, {b}"),
            ("Ry", HALF_PI, b),
        ]
    elif gate == "H":
        q = qubits[0]
        return [("Rz", PI, q), ("Ry", HALF_PI, q)]
    elif gate == "Sdag":
        return [("Rz", -HALF_PI, qubits[0])]
    elif gate == "S":
        return [("Rz", HALF_PI, qubits[0])]
    elif gate == "Rx":
        q = qubits[0]
        return [("Rz", -HALF_PI, q), ("Ry", param, q), ("Rz", HALF_PI, q)]
    else:
        raise ValueError(f"Unknown gate: {gate}")


def format_gate(gate, param, qubit_str):
    if param is not None:
        return f"{gate}({param:.6f}) {qubit_str}"
    return f"{gate} {qubit_str}"


def merge_rotations(gates):
    merged = []
    for gate, param, qubit_str in gates:
        if merged and gate in ("Ry", "Rz"):
            prev_gate, prev_param, prev_qubit = merged[-1]
            if prev_gate == gate and prev_qubit == qubit_str:
                merged[-1] = (gate, prev_param + param, qubit_str)
                continue
        merged.append((gate, param, qubit_str))
    return [(g, p, q) for g, p, q in merged if g not in ("Ry", "Rz") or abs(p) > 1e-9]


def convert_circuit(circuit_str, force_9qubit_measure=False):
    """Convert a cQASM 3.0 circuit to native gates.

    If force_9qubit_measure=True, replaces any bit[N] + individual measures
    with bit[9] b; b = measure q.
    """
    lines = circuit_str.strip().split("\n")

    header = []
    gate_lines = []
    has_9q_measure = False

    for line in lines:
        s = line.strip()
        if not s or s.startswith("//"):
            continue
        if s.startswith("version"):
            header.append(s)
        elif s.startswith("qubit["):
            header.append("qubit[9] q")
        elif s.startswith("bit["):
            continue  # we'll add our own
        elif "measure" in s:
            continue  # skip old measures
        else:
            gate_lines.append(s)

    # Parse and decompose
    native_gates = []
    for line in gate_lines:
        parsed = parse_gate(line)
        if parsed is None:
            continue
        gate, param, qubits = parsed
        native_gates.extend(decompose_gate(gate, param, qubits))

    native_gates = merge_rotations(native_gates)

    out = header + [format_gate(g, p, q) for g, p, q in native_gates]
    out.append("bit[9] b")
    out.append("b = measure q")
    return "\n".join(out)


# ===== Experiment converters =====

def convert_watson():
    """Convert Watson 2018 Bell tomography + DJ + Grover circuits."""
    print("\n=== Watson 2018 ===")
    with open(f"{RESULTS}/watson2018-replication-emulator.json") as f:
        data = json.load(f)

    circuits = data["circuits_cqasm"]
    native = {}
    for name, cqasm in circuits.items():
        native[name] = convert_circuit(cqasm)
        # Count CZ gates
        cz_count = native[name].count("CZ")
        print(f"  {name}: {cz_count} CZ gates")

    output = {
        "experiment": "Watson 2018 Replication — Tuna-9 native",
        "circuits": native,
        "gate_set": "native (CZ, Ry, Rz, X)",
        "qubit_pair": [4, 6],
        "n_circuits": len(native),
    }
    outfile = f"{RESULTS}/watson2018-tuna9-circuits-native.json"
    with open(outfile, "w") as f:
        json.dump(output, f, indent=2)
    print(f"  Saved {len(native)} circuits to {outfile}")
    return output


def convert_qv16():
    """Convert QV=16 circuits (fix bit[4] → bit[9] measure format)."""
    print("\n=== QV=16 ===")
    with open(f"{RESULTS}/qv16-tuna9-emulator.json") as f:
        data = json.load(f)

    circuits = data["circuits"]
    native = {}
    for name, cqasm in circuits.items():
        native[name] = convert_circuit(cqasm, force_9qubit_measure=True)
        cz_count = native[name].count("CZ")
        print(f"  {name}: {cz_count} CZ gates")

    output = {
        "experiment": "QV=16 — Tuna-9 native",
        "circuits": native,
        "gate_set": "native (CZ, Ry, Rz, X)",
        "backend_qubits": [4, 6, 7, 8],
        "n_circuits": len(native),
        "ideal_distributions": data["ideal_distributions"],
    }
    outfile = f"{RESULTS}/qv16-tuna9-circuits-native.json"
    with open(outfile, "w") as f:
        json.dump(output, f, indent=2)
    print(f"  Saved {len(native)} circuits to {outfile}")
    return output


def convert_qaoa():
    """Convert QAOA 4-cycle circuits (H, CNOT, Rx → native)."""
    print("\n=== QAOA 4-cycle ===")
    with open(f"{RESULTS}/qaoa-4cycle-emulator.json") as f:
        data = json.load(f)

    circuits = data["circuits"]
    native = {}
    for name, cqasm in circuits.items():
        native[name] = convert_circuit(cqasm)
        cz_count = native[name].count("CZ")
        print(f"  {name}: {cz_count} CZ gates")

    output = {
        "experiment": "QAOA MaxCut 4-cycle — Tuna-9 native",
        "circuits": native,
        "gate_set": "native (CZ, Ry, Rz, X)",
        "n_circuits": len(native),
    }
    outfile = f"{RESULTS}/qaoa-4cycle-tuna9-circuits-native.json"
    with open(outfile, "w") as f:
        json.dump(output, f, indent=2)
    print(f"  Saved {len(native)} circuits to {outfile}")
    return output


def generate_h2_sweep():
    """Generate 2-qubit H2 VQE circuits for each bond distance in native gates.

    Circuit structure (on physical q4, q6):
      |01⟩ → Ry(π/2 + α, q4) → CNOT(q4,q6) → [basis rotation] → measure

    Three basis circuits per distance:
      Z-basis: no rotation after CNOT
      X-basis: H on both
      Y-basis: Sdag+H on both
    """
    print("\n=== H2 Bond Sweep ===")
    with open(f"{RESULTS}/vqe-h2-sweep-emulator.json") as f:
        data = json.load(f)

    circuits = {}
    for entry in data:
        R = entry["bond_distance"]
        alpha = entry["alpha"]
        coeffs = entry["coefficients"]
        label = f"R{R:.1f}".replace(".", "p")

        # Z-basis circuit (native)
        angle = HALF_PI + alpha
        z_lines = [
            "version 3.0",
            "qubit[9] q",
            f"X q[6]",
            f"Ry({angle:.6f}) q[4]",
            f"Ry({-HALF_PI:.6f}) q[6]",
            f"CZ q[4], q[6]",
            f"Ry({HALF_PI:.6f}) q[6]",
            "bit[9] b",
            "b = measure q",
        ]
        circuits[f"{label}_Z"] = "\n".join(z_lines)

        # X-basis circuit (native): add H on q4, q6 after CNOT
        # Ry(π/2) from CNOT + Rz(π) from H + Ry(π/2) from H on q6
        # Can't merge Ry+Rz, so keep separate
        x_lines = [
            "version 3.0",
            "qubit[9] q",
            f"X q[6]",
            f"Ry({angle:.6f}) q[4]",
            f"Ry({-HALF_PI:.6f}) q[6]",
            f"CZ q[4], q[6]",
            f"Ry({HALF_PI:.6f}) q[6]",
            # H on q4: Rz(π); Ry(π/2)
            f"Rz({PI:.6f}) q[4]",
            f"Ry({HALF_PI:.6f}) q[4]",
            # H on q6: Rz(π); Ry(π/2)
            f"Rz({PI:.6f}) q[6]",
            f"Ry({HALF_PI:.6f}) q[6]",
            "bit[9] b",
            "b = measure q",
        ]
        circuits[f"{label}_X"] = "\n".join(x_lines)

        # Y-basis circuit (native): Sdag+H on both
        # Sdag = Rz(-π/2), H = Rz(π)+Ry(π/2)
        # Rz(-π/2) + Rz(π) = Rz(π/2)
        y_lines = [
            "version 3.0",
            "qubit[9] q",
            f"X q[6]",
            f"Ry({angle:.6f}) q[4]",
            f"Ry({-HALF_PI:.6f}) q[6]",
            f"CZ q[4], q[6]",
            f"Ry({HALF_PI:.6f}) q[6]",
            # Sdag+H on q4: Rz(-π/2)+Rz(π) = Rz(π/2); Ry(π/2)
            f"Rz({HALF_PI:.6f}) q[4]",
            f"Ry({HALF_PI:.6f}) q[4]",
            # Sdag+H on q6: Rz(π/2); Ry(π/2)
            f"Rz({HALF_PI:.6f}) q[6]",
            f"Ry({HALF_PI:.6f}) q[6]",
            "bit[9] b",
            "b = measure q",
        ]
        circuits[f"{label}_Y"] = "\n".join(y_lines)

        print(f"  R={R:.1f} Å, α={alpha:.6f}: 3 circuits (Z/X/Y)")

    # Store bond distance data for analysis
    sweep_meta = [{
        "bond_distance": e["bond_distance"],
        "alpha": e["alpha"],
        "energy_exact": e["energy_exact"],
        "fci_energy": e["fci_energy"],
        "hf_energy": e["hf_energy"],
        "coefficients": e["coefficients"],
    } for e in data]

    output = {
        "experiment": "H2 2-qubit bond sweep — Tuna-9 native",
        "circuits": circuits,
        "gate_set": "native (CZ, Ry, Rz, X)",
        "qubit_pair": [4, 6],
        "n_circuits": len(circuits),
        "bond_distances": sweep_meta,
    }
    outfile = f"{RESULTS}/h2-sweep-tuna9-circuits-native.json"
    with open(outfile, "w") as f:
        json.dump(output, f, indent=2)
    print(f"  Saved {len(circuits)} circuits to {outfile}")
    return output


# ===== Emulator verification =====

def verify_sample(native_data, n_samples=3, shots=8192):
    """Verify a few native circuits on the local emulator."""
    import qxelarator

    names = list(native_data["circuits"].keys())[:n_samples]
    print(f"\n  Verifying {n_samples} circuits on emulator ({shots} shots)...")

    for name in names:
        circuit = native_data["circuits"][name]
        result = qxelarator.execute_string(circuit, iterations=shots)
        if hasattr(result, "results"):
            top = sorted(result.results.items(), key=lambda x: -x[1])[:5]
            top_str = ", ".join(f"{bs}:{c}" for bs, c in top)
            print(f"    {name}: {top_str}")
        else:
            print(f"    {name}: ERROR — {result}")
            return False
    return True


# ===== Main =====

def main():
    print("=" * 60)
    print("  Converting all experiments to Tuna-9 native gate set")
    print("=" * 60)

    watson = convert_watson()
    qv16 = convert_qv16()
    qaoa = convert_qaoa()
    h2sweep = generate_h2_sweep()

    # Verify samples
    print("\n" + "=" * 60)
    print("  EMULATOR VERIFICATION")
    print("=" * 60)

    for label, data in [("Watson", watson), ("QV=16", qv16),
                         ("QAOA", qaoa), ("H2 sweep", h2sweep)]:
        print(f"\n  --- {label} ---")
        ok = verify_sample(data)
        if not ok:
            print(f"  FAILED: {label}")
            sys.exit(1)

    print("\n" + "=" * 60)
    print("  ALL VERIFIED — ready for Tuna-9 submission")
    print("=" * 60)

    # Summary
    total = sum(d["n_circuits"] for d in [watson, qv16, qaoa, h2sweep])
    print(f"\n  Total circuits: {total}")
    print(f"    Watson 2018: {watson['n_circuits']} circuits")
    print(f"    QV=16:       {qv16['n_circuits']} circuits")
    print(f"    QAOA:        {qaoa['n_circuits']} circuits")
    print(f"    H2 sweep:    {h2sweep['n_circuits']} circuits")


if __name__ == "__main__":
    main()
