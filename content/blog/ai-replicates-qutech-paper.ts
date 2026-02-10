import { BlogPost } from '@/lib/blogTypes'

export const post: BlogPost = {
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
<p><code>H = g\u2080II + g\u2081ZI + g\u2082IZ + g\u2083ZZ + g\u2084XX + g\u2085YY</code></p>
<p>The agent correctly identified that the coefficients (g\u2080 through g\u2085) are functions of the bond distance, and tabulated them from the O'Malley et al. reference data for 29 bond distances from 0.2 to 3.0 Angstroms.</p>

<h3>2. Ansatz Circuit</h3>
<p>A single-parameter exchange rotation in the {|01\u27E9, |10\u27E9} subspace — a parity-preserving ansatz that keeps the state within the correct symmetry sector. The agent decomposed this into RXX(\u03B8) and RYY(\u03B8) rotations, matching the paper's approach.</p>

<h3>3. Noise Model</h3>
<p>Realistic noise parameters matching the paper's device characterization:</p>
<ul>
<li>T\u2081 = 30\u03BCs, T\u2082 = 60\u03BCs (thermal relaxation)</li>
<li>Depolarizing noise on single-qubit gates (0.1%) and two-qubit gates (1%)</li>
<li>Measurement error (1%)</li>
</ul>

<h3>4. Symmetry Verification</h3>
<p>The key innovation of the paper: post-selecting measurement results on states where the qubit parity matches the ground-state sector (even parity for H\u2082). This filters out a significant fraction of errors without additional circuit overhead.</p>

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
}
