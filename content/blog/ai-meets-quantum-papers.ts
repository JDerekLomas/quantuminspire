import { BlogPost } from '@/lib/blogTypes'

export const post: BlogPost = {
  slug: 'ai-meets-quantum',
  title: 'AI Meets Quantum Computing: The Papers That Matter',
  subtitle: 'Neural decoders, autonomous quantum agents, and AI circuit optimizers \u2014 a researcher\'s guide to the intersection',
  date: '2026-02-10',
  author: 'AI x Quantum Research Team',
  category: 'landscape',
  tags: ['AlphaQubit', 'QUASAR', 'QEC', 'AI agents', 'circuit optimization', 'hardware', 'quantum advantage'],
  heroImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&q=80',
  heroCaption: 'AI and quantum computing are converging \u2014 and the research papers tell the story.',
  excerpt: 'Neural decoders, autonomous quantum agents, and AI circuit optimizers: a researcher\'s guide to the most important papers and results at the intersection of AI and quantum computing.',
  content: `
<p>AI and quantum computing are converging faster than either field expected. Neural networks decode quantum errors better than hand-crafted algorithms. LLMs write valid quantum circuits. Autonomous agents calibrate superconducting processors without human intervention. This post covers the papers and results that matter most at the intersection \u2014 a researcher's guide, not a hype piece.</p>

<h2>Neural Quantum Error Correction</h2>

<p>Error correction is quantum computing's biggest engineering bottleneck. Decoders must run in real time \u2014 faster than errors accumulate \u2014 and handle the messy, correlated noise of real hardware. AI offers a fundamentally different approach: learn the noise rather than model it.</p>

<h3>AlphaQubit (Google DeepMind, 2024)</h3>

<p><a href="https://www.nature.com/articles/s41586-024-08148-8">Published in Nature</a>, AlphaQubit is a transformer-based surface code decoder that learns correlated error patterns directly from syndrome data. Rather than assuming an error model, it learns the actual noise characteristics of a specific processor.</p>

<ul>
<li><strong>6% fewer errors</strong> than tensor network decoders (accurate but impractically slow)</li>
<li><strong>30% fewer errors</strong> than correlated matching (the practical state-of-the-art)</li>
<li>Tested on real Sycamore data at distance-3 (17 qubits) and distance-5 (49 qubits)</li>
<li>O(d<sup>4</sup>) scaling \u2014 a <a href="https://arxiv.org/abs/2510.22724">Mamba-based follow-up</a> achieves O(d<sup>2</sup>) while matching accuracy</li>
</ul>

<p>The open question: whether this scales to the code distances (17+) needed for fault-tolerant computing.</p>

<h3>GPU-Accelerated Decoding (NVIDIA + QuEra)</h3>

<p>NVIDIA's <a href="https://developer.nvidia.com/blog/real-time-decoding-algorithmic-gpu-decoders-and-ai-inference-enhancements-in-nvidia-cuda-q-qec/">CUDA-Q QEC framework</a> achieves <strong>&lt;4 microsecond roundtrip latency</strong> for error correction decoding \u2014 roughly 1,000x faster than alternatives. Crucially, the GPU approach can be updated as neural decoder architectures improve.</p>

<h3>IBM AI Transpiler</h3>

<p>IBM's <a href="https://www.ibm.com/quantum/blog/ai-transpiler-passes">AI-powered transpiler passes</a> achieve a <strong>42% reduction in two-qubit gate counts</strong>. Since two-qubit gates are the dominant error source on real hardware, this directly improves fidelity.</p>

<h2>AI for Quantum Code Generation</h2>

<p>Can LLMs write quantum programs? Several systems have been tested, with results that are strong but need careful interpretation.</p>

<table>
<thead><tr><th>System</th><th>Metric</th><th>Result</th><th>Note</th></tr></thead>
<tbody>
<tr><td><a href="https://arxiv.org/abs/2510.00967">QUASAR</a></td><td>Circuit validity</td><td>99.31% Pass@1</td><td>4B params + agentic RL; validity is not correctness</td></tr>
<tr><td><a href="https://arxiv.org/abs/2510.26101">QCoder</a> (o3)</td><td>Functional accuracy</td><td>78%</td><td>vs. 40% for human contest code; chain-of-thought helps</td></tr>
<tr><td>Our benchmark (Claude Opus 4.6)</td><td>Functional correctness</td><td>63.6%</td><td><a href="/blog/llms-write-quantum-code">151 Qiskit tasks</a>; dominant failure: API staleness</td></tr>
<tr><td>Our benchmark (Gemini 3 Flash)</td><td>Functional correctness</td><td>62.25%</td><td>Within 1.4pp of Claude; same failure mode</td></tr>
</tbody>
</table>

<p>The gap between QUASAR's 99.31% validity and our 63.6% correctness is telling: generating syntactically valid circuits is easy; getting the quantum logic right is hard. <strong>Q-Fusion</strong> (IEEE ISVLSI 2025) takes yet another approach \u2014 graph diffusion models that produce 100% valid outputs \u2014 but faces the same correctness gap.</p>

<h2>Autonomous Quantum Agents</h2>

<h3>k-agents: Self-Driving Quantum Labs</h3>

<p><a href="https://arxiv.org/abs/2412.07978">k-agents</a> (published in <em>Patterns</em> / Cell Press, 2025) are LLM-based agents that autonomously calibrated and operated a superconducting quantum processor for hours, producing GHZ states at human-expert level. The key insight: quantum experiments are inherently digital \u2014 no wet lab, no sample prep, just API calls. An AI agent can iterate at the speed of the hardware itself.</p>

<h3>QCopilot: Autonomous Quantum Sensors</h3>

<p><a href="https://arxiv.org/abs/2508.05421">QCopilot</a> orchestrates multiple specialized agents (Decision Maker, Experimenter, Analyst, Diagnoser) with LLMs and a vector knowledge base. It generated <strong>10<sup>8</sup> sub-microkelvin atoms without human intervention</strong> \u2014 a ~100x speedup over manual experimentation for atom cooling.</p>

<h3>AlphaTensor-Quantum: RL for Circuit Optimization</h3>

<p><a href="https://arxiv.org/abs/2402.14396">AlphaTensor-Quantum</a> (<em>Nature Machine Intelligence</em>, 2025) uses deep RL to <strong>halve T-gate counts</strong> in some circuits. T-gates are the most expensive gates in fault-tolerant computing, so this directly reduces overhead for cryptography and quantum chemistry circuits.</p>

<h2>The Hardware Landscape</h2>

<table>
<thead><tr><th>Platform</th><th>Leading Players</th><th>Key Milestone</th><th>Challenge</th></tr></thead>
<tbody>
<tr><td><strong>Superconducting</strong></td><td>Google, IBM, Rigetti, IQM</td><td><a href="https://www.nature.com/articles/s41586-024-08449-y">Google Willow</a>: 105q, first exponential error suppression, logical memory 2.4x beyond breakeven</td><td>Short coherence (~68us), cryogenic cooling</td></tr>
<tr><td><strong>Trapped Ions</strong></td><td>Quantinuum, IonQ</td><td><a href="https://www.quantinuum.com/blog/introducing-helios-the-most-accurate-quantum-computer-in-the-world">Helios</a>: 98q, X-junction, 99.921% two-qubit fidelity</td><td>Slower gates, scaling past hundreds</td></tr>
<tr><td><strong>Neutral Atoms</strong></td><td>QuEra, Atom Computing</td><td><a href="https://www.prnewswire.com/news-releases/quera-computing-marks-record-2025-as-the-year-of-fault-tolerance-and-over-230m-of-new-capital-to-accelerate-industrial-deployment-302635960.html">3,000-qubit array</a>, 2+ hours operation, up to 96 logical qubits</td><td>Atom loss, readout fidelity</td></tr>
<tr><td><strong>Photonic</strong></td><td>PsiQuantum, Xanadu</td><td>PsiQuantum $1B raise; SHYPS qLDPC codes: 20x fewer physical qubits than surface codes</td><td>Photon loss, non-deterministic gates</td></tr>
<tr><td><strong>Spin Qubits</strong></td><td>QuTech/TU Delft, Intel</td><td><a href="https://qutech.nl/2025/11/27/from-complexity-to-control-a-10-spin-qubit-array-in-germanium/">10-qubit germanium</a> &gt;99% fidelity; <a href="https://www.nature.com/articles/s41586-025-09531-9">industrial 300mm wafers</a> &gt;99% (Nature 2025)</td><td>Short coherence, but CMOS compatibility is the long bet</td></tr>
<tr><td><strong>Topological</strong></td><td>Microsoft</td><td><a href="https://azure.microsoft.com/en-us/blog/quantum/2025/02/19/microsoft-unveils-majorana-1-the-worlds-first-quantum-processor-powered-by-topological-qubits/">Majorana 1</a>: 8 topological qubits, tetron architecture</td><td>No gate operations demonstrated; scientific community remains skeptical about whether these are truly topological</td></tr>
</tbody>
</table>

<p><a href="https://www.ibm.com/quantum/blog/large-scale-ftqc">IBM's roadmap</a>: Kookaburra 2026 (first qLDPC module), Starling 2029 (200 logical qubits, 100M gates).</p>

<h2>Quantum Advantage: An Honest Assessment</h2>

<p><strong>Demonstrated (narrow):</strong> Google's random circuit sampling \u2014 5 minutes vs. 10<sup>25</sup> years classical \u2014 but RCS has no practical application. Their "quantum echoes" result showed a 13,000x speedup for molecular structure over the Frontier supercomputer. Q-CTRL demonstrated commercial quantum <em>sensing</em> advantage (50-100x for GPS-denied navigation).</p>

<p><strong>The spoofing problem:</strong> Tensor network methods can approximate RCS benchmarks, limiting this paradigm for proving advantage.</p>

<p><strong>The honest verdict:</strong> Useful quantum advantage for computing \u2014 solving a problem someone actually cares about faster than any classical method \u2014 has not been convincingly demonstrated as of early 2026. IBM predicts end of 2026. The transition will be gradual.</p>

<h2>Where Quantum Inspire Fits</h2>

<p><a href="https://qutech.nl/2025/02/25/quantum-inspire-2-0-is-live-with-updated-software-and-hardware/">Quantum Inspire 2.0</a> offers Starmon-7, Tuna-5, and Tuna-9 superconducting backends plus emulators, with an open architecture integrated with the SURF supercomputer. Having both spin qubits and superconducting qubits on one platform makes QI uniquely valuable for comparative studies \u2014 exactly the kind of work AI agents can automate.</p>

<p>Our <a href="/blog/quantum-mcp-servers">MCP servers</a> connect Claude directly to QI hardware, enabling autonomous experiment execution. This is the same pattern as k-agents, but with frontier LLMs and real European quantum hardware.</p>

<h2>The Convergence</h2>

<p>A recent <em>Nature Communications</em> paper \u2014 "<a href="https://www.nature.com/articles/s41467-025-65836-3">Artificial intelligence for quantum computing</a>" \u2014 identifies three tiers of AI applications for quantum:</p>

<ol>
<li><strong>Currently feasible:</strong> code generation, circuit optimization, decoder design</li>
<li><strong>Emerging:</strong> automated experiment design, noise characterization</li>
<li><strong>Longer-term:</strong> quantum code discovery, software verification</li>
</ol>

<p>Our project at TU Delft sits in Tier 1, building toward Tier 2. The teams that combine AI capability with real quantum hardware access will define the field. The infrastructure is ready. The question is who builds on it first.</p>
`,
  sources: [
    { label: 'AlphaQubit (Nature, 2024)', url: 'https://www.nature.com/articles/s41586-024-08148-8' },
    { label: 'AI for quantum computing (Nature Communications)', url: 'https://www.nature.com/articles/s41467-025-65836-3' },
    { label: 'NVIDIA CUDA-Q QEC real-time decoding', url: 'https://developer.nvidia.com/blog/real-time-decoding-algorithmic-gpu-decoders-and-ai-inference-enhancements-in-nvidia-cuda-q-qec/' },
    { label: 'IBM AI transpiler passes', url: 'https://www.ibm.com/quantum/blog/ai-transpiler-passes' },
    { label: 'Google Willow (Nature, 2024)', url: 'https://www.nature.com/articles/s41586-024-08449-y' },
    { label: 'IBM fault-tolerant quantum computing roadmap', url: 'https://www.ibm.com/quantum/blog/large-scale-ftqc' },
    { label: 'Quantinuum Helios', url: 'https://www.quantinuum.com/blog/introducing-helios-the-most-accurate-quantum-computer-in-the-world' },
    { label: 'QuEra 2025 milestones', url: 'https://www.prnewswire.com/news-releases/quera-computing-marks-record-2025-as-the-year-of-fault-tolerance-and-over-230m-of-new-capital-to-accelerate-industrial-deployment-302635960.html' },
    { label: 'Microsoft Majorana 1', url: 'https://azure.microsoft.com/en-us/blog/quantum/2025/02/19/microsoft-unveils-majorana-1-the-worlds-first-quantum-processor-powered-by-topological-qubits/' },
    { label: 'Quantum Inspire 2.0', url: 'https://qutech.nl/2025/02/25/quantum-inspire-2-0-is-live-with-updated-software-and-hardware/' },
    { label: 'QuTech 10-spin qubit germanium array', url: 'https://qutech.nl/2025/11/27/from-complexity-to-control-a-10-spin-qubit-array-in-germanium/' },
    { label: 'Silicon spin qubits on industrial wafers (Nature)', url: 'https://www.nature.com/articles/s41586-025-09531-9' },
    { label: 'QUASAR (arxiv:2510.00967)', url: 'https://arxiv.org/abs/2510.00967' },
    { label: 'QCoder (arxiv:2510.26101)', url: 'https://arxiv.org/abs/2510.26101' },
    { label: 'k-agents (arxiv:2412.07978)', url: 'https://arxiv.org/abs/2412.07978' },
    { label: 'AlphaTensor-Quantum (arxiv:2402.14396)', url: 'https://arxiv.org/abs/2402.14396' },
    { label: 'QCopilot (arxiv:2508.05421)', url: 'https://arxiv.org/abs/2508.05421' },
    { label: 'AlphaEvolve (arxiv:2506.13131)', url: 'https://arxiv.org/abs/2506.13131' },
  ],
}
