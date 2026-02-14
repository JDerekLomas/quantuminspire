import { C } from '../lib/helpers'

export const FRAMEWORK = [
  { device: 'Ambiguity', gate: 'Superposition', why: 'A word means two things at once. A qubit is two states at once. Both collapse when you look.' },
  { device: 'Rhyme', gate: 'Entanglement', why: 'Two distant words become bound by sound. Hear one and you already know something about the other, no matter how far apart they are.' },
  { device: 'Metaphor', gate: 'CNOT gate', why: '"My love is a red rose" — now love and rose are entangled. You can\'t read one without the other changing.' },
  { device: 'Enjambment', gate: 'Delayed measurement', why: 'The line breaks before the meaning resolves. You hold the superposition across the white space, then the next line collapses it.' },
  { device: 'Volta', gate: 'Hadamard gate', why: 'The sonnet\'s turn: everything you\'ve read is re-measured in a new basis. Same words, different meaning.' },
  { device: 'Repetition', gate: 'Measure-rotate-remeasure', why: 'A refrain returns but the poem has changed around it, so the same words give a different reading.' },
  { device: 'Allusion', gate: 'Entanglement with external system', why: 'The poem becomes correlated with another text. Read one and the other haunts it.' },
  { device: 'Tone', gate: 'Phase', why: 'Two poems can use the same words at the same frequency and mean opposite things. Tone is invisible to counting — it only shows up in how meanings interfere.' },
  { device: 'Formal constraint', gate: 'Hilbert space dimension', why: 'A sonnet has 14 lines. A haiku has 17 syllables. Restriction makes what emerges more meaningful, not less.' },
  { device: 'Poetic structure', gate: 'Entanglement across subsystems', why: 'The first and last lines of a poem echo each other while the middle lines stand alone. In the circuit, Bell pairs bind distant qubits while the middle qubits stay unentangled — the correlation is structural, not carried line-by-line.' },
]

export const PHASES = [
  {
    label: 'Phase 1: Foundations',
    items: [
      { text: 'Word bank construction', done: true },
      { text: 'lambeq exploration', done: false },
      { text: 'Classical vs. quantum baseline', done: false },
    ],
  },
  {
    label: 'Phase 2: Core Experiments',
    items: [
      { text: 'Complementary poems (Z/X basis)', done: true },
      { text: 'Entangled couplets (Bell pairs)', done: true },
      { text: 'Quantum-temperature poetry', done: false },
      { text: 'Decoherence gradient', done: true },
    ],
  },
  {
    label: 'Phase 3: Advanced',
    items: [
      { text: 'Circuit poem (circuit = score)', done: false },
      { text: 'Interference draft', done: true },
      { text: 'lambeq poetry encoding', done: false },
      { text: 'Non-local poem (Bell poetry)', done: true },
    ],
  },
  {
    label: 'Phase 4: Synthesis',
    items: [
      { text: 'Interactive web experience', done: true },
      { text: 'Research paper', done: false },
      { text: 'Exhibition / live performance', done: false },
      { text: 'Open-source release', done: false },
    ],
  },
]

export const QUESTIONS = [
  'Can you feel the difference? If we show readers quantum-entangled poems and classically-random poems, can they tell which is which?',
  'Can a quantum circuit encode a poem\'s meaning — not just generate words, but represent the semantic structure of a sentence as a quantum state?',
  'Can we prove a poem is non-classical? Bell inequality violations certify that correlations are stronger than any classical process could produce. Can the same test certify a poem?',
  'What happens when quantum measurements control an LLM\'s temperature — the wildness of its word choices — with entanglement enforcing structure across lines?',
  'Is decoherence just a metaphor for losing meaning, or can we use it as an editing tool — watching a poem dissolve to find which parts survive?',
  'Can a quantum circuit diagram work as a musical score for poetry — a notation system where the circuit is the poem and each execution is a performance?',
]
