export const TOP_Z = [
  { lines: ['morning light through glass', 'I learn your breathing by heart', 'the kettle exhales'], count: 337, prob: 0.0823 },
  { lines: ['morning light through glass', 'nothing needs to be explained', 'the kettle exhales'], count: 204, prob: 0.0498 },
  { lines: ['morning light through glass', 'I learn your breathing by heart', 'mint in the teacup'], count: 174, prob: 0.0425 },
  { lines: ['morning light through glass', 'nothing needs to be explained', 'mint in the teacup'], count: 147, prob: 0.0359 },
  { lines: ['morning light through glass', 'the kitchen fills with slow steam', 'the kettle exhales'], count: 137, prob: 0.0334 },
  { lines: ['morning light through glass', 'sunlight maps your sleeping face', 'the kettle exhales'], count: 124, prob: 0.0303 },
  { lines: ['morning light through glass', 'something in us knows to stay', 'the kettle exhales'], count: 93, prob: 0.0227 },
  { lines: ['your laugh, sudden rain', 'I learn your breathing by heart', 'the kettle exhales'], count: 91, prob: 0.0222 },
  { lines: ['morning light through glass', 'we hold still and the world turns', 'the kettle exhales'], count: 90, prob: 0.022 },
  { lines: ['morning light through glass', 'the kitchen fills with slow steam', 'mint in the teacup'], count: 84, prob: 0.0205 },
]

export const TOP_X = [
  { lines: ['one plate in the rack', 'the fridge hums for no one now', 'two keys, now just one'], count: 396, prob: 0.0967 },
  { lines: ['rain and no one home', 'the fridge hums for no one now', 'the faucet still drips'], count: 331, prob: 0.0808 },
  { lines: ['crumbs on the counter', 'the fridge hums for no one now', 'two keys, now just one'], count: 296, prob: 0.0723 },
  { lines: ['one plate in the rack', 'I still reach across at night', 'two keys, now just one'], count: 259, prob: 0.0632 },
  { lines: ['one plate in the rack', 'the fridge hums for no one now', 'the faucet still drips'], count: 232, prob: 0.0566 },
  { lines: ['one cup on the shelf', 'the fridge hums for no one now', 'the faucet still drips'], count: 223, prob: 0.0544 },
  { lines: ['rain and no one home', 'the fridge hums for no one now', 'two keys, now just one'], count: 194, prob: 0.0474 },
  { lines: ['crumbs on the counter', 'I still reach across at night', 'two keys, now just one'], count: 149, prob: 0.0364 },
  { lines: ['rain and no one home', 'I still reach across at night', 'the faucet still drips'], count: 139, prob: 0.0339 },
  { lines: ['one cup on the shelf', 'the fridge hums for no one now', 'two keys, now just one'], count: 137, prob: 0.0334 },
]

export const TOP_GHZ = [
  { lines: ['morning light through glass', 'I learn your breathing by heart', 'the kettle exhales'], count: 1427, prob: 0.3484 },
  { lines: ['plums warm from the tree', 'your hand rests where the light falls', 'smoke curls from the roof'], count: 936, prob: 0.2285 },
  { lines: ['morning light through glass', 'the kitchen fills with slow steam', 'the kettle exhales'], count: 360, prob: 0.0879 },
  { lines: ['plums warm from the tree', 'something in us knows to stay', 'smoke curls from the roof'], count: 297, prob: 0.0725 },
]

export const NOISE_POEMS = [
  {
    lines: ['two shadows, one wall', 'we breathe in the same small room', 'the kettle exhales'],
    count: 27, source: 'GHZ', bitstring: '000101101',
    commentary: 'The GHZ state should produce only all-zeros or all-ones — full domestic calm or full intensity. This haiku leaked through decoherence into something sideways: two shadows, one wall, we breathe in the same small room. The hardware found a middle register the circuit tried to forbid — not the grand entangled poles but the kettle exhales, a small thing holding steady.',
  },
  {
    lines: ['peaches on the sill', 'your hand rests where the light falls', 'the cat knows our bed'],
    count: 27, source: 'GHZ', bitstring: '110111010',
    commentary: 'Another impossible GHZ haiku. The circuit demanded unanimity; the hardware gave us peaches on the sill and your hand rests where the light falls. Most of the qubits flipped but not all — a near-miss that reads like love remembered in its physical traces. the cat knows our bed closes it with something no one asked for.',
  },
  {
    lines: ['your book, spine still cracked', 'no one turns the porch light off', 'two keys, now just one'],
    count: 50, source: 'X-basis', bitstring: '000100001',
    commentary: 'The Hadamard rotation reshuffles all the probabilities. Most outcomes cluster around the expected absence haiku, but 50 shots landed here — your book, spine still cracked and no one turns the porch light off. two keys, now just one: the measurement basis changed, and what showed up was the quiet aftermath nobody predicted.',
  },
  {
    lines: ['peaches on the sill', 'nothing needs to be explained', 'jam jar left open'],
    count: 7, source: 'Z-basis', bitstring: '101010010',
    commentary: 'Deep in the tail of the distribution. The hardware found this haiku 7 times in 4,096 tries — a rare fluctuation where peaches on the sill meets nothing needs to be explained. jam jar left open is the kind of detail only noise would invent, too specific to be likely, too vivid to dismiss.',
  },
  {
    lines: ['plums warm from the tree', 'something in us knows to stay', 'smoke curls from the roof'],
    count: 297, source: 'GHZ', bitstring: '111110111',
    commentary: 'One bit flip from the all-ones ideal. A single qubit error — the sixth qubit decohered — and the haiku shifted from the full your hand rests where the light falls to something in us knows to stay. The hardware almost got it right: plums warm from the tree, smoke curls from the roof. The mistake was the better poem.',
  },
]

export const GHZ_HAIKU = [
  {
    bitstring: '000000000',
    shots: 1427,
    poem: ['morning light through glass', 'I learn your breathing by heart', 'the kettle exhales'],
  },
  {
    bitstring: '111111111',
    shots: 936,
    poem: ['plums warm from the tree', 'your hand rests where the light falls', 'smoke curls from the roof'],
  },
]

export const BELL_COUPLETS = [
  {
    line1: 'When you are here the touch runs warm against the walls',
    line2: 'the quiet evening finds its way slowly home',
    key: '0000', shots: 65,
  },
  {
    line1: 'When your ghost is here the ache runs dim against the walls',
    line2: 'the quiet evening finds its way into bone',
    key: '1101', shots: 71,
  },
  {
    line1: 'When you are here the ache runs warm against the walls',
    line2: 'the quiet evening finds its way into bone',
    key: '0110', shots: 68,
  },
  {
    line1: 'When your ghost is here the touch runs dim against the walls',
    line2: 'the quiet evening finds its way slowly home',
    key: '1011', shots: 51,
  },
]
