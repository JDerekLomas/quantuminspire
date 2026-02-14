// Decoherence Gradient: GHZ states of increasing depth on Tuna-9
// Linear CNOT chains on Hamiltonian path 3→1→4→2→5→7→8→6
// GHZ-3 (job 426293), GHZ-5 (426294), GHZ-7 (426295), GHZ-9 (from DIST_GHZ)
// 4,096 shots each · 2026-02-14

export type DecoherencePoem = {
  lines: string[]
  count: number
  prob: number
  bitstring: string
}

export type DecoherenceDepth = {
  label: string
  nQubits: number
  nCZ: number
  fidelity: number
  entropy: number
  unique: number
  idealZero: string
  idealOne: string
  zeroCount: number
  oneCount: number
  top: DecoherencePoem[]
}

export const DECOHERENCE_DATA: DecoherenceDepth[] = [
  {
    label: 'GHZ-3',
    nQubits: 3,
    nCZ: 2,
    fidelity: 0.8655,
    entropy: 1.953,
    unique: 43,
    idealZero: '000000000',
    idealOne: '000011010',
    zeroCount: 1920,
    oneCount: 1625,
    top: [
      { lines: ['your hand finds mine', 'and something holds that should have broken', 'still, your warmth'], count: 1920, prob: 0.4688, bitstring: '000000000' },
      { lines: ['seventeen winters', 'the fractures are the places where light enters', 'still, your warmth'], count: 1625, prob: 0.3967, bitstring: '000011010' },
      { lines: ['seventeen winters', 'I trace the atlas of your changing face', 'still, your warmth'], count: 150, prob: 0.0366, bitstring: '000010010' },
      { lines: ['your hand finds mine', 'the fractures are the places where light enters', 'still, your warmth'], count: 54, prob: 0.0132, bitstring: '000011000' },
      { lines: ['your hand finds mine', 'the years have made us porous to each other', 'still, your warmth'], count: 46, prob: 0.0112, bitstring: '000001000' },
    ],
  },
  {
    label: 'GHZ-5',
    nQubits: 5,
    nCZ: 4,
    fidelity: 0.8108,
    entropy: 2.339,
    unique: 60,
    idealZero: '000000000',
    idealOne: '000111110',
    zeroCount: 1849,
    oneCount: 1472,
    top: [
      { lines: ['your hand finds mine', 'and something holds that should have broken', 'still, your warmth'], count: 1849, prob: 0.4514, bitstring: '000000000' },
      { lines: ['we built this room together', 'the ordinary days are what I\'ll grieve', 'still, your warmth'], count: 1472, prob: 0.3594, bitstring: '000111110' },
      { lines: ['we built this room together', 'four lives grew upward from this tangled root', 'still, your warmth'], count: 172, prob: 0.042, bitstring: '000110110' },
      { lines: ['the kitchen light still on', 'the ordinary days are what I\'ll grieve', 'still, your warmth'], count: 72, prob: 0.0176, bitstring: '000111100' },
      { lines: ['your hand finds mine', 'the years have made us porous to each other', 'still, your warmth'], count: 50, prob: 0.0122, bitstring: '000001000' },
    ],
  },
  {
    label: 'GHZ-7',
    nQubits: 7,
    nCZ: 6,
    fidelity: 0.7571,
    entropy: 2.751,
    unique: 98,
    idealZero: '000000000',
    idealOne: '110111110',
    zeroCount: 1854,
    oneCount: 1247,
    top: [
      { lines: ['your hand finds mine', 'and something holds that should have broken', 'still, your warmth'], count: 1854, prob: 0.4526, bitstring: '000000000' },
      { lines: ['we built this room together', 'the ordinary days are what I\'ll grieve', 'two clocks, one time'], count: 1247, prob: 0.3044, bitstring: '110111110' },
      { lines: ['we built this room together', 'four lives grew upward from this tangled root', 'two clocks, one time'], count: 159, prob: 0.0388, bitstring: '110110110' },
      { lines: ['the kitchen light still on', 'the ordinary days are what I\'ll grieve', 'two clocks, one time'], count: 81, prob: 0.0198, bitstring: '110111100' },
      { lines: ['we built this room together', 'the ordinary days are what I\'ll grieve', 'bread on the table'], count: 79, prob: 0.0193, bitstring: '010111110' },
    ],
  },
  {
    label: 'GHZ-9',
    nQubits: 9,
    nCZ: 8,
    fidelity: 0.5769,
    entropy: 3.688,
    unique: 152,
    idealZero: '000000000',
    idealOne: '111111111',
    zeroCount: 1427,
    oneCount: 936,
    top: [
      { lines: ['your hand finds mine', 'and something holds that should have broken', 'still, your warmth'], count: 1427, prob: 0.3484, bitstring: '000000000' },
      { lines: ['I know your silences', 'the ordinary days are what I\'ll grieve', 'the long way home'], count: 936, prob: 0.2285, bitstring: '111111111' },
      { lines: ['your hand finds mine', 'the years have made us porous to each other', 'still, your warmth'], count: 360, prob: 0.0879, bitstring: '000001000' },
      { lines: ['I know your silences', 'four lives grew upward from this tangled root', 'the long way home'], count: 297, prob: 0.0725, bitstring: '111110111' },
      { lines: ['we built this room together', 'the ordinary days are what I\'ll grieve', 'the long way home'], count: 77, prob: 0.0188, bitstring: '111111110' },
    ],
  },
]
