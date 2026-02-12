# QBM Experiment Session — 2026-02-12

## What was done

Built a Quantum Boltzmann Machine for H2 thermal states using the variational purification method (2 system + 2 ancilla = 4 qubits). This extends the VQE work by learning thermal states at different temperatures — something VQE fundamentally cannot do.

### Classical simulation (perfect)
- Trained at 8 temperatures (T=0.01 to T=5.0 Ha)
- Sub-0.01 mHa error at all temperatures
- At T→0, recovers VQE ground state (E=-2.139499 Ha, purity=1.0)
- At T=2.0, learns thermal state (E=-1.195405 Ha, S=1.3016, purity=0.30)

### QI emulator (verified)
- All 3 basis circuits (Z, X, Y) run successfully at 3 temperatures
- T=0.1: 0.2 mHa, T=0.5: 3.1 mHa, T=2.0: 11.9 mHa (shot noise)

### Hardware submissions (pending as of 13:44 UTC)
- 9 circuits to IBM Fez (8192 shots each) — QUEUED 24h+, fair-share scheduling delay
- 1 test circuit to IBM Marrakesh (8192 shots) — also QUEUED, same fair-share issue
- 9 circuits to QI Tuna-9 (1024 shots each) — PLANNED, Tuna-9 is OFFLINE
- All IBM backends (Fez, Marrakesh, Torino) deprioritize free-tier jobs
- IBM Marrakesh test job: d66ti5oqbmes739eliug

### MCP server fix
- Fixed qxelarator API call in `mcp-servers/qi-circuits/qi_server.py`: `qxelarator.execute_string()` not `qxelarator.QXelarator().execute_string()`
- MCP server needs restart to pick up the change

## Key files
- `experiments/h2_qbm.py` — Full QBM experiment (train + circuit generation)
- `experiments/h2_qbm_analyze.py` — Hardware analysis script with job IDs
- `experiments/h2_qbm_output.json` — All results, trained params, circuits

## IBM Fez Job IDs (all QUEUED as of 14:20 UTC)
| Circuit | Job ID |
|---------|--------|
| T=0.1 Z | d66rgv8qbmes739ej540 |
| T=0.1 X | d66rgvoqbmes739ej550 |
| T=0.1 Y | d66rh01v6o8c73d4lukg |
| T=0.5 Z | d66rh0re4kfs73d13i50 |
| T=0.5 X | d66rh1be4kfs73d13i70 |
| T=0.5 Y | d66rh1oqbmes739ej5ag |
| T=2.0 Z | d66rh2be4kfs73d13i8g |
| T=2.0 X | d66rh2tbujdc73cv5250 |
| T=2.0 Y | d66rh3gqbmes739ej5d0 |

## QI Tuna-9 Job IDs (all PLANNED — Tuna-9 OFFLINE)
| Circuit | Job ID |
|---------|--------|
| T=0.1 Z | 423552 |
| T=0.1 X | 423553 |
| T=0.1 Y | 423554 |
| T=0.5 Z | 423555 |
| T=0.5 X | 423556 |
| T=0.5 Y | 423557 |
| T=2.0 Z | 423558 |
| T=2.0 X | 423559 |
| T=2.0 Y | 423560 |

## IBM usage
- 2.5 / 10 min QPU used this month — NOT out of credits
- Queue delay likely due to fair-share scheduling for free tier

## To resume
1. Check IBM jobs: `ibm_check_job(job_id)` — they'll run eventually
2. Check QI backend: `qi_list_backends()` — wait for Tuna-9 to come back online
3. If QI token expired again: `.venv/bin/qi login` (MCP server needs restart after)
4. Once results available: `ibm_get_results(job_id)` / `qi_get_results(job_id)`
5. Run `experiments/h2_qbm_analyze.py` with fetched results
6. IBM Marrakesh test job also pending: d66ti5oqbmes739eliug

## Circuit stats
- 4 qubits, 16 Ry parameters, 6 CNOTs per circuit
- Transpiles to ~22 depth, 6 CZ gates on IBM Fez
- 3 measurement bases (Z, X, Y) per temperature point
