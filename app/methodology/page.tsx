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
    description: 'Open-ended questions that orient the agent to the domain and get infrastructure running. ~70 prompts in this phase across 445 sessions.',
    prompts: [
      { text: 'how might i demonstrate the capacity of claude code on quantum computing? Is there an existing benchmark? Could I create one?', note: 'This prompt started the entire project. Led to discovering Qiskit HumanEval (151 tasks).' },
      { text: 'can you look for skills and dev setup for programming quantum computers including at tu delft quantum?', note: 'Prompted discovery of MCP servers, QI SDK, and the Python 3.12 requirement.' },
      { text: 'Is there a quantum random number generator based on a real quantum computer accessible via mcp?', note: 'Led to building the QRNG MCP server (ANU → Tuna-9 → local emulator fallback chain).' },
      { text: 'get me on github and start organizing this project as an exploration of accelerating science with generative ai, in the field of quantum inspire at TU Delft.', note: 'Set the research framing that carried through the entire project.' },
      { text: 'Can you search for recent graduations at qtech at tu delft with leiven vandersplein and other quantum researchers? That will give us a sense for what research questions they value', note: 'Literature grounding — connected our work to active research directions at QuTech.' },
      { text: 'python 3.14 is breaking everything. libqasm wont install. can we pin to 3.12?', note: 'Python 3.14 breaks libqasm and sklearn. Pinning to 3.12 in a venv fixed all dependency issues.' },
      { text: 'ok so we have QI. What about IBM? And there was that IQM thing... can we get on all three?', note: 'Led to setting up IBM Quantum (Torino, 133q) and IQM Garnet (20q). Three chips, one codebase.' },
      { text: 'build me an MCP server that wraps the QI SDK so claude code can submit circuits directly as a tool call', note: 'Led to qi-circuits MCP server. Later built ibm-quantum and qrng servers the same way.' },
      { text: 'what papers should we try to replicate? pick ones that used 2-9 qubits on real hardware and have enough detail to actually reproduce', note: 'Agent selected 6 papers spanning 2014-2023. Selection criteria became part of the methodology.' },
      { text: 'ok wait, before we do anything else — what does the landscape of AI for quantum actually look like? who else is doing this?', note: 'Led to the adaptive experimentation literature survey. Found the experiment design gap that became our contribution.' },
      { text: 'can you set up a daemon that runs experiments automatically? like, queue them up, submit to hardware, poll for results, analyze, store, repeat', note: 'Led to experiment_daemon.py — 1400+ lines, the backbone of autonomous experimentation.' },
      { text: 'I want a website. Dark theme, monospace, the whole hacker aesthetic. Show the real data live.', note: 'Led to Next.js 14 + Tailwind site. Every number on the site is computed from real experiment data.' },
      { text: 'what is a Hamiltonian? like really, explain it to me. And what is VQE actually doing?', note: 'The human not knowing quantum physics turned out to be a feature, not a bug. Questions became content.' },
      { text: 'can we use PennyLane to compute the exact ground state energy so we have a reference to compare hardware against?', note: 'Established FCI reference values. Without this, we couldn\'t quantify hardware error in kcal/mol.' },
      { text: 'set up a replication agent that can take a paper, extract the claims, and systematically test each one', note: 'Led to replication_agent.py + replication_analyzer.py — structured claim-by-claim testing.' },
    ],
  },
  {
    number: 2,
    label: 'Running experiments',
    color: '#00ff88',
    description: 'Directing experiments with a consistent pattern: start on emulator, validate, then move to hardware. ~120 prompts in this phase — the bulk of the work.',
    prompts: [
      { text: 'what would be most impressive to add? e.g., if we had experiments that were running continuously and queuing up to use the qi hardware and outputting real data? That would "show" the ai science.', note: 'Led to building the experiment daemon (auto-queue, auto-submit, auto-analyze).' },
      { text: 'I think there is probably a workflow where we first evaluate in simulation and then move to real hardware and validate...', note: 'Established the emulator-first validation pattern that caught most bugs before burning hardware credits.' },
      { text: 'Queue them up and start gathering data. Be sure every experiment begins with a clear research question and purpose. After every experiment, reflect and adjust the queue to learn the most', note: 'Turned the agent from a tool-user into a scientist — adaptive experimentation.' },
      { text: "save that reflection in md. then, what do you think is the next experiment you'd like to run? Other hardware? Or something else?", note: 'Asking the agent to propose next steps produced better experiment design than prescribing them.' },
      { text: 'Should we replicate our replications so we can see how reliable they are? Do we save the code along with the data?', note: 'Led to the reproducibility infrastructure (SHA256 checksums, environment snapshots, variance analysis).' },
      { text: 'run a Bell state on every qubit pair on Tuna-9. I want to know which connections actually work and how good they are.', note: 'Topology characterization: 12/36 pairs connected, 85.8-93.5% fidelity. Some "connected" pairs in docs were actually dead.' },
      { text: 'the topology data we had from last week is wrong. q6-8 are alive now. I think the hardware got recalibrated. characterize it fresh.', note: 'Stale data detection. The AI starting from zero was an advantage — it didn\'t carry stale assumptions.' },
      { text: 'run the same VQE at different bond distances. 0.5, 0.735, 1.0, 1.5, 2.0, 2.5 angstroms. I want to see the whole potential energy surface.', note: 'PES sweep on Tuna-9. Found error minimum at R=1.0, NOT at equilibrium. Led to competing noise regimes discovery.' },
      { text: 'now run it on IBM with TREX. resilience_level=1, nothing else. keep it simple.', note: 'TREX alone: 0.22 kcal/mol. Chemical accuracy on the first try. The simplest advanced option was the best.' },
      { text: 'ok now add dynamical decoupling on top of TREX. then add twirling. then try ZNE. I want the full mitigation ladder.', note: 'More mitigation made things WORSE. TREX+DD: 1.33. TREX+DD+Twirl: 10.0. ZNE: 12.84. Major finding.' },
      { text: 'run HeH+ the same way we ran H2. Same circuit shape, same shots, same everything. Just different Hamiltonian.', note: 'Controlled comparison. HeH+ gave 91.2 kcal/mol vs H2\'s 1.66 kcal/mol. Same circuit, 55x worse. Why?' },
      { text: "can we test if it's the CNOT noise that's killing us? add extra CNOTs (gate folding) and see if the energy gets worse", note: 'ZNE gate folding experiment: 12 runs, 3 noise levels. Extra CNOTs added <1.3 kcal/mol. Gate noise is NOT the bottleneck.' },
      { text: 'if gate noise isnt the problem, its readout. can we calibrate the readout error? prepare |00> and |11> and see what comes back.', note: 'Readout calibration: q2 has 9.2% error (asymmetric: 8.5% in one direction, 0.7% the other). This explained >80% of total error.' },
      { text: 'now apply the confusion matrix correction to all our old VQE results. retroactively. see if they get better.', note: 'Offline REM reanalysis: 21 experiments improved. Mean error dropped from 8.30 to 2.52 kcal/mol. 70% improvement for free.' },
      { text: 'try combining post-selection with REM. post-select first then REM. then REM first then post-select. does the order matter?', note: 'Order matters hugely. REM+PS (REM first): 2.52 kcal/mol mean. PS+REM: 3.90. Full REM alone: catastrophic on noisy runs (39 kcal/mol).' },
      { text: 'run QAOA for MaxCut on Tuna-9. 4-node path graph. sweep gamma and beta on a 5x5 grid.', note: 'QAOA MaxCut: 74.1% approximation ratio (5x5 sweep) vs 53.5% (single point). Parameter landscape matters.' },
      { text: 'can we do Quantum Volume? run the standard QV protocol on Tuna-9 and see what we get.', note: 'QV=16 on Tuna-9 (4-qubit circuits pass, 8/10 above 2/3 threshold). Compared to QV=32 on IBM and IQM.' },
      { text: 'replicate the kicked Ising model from Kim 2023. they used 127 qubits but we can do 9. does ZNE still help at our scale?', note: '9-qubit kicked Ising: 180 CZ gates, ZNE gives 14.1x improvement on emulator, 2.3x on Tuna-9 hardware.' },
      { text: 'run the H2 VQE on IQM Garnet too. same circuit, same parameters. I want three hardware points for every experiment.', note: 'Cross-platform consistency: IBM and Tuna-9 gave nearly identical HeH+ errors (4.45 vs 4.44 kcal/mol). The coefficient ratio sets the floor, not the hardware.' },
      { text: 'ok the daemon is on the VPS. set it up as a systemd service that auto-restarts and auto-pushes results to git.', note: 'Daemon runs on clawdbot VPS, auto-commits results. Experiments run 24/7 without human presence.' },
    ],
  },
  {
    number: 3,
    label: 'Critical review & debugging',
    color: '#ef4444',
    description: 'The most valuable prompts were skeptical ones. Every major discovery came from asking "is this actually right?" ~80 prompts in this phase.',
    prompts: [
      { text: "Act like a skeptical reviewer... can you poke holes in this? How do we know it's not AI hallucination? Trivial?", note: 'Found that the CNOT gate implementation in our math library was broken. Bell/GHZ states were all wrong.' },
      { text: 'can you act like a critical reviewer and look through the site and the experiments and results and try to poke holes and find inconsistencies, misconceptions, inaccuracies and other problems?', note: 'Caught energy unit inconsistencies, stale backend names, and analysis pipeline bugs.' },
      { text: "yeah, actually AI did it all. I'm just prompting here. but let's fix the energy bug? Really, you didn't find any LLM bs faked data or anything?", note: 'Honest acknowledgment that the human is directing, not coding. Important for framing.' },
      { text: 'wait, it was that easy? Are you sure that is real?', note: 'Asked after QEC detection code "worked" on first try. Turned out the codespace prep was missing — XXXX was giving random 50/50.' },
      { text: "The interesting cases are the failures. Why did Peruzzo give 83.5 kcal/mol on IBM? That's more publishable than the successes.", note: 'Reframing failures as findings. Led to the coefficient amplification discovery (|g1|/|g4| ratio predicts error).' },
      { text: 'the VQE energy is off by 1400 kcal/mol. that cant be a measurement error. something is fundamentally wrong with the circuit.', note: 'X gate was on the wrong qubit. For HeH+ (g1<0, g2>0), HF has q1=1, so X goes on q1. Getting this wrong gives catastrophic error.' },
      { text: 'are we using the right Hamiltonian coefficients? I see BK-tapered and sector-projected in the literature and they give different signs for g4 and g5.', note: 'Critical distinction. BK-tapered has g4=g5=-0.0905 (negative theta), sector-projected has +0.0905 (positive theta). Both valid but not interchangeable.' },
      { text: "we said the IBM result was 9.2 kcal/mol for weeks. then we applied post-selection offline and it's actually 1.66. which number is real? why didn't the original analysis catch this?", note: 'The stored analysis was wrong, not the data. Post-selection should have been applied from the start. Led to reanalysis of all 21 Tuna-9 results.' },
      { text: 'the bitstring from Tuna-9 is "010110100" but which qubit is which? is it MSB first or LSB first? because if we get this wrong all our analysis is garbage.', note: 'MSB-first: b[N-1]...b[0]. IBM is the same. Getting this wrong silently produces wrong energies that look plausible.' },
      { text: "the non-contiguous qubit pairs are giving nonsense results. q[2,4] works but q[4,6] gives random data. is the extraction code correct?", note: 'Bug: bits[-2:] only works for q[0,1]. Non-contiguous pairs need explicit index extraction. Fixed with _extract_qubit_bits() helper.' },
      { text: 'why is ZNE making things worse on both platforms? the textbook says it should help.', note: 'ZNE amplifies gate noise and extrapolates to zero. But when readout error is 80%+ of total error, there\'s nothing useful to extrapolate. Flat/non-monotonic trend confirmed.' },
      { text: 'the confusion matrix correction made one run go from 8 to 39 kcal/mol. how is correction making it WORSE?', note: 'Full REM redistributes probability to all states including wrong-parity ones. When gate noise is high, this amplifies errors. Hybrid PS+REM catches it.' },
      { text: "these results are suspiciously good. 0.22 kcal/mol on real hardware? that's better than the paper. double check everything.", note: 'It was real. TREX is genuinely that effective for shallow circuits with readout-dominated noise. The key insight: match mitigation to noise type.' },
      { text: "the QEC code says it's detecting errors but the detection rate is 50/50 for Z errors. that's just random. what's going on?", note: 'Z errors don\'t flip data bits, so Z-basis measurement can\'t localize them. Fundamental limitation, not a bug. Led to understanding NN decoder vs lookup table.' },
      { text: "we need the [[4,2,2]] code but each ancilla has to CNOT all 4 data qubits. Tuna-9's max degree is 3. this literally can't work.", note: 'Original characterization found max degree=3. Later discovered full 12-edge topology where q4 has degree 4 — enabling [[4,2,2]] with q4 as sole ancilla. Achieved 66.6% detection rate (10 CNOTs via q4 bus). IBM Torino still better at 92.7% (6 CNOTs, richer connectivity).' },
      { text: "HeH+ has the same circuit as H2 but 20x worse error. same hardware, same shots, same qubits. what's different?", note: 'Coefficient amplification. |g1|/|g4| ratio: H2=4.4, HeH+=7.8. 1.8x ratio increase → 20x error increase. The Hamiltonian structure, not the hardware, sets the error floor.' },
      { text: 'our IBM result was 91.2 kcal/mol for HeH+. then we switched from SamplerV2+PS to EstimatorV2+TREX and got 4.45. which analysis pipeline was broken?', note: 'SamplerV2+PS was applying post-selection to already-biased data without readout correction. EstimatorV2+TREX handles readout internally. The first pipeline was producing garbage.' },
      { text: "post-selection keeps 98% for H2 but only 84% for HeH+. 16% of HeH+ shots are leaking out of the parity sector. why?", note: 'HeH+ ansatz state requires more entanglement (optimal alpha further from reference). Higher entanglement = more gate noise = more parity leakage.' },
    ],
  },
  {
    number: 4,
    label: 'Meaning-making & communication',
    color: '#8b5cf6',
    description: 'Turning raw results into understanding. Visualization, sonification, narrative framing. ~50 prompts in this phase.',
    prompts: [
      { text: 'coherence... with what? and the microwave frequency, how is that tuned? Is it cold because that way it is in the lowest energy level? Are these energy levels like atoms?', note: 'Genuine curiosity prompts produced the best educational content. The How Qubits Work series came from questions, not directives.' },
      { text: 'I actually want to turn this into a resonance-based explanation of how quantum computers work. Like, we need animations of microwave pulses and the whole deal.', note: 'Led to the /how-it-works resonance explainer — the most distinctive page on the site.' },
      { text: 'lets make a set of smaller units that explore sonification in a different way. Can you brainstorm how we might sonify the data?', note: 'Led to quantum circuit sonification — hearing the difference between clean emulator and noisy hardware.' },
      { text: "Think about it from a QDNL perspective again. I think the AI accelerated science hits. The AI as interface to quantum computing hits...", note: 'Stepping back to check alignment with stakeholders. Kept the project grounded.' },
      { text: "it's like AI is the interface between humans and quantum...", note: 'The one-sentence thesis that emerged from all of this. Sometimes the best prompt is a half-formed thought.' },
      { text: 'build a 3D Bloch sphere in three.js. let people drag it around. show how gates rotate the state.', note: 'Led to the interactive Bloch sphere — one of the most visited pages. Three.js + real-time state computation.' },
      { text: 'I want a page where people can see what measurement actually does. like, show the Born rule happening in real time as they change the state.', note: 'Led to the Measurement Lab. Interactive visualization of collapse, probability, and repeated measurement.' },
      { text: 'can we put all the experiment results in a dashboard? grouped by type. energy diagrams for VQE. backend badges showing which chip.', note: 'Led to /experiments page. Every datapoint is a real hardware run with JSON source data.' },
      { text: 'make a page that compares all three chips head to head. same metrics, same layout. I want to see the tradeoffs at a glance.', note: 'Led to /platforms. Tuna-9 beats Garnet on GHZ-5 (83.8% vs 81.8%). Topology beats scale.' },
      { text: 'we need a blog. each discovery should be a post. write up the error mitigation showdown first — the one where we tested 15 techniques.', note: 'Led to 14 blog posts. Each one written from real experiment data, not hypothetical examples.' },
      { text: 'the replication results need their own page. show each paper, the claims we tested, pass/fail on each backend. make the gaps visible.', note: 'Led to /replications dashboard. Claim-by-claim comparison across 4 backends for 6 papers.' },
      { text: 'I think the site should have three pillars. Research is the center. Learn is the tools. VibeCoding is the method. everything flows from that.', note: 'Information architecture that organized 34 pages into a coherent narrative.' },
      { text: 'what does the paper outline look like? can you draft a structure? we have enough data for a real publication.', note: 'Led to paper-outline.md — structured for Quantum Science and Technology. Abstract, methods, 8 figures, appendices.' },
      { text: 'write a failure analysis for HeH+. not just "it failed" but why, quantitatively. error budget decomposition. term by term.', note: 'Led to failure-analysis.md. Discovered g1*delta_Z0 predicts energy error. Made the testable prediction that IBM TREX would give 3-4x improvement but not chemical accuracy. Prediction confirmed.' },
      { text: 'the coefficient amplification thing — can we make a plot? ratio on x axis, error on y axis, all 30+ data points, both molecules, all backends.', note: 'Led to amplification-threshold-analysis.json. Superlinear scaling: 1.8x ratio → 20x error. Chemical accuracy threshold at ratio ~5.' },
      { text: 'we have a glossary but it needs to be more than definitions. link each term to the experiment where we actually used it.', note: 'Led to learn page glossary with 40+ terms, 7 categories, each connected to real experimental context.' },
      { text: 'what would happen if someone came to this site knowing nothing? walk me through it as a quantum researcher. then as a student. then as an AI person.', note: 'UX persona walkthroughs. Found that the three-pillar structure serves all three audiences.' },
    ],
  },
  {
    number: 5,
    label: 'Session management & debugging',
    color: '#f59e0b',
    description: 'The prompts nobody shows in demos but everyone types in real sessions. ~30 prompts in this phase.',
    prompts: [
      { text: 'taking a really long time. i cant tell if you are working or not... how come? like i wish there was better status about what you are working on when it is taking so long', note: 'Led to adding run_in_background and better status feedback patterns to CLAUDE.md.' },
      { text: "why would it error and not let me know? it just hung up", note: 'Discovered pipe buffering issue. Fix: never pipe long-running commands. Now in our CLAUDE.md.' },
      { text: "its not about the content, its just -- 5 min for 1000 tokens? Something else is going on, maybe you can't see it. I need more visibility", note: 'When the agent is slow, the problem is usually infrastructure, not the LLM. Diagnose the pipeline.' },
      { text: 'you are stuck.', note: 'Sometimes the best prompt is two words. The agent had been looping on a failed approach for several turns.' },
      { text: "I was working on something in this window but I can't see it anymore", note: 'Context window management is real. Led to session handoffs and /compact discipline.' },
      { text: 'vercel --prod is giving me a build error about deploymentProtection in vercel.json. but we need it.', note: 'Vercel CLI rejects deploymentProtection in vercel.json. Must use project settings instead. Documented in CLAUDE.md.' },
      { text: 'the hardware job has been PLANNED for 20 minutes. is the queue stuck? should we cancel and resubmit?', note: 'Tuna-9 queues can stall. Sometimes resubmission works, sometimes the backend is down. Patience or pivot.' },
      { text: 'save a handoff. I need to close this window. list what files we changed, what state we are in, what to do next.', note: 'Led to handoff files in .claude/handoffs/. Critical for multi-day projects with context limits.' },
      { text: '/compact at 75% please. preserve the experiment results and the current task state.', note: 'Discipline around context window management. Without it, the agent loses track of earlier work.' },
      { text: "the MCP server isn't connecting. qi_list_backends returns nothing. is it a config issue or is the service down?", note: 'MCP config lives in ~/.claude/. Authentication tokens expire. Always check config.json first.' },
      { text: 'the daemon committed 47 JSON files but half of them have duplicate experiment IDs. what happened?', note: 'Race condition in auto-commit. Fixed by adding locking and deduplication to the daemon pipeline.' },
      { text: "don't pipe the build output. just run it. i'll wait. last time the pipe buffering made it look frozen for 3 minutes.", note: 'Hard-won lesson now in CLAUDE.md: never pipe long-running commands. Output buffering kills feedback.' },
      { text: 'this session is getting long. can you write a memory note about what we learned about coefficient conventions so we dont have to rediscover it next time?', note: 'Led to MEMORY.md entries that persist across sessions. The H2/HeH+ Hamiltonian coefficients are now documented permanently.' },
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
            Below are 78 representative prompts from the 349 total, organized by the 5 workflow phases that
            emerged naturally over 445 sessions. These are not curated marketing examples — they are the real,
            unpolished prompts that produced the research. The messy ones are often the most important.
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
