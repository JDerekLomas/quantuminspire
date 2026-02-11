import Link from 'next/link'
import Nav from '@/components/Nav'

export const metadata = {
  title: 'Methodology — How AI Does Quantum Science',
  description: 'The process behind 100+ quantum experiments: 445 Claude Code sessions, 349 prompts, and the 5-phase workflow that emerged.',
}

/* ────────────────────────── data ────────────────────────── */

const phases = [
  {
    number: 1,
    label: 'Exploration & setup',
    color: '#00d4ff',
    description: 'Open-ended questions that orient the agent to the domain and get infrastructure running.',
    prompts: [
      { text: 'how might i demonstrate the capacity of claude code on quantum computing? Is there an existing benchmark? Could I create one?', note: 'This prompt started the entire project. Led to discovering Qiskit HumanEval (151 tasks).' },
      { text: 'can you look for skills and dev setup for programming quantum computers including at tu delft quantum?', note: 'Prompted discovery of MCP servers, QI SDK, and the Python 3.12 requirement.' },
      { text: 'Is there a quantum random number generator based on a real quantum computer accessible via mcp?', note: 'Led to building the QRNG MCP server (ANU fallback chain).' },
      { text: 'get me on github and start organizing this project as an exploration of accelerating science with generative ai, in the field of quantum inspire at TU Delft.', note: 'Set the research framing that carried through the entire project.' },
      { text: 'Can you search for recent graduations at qtech at tu delft with leiven vandersplein and other quantum researchers? That will give us a sense for what research questions they value', note: 'Literature grounding — connected our work to active research directions.' },
    ],
  },
  {
    number: 2,
    label: 'Running experiments',
    color: '#00ff88',
    description: 'Directing experiments with a consistent pattern: start on emulator, validate, then move to hardware.',
    prompts: [
      { text: 'what would be most impressive to add? e.g., if we had experiments that were running continuously and queuing up to use the qi hardware and outputting real data? That would "show" the ai science.', note: 'Led to building the experiment daemon (auto-queue, auto-submit, auto-analyze).' },
      { text: 'I think there is probably a workflow where we first evaluate in simulation and then move to real hardware and validate...', note: 'Established the emulator-first validation pattern that caught most bugs.' },
      { text: "Queue them up and start gathering data. Be sure every experiment begins with a clear research question and purpose. After every experiment, reflect and adjust the queue to learn the most", note: 'Turned the agent from a tool-user into a scientist — adaptive experimentation.' },
      { text: "save that reflection in md. then, what do you think is the next experiment you'd like to run? Other hardware? Or something else?", note: "Asking the agent to propose next steps produced better experiment design than prescribing them." },
      { text: 'Should we replicate our replications so we can see how reliable they are? Do we save the code along with the data?', note: 'Led to the reproducibility infrastructure (SHA256 checksums, environment snapshots, variance analysis).' },
    ],
  },
  {
    number: 3,
    label: 'Critical review & debugging',
    color: '#ef4444',
    description: 'The most valuable prompts were skeptical ones. Every major discovery came from asking "is this actually right?"',
    prompts: [
      { text: "Act like a skeptical reviewer... can you poke holes in this? How do we know it's not AI hallucination? Trivial?", note: 'Found that the CNOT gate implementation in our math library was broken. Bell/GHZ states were all wrong.' },
      { text: 'can you act like a critical reviewer and look through the site and the experiments and results and try to poke holes and find inconsistencies, misconceptions, inaccuracies and other problems?', note: 'Caught energy unit inconsistencies, stale backend names, and analysis pipeline bugs.' },
      { text: "yeah, actually AI did it all. I'm just prompting here. but let's fix the energy bug? Really, you didn't find any LLM bs faked data or anything?", note: "Honest acknowledgment that the human is directing, not coding. Important for framing." },
      { text: 'wait, it was that easy? Are you sure that is real?', note: "Asked after QEC detection code 'worked' on first try. Turned out the codespace prep was missing — XXXX was giving random 50/50." },
      { text: "The interesting cases are the failures. Why did Peruzzo give 83.5 kcal/mol on IBM? That's more publishable than the successes.", note: 'Reframing failures as findings. Led to the coefficient amplification discovery (|g1|/|g4| ratio predicts error).' },
    ],
  },
  {
    number: 4,
    label: 'Meaning-making & communication',
    color: '#8b5cf6',
    description: 'Turning raw results into understanding. Visualization, sonification, narrative framing.',
    prompts: [
      { text: 'coherence... with what? and the microwave frequency, how is that tuned? Is it cold because that way it is in the lowest energy level? Are these energy levels like atoms?', note: 'Genuine curiosity prompts produced the best educational content. The How Qubits Work series came from questions, not directives.' },
      { text: 'I actually want to turn this into a resonance-based explanation of how quantum computers work. Like, we need animations of microwave pulses and the whole deal.', note: 'Led to the /how-it-works resonance explainer — the most distinctive page on the site.' },
      { text: 'lets make a set of smaller units that explore sonification in a different way. Can you brainstorm how we might sonify the data?', note: 'Led to quantum circuit sonification — hearing the difference between clean emulator and noisy hardware.' },
      { text: "Think about it from a QDNL perspective again. I think the AI accelerated science hits. The AI as interface to quantum computing hits...", note: 'Stepping back to check alignment with stakeholders. Kept the project grounded.' },
      { text: "it's like AI is the interface between humans and quantum...", note: 'The one-sentence thesis that emerged from all of this. Sometimes the best prompt is a half-formed thought.' },
    ],
  },
  {
    number: 5,
    label: 'Session management & debugging',
    color: '#f59e0b',
    description: "The prompts nobody shows in demos but everyone types in real sessions.",
    prompts: [
      { text: 'taking a really long time. i cant tell if you are working or not... how come? like i wish there was better status about what you are working on when it is taking so long', note: 'Led to adding run_in_background and better status feedback patterns to CLAUDE.md.' },
      { text: "why would it error and not let me know? it just hung up", note: 'Discovered pipe buffering issue. Fix: never pipe long-running commands. Now in our CLAUDE.md.' },
      { text: "its not about the content, its just -- 5 min for 1000 tokens? Something else is going on, maybe you can't see it. I need more visibility", note: 'When the agent is slow, the problem is usually infrastructure, not the LLM. Diagnose the pipeline.' },
      { text: 'you are stuck.', note: 'Sometimes the best prompt is two words. The agent had been looping on a failed approach for several turns.' },
      { text: "I was working on something in this window but I can't see it anymore", note: 'Context window management is real. Led to session handoffs and /compact discipline.' },
    ],
  },
]

