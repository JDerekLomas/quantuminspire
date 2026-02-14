---
name: agent-teams
description: Run parallel quantum experiments across QI Tuna-9 and IBM backends simultaneously using Task agents.
---

# Agent Teams — Parallel Quantum Submissions

Run the same experiment on multiple quantum backends simultaneously using Claude Code's Task agents.

## When to Use

- Submitting the same circuit to both QI Tuna-9 and IBM hardware
- Running a sweep of parameters where each point is independent
- Comparing results across platforms for the same experiment

## Pattern: Parallel Platform Submission

When the user wants to run on both QI and IBM:

1. **Prepare circuits** in both formats:
   - cQASM 3.0 (native gates: CZ, Ry, Rz) for QI Tuna-9
   - OpenQASM 2.0 for IBM backends

2. **Launch parallel Task agents**:
   - Agent 1: Submit all circuits to QI Tuna-9 via `qi_submit_circuit`
   - Agent 2: Submit all circuits to IBM via `ibm_submit_circuit`

3. **Collect job IDs** from both agents
4. **Poll in parallel** using Task agents for status checks
5. **Analyze together** once both complete

## Pattern: Parameter Sweep

For independent parameter points (e.g., bond distance sweep):

```
Task 1: R=0.5 Å → submit + collect
Task 2: R=1.0 Å → submit + collect
Task 3: R=1.5 Å → submit + collect
...
```

Each task handles its own submission, polling, and result collection.

## Important Notes

- QI Tuna-9: `backend_type_id=6`, `compile_stage="routing"`, max 4096 shots
- IBM: prefer `ibm_fez` (best quality), max 100000 shots
- Save ALL job IDs before starting to poll — hardware queues can be hours
- Each agent should save results to its own file to avoid write conflicts
- Use `run_in_background: true` for agents that will wait on hardware queues

## Result Comparison

After both platforms return results, compare:
- Raw energy vs post-selected energy
- Bitstring distribution overlap
- Error relative to exact/emulator result
- Shot retention rate after post-selection
