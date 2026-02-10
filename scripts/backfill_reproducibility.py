#!/usr/bin/env python3
"""Backfill reproducibility metadata into experiment result files.

Adds:
- schema_version (if missing)
- environment reference
- circuit_sha256 checksum (if circuit is embedded)

Safe to run multiple times — skips fields that already exist.
"""

import json
import hashlib
import os
import sys
from pathlib import Path

RESULTS_DIR = Path("experiments/results")
ENV_FILE = Path("experiments/environment.json")

def sha256(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()

def backfill_file(path: Path, dry_run: bool = False) -> list[str]:
    """Add missing reproducibility fields. Returns list of changes made."""
    with open(path) as f:
        data = json.load(f)

    if isinstance(data, list):
        return [f"SKIP (list format): {path.name}"]

    changes = []

    # schema_version
    if "schema_version" not in data:
        data["schema_version"] = "1.0"
        changes.append("added schema_version")

    # environment reference
    if "environment" not in data:
        data["environment"] = "experiments/environment.json"
        changes.append("added environment ref")

    # circuit checksums
    for field in ("circuit_cqasm", "circuit_qasm"):
        if field in data and f"{field}_sha256" not in data:
            circuit_text = data[field]
            if isinstance(circuit_text, str):
                data[f"{field}_sha256"] = sha256(circuit_text)
                changes.append(f"added {field}_sha256")

    # checksums for raw_counts (multi-circuit experiments store circuits in separate file)
    if "raw_counts" in data and "raw_counts_sha256" not in data:
        counts_str = json.dumps(data["raw_counts"], sort_keys=True)
        data["raw_counts_sha256"] = sha256(counts_str)
        changes.append("added raw_counts_sha256")

    if changes and not dry_run:
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
            f.write("\n")

    return changes

def main():
    dry_run = "--dry-run" in sys.argv

    if not RESULTS_DIR.exists():
        print(f"Results directory not found: {RESULTS_DIR}")
        sys.exit(1)

    files = sorted(RESULTS_DIR.glob("*.json"))
    print(f"Found {len(files)} result files")
    print(f"Mode: {'DRY RUN' if dry_run else 'WRITE'}")
    print()

    total_changes = 0
    for path in files:
        changes = backfill_file(path, dry_run)
        if changes:
            prefix = "[DRY]" if dry_run else "[OK]"
            print(f"  {prefix} {path.name}: {', '.join(changes)}")
            total_changes += len(changes)

    print(f"\nTotal changes: {total_changes}")

if __name__ == "__main__":
    main()
