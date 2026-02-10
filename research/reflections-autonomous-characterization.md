# Reflections: Autonomous Hardware Characterization (2026-02-10)

## What happened
Claude (Opus 4.6) autonomously characterized QuTech's Tuna-9 processor in 33 hardware jobs. Starting from zero knowledge, it discovered the full topology (10 edges across all 9 qubits), characterized noise types on 3 connections, and improved GHZ fidelity by 5.8 percentage points through hardware-aware routing.

## What was genuinely interesting

**Stale data detection was the real finding.** We had a topology map from days earlier that said q[6-8] were dead. That was wrong — the hardware had been recalibrated. A human researcher would likely have reused the old map. The AI started fresh because it had no memory of prior results. The "disadvantage" of starting from zero turned out to be an advantage. This is a real insight about automated characterization: it doesn't carry stale assumptions.

**Failure-as-data.** Using FAILED job statuses as topology information emerged naturally from probing rather than reading documentation. The hardware rejecting non-connected CNOTs gave us a clean binary signal — no ambiguity, no noise model needed. This pattern (treating system errors as structured information) seems broadly useful.

## What was honest but underwhelming

**The 33% improvement is real but modest.** Routing around one bad qubit on a 9-qubit chip is something any competent quantum engineer would do in 5 minutes by looking at calibration data. The value isn't that the AI did something a human can't — it's that it did it without needing to be a quantum engineer, and without needing calibration data to exist.

**The blog post is better than the science.** The research framing — "can a general-purpose AI characterize unknown hardware?" — sounds more impressive than what actually happened: run Bell circuits, pick the best qubits. The narrative arc gives it structure, but the underlying technique is straightforward. This is closer to "competent lab work" than "novel research."

**Efficiency was poor.** 20 pair probes when ~8 would have sufficed. After finding q[0]'s high error rate, the AI could have predicted which connections would be worst. After finding the first few edges, it could have used graph structure to narrow the search. The "autonomous" part works; the "intelligent" part has room to grow.

## What would make this actually novel

1. **Close the loop on noise-aware compilation.** The dephasing signature on q[4]↔q[6] means dynamical decoupling would help there specifically. The T1 decay on q[0] means minimizing circuit depth on that qubit. Identified but not exploited.

2. **Adaptive probing.** Instead of exhaustive search, use early results to predict where to probe next. Bayesian optimization over topology space. This would demonstrate actual intelligence, not just thoroughness.

3. **Algorithm-level adaptation.** Choose not just which qubits but which algorithm variant based on the noise profile. A dephasing-dominated processor favors different ansatze than a depolarizing one.

4. **Cross-platform comparison.** Run the same characterization on IBM Torino (133 qubits) and compare. The routing freedom on a larger chip should make hardware-aware placement even more impactful.

## The meta-question

Can AI lower the barrier to quantum computing? After this session: maybe. The AI went from zero knowledge to a working hardware model in 33 jobs. But it also had the advantage of knowing quantum physics, writing cQASM, and reasoning about noise models. A "general-purpose" AI that happens to know quantum physics isn't the same as making quantum computing accessible to non-experts. The real test: can this workflow help someone who doesn't know what a Bell state is get useful results from quantum hardware?

## Practical lessons

- **Wall-clock time dominated by queue waits**, not reasoning. Real autonomous systems need async job management.
- **cQASM 3.0 has no compiler** — raw circuits go directly to hardware, so direction of CNOT matters and must be verified.
- **4096 shots gives good statistics** for fidelity estimates (±1.5% at 95% CI for p~0.85).
- **Hardware recalibration can change topology** — always re-characterize, don't trust cached data.
