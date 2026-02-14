#!/usr/bin/env python3
"""Submit H2 4-qubit VQE circuits to Tuna-9 hardware."""

import json
import time
from pathlib import Path

from quantuminspire.util.api.remote_backend import RemoteBackend
from quantuminspire.sdk.models.cqasm_algorithm import CqasmAlgorithm
from quantuminspire.sdk.models.job_options import JobOptions

CIRCUITS_FILE = Path(__file__).parent / "results" / "h2-4qubit-tuna9-circuits-native.json"
BACKEND_TYPE_ID = 6  # Tuna-9
N_SHOTS = 4096

with open(CIRCUITS_FILE) as f:
    data = json.load(f)

backend = RemoteBackend()
options = JobOptions(number_of_shots=N_SHOTS)

job_ids = {}
for name, circuit in data["circuits"].items():
    algo = CqasmAlgorithm(platform_name="Quantum Inspire", program_name=f"h2_vqe_{name}")
    algo._content = circuit
    job_id = backend.run(algo, backend_type_id=BACKEND_TYPE_ID, options=options)
    job_ids[name] = job_id
    print(f"  {name}: job_id={job_id}")
    time.sleep(1)

print(f"\nAll {len(job_ids)} circuits submitted.")
print(json.dumps(job_ids, indent=2))

# Save job IDs
out = Path(__file__).parent / "results" / "h2-4qubit-tuna9-jobids.json"
with open(out, "w") as f:
    json.dump({"circuits": "h2-4qubit-tuna9-circuits-native.json", "backend": "Tuna-9",
               "n_shots": N_SHOTS, "job_ids": job_ids}, f, indent=2)
print(f"Job IDs saved: {out}")
