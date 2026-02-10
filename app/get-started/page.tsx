import Link from 'next/link'

export const metadata = {
  title: 'Get Started — Quantum Vibe Coding with Claude Code',
  description: 'Set up Claude Code with MCP quantum servers to run circuits on real quantum hardware from your terminal. Tips from 100+ experiments across 3 platforms.',
}

/* ────────────────────────── data ────────────────────────── */

const platforms = [
  {
    name: 'Quantum Inspire (Tuna-9)',
    qubits: 9,
    color: '#00d4ff',
    signupUrl: 'https://portal.quantum-inspire.com/',
    signupSteps: 'Create account at portal.quantum-inspire.com, then run: qi login',
    configFile: '~/.quantuminspire/config.json',
    free: true,
    notes: 'Unlimited jobs. 9 superconducting qubits. cQASM 3.0 circuits.',
  },
  {
    name: 'IBM Quantum (Torino)',
    qubits: 133,
    color: '#8b5cf6',
    signupUrl: 'https://quantum.ibm.com/',
    signupSteps: 'Create IBM Quantum account, get API token from dashboard, then save with QiskitRuntimeService.save_account()',
    configFile: '~/.qiskit/qiskit-ibm.json',
    free: true,
    notes: '10 min/month free QPU. 133 qubits. OpenQASM 2.0 circuits.',
  },
  {
    name: 'IQM Garnet',
    qubits: 20,
    color: '#f59e0b',
    signupUrl: 'https://resonance.meetiqm.com/',
    signupSteps: 'Create IQM Resonance account, get API key from dashboard',
    configFile: 'IQM_API_KEY environment variable',
    free: true,
    notes: '30 credits/month free. 20 qubits. Qiskit integration via iqm-client.',
  },
]

const silentBugs = [
  {
    name: 'Bit ordering',
    description: 'PennyLane q0=MSB, Qiskit q0=LSB, cQASM MSB-first bitstrings. Code runs fine, gives wrong answers.',
    severity: 'critical',
    howCaught: 'Cross-platform comparison showed impossible fidelity values',
  },
  {
    name: 'Coefficient convention',
    description: 'BK-tapered vs sector-projected Hamiltonians differ in sign of key terms. Both are valid.',
    severity: 'critical',
    howCaught: 'Emulator energy didn\'t match known FCI reference value',
  },
  {
    name: 'X gate placement',
    description: 'Which qubit gets the X gate in VQE depends on coefficient signs. Wrong choice = 1400 kcal/mol error.',
    severity: 'critical',
    howCaught: 'Compared computed energy to exact diagonalization',
  },
  {
    name: 'Non-contiguous qubit extraction',
    description: 'Hardware returns full-width bitstrings. bits[-2:] extracts q[0,1], not q[2,4].',
    severity: 'critical',
    howCaught: 'Bell state on q[2,4] returned 0% fidelity',
  },
  {
    name: 'Missing post-selection',
    description: 'We reported 9.2 kcal/mol for weeks. The data was actually 1.66 kcal/mol. Analysis was wrong, not data.',
    severity: 'high',
    howCaught: 'Offline reanalysis of raw counts with parity filtering',
  },
  {
    name: 'Over-mitigation',
    description: 'TREX alone: 0.22 kcal/mol. TREX + DD + twirling: 10 kcal/mol. Adding "improvements" made it 45x worse.',
    severity: 'high',
    howCaught: 'Systematic mitigation ladder experiment',
  },
  {
    name: 'Stale hardware topology',
    description: 'Cached topology map said q[6-8] were dead. Hardware had been recalibrated; they were fine.',
    severity: 'medium',
    howCaught: 'Fresh characterization run from scratch',
  },
  {
    name: 'Missing explicit measurement',
    description: 'cQASM 3.0 circuits without "b = measure q" return zero results on emulator. Remote hardware adds implicit measurement.',
    severity: 'medium',
    howCaught: 'Empty counts dict caused NaN in analysis',
  },
]

