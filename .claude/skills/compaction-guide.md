---
name: compaction-guide
description: Guide for managing context window efficiently. When to compact, what to preserve, and how to hand off sessions.
---

# Context Window Management

## When to Compact

- **At ~75% context usage** — visible in status line as `ctx: 75%`
- Before starting a large new sub-task
- When you notice repeated tool calls for information you already read

## What to Preserve on /compact

ALWAYS preserve these in the compaction summary:
1. List of all files modified this session
2. Current task state (what's done, what's in progress, what's next)
3. Test results or errors encountered
4. Decisions agreed on with the user
5. Any quantum job IDs that are pending

## Session Handoffs

For long sessions that will exceed context, save a handoff file:

```
.claude/handoffs/YYYY-MM-DD-topic.md
```

Include:
- What was accomplished
- What remains to be done
- Key technical decisions made
- File paths that were modified
- Any pending hardware jobs with IDs

## Auto-Memory Updates

After significant discoveries or debugging insights, update the memory files:
- `/Users/dereklomas/.claude/projects/-Users-dereklomas-haiqu/memory/MEMORY.md` — index (keep under 200 lines)
- Topic files: `quantum-conventions.md`, `vqe-results.md`, `tuna9-topology.md`, `pyscf-pipeline.md`

Only add to memory if the insight is:
- Confirmed across multiple interactions
- A stable pattern or convention
- A solution to a recurring problem
- Explicitly requested by the user

## Starting a New Session

When continuing from a handoff:
1. Read the latest handoff: `ls -lt .claude/handoffs/ | head -5`
2. Read the specific handoff file
3. Check for pending quantum jobs: `ls experiments/results/*-jobids.json`
4. Resume from where the previous session left off
