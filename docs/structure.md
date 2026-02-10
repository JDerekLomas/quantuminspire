# Project structure (quick guide)

- `content/blog/`: Blog post data (`posts.ts`) using the `BlogPost` type from `lib/blogTypes.ts`. `lib/blog.ts` is a thin loader.
- `lib/`: Pure logic. Notable files:
  - `lib/rabi.ts`: Rabi oscillation math helpers (no React).
  - `lib/visualization/`: Visualization configs/colormaps (e.g., Rabi view configs).
  - `lib/quantum.ts` (to be split): quantum math/states/metrics used by visualizations.
- `app/`: Next.js pages/components. Visualization pages import math/configs from `lib/` and stay UI-only where possible.
- `tests/`: Vitest unit tests (run with `npm test`). Current coverage: `lib/quantum.ts`, `lib/rabi.ts`.
- `experiments/`: Queue/templates/results for Quantum Inspire experiments (see queue JSON schema).
- `benchmark_results/`: Benchmark run outputs; checkpoints/logs should be treated as transient.

Conventions:
- Keep pure, reusable logic in `lib/` (no React imports).
- Keep data/content in `content/`.
- Keep UI-specific code in `app/`.
- Add unit tests alongside modules in `tests/`.
