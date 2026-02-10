import { BlogPost } from '@/lib/blogTypes'

export const post: BlogPost = {
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
}