const tips = [
  {
    title: 'Always verify on emulator first',
    detail: 'The emulator catches circuit bugs. We had 100% emulator success, 100% of failures were hardware-specific. But the emulator only proves your code matches your model -- not that your model is correct.',
    icon: '1',
  },
  {
    title: 'Compare emulator to known reference values',
    detail: 'The emulator can\'t catch wrong Hamiltonians or convention errors. Always compare to FCI (exact diagonalization) or published values. Our BK-tapered coefficient error passed the emulator perfectly.',
    icon: '2',
  },
  {
    title: 'Characterize hardware before doing science',
    detail: 'We ran 33 characterization jobs before any real experiments. Best qubit pair: 96.6% Bell fidelity. Worst: 87%. That\'s the difference between chemical accuracy and failure.',
    icon: '3',
  },
  {
    title: 'Post-selection is free -- always use it',
    detail: 'Discard measurement outcomes that violate known symmetries (e.g., parity). Costs zero QPU time, typically improves results by 2-6x. We forgot it for weeks and over-reported our error by 6x.',
    icon: '4',
  },
  {
    title: 'Don\'t stack mitigation techniques blindly',
    detail: 'TREX alone = 0.22 kcal/mol. Adding dynamical decoupling = 1.33. Adding twirling = 10. More shots = 3.77. The intuition that "more = better" is wrong for shallow circuits.',
    icon: '5',
  },
  {
    title: 'Never trust a single run',
    detail: 'Hardware results vary by ~3 kcal/mol run-to-run. LLM code generation varies by 2.7pp at temperature=0. Always run multiple times and report the variance.',
    icon: '6',
  },
  {
    title: 'Cross-platform comparison catches hidden bugs',
    detail: 'Running the same circuit on Tuna-9, IBM, and the emulator surfaced bugs that were invisible on any single platform: bitstring ordering, analysis errors, compilation artifacts.',
    icon: '7',
  },
  {
    title: 'Save raw counts, not just summary statistics',
    detail: 'We re-analyzed old data months later and found it was 6x better than reported. The raw bitstring counts were correct; only the summary statistics were wrong. Always keep the raw data.',
    icon: '8',
  },
]

/* ────────────────────────── components ────────────────────────── */

function StepCard({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="relative pl-12 pb-8">
      <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-[#00d4ff]/20 border border-[#00d4ff]/40 flex items-center justify-center text-[#00d4ff] font-mono text-sm font-bold">
        {step}
      </div>
      {step < 5 && <div className="absolute left-[15px] top-8 w-px h-full bg-white/5" />}
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <div className="text-gray-300 text-sm leading-relaxed space-y-3">{children}</div>
    </div>
  )
}

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="bg-black/40 border border-white/5 rounded-lg overflow-hidden">
      {title && <div className="text-xs font-mono text-gray-500 px-4 pt-2">{title}</div>}
      <pre className="p-4 text-sm font-mono text-gray-200 overflow-x-auto whitespace-pre">{children}</pre>
    </div>
  )
}

/* ────────────────────────── page ────────────────────────── */

