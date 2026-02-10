# Handoff: Live Quantum Experiment Pipeline

**Date:** 2026-02-10
**Session:** Built the full experiment pipeline — daemon, dashboard, seed experiments

## Current State — RESUME HERE

**Committed & pushed** as `2708946` (10 files, 1399 insertions).

**Two uncommitted fixes** in `agents/experiment_daemon.py`:
1. Added `VENV_BIN` path resolution so `qi` binary is found at `.venv/bin/qi`
2. `submit_to_qi()` now resolves qi from venv before falling back to PATH

**Blocker to re-run:** `experiments/queue/bell-calibration-001.json` has `"status": "failed"` from the first attempt (qi wasn't found). Reset it to `"pending"` before re-running:
```bash
# Fix the queue file, then run:
.venv/bin/python agents/experiment_daemon.py --once
```

**QI output parsing** is the next likely issue — the daemon tries to parse JSON from `qi files run` stdout, but QI may output extra text. Watch for parse errors and adjust the output parsing in `submit_to_qi()`.

## What Was Done

### New Files Created
- `experiments/queue/bell-calibration-001.json` — Bell state seed (priority 1)
- `experiments/queue/ghz-003.json` — 3-qubit GHZ seed (priority 2)
- `experiments/queue/vqe-equilibrium-001.json` — H2 VQE at 0.735 A (priority 3)
- `experiments/results/.gitkeep` — Empty results dir
- `experiments/templates/.gitkeep` — Empty templates dir
- `agents/experiment_daemon.py` — Core daemon (~430 lines)
- `lib/experiments.ts` — Data loader (follows lib/blog.ts pattern)
- `app/experiments/page.tsx` — Dashboard page with typed result cards

### Modified Files
- `app/page.tsx` — Added "Live Hardware" link in nav bar

### Deployed
- Production: https://quantuminspire.vercel.app/experiments
- Currently shows empty state (no results yet)

## Architecture

```
experiments/queue/*.json -> daemon picks up -> generates cQASM 3.0
  -> submits to QI via `qi files run` -> polls -> analyzes
  -> writes experiments/results/*.json -> git commit -> Vercel redeploys
```

### Daemon CLI
```bash
.venv/bin/python agents/experiment_daemon.py --status     # Show queue
.venv/bin/python agents/experiment_daemon.py --dry-run    # Generate circuits only
.venv/bin/python agents/experiment_daemon.py --once       # Run one experiment
.venv/bin/python agents/experiment_daemon.py --daemon     # Run continuously (5min interval)
.venv/bin/python agents/experiment_daemon.py --seed       # Recreate seed experiments
```

### Experiment Types Supported
1. **bell_calibration** — H + CNOT, fidelity analysis
2. **ghz_state** — H + CNOT chain, parity distribution
3. **vqe_h2** — 2-qubit BK-reduced VQE, 3 measurement bases (Z/X/Y), energy reconstruction

## What's Verified
- `--status` correctly shows 3 pending experiments
- `--dry-run` generates valid cQASM 3.0 for all 3 types
- `npm run build` succeeds
- Vercel deploy succeeds
- qi binary found at `.venv/bin/qi` (SDK 3.5.1 installed)

## Next Steps

### Immediate
1. Reset `bell-calibration-001.json` status to `"pending"`
2. Run `.venv/bin/python agents/experiment_daemon.py --once` — debug QI output parsing
3. Commit the daemon fix + first result

### Hetzner VPS Deployment
1. SSH to VPS (`secret-lover get HETZNER_VPS_IP`)
2. Clone repo, set up Python 3.12 venv, install QI SDK
3. Run `qi login` interactively (one-time GitHub OAuth)
4. Set up systemd service or tmux for daemon
5. Configure git push credentials for auto-commit

## Key Design Decisions
- **QI submission** uses `qi files run` with temp hybrid Python files (same pattern as `bell_state_hybrid.py`)
- **VQE circuits** use simplified 2-qubit BK-reduced ansatz, consistent with Sagastizabal paper
- **H2 coefficients** hardcoded for R=0.735 A; would need lookup table for parameter sweeps
- **Dashboard** is static (built at deploy time from JSON files), not SSR
