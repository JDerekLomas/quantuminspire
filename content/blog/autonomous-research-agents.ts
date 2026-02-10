import { BlogPost } from '@/lib/blogTypes'

export const post: BlogPost = {
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
}
