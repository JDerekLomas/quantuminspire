#!/usr/bin/env python3
"""Submit Watson 2018 replication circuits to Tuna-9 hardware."""
import json
import sys
sys.path.insert(0, "/Users/dereklomas/haiqu/mcp-servers/qi-circuits")

# Load circuits from emulator results
with open("/Users/dereklomas/haiqu/experiments/results/watson2018-replication-emulator.json") as f:
    data = json.load(f)

circuits = data["circuits_cqasm"]
print(f"Loaded {len(circuits)} circuits")
print("Circuit names:", list(circuits.keys()))

# Submit all circuits to Tuna-9
# Using the QI SDK directly
import os
os.environ["VIRTUAL_ENV"] = "/Users/dereklomas/haiqu/.venv"

from quantuminspire.sdk.models.circuit import Algorithm as QICircuit
from quantuminspire.util.api.remote_backend import RemoteBackend

BACKEND_TYPE_ID = 6  # Tuna-9
SHOTS = 4096

# Initialize backend
backend = RemoteBackend(backend_type_id=BACKEND_TYPE_ID)

job_ids = {}
for name, circuit_str in circuits.items():
    print(f"  Submitting {name}...", end=" ", flush=True)
    try:
        circuit = QICircuit(
            content=circuit_str,
            content_type="cqasm3"
        )
        job = backend.run(circuit, shot_count=SHOTS)
        job_id = job.id
        job_ids[name] = job_id
        print(f"job_id={job_id}")
    except Exception as e:
        print(f"ERROR: {e}")
        job_ids[name] = f"error: {e}"

# Save job IDs
outpath = "/Users/dereklomas/haiqu/experiments/results/watson2018-tuna9-jobs.json"
with open(outpath, "w") as f:
    json.dump({"job_ids": job_ids, "backend": "tuna9", "shots": SHOTS}, f, indent=2)

print(f"\nSaved {len(job_ids)} job IDs to {outpath}")