export default function GetStartedPage() {
  return (
    <main className="min-h-screen text-gray-200">
      {/* Header */}
      <section className="border-b border-white/5 px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-xs font-mono text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block">
            &larr; haiqu
          </Link>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Quantum Vibe Coding
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl">
            Run circuits on real quantum hardware from your terminal.
            Claude Code + MCP servers = quantum experiments in natural language.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20">
              3 quantum backends
            </span>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20">
              100+ experiments run
            </span>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20">
              all free tier
            </span>
          </div>
        </div>
      </section>

      {/* What is this */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4">What is quantum vibe coding?</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            Quantum vibe coding is using an AI coding agent to design, submit, and analyze quantum circuits
            on real hardware -- without writing low-level SDK code yourself. You describe what you want in
            natural language, and the agent handles the Qiskit/cQASM translation, hardware submission,
            result retrieval, and statistical analysis.
          </p>
          <p className="text-gray-300 leading-relaxed mb-4">
            We used this approach to replicate 6 published quantum computing papers across 3 hardware
            platforms, running 100+ experiments with a 93% success rate. The setup below is exactly what we used.
          </p>
          <p className="text-gray-400 text-sm">
            This guide assumes basic familiarity with quantum computing concepts.
            If you&apos;re new, start with the{' '}
            <Link href="/learn" className="text-[#00d4ff] hover:underline">glossary</Link> or the{' '}
            <Link href="/how-qubits-work" className="text-[#00d4ff] hover:underline">How Qubits Work</Link> series.
          </p>
        </div>
      </section>

      {/* Setup Steps */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8">Setup</h2>

          <StepCard step={1} title="Install Claude Code">
            <p>
              Claude Code is Anthropic&apos;s CLI agent. It reads files, runs commands, and calls MCP tool
              servers -- including quantum hardware.
            </p>
            <CodeBlock>{`npm install -g @anthropic-ai/claude-code
claude`}</CodeBlock>
            <p className="text-gray-400 text-xs">
              Requires Node.js 18+ and an Anthropic API key. See{' '}
              <a href="https://docs.anthropic.com/en/docs/claude-code/overview" className="text-[#00d4ff] hover:underline" target="_blank" rel="noopener noreferrer">
                Claude Code docs
              </a> for full setup.
            </p>
          </StepCard>

          <StepCard step={2} title="Get quantum hardware accounts (all free)">
            <div className="space-y-4">
              {platforms.map(p => (
                <div key={p.name} className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="font-bold text-white text-sm">{p.name}</span>
                    <span className="text-xs font-mono text-gray-500">{p.qubits}q</span>
                    {p.free && <span className="text-xs font-mono text-green-400/60">free</span>}
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{p.notes}</p>
                  <p className="text-xs text-gray-400">{p.signupSteps}</p>
                  <a
                    href={p.signupUrl}
                    className="text-xs font-mono hover:underline mt-1 inline-block"
                    style={{ color: p.color }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {p.signupUrl} &rarr;
                  </a>
                </div>
              ))}
            </div>
            <p className="text-gray-400 text-xs mt-2">
              You don&apos;t need all three. Quantum Inspire is the easiest to start with (unlimited jobs, fast queue).
              The local emulator works with zero accounts.
            </p>
          </StepCard>

          <StepCard step={3} title="Install Python environment">
            <p>The MCP servers need Python 3.12 (not 3.14 -- it breaks libqasm) with quantum SDKs.</p>
            <CodeBlock title="terminal">{`python3.12 -m venv .venv
source .venv/bin/activate

# Core quantum SDKs
pip install qiskit==2.1.2 qiskit-ibm-runtime
pip install pennylane==0.44
pip install quantuminspire>=3.5.0

# MCP server framework
pip install "mcp>=1.0.0"

# Local emulator (no hardware needed)
pip install qxelarator`}</CodeBlock>
          </StepCard>

          <StepCard step={4} title="Set up MCP quantum servers">
            <p>
              MCP (Model Context Protocol) servers expose quantum hardware as tools that Claude Code can call.
              Each server wraps a vendor SDK. Create a <code className="text-[#00d4ff]">.mcp.json</code> file
              in your project root:
            </p>
            <CodeBlock title=".mcp.json">{`{
  "mcpServers": {
    "qi-circuits": {
      "type": "stdio",
      "command": ".venv/bin/python",
      "args": ["mcp-servers/qi-circuits/qi_server.py"]
    },
    "ibm-quantum": {
      "type": "stdio",
      "command": ".venv/bin/python",
      "args": ["mcp-servers/ibm-quantum/ibm_server.py"]
    },
    "qrng": {
      "type": "stdio",
      "command": ".venv/bin/python",
      "args": ["mcp-servers/qrng/qrng_server.py"]
    }
  }
}`}</CodeBlock>
            <p>
              The MCP server source code is in our repository. Clone it to get the servers:
            </p>
            <CodeBlock>{`git clone https://github.com/JDerekLomas/quantuminspire.git
# Servers are in mcp-servers/qi-circuits/, mcp-servers/ibm-quantum/, mcp-servers/qrng/`}</CodeBlock>
            <p className="text-gray-400 text-xs">
              Each server is ~200-400 lines of Python. They&apos;re simple wrappers around vendor SDKs that
              expose submit/check/get-results as MCP tools.
            </p>
          </StepCard>

          <StepCard step={5} title="Run your first quantum circuit">
            <p>Start Claude Code in your project directory and ask it to run a circuit:</p>
            <CodeBlock title="in Claude Code">{`> Run a Bell state on the local emulator and show me the results

> Submit a 3-qubit GHZ state to Tuna-9 and analyze the fidelity

> Run H2 VQE at bond distance 0.735 angstroms on the emulator`}</CodeBlock>
            <p>
              The agent will generate cQASM 3.0 or OpenQASM 2.0, call the appropriate MCP tool,
              wait for results, and analyze the measurement histogram. No SDK code needed on your end.
            </p>
            <div className="bg-[#00ff88]/5 border border-[#00ff88]/20 rounded-lg p-4 mt-3">
              <p className="text-[#00ff88] text-sm font-bold mb-1">Start with the emulator</p>
              <p className="text-gray-300 text-xs">
                The <code>qi_run_local</code> tool runs circuits instantly with no account, no queue, no cost.
                Verify your circuit works here before spending hardware time.
              </p>
            </div>
          </StepCard>
        </div>
      </section>

      {/* What you get */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4">Available tools</h2>
          <p className="text-gray-400 text-sm mb-6">Once configured, Claude Code has these quantum tools:</p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="text-left text-gray-500 border-b border-white/5">
                  <th className="py-2 pr-4">Tool</th>
                  <th className="py-2 pr-4">Backend</th>
                  <th className="py-2">What it does</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-white/[0.02]">
                  <td className="py-2 pr-4 text-[#00d4ff]">qi_run_local</td>
                  <td className="py-2 pr-4">Emulator</td>
                  <td className="py-2">Run cQASM 3.0 locally, instant results, no auth</td>
                </tr>
                <tr className="border-b border-white/[0.02]">
                  <td className="py-2 pr-4 text-[#00d4ff]">qi_submit_circuit</td>
                  <td className="py-2 pr-4">Tuna-9</td>
                  <td className="py-2">Submit cQASM 3.0 to real hardware, returns job ID</td>
                </tr>
                <tr className="border-b border-white/[0.02]">
                  <td className="py-2 pr-4 text-[#00d4ff]">qi_check_job / qi_get_results</td>
                  <td className="py-2 pr-4">Tuna-9</td>
                  <td className="py-2">Poll status, retrieve measurement counts</td>
                </tr>
                <tr className="border-b border-white/[0.02]">
                  <td className="py-2 pr-4 text-[#8b5cf6]">ibm_submit_circuit</td>
                  <td className="py-2 pr-4">IBM Torino</td>
                  <td className="py-2">Submit OpenQASM 2.0, auto-selects least busy backend</td>
                </tr>
                <tr className="border-b border-white/[0.02]">
                  <td className="py-2 pr-4 text-[#8b5cf6]">ibm_check_job / ibm_get_results</td>
                  <td className="py-2 pr-4">IBM Torino</td>
                  <td className="py-2">Poll status, retrieve measurement counts</td>
                </tr>
                <tr className="border-b border-white/[0.02]">
                  <td className="py-2 pr-4 text-[#f59e0b]">quantum_random_int</td>
                  <td className="py-2 pr-4">ANU/Tuna-9</td>
                  <td className="py-2">True quantum random numbers (cascading fallback)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-[#f59e0b]">quantum_coin_flip / quantum_dice_roll</td>
                  <td className="py-2 pr-4">ANU/Tuna-9</td>
                  <td className="py-2">Quantum coin flips and dice rolls</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Tips from experience */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-2">8 tips from 100+ experiments</h2>
          <p className="text-gray-400 text-sm mb-8">
            Hard-won lessons from replicating 6 papers across 3 quantum platforms.
          </p>

          <div className="space-y-6">
            {tips.map(tip => (
              <div key={tip.icon} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-white font-mono text-sm">
                  {tip.icon}
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm mb-1">{tip.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{tip.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Silent bugs */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-2">Silent bugs that will bite you</h2>
          <p className="text-gray-400 text-sm mb-6">
            These are the bugs where the code compiles, runs, returns numbers -- but the numbers are quietly
            wrong by orders of magnitude. Every one of these happened to us.
          </p>

          <div className="space-y-3">
            {silentBugs.map(bug => (
              <div
                key={bug.name}
                className="bg-white/[0.02] border rounded-lg p-4"
                style={{
                  borderColor: bug.severity === 'critical' ? 'rgba(239,68,68,0.2)' :
                    bug.severity === 'high' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)'
                }}
              >
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-bold text-white text-sm">{bug.name}</span>
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: bug.severity === 'critical' ? 'rgba(239,68,68,0.1)' :
                        bug.severity === 'high' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)',
                      color: bug.severity === 'critical' ? '#ef4444' :
                        bug.severity === 'high' ? '#f59e0b' : '#6b7280',
                    }}
                  >
                    {bug.severity}
                  </span>
                </div>
                <p className="text-gray-400 text-xs mb-1">{bug.description}</p>
                <p className="text-gray-500 text-xs">Caught by: {bug.howCaught}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The validation ladder */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4">The validation ladder</h2>
          <p className="text-gray-400 text-sm mb-6">
            No single check catches everything. Each layer catches a different class of bug.
          </p>

          <div className="space-y-3">
            {[
              { layer: 'Emulator', catches: 'Circuit and algorithm bugs (wrong gates, bad parameters)', misses: 'Wrong Hamiltonian, convention errors, analysis bugs' },
              { layer: 'FCI reference comparison', catches: 'Hamiltonian and coefficient convention errors', misses: 'Hardware-specific noise, analysis pipeline bugs' },
              { layer: 'Cross-platform hardware', catches: 'Analysis bugs, platform-specific assumptions, bitstring ordering', misses: 'Errors common to all platforms (e.g., wrong post-processing)' },
              { layer: 'Re-run variance', catches: 'Non-determinism, calibration drift, flaky results', misses: 'Systematic errors that are consistent across runs' },
              { layer: 'Mitigation ladder', catches: 'Over-mitigation, technique interaction bugs', misses: 'Fundamental hardware limitations' },
            ].map((item, i) => (
              <div key={item.layer} className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded bg-white/[0.04] border border-white/10 flex items-center justify-center text-gray-500 font-mono text-xs">
                  {i + 1}
                </div>
                <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-lg p-3">
                  <span className="text-white font-bold text-sm">{item.layer}</span>
                  <div className="flex gap-4 mt-1 text-xs">
                    <span className="text-green-400/60">Catches: {item.catches}</span>
                  </div>
                  <div className="text-xs text-red-400/40 mt-0.5">
                    Misses: {item.misses}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Example prompts */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4">Example prompts to try</h2>
          <p className="text-gray-400 text-sm mb-6">Copy-paste these into Claude Code once your MCP servers are configured.</p>

          <div className="space-y-4">
            {[
              { level: 'Beginner', prompt: 'Create a Bell state circuit and run it on the local emulator with 1024 shots. Show me the measurement histogram and calculate the fidelity.', color: '#00ff88' },
              { level: 'Beginner', prompt: 'Generate 10 quantum random numbers between 1 and 100.', color: '#00ff88' },
              { level: 'Intermediate', prompt: 'Run a 3-qubit GHZ state on Tuna-9 using qubits 2, 4, and 6. Measure in Z, X, and Y bases. Calculate the fidelity and identify the dominant noise type from the correlator ratios.', color: '#f59e0b' },
              { level: 'Intermediate', prompt: 'Submit an H2 VQE circuit at bond distance 0.735 angstroms to IBM Quantum. Use the 2-qubit sector-projected Hamiltonian with optimal theta=0.1118. Compare the measured energy to the exact FCI value of -1.1373 Ha.', color: '#f59e0b' },
              { level: 'Advanced', prompt: 'Run a quantum volume protocol on the emulator for widths 2 through 5, with 5 random SU(4) circuits per width. Determine the QV using the 2/3 heavy output fraction threshold.', color: '#ef4444' },
              { level: 'Advanced', prompt: 'Implement QAOA for MaxCut on a 4-node path graph. Sweep gamma and beta over a 5x5 grid. Run on the emulator first, then submit the best parameters to Tuna-9 on qubits [5,2,4,6]. Compare approximation ratios.', color: '#ef4444' },
            ].map((item, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded mb-2 inline-block" style={{ backgroundColor: item.color + '15', color: item.color }}>
                  {item.level}
                </span>
                <p className="text-gray-200 text-sm font-mono leading-relaxed">{item.prompt}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">Resources</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { title: 'Claude Code docs', url: 'https://docs.anthropic.com/en/docs/claude-code/overview', desc: 'Official setup and usage guide' },
              { title: 'MCP specification', url: 'https://modelcontextprotocol.io/', desc: 'How tool servers work' },
              { title: 'Quantum Inspire portal', url: 'https://portal.quantum-inspire.com/', desc: 'Sign up for Tuna-9 access' },
              { title: 'IBM Quantum', url: 'https://quantum.ibm.com/', desc: 'Sign up for IBM Torino access' },
              { title: 'IQM Resonance', url: 'https://resonance.meetiqm.com/', desc: 'Sign up for Garnet access' },
              { title: 'Our MCP servers (source)', url: 'https://github.com/JDerekLomas/quantuminspire/tree/main/mcp-servers', desc: 'qi-circuits, ibm-quantum, qrng server code' },
              { title: 'Our experiment results', url: 'https://quantuminspire.vercel.app/experiments', desc: '100+ experiments with raw data' },
              { title: 'Paper replications', url: 'https://quantuminspire.vercel.app/replications', desc: '6 papers, 27 claims, 93% pass rate' },
              { title: 'Qiskit docs', url: 'https://docs.quantum.ibm.com/', desc: 'IBM quantum SDK' },
              { title: 'cQASM 3.0 spec', url: 'https://qutech-delft.github.io/cQASM-spec/', desc: 'Quantum Inspire circuit language' },
            ].map(r => (
              <a
                key={r.title}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/[0.02] border border-white/5 rounded-lg p-4 hover:border-white/10 transition-colors block"
              >
                <span className="text-white text-sm font-bold">{r.title}</span>
                <span className="text-[#00d4ff] text-xs ml-2">&rarr;</span>
                <p className="text-gray-500 text-xs mt-1">{r.desc}</p>
              </a>
            ))}
          </div>

          <div className="mt-12 text-center text-gray-500 text-xs">
            <p>Built with Claude Code + Quantum Inspire + IBM Quantum + IQM Resonance</p>
            <p className="mt-1">
              <Link href="/" className="text-[#00d4ff] hover:underline">haiqu</Link>
              {' '}&middot;{' '}
              <Link href="/experiments" className="text-[#00d4ff] hover:underline">experiments</Link>
              {' '}&middot;{' '}
              <Link href="/replications" className="text-[#00d4ff] hover:underline">replications</Link>
              {' '}&middot;{' '}
              <Link href="/platforms" className="text-[#00d4ff] hover:underline">platforms</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
