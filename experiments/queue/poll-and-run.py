#!/usr/bin/env python3
"""Poll Tuna-9 status and run Bell tests when it comes online.

Usage:
    .venv/bin/python experiments/queue/poll-and-run.py

Checks every 2 minutes. When Tuna-9 goes IDLE, runs the missing coupler
Bell tests and exits.
"""

import asyncio
import json
import sys
import time
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

from quantuminspire.util.api.remote_backend import RemoteBackend
from quantuminspire.sdk.models.circuit import Circuit
from quantuminspire.sdk.quantum_interface import QuantumInterface

BACKEND_ID = 6  # Tuna-9
SHOTS = 4096
PAIRS = [(4, 7), (5, 7)]
POLL_INTERVAL = 120  # seconds


def check_status():
    """Check Tuna-9 backend status. Returns status string."""
    try:
        rb = RemoteBackend()
        bts = rb.get_backend_types()
        for bt in bts.items:
            if bt.id == BACKEND_ID:
                return str(bt.status).replace('BackendStatus.', '')
    except Exception as e:
        return f"ERROR: {e}"
    return "NOT_FOUND"


def bell_cqasm(q0: int, q1: int) -> str:
    return f"""version 3.0
qubit[9] q
bit[9] b

H q[{q0}]
CNOT q[{q0}], q[{q1}]

b = measure q
"""


async def run_bell_tests():
    """Run Bell tests on the missing coupler pairs."""
    print(f"\n{'='*50}")
    print(f"TUNA-9 IS ONLINE — running Bell tests")
    print(f"{'='*50}")
    print(f"Pairs: {PAIRS}")
    print(f"Shots: {SHOTS}\n")

    qi = QuantumInterface(backend_type_id=BACKEND_ID)
    results = []

    for q0, q1 in PAIRS:
        label = f"{q0}-{q1}"
        print(f"  Submitting Bell test for {label}...")

        circuit = Circuit(
            content=bell_cqasm(q0, q1),
            content_type="cqasm3",
        )

        try:
            job_id = await qi.run_circuit(circuit, backend_type_id=BACKEND_ID, number_of_shots=SHOTS)
            raw = await qi.get_results(job_id)

            counts = {}
            total = 0
            for bitstring, count in raw.items():
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
            results.append(result)

        except Exception as e:
            error_msg = str(e)
            print(f"    {label}: FAILED — {error_msg[:120]}")
            results.append({
                "pair": label,
                "status": "FAILED",
                "error": error_msg[:200],
            })

    # Save
    output = {
        "experiment": "missing-coupler-test",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "backend": "tuna9",
        "shots": SHOTS,
        "pairs_tested": [f"{a}-{b}" for a, b in PAIRS],
        "context": "12 couplers in API topology, 10 measured. Testing q4-q7 and q5-q7.",
        "results": results,
    }

    outpath = Path("experiments/results/tuna9-missing-couplers.json")
    outpath.write_text(json.dumps(output, indent=2))
    print(f"\nSaved to {outpath}")

    # Summary
    print(f"\n{'='*50}")
    for r in results:
        if r.get("bell_fidelity"):
            print(f"  {r['pair']}: {r['bell_fidelity']:.1%} Bell fidelity — {r['status']}")
        else:
            print(f"  {r['pair']}: {r['status']}")
    print(f"{'='*50}")


def main():
    print(f"Polling Tuna-9 (backend {BACKEND_ID}) every {POLL_INTERVAL}s...")
    print(f"Will run Bell tests on pairs {PAIRS} when IDLE.\n")

    attempt = 0
    while True:
        attempt += 1
        now = datetime.now().strftime("%H:%M:%S")
        status = check_status()
        print(f"[{now}] Check #{attempt}: Tuna-9 is {status}")

        if status == "IDLE":
            asyncio.run(run_bell_tests())
            print("\nDone. Exiting poller.")
            return

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
