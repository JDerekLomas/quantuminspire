import { BlogPost } from "@/lib/blogTypes"

export const posts: BlogPost[] = [
  {
    slug: 'ai-for-science-landscape-2026',
    title: 'The AI-for-Science Landscape in 2026',
    subtitle: 'From focused research organizations to billion-dollar startups, the field is exploding',
    date: '2026-02-10',
    author: 'AI x Quantum Research Team',
    category: 'landscape',
    tags: ['AI for science', 'FROs', 'Schmidt Futures', 'landscape'],
    heroImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&q=80',
    heroCaption: 'The convergence of AI and scientific discovery is reshaping how research gets done.',
    excerpt: 'A comprehensive look at the organizations, startups, and government initiatives accelerating scientific discovery with AI — from Eric Schmidt\'s Focused Research Organizations to billion-dollar autonomous lab startups.',
    content: `
<p>Something remarkable happened in 2025: the idea that AI could <em>do science</em> — not just assist scientists — went from speculative to operational. Google DeepMind opened a fully automated research lab in the UK. A startup called Lila Sciences raised $550M to build an "AI-native" drug discovery platform. The US government launched a $320M program to deploy AI across 17 national labs.</p>

<p>For our project at TU Delft — where we're exploring how AI might accelerate quantum computing specifically — understanding this broader landscape is essential. Here's what we found.</p>

<h2>The "Missing Middle": Focused Research Organizations</h2>

<p>One of the most interesting structural innovations is the <strong>Focused Research Organization (FRO)</strong> — a concept championed by <strong>Sam Rodriques</strong> and <strong>Adam Marblestone</strong> and backed by <strong>Eric Schmidt</strong> through Schmidt Sciences.</p>

<p>The idea addresses a real gap: some scientific problems need 5-7 years and $20-50M, require engineering talent alongside scientists, and produce public goods rather than products. Traditional academia can't sustain projects of this size and focus. Startups need a commercial path. Government labs are slow. FROs fill this "missing middle."</p>

<p><strong>Convergent Research</strong> serves as the FRO incubator, having launched 10 organizations including:</p>
<ul>
<li><strong>E11 Bio</strong> — Large-scale connectomics (brain wiring maps)</li>
<li><strong>Cultivarium</strong> — Engineering photosynthetic organisms</li>
<li><strong>[C]Worthy</strong> — Ocean carbon removal verification</li>
<li><strong>Lean FRO</strong> — Mathematical theorem formalization (won 2025 ACM SIGPLAN award, 210,000+ theorems in Mathlib)</li>
<li><strong>Bind</strong>, <strong>EvE Bio</strong>, <strong>Forest Neurotech</strong>, <strong>Imprint</strong>, and others</li>
</ul>
<p>The UK's <strong>ARIA</strong> (Advanced Research + Invention Agency) has partnered with Convergent to launch "FROST UK" — bringing the FRO model to the UK. ARIA also funds 12 "AI Scientist" projects ($6M each, selected from 245 proposals), including partnerships with Lila Sciences/MIT, UCL, and the University of Liverpool.</p>

<p>While none of the current FROs directly target quantum computing, the <em>model</em> is relevant. A "Quantum FRO" focused on AI-accelerated error correction or autonomous quantum experiment design would be well-suited to this structure.</p>

<h2>Schmidt Sciences and AI2050</h2>

<p><strong>Schmidt Sciences</strong> (formerly Schmidt Futures) has become one of the most significant funders of AI-for-science work. Their <strong>AI2050</strong> program ($125M across 99 fellows at 42 institutions) invests in researchers working on "hard problems in AI" including scientific applications. They've also funded the <strong>Virtual Institute for Scientific Software (VISS)</strong> and an AI in Science postdoc program, recognizing that much of science bottlenecks on software quality.</p>

<p>Eric Schmidt has been vocal about his thesis: AI will compress the timeline of scientific discovery by orders of magnitude. In a December 2025 Harvard talk, he predicted AI mathematicians within a year and recursive self-improvement by 2030. He frames the US-China competition partly through AI adoption: 60% of Chinese employees use AI weekly vs 37% of Americans.</p>

<h2>The Big Labs</h2>

<h3>Google DeepMind</h3>
<p>The most active player in AI-for-science, with multiple programs directly relevant to quantum:</p>
<ul>
<li><strong>AlphaQubit</strong> — A transformer-based quantum error correction decoder that outperforms traditional minimum-weight perfect matching (MWPM) decoders. It learns correlated error patterns from syndrome data, showing that neural networks can handle the real-time decoding challenge.</li>
<li><strong>AlphaEvolve</strong> — Evolutionary AI for algorithm discovery, with potential applications in circuit optimization.</li>
<li><strong>AI co-scientist</strong> — Announced in early 2026, a system designed to generate and test scientific hypotheses.</li>
<li><strong>Automated UK lab</strong> — A fully AI-driven research facility that plans, executes, and analyzes experiments.</li>
</ul>

<h3>Microsoft</h3>
<ul>
<li><strong>Kosmos</strong> — Autonomous AI scientist platform for experimental design and execution.</li>
<li><strong>MatterGen</strong> — Generative AI for novel materials discovery.</li>
<li><strong>Azure Quantum</strong> — Cloud quantum + classical AI integration.</li>
</ul>

<h3>Meta FAIR</h3>
<p>Open-source AI models for science, contributing to protein structure prediction and materials science.</p>

<h2>The Startup Explosion</h2>

<p>The funding numbers tell the story:</p>

<table>
<thead><tr><th>Company</th><th>Funding</th><th>Focus</th><th>Key Approach</th></tr></thead>
<tbody>
<tr><td><strong>Lila Sciences</strong></td><td>$550M</td><td>Drug discovery</td><td>"AI Science Factories" — 235,500 sq ft Cambridge lab. George Church as CSO.</td></tr>
<tr><td><strong>Periodic Labs</strong></td><td>$300M seed</td><td>Materials & chemistry</td><td>Largest AI-for-science seed round. Founded by Liam Fedus (ex-OpenAI VP) and Ekin Cubuk (ex-DeepMind). Angels: Bezos, Schmidt, Jeff Dean.</td></tr>
<tr><td><strong>Xaira Therapeutics</strong></td><td>$1.3B</td><td>Drug design</td><td>Co-founded by David Baker (2024 Nobel). First drug entering human testing 2026.</td></tr>
<tr><td><strong>CuspAI</strong></td><td>$100M</td><td>Materials design</td><td>AI-guided materials discovery</td></tr>
<tr><td><strong>Isomorphic Labs</strong></td><td>$600M raised</td><td>Drug discovery</td><td>DeepMind spinoff. Novartis + Eli Lilly partnerships (~$3B). Clinical trials expected late 2026.</td></tr>
<tr><td><strong>Recursion</strong></td><td>Public ($RXRX)</td><td>Drug discovery</td><td>Acquired Exscientia ($688M). REC-4881 showed 43% polyp reduction in Phase 1b/2.</td></tr>
<tr><td><strong>Insilico Medicine</strong></td><td>$400M+, IPO'd</td><td>Drug discovery</td><td>First AI-discovered drug (rentosertib) in Phase II. Published results in Nature Medicine. Hong Kong IPO ($293M).</td></tr>
<tr><td><strong>Arcadia Science</strong></td><td>$500M</td><td>Open biology</td><td>Funded by Jed McCaleb + Sam Altman. Studies understudied organisms.</td></tr>
</tbody>
</table>

<h3>Sakana AI — The AI Scientist v2</h3>
<p><strong>Sakana AI</strong> ($2.65B valuation), founded by Llion Jones (co-author of "Attention Is All You Need"), published "The AI Scientist v2" — accepted at an ICLR 2025 workshop, making it the first fully AI-generated peer-reviewed scientific paper. The system autonomously generates research ideas, writes code, runs experiments, and produces full papers. Their approach is directly parallel to what we're building at TU Delft for quantum computing.</p>

<h3>FutureHouse and Edison Scientific</h3>
<p><strong>FutureHouse</strong> focuses on AI for scientific literature. Their "Robin" agent identified ripasudil as a potential treatment for dry age-related macular degeneration — a genuine drug repurposing discovery. This was significant enough that <strong>Edison Scientific</strong> spun out with a $70M seed round at $250M valuation to pursue it commercially. Their companion system "Kosmos" reportedly compresses months of literature research into a single day.</p>

<h3>EvolutionaryScale → CZI</h3>
<p><strong>EvolutionaryScale</strong> (the team behind ESM protein language models) was acquired by the Chan Zuckerberg Initiative in November 2025. Their ESM3 protein foundation model was published in Science (January 2025). Alex Rives, the founder, is now Head of Science at CZI. CZI has committed $10B over the next decade to AI-for-biology — the largest single commitment in the field.</p>

<h2>Government Initiatives</h2>

<ul>
<li><strong>US Genesis Mission</strong> ($320M+) — 17 DOE national labs + 24 industry partners (Anthropic, AWS, Google, Microsoft, NVIDIA, OpenAI, xAI). Led by Under Secretary Dario Gil. Google's AI co-scientist replicated a 10-year hypothesis in 2 days at Imperial College London and is being deployed across all 17 DOE labs.</li>
<li><strong>UK AI for Science</strong> (£137M) — Multiple research councils funding AI integration across disciplines.</li>
<li><strong>Japan</strong> ($135B) — Combined quantum + AI national strategy, one of the largest commitments globally.</li>
<li><strong>EU Quantum Act</strong> — Major funding framework where TU Delft / QuTech is centrally positioned.</li>
</ul>

<h2>What This Means for Quantum</h2>

<p>Most of the AI-for-science action is in biology and chemistry. Quantum computing is a frontier where AI techniques are just beginning to be applied seriously. This presents an opportunity:</p>

<ol>
<li><strong>The methods are transferable</strong> — Autonomous experiment design, foundation models, and agent-based research pipelines developed for biology can be adapted for quantum.</li>
<li><strong>Hardware access is the bottleneck</strong> — Unlike drug discovery, quantum computing experiments can often be simulated. This means AI agents can iterate faster.</li>
<li><strong>The field is small enough to matter</strong> — A well-designed AI research system could produce a meaningful fraction of quantum computing research output.</li>
</ol>

<p>Our project at TU Delft sits at this intersection: real quantum hardware (through Quantum Inspire), frontier AI models, and an agent-based infrastructure designed for continuous operation. The landscape analysis suggests we're early — but not too early.</p>
`,
    sources: [
      { label: 'Convergent Research (FRO incubator)', url: 'https://www.convergentresearch.org/' },
      { label: 'Schmidt Sciences', url: 'https://www.schmidtsciences.org/' },
      { label: 'Sakana AI — "The AI Scientist"', url: 'https://sakana.ai/ai-scientist/' },
      { label: 'FutureHouse', url: 'https://www.futurehouse.org/' },
      { label: 'AlphaQubit — DeepMind', url: 'https://deepmind.google/discover/blog/alphaqubit-a-machine-learning-decoder-for-quantum-error-correction/' },
      { label: 'EvolutionaryScale', url: 'https://www.evolutionaryscale.ai/' },
      { label: 'Lila Sciences — $550M raise', url: 'https://www.lila.sciences/' },
      { label: 'US Genesis Mission announcement', url: 'https://www.energy.gov/science/genesis' },
    ],
  },
  {
    slug: 'llms-write-quantum-code',
    title: 'Can LLMs Write Quantum Code? We Tested 151 Tasks',
    subtitle: 'Gemini 3 Flash scores 62.25% and Claude Opus 4.6 scores 63.6% — but the failures are more interesting than the passes',
    date: '2026-02-09',
    author: 'AI x Quantum Research Team',
    category: 'experiment',
    tags: ['benchmark', 'Qiskit', 'LLM', 'Gemini', 'quantum coding'],
    heroImage: 'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=1200&q=80',
    heroCaption: 'Testing whether AI models can bridge the gap between quantum theory and working code.',
    excerpt: 'We ran the full Qiskit HumanEval benchmark against Gemini 3 Flash and Claude Opus 4.6 — 151 quantum programming tasks graded by automated code execution. The results reveal that LLMs understand quantum algorithms but struggle with rapidly evolving APIs.',
    content: `
<p>Can a large language model write a working quantum circuit from a natural-language description? We tested this by running the complete <a href="https://arxiv.org/abs/2406.02132">Qiskit HumanEval</a> benchmark — 151 quantum programming tasks across three difficulty levels.</p>

<h2>The Setup</h2>

<p>Each task provides a function signature and docstring. The model must produce the function body. The generated code is executed in a sandboxed subprocess with unit tests — no partial credit, no manual review. Pass or fail.</p>

<p>We tested two frontier models: <strong>Gemini 3 Flash</strong> (via Google's GenAI API) and <strong>Claude Opus 4.6</strong> (via Anthropic's API). The benchmark harness sends each prompt independently — no multi-turn dialogue, no chain-of-thought, no retrieval augmentation. Just the raw prompt and one shot at the answer.</p>

<h2>The Results</h2>

<table>
<thead><tr><th>Model</th><th>Pass@1</th><th>Basic</th><th>Intermediate</th><th>Difficult</th></tr></thead>
<tbody>
<tr><td><strong>Claude Opus 4.6</strong></td><td><strong>63.6%</strong> (96/151)</td><td>67.1% (53/79)</td><td>62.7% (42/67)</td><td>20.0% (1/5)</td></tr>
<tr><td><strong>Gemini 3 Flash</strong></td><td>62.25% (94/151)</td><td>65.82% (52/79)</td><td>61.19% (41/67)</td><td>20.0% (1/5)</td></tr>
</tbody>
</table>

<p>Both models are remarkably close — within 1.4 percentage points. Claude edges ahead slightly, particularly on basic and intermediate tasks. Both models solve exactly 1 of 5 difficult tasks. The basic-to-intermediate drop is surprisingly small for both — the models don't just know simple gate sequences; they can construct meaningful quantum algorithms. The cliff happens at "difficult" tasks that require multi-step reasoning with precise API calls.</p>

<p>For context, the <strong>QUASAR</strong> system (which uses agentic RL and retrieval-augmented generation with a 4B parameter model) achieved 99.31% <em>circuit validity</em> — though that's a less strict metric than our functional correctness measure. <strong>QCoder</strong> with o3 reached 78% on a related benchmark, vs 40% for human experts.</p>

<h2>The Error Analysis</h2>

<p>This is where it gets interesting. Of the 57 failures:</p>

<table>
<thead><tr><th>Error Type</th><th>Count</th><th>What It Means</th></tr></thead>
<tbody>
<tr><td>Wrong answer</td><td>13</td><td>Code runs but produces incorrect output</td></tr>
<tr><td>Syntax error</td><td>11</td><td>Malformed Python — indentation, missing colons</td></tr>
<tr><td>SamplerV2 API</td><td>9</td><td>Using deprecated Qiskit 1.x sampling API</td></tr>
<tr><td>Account/runtime</td><td>6</td><td>Trying to use IBM Runtime (requires auth)</td></tr>
<tr><td>Attribute error</td><td>5</td><td>Wrong method/property names</td></tr>
<tr><td>Type error</td><td>4</td><td>Incorrect argument types</td></tr>
<tr><td>Other</td><td>9</td><td>Misc runtime failures</td></tr>
</tbody>
</table>

<h3>The key insight: API staleness, not algorithmic failure</h3>

<p>Only 13 of 57 failures (23%) are genuine algorithmic mistakes where the model produced incorrect quantum logic. The dominant failure mode is <strong>API version mismatch</strong>: 9 failures from Qiskit 2.x's <code>SamplerV2</code> breaking changes, 6 from trying to access IBM Runtime services that require authentication, and 5 from using wrong method names.</p>

<p>The model was trained on Qiskit 1.x documentation and code. Qiskit 2.x introduced significant breaking changes (the V2 primitives). The model <em>understands the quantum computing concepts</em> but generates code for an API that no longer exists.</p>

<h2>Implications</h2>

<h3>1. RAG could dramatically improve performance</h3>
<p>If the dominant failure mode is stale API knowledge, then <strong>retrieval-augmented generation</strong> with current Qiskit 2.x documentation should push Pass@1 significantly higher. We estimate 75-80% is achievable by simply injecting up-to-date API signatures into the prompt.</p>

<h3>2. The QUASAR result is relevant</h3>
<p>The <strong>QUASAR</strong> system, which uses RAG with quantum documentation, achieved 99.31% circuit validity — suggesting that the documentation-injection approach works. Our benchmark measures functional correctness (stricter than validity), but the principle holds.</p>

<h3>3. Quantum SDK design matters for AI</h3>
<p>Frequent breaking changes in quantum SDKs create a compounding problem for AI code generation. SDKs designed with AI agents in mind — stable interfaces, versioned examples, machine-readable changelogs — would dramatically improve AI-assisted quantum development.</p>

<h3>4. This benchmark should be run continuously</h3>
<p>As new models release and quantum SDKs evolve, the intersection of model capability and API coverage shifts. Our <a href="/#agents">agent infrastructure</a> is designed to run this benchmark automatically against new model releases.</p>

<h2>Next Steps</h2>

<p>We're planning to:</p>
<ol>
<li>Add RAG with Qiskit 2.x docs and re-run the benchmark</li>
<li>Test against Claude Opus 4.6, GPT-5, and domain-specific models</li>
<li>Develop a cQASM variant for Quantum Inspire hardware</li>
<li>Run the Agent-Q and QUASAR approaches against our benchmark for direct comparison</li>
</ol>
`,
    sources: [
      { label: 'Qiskit HumanEval benchmark paper', url: 'https://arxiv.org/abs/2406.02132' },
      { label: 'QUASAR — agentic RL for quantum code generation', url: 'https://arxiv.org/abs/2510.00967' },
      { label: 'Our benchmark results (GitHub)', url: 'https://github.com/JDerekLomas/quantuminspire/tree/main/benchmark_results' },
      { label: 'Qiskit 2.x migration guide', url: 'https://docs.quantum.ibm.com/migration-guides' },
    ],
  },
  {
    slug: 'autonomous-research-agents',
    title: 'Building Autonomous Research Agents for Quantum Computing',
    subtitle: 'What we learned designing an agent pipeline that runs experiments continuously',
    date: '2026-02-10',
    author: 'AI x Quantum Research Team',
    category: 'technical',
    tags: ['agents', 'infrastructure', 'orchestrator', 'automation'],
    heroImage: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&q=80',
    heroCaption: 'Autonomous agents that plan, execute, and analyze quantum experiments around the clock.',
    excerpt: 'We designed and implemented an agent-based research infrastructure that can continuously benchmark LLMs on quantum tasks, replicate published papers, and generate reports. Here\'s the architecture and what we\'ve learned.',
    content: `
<p>The promise of AI-for-science isn't just one-off experiments — it's <em>continuous, autonomous research</em>. We built an agent infrastructure that benchmarks, replicates, and reports on quantum computing research around the clock. Here's how it works and what we learned.</p>

<h2>The Architecture</h2>

<p>Our system has five agents, three currently operational:</p>

<h3>Orchestrator (Implemented)</h3>
<p>The central coordinator. It schedules experiments, tracks state across runs, and decides what to execute next. It supports multiple operating modes:</p>
<ul>
<li><strong>--once</strong>: Run the full pipeline (benchmark + replication + report) a single time</li>
<li><strong>--daemon</strong>: Run continuously with configurable intervals (default: 1 hour)</li>
<li><strong>--run-benchmarks</strong>: Just the benchmark sweep</li>
<li><strong>--run-replication</strong>: Just paper replication</li>
</ul>
<p>The daemon mode uses graceful signal handling — SIGINT/SIGTERM trigger a clean shutdown after the current experiment completes. State is persisted to JSON between runs.</p>

<h3>Benchmark Runner (Implemented)</h3>
<p>Wraps our Qiskit HumanEval harness with model selection, result formatting, and cross-model comparison. Currently configured for Gemini 3 Flash, with plans to add Claude Opus 4.6 and GPT-5.</p>

<h3>Replication Agent (Implemented)</h3>
<p>Takes a paper ID from our registry, runs the corresponding simulation code, and logs results. Currently has one paper (Sagastizabal et al. 2019 VQE) with infrastructure to add more.</p>

<h3>Literature Scout (Planned)</h3>
<p>Will monitor arxiv quant-ph for papers with reproducible results, extract methodology, and generate structured replication plans.</p>

<h3>Circuit Optimizer (Planned)</h3>
<p>Will optimize circuits for Quantum Inspire hardware topologies, comparing AI-optimized results against Qiskit's transpiler.</p>

<h2>Design Decisions</h2>

<h3>Why subprocess isolation?</h3>
<p>Each agent runs as a separate Python subprocess called by the orchestrator. This isn't the most elegant architecture, but it provides crucial benefits:</p>
<ul>
<li><strong>Crash isolation</strong>: A failing benchmark doesn't take down the orchestrator</li>
<li><strong>Timeout enforcement</strong>: We can kill runaway experiments (2h limit for benchmarks)</li>
<li><strong>Clean state</strong>: Each run gets a fresh Python environment — no leaked state from previous runs</li>
<li><strong>Resource limits</strong>: Subprocess resource usage can be monitored independently</li>
</ul>

<h3>Why JSON state, not a database?</h3>
<p>For our scale (tens of runs, not millions), a JSON file is simpler and more debuggable than a database. The state file is human-readable, version-controllable, and trivially recoverable. If we scale to thousands of runs, we'll migrate to SQLite.</p>

<h3>Why daemon mode instead of cron?</h3>
<p>A long-running daemon maintains context between runs — it can make decisions based on the previous run's results. A cron job would need to reload and re-analyze state each time. The daemon also handles graceful shutdown, which matters when experiments take 30+ minutes.</p>

<h2>Lessons from Sakana AI's "AI Scientist"</h2>

<p>Sakana AI published "The AI Scientist" in 2024, demonstrating end-to-end autonomous research: idea generation, code writing, experiment execution, and paper drafting. Comparing their approach to ours:</p>

<table>
<thead><tr><th>Aspect</th><th>AI Scientist (Sakana)</th><th>Our System</th></tr></thead>
<tbody>
<tr><td>Scope</td><td>General ML research</td><td>Quantum computing specifically</td></tr>
<tr><td>Idea generation</td><td>LLM brainstorming</td><td>Literature-guided (planned)</td></tr>
<tr><td>Execution</td><td>Code gen + run</td><td>Structured pipeline with validation</td></tr>
<tr><td>Hardware</td><td>Simulation only</td><td>QI hardware access planned</td></tr>
<tr><td>Continuous operation</td><td>One-shot</td><td>Daemon mode, scheduled runs</td></tr>
<tr><td>Quality control</td><td>LLM self-review</td><td>Automated test suites</td></tr>
</tbody>
</table>

<p>The key difference: we prioritize <strong>reproducibility and rigor</strong> over <strong>novelty generation</strong>. Our benchmark harness has automated test suites. Our replication agent compares against published data. The system is designed to produce verified results, not impressive-sounding papers.</p>

<h2>What's Next</h2>

<p>The immediate roadmap:</p>
<ol>
<li><strong>Multi-model benchmarking</strong>: Automated sweeps across Claude, GPT-5, and Gemini for each benchmark run</li>
<li><strong>Literature Scout</strong>: arxiv monitoring with automated replication plan generation</li>
<li><strong>Hardware integration</strong>: Run circuits on actual Quantum Inspire devices (Starmon-7, Tuna-5/9)</li>
<li><strong>Web dashboard</strong>: Real-time pipeline status on our research website</li>
</ol>

<p>The broader vision: a research system that discovers, replicates, and extends quantum computing papers while humans focus on the creative and strategic work. We're early, but the infrastructure is running.</p>
`,
    sources: [
      { label: 'Sakana AI — "The AI Scientist"', url: 'https://sakana.ai/ai-scientist/' },
      { label: 'Our agent code (GitHub)', url: 'https://github.com/JDerekLomas/quantuminspire/tree/main/agents' },
      { label: 'Google AI co-scientist', url: 'https://research.google/blog/accelerating-scientific-breakthroughs-with-an-ai-co-scientist/' },
      { label: 'Quantum Inspire platform', url: 'https://www.quantum-inspire.com/' },
    ],
  },
  {
    slug: 'ai-replicates-qutech-paper',
    title: 'An AI Agent Replicated a QuTech Quantum Paper',
    subtitle: 'Claude Opus 4.6 wrote 300 lines of VQE simulation code from a paper reference alone',
    date: '2026-02-09',
    author: 'AI x Quantum Research Team',
    category: 'experiment',
    tags: ['VQE', 'replication', 'Claude', 'QuTech', 'paper replication'],
    heroImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80',
    heroCaption: 'From published paper to working simulation — autonomously.',
    excerpt: 'We gave Claude Opus 4.6 a reference to Sagastizabal et al. (2019) — a QuTech paper on symmetry-verified VQE for H2 — and asked it to replicate the experiment. It wrote the Hamiltonian, ansatz, noise model, and error mitigation from scratch.',
    content: `
<p>One of the most powerful tests of AI scientific capability is <strong>paper replication</strong>: given a published paper, can an AI agent reproduce the experiment from scratch? We tested this with a quantum computing paper from our own institution.</p>

<h2>The Paper</h2>

<p><strong>"Error Mitigation by Symmetry Verification on a Variational Quantum Eigensolver"</strong><br/>
Sagastizabal et al., <em>Physical Review A</em> 100, 010302 (2019)<br/>
<a href="https://arxiv.org/abs/1902.11258">arxiv:1902.11258</a></p>

<p>This paper from QuTech / TU Delft demonstrates a key technique: using physical symmetries to detect and mitigate errors in variational quantum eigensolvers (VQE). They find the ground-state energy of H&#8322; — the hydrogen molecule — using a 2-qubit circuit with Z-parity symmetry verification.</p>

<h2>What the AI Built</h2>

<p>Claude Opus 4.6 produced ~300 lines of production Qiskit code covering:</p>

<h3>1. Hamiltonian Construction</h3>
<p>The H&#8322; molecular Hamiltonian in the STO-3G basis, transformed via Bravyi-Kitaev reduction to a 2-qubit operator:</p>
<p><code>H = g₀II + g₁ZI + g₂IZ + g₃ZZ + g₄XX + g₅YY</code></p>
<p>The agent correctly identified that the coefficients (g₀ through g₅) are functions of the bond distance, and tabulated them from the O'Malley et al. reference data for 29 bond distances from 0.2 to 3.0 Angstroms.</p>

<h3>2. Ansatz Circuit</h3>
<p>A single-parameter exchange rotation in the {|01⟩, |10⟩} subspace — a parity-preserving ansatz that keeps the state within the correct symmetry sector. The agent decomposed this into RXX(θ) and RYY(θ) rotations, matching the paper's approach.</p>

<h3>3. Noise Model</h3>
<p>Realistic noise parameters matching the paper's device characterization:</p>
<ul>
<li>T₁ = 30μs, T₂ = 60μs (thermal relaxation)</li>
<li>Depolarizing noise on single-qubit gates (0.1%) and two-qubit gates (1%)</li>
<li>Measurement error (1%)</li>
</ul>

<h3>4. Symmetry Verification</h3>
<p>The key innovation of the paper: post-selecting measurement results on states where the qubit parity matches the ground-state sector (even parity for H₂). This filters out a significant fraction of errors without additional circuit overhead.</p>

<h3>5. Measurement Protocol</h3>
<p>Three measurement bases (Z, X, Y) with 8192 shots each. The XX expectation value requires Hadamard-rotated measurements; YY requires Sdg-Hadamard-rotated measurements. The agent correctly implemented all three basis rotations.</p>

<h2>What This Demonstrates</h2>

<p>This experiment shows that AI agents can:</p>
<ol>
<li><strong>Read and understand quantum physics papers</strong> — extracting the Hamiltonian, ansatz structure, noise parameters, and measurement protocol</li>
<li><strong>Translate physics to code</strong> — implementing the Bravyi-Kitaev transformation, noise channels, and symmetry verification in Qiskit</li>
<li><strong>Handle domain-specific details</strong> — correctly managing complex numbers, basis rotations, and expectation value calculations</li>
</ol>

<p>The entire replication was done in a single session with Claude Opus 4.6 acting as a coding agent through Claude Code. The human role was to provide the paper reference and review the output — the agent handled the physics, mathematics, and implementation.</p>

<h2>Limitations</h2>

<p>To be clear about what this doesn't show:</p>
<ul>
<li>We haven't yet run this on actual quantum hardware (only Qiskit Aer simulation)</li>
<li>We haven't done a quantitative comparison of our curves against the paper's published figures</li>
<li>The noise model is approximate — real device noise is more complex</li>
<li>A human physicist reviewed the code, which matters for trust</li>
</ul>

<p>These are next steps, not fundamental limitations. The point is that the AI produced a reasonable starting point — 300 lines of domain-specific simulation code — from a paper reference alone.</p>
`,
    sources: [
      { label: 'Sagastizabal et al. (2019) — original paper', url: 'https://arxiv.org/abs/1902.11258' },
      { label: 'Our replication code (GitHub)', url: 'https://github.com/JDerekLomas/quantuminspire/blob/main/replicate_sagastizabal.py' },
      { label: 'O\'Malley et al. — H2 coefficient data', url: 'https://arxiv.org/abs/1512.06860' },
      { label: 'Bravyi-Kitaev transformation', url: 'https://arxiv.org/abs/1208.5986' },
    ],
  },
  {
    slug: 'methods-of-ai-science',
    title: 'Five Methods Driving AI-Accelerated Science',
    subtitle: 'Foundation models, autonomous agents, robotic labs, and more — a taxonomy of approaches',
    date: '2026-02-10',
    author: 'AI x Quantum Research Team',
    category: 'landscape',
    tags: ['methods', 'foundation models', 'autonomous labs', 'agents', 'taxonomy'],
    heroImage: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=1200&q=80',
    heroCaption: 'The tools and techniques that are reshaping scientific discovery.',
    excerpt: 'Across the AI-for-science landscape, five distinct methodological approaches have emerged. Understanding them helps identify where quantum computing fits — and where the biggest opportunities lie.',
    content: `
<p>As we surveyed the AI-for-science landscape, we noticed that despite the diversity of organizations and applications, the field converges on a handful of core methods. Here's our taxonomy.</p>

<h2>1. Foundation Models for Scientific Domains</h2>

<p>The most mature approach: train large models on domain-specific data to learn the "language" of a scientific field.</p>

<p><strong>Examples:</strong></p>
<ul>
<li><strong>AlphaFold / ESM</strong> (protein structure) — Arguably the most impactful AI-for-science result to date</li>
<li><strong>MatterGen</strong> (Microsoft, materials) — Generates novel materials with desired properties</li>
<li><strong>GNoME</strong> (DeepMind, materials) — Discovered 2.2 million new crystal structures</li>
<li><strong>Agent-Q / QUASAR</strong> (quantum circuits) — Domain-specific models for quantum code generation</li>
</ul>

<p><strong>For quantum computing:</strong> This is where our Qiskit HumanEval benchmark fits. We're measuring how well general-purpose LLMs perform on quantum tasks, but the field is moving toward purpose-built quantum foundation models. Training on quantum circuit data, simulation results, and papers could produce models that "think in qubits."</p>

<h2>2. Autonomous Research Agents</h2>

<p>AI systems that plan, execute, and analyze experiments with minimal human oversight.</p>

<p><strong>Examples:</strong></p>
<ul>
<li><strong>Sakana AI's "AI Scientist"</strong> — Generates ideas, writes code, runs experiments, drafts papers</li>
<li><strong>Google's AI co-scientist</strong> — Hypothesis generation and experimental design</li>
<li><strong>FutureHouse</strong> — Literature mining and hypothesis generation</li>
<li><strong>Our system</strong> — Orchestrator + benchmark runner + replication agent for quantum research</li>
</ul>

<p><strong>For quantum computing:</strong> This is our primary approach. Agent-based systems can continuously run benchmarks, replicate papers, and optimize circuits. The key challenge is quality control — how do you ensure an agent's quantum experiment is physically meaningful?</p>

<h2>3. Self-Driving / Robotic Laboratories</h2>

<p>Physical labs where robots execute experiments designed by AI systems.</p>

<p><strong>Examples:</strong></p>
<ul>
<li><strong>DeepMind's automated UK lab</strong> — Fully AI-driven experimental facility</li>
<li><strong>Emerald Cloud Lab / Strateos</strong> — Cloud-accessible robotic lab platforms</li>
<li><strong>Recursion Pharmaceuticals</strong> — Massive robotic drug screening operation</li>
<li><strong>Carnegie Mellon's Clio</strong> — Self-driving lab for materials science</li>
</ul>

<p><strong>For quantum computing:</strong> Quantum devices <em>are</em> essentially robotic labs — programmable hardware controlled through software APIs. Quantum Inspire already provides cloud access to real quantum processors. An AI agent that can design and submit circuits to QI hardware is effectively running a self-driving quantum lab.</p>

<h2>4. ML-Guided Experimental Design</h2>

<p>Using machine learning to decide <em>which</em> experiments to run, optimizing over the space of possible measurements.</p>

<p><strong>Examples:</strong></p>
<ul>
<li><strong>Bayesian optimization</strong> for drug screening (widespread)</li>
<li><strong>Active learning</strong> for materials discovery (CuspAI, Periodic Labs)</li>
<li><strong>RL for quantum control</strong> — Learning pulse sequences for quantum gates</li>
<li><strong>Neural architecture search</strong> adapted for quantum circuit design</li>
</ul>

<p><strong>For quantum computing:</strong> Hugely relevant. VQE parameter optimization, circuit architecture search, error mitigation strategy selection, and hardware calibration can all be framed as ML-guided design problems. Our replication agent could be extended with active learning to efficiently explore the space of experimental parameters.</p>

<h2>5. Scientific Literature Intelligence</h2>

<p>Systems that read, synthesize, and reason over the scientific corpus.</p>

<p><strong>Examples:</strong></p>
<ul>
<li><strong>FutureHouse</strong> — Automated literature review and hypothesis generation</li>
<li><strong>Semantic Scholar / Elicit</strong> — AI-powered research tools</li>
<li><strong>Consensus</strong> — AI that answers questions from the scientific literature</li>
</ul>

<p><strong>For quantum computing:</strong> This is our planned Literature Scout agent. Quantum computing publishes ~50 papers per day on arxiv. An AI system that identifies reproducible experiments, extracts methodologies, and generates replication plans could accelerate the field significantly.</p>

<h2>The Convergence</h2>

<p>The most exciting development isn't any single method — it's their <strong>convergence</strong>. The next generation of AI-for-science systems will combine all five:</p>

<ol>
<li>Foundation models provide domain expertise</li>
<li>Agents plan and coordinate research</li>
<li>Robotic labs (or quantum hardware) execute experiments</li>
<li>ML-guided design optimizes what to try next</li>
<li>Literature intelligence connects to existing knowledge</li>
</ol>

<p>This is exactly the architecture we're building for quantum computing. The research question isn't whether AI will accelerate science — it's how fast the acceleration will be, and whether quantum computing, with its unique combination of theoretical depth and experimental accessibility, might be where it happens first.</p>
`,
    sources: [
      { label: 'AlphaFold — DeepMind', url: 'https://deepmind.google/technologies/alphafold/' },
      { label: 'GNoME — 2.2M new materials', url: 'https://deepmind.google/discover/blog/millions-of-new-materials-discovered-with-deep-learning/' },
      { label: 'Sakana AI — "The AI Scientist"', url: 'https://sakana.ai/ai-scientist/' },
      { label: 'Emerald Cloud Lab', url: 'https://www.emeraldcloudlab.com/' },
      { label: 'FutureHouse', url: 'https://www.futurehouse.org/' },
      { label: 'Semantic Scholar', url: 'https://www.semanticscholar.org/' },
    ],
  },
  {
    slug: 'ai-meets-quantum-papers',
    title: 'AI Meets Quantum: The Papers Reshaping the Field',
    subtitle: 'From neural QEC decoders to autonomous quantum agents, AI is becoming quantum computing\'s missing ingredient',
    date: '2026-02-10',
    author: 'AI x Quantum Research Team',
    category: 'landscape',
    tags: ['AlphaQubit', 'QUASAR', 'QEC', 'AI agents', 'circuit optimization', 'papers'],
    heroImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&q=80',
    heroCaption: 'AI and quantum computing are converging — and the research papers tell the story.',
    excerpt: 'A survey of the most important papers at the intersection of AI and quantum computing: neural decoders that outperform classical algorithms, agents that write quantum code, and ML systems that optimize circuits for real hardware.',
    content: `
<p>The intersection of AI and quantum computing is no longer speculative. A wave of papers from 2024-2026 demonstrates concrete, measurable results: AI systems that decode quantum errors faster than classical algorithms, write valid quantum circuits from natural-language descriptions, and optimize experiments on real hardware. Here's our guide to the papers that matter.</p>

<h2>Neural Quantum Error Correction</h2>

<p>Quantum error correction is the biggest engineering bottleneck in the field. Decoders must run in real-time — faster than errors accumulate — and scale to codes with thousands of physical qubits. Classical decoders struggle with this. AI offers a fundamentally different approach.</p>

<h3>AlphaQubit (Google DeepMind, 2024)</h3>

<p><strong>AlphaQubit</strong> is a transformer-based decoder for surface codes that learns correlated error patterns directly from syndrome data. Rather than assuming an error model (like minimum-weight perfect matching), it learns the actual noise characteristics of a specific quantum processor.</p>

<p>Key results (<a href="https://www.nature.com/articles/s41586-024-08148-8">Nature, November 2024</a>):</p>
<ul>
<li><strong>6% fewer errors</strong> than tensor network methods (highly accurate but impractically slow)</li>
<li><strong>30% fewer errors</strong> than correlated matching (the fast, practical state-of-the-art decoder)</li>
<li>Tested on real Sycamore hardware data at distance-3 (17 qubits) and distance-5 (49 qubits), with simulations up to 241 qubits</li>
<li>Computational complexity scales as O(d<sup>4</sup>) with code distance — a Mamba-based follow-up (<a href="https://arxiv.org/abs/2510.22724">arxiv:2510.22724</a>) achieves O(d<sup>2</sup>) while matching accuracy</li>
</ul>

<p><strong>Why it matters:</strong> Real quantum hardware has messy, correlated noise that doesn't match textbook error models. A decoder that learns the actual noise is fundamentally more powerful. The open question is whether AlphaQubit's approach can scale to the code distances (17+) needed for fault-tolerant quantum computing.</p>

<h3>NVIDIA + QuEra: GPU-Accelerated QEC Decoding</h3>

<p>NVIDIA's DGX Quantum platform achieves <strong>&lt;4 microsecond roundtrip latency</strong> for error correction decoding — roughly 1,000x faster than alternative approaches. This is crucial because decoding must happen faster than the quantum error correction cycle time (~1 microsecond for superconducting qubits).</p>

<p>Their CUDA-Q QEC framework combines algorithmic decoders with AI inference enhancements, and they've partnered with QuEra to decode errors on neutral-atom quantum computers. The GPU approach is attractive because it can be updated as neural decoder architectures improve.</p>

<h3>RIKEN: Boosting QEC with AI (2025)</h3>

<p>Researchers at RIKEN demonstrated AI-enhanced error correction that improves decoder performance on real hardware noise profiles. Their approach uses machine learning to predict which error patterns are most likely given a specific device's calibration data, then biases the decoder accordingly.</p>

<h2>AI for Quantum Code Generation</h2>

<p>Can AI write quantum programs? Several systems have been tested, with surprisingly strong results.</p>

<h3>QUASAR — Agentic RL for Quantum Code</h3>

<p><strong>QUASAR</strong> (<a href="https://arxiv.org/abs/2510.00967">arxiv:2510.00967</a>, October 2025) combines reinforcement learning with tool-augmented LLMs. The system uses external quantum simulators for circuit verification and a hierarchical reward mechanism to align a 4-billion-parameter model with quantum-specific knowledge.</p>

<p>Results:</p>
<ul>
<li><strong>99.31% validity at Pass@1</strong>, <strong>100% at Pass@10</strong></li>
<li>Outperforms GPT-4o, GPT-5, DeepSeek-V3, and multiple supervised fine-tuning baselines</li>
<li>Generates practical ansatz patterns and parameter initializations for QAOA and VQE circuits</li>
</ul>

<p><strong>Comparison with our benchmark:</strong> Our Qiskit HumanEval tests measure <em>functional correctness</em> (does the code produce the right answer?), which is stricter than circuit validity. Our best result is 63.6% Pass@1 with Claude Opus 4.6. The gap between QUASAR's 99.31% validity and our 63.6% correctness suggests that validity is necessary but far from sufficient — the hard part is getting the quantum logic right, not just the syntax.</p>

<h3>QCoder Benchmark — Reasoning Models for Quantum</h3>

<p>The <strong>QCoder Benchmark</strong> (<a href="https://arxiv.org/abs/2510.26101">arxiv:2510.26101</a>, October 2025) evaluates LLMs on quantum programming tasks with feedback from simulated quantum hardware. OpenAI's o3 reasoning model achieved <strong>78% accuracy</strong> — compared to 40% for human-written code from real programming contests. GPT-4o managed only 18.97%. This suggests that chain-of-thought reasoning is particularly well-suited to quantum programming, where each step requires careful mathematical reasoning.</p>

<h3>QCopilot — Autonomous Quantum Sensor Experiments</h3>

<p><strong>QCopilot</strong> (<a href="https://arxiv.org/abs/2508.05421">arxiv:2508.05421</a>, August 2025) is a multi-agent copilot for quantum <em>sensors</em>, orchestrating specialized agents (Decision Maker, Experimenter, Analyst, Multimodal Diagnoser) with LLMs and a vector knowledge base. It generated <strong>10<sup>8</sup> sub-microkelvin atoms without human intervention</strong> within hours — a <strong>~100x speedup</strong> over manual experimentation for atom cooling. The approach demonstrates that multi-agent architectures can manage complex quantum experimental workflows autonomously.</p>

<h3>Q-Fusion — Diffusion Models Generate Quantum Circuits</h3>

<p><strong>Q-Fusion</strong> (<a href="https://arxiv.org/abs/2504.20794">arxiv:2504.20794</a>, published at IEEE ISVLSI 2025) takes a completely different approach: using graph diffusion models to generate quantum circuits. Circuits are represented as directed acyclic graphs where nodes are gates and edges are qubit wires. The result: <strong>100% valid quantum circuit outputs</strong> across all experiments, with &gt;40% functionally unique outputs for 2-qubit circuits. It outperforms LLM, RL, and VAE-based approaches on validity.</p>

<h3>Our Qiskit HumanEval Results</h3>

<p>Our <a href="/blog/llms-write-quantum-code">benchmark of 151 quantum programming tasks</a> adds context to these results. We found that Claude Opus 4.6 (63.6%) and Gemini 3 Flash (62.25%) are remarkably close on quantum code generation. The dominant failure mode is API staleness — models generate correct quantum logic but call deprecated functions. This suggests that RAG (as QUASAR uses) could push general-purpose LLMs to 75-80% correctness.</p>

<h2>AI for Circuit Optimization</h2>

<h3>IBM's AI Transpiler</h3>

<p>IBM's AI-powered transpiler passes achieve a <strong>42% reduction in two-qubit gate counts</strong> compared to standard Qiskit transpilation. Two-qubit gates are the dominant source of errors on real hardware, so this directly translates to higher-fidelity execution. The AI transpiler learns hardware-specific optimization strategies that hand-written heuristics miss.</p>

<h3>AlphaEvolve (Google DeepMind)</h3>

<p><strong>AlphaEvolve</strong> (<a href="https://arxiv.org/abs/2506.13131">arxiv:2506.13131</a>, June 2025) uses evolutionary search guided by Gemini LLMs to discover novel algorithms. It achieved the <strong>first improvement in 56 years over Strassen's algorithm</strong> for 4x4 complex matrix multiplication, solved 75% of 50 open math problems, and delivered a 0.7% recovery of Google's worldwide compute resources through data center scheduling optimization. DeepMind has noted quantum hardware as an "exceptionally high-potential use" — discovering new circuit decompositions, error correction codes, and compilation strategies.</p>

<h3>RL-Based Quantum Gate Synthesis</h3>

<p>Reinforcement learning for Pauli network synthesis is an active research area. The idea: train an RL agent to decompose arbitrary quantum operations into hardware-native gates, optimizing for the specific connectivity and noise profile of a target processor. Early results show improvements over standard decomposition algorithms, particularly for circuits with irregular structure.</p>

<h2>Autonomous Quantum Agents</h2>

<h3>k-Agents — Self-Driving Quantum Labs</h3>

<p><strong>k-agents</strong> (<a href="https://arxiv.org/abs/2412.07978">arxiv:2412.07978</a>, published in <em>Patterns</em> / Cell Press, 2025) are LLM-based agents that encapsulate laboratory knowledge and automate quantum computing experiments. The system breaks multi-step experimental procedures into agent-based state machines with closed-loop feedback control.</p>

<p>Key results:</p>
<ul>
<li>Agents autonomously calibrated and operated a <strong>superconducting quantum processor for hours</strong> without human intervention</li>
<li>Successfully produced and characterized <strong>entangled GHZ states</strong> at the level achieved by human scientists</li>
<li>Performed single-qubit and two-qubit gate calibrations autonomously</li>
</ul>

<p>Key insight: quantum experiments are well-suited to autonomous agents because the entire workflow is digital — design a circuit, submit it, get measurement results. There's no physical sample preparation or wet-lab handling. An AI agent can iterate at the speed of the hardware itself.</p>

<h3>AlphaTensor-Quantum — RL for Circuit Optimization</h3>

<p><strong>AlphaTensor-Quantum</strong> (<a href="https://arxiv.org/abs/2402.14396">arxiv:2402.14396</a>, published in <em>Nature Machine Intelligence</em>, 2025) extends DeepMind's tensor decomposition approach to quantum circuits. The deep RL system <strong>halved T-gate counts</strong> in some circuits — optimizing circuits for cryptography, quantum chemistry, and Shor's algorithm. T-gates are the most expensive gates in fault-tolerant quantum computing, so halving their count directly translates to enormous resource savings.</p>

<h2>The Convergence: AI as Quantum Computing's Missing Ingredient</h2>

<p>A December 2025 paper in <em>Nature Communications</em> — "<a href="https://www.nature.com/articles/s41467-025-65836-3">Artificial intelligence for quantum computing</a>" — argues that AI is emerging as quantum computing's "missing ingredient." The paper identifies three tiers of AI applications:</p>

<ol>
<li><strong>Currently feasible</strong>: Code generation, circuit optimization, decoder design, VQE optimization</li>
<li><strong>Emerging</strong>: Automated experiment design, noise characterization, active space selection</li>
<li><strong>Longer-term</strong>: Quantum code discovery, classical simulation acceleration, software verification</li>
</ol>

<p>Our project at TU Delft sits squarely in Tier 1, with the infrastructure to move into Tier 2 as we integrate with Quantum Inspire hardware. The landscape suggests a clear trajectory: the teams that combine AI capability with real quantum hardware access will produce the most impactful research.</p>

<h2>What's Missing</h2>

<p>Despite the progress, significant gaps remain:</p>

<ul>
<li><strong>Reproducibility</strong>: Many AI-for-quantum papers don't release code or data. Our benchmark harness is fully open source.</li>
<li><strong>Hardware validation</strong>: Most results are simulation-only. Real hardware introduces noise, calibration drift, and connectivity constraints that simulation doesn't capture.</li>
<li><strong>Scalability</strong>: AlphaQubit works at distance-5 but may not scale. QUASAR achieves high validity but functional correctness is harder. The gap between demos and production remains wide.</li>
<li><strong>Integration</strong>: These techniques exist in isolation. Nobody has yet built an integrated system that combines neural decoding, AI circuit optimization, autonomous experimentation, and literature intelligence. That's what we're working toward.</li>
</ul>
`,
    sources: [
      { label: 'AlphaQubit — Google DeepMind', url: 'https://blog.google/technology/google-deepmind/alphaqubit-quantum-error-correction/' },
      { label: 'AI for quantum computing (Nature Communications)', url: 'https://www.nature.com/articles/s41467-025-65836-3' },
      { label: 'NVIDIA CUDA-Q QEC real-time decoding', url: 'https://developer.nvidia.com/blog/real-time-decoding-algorithmic-gpu-decoders-and-ai-inference-enhancements-in-nvidia-cuda-q-qec/' },
      { label: 'NVIDIA + QuEra quantum error decoding', url: 'https://developer.nvidia.com/blog/nvidia-and-quera-decode-quantum-errors-with-ai/' },
      { label: 'IBM AI transpiler passes', url: 'https://www.ibm.com/quantum/blog/ai-transpiler-passes' },
      { label: 'RIKEN: Boosting QEC with AI', url: 'https://www.riken.jp/en/news_pubs/research_news/rr/20250509_2/index.html' },
      { label: 'Our Qiskit HumanEval benchmark results', url: 'https://github.com/JDerekLomas/quantuminspire/tree/main/benchmark_results' },
    ],
  },
  {
    slug: 'quantum-hardware-landscape-2026',
    title: 'The Quantum Hardware Race: Where Things Actually Stand in 2026',
    subtitle: 'Six hardware platforms, three breakthrough results, and one honest assessment of quantum advantage',
    date: '2026-02-10',
    author: 'AI x Quantum Research Team',
    category: 'landscape',
    tags: ['hardware', 'QEC', 'Google Willow', 'QuTech', 'spin qubits', 'landscape'],
    heroImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80',
    heroCaption: 'The quantum hardware landscape is more diverse — and more competitive — than ever.',
    excerpt: 'A researcher\'s guide to the six quantum hardware platforms competing for dominance, the error correction breakthroughs that changed the game, and an honest assessment of where quantum advantage actually stands.',
    content: `
<p>The quantum computing hardware landscape in 2026 is defined by three things: error correction finally working, six hardware platforms racing for dominance, and an honest reckoning about what "quantum advantage" actually means. Here's the state of play.</p>

<h2>The Year Error Correction Became Real</h2>

<p>2024-2025 was the year quantum error correction (QEC) went from theoretical milestone to engineering reality. The numbers tell the story: 120 peer-reviewed QEC papers published by October 2025, up from 36 in all of 2024. Seven code families demonstrated on real hardware.</p>

<h3>Google Willow (December 2024)</h3>

<p>The headline result: Google's Willow processor achieved the first demonstration of <strong>exponential error suppression</strong> with increasing surface code distance. This is the fundamental requirement for scalable quantum computing — as you add more qubits for error correction, the logical error rate actually goes down.</p>

<p>The specifics:</p>
<ul>
<li><strong>105 superconducting qubits</strong></li>
<li>Distance-7 surface code on a ~101-qubit patch</li>
<li>Logical error rate suppressed by factor &Lambda; = 2.14 &plusmn; 0.02 per code distance increase of 2</li>
<li>0.143% error per correction cycle at distance-7</li>
<li>Logical memory lifetime <strong>2.4x longer</strong> than the best physical qubit — beyond breakeven</li>
<li>Real-time decoding at 63 microsecond average latency</li>
<li>Physical qubit T<sub>1</sub> improved from ~20&mu;s (Sycamore) to 68&mu;s</li>
</ul>

<p>Willow also completed a random circuit sampling benchmark in ~5 minutes that would take an estimated 10<sup>25</sup> years classically. But — and this is important — random circuit sampling has no known practical application. The result proves the hardware is extraordinary; the question is whether it can be applied to useful problems.</p>

<h3>IBM's Roadmap</h3>

<p>IBM has laid out the most detailed public roadmap to fault-tolerant quantum computing:</p>

<ul>
<li><strong>2025 — Loon</strong>: Experimental processor demonstrating all key fault-tolerant components, with new c-couplers for LDPC code connectivity</li>
<li><strong>2026 — Kookaburra</strong>: First QEC-enabled module with qLDPC memory and a Logical Processing Unit (LPU)</li>
<li><strong>2029 — Starling</strong>: 200 logical qubits running 100 million gates</li>
</ul>

<p>IBM has achieved real-time qLDPC decoding at <strong>&lt;480 nanoseconds</strong> and their AI transpiler reduces two-qubit gate counts by 42%. Their bet on qLDPC codes (vs. surface codes) could prove transformative — qLDPC promises dramatically better physical-to-logical qubit ratios.</p>

<h3>The Magic State Breakthrough</h3>

<p>A major 2025 result: <strong>theoretically optimal scaling for magic state distillation</strong> has been achieved (scaling exponent &gamma; = 0). Magic states are required for the T gate — the non-Clifford gate needed for universal quantum computation. QuEra/Harvard/MIT demonstrated the first experimental logical-level magic state distillation on a neutral-atom computer. This resolves a longstanding theoretical bottleneck, though practical overhead remains enormous.</p>

<h2>The Six Hardware Platforms</h2>

<h3>1. Superconducting Qubits — Google, IBM, Rigetti, IQM</h3>
<p><strong>Strengths:</strong> Fastest gate speeds, largest qubit counts, most mature fabrication.</p>
<p><strong>State of the art:</strong> Google Willow (105 qubits, below-threshold QEC), IBM roadmap to 1,386 qubits, Fujitsu/RIKEN 256-qubit machine (1,000-qubit planned for 2026).</p>
<p><strong>Challenge:</strong> Short coherence times (~68&mu;s), cryogenic cooling to 15 millikelvin, crosstalk. The classical control bottleneck — thousands of coaxial cables from room temperature to the cryostat — doesn't scale beyond a few hundred qubits.</p>

<h3>2. Trapped Ions — Quantinuum, IonQ, Oxford Ionics</h3>
<p><strong>Strengths:</strong> Highest gate fidelity, all-to-all connectivity, long coherence times.</p>
<p><strong>State of the art:</strong> Quantinuum H2-1 (56 qubits, first "three 9s" — 99.9% two-qubit gate fidelity across all pairs), Helios (98-qubit with novel "X" junction), 99.9993% SPAM accuracy. Microsoft + Quantinuum demonstrated 12 logical qubits for chemistry simulation.</p>
<p><strong>Challenge:</strong> Slower gate speeds, scaling beyond hundreds of ions, laser control complexity. Apollo (fully fault-tolerant, universal) planned for 2029.</p>

<h3>3. Neutral Atoms — QuEra, Atom Computing/Microsoft, Pasqal</h3>
<p><strong>Strengths:</strong> Massive parallelism, reconfigurable connectivity, natural scaling to thousands of qubits.</p>
<p><strong>State of the art:</strong> QuEra achieved 3,000-qubit array operating continuously for 2+ hours, up to 96 logical qubits with below-threshold error rates. Their Algorithmic Fault Tolerance approach reduces error correction runtime cost by 10-100x. $230M+ raised in 2025.</p>
<p><strong>Challenge:</strong> Atom loss during computation, slower gate speeds, readout fidelity.</p>

<h3>4. Photonic — PsiQuantum, Xanadu, Photonic Inc.</h3>
<p><strong>Strengths:</strong> Room-temperature operation, natural networking capability, speed.</p>
<p><strong>State of the art:</strong> PsiQuantum raised $1B (September 2025). Photonic Inc. developed SHYPS qLDPC codes specifically for photonic architectures — 20x fewer physical qubits than surface codes.</p>
<p><strong>Challenge:</strong> Photon loss, non-deterministic gates, lack of quantum memory.</p>

<h3>5. Semiconductor Spin Qubits — QuTech/TU Delft, Intel</h3>
<p><strong>Strengths:</strong> Smallest qubit footprint, compatible with CMOS fabrication, potentially billions of qubits on a chip.</p>
<p><strong>State of the art:</strong> QuTech demonstrated a 10-qubit germanium processor with >99% single-qubit gate fidelities and 2D layout with 4-neighbor connectivity. Silicon spin qubits fabricated on 300mm industrial wafers with >99% fidelity (published in Nature 2025). Germanium substrates produce "quieter" qubits with longer coherence times.</p>
<p><strong>Challenge:</strong> Very short coherence times (microseconds), two-qubit gate fidelity lags other platforms. But the CMOS compatibility argument is powerful: if a qubit looks like a transistor, you inherit 60 years of semiconductor manufacturing expertise.</p>

<h3>6. Topological — Microsoft</h3>
<p><strong>Strengths:</strong> Inherent error protection, potentially very low overhead for fault tolerance.</p>
<p><strong>State of the art:</strong> Majorana 1 chip (February 2025) — 8 topological qubits using tetron architecture, demonstrated quantum error detection on 2 logical qubits. Claims 1,000-fold error rate reduction via topological protection.</p>
<p><strong>Challenge:</strong> Only 8 qubits demonstrated — years behind other modalities in qubit count. Significant scientific controversy about whether the Majorana zero modes are truly topological.</p>

<h2>Quantum Advantage: An Honest Assessment</h2>

<p>Let's be direct about where things stand:</p>

<p><strong>Demonstrated narrow quantum advantage:</strong></p>
<ul>
<li>Google's random circuit sampling (Willow): 5 minutes vs. 10<sup>25</sup> years classical. But RCS has no known practical use.</li>
<li>Google's "quantum echoes" (October 2025): 13,000x speedup over Frontier supercomputer for molecular structure. Closer to useful, but a carefully chosen problem.</li>
<li>Q-CTRL: First commercial quantum advantage in GPS-denied navigation using quantum sensors (50-100x outperformance). Note: quantum <em>sensing</em>, not computing.</li>
</ul>

<p><strong>The spoofing problem:</strong> RCS-based advantage claims remain contested. Tensor network methods can spoof the Linear Cross-Entropy Benchmark in milliseconds after learning the final circuit layer. This doesn't invalidate finite-size demonstrations but limits the paradigm for proving advantage.</p>

<p><strong>The honest verdict:</strong> Useful quantum advantage — solving a problem someone actually cares about, faster or better than any classical method — has <strong>not</strong> been convincingly demonstrated for quantum computing as of early 2026. IBM predicts this will change by end of 2026. The transition will be gradual, not a single breakthrough moment.</p>

<h2>Where Quantum Inspire Fits</h2>

<p>Our project at TU Delft has a unique position in this landscape. <strong>Quantum Inspire 2.0</strong>, launched February 2025, offers:</p>

<ul>
<li><strong>Three active superconducting backends</strong>: Starmon-7 (7 qubits, 8 fixed-frequency couplers), Tuna-5 (5 qubits, starfish layout with 4 flux-tunable couplers), and Tuna-9 (9 qubits, diamond layout with 12 flux-tunable couplers)</li>
<li><strong>Spin-2+ (currently offline)</strong>: 2 data qubits + 1 ancilla electron spin qubits in silicon — was the only semiconductor spin qubit processor publicly accessible online. Offline for development of next-gen spin processors.</li>
<li><strong>Emulators</strong>: QX-Emulator (up to 26 qubits) and a Rydberg neutral atom emulator (TU Eindhoven)</li>
<li><strong>Open architecture</strong>: Modular and interoperable — unlike IBM/Google's closed ecosystems</li>
<li><strong>Hybrid computing</strong>: Integration with SURF supercomputer node for quantum-classical workflows</li>
<li><strong>Multiple framework support</strong>: Qiskit and PennyLane integration</li>
</ul>

<p>The Delft quantum ecosystem (HQ/2 collaboration) launched a full open-architecture quantum computer in May 2025 — the Tuna-5 system integrating hardware and software from QuTech, TNO, Qblox, Orange Quantum Systems, and QuantWare.</p>

<p>QuTech's long bet on spin qubits is strategic: while superconducting and trapped-ion platforms dominate today's headlines, CMOS-compatible spin qubits may ultimately win the scaling race to millions of qubits. The ability to run experiments across both superconducting and spin qubit backends on a single platform makes Quantum Inspire uniquely valuable for comparative studies — exactly the kind of work AI agents can automate.</p>

<h2>What We're Watching</h2>

<ol>
<li><strong>IBM Kookaburra (2026)</strong>: First qLDPC-based QEC module. If qLDPC codes work in practice, the surface code's ~1000:1 physical-to-logical ratio drops dramatically.</li>
<li><strong>QuEra's 10,000-qubit machine</strong>: Neutral atoms continue to scale fastest. Their Algorithmic Fault Tolerance approach could make deep circuits practical sooner than expected.</li>
<li><strong>Microsoft's topological bet</strong>: If Majorana 1 scales, topological qubits could leapfrog all other platforms on error rates. Big if.</li>
<li><strong>China's QEC efforts</strong>: A distance-7 surface code using microwaves, with error-suppression factor of 1.4 — comparable to Google's early demonstrations.</li>
<li><strong>The decoder race</strong>: AlphaQubit, NVIDIA's GPU decoders, and RIKEN's AI-enhanced decoders are competing to solve real-time QEC decoding at scale. This is where AI has its most direct impact on quantum hardware.</li>
</ol>
`,
    sources: [
      { label: 'Google Willow — below surface code threshold (Nature)', url: 'https://www.nature.com/articles/s41586-024-08449-y' },
      { label: 'IBM path to fault-tolerant quantum computing', url: 'https://www.ibm.com/quantum/blog/large-scale-ftqc' },
      { label: 'Microsoft Majorana 1 announcement', url: 'https://azure.microsoft.com/en-us/blog/quantum/2025/02/19/microsoft-unveils-majorana-1-the-worlds-first-quantum-processor-powered-by-topological-qubits/' },
      { label: 'Quantinuum H-Series 56 qubits', url: 'https://www.quantinuum.com/blog/quantinuums-h-series-hits-56-physical-qubits-that-are-all-to-all-connected-and-departs-the-era-of-classical-simulation' },
      { label: 'QuEra 2025 milestones', url: 'https://www.prnewswire.com/news-releases/quera-computing-marks-record-2025-as-the-year-of-fault-tolerance-and-over-230m-of-new-capital-to-accelerate-industrial-deployment-302635960.html' },
      { label: 'Neutral atom quantum computing (IEEE Spectrum)', url: 'https://spectrum.ieee.org/neutral-atom-quantum-computing' },
      { label: 'Silicon spin-qubit >99% fidelity (Nature)', url: 'https://www.nature.com/articles/s41586-025-09531-9' },
      { label: 'Quantum Inspire 2.0 launch', url: 'https://qutech.nl/2025/02/25/quantum-inspire-2-0-is-live-with-updated-software-and-hardware/' },
      { label: 'QuTech 10-spin qubit array in germanium', url: 'https://qutech.nl/2025/11/27/from-complexity-to-control-a-10-spin-qubit-array-in-germanium/' },
      { label: 'Optimal magic state distillation scaling', url: 'https://phys.org/news/2025-11-optimal-scaling-magic-state-distillation.html' },
      { label: 'Q-CTRL commercial quantum advantage', url: 'https://q-ctrl.com/blog/2025-year-in-review-realizing-true-commercial-quantum-advantage-in-the-international-year-of-quantum' },
    ],
  },
  {
    slug: 'race-to-automate-science',
    title: 'The Race to Automate Science — and Why It Should Worry Us',
    subtitle: 'GPT-5 runs 36,000 experiments, AI scientists publish papers, and a Nature study finds the field is shrinking',
    date: '2026-02-10',
    author: 'AI x Quantum Research Team',
    category: 'opinion',
    tags: ['automating science', 'self-driving labs', 'Andrew White', 'Nature', 'OpenAI Prism', 'Ginkgo'],
    heroImage: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1200&q=80',
    heroCaption: 'The automation of scientific discovery is accelerating — but at what cost to scientific diversity?',
    excerpt: 'GPT-5 just ran 36,000 protein experiments autonomously. OpenAI launched a free science workspace. And a Nature study found that AI is making scientists more productive while shrinking the scope of science itself. Here\'s what it means.',
    content: `
<p>In a single week in early 2026, three things happened that capture the state of automated science: OpenAI launched <strong>Prism</strong>, a free AI workspace for scientists. Ginkgo Bioworks announced that <strong>GPT-5 autonomously ran 36,000 experiments</strong> in their cloud lab. And a study in <em>Nature</em> found that AI tools are <strong>shrinking the scope of science</strong> even as they make individual scientists more productive.</p>

<p>These three developments — the tools, the results, and the warning — define the moment we're in.</p>

<h2>The Experiments: GPT-5 in the Lab</h2>

<p>On February 5, 2026, <a href="https://openai.com/index/gpt-5-lowers-protein-synthesis-cost/">Ginkgo Bioworks and OpenAI announced</a> the results of a fully autonomous laboratory experiment. GPT-5 designed experiments for cell-free protein synthesis, a Pydantic-based validation system checked scientific soundness, and Ginkgo's robotic lab in Boston executed them.</p>

<p>The numbers:</p>
<table>
<thead><tr><th>Metric</th><th>Result</th></tr></thead>
<tbody>
<tr><td>Experimental conditions tested</td><td><strong>36,000</strong> across 6 iterative cycles</td></tr>
<tr><td>Cost per gram of protein</td><td><strong>$422/gram</strong> (40% reduction over state-of-the-art)</td></tr>
<tr><td>Reagent cost reduction</td><td><strong>57%</strong> ($60 to $26 per gram)</td></tr>
</tbody>
</table>

<p>This is a closed-loop system: AI designs the experiment, robots execute it, results flow back to the AI, which designs the next round. No human in the loop for the experimental design. Ginkgo is already selling the optimized reaction mix through their reagents store.</p>

<p>For quantum computing, this is a preview. Quantum experiments are even more amenable to automation — the entire workflow is digital. Our own <a href="/blog/autonomous-research-agents">agent infrastructure</a> is a rudimentary version of what Ginkgo built, but for quantum circuits instead of protein synthesis.</p>

<h2>The Tools: OpenAI Prism and the Platform War</h2>

<p><strong>OpenAI Prism</strong>, launched January 27, 2026, is a free, AI-native, LaTeX-native workspace for scientists. It's powered by GPT-5.2 and can:</p>
<ul>
<li>Draft and revise scientific text</li>
<li>Reason through equations</li>
<li>Suggest related papers from arXiv</li>
<li>Convert photos of handwritten formulas into LaTeX</li>
<li>Support unlimited projects and collaborators</li>
</ul>

<p>MIT Technology Review described it as letting scientists "vibe code science." It's free to anyone with a ChatGPT account — a clear move to make OpenAI the default platform for scientific writing.</p>

<p>They're not alone. <strong>Anthropic</strong> launched Claude for Life Sciences in October 2025 with integrations for Benchling, PubMed, and 10x Genomics. In January 2026, they expanded into healthcare with HIPAA-ready products. Anthropic also committed Claude and dedicated engineering teams to all 17 DOE national labs as part of the <strong>Genesis Mission</strong>.</p>

<p>The platform competition matters because whoever becomes the default AI for scientists shapes what questions get asked — and how.</p>

<h2>The Warning: AI Expands Impact, Contracts Focus</h2>

<p>This brings us to the most important paper of the year. In January 2026, <em>Nature</em> published "<a href="https://www.nature.com/articles/s41586-025-09922-y">Artificial intelligence tools expand scientists' impact but contract science's focus</a>" (Hao, Xu, Li & Evans). The findings, based on <strong>41.3 million research papers</strong>:</p>

<table>
<thead><tr><th>Metric</th><th>Effect of AI Tool Adoption</th></tr></thead>
<tbody>
<tr><td>Papers published</td><td><strong>3.02x</strong> more than non-AI peers</td></tr>
<tr><td>Citations received</td><td><strong>4.84x</strong> more</td></tr>
<tr><td>Time to become project leader</td><td><strong>1.37 years</strong> earlier</td></tr>
<tr><td>Volume of scientific topics studied</td><td><strong>Shrinks by 4.63%</strong></td></tr>
<tr><td>Engagement between scientists</td><td><strong>Decreases by 22%</strong></td></tr>
</tbody>
</table>

<p>The mechanism is straightforward: scientists using AI migrate toward areas with abundant data where AI tools demonstrate measurable advances on legible benchmarks. AI automates established fields rather than supporting exploration of new ones. The result is a less interconnected scientific literature — more papers, but about fewer things.</p>

<p>This is the Jevons Paradox applied to science: making research more efficient doesn't expand the frontier proportionally. It concentrates effort where efficiency gains are largest.</p>

<h2>Andrew White and the "Scientific Taste" Problem</h2>

<p>Andrew White — computational chemist at the University of Washington who created ChemCrow (the first chemistry LLM agent, which triggered a <em>White House briefing</em> on AI biosecurity), co-founder of <strong>Future House</strong> and <strong>Edison Scientific</strong> — addressed this problem directly on the <a href="https://www.latent.space/p/automating-science-world-models-scientific">Latent Space podcast</a>.</p>

<p>His autonomous research system <strong>Kosmos</strong> runs up to 12 hours per session, performing ~200 agent rollouts, executing ~42,000 lines of code, and reading ~1,500 papers per run. Independent scientists found 79.4% of statements in Kosmos reports to be accurate. Collaborators reported a single 20-cycle run performed the equivalent of 6 months of their own research.</p>

<p>But White identified the core problem: <strong>"scientific taste"</strong> — the ability to judge which questions are worth asking — is the real frontier. Traditional RLHF on hypothesis quality failed because human evaluators judge based on "tone, actionability, and specific facts" rather than theoretical importance. His solution: end-to-end feedback loops where actual research outcomes (downloads, citations, experimental validations) signal discovery quality.</p>

<p>He also warned about reward hacking: a trained molecule generation model generated compounds exploiting chemical loopholes (six-nitrogen structures, acid-base chemistry exploits) that scored well on benchmarks but were scientifically meaningless.</p>

<h2>The Self-Driving Lab Landscape</h2>

<p>The Ginkgo result is part of a broader movement:</p>

<ul>
<li><strong>Google DeepMind</strong> is opening a fully automated materials science lab in the UK in 2026 — integrated with Gemini from the ground up, synthesizing and characterizing hundreds of materials per day.</li>
<li><strong>Carnegie Mellon</strong> built a $40M cloud lab with Emerald Cloud Lab (200+ automated instruments). Their <strong>Coscientist</strong> system autonomously designs and executes chemistry experiments using GPT-4.</li>
<li><strong>US legislation</strong>: In December 2025, Senators Fetterman and Budd announced legislation to create the first national system of programmable cloud laboratories.</li>
<li>For quantum computing: the <strong>k-agents</strong> framework and <strong>Q-CTRL's autonomous calibration</strong> are making quantum processors self-driving — AI agents that calibrate gates and characterize devices without human intervention.</li>
</ul>

<h2>The DOE Genesis Mission</h2>

<p>The scale of government commitment is unprecedented. The <strong>Genesis Mission</strong>, launched by Executive Order in November 2025, aims to "double the productivity and impact of American science within a decade." The American Science and Security Platform will connect all 17 DOE national laboratories with AI systems, creating what officials describe as "the world's most complex and powerful scientific instrument ever built."</p>

<p>24 partner organizations signed agreements in December 2025:</p>
<ul>
<li><strong>Google DeepMind</strong>: AI co-scientist deployed across all 17 labs</li>
<li><strong>Anthropic</strong>: Claude + dedicated team building AI agents and MCP servers for lab workflows</li>
<li><strong>NVIDIA</strong>: Open AI science models, autonomous labs, quantum computing research</li>
<li><strong>OpenAI, Microsoft, IBM, AWS, Intel, Oracle, Palantir, xAI</strong>, and others</li>
</ul>

<h2>What This Means for Us</h2>

<p>Our project at TU Delft operates at a much smaller scale than Ginkgo or DeepMind. But the principles are the same:</p>

<ol>
<li><strong>The automation works.</strong> AI agents can design experiments, execute them, and learn from results. Our benchmark runner and replication agent prove this for quantum computing tasks.</li>
<li><strong>The narrowing effect is real.</strong> If we only benchmark what's easy to benchmark, we'll miss the most important questions. Our choice to replicate diverse papers (not just optimize one metric) is deliberate.</li>
<li><strong>Scientific taste can't be automated yet.</strong> The human role is shifting from "do the experiment" to "choose which experiments matter." That's a harder problem — and a more important one.</li>
<li><strong>Quantum computing may be different.</strong> The Nature study found narrowing in fields with abundant data. Quantum computing has <em>limited</em> data and <em>many</em> open questions. AI agents in quantum might explore more broadly precisely because the field is young.</li>
</ol>

<p>The race to automate science is accelerating. The question isn't whether to participate — it's whether we can do it in a way that expands rather than contracts the frontier of knowledge.</p>
`,
    sources: [
      { label: 'Ginkgo + OpenAI autonomous lab results', url: 'https://openai.com/index/gpt-5-lowers-protein-synthesis-cost/' },
      { label: 'OpenAI Prism announcement', url: 'https://openai.com/index/introducing-prism/' },
      { label: 'AI expands impact, contracts focus (Nature)', url: 'https://www.nature.com/articles/s41586-025-09922-y' },
      { label: 'Andrew White on Latent Space podcast', url: 'https://www.latent.space/p/automating-science-world-models-scientific' },
      { label: 'Edison Scientific / Kosmos', url: 'https://edisonscientific.com/articles/announcing-kosmos' },
      { label: 'Anthropic Claude for Life Sciences', url: 'https://www.anthropic.com/news/claude-for-life-sciences' },
      { label: 'DOE Genesis Mission — 24 partners', url: 'https://www.energy.gov/articles/energy-department-announces-collaboration-agreements-24-organizations-advance-genesis' },
      { label: 'DeepMind automated UK lab', url: 'https://deepmind.google/blog/strengthening-our-partnership-with-the-uk-government-to-support-prosperity-and-security-in-the-ai-era/' },
      { label: 'CMU Coscientist (Nature)', url: 'https://www.cmu.edu/news/stories/archives/2023/december/cmu-designed-artificially-intelligent-coscientist-automates-scientific-discovery' },
      { label: 'k-agents for quantum labs', url: 'https://arxiv.org/abs/2412.07978' },
    ],
  },
  {
    slug: 'quantum-mcp-servers',
    title: 'Giving Claude Direct Access to Quantum Hardware',
    subtitle: 'We built MCP servers that let Claude Code generate random numbers from vacuum fluctuations and submit circuits to real quantum processors',
    date: '2026-02-10',
    author: 'AI x Quantum Research Team',
    category: 'technical',
    tags: ['MCP', 'Claude Code', 'Quantum Inspire', 'QRNG', 'tooling', 'infrastructure'],
    heroImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200&q=80',
    heroCaption: 'Bridging AI and quantum hardware through the Model Context Protocol.',
    excerpt: 'We built two MCP servers that give Claude Code direct access to quantum resources: true random numbers from vacuum fluctuations (ANU QRNG) and circuit execution on Quantum Inspire hardware. Here\'s how they work and why this matters for AI-accelerated quantum research.',
    content: `
<p>One of the most powerful ideas in the AI-for-science movement is <strong>closing the feedback loop</strong> — giving AI agents direct access to experimental tools so they can design, execute, and analyze experiments without human intermediation. We just took a concrete step toward this for quantum computing.</p>

<p>We built two <strong>MCP servers</strong> (Model Context Protocol) that give Claude Code — the AI coding agent — direct access to quantum resources:</p>

<ol>
<li><strong>QRNG MCP Server</strong> — True quantum random numbers from the ANU Quantum Random Number Generator</li>
<li><strong>QI Circuit MCP Server</strong> — Submit cQASM 3.0 circuits to Quantum Inspire hardware and emulators</li>
</ol>

<p>Together with Claude Code itself acting as a quantum research assistant, this creates a pipeline where an AI agent can design a quantum experiment, execute it on real hardware, and analyze the results — all within a single conversation.</p>

<h2>What is MCP?</h2>

<p>The <strong>Model Context Protocol</strong> (MCP) is an open standard from Anthropic that lets AI assistants use external tools. Think of it as a USB port for AI — a standardized way to plug in capabilities. An MCP server exposes "tools" (functions with typed inputs and outputs) that the AI can call during a conversation.</p>

<p>For quantum computing, this means we can give Claude the ability to:</p>
<ul>
<li>List available quantum backends and their qubit counts</li>
<li>Submit circuits to real quantum processors</li>
<li>Check job status and retrieve measurement results</li>
<li>Run circuits locally on an emulator for rapid iteration</li>
<li>Generate true quantum random numbers</li>
</ul>

<p>The AI doesn't just <em>write code that calls these APIs</em> — it <em>calls them directly as tools</em>, getting structured results back in real time.</p>

<h2>Server 1: Quantum Random Numbers (with Tuna-9 Fallback)</h2>

<p>Our QRNG MCP server provides true quantum random numbers with <strong>automatic fallback across three quantum sources</strong>:</p>

<ol>
<li><strong>ANU QRNG</strong> (primary) — Measures vacuum fluctuations of the electromagnetic field at the Australian National University. Optical quantum source, ~200ms latency.</li>
<li><strong>QI Tuna-9</strong> (fallback) — Applies Hadamard gates to electron spin qubits on real quantum hardware at TU Delft, then measures. Each measurement collapses a superposition into a truly random bit. ~3 second latency.</li>
<li><strong>qxelarator</strong> (last resort) — Local quantum circuit emulator. Instant but pseudorandom.</li>
</ol>

<p>When the ANU API is unavailable (which happens — we observed intermittent 500 errors during testing), the server automatically submits an 8-qubit Hadamard circuit to Tuna-9. Each shot produces one random byte from real spin qubit measurements in a Dutch lab. This is a textbook quantum random number generator, just running on actual hardware instead of a classroom whiteboard.</p>

<p>The server exposes five tools:</p>

<table>
<thead><tr><th>Tool</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>quantum_random_int</code></td><td>Get quantum random integers (uint8 or uint16)</td></tr>
<tr><td><code>quantum_coin_flip</code></td><td>Flip quantum coins (each derived from true quantum measurement)</td></tr>
<tr><td><code>quantum_random_hex</code></td><td>Generate quantum random hex strings (for tokens, UUIDs)</td></tr>
<tr><td><code>quantum_dice_roll</code></td><td>Roll quantum dice with any number of sides</td></tr>
<tr><td><code>quantum_random_float</code></td><td>Get quantum random floats between 0 and 1</td></tr>
</tbody>
</table>

<p>Every response includes a <code>source</code> field so you always know which quantum system generated your random numbers. In our testing, we compared all three sources on identical requests — the distributions are uniform across the board, but the Tuna-9 numbers come from actual electron spin measurements rather than photon detection.</p>

<h3>Why two quantum sources?</h3>

<p>The ANU QRNG and Tuna-9 use fundamentally different quantum phenomena: <strong>optical vacuum fluctuations</strong> vs. <strong>spin qubit superposition</strong>. Having both available means the QRNG server is resilient to outages on either platform, and researchers can compare randomness from different physical sources — which matters for foundations-of-physics experiments.</p>

<h2>Server 2: Quantum Inspire Circuit Execution</h2>

<p>The second server is more ambitious. It connects to <strong>Quantum Inspire</strong> — the quantum computing platform operated by QuTech at TU Delft — and exposes five tools for circuit execution:</p>

<table>
<thead><tr><th>Tool</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>qi_list_backends</code></td><td>List available QI backends with qubit counts and status</td></tr>
<tr><td><code>qi_submit_circuit</code></td><td>Submit a cQASM 3.0 circuit to remote hardware (returns job_id)</td></tr>
<tr><td><code>qi_check_job</code></td><td>Check job status (PLANNED / RUNNING / COMPLETED / FAILED)</td></tr>
<tr><td><code>qi_get_results</code></td><td>Get measurement results for a completed job</td></tr>
<tr><td><code>qi_run_local</code></td><td>Run a circuit on the local qxelarator emulator (instant, no queue)</td></tr>
</tbody>
</table>

<p>This is a Python server (the QI SDK is Python-only) built with the MCP Python SDK's <code>FastMCP</code> framework. It reuses the existing Quantum Inspire authentication from <code>qi login</code>.</p>

<h3>The workflow</h3>

<p>A typical interaction looks like this:</p>

<ol>
<li><strong>Design</strong>: Claude writes a cQASM 3.0 circuit based on the research question</li>
<li><strong>Test locally</strong>: <code>qi_run_local</code> runs it instantly on the emulator — Claude checks the results make sense</li>
<li><strong>Submit to hardware</strong>: <code>qi_submit_circuit</code> sends it to a real quantum processor (e.g., Tuna-9 with 9 superconducting qubits)</li>
<li><strong>Monitor</strong>: <code>qi_check_job</code> polls for completion</li>
<li><strong>Analyze</strong>: <code>qi_get_results</code> retrieves the measurement histogram, Claude analyzes noise, fidelity, and whether the results match theory</li>
</ol>

<p>The key design decision: <strong>remote jobs are asynchronous</strong>. <code>qi_submit_circuit</code> returns a job ID immediately rather than blocking. Quantum hardware has queues — jobs can take seconds to hours. The async pattern lets Claude continue working while waiting, or batch multiple circuits and check them later.</p>

<p>Local emulation via <code>qi_run_local</code> is synchronous — results come back instantly. This enables a fast inner loop: iterate on circuit design locally, then submit the final version to hardware.</p>

<h3>Example: Bell state on the emulator</h3>

<p>Here's what Claude sees when it runs a Bell state circuit locally:</p>

<pre><code>// Claude calls qi_run_local with:
circuit = """version 3.0
qubit[2] q
bit[2] b
H q[0]
CNOT q[0], q[1]
b = measure q"""

// Response:
{
  "results": {"00": 0.5, "11": 0.5},
  "shots_requested": 1024,
  "shots_done": 1024,
  "backend": "qxelarator (local emulator)"
}</code></pre>

<p>Perfect Bell state — equal superposition of |00&#10217; and |11&#10217;, no |01&#10217; or |10&#10217;. On real hardware, you'd see noise: small counts in the "wrong" bitstrings, reflecting gate errors and decoherence.</p>

<h2>Claude Code as a Quantum Research Skill</h2>

<p>The MCP servers are tools. But the real power comes from <strong>Claude Code itself acting as a quantum research agent</strong>. In a single conversation, Claude can:</p>

<ul>
<li><strong>Read papers</strong> and extract circuit designs, Hamiltonians, and experimental parameters</li>
<li><strong>Write circuits</strong> in cQASM 3.0 (or Qiskit/PennyLane for simulation)</li>
<li><strong>Test circuits</strong> on the local emulator via MCP</li>
<li><strong>Submit to hardware</strong> via MCP and analyze real measurement results</li>
<li><strong>Compare theory vs. experiment</strong> — calculate expected vs. observed fidelities</li>
<li><strong>Write up results</strong> with proper analysis and visualization</li>
</ul>

<p>We've already demonstrated this capability: Claude <a href="/blog/ai-replicates-qutech-paper">replicated a QuTech VQE paper</a> from a reference alone, writing 300 lines of simulation code. With the MCP servers, the next step is executing those circuits on actual quantum hardware — closing the loop from paper to hardware result.</p>

<h2>How This Connects to the AI x Quantum Thesis</h2>

<p>Our <a href="/blog/autonomous-research-agents">agent architecture</a> is designed around a core insight: quantum computing experiments are <em>inherently digital</em>. Unlike chemistry or biology, there's no wet lab — you design a circuit, submit it through an API, and get measurement data back. This makes quantum computing uniquely suited to AI-driven research.</p>

<p>The MCP servers are the bridge between AI capability and quantum hardware access. They transform Claude from a code-writing assistant into a <strong>quantum experimentalist</strong> — one that can run experiments 24/7, systematically explore parameter spaces, and never forget a result.</p>

<p>The feedback loop looks like this:</p>

<ol>
<li><strong>Literature intelligence</strong> identifies an interesting experiment</li>
<li><strong>AI agent</strong> designs the circuit and parameters</li>
<li><strong>MCP tools</strong> execute on quantum hardware</li>
<li><strong>AI agent</strong> analyzes results and decides what to try next</li>
<li>Repeat</li>
</ol>

<p>This is the same pattern as <a href="/blog/methods-of-ai-science">self-driving laboratories</a> in chemistry and biology — but quantum computing can move faster because the entire workflow is software.</p>

<h2>Technical Details</h2>

<h3>Architecture</h3>

<p>Both servers use the <strong>stdio transport</strong> — they communicate with Claude Code via JSON-RPC over stdin/stdout. This means they run as local processes, no network server needed. Configuration lives in <code>.mcp.json</code> at the project root:</p>

<pre><code>{
  "mcpServers": {
    "qrng": {
      "command": "node",
      "args": ["mcp-servers/qrng/index.js"]
    },
    "qi-circuits": {
      "command": "python",
      "args": ["mcp-servers/qi-circuits/qi_server.py"]
    }
  }
}</code></pre>

<h3>Authentication</h3>

<p>The QI server reuses the OAuth token from <code>qi login</code> (stored in <code>~/.quantuminspire/config.json</code>). No additional setup required — if you can use the QI CLI, the MCP server works automatically.</p>

<h3>Error handling</h3>

<p>All tools return structured JSON with error details on failure. The server uses lazy initialization — backends are only created when first needed, so startup is fast even if QI authentication is unavailable.</p>

<h2>What's Next</h2>

<p>These MCP servers are v1. The roadmap includes:</p>

<ol>
<li><strong>IBM Quantum MCP Server</strong> — Same pattern for IBM's quantum hardware (ibm_torino, ibm_fez, ibm_marrakesh). We already have IBM credentials configured.</li>
<li><strong>Autonomous experiment loops</strong> — Claude designs, submits, analyzes, and iterates without human prompting. VQE parameter optimization is the first target.</li>
<li><strong>Circuit optimization tool</strong> — An MCP tool that transpiles circuits for specific hardware topologies before submission.</li>
<li><strong>Multi-backend comparison</strong> — Run the same logical circuit on QI and IBM hardware, compare noise profiles automatically.</li>
</ol>

<p>The goal: a quantum research agent that can operate at the speed of the hardware itself, running experiments around the clock while maintaining rigorous experimental methodology.</p>

<p>All code is open source: <a href="https://github.com/JDerekLomas/quantuminspire/tree/main/mcp-servers">github.com/JDerekLomas/quantuminspire/tree/main/mcp-servers</a></p>
`,
    sources: [
      { label: 'Model Context Protocol (MCP)', url: 'https://modelcontextprotocol.io/' },
      { label: 'ANU Quantum Random Numbers', url: 'https://qrng.anu.edu.au/' },
      { label: 'Quantum Inspire platform', url: 'https://www.quantum-inspire.com/' },
      { label: 'MCP Python SDK', url: 'https://github.com/modelcontextprotocol/python-sdk' },
      { label: 'Our MCP server code (GitHub)', url: 'https://github.com/JDerekLomas/quantuminspire/tree/main/mcp-servers' },
      { label: 'Claude Code', url: 'https://docs.anthropic.com/en/docs/claude-code' },
    ],
  },
]
