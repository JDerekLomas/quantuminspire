#!/usr/bin/env python3
"""One-time script to normalize experiment result JSON files.

Adds consistent metadata fields:
- schema_version: "1.0"
- backend_qubits: inferred from backend name (if missing)
- job_id: null (if missing)

Skips array-format files (sweep data).
"""

import json
import sys
from pathlib import Path

RESULTS_DIR = Path(__file__).resolve().parent.parent / "experiments" / "results"

BACKEND_QUBITS = {
    "ibm_marrakesh": 156,
    "ibm_torino": 133,
    "ibm_fez": 156,
    "tuna-9": 9,
    "qxelarator": None,  # emulator, no fixed qubit count
    "qxelarator (emulator)": None,
}


def infer_qubits(backend: str) -> int | None:
    lower = backend.lower()
    for key, qubits in BACKEND_QUBITS.items():
        if key in lower:
            return qubits
    return None


def normalize_file(filepath: Path) -> bool:
    with open(filepath) as f:
        data = json.load(f)

    # Skip array-format files (sweeps, references)
    if isinstance(data, list):
        return False

    if not isinstance(data, dict) or "id" not in data:
        return False

    changed = False

    if "schema_version" not in data:
        # Insert at beginning by rebuilding dict
        data["schema_version"] = "1.0"
        changed = True

    if "backend_qubits" not in data and "backend" in data:
        qubits = infer_qubits(data["backend"])
        data["backend_qubits"] = qubits
        changed = True

    if "job_id" not in data:
        data["job_id"] = None
        changed = True

    if changed:
        # Reorder keys: schema_version first, then id, then rest
        ordered = {}
        priority_keys = ["schema_version", "id", "type", "backend", "backend_qubits", "job_id"]
        for k in priority_keys:
            if k in data:
                ordered[k] = data[k]
        for k in data:
            if k not in ordered:
                ordered[k] = data[k]

        with open(filepath, "w") as f:
            json.dump(ordered, f, indent=2)
            f.write("\n")

    return changed


def main():
    if not RESULTS_DIR.exists():
        print(f"Results dir not found: {RESULTS_DIR}")
        sys.exit(1)

    files = sorted(RESULTS_DIR.glob("*.json"))
    updated = 0
    skipped = 0

    for fp in files:
        if normalize_file(fp):
            print(f"  updated: {fp.name}")
            updated += 1
        else:
            print(f"  skipped: {fp.name}")
            skipped += 1

    print(f"\nDone. {updated} updated, {skipped} skipped.")


if __name__ == "__main__":
    main()
