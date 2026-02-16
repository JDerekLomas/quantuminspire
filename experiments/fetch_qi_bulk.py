#!/usr/bin/env python3
"""Bulk fetch QI results using REST API with token refresh."""

import json
import requests
from pathlib import Path

CONFIG = Path.home() / ".quantuminspire" / "config.json"
RESULTS_DIR = Path(__file__).parent / "results"


def refresh_token():
    """Refresh the QI access token using the refresh token."""
    with open(CONFIG) as f:
        config = json.load(f)

    auth = config["auths"]["https://api.quantum-inspire.com"]
    refresh = auth["tokens"]["refresh_token"]

    # Get well-known config
    wk = requests.get(auth["well_known_endpoint"]).json()
    token_url = wk["token_endpoint"]

    resp = requests.post(token_url, data={
        "grant_type": "refresh_token",
        "client_id": auth["client_id"],
        "refresh_token": refresh,
    })
    resp.raise_for_status()
    new_tokens = resp.json()

    # Update config
    import time
    auth["tokens"]["access_token"] = new_tokens["access_token"]
    auth["tokens"]["expires_in"] = new_tokens["expires_in"]
    auth["tokens"]["refresh_token"] = new_tokens.get("refresh_token", refresh)
    auth["tokens"]["generated_at"] = time.time()

    with open(CONFIG, "w") as f:
        json.dump(config, f, indent=2)

    print(f"Token refreshed (expires in {new_tokens['expires_in']}s)")
    return new_tokens["access_token"]


def fetch_all_results(job_ids_file, output_file):
    """Fetch results for all jobs in the job IDs file."""
    token = refresh_token()

    with open(job_ids_file) as f:
        data = json.load(f)

    job_ids = data["job_ids"]
    headers = {"Authorization": f"Bearer {token}"}
    base_url = "https://api.quantum-inspire.com"

    all_counts = {}
    failed = []

    for i, (name, job_id) in enumerate(job_ids.items()):
        if isinstance(job_id, str):
            failed.append(name)
            continue

        try:
            resp = requests.get(
                f"{base_url}/compute/job-results/{job_id}",
                headers=headers, timeout=30
            )
            if resp.status_code == 200:
                result = resp.json()
                # Extract counts from result
                if isinstance(result, list) and len(result) > 0:
                    counts = result[0].get("results", {})
                elif isinstance(result, dict):
                    counts = result.get("results", {})
                    if isinstance(counts, list) and len(counts) > 0:
                        counts = counts[0].get("results", {})
                else:
                    counts = {}

                if counts:
                    all_counts[name] = counts
                else:
                    print(f"  [{i+1}/{len(job_ids)}] {name}: no counts in response")
                    failed.append(name)
            else:
                print(f"  [{i+1}/{len(job_ids)}] {name}: HTTP {resp.status_code}")
                failed.append(name)
        except Exception as e:
            print(f"  [{i+1}/{len(job_ids)}] {name}: ERROR {e}")
            failed.append(name)

        if (i + 1) % 10 == 0:
            print(f"  Fetched {len(all_counts)}/{i+1}...")

    print(f"\nDone: {len(all_counts)} fetched, {len(failed)} failed")
    if failed:
        print(f"  Failed: {failed[:5]}{'...' if len(failed)>5 else ''}")

    with open(output_file, "w") as f:
        json.dump(all_counts, f, indent=2)
    print(f"Saved: {output_file}")
    return all_counts


if __name__ == "__main__":
    counts = fetch_all_results(
        RESULTS_DIR / "lih-4qubit-tuna9-jobids.json",
        RESULTS_DIR / "lih-4qubit-tuna9-counts.json"
    )
    print(f"\nTotal circuits fetched: {len(counts)}")
