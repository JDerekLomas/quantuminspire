# Handoff: Live Quantum Experiment Pipeline

**Date:** 2026-02-10
**Session:** Built the full experiment pipeline — daemon, dashboard, seed experiments

## What Was Done

### New Files Created
- `experiments/queue/bell-calibration-001.json` — Bell state seed (priority 1)
- `experiments/queue/ghz-003.json` — 3-qubit GHZ seed (priority 2)
- `experiments/queue/vqe-equilibrium-001.json` — H2 VQE at 0.735 Å (priority 3)
- `experiments/results/.gitkeep` — Empty results dir
- `experiments/templates/.gitkeep` — Empty templates dir
- `agents/experiment_daemon.py` — Core daemon (~430 lines)
- `lib/experiments.ts` — Data loader (follows lib/blog.ts pattern)
- `app/experiments/page.tsx` — Dashboard page with typed result cards

### Modified Files
- `app/page.tsx` — Added "Live Hardware" link in nav bar

### Deployed
- Production: https://quantuminspire.vercel.app/experiments
- Currently shows empty state with 3 pending experiments in queue

## Architecture

```
experiments/queue/*.json → daemon picks up → generates cQASM 3.0
  → submits to QI via `qi files run` → polls → analyzes
  → writes experiments/results/*.json → git commit → Vercel redeploys
```

### Daemon CLI
```bash
python agents/experiment_daemon.py --status     # Show queue
python agents/experiment_daemon.py --dry-run    # Generate circuits only
python agents/experiment_daemon.py --once       # Run one experiment
python agents/experiment_daemon.py --daemon     # Run continuously (5min interval)
python agents/experiment_daemon.py --seed       # Recreate seed experiments
```

### Experiment Types Supported
1. **bell_calibration** — H + CNOT, fidelity analysis
2. **ghz_state** — H + CNOT chain, parity distribution
3. **vqe_h2** — 2-qubit BK-reduced VQE, 3 measurement bases (Z/X/Y), energy reconstruction

### Dashboard Features
- Typed cards per experiment type (Bell → fidelity bar, GHZ → parity distribution, VQE → energy comparison)
- Queue status section
- Stats bar (completed/pending/running counts, backends, last run)
- "How it works" pipeline visualization

## What's Verified
- `--status` correctly shows 3 pending experiments
- `--dry-run` generates valid cQASM 3.0 for all 3 types (including VQE Z/X/Y basis circuits)
- `npm run build` succeeds
- Vercel deploy succeeds

## What's NOT Done (Next Steps)

### Immediate
1. **Run first real experiment**: `python agents/experiment_daemon.py --once` (needs QI emulator or hardware)
2. **Git commit all new files** — everything is uncommitted
3. **Test QI submission** — the `submit_to_qi()` function shells out to `qi files run`; needs testing against emulator

### Hetzner VPS Deployment
1. SSH to VPS (`secret-lover get HETZNER_VPS_IP`)
2. Clone repo, set up Python 3.12 venv, install QI SDK
3. Run `qi login` interactively (one-time GitHub OAuth)
4. Set up systemd service or tmux for daemon
5. Configure git push credentials for auto-commit

### Future Enhancements
- Add more experiment types (randomized benchmarking, QAOA, etc.)
- IBM Quantum backend support (currently QI-only)
- VQE parameter sweep (multiple bond distances)
- Result comparison across backends
- Error bars / statistical analysis from repeated runs

## Key Design Decisions
- **QI submission** uses `qi files run` with temp hybrid Python files (same pattern as `bell_state_hybrid.py`)
- **VQE circuits** use simplified 2-qubit BK-reduced ansatz (not full 4-qubit JW), consistent with Sagastizabal paper approach
- **H2 coefficients** hardcoded for R=0.735 Å (equilibrium); would need lookup table for parameter sweeps
- **Git auto-commit** in daemon mode: stages `experiments/results/` and `experiments/queue/` changes
- **Dashboard** is static (built at deploy time from JSON files), not SSR — consistent with the blog pattern

## Files to Commit
```
git add experiments/ agents/experiment_daemon.py lib/experiments.ts app/experiments/ app/page.tsx
```
