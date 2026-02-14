---
name: dev
description: Check development environment health — MCP servers, pending jobs, dashboard, recent results. Quick situational awareness.
---

# Dev Environment Check

When the user runs `/dev`, perform a quick health check and report status.

## Steps

1. **MCP Servers** — verify all three are responsive:
   ```
   qi_list_backends()
   ibm_list_backends()
   quantum_random_int(count=1)
   ```
   Report which are up/down.

2. **Pending Jobs** — scan for unfinished hardware jobs:
   ```bash
   ls -lt experiments/results/*-jobids.json experiments/results/*-jobs.json 2>/dev/null | head -5
   ```
   Read the most recent file. For each job, check status with `qi_check_job` or `ibm_check_job`.

3. **Recent Results** — show the latest experiment results:
   ```bash
   ls -lt experiments/results/*.json | head -10
   ```

4. **Dashboard** — verify session monitor is running:
   ```bash
   curl -s http://localhost:9177/api/sessions | jq '.sessions | length'
   ```

5. **Job Poller** — verify the auto-poller daemon is alive:
   ```bash
   pgrep -f "job-poller/poller.py"
   ```

6. **QI Token** — check expiry without full validation:
   ```bash
   cat ~/.quantuminspire/config.json | python3 -c "
   import json,sys,base64,time
   cfg=json.load(sys.stdin)
   tok=cfg.get('tokens',{}).get('access_token','')
   if not tok:
       for v in cfg.values():
           if isinstance(v,dict) and 'access_token' in v: tok=v['access_token']; break
   if tok:
       p=tok.split('.')[1]; p+='='*(4-len(p)%4)
       d=json.loads(base64.b64decode(p))
       exp=d.get('exp',0)
       mins=int((exp-time.time())/60)
       if mins<0: print('EXPIRED')
       elif mins<60: print(f'Expires in {mins}min')
       else: print(f'Valid ({mins//60}h remaining)')
   else: print('No token found')
   "
   ```

## Output Format

Report a concise status table:

```
Environment Status
──────────────────
QI Tuna-9:     [ok/down/token expired]
IBM Quantum:   [ok/down]
QRNG:          [ok/down]
Dashboard:     [running/stopped]
Job Poller:    [running/stopped]
QI Token:      [valid Xh / expiring / expired]
Pending Jobs:  [N jobs across M experiments]
Recent:        [latest result file + timestamp]
```

If anything is down, include the fix command.
