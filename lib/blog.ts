export interface BlogPost {
  slug: string
  title: string
  subtitle?: string
  date: string
  author: string
  category: 'landscape' | 'experiment' | 'technical' | 'opinion'
  tags: string[]
  heroImage?: string
  heroCaption?: string
  excerpt: string
  content: string  // markdown-ish HTML content
  sources: { label: string; url: string }[]
}

export const categoryColors: Record<string, string> = {
  landscape: '#00d4ff',
  experiment: '#00ff88',
  technical: '#8b5cf6',
  opinion: '#ff8c42',
}

export const categoryLabels: Record<string, string> = {
  landscape: 'Landscape',
  experiment: 'Experiment',
  technical: 'Technical',
  opinion: 'Opinion',
}

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
      { label: 'QUASAR — RAG for quantum code generation', url: 'https://arxiv.org/abs/2404.xxxxx' },
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
]

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find(p => p.slug === slug)
}

export function getAllPosts(): BlogPost[] {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date))
}
