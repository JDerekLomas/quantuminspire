export const TOP_Z = [
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

export const TOP_X = [
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

export const TOP_GHZ = [
  { lines: ['your hand finds mine', 'and something holds that should have broken', 'still, your warmth'], count: 1427, prob: 0.3484 },
  { lines: ['I know your silences', 'the ordinary days are what I\'ll grieve', 'the long way home'], count: 936, prob: 0.2285 },
  { lines: ['the kitchen light still on', 'and something holds that should have broken', 'still, your warmth'], count: 360, prob: 0.0879 },
  { lines: ['you laugh and I remember', 'the ordinary days are what I\'ll grieve', 'the long way home'], count: 297, prob: 0.0725 },
]

export const NOISE_POEMS = [
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

export const GHZ_HAIKU = [
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

export const BELL_COUPLETS = [
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
