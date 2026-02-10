import { BlogPost } from '@/lib/blogTypes'

export const post: BlogPost = {
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
}
