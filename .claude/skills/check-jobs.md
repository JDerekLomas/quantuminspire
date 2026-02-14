---
name: check-jobs
description: Check status of quantum hardware jobs on QI Tuna-9 and IBM backends. Polls jobs and fetches results when complete.
---

# Check Quantum Jobs

Quick job status checking and result fetching for both platforms.

## Usage

When the user says `/check-jobs`, look for the most recent job ID files:

```bash
ls -lt experiments/results/*-jobids.json experiments/results/*-jobs.json | head -5
```

Read the file to get job IDs, then check each one.

## QI (Tuna-9)

```
qi_check_job(job_id=ID)
```
Statuses: `PLANNED` → `RUNNING` → `COMPLETED` / `FAILED`

When COMPLETED:
```
qi_get_results(job_id=ID)
```

## IBM

```
ibm_check_job(job_id="ID")
```
Statuses: `QUEUED` → `RUNNING` → `DONE` / `ERROR`

When DONE:
```
ibm_get_results(job_id="ID")
```

## Workflow

1. Find recent job files
2. Check status of each job
3. If all COMPLETED/DONE, fetch all results
4. Save combined results to `experiments/results/<experiment>-hardware-results.json`
5. Report summary: how many done, any failures, ready for analysis

## Common Issues

- **QI 401/403**: Token expired. User needs to run `.venv/bin/qi login`
- **IBM QUEUED for hours**: Normal for free tier. ibm_fez has shorter queues than ibm_torino.
- **FAILED jobs**: Check if circuit exceeds backend limits or uses invalid qubit pairs
