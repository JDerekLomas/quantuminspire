import Link from 'next/link'
import Nav from '@/components/Nav'

export const metadata = {
  title: 'Quantum VibeCoding — Natural Language to Quantum Hardware',
  description: 'Describe experiments in natural language. AI writes circuits, submits to hardware, analyzes results. The method behind 100+ quantum experiments.',
}

/* ────────────────────────── data ────────────────────────── */

const workflow = [
  {
    step: 1,
    title: 'Describe what you want',
    example: '"Run a Bell state on Tuna-9 and measure the fidelity"',
    detail: 'Natural language, not code. You describe the experiment, the hypothesis, or the question.',
    color: '#00d4ff',
  },
  {
    step: 2,
    title: 'AI translates to circuits',
    example: 'H q[0]; CNOT q[0], q[1]; measure',
    detail: 'Claude Code generates cQASM 3.0 or OpenQASM 2.0, handles qubit mapping, basis rotation, parameter optimization.',
    color: '#8b5cf6',
  },
  {
    step: 3,
    title: 'Submits to real hardware',
    example: 'qi_submit_circuit → job_id: 12847',
    detail: 'MCP servers wrap quantum hardware as tools. The agent calls them directly — no SDK code on your end.',
    color: '#00ff88',
  },
  {
    step: 4,
    title: 'Analyzes and reports',
    example: 'Bell fidelity: 96.6% on q[2,4]',
    detail: 'Statistical analysis, error mitigation, comparison to reference values. All automated.',
    color: '#ff8c42',
  },
]

const whatWeBuilt = [
  { stat: '100+', label: 'experiments run', color: '#00ff88' },
  { stat: '6', label: 'papers replicated', color: '#00d4ff' },
  { stat: '3', label: 'quantum chips', color: '#8b5cf6' },
  { stat: '20+', label: 'interactive tools', color: '#ff8c42' },
  { stat: '34', label: 'web pages', color: '#ff6b9d' },
  { stat: '0', label: 'lines of code by hand', color: '#f59e0b' },
]

const promptPatterns = [
  {
    phase: 'Explore',
    color: '#00d4ff',
    example: 'how might I demonstrate the capacity of claude code on quantum computing?',
    desc: 'Open-ended questions that orient the agent to the domain.',
  },
  {
    phase: 'Experiment',
    color: '#00ff88',
    example: 'Queue them up and start gathering data. After every experiment, reflect and adjust.',
    desc: 'Directing experiments with adaptive feedback loops.',
  },
  {
    phase: 'Skepticism',
    color: '#ef4444',
    example: 'wait, it was that easy? Are you sure that is real?',
    desc: 'Every major discovery came from doubting results.',
  },
  {
    phase: 'Meaning',
    color: '#8b5cf6',
    example: "it's like AI is the interface between humans and quantum...",
    desc: 'Half-formed thoughts that crystallize the thesis.',
  },
  {
    phase: 'Meta',
    color: '#f59e0b',
    example: 'you are stuck.',
    desc: 'Sometimes the best prompt is two words.',
  },
]

/* ────────────────────────── page ────────────────────────── */