/* ────────────────────────── page ────────────────────────── */

export default function MethodologyPage() {
  return (
    <main className="min-h-screen text-gray-200">
      <Nav section="methodology" />

      {/* Header */}
      <section className="border-b border-white/5 px-6 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-xs font-mono text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block">
            &larr; haiqu
          </Link>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Methodology
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mb-6">
            How one human and one AI agent produced 100+ quantum experiments,
            6 paper replications, and 20+ interactive tools — without writing
            a single line of code by hand.
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20">
              445 sessions
            </span>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20">
              349 substantive prompts
            </span>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20">
              ~48 hrs wall-clock
            </span>
          </div>
        </div>
      </section>

      {/* The approach */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4">The approach</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            This project uses <strong className="text-white">quantum vibe coding</strong> — describing
            experiments in natural language and letting an AI coding agent (Claude Code) handle the
            translation to Qiskit/cQASM, hardware submission via MCP servers, result retrieval, and
            statistical analysis.
          </p>
          <p className="text-gray-300 leading-relaxed mb-4">
            The human role is not to write code. It is to <strong className="text-white">direct
            attention</strong>, <strong className="text-white">ask skeptical questions</strong>,
            and <strong className="text-white">frame what matters</strong>. The AI handles implementation,
            but the human decides what to investigate, when to doubt results, and how to communicate findings.
          </p>
          <p className="text-gray-300 leading-relaxed">
            Below are the actual prompts from this project, organized by the 5 workflow phases that
            emerged naturally over 445 sessions. These are not curated examples — they are the real
            prompts that produced the research.
          </p>
        </div>
      </section>

      {/* Workflow diagram */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-6">
            The 5-phase workflow
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono mb-8">
            {phases.map((phase, i) => (
              <div key={phase.number} className="flex items-center gap-2">
                <a
                  href={`#phase-${phase.number}`}
                  className="px-3 py-1.5 rounded border transition-colors hover:bg-white/5"
                  style={{ borderColor: `${phase.color}30`, color: phase.color }}
                >
                  {phase.number}. {phase.label}
                </a>
                {i < phases.length - 1 && <span className="text-gray-600">&rarr;</span>}
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-sm">
            The phases are sequential in a project lifecycle but cyclical in practice — you return to
            skepticism (Phase 3) constantly, and meaning-making (Phase 4) feeds back into new experiments (Phase 2).
          </p>
        </div>
      </section>

      {/* Phases */}
      {phases.map((phase) => (
        <section key={phase.number} id={`phase-${phase.number}`} className="border-b border-white/5 px-6 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <span
                className="text-xs font-mono px-2.5 py-1 rounded-full border"
                style={{ borderColor: `${phase.color}30`, color: phase.color, background: `${phase.color}10` }}
              >
                Phase {phase.number}
              </span>
              <h2 className="text-xl font-bold text-white">{phase.label}</h2>
            </div>
            <p className="text-gray-400 text-sm mb-6">{phase.description}</p>

            <div className="space-y-4">
              {phase.prompts.map((prompt, i) => (
                <div key={i} className="bg-white/[0.02] border border-white/5 rounded-lg p-5">
                  <p className="text-gray-200 text-sm font-mono leading-relaxed mb-3">
                    &ldquo;{prompt.text}&rdquo;
                  </p>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    {prompt.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Key insight */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4">What this reveals</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-5">
              <h3 className="text-white font-bold text-sm mb-2">The human is the scientist</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                The AI writes all the code, runs all the circuits, and analyzes all the data. But
                the prompts that matter most are skeptical questions (Phase 3) and half-formed intuitions
                (Phase 4). The human&apos;s job is judgment, not implementation.
              </p>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-5">
              <h3 className="text-white font-bold text-sm mb-2">Curiosity beats directives</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                The best educational content came from genuine questions (&ldquo;coherence... with what?&rdquo;),
                not specifications. The best experiment designs came from asking the agent what it would
                investigate next, not prescribing the protocol.
              </p>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-5">
              <h3 className="text-white font-bold text-sm mb-2">Failures are the findings</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                Every major discovery — coefficient amplification, the TREX mitigation ladder,
                topology-vs-scale — came from investigating failures, not celebrating successes. The
                prompt &ldquo;why did this fail?&rdquo; is more productive than &ldquo;make this work.&rdquo;
              </p>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-5">
              <h3 className="text-white font-bold text-sm mb-2">Phase 5 is honest</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                Real AI-assisted work includes &ldquo;you are stuck,&rdquo; &ldquo;why is this taking so
                long,&rdquo; and &ldquo;I can&apos;t see what you&apos;re doing.&rdquo; The friction is part
                of the method. Acknowledging it makes the work reproducible.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6">
            <h3 className="text-white font-bold mb-4">By the numbers</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-[#00d4ff]">445</div>
                <div className="text-xs text-gray-500">Claude Code sessions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#00ff88]">349</div>
                <div className="text-xs text-gray-500">substantive prompts</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#8b5cf6]">~48 hrs</div>
                <div className="text-xs text-gray-500">wall-clock time</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#f59e0b]">1 human</div>
                <div className="text-xs text-gray-500">zero lines of code by hand</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Links */}
      <section className="px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center gap-4 text-xs font-mono text-gray-500 mb-8">
            <Link href="/replications" className="hover:text-[#00ff88] transition-colors">Replications</Link>
            <span className="text-gray-700">&middot;</span>
            <Link href="/experiments" className="hover:text-[#00ff88] transition-colors">Experiments</Link>
            <span className="text-gray-700">&middot;</span>
            <Link href="/platforms" className="hover:text-[#00d4ff] transition-colors">Platforms</Link>
            <span className="text-gray-700">&middot;</span>
            <Link href="/get-started" className="hover:text-[#00d4ff] transition-colors">Get Started</Link>
            <span className="text-gray-700">&middot;</span>
            <Link href="/blog" className="hover:text-[#ff6b9d] transition-colors">Blog</Link>
          </div>
          <div className="flex flex-col items-center gap-2 text-[10px] text-gray-600 font-mono text-center">
            <div className="flex flex-wrap justify-center gap-3">
              <a href="mailto:j.d.lomas@tudelft.nl" className="hover:text-[#00d4ff] transition-colors">
                j.d.lomas@tudelft.nl
              </a>
              <span className="text-gray-700">&middot;</span>
              <a href="https://dereklomas.me" target="_blank" rel="noopener noreferrer" className="hover:text-[#00d4ff] transition-colors">
                dereklomas.me
              </a>
            </div>
            <div>
              <span className="text-gray-400">h</span>AI<span className="text-gray-400">qu</span> &mdash; TU Delft / QuTech &mdash; 2026
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
