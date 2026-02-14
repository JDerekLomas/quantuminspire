'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

// ============================================================
// SCROLL HOOK
// ============================================================

function useInView(threshold = 0.3) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

// ============================================================
// WORD BANKS (Marriage experiment)
// ============================================================

const TENDERNESS_LINES = {
  line1: [
    'your hand finds mine',
    'the children sleeping',
    'seventeen winters',
    'you laugh and I remember',
    'the kitchen light still on',
    'your breathing in the dark',
    'we built this room together',
    'I know your silences',
  ],
  line2: [
    'and something holds that should have broken',
    'the years have made us porous to each other',
    'I trace the atlas of your changing face',
    'the fractures are the places where light enters',
    'we speak a language no one else can hear',
    'the bed remembers every shape we\'ve been',
    'four lives grew upward from this tangled root',
    'the ordinary days are what I\'ll grieve',
  ],
  line3: [
    'still, your warmth',
    'the door left open',
    'bread on the table',
    'your scent, the sheets',
    'a hand-worn ring',
    'roots under stone',
    'two clocks, one time',
    'the long way home',
  ],
}

const RESENTMENT_LINES = {
  line1: [
    'your silence fills the room',
    'the children watch us watching',
    'seventeen years of this',
    'you talk and I stop hearing',
    'the kitchen light, still on',
    'your breathing keeps me up',
    'we built these walls together',
    'I know your evasions',
  ],
  line2: [
    'and something stays that should have left by now',
    'the years have worn us thin as excuses',
    'I count the ways your face has disappointed',
    'the fractures are just fractures, nothing more',
    'we speak the same exhausted arguments',
    'the bed remembers every turned-away back',
    'four lives demand more than this hollow truce',
    'the ordinary days are all there is',
  ],
  line3: [
    'still, your weight',
    'the door slammed shut',
    'crumbs on the table',
    'your snore, the sheets',
    'a hand-worn groove',
    'walls closing in',
    'two clocks, no time',
    'the long way round',
  ],
}

// ============================================================
// ENTANGLED POEM BUILDER DATA
// ============================================================

const ENTANGLED_LINES = [
  { first: 'the sea at morning', last: 'salt still on my lips' },
  { first: 'a door left open', last: 'the threshold worn smooth' },
  { first: 'your name in my mouth', last: 'the echo, the echo' },
  { first: 'the winter field', last: 'one crow, then silence' },
  { first: 'hands in dark water', last: 'the river knew my name' },
  { first: 'a match struck once', last: 'smoke still in the rafters' },
  { first: 'the year turns over', last: 'same clock, new shadows' },
  { first: 'two chairs, the porch', last: 'one of them empty' },
]

const FREE_MIDDLES = [
  'and something passes between us without a word',
  'the distance closes like a fist',
  'I held it longer than I meant to',
  'the years collect like water in a bowl',
  'what was said still hangs in the room',
  'the light shifts but the shadows stay',
  'I knew this even then, I think',
  'nothing prepared me for the ordinary',
]

// Hardware distribution from Tuna-9 Bell test (2026-02-14)
// BELL_MATRIX[first][last] = shot count. 4,096 total shots, 86.7% correlation rate.
// CHSH S = 2.54 ± 0.01 (38.8σ above classical bound of 2.0)
const BELL_MATRIX = [
  [487, 25, 14, 2, 21, 0, 2, 0],
  [12, 437, 0, 11, 0, 18, 0, 2],
  [17, 4, 461, 21, 4, 0, 13, 0],
  [1, 21, 15, 437, 0, 4, 1, 31],
  [29, 3, 0, 1, 445, 29, 12, 0],
  [1, 31, 0, 3, 14, 440, 0, 22],
  [1, 0, 27, 2, 14, 0, 448, 29],
  [0, 3, 0, 47, 0, 15, 23, 396],
]

// ============================================================
// TOP POEMS (pre-computed from hardware results)
// ============================================================

const TOP_Z = [
  { lines: ['your hand finds mine', 'and something holds that should have broken', 'still, your warmth'], count: 337, prob: 0.0823 },
  { lines: ['your hand finds mine', 'I trace the atlas of your changing face', 'still, your warmth'], count: 204, prob: 0.0498 },
  { lines: ['your hand finds mine', 'and something holds that should have broken', 'a hand-worn ring'], count: 174, prob: 0.0425 },
  { lines: ['your hand finds mine', 'I trace the atlas of your changing face', 'a hand-worn ring'], count: 147, prob: 0.0359 },
  { lines: ['the kitchen light still on', 'and something holds that should have broken', 'still, your warmth'], count: 137, prob: 0.0334 },
  { lines: ['your hand finds mine', 'and something holds that should have broken', 'the door left open'], count: 124, prob: 0.0303 },
  { lines: ['your hand finds mine', 'I trace the atlas of your changing face', 'the door left open'], count: 93, prob: 0.0227 },
  { lines: ['the children sleeping', 'and something holds that should have broken', 'still, your warmth'], count: 91, prob: 0.0222 },
  { lines: ['the kitchen light still on', 'I trace the atlas of your changing face', 'still, your warmth'], count: 90, prob: 0.022 },
  { lines: ['the kitchen light still on', 'and something holds that should have broken', 'a hand-worn ring'], count: 84, prob: 0.0205 },
]

const TOP_X = [
  { lines: ['your silence fills the room', 'and something stays that should have left by now', 'still, your weight'], count: 396, prob: 0.0967 },
  { lines: ['seventeen years of this', 'and something stays that should have left by now', 'crumbs on the table'], count: 331, prob: 0.0808 },
  { lines: ['your silence fills the room', 'the years have worn us thin as excuses', 'still, your weight'], count: 296, prob: 0.0723 },
  { lines: ['your silence fills the room', 'I count the ways your face has disappointed', 'still, your weight'], count: 259, prob: 0.0632 },
  { lines: ['your silence fills the room', 'and something stays that should have left by now', 'crumbs on the table'], count: 232, prob: 0.0566 },
  { lines: ['seventeen years of this', 'the years have worn us thin as excuses', 'crumbs on the table'], count: 223, prob: 0.0544 },
  { lines: ['seventeen years of this', 'and something stays that should have left by now', 'still, your weight'], count: 194, prob: 0.0474 },
  { lines: ['your silence fills the room', 'the fractures are just fractures, nothing more', 'still, your weight'], count: 149, prob: 0.0364 },
  { lines: ['seventeen years of this', 'I count the ways your face has disappointed', 'crumbs on the table'], count: 139, prob: 0.0339 },
  { lines: ['seventeen years of this', 'the years have worn us thin as excuses', 'still, your weight'], count: 137, prob: 0.0334 },
]

const TOP_GHZ = [
  { lines: ['your hand finds mine', 'and something holds that should have broken', 'still, your warmth'], count: 1427, prob: 0.3484 },
  { lines: ['I know your silences', 'the ordinary days are what I\'ll grieve', 'the long way home'], count: 936, prob: 0.2285 },
  { lines: ['the kitchen light still on', 'and something holds that should have broken', 'still, your warmth'], count: 360, prob: 0.0879 },
  { lines: ['you laugh and I remember', 'the ordinary days are what I\'ll grieve', 'the long way home'], count: 297, prob: 0.0725 },
]

// ============================================================
// RAW DISTRIBUTIONS (bitstring -> count, for weighted sampling)
// ============================================================

