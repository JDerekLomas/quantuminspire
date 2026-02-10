'use client'

import dynamic from 'next/dynamic'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import ScrollReveal from '@/components/ScrollReveal'
import Timeline from '@/components/Timeline'
import StakeholderMap from '@/components/StakeholderMap'
import VibecodingSection from '@/components/VibecodingSection'

const QuantumField = dynamic(() => import('@/components/QuantumField'), {
  ssr: false,
})

function SectionLabel({ children, color = '#00d4ff' }: { children: string; color?: string }) {
  return (
    <span
      className="inline-block font-mono text-xs font-semibold tracking-[0.2em] uppercase mb-4"
      style={{ color }}
    >
      {children}
    </span>
  )
}

function Divider() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-px h-16 bg-gradient-to-b from-transparent via-[#1e293b] to-transparent" />
    </div>
  )
}

export default function WP44Page() {
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0])
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100])

  return (
    <div className="min-h-screen">
      {/* ============================================ */}
      {/* HERO */}
      {/* ============================================ */}
      <section ref={heroRef} className="relative h-screen flex items-center justify-center overflow-hidden">
        <QuantumField />

        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 text-center px-6 max-w-4xl"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <SectionLabel>WP4.4 — Quantum Inspire</SectionLabel>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-6"
          >
            <span className="text-white">Designing</span>
            <br />
            <span className="gradient-text">Quantum</span>
            <br />
            <span className="text-white">for Everyone</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
          >
            Quantum computing is ready for its design moment. Through human-centered research
            and new interaction paradigms, we&apos;re opening{' '}
            <a
              href="https://www.quantum-inspire.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00d4ff] hover:underline"
            >
              Quantum Inspire
            </a>{' '}
            to the world.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="mt-12 flex justify-center gap-4"
          >
            <a
              href="#opportunity"
              className="px-6 py-3 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff] font-mono text-sm hover:bg-[#00d4ff]/20 transition-all duration-300"
            >
              The Opportunity
            </a>
            <a
              href="#vibecoding"
              className="px-6 py-3 rounded-lg bg-white/5 border border-white/10 text-gray-300 font-mono text-sm hover:bg-white/10 transition-all duration-300"
            >
              Quantum Vibecoding
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-5 h-8 rounded-full border border-gray-600 flex items-start justify-center pt-1.5"
          >
            <div className="w-1 h-1.5 rounded-full bg-gray-400" />
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================ */}
      {/* PARTNERS BAR */}
      {/* ============================================ */}
      <section className="relative py-12 border-y border-[#1e293b]/50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            {['TU Delft', 'QuTech', 'TNO', 'THUAS', 'Quantum Inspire'].map((name) => (
              <span key={name} className="font-mono text-xs tracking-widest text-gray-500 uppercase">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* THE OPPORTUNITY */}
      {/* ============================================ */}
      <section id="opportunity" className="py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <ScrollReveal>
            <SectionLabel>The Opportunity</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 leading-tight">
              Design is quantum computing&apos;s<br />
              <span className="gradient-text">missing superpower.</span>
            </h2>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-12 mt-12">
            <ScrollReveal delay={0.1}>
              <div className="space-y-6">
                <p className="text-gray-300 leading-relaxed">
                  Quantum computing has reached a turning point. The hardware works. The algorithms exist.
                  But the quantum ecosystem faces a critical skills gap — and it&apos;s not a physics
                  problem. It&apos;s a <span className="text-white font-medium">design problem</span>.
                </p>
                <p className="text-gray-400 leading-relaxed">
                  Premier design venues — CHI, DIS, UIST — have barely engaged with quantum technologies.
                  The field of quantum computing has evolved almost entirely without input from designers,
                  UX researchers, or interaction specialists. This represents an enormous untapped opportunity.
                </p>
                <p className="text-gray-400 leading-relaxed">
                  Research shows that people with computing backgrounds can grasp quantum concepts
                  through the right metaphors and interactions — <span className="text-[#00ff88]">without studying physics first</span>.
                  What&apos;s been missing isn&apos;t intelligence or preparation. It&apos;s design.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="space-y-6">
                {/* Opportunity cards */}
                {[
                  {
                    title: 'A new audience is waiting',
                    desc: 'Millions of software developers already have the computational thinking skills to work with quantum systems. They just need interfaces that speak their language.',
                    color: '#00d4ff',
                  },
                  {
                    title: 'Metaphors unlock understanding',
                    desc: 'Well-designed metaphors score 4.0/5 on explainability but only 2.6/5 on actionability. The design opportunity: make quantum concepts not just understandable, but usable.',
                    color: '#8b5cf6',
                  },
                  {
                    title: 'AI changes everything',
                    desc: 'Generative AI can now translate natural language into working quantum circuits — collapsing the expertise barrier entirely and opening quantum to anyone who can describe what they want to compute.',
                    color: '#00ff88',
                  },
                ].map((opp) => (
                  <div
                    key={opp.title}
                    className="p-5 rounded-xl border bg-[#111827]/30"
                    style={{ borderColor: `${opp.color}20` }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full mb-3" style={{ backgroundColor: opp.color }} />
                    <h3 className="text-white font-semibold text-sm mb-2">{opp.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{opp.desc}</p>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <Divider />

      {/* ============================================ */}
      {/* QUANTUM COMPUTATIONAL THINKING */}
      {/* ============================================ */}
      <section className="py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <ScrollReveal>
            <SectionLabel color="#8b5cf6">A New Framework</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Quantum Computational Thinking.<br />
              <span className="gradient-text-pink">Computing skills, not physics prerequisites.</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mb-12">
              PhD research at TU Delft proposes a shift: instead of teaching quantum through physics,
              ground it in computational thinking — the skills that developers already have.
              This framework maps quantum concepts against computing practices to create
              new learning pathways.
            </p>
          </ScrollReveal>

          {/* QCT Framework visualization */}
          <ScrollReveal delay={0.1}>
            <div className="p-6 md:p-8 rounded-xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
                <h3 className="text-white font-semibold">QCT Framework — 7 Concepts x 5 Dimensions</h3>
              </div>

              {/* CT Dimensions */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                {[
                  { name: 'Abstraction', skills: 'Categorising, Generalising, Relating', color: '#00d4ff' },
                  { name: 'Algorithmic Thinking', skills: 'Decomposing, Iterating, Structuring', color: '#8b5cf6' },
                  { name: 'Data', skills: 'Identifying types, Interpreting, Transforming', color: '#00ff88' },
                  { name: 'Logic', skills: 'Deducing, Extrapolating, Predicting', color: '#ff8c42' },
                  { name: 'Problem-solving', skills: 'Adjusting approach, Judging outcomes', color: '#ff6b9d' },
                ].map((dim) => (
                  <div
                    key={dim.name}
                    className="p-3 rounded-lg border bg-[#0a0a1a]/50"
                    style={{ borderColor: `${dim.color}30` }}
                  >
                    <span className="text-xs font-semibold block mb-1" style={{ color: dim.color }}>
                      {dim.name}
                    </span>
                    <span className="text-gray-500 text-[10px] leading-tight block">{dim.skills}</span>
                  </div>
                ))}
              </div>

              {/* QC Concepts mapped to complexity */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-3">
                  Quantum Concepts by Complexity
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Algorithms', complexity: 'high', color: '#ff6b9d' },
                    { name: 'Gate Operations', complexity: 'high', color: '#ff6b9d' },
                    { name: 'Qubits', complexity: 'medium', color: '#ff8c42' },
                    { name: 'Measurement', complexity: 'low', color: '#00ff88' },
                    { name: 'Probability', complexity: 'low', color: '#00ff88' },
                    { name: 'Entanglement', complexity: 'low', color: '#00ff88' },
                    { name: 'Superposition', complexity: 'low', color: '#00ff88' },
                  ].map((concept) => (
                    <span
                      key={concept.name}
                      className="px-3 py-1.5 rounded-full border text-xs font-mono"
                      style={{ borderColor: `${concept.color}40`, color: concept.color }}
                    >
                      {concept.name}
                      <span className="text-gray-600 ml-1.5">{concept.complexity}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-[#0a0a1a]/50 border border-[#1e293b]">
                <p className="text-gray-400 text-sm leading-relaxed">
                  <span className="text-white font-medium">Key insight:</span> Educators suggested an
                  inverse approach — start with <span className="text-[#ff6b9d]">higher-complexity</span> concepts
                  like algorithms and gates that connect to existing computing knowledge, rather than the
                  traditional physics-first approach starting from superposition. Meet learners where they
                  already are.
                </p>
              </div>
            </div>
          </ScrollReveal>

          {/* Metaphor design */}
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <ScrollReveal delay={0.2}>
              <div className="p-6 rounded-xl border border-[#1e293b] bg-[#111827]/30 h-full">
                <h3 className="text-white font-semibold mb-4">Metaphors that work</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                  The research developed a structured method for creating quantum metaphors that are
                  grounded in computing, not physics. Each metaphor uses tangible features and actions
                  from everyday experience:
                </p>
                <div className="space-y-3">
                  {[
                    { concept: 'Qubits', metaphor: 'Coloured cells in a grid', color: '#00d4ff' },
                    { concept: 'Superposition', metaphor: 'A colour gradient applied to a cell', color: '#8b5cf6' },
                    { concept: 'Measurement', metaphor: 'Setting a colour to a point on a gradient', color: '#00ff88' },
                    { concept: 'Entanglement', metaphor: 'Increasing opacity of adjacent cells', color: '#ff8c42' },
                    { concept: 'Gate operations', metaphor: 'Formatting cells in a grid', color: '#ff6b9d' },
                    { concept: 'Algorithms', metaphor: 'Refining a route to an optimal location', color: '#94a3b8' },
                  ].map((m) => (
                    <div key={m.concept} className="flex items-start gap-3 text-sm">
                      <span className="font-mono text-xs w-28 flex-shrink-0 pt-0.5" style={{ color: m.color }}>
                        {m.concept}
                      </span>
                      <span className="text-gray-300">{m.metaphor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="p-6 rounded-xl border border-[#1e293b] bg-[#111827]/30 h-full">
                <h3 className="text-white font-semibold mb-4">Six criteria for metaphor quality</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                  Not all metaphors are equal. The research established six criteria to evaluate
                  whether a metaphor actually enables quantum understanding:
                </p>
                <div className="space-y-3">
                  {[
                    { label: 'Accurate', score: '3.58', desc: 'Faithfully conveys the target concept' },
                    { label: 'Complete', score: '3.16', desc: 'Covers the concept comprehensively' },
                    { label: 'Explainable', score: '4.01', desc: 'Educators can communicate it readily' },
                    { label: 'Understandable', score: '3.71', desc: 'Learners grasp it intuitively' },
                    { label: 'Relatable', score: '3.79', desc: 'Draws on familiar, tangible experience' },
                    { label: 'Actionable', score: '2.64', desc: 'Suggests what you can do with it', highlight: true },
                  ].map((c) => (
                    <div key={c.label} className="flex items-center gap-3">
                      <div className="w-20 flex-shrink-0">
                        <span className={`text-sm font-medium ${c.highlight ? 'text-[#ff8c42]' : 'text-white'}`}>
                          {c.label}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(parseFloat(c.score) / 5) * 100}%`,
                              backgroundColor: c.highlight ? '#ff8c42' : '#00d4ff',
                            }}
                          />
                        </div>
                      </div>
                      <span className={`font-mono text-xs w-8 text-right ${c.highlight ? 'text-[#ff8c42]' : 'text-gray-400'}`}>
                        {c.score}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-lg bg-[#ff8c42]/5 border border-[#ff8c42]/20">
                  <p className="text-[#ff8c42] text-xs leading-relaxed">
                    The actionability gap is the design opportunity: current metaphors help people
                    understand quantum, but don&apos;t show them what they can <em>do</em>.
                    This is exactly what interface design can solve.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <Divider />

      {/* ============================================ */}
      {/* DESIGN'S QUANTUM MOMENT */}
      {/* ============================================ */}
      <section className="py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <ScrollReveal>
            <SectionLabel color="#00ff88">Design&apos;s Quantum Moment</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Every emerging technology<br />
              <span className="gradient-text-green">needs its design revolution.</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mb-12">
              Personal computing had Xerox PARC. The web had its usability pioneers.
              Mobile had responsive design. Quantum computing is waiting for designers
              to step in — and the door is wide open.
            </p>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'The vocabulary gap',
                opportunity: 'Quantum scientists use "design" to mean engineering. Designers use it to mean human-centered experience. Bridging this vocabulary creates a powerful new collaboration space.',
                color: '#00d4ff',
              },
              {
                title: 'The HCI frontier',
                opportunity: 'Of 26 works citing the 2019 CHI call-to-action for HCI in quantum, only 5 were published at design venues. The field is wide open for designers who show up.',
                color: '#8b5cf6',
              },
              {
                title: 'Democratization through interaction',
                opportunity: 'What made computing universal wasn\'t faster chips — it was GUIs, mice, and touchscreens. Quantum needs its equivalent interaction breakthrough.',
                color: '#00ff88',
              },
            ].map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 0.1}>
                <div
                  className="p-6 rounded-xl border bg-[#111827]/30 h-full"
                  style={{ borderColor: `${item.color}20` }}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${item.color}40, transparent)` }}
                  />
                  <h3 className="text-white font-semibold mb-3">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.opportunity}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Quote callout */}
          <ScrollReveal delay={0.3}>
            <blockquote className="mt-12 p-8 rounded-xl border border-[#00ff88]/20 bg-[#00ff88]/5 relative">
              <div className="text-[#00ff88]/20 text-6xl font-serif absolute top-4 left-6">&ldquo;</div>
              <p className="text-gray-300 text-lg leading-relaxed italic relative z-10 pl-8">
                We have discussed multiple opportunities for design to contribute to the quantum ecosystem:
                developing accessible framings of quantum concepts, creating new ways of interacting with
                quantum computing systems, and thus supporting emerging audiences in engaging with quantum
                computing.
              </p>
              <footer className="mt-4 pl-8 text-gray-500 text-sm font-mono">
                — PhD thesis on Quantum Computational Thinking, TU Delft
              </footer>
            </blockquote>
          </ScrollReveal>
        </div>
      </section>

      <Divider />

      {/* ============================================ */}
      {/* STAKEHOLDERS */}
      {/* ============================================ */}
      <section className="py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <ScrollReveal>
            <SectionLabel color="#ff8c42">Collaboration</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Designers, physicists, engineers.<br />
              <span className="text-gray-500">Building together.</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mb-16">
              WP4.4 brings industrial design engineers, user experience designers, and quantum
              physicists into iterative co-design with societal, educational, and industrial
              stakeholders — using input from user needs research (WP5.1) and real use cases (WP5.2).
            </p>
          </ScrollReveal>

          <StakeholderMap />
        </div>
      </section>

      <Divider />

      {/* ============================================ */}
      {/* DESIGN INSPIRATION */}
      {/* ============================================ */}
      <section className="py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <ScrollReveal>
            <SectionLabel color="#ff6b9d">Design Inspiration</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Learning from the best.<br />
              <span className="text-gray-500">Award-winning web design, 2022.</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mb-12">
              The redesign draws from cutting-edge web design recognized by Awwwards in 2022 —
              immersive experiences, dark interfaces, bold typography, and motion-driven storytelling.
            </p>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'KPRVerse by Resn',
                award: 'Site of the Year 2022',
                takeaway: 'Immersive storytelling with captivating animation. Balance of aesthetics and functionality through motion design.',
                color: '#00d4ff',
                url: 'https://www.awwwards.com/annual-awards-2022/site-of-the-year',
              },
              {
                title: 'Synchronized Studio',
                award: 'Studio of the Year 2022',
                takeaway: 'Bold, type-driven visual identities. 7 Site of the Day awards with signature motion-driven design approach.',
                color: '#8b5cf6',
                url: 'https://www.awwwards.com/annual-awards-2022/studio-of-the-year',
              },
              {
                title: 'De Voorhoede x QI',
                award: 'Quantum Inspire Redesign',
                takeaway: 'Vue.js-based quantum editor with real-time visualization. Progressive disclosure for non-expert users. Interactive docs.',
                color: '#00ff88',
                url: 'https://www.voorhoede.nl/en/cases/quantum-inspire/',
              },
            ].map((ref, i) => (
              <ScrollReveal key={ref.title} delay={i * 0.1}>
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group p-6 rounded-xl border border-[#1e293b] bg-[#111827]/30 hover:bg-[#111827]/60 transition-all duration-300 h-full"
                >
                  <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: ref.color }}>
                    {ref.award}
                  </span>
                  <h3 className="text-white font-semibold mt-3 mb-3 group-hover:underline">{ref.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{ref.takeaway}</p>
                </a>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={0.3}>
            <div className="mt-12 p-6 rounded-xl border border-[#1e293b] bg-[#111827]/20">
              <h3 className="text-white font-semibold mb-3">Design principles applied</h3>
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  { label: 'Dark-first', desc: 'Reduces cognitive load for complex technical content' },
                  { label: 'Motion design', desc: 'Guides attention and creates narrative through animation' },
                  { label: 'Type hierarchy', desc: 'Bold headlines, mono technical text, clear information layers' },
                  { label: 'Progressive reveal', desc: 'Show complexity gradually as users build understanding' },
                ].map((p) => (
                  <div key={p.label}>
                    <span className="text-white text-sm font-medium">{p.label}</span>
                    <p className="text-gray-500 text-xs mt-1">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <Divider />

      {/* ============================================ */}
      {/* TIMELINE */}
      {/* ============================================ */}
      <section className="py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <ScrollReveal>
            <SectionLabel color="#ff8c42">Expected Output</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
              48-month roadmap.<br />
              <span className="text-gray-500">From first prototype to PhD thesis.</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mb-16">
              A structured research timeline spanning publications, software releases,
              hardware upgrades, and interface iterations.
            </p>
          </ScrollReveal>

          <Timeline />
        </div>
      </section>

      <Divider />

      {/* ============================================ */}
      {/* QUANTUM VIBECODING */}
      {/* ============================================ */}
      <section id="vibecoding" className="py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <ScrollReveal>
            <SectionLabel color="#00ff88">What&apos;s Possible Now</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Quantum Vibecoding.<br />
              <span className="gradient-text-green">The ultimate accessibility breakthrough.</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mb-12">
              The QCT thesis asked: how do we make quantum concepts actionable?
              Generative AI provides one answer: skip the syntax entirely. Describe what you
              want to compute in natural language, and AI translates it into working quantum
              circuits running on real hardware through Quantum Inspire.
            </p>
          </ScrollReveal>

          <VibecodingSection />

          <ScrollReveal delay={0.4}>
            <div className="mt-16 p-8 rounded-xl border border-[#00ff88]/20 bg-[#00ff88]/5">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <h3 className="text-white text-xl font-bold mb-2">
                    This site is the proof.
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    This entire website — 3D quantum visualization, scroll animations, responsive
                    design — was built through vibecoding: human intent translated by AI into
                    working code. The same paradigm now works for quantum circuits. Design is
                    no longer the bottleneck. Imagination is the only limit.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <a
                    href="https://www.quantum-inspire.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] font-mono text-sm hover:bg-[#00ff88]/20 transition-all duration-300"
                  >
                    Try Quantum Inspire
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clipRule="evenodd" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ============================================ */}
      {/* FOOTER */}
      {/* ============================================ */}
      <footer className="border-t border-[#1e293b]/50 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <span className="font-mono text-xs text-[#00d4ff] tracking-widest">WP4.4</span>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                UX and UI redesign for society.
                Part of the Quantum Inspire research program.
              </p>
            </div>
            <div>
              <span className="font-mono text-xs text-gray-500 tracking-widest">PARTNERS</span>
              <div className="mt-2 space-y-1">
                {[
                  { name: 'TU Delft — IDE', url: 'https://www.tudelft.nl' },
                  { name: 'QuTech', url: 'https://qutech.nl' },
                  { name: 'Quantum Inspire', url: 'https://www.quantum-inspire.com' },
                  { name: 'THUAS', url: 'https://www.thuas.com' },
                ].map((p) => (
                  <a
                    key={p.name}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-gray-400 text-sm hover:text-[#00d4ff] transition-colors"
                  >
                    {p.name}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <span className="font-mono text-xs text-gray-500 tracking-widest">REFERENCES</span>
              <div className="mt-2 space-y-1">
                {[
                  { name: 'Awwwards 2022 Winners', url: 'https://www.awwwards.com/annual-awards-2022/' },
                  { name: 'QI Interface Case Study', url: 'https://www.voorhoede.nl/en/cases/quantum-inspire/' },
                  { name: 'IBM Quantum Design', url: 'https://www.ibm.com/design/impact/quantum/' },
                  { name: 'IonQ Design Award', url: 'https://ifdesign.com/en/winner-ranking/project/the-ionq-quantum-computer/697911' },
                ].map((r) => (
                  <a
                    key={r.name}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-gray-400 text-sm hover:text-[#00d4ff] transition-colors"
                  >
                    {r.name}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-[#1e293b]/30 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-xs font-mono">
              Built with quantum vibecoding — AI + human collaboration
            </p>
            <p className="text-gray-600 text-xs font-mono">
              TU Delft / QuTech / TNO / THUAS
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
