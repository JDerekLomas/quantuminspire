#!/Users/dereklomas/haiqu/.venv/bin/python
"""Convert 85 LiH VQE circuits from cQASM 3.0 to OpenQASM 2.0.

Input:  experiments/results/lih-8qubit-vqe-emulator.json  (key: circuits_cqasm)
Output: experiments/results/lih-8qubit-circuits-openqasm.json
"""

import json
import re
import sys
from pathlib import Path

# Gate mapping: cQASM 3.0 name -> OpenQASM 2.0 name
GATE_MAP = {
    "X": "x",
    "Y": "y",
    "Z": "z",
    "H": "h",
    "S": "s",
    "T": "t",
    "Sdag": "sdg",
    "Tdag": "tdg",
    "CNOT": "cx",
    "Ry": "ry",
    "Rz": "rz",
    "Rx": "rx",
}

# Regex for a parameterized gate: GateName(param) qubit_args
RE_PARAM_GATE = re.compile(r"^(\w+)\(([^)]+)\)\s+(.+)$")
# Regex for a simple gate: GateName qubit_args
RE_SIMPLE_GATE = re.compile(r"^(\w+)\s+(.+)$")
# Regex for qubit declaration: qubit[N] q
RE_QUBIT_DECL = re.compile(r"^qubit\[(\d+)\]\s+(\w+)$")
# Regex for bit declaration: bit[N] b
RE_BIT_DECL = re.compile(r"^bit\[(\d+)\]\s+(\w+)$")
# Regex for bulk measure: b = measure q
RE_MEASURE = re.compile(r"^\w+\s*=\s*measure\s+\w+$")


def convert_cqasm_to_openqasm(cqasm: str) -> str:
    """Convert a single cQASM 3.0 circuit string to OpenQASM 2.0."""
    lines = cqasm.strip().split("\n")
    n_qubits = None
    qasm_lines = []

    for raw_line in lines:
        line = raw_line.strip()

        # Skip empty lines and comments
        if not line or line.startswith("//"):
            continue

        # Skip version declaration
        if line.startswith("version"):
            continue

        # Qubit declaration
        m = RE_QUBIT_DECL.match(line)
        if m:
            n_qubits = int(m.group(1))
            continue

        # Bit declaration
        m = RE_BIT_DECL.match(line)
        if m:
            continue

        # Bulk measure statement: b = measure q
        m = RE_MEASURE.match(line)
        if m:
            if n_qubits is None:
                raise ValueError("Encountered measure before qubit declaration")
            for i in range(n_qubits):
                qasm_lines.append(f"measure q[{i}] -> c[{i}];")
            continue

        # Parameterized gate: Ry(0.123) q[0]
        m = RE_PARAM_GATE.match(line)
        if m:
            gate_name = m.group(1)
            param = m.group(2)
            args = m.group(3).strip().rstrip(",")
            oq_gate = GATE_MAP.get(gate_name)
            if oq_gate is None:
                raise ValueError(f"Unknown parameterized gate: {gate_name}")
            # Format qubit args (replace any trailing commas, ensure semicolon)
            qubits = ", ".join(a.strip() for a in args.split(","))
            qasm_lines.append(f"{oq_gate}({param}) {qubits};")
            continue

        # Simple gate: X q[0]  or  CNOT q[0], q[1]
        m = RE_SIMPLE_GATE.match(line)
        if m:
            gate_name = m.group(1)
            args = m.group(2).strip().rstrip(",")
            oq_gate = GATE_MAP.get(gate_name)
            if oq_gate is None:
                raise ValueError(f"Unknown gate: {gate_name}")
            qubits = ", ".join(a.strip() for a in args.split(","))
            qasm_lines.append(f"{oq_gate} {qubits};")
            continue

        raise ValueError(f"Unparsed line: {line!r}")

    if n_qubits is None:
        raise ValueError("No qubit declaration found")

    # Assemble OpenQASM 2.0
    header = [
        "OPENQASM 2.0;",
        'include "qelib1.inc";',
        f"qreg q[{n_qubits}];",
        f"creg c[{n_qubits}];",
    ]
    return "\n".join(header + qasm_lines) + "\n"


def main():
    base = Path("/Users/dereklomas/haiqu/experiments/results")
    input_path = base / "lih-8qubit-vqe-emulator.json"
    output_path = base / "lih-8qubit-circuits-openqasm.json"

    with open(input_path) as f:
        data = json.load(f)

    cqasm_circuits = data["circuits_cqasm"]
    print(f"Loaded {len(cqasm_circuits)} cQASM circuits from {input_path}")

    openqasm_circuits = {}
    for name, cqasm in cqasm_circuits.items():
        try:
            openqasm_circuits[name] = convert_cqasm_to_openqasm(cqasm)
        except Exception as e:
            print(f"ERROR converting circuit '{name}': {e}", file=sys.stderr)
            sys.exit(1)

    with open(output_path, "w") as f:
        json.dump(openqasm_circuits, f, indent=2)

    print(f"Converted {len(openqasm_circuits)} circuits -> {output_path}")

    # Print sample
    sample_name = list(openqasm_circuits.keys())[0]
    print(f"\n--- Sample circuit: {sample_name} ---")
    print(openqasm_circuits[sample_name])


if __name__ == "__main__":
    main()
