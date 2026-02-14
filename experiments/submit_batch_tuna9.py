#!/usr/bin/env python3
"""Submit native-gate circuits to Tuna-9 via QI SDK.

Reads circuit JSON files, submits each circuit with CompileStage.ROUTING,
and saves job IDs for later retrieval.
"""

import json
import sys
import time
import traceback

RESULTS = "/Users/dereklomas/haiqu/experiments/results"
TUNA9_BACKEND_ID = 6
N_SHOTS = 4096


def submit_circuits(circuit_file, output_file, shots=N_SHOTS):
    """Submit all circuits from a native-gate JSON file to Tuna-9."""
    # Lazy imports to avoid slow startup
    from compute_api_client import CompileStage
    from quantuminspire.sdk.models.cqasm_algorithm import CqasmAlgorithm
    from quantuminspire.sdk.models.job_options import JobOptions
    from quantuminspire.util.api.remote_backend import RemoteBackend

    class PrecompiledAlgorithm(CqasmAlgorithm):
        @property
        def compile_stage(self):
            return CompileStage.ROUTING

    # Load circuits
    with open(circuit_file) as f:
        data = json.load(f)
    circuits = data["circuits"]
    print(f"Loaded {len(circuits)} circuits from {circuit_file}")

    # Connect
    backend = RemoteBackend()
    options = JobOptions(number_of_shots=shots)
    print(f"Connected to QI. Submitting to backend_type_id={TUNA9_BACKEND_ID}")

    # Submit
    job_ids = {}
    for i, (name, circuit_str) in enumerate(circuits.items()):
        algo = PrecompiledAlgorithm(
            platform_name="Quantum Inspire",
            program_name=name
        )
        algo._content = circuit_str

        try:
            job_id = backend.run(algo, backend_type_id=TUNA9_BACKEND_ID, options=options)
            job_ids[name] = job_id
            print(f"  [{i+1}/{len(circuits)}] {name} → job {job_id}")
        except Exception as e:
            print(f"  [{i+1}/{len(circuits)}] {name} → FAILED: {e}")
            job_ids[name] = f"FAILED: {e}"

        # Small delay to avoid rate limiting
        if i < len(circuits) - 1:
            time.sleep(0.5)

    # Save job IDs
    output = {
        "source": circuit_file,
        "backend": "Tuna-9",
        "n_shots": shots,
        "compile_stage": "ROUTING",
        "job_ids": job_ids,
        "n_submitted": sum(1 for v in job_ids.values() if isinstance(v, int)),
        "n_failed": sum(1 for v in job_ids.values() if isinstance(v, str)),
    }
    with open(output_file, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nSaved {output['n_submitted']} job IDs to {output_file}")
    if output["n_failed"] > 0:
        print(f"WARNING: {output['n_failed']} circuits failed to submit")
    return output


def main():
    experiments = [
        (f"{RESULTS}/watson2018-tuna9-circuits-native.json",
         f"{RESULTS}/watson2018-tuna9-jobids.json"),
        (f"{RESULTS}/h2-sweep-tuna9-circuits-native.json",
         f"{RESULTS}/h2-sweep-tuna9-jobids.json"),
    ]

    # Also include any extra circuit files passed as args
    if len(sys.argv) > 1:
        for arg in sys.argv[1:]:
            base = arg.replace("-circuits-native.json", "")
            experiments.append((arg, f"{base}-jobids.json"))

    for circuit_file, output_file in experiments:
        print(f"\n{'='*60}")
        print(f"  Submitting: {circuit_file}")
        print(f"{'='*60}")
        try:
            submit_circuits(circuit_file, output_file)
        except Exception as e:
            print(f"FATAL ERROR: {e}")
            traceback.print_exc()
            # Continue with next experiment
            continue

    print(f"\n{'='*60}")
    print(f"  ALL SUBMISSIONS COMPLETE")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
