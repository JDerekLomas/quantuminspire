# Quantum Poetry Page Handoff (2026-02-14)

## What Was Built
- `/poetry` page: "Marriage as Superposition" — single experiment presented as interactive art
- Server component: `app/poetry/page.tsx`
- Client component: `app/poetry/PageClient.tsx` (~500 lines)
- Added to sitemap

## Architecture
- All data hardcoded as TS constants (matching VQE/Tuna9 pattern)
- 3 raw distributions embedded (Z: 307 entries, X: 200 entries, GHZ: 152 entries)
- `bitstringToPoem()` matches Python `bitstring_to_haiku()` — simple 3-bit group slicing
- `weightedSample()` for measure button — cumulative probability sampling
- Collapse animation: 250ms rapid cycling, respects `prefers-reduced-motion`

## Sections
1. Hero — gradient-text-pink title, Valentine's Day context
2. Complementary Poems — Z/X toggle, featured poem, top-10 bar chart SVG
3. Measure — 3-basis selector, weighted sampling from real distributions
4. GHZ State — two ideal poems, fidelity viz (circles + noise dots)
5. Noise Poems — 5 curated decoherence poems, orange accent
6. Numbers — 6-card stats grid
7. Footer — links to /tuna9, /research

## Data Sources
- `experiments/results/quantum-poetry-marriage-results.json` — summary + top poems
- `experiments/results/quantum-poetry-marriage-{z,x,ghz}-raw.json` — full distributions
- `experiments/quantum_poetry_marriage.py` — word banks, circuit definitions
- Hardware: Tuna-9 jobs 426093-426095, Valentine's Day 2026

## Status
- Deployed to production, builds clean
- This is a narrow "single experiment" presentation
- User wants to pivot to a broader quantum poetry research site

## What's Next
- Broader quantum poetry vision beyond just the marriage experiment
- The name "haiqu" itself suggests quantum haiku as a core identity