export default function QuantumVibecodingPage() {
  return (
    <main className="min-h-screen text-gray-200">
      <Nav section="vibecoding" />

      {/* Hero */}
      <section className="border-b border-white/5 px-6 pt-28 pb-12">
        <div className="max-w-5xl mx-auto">
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#00d4ff] mb-4 block">
            Quantum VibeCoding
          </span>
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-6 leading-[0.95]">
            Describe it.<br />
            AI runs it on<br />
            <span className="gradient-text">real quantum hardware.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl leading-relaxed mb-6">
            Quantum vibe coding is using an AI coding agent to design, submit, and analyze
            quantum circuits — without writing SDK code yourself. You describe experiments in
            natural language. The agent does the rest.
          </p>
          <p className="text-sm text-gray-500 max-w-2xl leading-relaxed">
            This is how one person with no quantum programming experience produced 100+
            experiments, replicated 6 papers, and built 20+ interactive tools in 48 hours
            of wall-clock time.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-8">
            How it works
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {workflow.map((w) => (
              <div
                key={w.step}
                className="p-5 rounded-xl border bg-white/[0.02]"
                style={{ borderColor: `${w.color}15` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold"
                    style={{ backgroundColor: `${w.color}15`, color: w.color }}
                  >
                    {w.step}
                  </span>
                  <span className="text-white text-sm font-bold">{w.title}</span>
                </div>
                <p className="text-gray-200 text-xs font-mono mb-2 bg-black/20 rounded p-2">
                  {w.example}
                </p>
                <p className="text-gray-500 text-xs leading-relaxed">{w.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What this method produced */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-6">
            What this method produced
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mb-8">
            {whatWeBuilt.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.stat}</div>
                <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
            <p className="text-gray-300 text-sm leading-relaxed">
              <strong className="text-white">The human role is not to write code.</strong>{' '}
              It is to direct attention, ask skeptical questions, and frame what matters.
              The AI handles implementation. The human decides what to investigate, when to
              doubt results, and how to communicate findings. This is a new mode of doing science.
            </p>
          </div>
        </div>
      </section>

      {/* Prompt patterns */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-2">
            The 5 Prompt Patterns
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            From 349 prompts across 445 sessions, five patterns emerged.
          </p>
          <div className="space-y-3">
            {promptPatterns.map((p) => (
              <div
                key={p.phase}
                className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]"
              >
                <span
                  className="text-[10px] font-mono px-2 py-1 rounded-full border flex-shrink-0 mt-0.5"
                  style={{ borderColor: `${p.color}30`, color: p.color, background: `${p.color}10` }}
                >
                  {p.phase}
                </span>
                <div>
                  <p className="text-gray-200 text-sm font-mono mb-1">&ldquo;{p.example}&rdquo;</p>
                  <p className="text-gray-500 text-xs">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/methodology"
              className="text-xs font-mono text-[#f59e0b] hover:underline"
            >
              See all 349 prompts organized by phase &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* The stack */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-6">
            The Stack
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-[#00d4ff]/15 bg-white/[0.02]">
              <h3 className="text-white font-bold text-sm mb-3">AI Agent</h3>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex justify-between"><span>Claude Code</span><span className="text-gray-500 font-mono">AI coding agent</span></div>
                <div className="flex justify-between"><span>MCP Servers</span><span className="text-gray-500 font-mono">quantum hardware tools</span></div>
                <div className="flex justify-between"><span>Python 3.12 + Qiskit + PennyLane</span><span className="text-gray-500 font-mono">SDKs</span></div>
              </div>
            </div>
            <div className="p-5 rounded-xl border border-[#8b5cf6]/15 bg-white/[0.02]">
              <h3 className="text-white font-bold text-sm mb-3">Quantum Hardware</h3>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex justify-between"><span>QI Tuna-9</span><span className="font-mono" style={{ color: '#00d4ff' }}>9 qubits, free</span></div>
                <div className="flex justify-between"><span>IBM Torino</span><span className="font-mono" style={{ color: '#8b5cf6' }}>133 qubits, 10 min/mo</span></div>
                <div className="flex justify-between"><span>IQM Garnet</span><span className="font-mono" style={{ color: '#ff6b9d' }}>20 qubits, 30 credits/mo</span></div>
                <div className="flex justify-between"><span>Local emulator</span><span className="font-mono text-gray-500">instant, no auth</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Navigate */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-6">
            Dive In
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { href: '/get-started', label: 'Get Started Guide', desc: 'Step-by-step setup: Claude Code + MCP + 3 quantum backends. All free.', color: '#00d4ff', cta: 'Set up your environment' },
              { href: '/methodology', label: 'Methodology', desc: '349 prompts, 5 phases, the workflow that emerged from 445 sessions.', color: '#f59e0b', cta: 'See the prompts' },
              { href: '/wp44', label: 'Research Program (WP4.4)', desc: 'The academic context: QCT framework, metaphor design, HCI frontier.', color: '#8b5cf6', cta: 'Read the research context' },
              { href: '/research', label: 'The Evidence', desc: 'What this method produced: 6 papers, 100+ experiments, 3 chips.', color: '#00ff88', cta: 'See the results' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-white text-sm font-bold group-hover:underline">{item.label}</span>
                </div>
                <p className="text-gray-500 text-xs mb-3">{item.desc}</p>
                <span className="text-xs font-mono" style={{ color: item.color }}>
                  {item.cta} &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-3 text-[10px] text-gray-600 font-mono text-center">
          <div className="flex flex-wrap justify-center gap-3">
            <a href="mailto:j.d.lomas@tudelft.nl" className="hover:text-[#00d4ff] transition-colors">j.d.lomas@tudelft.nl</a>
            <span className="text-gray-700">&middot;</span>
            <a href="https://dereklomas.me" target="_blank" rel="noopener noreferrer" className="hover:text-[#00d4ff] transition-colors">dereklomas.me</a>
          </div>
          <div>
            <span className="text-gray-400">h</span>AI<span className="text-gray-400">qu</span> &mdash; TU Delft / QuTech &mdash; 2026
          </div>
        </div>
      </footer>
    </main>
  )
}