const DIST_Z: Record<string, number> = {"000000000":337,"000000001":91,"000000010":70,"000000011":15,"000000100":31,"000000101":13,"000000110":8,"000000111":5,"000001000":137,"000001001":39,"000001010":25,"000001011":9,"000001100":11,"000001101":2,"000001110":1,"000001111":1,"000010000":204,"000010001":62,"000010010":45,"000010011":8,"000010100":31,"000010101":12,"000010110":6,"000010111":1,"000011000":90,"000011001":30,"000011010":20,"000011011":8,"000011100":9,"000011101":4,"000100000":124,"000100001":39,"000100010":20,"000100011":1,"000100100":14,"000100101":2,"000100110":2,"000100111":1,"000101000":58,"000101001":9,"000101010":7,"000101011":3,"000101100":4,"000101101":1,"000110000":93,"000110001":28,"000110010":15,"000110011":5,"000110100":17,"000110101":3,"000110110":4,"000111000":40,"000111001":8,"000111010":5,"000111100":6,"000111101":3,"001000000":83,"001000001":24,"001000010":8,"001000011":3,"001000100":6,"001000101":2,"001000110":1,"001000111":2,"001001000":31,"001001001":9,"001001010":3,"001001011":1,"001001100":1,"001010000":54,"001010001":15,"001010010":12,"001010011":2,"001010100":4,"001010101":2,"001010110":1,"001011000":23,"001011001":4,"001011010":1,"001011011":2,"001011100":2,"001011110":1,"001100000":31,"001100001":9,"001100010":5,"001100011":2,"001100100":6,"001100101":2,"001100110":1,"001101000":13,"001101001":8,"001101010":2,"001101011":1,"001101100":1,"001110000":25,"001110001":9,"001110010":2,"001110100":5,"001111000":8,"001111001":2,"001111010":2,"010000000":38,"010000001":15,"010000010":4,"010000100":6,"010000101":1,"010001000":23,"010001001":6,"010001010":2,"010001011":3,"010001100":1,"010010000":39,"010010001":10,"010010010":3,"010010011":2,"010010100":5,"010010101":4,"010010110":1,"010011000":17,"010011001":3,"010011010":3,"010011101":2,"010011110":1,"010100000":17,"010100001":2,"010100010":8,"010100100":3,"010100101":3,"010101000":11,"010101001":2,"010101010":1,"010110000":12,"010110001":3,"010110010":2,"010110100":2,"010111000":7,"010111001":1,"010111100":1,"011000000":9,"011000001":3,"011000010":1,"011000011":1,"011001000":4,"011001001":2,"011001010":1,"011001100":1,"011010000":6,"011010001":2,"011010010":2,"011010110":1,"011011000":5,"011011001":1,"011011011":1,"011011101":1,"011100000":7,"011100001":2,"011100010":1,"011100100":1,"011101000":2,"011101001":1,"011110000":6,"011110010":1,"100000000":174,"100000001":78,"100000010":28,"100000011":9,"100000100":21,"100000101":5,"100000110":4,"100000111":1,"100001000":84,"100001001":23,"100001010":12,"100001011":7,"100001100":9,"100001101":3,"100001110":2,"100010000":147,"100010001":38,"100010010":15,"100010011":9,"100010100":13,"100010101":4,"100010110":4,"100011000":58,"100011001":13,"100011010":13,"100011011":2,"100011100":8,"100011110":3,"100100000":65,"100100001":19,"100100010":13,"100100011":1,"100100100":7,"100100110":1,"100101000":41,"100101001":5,"100101010":3,"100101011":3,"100101100":2,"100101101":2,"100101110":1,"100110000":49,"100110001":14,"100110010":11,"100110011":3,"100110100":9,"100110110":2,"100111000":22,"100111001":8,"100111010":1,"100111011":2,"100111100":3,"101000000":33,"101000001":16,"101000010":10,"101000011":5,"101000100":5,"101000101":1,"101000110":1,"101001000":20,"101001001":5,"101001010":5,"101001011":2,"101001100":1,"101010000":38,"101010001":6,"101010010":7,"101010011":3,"101010100":3,"101010101":6,"101011000":11,"101011001":5,"101011010":2,"101011100":2,"101100000":13,"101100001":2,"101100010":3,"101100100":1,"101101000":4,"101101010":2,"101101100":1,"101110000":9,"101110001":6,"101110011":1,"101110100":1,"101110101":1,"101111000":7,"101111001":1,"101111100":1,"101111110":1,"110000000":19,"110000001":8,"110000010":4,"110000011":1,"110000100":5,"110000101":1,"110001000":14,"110001001":1,"110001010":3,"110001100":3,"110001101":1,"110010000":18,"110010001":5,"110010010":3,"110010011":1,"110010100":6,"110010101":1,"110011000":4,"110011001":4,"110011010":3,"110011011":2,"110100000":14,"110100001":3,"110100010":2,"110100011":3,"110100100":1,"110100110":1,"110101000":5,"110101001":1,"110101010":3,"110101100":1,"110110000":6,"110110001":1,"110110010":2,"110110011":1,"110110100":1,"110111000":2,"110111001":2,"111000000":6,"111000001":2,"111000010":1,"111000100":1,"111000101":1,"111001000":2,"111001001":1,"111010000":5,"111010001":1,"111011000":1,"111011001":1,"111011010":1,"111100000":1,"111100001":2,"111101000":2,"111110000":2,"111111000":1}

const DIST_X: Record<string, number> = {"000000000":396,"000000001":53,"000000010":194,"000000011":32,"000000100":296,"000000101":9,"000000110":137,"000000111":9,"000001000":19,"000001001":4,"000001010":10,"000001100":10,"000001110":6,"000001111":1,"000010000":259,"000010001":24,"000010010":14,"000010011":2,"000010100":149,"000010101":12,"000010110":10,"000011000":7,"000011001":1,"000011010":1,"000011100":4,"000100000":51,"000100001":50,"000100010":24,"000100011":18,"000100100":9,"000100101":18,"000100110":9,"000100111":13,"000101000":1,"000101001":2,"000110000":30,"000110001":24,"000110010":1,"000110011":2,"000110100":6,"000110101":10,"000111000":1,"000111001":3,"001000000":71,"001000001":10,"001000010":23,"001000011":4,"001000100":48,"001000101":2,"001000110":19,"001001000":1,"001001011":1,"001001100":1,"001010000":38,"001010001":3,"001010010":2,"001010011":1,"001010100":20,"001010101":4,"001011100":2,"001100000":5,"001100001":6,"001100010":4,"001100011":2,"001100100":3,"001100101":2,"001100110":1,"001100111":1,"001101100":1,"001110000":1,"001110001":2,"001110100":1,"001110101":2,"001111001":1,"010000000":232,"010000001":30,"010000010":331,"010000011":37,"010000100":128,"010000101":11,"010000110":223,"010000111":9,"010001000":7,"010001001":1,"010001010":11,"010001100":7,"010001110":8,"010001111":1,"010010000":16,"010010001":4,"010010010":139,"010010011":13,"010010100":16,"010010101":1,"010010110":77,"010010111":6,"010011000":1,"010011010":3,"010011011":2,"010011100":2,"010011110":3,"010100000":20,"010100001":16,"010100010":42,"010100011":33,"010100100":9,"010100101":7,"010100110":11,"010100111":19,"010101000":1,"010101001":2,"010101011":1,"010101100":1,"010101110":1,"010110000":3,"010110001":5,"010110010":19,"010110011":15,"010110110":6,"010110111":4,"010111011":2,"011000000":39,"011000001":6,"011000010":41,"011000011":6,"011000100":20,"011000110":25,"011001010":2,"011001100":1,"011001110":3,"011010000":1,"011010010":14,"011010011":2,"011010100":6,"011010110":15,"011010111":3,"011011000":1,"011011010":2,"011011110":2,"011100000":3,"011100001":4,"011100010":6,"011100011":7,"011100100":1,"011100101":1,"011100110":1,"011100111":2,"011101010":1,"011110000":1,"011110001":3,"011110010":3,"011110111":2,"100000000":15,"100000001":1,"100000010":5,"100000011":1,"100000100":6,"100000101":2,"100000110":9,"100000111":1,"100010000":4,"100010100":4,"100010110":1,"100100000":1,"100100001":2,"100110001":1,"100110010":1,"101000000":2,"101000001":1,"101000010":2,"101000100":2,"101010000":2,"101100011":2,"101110101":1,"110000000":5,"110000001":1,"110000010":13,"110000011":2,"110000100":4,"110000101":1,"110000110":3,"110001000":1,"110001001":1,"110001110":1,"110010010":6,"110010110":3,"110011010":1,"110011110":1,"110100011":1,"110100100":1,"110100101":1,"110110000":1,"110110001":1,"110110010":2,"110110011":1,"111000000":2,"111010010":1,"111010011":1,"111010110":1,"111100001":1}

