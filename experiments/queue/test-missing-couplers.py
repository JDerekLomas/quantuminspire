#!/usr/bin/env python3
"""Test the 4 candidate missing coupler pairs on Tuna-9.

Official spec says 12 couplers, our experiments found 10 edges.
These 4 pairs are at "tier 2" distance in the schematic — next-nearest
neighbors that FAILED in our original connectivity discovery.

Run when Tuna-9 is IDLE:
    .venv/bin/python experiments/queue/test-missing-couplers.py
"""

import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# Monkey-patch the image_id length bug
from compute_api_client import BackendType as BT
_orig_init = BT.__init__
def _patched_init(self, **kwargs):
    if 'image_id' in kwargs and kwargs['image_id'] and len(str(kwargs['image_id'])) > 16:
        kwargs['image_id'] = str(kwargs['image_id'])[:16]
    _orig_init(self, **kwargs)
BT.__init__ = _patched_init

from quantuminspire.sdk.models.circuit import Circuit
from quantuminspire.sdk.quantum_interface import QuantumInterface

BACKEND_ID = 6  # Tuna-9
SHOTS = 4096
CANDIDATE_PAIRS = [(4, 7), (5, 7)]  # confirmed by API topology, not yet Bell-tested


def bell_cqasm(q0: int, q1: int) -> str:
    """Generate cQASM 3.0 Bell state circuit for a qubit pair."""
    return f"""version 3.0
qubit[9] q
bit[9] b

H q[{q0}]
CNOT q[{q0}], q[{q1}]

b = measure q
"""


async def run_bell_test(qi: QuantumInterface, pair: tuple[int, int]) -> dict:
    """Submit a Bell test for one pair, return results or failure info."""
    q0, q1 = pair
    label = f"{q0}-{q1}"
    print(f"  Submitting Bell test for pair {label}...")

    circuit = Circuit(
        content=bell_cqasm(q0, q1),
        content_type="cqasm3",
    )

    try:
        job_id = await qi.run_circuit(circuit, backend_type_id=BACKEND_ID, number_of_shots=SHOTS)
        results = await qi.get_results(job_id)

        # Parse results
        counts = {}
        total = 0
        for bitstring, count in results.items():
            # Extract just the two relevant qubits (LSB convention)
            b0 = int(bitstring[q0])
            b1 = int(bitstring[q1])
            key = f"{b0}{b1}"
            counts[key] = counts.get(key, 0) + count
            total += count

        correlated = counts.get("00", 0) + counts.get("11", 0)
        fidelity = correlated / total if total > 0 else 0

        result = {
            "pair": label,
            "job_id": job_id,
            "status": "CONNECTED" if fidelity > 0.6 else "WEAK",
            "bell_fidelity": round(fidelity, 3),
            "counts_00": counts.get("00", 0),
            "counts_01": counts.get("01", 0),
            "counts_10": counts.get("10", 0),
            "counts_11": counts.get("11", 0),
            "total_shots": total,
        }
        print(f"    {label}: fidelity={fidelity:.3f} {'CONNECTED' if fidelity > 0.6 else 'WEAK'}")
        return result

    except Exception as e:
        error_msg = str(e)
        status = "FAILED"
        if "rejected" in error_msg.lower() or "not supported" in error_msg.lower():
            status = "REJECTED"
        print(f"    {label}: {status} — {error_msg[:100]}")
        return {
            "pair": label,
            "status": status,
            "error": error_msg[:200],
        }


async def main():
    print(f"Testing {len(CANDIDATE_PAIRS)} candidate coupler pairs on Tuna-9")
    print(f"Pairs: {CANDIDATE_PAIRS}")
    print(f"Shots: {SHOTS}")
    print()

    qi = QuantumInterface(backend_type_id=BACKEND_ID)

    results = []
    for pair in CANDIDATE_PAIRS:
        result = await run_bell_test(qi, pair)
        results.append(result)

    # Summary
    print("\n" + "=" * 50)
    print("RESULTS SUMMARY")
    print("=" * 50)
    connected = [r for r in results if r.get("status") == "CONNECTED"]
    failed = [r for r in results if r.get("status") in ("FAILED", "REJECTED")]
    weak = [r for r in results if r.get("status") == "WEAK"]

    print(f"Connected: {len(connected)}")
    for r in connected:
        print(f"  {r['pair']}: fidelity={r['bell_fidelity']}")
    print(f"Weak: {len(weak)}")
    for r in weak:
        print(f"  {r['pair']}: fidelity={r['bell_fidelity']}")
    print(f"Failed/Rejected: {len(failed)}")
    for r in failed:
        print(f"  {r['pair']}: {r['status']}")

    if connected:
        print(f"\nFound {len(connected)} new edges! Update TUNA9 topology in app/tuna9/page.tsx")

    # Save results
    output = {
        "experiment": "missing-coupler-test",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "backend": "tuna9",
        "shots": SHOTS,
        "candidate_pairs": [f"{a}-{b}" for a, b in CANDIDATE_PAIRS],
        "context": "Official QI spec says 12 couplers. Our connectivity discovery found 10. Testing the 4 next-nearest-neighbor pairs.",
        "results": results,
    }

    outpath = Path("experiments/results/tuna9-missing-couplers.json")
    outpath.write_text(json.dumps(output, indent=2))
    print(f"\nSaved to {outpath}")


if __name__ == "__main__":
    asyncio.run(main())
