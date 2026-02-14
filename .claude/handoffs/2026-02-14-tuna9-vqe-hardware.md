# Tuna-9 VQE Hardware Results — 2026-02-14

## Key Breakthrough
Successfully ran H2 4-qubit VQE on Tuna-9 superconducting hardware — first successful
VQE circuit on this platform. Required solving the QI SDK's `CompileStage` bug.

## The Bug
The QI SDK's server-side OpenSquirrel compiler adds `init q` at both START and END of
submitted circuits. The trailing `init q` after measurements crashes the parser. This
affects all non-trivial circuits submitted with the default `CompileStage.NONE`.

## The Fix
1. **Write circuits in native gate set** (CZ, Ry, Rz, X) — no H, CNOT, Sdag
2. **Submit with `CompileStage.ROUTING`** — tells server the circuit is pre-compiled
3. Server skips OpenSquirrel entirely and runs the circuit as-is

Gate decompositions:
- CNOT(a,b) → Ry(-π/2,b); CZ(a,b); Ry(π/2,b)
- H ≡ Rz(π); Ry(π/2) [cQASM line order]
- Sdag ≡ Rz(-π/2)

## Results
- **Raw energy:** -0.834 Ha (303 mHa error)
- **Post-selected:** -1.085 Ha (52 mHa error, 71% retention)
- **Emulator (verification):** 0.24 mHa (chemical accuracy)
- **E_FCI:** -1.137306 Ha

Comparison:
| Backend | Raw error | Mitigated error |
|---------|-----------|-----------------|
| QI emulator | 0.24 mHa | — |
| Tuna-9 raw | 303 mHa | — |
| Tuna-9 + post-selection | — | 52 mHa |
| IBM Fez (same 4q) | 354 mHa | 160 mHa (TREX) |

Tuna-9 + post-selection beats IBM Fez + TREX by 3x for the same problem.

## Files Created/Modified
- `experiments/generate_native_circuits.py` — converts Ry-based circuits to native gate set
- `experiments/results/h2-4qubit-tuna9-circuits-native.json` — 5 native-gate circuits
- `experiments/results/h2-4qubit-tuna9-hardware-results.json` — raw measurement counts
- `experiments/results/h2-4qubit-vqe-tuna9-summary.json` — energy analysis
- `mcp-servers/qi-circuits/qi_server.py` — added auth retry + compile_stage parameter

## MCP Improvements
1. **Auth retry:** On token expiry, automatically resets RemoteBackend singleton and retries
2. **compile_stage param:** `qi_submit_circuit(..., compile_stage='routing')` for pre-compiled circuits

## Job IDs
- Z: 426070, YXXY: 426071, YYXX: 426072, XXYY: 426073, XYYX: 426074
- All COMPLETED on Tuna-9 with 4096 shots each

## Next Steps
- ZNE on Tuna-9 (unitary folding: U→U·U†·U for noise factor 3)
- Submit QV=16 experiment with CompileStage.ROUTING
- Try LiH 8-qubit on Tuna-9 (all 9 qubits, 12 CZ gates)