const DIST_GHZ: Record<string, number> = {"000000000":1427,"000000001":7,"000000010":13,"000000100":4,"000000111":1,"000001000":360,"000001001":6,"000001010":5,"000001011":4,"000001100":2,"000001101":1,"000010000":33,"000010001":1,"000011000":7,"000100000":29,"000100001":2,"000100100":14,"000100101":23,"000100110":1,"000100111":12,"000101000":8,"000101001":3,"000101011":2,"000101100":3,"000101101":27,"000101110":3,"000101111":18,"000110000":1,"000110111":4,"000111111":2,"001000000":33,"001000010":1,"001000100":1,"001001000":9,"001001100":1,"001010000":5,"001100000":3,"001100101":1,"001100111":5,"001101011":1,"001101101":2,"001101110":1,"001101111":17,"001111011":1,"001111101":1,"001111110":2,"001111111":26,"010000000":20,"010001000":6,"010010000":1,"010011000":1,"010101111":1,"010110110":1,"010111111":4,"011000000":2,"011000011":1,"011001000":1,"011010000":1,"011010010":4,"011011000":1,"011011010":3,"011011011":1,"011011111":2,"011101111":2,"011110101":3,"011110110":2,"011110111":17,"011111011":6,"011111101":2,"011111110":6,"011111111":55,"100000000":10,"100000001":1,"100001000":3,"100100111":1,"100101011":1,"100101101":1,"100110110":1,"100110111":1,"100111111":4,"101000000":2,"101001000":1,"101011010":1,"101011111":1,"101100000":1,"101100111":1,"101110111":3,"101111011":2,"101111110":5,"101111111":22,"110000000":10,"110001000":5,"110010000":3,"110010010":1,"110010011":1,"110011000":3,"110011010":4,"110011011":1,"110011111":2,"110100111":1,"110101011":2,"110101111":5,"110110011":1,"110110101":2,"110110110":1,"110110111":23,"110111011":6,"110111100":1,"110111101":3,"110111110":6,"110111111":72,"111000000":1,"111000010":2,"111001000":1,"111001010":1,"111001110":2,"111001111":2,"111010000":12,"111010010":19,"111010011":4,"111010100":1,"111010101":2,"111010111":5,"111011000":2,"111011001":2,"111011010":27,"111011011":23,"111011101":1,"111011110":1,"111011111":25,"111100001":1,"111100011":1,"111100110":1,"111100111":3,"111101011":1,"111101110":3,"111101111":20,"111110000":1,"111110001":1,"111110010":1,"111110011":12,"111110101":11,"111110110":18,"111110111":297,"111111000":1,"111111001":3,"111111010":4,"111111011":34,"111111100":4,"111111101":42,"111111110":77,"111111111":936}

// ============================================================
// NOISE POEMS (curated from hardware results)
// ============================================================

const NOISE_POEMS = [
  {
    lines: ['your breathing in the dark', 'the years have made us porous to each other', 'the door left open'],
    count: 27, source: 'GHZ', bitstring: '000101101',
    commentary: 'The GHZ state should produce only all-zeros or all-ones — total tenderness or total resentment. This poem leaked through decoherence into a mixed state. Neither fully tender nor fully distant. The hardware found the ambivalence the circuit tried to forbid.',
  },
  {
    lines: ['we built this room together', 'four lives grew upward from this tangled root', 'two clocks, one time'],
    count: 27, source: 'GHZ', bitstring: '110111010',
    commentary: 'Another impossible GHZ poem. The circuit demanded all-or-nothing; the hardware gave us something in between — a poem about building together that reads as truer than either ideal.',
  },
  {
    lines: ['the children watch us watching', 'and something stays that should have left by now', 'crumbs on the table'],
    count: 50, source: 'X-basis', bitstring: '000100001',
    commentary: 'The Hadamard rotation reshuffles all the probabilities. Most outcomes cluster around the expected resentment poems, but 50 shots landed here — the children as witnesses to something that should have ended.',
  },
  {
    lines: ['seventeen winters', 'the bed remembers every shape we\'ve been', 'roots under stone'],
    count: 7, source: 'Z-basis', bitstring: '101010010',
    commentary: 'Deep in the tail of the distribution. The hardware found this poem 7 times in 4,096 tries — a rare fluctuation that reads as endurance becoming geology.',
  },
  {
    lines: ['you laugh and I remember', 'the ordinary days are what I\'ll grieve', 'the long way home'],
    count: 297, source: 'GHZ', bitstring: '111110111',
    commentary: 'One bit flip from the all-ones ideal. A single qubit error — the sixth qubit decohered — and the poem shifted from the intended version to something gentler. The hardware almost got it right, and the mistake was the better poem.',
  },
]

// ============================================================
// GHZ HAIKU DATA (emulator, experiment1)
// ============================================================

const GHZ_HAIKU = [
  {
    bitstring: '000000000',
    shots: 526,
    poem: ['the winter morning', 'something opens like a wound', 'the salt on my tongue'],
  },
  {
    bitstring: '111111111',
    shots: 498,
    poem: ['along the cliff edge', 'the world holds still and does not speak', 'bone under the snow'],
  },
]

// ============================================================
// BELL COUPLET SAMPLES (emulator, experiment1)
// ============================================================

const BELL_COUPLETS = [
  {
    line1: 'At dawn the rain gathers without a sound',
    line2: 'the morning river finds its way slowly home',
    key: '0000', shots: 65,
  },
  {
    line1: 'At dusk the fire gathers like an open wound',
    line2: 'the evening ember finds its way into the unknown',
    key: '1101', shots: 71,
  },
  {
    line1: 'At dawn the fire scatters without a sound',
    line2: 'the morning ember forgets its name slowly home',
    key: '0110', shots: 68,
  },
  {
    line1: 'At dusk the rain scatters like an open wound',
    line2: 'the evening river forgets its name into the unknown',
    key: '1011', shots: 51,
  },
]

// ============================================================
// CONCEPTUAL FRAMEWORK DATA
// ============================================================

