---
name: submit-tuna9
description: Submit quantum circuits to Tuna-9 hardware. Handles native gate conversion, CompileStage.ROUTING, qubit mapping, and job tracking.
---

# Submit to Tuna-9

Submit cQASM 3.0 circuits to QI Tuna-9 (backend_type_id=6) with all the hard-won conventions.

## Critical Rules

1. **Always use `compile_stage: "routing"`** — server-side OpenSquirrel is buggy (adds duplicate `init q`). This tells the server the circuit is pre-compiled.
2. **Native gate set only**: CZ, Ry, Rz (X also works). No H, CNOT, Sdag, S, T.
3. **CZ only on connected pairs**. Tuna-9 topology (12 edges):
   ```
   0-1, 0-2, 1-3, 1-4, 2-4, 2-5, 3-6, 4-6, 4-7, 5-7, 6-8, 7-8
   ```
4. **Best qubits** (lowest error): q2, q5, q4, q6. Worst: q0 (12.3% error). Avoid q0 if possible.
5. **8-qubit Hamiltonian path** (avoids q0): 7-8-6-3-1-4-2-5

## Gate Decompositions

```
CNOT(a,b) → Ry(-1.570796) b; CZ a, b; Ry(1.570796) b
H          → Rz(3.141593) q; Ry(1.570796) q
Sdag       → Rz(-1.570796) q
S          → Rz(1.570796) q
```

After decomposition, merge consecutive same-axis rotations on the same qubit and drop near-zero angles.

## cQASM 3.0 Format

```
version 3.0
qubit[N] q
<gates here>
bit[N] b
b = measure q
```

- Gate params in parens: `Ry(0.5) q[0]` not `Ry q[0], 0.5`
- Two-qubit gates: `CZ q[4], q[6]`

## Submission Workflow

1. **Verify circuit is native** — no non-native gates
2. **Verify connectivity** — every CZ pair must be a physical edge
3. **Test on emulator first** using `qi_run_local` (instant, no auth needed)
4. **Submit** using `qi_submit_circuit` with:
   - `backend_type_id: 6`
   - `compile_stage: "routing"`
   - `number_of_shots: 1024` (default) or up to 4096
5. **Save job IDs** to `experiments/results/<name>-jobids.json`
6. **Poll with `qi_check_job`** — statuses: PLANNED → RUNNING → COMPLETED / FAILED
7. **Fetch results with `qi_get_results`** once COMPLETED

## Emulator Testing

Always verify on emulator before hardware submission:

```
qi_run_local(circuit=cqasm_string, number_of_shots=10000)
```

Check that the output distribution matches expectations (e.g., dominant bitstring for VQE ground state).

## Job Tracking

Save all job metadata to JSON:
```json
{
  "experiment": "description",
  "backend": "tuna9",
  "timestamp": "ISO-8601",
  "jobs": [
    {"name": "circuit_name", "job_id": 12345, "shots": 1024}
  ]
}
```

Save to `experiments/results/<experiment-name>-tuna9-jobids.json`.

## QI Auth

If auth fails with 401/403, the token has expired. User must run:
```bash
.venv/bin/qi login
```

## Bitstring Convention

QI uses MSB-first bitstrings. Physical qubit q maps to bitstring position `(n_total - 1 - q)`.

For OpenFermion-based experiments (VQE): use `bitstring[q]` for label position q.
For physical qubit experiments (Ising, Bell): use `bitstring[-(q+1)]` for physical qubit q.
