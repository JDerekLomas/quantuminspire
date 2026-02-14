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
      { lines: ['your hand finding mine', 'you pull me closer and stay', 'the door stays open'], count: 1920, prob: 0.4688, bitstring: '000000000' },
      { lines: ['laughter in the dark', 'time slows when your eyes meet mine', 'the door stays open'], count: 1625, prob: 0.3967, bitstring: '000011010' },
      { lines: ['laughter in the dark', 'your voice fills the quiet house', 'the door stays open'], count: 150, prob: 0.0366, bitstring: '000010010' },
      { lines: ['your hand finding mine', 'time slows when your eyes meet mine', 'the door stays open'], count: 54, prob: 0.0132, bitstring: '000011000' },
      { lines: ['your hand finding mine', 'the room holds nothing but us', 'the door stays open'], count: 46, prob: 0.0112, bitstring: '000001000' },
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
      { lines: ['your hand finding mine', 'you pull me closer and stay', 'the door stays open'], count: 1849, prob: 0.4514, bitstring: '000000000' },
      { lines: ['your breath on my neck', 'your laugh echoes through the rooms', 'the door stays open'], count: 1472, prob: 0.3594, bitstring: '000111110' },
      { lines: ['your breath on my neck', 'the whole world contracts to here', 'the door stays open'], count: 172, prob: 0.042, bitstring: '000110110' },
      { lines: ['the scent of your hair', 'your laugh echoes through the rooms', 'the door stays open'], count: 72, prob: 0.0176, bitstring: '000111100' },
      { lines: ['your hand finding mine', 'the room holds nothing but us', 'the door stays open'], count: 50, prob: 0.0122, bitstring: '000001000' },
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
      { lines: ['your hand finding mine', 'you pull me closer and stay', 'the door stays open'], count: 1854, prob: 0.4526, bitstring: '000000000' },
      { lines: ['your breath on my neck', 'your laugh echoes through the rooms', 'fingerprints on glass'], count: 1247, prob: 0.3044, bitstring: '110111110' },
      { lines: ['your breath on my neck', 'the whole world contracts to here', 'fingerprints on glass'], count: 159, prob: 0.0388, bitstring: '110110110' },
      { lines: ['the scent of your hair', 'your laugh echoes through the rooms', 'fingerprints on glass'], count: 81, prob: 0.0198, bitstring: '110111100' },
      { lines: ['your breath on my neck', 'your laugh echoes through the rooms', 'salt on the pillow'], count: 79, prob: 0.0193, bitstring: '010111110' },
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
      { lines: ['your hand finding mine', 'you pull me closer and stay', 'the door stays open'], count: 1427, prob: 0.3484, bitstring: '000000000' },
      { lines: ['candlelight on skin', 'your laugh echoes through the rooms', 'our shadows as one'], count: 936, prob: 0.2285, bitstring: '111111111' },
      { lines: ['your hand finding mine', 'the room holds nothing but us', 'the door stays open'], count: 360, prob: 0.0879, bitstring: '000001000' },
      { lines: ['candlelight on skin', 'the whole world contracts to here', 'our shadows as one'], count: 297, prob: 0.0725, bitstring: '111110111' },
      { lines: ['your breath on my neck', 'your laugh echoes through the rooms', 'our shadows as one'], count: 77, prob: 0.0188, bitstring: '111111110' },
    ],
  },
]