const FRAMEWORK = [
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

// ============================================================
// RESEARCH PHASES
// ============================================================

const PHASES = [
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
      { text: 'Decoherence gradient', done: false },
    ],
  },
  {
    label: 'Phase 3: Advanced',
    items: [
      { text: 'Circuit poem (circuit = score)', done: false },
      { text: 'Interference draft', done: false },
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

// ============================================================
// RESEARCH QUESTIONS
// ============================================================

const QUESTIONS = [
  'Can you feel the difference? If we show readers quantum-entangled poems and classically-random poems, can they tell which is which?',
  'Can a quantum circuit encode a poem\'s meaning — not just generate words, but represent the semantic structure of a sentence as a quantum state?',
  'Can we prove a poem is non-classical? Bell inequality violations certify that correlations are stronger than any classical process could produce. Can the same test certify a poem?',
  'What happens when quantum measurements control an LLM\'s temperature — the wildness of its word choices — with entanglement enforcing structure across lines?',
  'Is decoherence just a metaphor for losing meaning, or can we use it as an editing tool — watching a poem dissolve to find which parts survive?',
  'Can a quantum circuit diagram work as a musical score for poetry — a notation system where the circuit is the poem and each execution is a performance?',
]

// ============================================================
// HELPERS
// ============================================================

function bitstringToPoem(bs: string, bank: typeof TENDERNESS_LINES): string[] {
  const g1 = parseInt(bs.slice(6, 9), 2)
  const g2 = parseInt(bs.slice(3, 6), 2)
  const g3 = parseInt(bs.slice(0, 3), 2)
  return [bank.line1[g1], bank.line2[g2], bank.line3[g3]]
}

function weightedSample(dist: Record<string, number>): { bitstring: string; count: number } {
  const entries = Object.entries(dist)
  const total = entries.reduce((s, [, c]) => s + c, 0)
  let r = Math.random() * total
  for (const [bs, count] of entries) {
    r -= count
    if (r <= 0) return { bitstring: bs, count }
  }
  const last = entries[entries.length - 1]
  return { bitstring: last[0], count: last[1] }
}

// ============================================================
// COLORS
// ============================================================

const C = {
  tenderness: '#00ff88',
  resentment: '#ff6b9d',
  ghz: '#8b5cf6',
  noise: '#ff8c42',
  blue: '#00d4ff',
  pink: '#ff6b9d',
}

// ============================================================
// SECTION: HERO
// ============================================================

function Hero() {
  const { ref, visible } = useInView(0.2)
  return (
    <div ref={ref} className="min-h-[80vh] flex flex-col items-center justify-center px-6 pt-20">
      <div className={`max-w-3xl text-center transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <p className="text-xs font-mono text-gray-600 uppercase tracking-[0.3em] mb-6">
          h + AI + qu
        </p>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
          <span className="gradient-text-pink">Quantum Poetry</span>
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed mb-4 max-w-2xl mx-auto">
          Poetry is the literary form most naturally suited to quantum computation.
        </p>
        <p className="text-gray-500 text-base leading-relaxed max-w-xl mx-auto mb-8">
          A poem holds multiple meanings at once until the reader collapses it into one.
          Its images are entangled &mdash; touch one and the others shift. Its readings
          interfere, amplifying some possibilities and canceling others.
          These aren&apos;t metaphors borrowed from physics. They&apos;re the same operations.
        </p>
        <div className="mt-12 animate-bounce">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto opacity-30">
            <path d="M12 5v14M5 12l7 7 7-7" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SECTION: COMPLEMENTARITY TEASER
// ============================================================

function ComplementarityTeaser() {
  const { ref, visible } = useInView(0.2)
  const [lens, setLens] = useState<'neither' | 'tenderness' | 'resentment'>('neither')

  const tendernessPoem = ['your hand finds mine', 'and something holds that should have broken', 'still, your warmth']
  const resentmentPoem = ['your silence fills the room', 'and something stays that should have left by now', 'still, your weight']

  return (
    <div ref={ref} className="px-4 sm:px-6 py-20">
      <div className={`max-w-2xl mx-auto transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        <p className="text-sm text-gray-500 text-center mb-8">
          Here is a quantum state, prepared on 9 superconducting qubits.
          It contains two poems. You can only read one at a time.
        </p>

        {/* The two lenses */}
        <div className="flex justify-center gap-3 mb-10">
          <button
            onClick={() => setLens(lens === 'tenderness' ? 'neither' : 'tenderness')}
            className="px-5 py-2.5 rounded-full border text-sm font-medium transition-all duration-300"
            style={{
              borderColor: lens === 'tenderness' ? C.tenderness + '80' : '#1e293b',
              backgroundColor: lens === 'tenderness' ? C.tenderness + '15' : 'transparent',
              color: lens === 'tenderness' ? C.tenderness : '#475569',
            }}
          >
            Read with tenderness
          </button>
          <button
            onClick={() => setLens(lens === 'resentment' ? 'neither' : 'resentment')}
            className="px-5 py-2.5 rounded-full border text-sm font-medium transition-all duration-300"
            style={{
              borderColor: lens === 'resentment' ? C.resentment + '80' : '#1e293b',
              backgroundColor: lens === 'resentment' ? C.resentment + '15' : 'transparent',
              color: lens === 'resentment' ? C.resentment : '#475569',
            }}
          >
            Read with resentment
          </button>
        </div>

        {/* Poem display */}
        <div className="min-h-[140px] flex items-center justify-center">
          {lens === 'neither' && (
            <p className="text-sm text-gray-600 italic text-center transition-opacity duration-500">
              The poem exists in superposition. Choose a lens to collapse it.
            </p>
          )}
          {lens === 'tenderness' && (
            <div className="text-center space-y-1.5 transition-opacity duration-500">
              {tendernessPoem.map((line, i) => (
                <p key={i} className="text-xl sm:text-2xl font-light italic" style={{ color: C.tenderness }}>
                  {line}
                </p>
              ))}
              <p className="text-xs font-mono text-gray-600 mt-4">
                Z-basis measurement &mdash; Tuna-9 hardware &mdash; 337 of 4,096 shots
              </p>
            </div>
          )}
          {lens === 'resentment' && (
            <div className="text-center space-y-1.5 transition-opacity duration-500">
              {resentmentPoem.map((line, i) => (
                <p key={i} className="text-xl sm:text-2xl font-light italic" style={{ color: C.resentment }}>
                  {line}
                </p>
              ))}
              <p className="text-xs font-mono text-gray-600 mt-4">
                X-basis measurement &mdash; Tuna-9 hardware &mdash; 396 of 4,096 shots
              </p>
            </div>
          )}
        </div>

        {lens !== 'neither' && (
          <p className="text-xs text-gray-600 text-center mt-6 transition-opacity duration-500">
            Same qubits. Same state. Different measurement, different poem.
            {lens === 'tenderness' ? ' Now try the other lens.' : ' Now try the other lens.'}
          </p>
        )}
      </div>
    </div>
  )
}

// ============================================================
// SECTION: CONCEPTUAL FRAMEWORK
// ============================================================

function ConceptualFramework() {
  const { ref, visible } = useInView(0.1)
  return (
    <div ref={ref} className="px-4 sm:px-6 py-20">
      <div className={`max-w-3xl mx-auto transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        <h2 className="text-2xl font-bold text-gray-200 mb-2">Poetic Devices as Quantum Operations</h2>
        <p className="text-sm text-gray-500 mb-10">
          Poets have always done what quantum computers do: hold contradictions, bind distant things, make the act of observation part of the meaning. The mapping below isn&apos;t a metaphor. It&apos;s a dictionary.
        </p>

        <div className="space-y-0">
          {FRAMEWORK.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_2fr] sm:grid-cols-[140px_180px_1fr] gap-3 sm:gap-4 py-3 border-b border-[#111827]">
              <span className="text-sm font-medium text-gray-300">{row.device}</span>
              <span className="text-sm font-mono" style={{ color: C.blue }}>{row.gate}</span>
              <span className="text-sm text-gray-500">{row.why}</span>
            </div>
          ))}
        </div>

        {/* Worked examples */}
        <div className="mt-16 space-y-12">
          <h3 className="text-lg font-semibold text-gray-300">Three examples</h3>

          {/* Example 1: Superposition / Ambiguity */}
          <div className="border-l-2 pl-5 py-1" style={{ borderColor: C.ghz + '50' }}>
            <p className="text-xs font-mono mb-3" style={{ color: C.ghz }}>Superposition &rarr; Ambiguity</p>
            <p className="text-lg font-light italic text-gray-300 mb-4">
              &ldquo;I left the bank at closing time&rdquo;
            </p>
            <p className="text-sm text-gray-500 mb-3">
              This line is in superposition. It means two things at once &mdash; the river bank
              and the financial bank &mdash; and you hold both readings simultaneously until
              something later in the poem forces you to choose. That&apos;s collapse.
            </p>
            <p className="text-sm text-gray-500">
              On a quantum computer, this is a qubit in the state |0&#x27E9; + |1&#x27E9;. Both
              values are real and present. Measurement gives you one.
              Good poets keep you in superposition as long as possible.
            </p>
          </div>

          {/* Example 2: Entanglement / Rhyme */}
          <div className="border-l-2 pl-5 py-1" style={{ borderColor: C.blue + '50' }}>
            <p className="text-xs font-mono mb-3" style={{ color: C.blue }}>Entanglement &rarr; Rhyme</p>
            <div className="space-y-1 mb-4">
              <p className="text-lg font-light italic" style={{ color: C.blue }}>
                At dawn the rain gathers without a sound
              </p>
              <p className="text-lg font-light italic" style={{ color: C.blue + 'cc' }}>
                the morning river finds its way slowly home
              </p>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              This couplet was generated by two entangled qubits. Each qubit independently
              chose between &ldquo;dawn/dusk&rdquo; &mdash; but because they were entangled, when one said
              &ldquo;dawn&rdquo;, the other was guaranteed to say &ldquo;morning&rdquo;.
              The two lines are correlated without either one &ldquo;causing&rdquo; the other.
            </p>
            <p className="text-sm text-gray-500">
              Rhyme works the same way. &ldquo;Sound&rdquo; at the end of line one doesn&apos;t cause &ldquo;ground&rdquo; at the
              end of line four &mdash; but once you hear one, the other becomes inevitable. The
              correlation between distant words is the poem&apos;s structure.
            </p>
          </div>

          {/* Example 3: Delayed measurement / Enjambment */}
          <div className="border-l-2 pl-5 py-1" style={{ borderColor: C.tenderness + '50' }}>
            <p className="text-xs font-mono mb-3" style={{ color: C.tenderness }}>Delayed measurement &rarr; Enjambment</p>
            <div className="mb-4">
              <p className="text-lg font-light italic text-gray-300">
                and something holds that should have broken
              </p>
              <p className="text-lg font-light italic" style={{ color: C.tenderness }}>
                still, your warmth
              </p>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              At the end of the first line, &ldquo;broken&rdquo; is in superposition &mdash; broken as in
              shattered? Broken as in failed? The line break is a moment of suspension.
              You hold the ambiguity across the white space.
              Then &ldquo;still, your warmth&rdquo; collapses it: what held was the marriage. The first line meant endurance.
            </p>
            <p className="text-sm text-gray-500">
              This is delayed measurement. The qubit is prepared, but we wait to measure it.
              In the gap, the superposition is real. The next line is the measurement that
              resolves it into a definite meaning.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SECTION: ENTANGLEMENT CONSTRAINT POEM BUILDER (Tuna-9 hardware data)
// ============================================================

function sampleFromWeights(weights: number[]): number {
  const total = weights.reduce((s, w) => s + w, 0)
  let r = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r <= 0) return i
  }
  return weights.length - 1
}

function EntanglementConstraint() {
  const { ref, visible } = useInView(0.1)
  const [firstIdx, setFirstIdx] = useState<number | null>(null)
  const [lastIdx, setLastIdx] = useState<number | null>(null)
  const [middleIdx, setMiddleIdx] = useState<number | null>(null)
  const [correlationHeld, setCorrelationHeld] = useState(true)
  const [startedFrom, setStartedFrom] = useState<'first' | 'last' | null>(null)
  const [hasBuiltOnce, setHasBuiltOnce] = useState(false)
  const [showStats, setShowStats] = useState(false)

  const isComplete = firstIdx !== null && lastIdx !== null && middleIdx !== null

  const reset = () => {
    setFirstIdx(null)
    setLastIdx(null)
    setMiddleIdx(null)
    setStartedFrom(null)
  }

  const pickFirst = (idx: number) => {
    if (isComplete) return
    const row = BELL_MATRIX[idx]
    const last = sampleFromWeights(row)
    const mid = Math.floor(Math.random() * 8)
    setFirstIdx(idx)
    setLastIdx(last)
    setMiddleIdx(mid)
    setCorrelationHeld(idx === last)
    setStartedFrom('first')
    setHasBuiltOnce(true)
  }

  const pickLast = (idx: number) => {
    if (isComplete) return
    const col = BELL_MATRIX.map(row => row[idx])
    const first = sampleFromWeights(col)
    const mid = Math.floor(Math.random() * 8)
    setFirstIdx(first)
    setLastIdx(idx)
    setMiddleIdx(mid)
    setCorrelationHeld(first === idx)
    setStartedFrom('last')
    setHasBuiltOnce(true)
  }

  const entangleColor = C.blue
  const noiseColor = C.noise

  // CHSH data from Tuna-9 hardware
  const chshS = 2.544
  const classicalBound = 2.0
  const quantumMax = 2 * Math.SQRT2 // ~2.828

  return (
    <div ref={ref} className="px-4 sm:px-6 py-20">
      <div className={`max-w-3xl mx-auto transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        <h2 className="text-2xl font-bold text-gray-200 mb-2">Write a Poem with Entanglement</h2>
        <p className="text-sm text-gray-500 mb-3">
          Pick a first line. The last line is sampled from a distribution measured on quantum
          hardware &mdash; 4,096 shots from three Bell pairs on Tuna-9. The middle line is free:
          those qubits were never entangled with anything.
        </p>
        <p className="text-sm text-gray-500 mb-10">
          87% of the time, the first and last lines match &mdash; the entanglement held.
          13% of the time, hardware noise breaks the correlation, and you get an unexpected pairing.
          Technically, you&apos;re sampling from a stored histogram. But the distribution itself is
          certifiably non-classical: a CHSH test on the same circuit violates Bell&apos;s inequality
          at 38.8&sigma;. No classical process could have produced these statistics.
        </p>

        <div className="bg-[#0a0f1a] rounded-lg border border-[#1e293b] p-6 sm:p-8">
          {/* First line section */}
          <div className="mb-2">
            <p className="text-xs font-mono text-gray-500 mb-3">First line</p>
            <div className="flex flex-wrap gap-2">
              {ENTANGLED_LINES.map((pair, i) => {
                const isChosen = firstIdx === i && startedFrom === 'first'
                const isHardware = firstIdx === i && startedFrom === 'last'
                const hwColor = correlationHeld ? entangleColor : noiseColor
                const isDisabled = isComplete && firstIdx !== i
                return (
                  <button
                    key={i}
                    onClick={() => pickFirst(i)}
                    disabled={isComplete}
                    className="px-3 py-1.5 rounded-full border text-sm transition-all duration-300"
                    style={{
                      borderColor: isChosen ? entangleColor + '80' : isHardware ? hwColor + '60' : '#1e293b',
                      backgroundColor: isChosen ? entangleColor + '20' : isHardware ? hwColor + '10' : 'transparent',
                      color: isChosen ? entangleColor : isHardware ? hwColor : isDisabled ? '#334155' : '#6b7280',
                      cursor: isComplete ? 'default' : 'pointer',
                    }}
                  >
                    {pair.first}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Entanglement indicator */}
          <div className="flex items-center py-3 pl-4">
            <div className="w-px border-l border-dashed h-6" style={{ borderColor: entangleColor + '40' }} />
            {isComplete && (
              <span className="text-[10px] font-mono ml-2 transition-opacity duration-500"
                style={{ color: correlationHeld ? entangleColor + '60' : noiseColor + '80' }}>
                {correlationHeld ? 'entangled — correlation held' : 'noise broke the correlation'}
              </span>
            )}
          </div>

          {/* Middle line — auto-sampled, shown only in poem */}
          <div className={`mb-2 transition-all duration-500 ${isComplete ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
            <p className="text-xs font-mono text-gray-500 mb-3">
              Middle line <span className="text-gray-700">&mdash; free qubit, uniformly random</span>
            </p>
            <div className="px-3 py-1.5 rounded-full border border-[#e2e8f0]/30 text-sm inline-block"
              style={{ color: '#e2e8f0' }}>
              {middleIdx !== null ? FREE_MIDDLES[middleIdx] : ''}
            </div>
          </div>

          {/* Entanglement indicator */}
          <div className={`flex items-center py-3 pl-4 transition-all duration-500 ${isComplete ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-px border-l border-dashed h-6" style={{ borderColor: entangleColor + '40' }} />
          </div>

          {/* Last line section */}
          <div>
            <p className="text-xs font-mono text-gray-500 mb-3">Last line</p>
            <div className="flex flex-wrap gap-2">
              {ENTANGLED_LINES.map((pair, i) => {
                const isChosen = lastIdx === i && startedFrom === 'last'
                const isHardware = lastIdx === i && startedFrom === 'first'
                const hwColor = correlationHeld ? entangleColor : noiseColor
                const isDisabled = isComplete && lastIdx !== i
                return (
                  <button
                    key={i}
                    onClick={() => pickLast(i)}
                    disabled={isComplete}
                    className="px-3 py-1.5 rounded-full border text-sm transition-all duration-300"
                    style={{
                      borderColor: isChosen ? entangleColor + '80' : isHardware ? hwColor + '60' : '#1e293b',
                      backgroundColor: isChosen ? entangleColor + '20' : isHardware ? hwColor + '10' : 'transparent',
                      color: isChosen ? entangleColor : isHardware ? hwColor : isDisabled ? '#334155' : '#6b7280',
                      cursor: isComplete ? 'default' : 'pointer',
                    }}
                  >
                    {pair.last}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Completed poem */}
          {isComplete && firstIdx !== null && middleIdx !== null && lastIdx !== null && (
            <div className="mt-8 pt-6 border-t border-[#111827] text-center transition-opacity duration-500">
              <div className="space-y-1.5 mb-6">
                <p className="text-xl sm:text-2xl font-light italic" style={{ color: startedFrom === 'first' ? entangleColor : (correlationHeld ? entangleColor : noiseColor) }}>
                  {ENTANGLED_LINES[firstIdx].first}
                </p>
                <p className="text-xl sm:text-2xl font-light italic text-gray-300">
                  {FREE_MIDDLES[middleIdx]}
                </p>
                <p className="text-xl sm:text-2xl font-light italic" style={{ color: startedFrom === 'last' ? entangleColor : (correlationHeld ? entangleColor : noiseColor) }}>
                  {ENTANGLED_LINES[lastIdx].last}
                </p>
              </div>

              <p className="text-xs text-gray-600 mb-4">
                {correlationHeld
                  ? startedFrom === 'first'
                    ? 'You chose the first line. The hardware returned the matching last line — entanglement held across the middle.'
                    : 'You chose the last line. The hardware returned the matching first line — entanglement held across the middle.'
                  : startedFrom === 'first'
                    ? `You chose "${ENTANGLED_LINES[firstIdx].first}" — the hardware returned "${ENTANGLED_LINES[lastIdx].last}" instead of the matching line. Noise broke the Bell pair.`
                    : `You chose "${ENTANGLED_LINES[lastIdx].last}" — the hardware returned "${ENTANGLED_LINES[firstIdx].first}" instead of the matching line. Noise broke the Bell pair.`
                }
              </p>

              <button
                onClick={reset}
                className="px-4 py-2 rounded-full border text-xs font-medium transition-all hover:scale-105"
                style={{ borderColor: entangleColor + '40', color: entangleColor }}
              >
                {hasBuiltOnce && startedFrom === 'first'
                  ? 'Try again — start from the last line this time'
                  : 'Build another'}
              </button>
            </div>
          )}

          {/* Idle prompt */}
          {!isComplete && (
            <p className="text-xs text-gray-600 mt-6 text-center italic transition-opacity duration-500">
              {hasBuiltOnce
                ? 'Try starting from the other end. The correlation works both ways — neither line causes the other.'
                : 'Click any first line or any last line to begin.'}
            </p>
          )}
        </div>

        {/* Bell test statistics */}
        <div className="mt-6">
          <button
            onClick={() => setShowStats(!showStats)}
            className="text-xs font-mono text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
          >
            <span style={{ color: entangleColor + '60' }}>{showStats ? '▼' : '▶'}</span>
            {showStats ? 'Hide' : 'Show'} CHSH entanglement certification
          </button>

          {showStats && (
            <div className="mt-4 bg-[#0a0f1a] rounded-lg border border-[#1e293b] p-5 text-xs text-gray-500 leading-relaxed">
              <p className="mb-4">
                The CHSH inequality certifies that these correlations could not have been produced
                by any classical source &mdash; no pre-programmed lookup table, no shared randomness,
                no hidden variables. If the correlations were classical, the statistic <em>S</em> can
                never exceed 2. Quantum entanglement allows up to 2&radic;2 &asymp; 2.83.
              </p>
              <p className="mb-4 text-gray-600">
                Caveat: this is not a loophole-free Bell test. All qubits share the same chip and
                cryostat &mdash; there&apos;s no space-like separation, no random basis switching.
                What the CHSH violation certifies is that the gates genuinely produced entangled states.
                The distribution you&apos;re sampling from was generated by quantum mechanics, not classical
                pre-computation.
              </p>

              {/* CHSH bar chart */}
              <div className="mb-4">
                <div className="flex items-end gap-3 h-32 mb-2">
                  {/* Classical bound bar */}
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-[10px] text-gray-600 mb-1">Classical max</span>
                    <div className="w-full rounded-t" style={{
                      height: `${(classicalBound / quantumMax) * 100}%`,
                      backgroundColor: '#334155',
                    }} />
                    <span className="text-[10px] font-mono text-gray-500 mt-1">S = 2.00</span>
                  </div>
                  {/* Hardware result bar */}
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-[10px] mb-1" style={{ color: entangleColor }}>Tuna-9 hardware</span>
                    <div className="w-full rounded-t" style={{
                      height: `${(chshS / quantumMax) * 100}%`,
                      backgroundColor: entangleColor + '40',
                      border: `1px solid ${entangleColor}60`,
                    }} />
                    <span className="text-[10px] font-mono mt-1" style={{ color: entangleColor }}>S = 2.54</span>
                  </div>
                  {/* Quantum max bar */}
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-[10px] text-gray-600 mb-1">Quantum max</span>
                    <div className="w-full rounded-t" style={{
                      height: '100%',
                      backgroundColor: '#1e1b4b',
                      border: '1px solid #312e81',
                    }} />
                    <span className="text-[10px] font-mono text-gray-500 mt-1">S = 2.83</span>
                  </div>
                </div>
                <p className="text-center text-[10px] text-gray-600">
                  38.8&sigma; above the classical bound. Three Bell pairs, five measurement bases, 20,480 total shots.
                </p>
              </div>

              <p className="mb-2">
                <span className="font-mono" style={{ color: entangleColor + '80' }}>The circuit:</span>{' '}
                9 qubits on Tuna-9. Three Bell pairs on edges q2&ndash;q5, q4&ndash;q6, q7&ndash;q8
                (3 bits = 8 poem indices). Middle qubits q0, q1, q3 are in superposition but never
                entangled with the poem qubits &mdash; the circuit topology mirrors the poetic structure:
                first and last lines are bound, the middle stands alone.
                CHSH tested with Z, X, Ry(&pi;/4), Ry(&minus;&pi;/4) bases.
              </p>
              <p className="text-gray-700">
                Jobs 426263&ndash;426267 &middot; 2026-02-14 &middot; CompileStage.ROUTING &middot; Native CZ+Ry+Rz gate set
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SECTION: LLM CONNECTION
// ============================================================

function LLMConnection() {
  const { ref, visible } = useInView(0.15)
  const points = [
    { term: 'Token generation', desc: 'An LLM writes one word at a time. Each word collapses possibilities for every word that follows — sequential measurement.' },
    { term: 'Temperature', desc: 'How spread out the probability is before collapse. Low temperature: predictable. High temperature: surprising, strange.' },
    { term: 'Top-k sampling', desc: 'How many candidate words are allowed. A sonnet allows fewer possibilities than free verse. Constraint shapes meaning.' },
    { term: 'Entanglement', desc: 'Poetry\'s core challenge: each word should be locally surprising but globally coherent. Entanglement is exactly this — maximum local uncertainty, maximum global correlation.' },
    { term: 'The hybrid', desc: 'A quantum-LLM poet could use entanglement to keep a poem structurally coherent while letting each line be as strange as high temperature allows.' },
  ]

  return (
    <div ref={ref} className="px-4 sm:px-6 py-20">
      <div className={`max-w-3xl mx-auto transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        <h2 className="text-2xl font-bold text-gray-200 mb-2">The LLM Connection</h2>
        <p className="text-sm text-gray-500 mb-8">
          Every time a language model picks the next word, it collapses a probability distribution. That&apos;s already a measurement process. Quantum hardware makes it literal.
        </p>

        <div className="space-y-4">
          {points.map((p, i) => (
            <div key={i} className="flex gap-4">
              <span className="text-sm font-mono shrink-0 w-36 sm:w-48" style={{ color: C.blue }}>{p.term}</span>
              <span className="text-sm text-gray-400">{p.desc}</span>
            </div>
          ))}
        </div>

        {/* Concrete example */}
        <div className="mt-12 bg-[#0a0f1a] rounded-lg border border-[#1e293b] p-6">
          <p className="text-xs font-mono mb-4" style={{ color: C.blue + '80' }}>Example: temperature as probability spread</p>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Low temperature (0.3) &mdash; predictable, safe</p>
              <p className="text-base font-light italic text-gray-400">
                &ldquo;The morning sun rose over the quiet hills&rdquo;
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Medium temperature (0.8) &mdash; interesting, risky</p>
              <p className="text-base font-light italic text-gray-300">
                &ldquo;The morning sun rose over the rusted hymns&rdquo;
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">High temperature (1.5) &mdash; strange, unconstrained</p>
              <p className="text-base font-light italic text-gray-200">
                &ldquo;The morning sun velocity the crumpled psalms&rdquo;
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Poetry lives in the middle &mdash; surprising enough to feel alive, coherent enough to mean
            something. The problem is that temperature is a single dial. Entanglement could give each
            line its own temperature while keeping the whole poem structurally bound.
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// EXPERIMENT CARD: GHZ HAIKU
// ============================================================

function GHZHaikuCard() {
  const { ref, visible } = useInView(0.15)
  return (
    <div ref={ref} className={`transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
      <div className="bg-[#0a0f1a] rounded-lg border border-[#1e293b] p-6 sm:p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-200">GHZ-9 Haiku</h3>
            <p className="text-xs font-mono text-gray-600 mt-1">9-qubit GHZ state &middot; qxelarator emulator &middot; 1,024 shots</p>
          </div>
          <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: C.ghz + '15', color: C.ghz }}>emulator</span>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Nine qubits, perfectly entangled: when you measure them, they all agree.
          All zeros or all ones &mdash; nothing in between. Two possible haiku, held in
          superposition until the moment of reading. The poem is both until it&apos;s one.
        </p>

        <div className="grid sm:grid-cols-2 gap-6 mb-4">
          {GHZ_HAIKU.map((h, i) => (
            <div key={i} className="text-center">
              <p className="text-xs font-mono mb-3" style={{ color: (i === 0 ? C.ghz : C.tenderness) + 'aa' }}>
                |{h.bitstring}&#x27E9; &mdash; {h.shots} shots
              </p>
              <div className="space-y-0.5">
                {h.poem.map((line, j) => (
                  <p key={j} className="text-base font-light italic" style={{ color: i === 0 ? C.ghz : C.tenderness }}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// EXPERIMENT CARD: BELL COUPLETS
// ============================================================

function BellCoupletsCard() {
  const { ref, visible } = useInView(0.15)
  return (
    <div ref={ref} className={`transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
      <div className="bg-[#0a0f1a] rounded-lg border border-[#1e293b] p-6 sm:p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-200">Bell Couplets</h3>
            <p className="text-xs font-mono text-gray-600 mt-1">4 Bell pairs &middot; 8 qubits &middot; qxelarator emulator &middot; 1,024 shots</p>
          </div>
          <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: C.blue + '15', color: C.blue }}>emulator</span>
        </div>

        <p className="text-sm text-gray-500 mb-2">
          Four pairs of entangled qubits, each pair controlling one axis of meaning:
          time of day, element, action, quality. Within each pair, the correlation is
          perfect &mdash; if one qubit says &ldquo;dawn&rdquo;, its partner always says &ldquo;morning&rdquo;.
          Between pairs, nearly zero correlation. Independent choices, bound together.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          The binding between each pair&apos;s lines is stronger than any classical random process
          could produce &mdash; certifiably quantum. These couplets rhyme by entanglement, not by choice.
        </p>

        <div className="space-y-5">
          {BELL_COUPLETS.map((c, i) => (
            <div key={i} className="border-l-2 pl-4 py-1" style={{ borderColor: C.blue + '40' }}>
              <p className="text-base font-light italic" style={{ color: C.blue }}>{c.line1}</p>
              <p className="text-base font-light italic" style={{ color: C.blue + 'cc' }}>{c.line2}</p>
              <p className="text-xs font-mono text-gray-600 mt-1">key: {c.key} &middot; {c.shots} shots</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// MARRIAGE EXPERIMENT: COMPLEMENTARY POEMS
// ============================================================

function ComplementaryPoems() {
  const [basis, setBasis] = useState<'Z' | 'X'>('Z')
  const isZ = basis === 'Z'
  const color = isZ ? C.tenderness : C.resentment
  const top = isZ ? TOP_Z : TOP_X
  const label = isZ ? 'Tenderness' : 'Resentment'
  const maxProb = top[0].prob

  return (
    <div>
      {/* Toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-full border border-[#1e293b] p-1 bg-[#060610]">
          <button
            onClick={() => setBasis('Z')}
            className="px-5 py-2 rounded-full text-sm font-medium transition-all duration-300"
            style={{
              backgroundColor: isZ ? C.tenderness + '20' : 'transparent',
              color: isZ ? C.tenderness : '#475569',
            }}
          >
            Tenderness
          </button>
          <button
            onClick={() => setBasis('X')}
            className="px-5 py-2 rounded-full text-sm font-medium transition-all duration-300"
            style={{
              backgroundColor: !isZ ? C.resentment + '20' : 'transparent',
              color: !isZ ? C.resentment : '#475569',
            }}
          >
            Resentment
          </button>
        </div>
      </div>

      {/* Featured poem */}
      <div className="text-center mb-8 transition-opacity duration-500">
        <p className="text-xs font-mono mb-4" style={{ color: color + 'aa' }}>
          {label} ({isZ ? 'Z' : 'X'}-basis) &mdash; most probable &mdash; {(top[0].prob * 100).toFixed(1)}%
        </p>
        <div className="space-y-1">
          {top[0].lines.map((line, i) => (
            <p key={i} className="text-xl sm:text-2xl font-light italic transition-colors duration-500"
              style={{ color }}>
              {line}
            </p>
          ))}
        </div>
        <p className="text-xs font-mono text-gray-600 mt-4">
          {top[0].count} of 4,096 measurements
        </p>
      </div>

      {/* Bar chart */}
      <div className="mb-6">
        <p className="text-xs font-mono text-gray-500 mb-4">Top 10 poems by probability</p>
        <svg viewBox="0 0 700 360" className="w-full">
          {top.map((poem, i) => {
            const barW = (poem.prob / maxProb) * 380
            const y = i * 35
            return (
              <g key={i} transform={`translate(0, ${y})`}>
                <rect x="310" y="2" width={barW} height="24" rx="3"
                  fill={color} opacity={0.5 - i * 0.03}
                  className="transition-all duration-500" />
                <text x="305" y="18" textAnchor="end" fill="#9ca3af" fontSize="9" fontFamily="monospace">
                  {poem.lines[0].length > 28 ? poem.lines[0].slice(0, 28) + '...' : poem.lines[0]}
                </text>
                <text x={316 + barW} y="18" fill={color} fontSize="9" fontFamily="monospace"
                  className="transition-colors duration-500">
                  {(poem.prob * 100).toFixed(1)}%
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// ============================================================
// MARRIAGE EXPERIMENT: MEASURE
// ============================================================

function MeasureWidget() {
  const [activeBasis, setActiveBasis] = useState<'Z' | 'X' | 'GHZ'>('Z')
  const [result, setResult] = useState<{
    lines: string[]
    bitstring: string
    count: number
    total: number
  } | null>(null)
  const [collapsing, setCollapsing] = useState(false)
  const [collapseLines, setCollapseLines] = useState<string[]>(['', '', ''])
  const collapseRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prefersReducedMotion = useRef(false)

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const dists = { Z: DIST_Z, X: DIST_X, GHZ: DIST_GHZ }
  const colors = { Z: C.tenderness, X: C.resentment, GHZ: C.ghz }
  const labels = { Z: 'Tenderness (Z)', X: 'Resentment (X)', GHZ: 'All-or-Nothing (GHZ)' }

  const measure = useCallback(() => {
    const dist = dists[activeBasis]
    const bank = activeBasis === 'X' ? RESENTMENT_LINES : TENDERNESS_LINES
    const total = Object.values(dist).reduce((s, c) => s + c, 0)

    if (prefersReducedMotion.current) {
      const { bitstring, count } = weightedSample(dist)
      const lines = bitstringToPoem(bitstring, bank)
      setResult({ lines, bitstring, count, total })
      return
    }

    setCollapsing(true)
    setResult(null)

    let elapsed = 0
    const interval = 40
    collapseRef.current = setInterval(() => {
      elapsed += interval
      setCollapseLines([
        bank.line1[Math.floor(Math.random() * 8)],
        bank.line2[Math.floor(Math.random() * 8)],
        bank.line3[Math.floor(Math.random() * 8)],
      ])
      if (elapsed >= 250) {
        if (collapseRef.current) clearInterval(collapseRef.current)
        setCollapsing(false)
        const { bitstring, count } = weightedSample(dist)
        const lines = bitstringToPoem(bitstring, bank)
        setResult({ lines, bitstring, count, total })
      }
    }, interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBasis])

  useEffect(() => {
    return () => { if (collapseRef.current) clearInterval(collapseRef.current) }
  }, [])

  const color = colors[activeBasis]

  return (
    <div className="mt-8 pt-6 border-t border-[#111827]">
      <h4 className="text-base font-semibold text-gray-300 mb-2">Measure</h4>
      <p className="text-sm text-gray-500 mb-6">
        Draw a poem from the real hardware distribution. Each click samples from 4,096 measurements
        made on Tuna-9 &mdash; weighted by how often the hardware actually produced each outcome.
        Common poems appear often. Rare poems are genuinely rare.
      </p>

      {/* Basis selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['Z', 'X', 'GHZ'] as const).map((b) => (
          <button key={b}
            onClick={() => { setActiveBasis(b); setResult(null) }}
            className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
            style={{
              borderColor: activeBasis === b ? colors[b] + '60' : '#1e293b',
              backgroundColor: activeBasis === b ? colors[b] + '15' : 'transparent',
              color: activeBasis === b ? colors[b] : '#475569',
            }}
          >
            {labels[b]}
          </button>
        ))}
      </div>

      {/* Measure button */}
      <button
        onClick={measure}
        disabled={collapsing}
        className="px-6 py-2.5 rounded-full border-2 text-sm font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 disabled:opacity-50 mb-8"
        style={{ borderColor: color, color, backgroundColor: color + '10' }}
      >
        {collapsing ? 'Collapsing...' : 'Measure'}
      </button>

      {/* Result */}
      <div className="min-h-[150px]">
        {collapsing && (
          <div className="space-y-1 opacity-60">
            {collapseLines.map((line, i) => (
              <p key={i} className="text-lg sm:text-xl font-light italic text-gray-400">
                {line}
              </p>
            ))}
          </div>
        )}
        {result && !collapsing && (
          <div className="transition-opacity duration-300">
            <div className="space-y-1 mb-4">
              {result.lines.map((line, i) => (
                <p key={i} className="text-lg sm:text-xl font-light italic"
                  style={{ color }}>
                  {line}
                </p>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-mono text-gray-500">
              <span>
                <span style={{ color: color + 'cc' }}>{result.count}</span> / {result.total} shots
                ({(result.count / result.total * 100).toFixed(2)}%)
              </span>
              <span className="text-gray-700">|{result.bitstring}&#x27E9;</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// EXPERIMENT CARD: MARRIAGE AS SUPERPOSITION
// ============================================================

function MarriageCard() {
  const { ref, visible } = useInView(0.1)
  const [showNoise, setShowNoise] = useState(false)

  return (
    <div ref={ref} className={`transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
      <div className="bg-[#0a0f1a] rounded-lg border border-[#1e293b] p-6 sm:p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-200">Marriage as Superposition</h3>
            <p className="text-xs font-mono text-gray-600 mt-1">
              9 qubits &middot; Tuna-9 hardware &middot; 12,288 shots &middot; Valentine&apos;s Day 2026
            </p>
          </div>
          <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: C.pink + '15', color: C.pink }}>hardware</span>
        </div>

        <p className="text-sm text-gray-500 mb-2">
          One quantum state, two ways of reading it. Measure one way and you get a poem about
          tenderness. Measure the other way &mdash; the same state, the same qubits &mdash; and you
          get a poem about resentment. Neither reading is more real than the other. You can&apos;t
          read both at once. This is complementarity: the quantum principle that some truths are
          mutually exclusive but jointly exhaustive.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          A third circuit uses a GHZ state for the all-or-nothing marriage: every qubit agrees,
          so you get only two poems &mdash; total tenderness or total resentment, never a mix.
          659 unique poems emerged from 12,288 measurements on Tuna-9 hardware.
        </p>

        <ComplementaryPoems />
        <MeasureWidget />

        {/* Noise poems toggle */}
        <div className="mt-8 pt-6 border-t border-[#111827]">
          <button
            onClick={() => setShowNoise(!showNoise)}
            className="text-sm font-medium transition-colors"
            style={{ color: C.noise }}
          >
            {showNoise ? 'Hide' : 'Show'} noise poems ({NOISE_POEMS.length})
          </button>

          {showNoise && (
            <div className="mt-6 space-y-6">
              <p className="text-sm text-gray-500">
                Real hardware is imperfect. Qubits lose coherence, gates introduce small errors,
                measurements go wrong. The quantum state drifts from the intended poem into
                unexpected corners of possibility. But some of those accidents &mdash;
                the poems the hardware wrote by mistake &mdash; are worth reading.
              </p>
              {NOISE_POEMS.map((poem, i) => (
                <div key={i} className="border-l-2 pl-4 py-1" style={{ borderColor: C.noise + '40' }}>
                  <div className="space-y-0.5 mb-2">
                    {poem.lines.map((line, j) => (
                      <p key={j} className="text-base font-light italic" style={{ color: C.noise }}>
                        {line}
                      </p>
                    ))}
                  </div>
                  <p className="text-xs font-mono text-gray-600 mb-1">
                    |{poem.bitstring}&#x27E9; &mdash; {poem.count} shots &mdash; {poem.source}
                  </p>
                  <p className="text-xs text-gray-500">{poem.commentary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SECTION: EXPERIMENTS
// ============================================================

function Experiments() {
  const { ref, visible } = useInView(0.1)
  return (
    <div ref={ref} className="px-4 sm:px-6 py-20">
      <div className={`max-w-3xl mx-auto transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        <h2 className="text-2xl font-bold text-gray-200 mb-2">Experiments</h2>
        <p className="text-sm text-gray-500 mb-10">
          Not poems about quantum mechanics &mdash; poems that are quantum. Each experiment uses a
          different quantum state to shape the poem&apos;s structure in ways no classical process can replicate.
        </p>

        <div className="space-y-8">
          <GHZHaikuCard />
          <BellCoupletsCard />
          <MarriageCard />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SECTION: ROADMAP
// ============================================================

function Roadmap() {
  const { ref, visible } = useInView(0.1)
  return (
    <div ref={ref} className="px-4 sm:px-6 py-20">
      <div className={`max-w-3xl mx-auto transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        <h2 className="text-2xl font-bold text-gray-200 mb-10">Research Roadmap</h2>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[#1e293b]" />

          <div className="space-y-10">
            {PHASES.map((phase, pi) => {
              const doneCount = phase.items.filter(i => i.done).length
              const allDone = doneCount === phase.items.length
              return (
                <div key={pi} className="relative pl-10">
                  {/* Dot */}
                  <div className="absolute left-0 top-1 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor: allDone ? C.tenderness : '#334155',
                      backgroundColor: allDone ? C.tenderness + '20' : 'transparent',
                    }}>
                    {allDone && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke={C.tenderness} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-gray-300 mb-3">{phase.label}</h3>
                  <div className="space-y-2">
                    {phase.items.map((item, ii) => (
                      <div key={ii} className="flex items-center gap-3">
                        {item.done ? (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                            <path d="M3 7l3 3 5-5" stroke={C.tenderness} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <div className="w-[14px] h-[14px] flex items-center justify-center shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#334155]" />
                          </div>
                        )}
                        <span className={`text-sm ${item.done ? 'text-gray-400' : 'text-gray-600'}`}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SECTION: RESEARCH QUESTIONS
// ============================================================

function ResearchQuestions() {
  const { ref, visible } = useInView(0.1)
  return (
    <div ref={ref} className="px-4 sm:px-6 py-20">
      <div className={`max-w-3xl mx-auto transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        <h2 className="text-2xl font-bold text-gray-200 mb-10">Key Research Questions</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          {QUESTIONS.map((q, i) => (
            <div key={i} className="bg-[#0a0f1a] rounded-lg border border-[#1e293b] p-5">
              <span className="text-xs font-mono block mb-2" style={{ color: C.blue + '80' }}>Q{i + 1}</span>
              <p className="text-sm text-gray-400 leading-relaxed">{q}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function PoetryPage() {
  return (
    <div className="min-h-screen bg-[#060610] text-white">
      <Nav />
      <Hero />

      <div className="max-w-3xl mx-auto px-6"><div className="border-t border-[#111827]" /></div>
      <ComplementarityTeaser />

      <div className="max-w-3xl mx-auto px-6"><div className="border-t border-[#111827]" /></div>
      <ConceptualFramework />

      <div className="max-w-3xl mx-auto px-6"><div className="border-t border-[#111827]" /></div>
      <EntanglementConstraint />

      <div className="max-w-3xl mx-auto px-6"><div className="border-t border-[#111827]" /></div>
      <LLMConnection />

      <div className="max-w-3xl mx-auto px-6"><div className="border-t border-[#111827]" /></div>
      <Experiments />

      <div className="max-w-3xl mx-auto px-6"><div className="border-t border-[#111827]" /></div>
      <Roadmap />

      <div className="max-w-3xl mx-auto px-6"><div className="border-t border-[#111827]" /></div>
      <ResearchQuestions />

      {/* Footer */}
      <footer className="text-center text-xs text-gray-700 py-16 border-t border-[#111827]">
        An ongoing research project from{' '}
        <Link href="/" className="text-gray-500 hover:text-[#00d4ff]">haiqu</Link>
        <br />
        <span className="text-gray-800 mt-2 inline-block">
          <Link href="/tuna9" className="hover:text-gray-500">Meet Tuna-9</Link>
          {' '}&middot;{' '}
          <Link href="/research" className="hover:text-gray-500">Research</Link>
          {' '}&middot;{' '}
          <Link href="/explore" className="hover:text-gray-500">Explore</Link>
        </span>
      </footer>
    </div>
  )
}
