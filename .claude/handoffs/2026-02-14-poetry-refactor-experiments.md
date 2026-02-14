# Handoff: Interference Draft + Decoherence Gradient + Poetry Page Refactor

## Status: IN PROGRESS (about 50% done)

## What's Done

### Experiments (complete)
- `experiments/poetry_interference.py` — written and tested on emulator. Interference patterns visible (entropy peaks at intermediate angles).
- `experiments/poetry_decoherence.py` — written and tested on emulator. Perfect fidelity on emulator as expected.
- **6 circuits submitted to Tuna-9** (4096 shots each, compile_stage=routing):
  - interference-22deg: job 426290
  - interference-45deg: job 426291
  - interference-68deg: job 426292
  - decoherence-ghz-3: job 426293
  - decoherence-ghz-5: job 426294
  - decoherence-ghz-7: job 426295
- Existing data reused: marriage Z-basis (job 426093), X-basis (426094), GHZ-9 (426095)

### Page Refactor (partially complete)
Created directory structure: `app/poetry/{lib,data,components}/`

**Files created:**
- `app/poetry/lib/helpers.ts` — useInView, C colors, bitstringToPoem, weightedSample, sampleFromWeights
- `app/poetry/data/wordBanks.ts` — TENDERNESS_LINES, RESENTMENT_LINES, ENTANGLED_LINES, FREE_MIDDLES
- `app/poetry/data/distributions.ts` — DIST_Z, DIST_X, DIST_GHZ, BELL_MATRIX
- `app/poetry/data/topPoems.ts` — TOP_Z, TOP_X, TOP_GHZ, NOISE_POEMS, GHZ_HAIKU, BELL_COUPLETS
- `app/poetry/data/framework.ts` — FRAMEWORK, PHASES (updated: interference+decoherence marked done), QUESTIONS
- `app/poetry/components/Hero.tsx`
- `app/poetry/components/ComplementarityTeaser.tsx`
- `app/poetry/components/ConceptualFramework.tsx`
- `app/poetry/components/LLMConnection.tsx`
- `app/poetry/components/Roadmap.tsx`
- `app/poetry/components/ResearchQuestions.tsx`

## What's NOT Done

### Components still to extract:
- `EntanglementConstraint.tsx` — the Bell pair poem builder (most complex interactive component)
- `Experiments.tsx` — contains MarriageCard, ComplementaryPoems, MeasureWidget, GHZHaikuCard, BellCoupletsCard

### New components to build:
- `InterferenceDraft.tsx` — slider with 5 theta stops, dual-color poem display, bar chart
- `DecoherenceGradient.tsx` — 4 stacked panels with fidelity-based opacity
- `data/interferenceData.ts` — distributions at 5 theta values (needs hardware results)
- `data/decoherenceData.ts` — fidelity/entropy/poems at 4 depths (needs hardware results)

### Remaining tasks:
1. Check hardware job results (426290-426295) — should be done by now
2. Analyze results, create display data files
3. Extract EntanglementConstraint and Experiments components
4. Build InterferenceDraft and DecoherenceGradient components
5. Rewrite PageClient.tsx as thin layout importing all components
6. `npx tsc --noEmit` then `vercel --prod`

## Key Design Decisions
- Hamiltonian path for decoherence: 3→1→4→2→5→7→8→6 (plan said 7→8→6→3 but 6-3 edge doesn't exist)
- Interference: Rz(2θ)+Ry(θ) interpolates Z-basis↔X-basis. Both native gates.
- PHASES updated to mark interference draft and decoherence gradient as done
- framework.ts imports C from helpers (needed for Roadmap colors)

## Notes
- The original PageClient.tsx has NOT been modified yet — all new files coexist with it
- PageClient.tsx is 1502 lines, needs to become ~80 lines of imports + composition
- Existing how-it-works page uses similar extracted component pattern (app/how-it-works/components/)
