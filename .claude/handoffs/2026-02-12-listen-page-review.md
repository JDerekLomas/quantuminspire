# Handoff: Listen Page Scientific Review & Tuna-9 Research

**Date:** 2026-02-12
**Session:** Reviewed /listen page from skeptical reviewer perspective, researched Tuna-9 Starmon architecture, pulled real calibration data.

## What Was Done

### Shipped
- Committed all uncommitted site work (96f7ed3, 100 files, 5481 insertions)
- Removed .DS_Store from tracking (59540a2)
- Fixed nav logo spacing, tagline gaps, added benchmark description (85f17cc)
- Fixed chart label clipping (63a4c07, 3adbcf2)
- Replaced SVG line chart with horizontal bars + benchmark intro (9e41b0b)
- All deployed to production via `vercel --prod`

### Research Completed (not yet implemented)

**Skeptical review of /listen page identified these issues:**

1. **Act 3 (Gate): octave jump is physically wrong.** The gate pulse and both |0⟩/|1⟩ states use the SAME qubit frequency. Currently plays `baseHz * 2` for |1⟩. Should keep same pitch, change timbre/phase.

2. **Qubit frequencies [5.12...6.80 GHz] are unverified and likely wrong.** Published DiCarlo lab devices cluster within ~500 MHz (e.g., 5.18-5.46 GHz). The high end (6.02-6.80) overlaps coupler/readout resonator frequencies. No public Tuna-9 calibration data exists with actual frequencies.

3. **Decoherence act: frequency drift ≠ dephasing.** Real dephasing is random phase jumps, not smooth detuning.

4. **H2 molecule: Hamiltonian coefficient → pitch mapping is arbitrary.** Coefficients are real but the sound has no physical correspondence.

5. **Error mitigation histograms are fabricated** (illustrative, not from actual measurement data).

6. **Topology in visual is 12-edge 3x3 grid but real Tuna-9 has 10 edges** in a diamond-like layout.

**Tuna-9 gate mechanism (from research):**
- Single-qubit: DRAG-shaped microwave pulse at qubit's own resonance frequency, 20 ns
- Two-qubit (CZ): flux pulse on the COUPLER (not qubit), ~60 ns. Qubits stay at sweetspots. This is the key Tuna upgrade over Starmon.
- Net Zero / Sudden Net Zero pulse shapes for CZ gate

**Published DiCarlo lab frequencies (use these as reference):**
- 5-qubit QuantWare device (arxiv 2503.13225): Q0=5.295, Q1=5.218, Q2=5.181, Q3=5.463, Q4=5.457 GHz
- Couplers at ~6.275-6.383 GHz
- Anharmonicities: -275 to -286 MHz
- User suggested using frequencies from papers for the sonification

**Real Tuna-9 data from our experiments (experiments/results/):**
- Per-qubit error: q0=12.3%, q1=3.7%, q2=1.6%, q3=5.2%, q4=1.9%, q5=1.6%, q6=2.7%, q7=4.5%, q8=3.5%
- Real topology: 0-[1,2], 1-[0,3,4], 2-[0,4,5], 3-[1,6], 4-[1,2,6], 5-[2], 6-[3,4,8], 7-[8], 8-[6,7]
- Bell fidelities: 0.832 (pair 0-2) to 0.938 (pair 2-4)
- Noise: dephasing (4-6), depolarizing (2-4), asymmetric T1 (0-2)
- Readout: q2 error 9.2% (asymmetric 1→0), q4 error 3.6%
- Coherence: T2_Ramsey ~10-34 us (published devices), T2_echo 33-111 us

## Resume Here

**Next step:** Rewrite Listen page with corrections:
1. Use published DiCarlo lab frequencies (~5.18-5.46 GHz range) labeled as "representative transmon frequencies from published QuTech devices"
2. Fix Act 3 (Gate) — same frequency for both states, change timbre/phase not pitch
3. Update topology visual to real 10-edge adjacency
4. Add honest caveats distinguishing data-driven vs artistic choices
5. Fix decoherence sonification to use phase randomization not frequency drift
6. Consider sonifying real per-qubit error rates in the "Nine Qubits" act

**Blocker:** QI SDK auth token expired (refresh token invalid). Need `qi login` in browser to re-auth. Not blocking the listen page work.

## Key Files
- `/Users/dereklomas/haiqu/app/listen/page.tsx` (1555 lines)
- `/Users/dereklomas/haiqu/experiments/results/autonomous-characterization-full.json`
- `/Users/dereklomas/haiqu/experiments/results/connectivity-probe-001-tuna9.json`
- `/Users/dereklomas/haiqu/experiments/results/readout-cal-tuna9-q24-001.json`

## Sources
- arxiv 2503.13225 — 5-qubit QuantWare device frequencies
- arxiv 2509.04965 — bipolar flux pulses with tunable couplers
- arxiv 1903.02492 — Net Zero CZ gate
- PRL 126, 220502 (2021) — SNZ CZ gate
- https://www.quantum-inspire.com/backends/transmons/ — Tuna-9 specs
