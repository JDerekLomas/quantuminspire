# Project structure

## Top-level directories

| Directory | Purpose |
|---|---|
| `app/` | Next.js pages and routes |
| `components/` | Shared React components |
| `content/` | Data files (blog posts, experiment studies) |
| `lib/` | Pure logic — data loaders, math helpers, types |
| `agents/` | Python agent scripts (experiment daemon, replication, orchestrator) |
| `experiments/` | Experiment queue, results (JSON), templates, helper scripts |
| `research/` | Research plans, literature surveys, replication reports, datasets |
| `mcp-servers/` | MCP servers for quantum hardware (QI circuits, QRNG, IBM) |
| `scripts/` | One-off utility scripts |
| `tests/` | Unit tests (Vitest for JS, pytest for Python) |
| `docs/` | This file and other documentation |
| `benchmark_results/` | LLM benchmark run outputs (transient) |
| `public/` | Static assets |

## Key files

### Content layer (`content/`)

| File | Description |
|---|---|
| `content/experiments/studies.ts` | 7 experiment study definitions: slug, title, abstract, research question, prior work, method, discussion, sources, status |
| `content/blog/posts.ts` | Blog post registry |

### Data layer (`lib/`)

| File | Description |
|---|---|
| `lib/experiments.ts` | Loads experiment results from JSON, provides `getAllResults()`, `getResultsByType()`, `getResultGitHubUrl()`, sweep data loaders. Defines `ExperimentResult` type and type label/color maps |
| `lib/replications.ts` | Loads replication reports |
| `lib/blog.ts` | Blog post loader |
| `lib/blogTypes.ts` | `BlogPost` type definition |
| `lib/quantum/` | Quantum math/state helpers for visualizations |
| `lib/rabi.ts` | Rabi oscillation math |
| `lib/visualization/` | Visualization configs and colormaps |

### UI layer (`app/`)

| Route | File | Description |
|---|---|---|
| `/` | `app/page.tsx` | Research home — hero, experiment summary, agent architecture |
| `/experiments` | `app/experiments/page.tsx` | Experiment dashboard — grouped by type, energy diagrams, backend badges |
| `/experiments/[id]` | `app/experiments/[id]/page.tsx` | Study detail page — abstract, research question, results with per-card raw data links, type-specific visualizations |
| `/replications` | `app/replications/page.tsx` | Paper replication dashboard |
| `/blog` | `app/blog/page.tsx` | Blog listing |
| `/blog/[slug]` | `app/blog/[slug]/page.tsx` | Blog post |
| `/learn` | `app/learn/page.tsx` | Interactive quantum learning |
| `/bloch-sphere` | `app/bloch-sphere/page.tsx` | Bloch sphere visualization |
| `/state-vector` | `app/state-vector/page.tsx` | State vector visualization |
| `/entanglement` | `app/entanglement/page.tsx` | Entanglement visualization |
| (etc.) | | Other quantum viz pages |

### Components (`components/`)

| File | Description |
|---|---|
| `experiment-viz.tsx` | Experiment visualization components: `BackendBadge` (uses `BACKEND_INFO` lookup for specific machine names), `FidelityBar`, `CountsBar`, `EnergyLevelDiagram`, `DissociationCurve`, `FidelityComparisonChart`, `RBDecayCurve`, `QAOAHeatmap`, `MultiBasisCounts` |
| `QuantumField.tsx` | Three.js quantum field background |
| `ScrollReveal.tsx` | Scroll-triggered reveal animations |
| `Timeline.tsx` | Research timeline component |
| Other `.tsx` files | Page-specific components |

### Agents (`agents/`)

| File | Description |
|---|---|
| `experiment_daemon.py` | Main pipeline: reads queue, submits to backends, analyzes results, writes JSON |
| `replication_agent.py` | Paper registry, runs replication experiments |
| `replication_analyzer.py` | Compares measured vs published claims, classifies failure modes |
| `benchmark_agent.py` | LLM benchmark runner (Qiskit HumanEval) |
| `orchestrator.py` | Pipeline coordinator |
| `qec_decoder.py` | QEC syndrome decoder |

### Experiment data (`experiments/`)

| Path | Description |
|---|---|
| `experiments/results/*.json` | 22+ result files, schema v1.0. Each has `schema_version`, `id`, `type`, `backend`, `backend_qubits`, `job_id`, `raw_counts`, `analysis` |
| `experiments/queue/*.json` | Pending experiment definitions |
| `experiments/templates/` | Experiment templates |
| `experiments/scripts/` | Helper scripts for experiment submission |

### Top-level Python scripts

| File | Description |
|---|---|
| `replicate_sagastizabal.py` | H2 VQE replication (PennyLane 4-qubit) |
| `replicate_peruzzo.py` | HeH+ VQE replication (PennyLane 4-qubit, bond sweep) |
| `replicate_kandala.py` | Kandala 2017 replication (in progress) |
| `benchmark_harness.py` | Qiskit HumanEval runner (Google GenAI API, 151 tasks) |
| `run_ibm_hardware.py` | Submit experiments to IBM backends |
| `run_qi_hardware.py` | Submit experiments to QI backends |
| `run_ibm_experiments.py` | IBM experiment runner |
| `cross_validate_quantum.py` | Cross-validation utilities |
| `bell_state_hybrid.py` | QI hybrid file for Bell state |

### Utility scripts (`scripts/`)

| File | Description |
|---|---|
| `normalize_results.py` | One-time normalization: adds `schema_version`, `backend_qubits`, `job_id` to all result JSON files |
| `screenshot-gallery.mjs` | Screenshot gallery generator |

## Conventions

- **Pure logic** in `lib/` (no React imports)
- **Data/content** in `content/` (typed exports)
- **UI** in `app/` (pages) and `components/` (shared)
- **Python agents** in `agents/`, standalone scripts at root
- **Experiment results** follow schema v1.0 (see README)
- **Backend names** use exact strings from hardware (`ibm_marrakesh`, `tuna-9`, `qxelarator`); display labels resolved by `BACKEND_INFO` in `experiment-viz.tsx`
- **Secrets** managed via `secret-lover` (macOS Keychain), never in `.env` files
- Unit tests: `npm test` (Vitest) for JS/TS, `pytest` for Python
