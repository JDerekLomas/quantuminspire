export const TOP_Z = [
  { lines: ['your hand finding mine', 'you pull me closer and stay', 'the door stays open'], count: 337, prob: 0.0823 },
  { lines: ['your hand finding mine', 'your voice fills the quiet house', 'the door stays open'], count: 204, prob: 0.0498 },
  { lines: ['your hand finding mine', 'you pull me closer and stay', 'a shared glass of wine'], count: 174, prob: 0.0425 },
  { lines: ['your hand finding mine', 'your voice fills the quiet house', 'a shared glass of wine'], count: 147, prob: 0.0359 },
  { lines: ['your hand finding mine', 'the room holds nothing but us', 'the door stays open'], count: 137, prob: 0.0334 },
  { lines: ['your hand finding mine', 'the silence between us hums', 'the door stays open'], count: 124, prob: 0.0303 },
  { lines: ['your hand finding mine', 'the whole world contracts to here', 'the door stays open'], count: 93, prob: 0.0227 },
  { lines: ['the warmth of your skin', 'you pull me closer and stay', 'the door stays open'], count: 91, prob: 0.0222 },
  { lines: ['your hand finding mine', 'time slows when your eyes meet mine', 'the door stays open'], count: 90, prob: 0.022 },
  { lines: ['your hand finding mine', 'the room holds nothing but us', 'a shared glass of wine'], count: 84, prob: 0.0205 },
]

export const TOP_X = [
  { lines: ['the empty pillow', 'I still remember your hands', 'the porch light still on'], count: 396, prob: 0.0967 },
  { lines: ['rain on the window', 'I still remember your hands', 'the train pulls away'], count: 331, prob: 0.0808 },
  { lines: ['the phone stays silent', 'I still remember your hands', 'the porch light still on'], count: 296, prob: 0.0723 },
  { lines: ['the empty pillow', 'the walls remember your voice', 'the porch light still on'], count: 259, prob: 0.0632 },
  { lines: ['the empty pillow', 'I still remember your hands', 'the train pulls away'], count: 232, prob: 0.0566 },
  { lines: ['one cup on the shelf', 'I still remember your hands', 'the train pulls away'], count: 223, prob: 0.0544 },
  { lines: ['rain on the window', 'I still remember your hands', 'the porch light still on'], count: 194, prob: 0.0474 },
  { lines: ['the phone stays silent', 'the walls remember your voice', 'the porch light still on'], count: 149, prob: 0.0364 },
  { lines: ['rain on the window', 'the walls remember your voice', 'the train pulls away'], count: 139, prob: 0.0339 },
  { lines: ['one cup on the shelf', 'I still remember your hands', 'the porch light still on'], count: 137, prob: 0.0334 },
]

export const TOP_GHZ = [
  { lines: ['your hand finding mine', 'you pull me closer and stay', 'the door stays open'], count: 1427, prob: 0.3484 },
  { lines: ['candlelight on skin', 'your laugh echoes through the rooms', 'our shadows as one'], count: 936, prob: 0.2285 },
  { lines: ['your hand finding mine', 'the room holds nothing but us', 'the door stays open'], count: 360, prob: 0.0879 },
  { lines: ['candlelight on skin', 'the whole world contracts to here', 'our shadows as one'], count: 297, prob: 0.0725 },
]

export const NOISE_POEMS = [
  {
    lines: ['two cups on the shelf', 'we breathe in the same warm air', 'the door stays open'],
    count: 27, source: 'GHZ', bitstring: '000101101',
    commentary: 'The GHZ state should produce only all-zeros or all-ones \u2014 full intimacy or full intensity. This haiku leaked through decoherence into something quieter \u2014 the domestic in-between, two cups on a shelf and an open door. The hardware found the tenderness the circuit tried to forbid.',
  },
  {
    lines: ['laughter in the dark', 'your laugh echoes through the rooms', 'fingerprints on glass'],
    count: 27, source: 'GHZ', bitstring: '110111010',
    commentary: 'Another impossible GHZ haiku. The circuit demanded unanimity; the hardware gave us laughter echoing through glass \u2014 love remembered in its traces, not its presence or absence but the smudge it left behind.',
  },
  {
    lines: ['a letter unsent', 'the distance hums between us', 'the porch light still on'],
    count: 50, source: 'X-basis', bitstring: '000100001',
    commentary: 'The Hadamard rotation reshuffles all the probabilities. Most outcomes cluster around the expected absence haiku, but 50 shots landed here \u2014 an unsent letter and a light still burning. The distance hums but nobody has left yet.',
  },
  {
    lines: ['laughter in the dark', 'your voice fills the quiet house', 'the key in the lock'],
    count: 7, source: 'Z-basis', bitstring: '101010010',
    commentary: 'Deep in the tail of the distribution. The hardware found this haiku 7 times in 4,096 tries \u2014 a rare fluctuation where laughter fills a quiet house and someone is arriving home.',
  },
  {
    lines: ['candlelight on skin', 'the whole world contracts to here', 'our shadows as one'],
    count: 297, source: 'GHZ', bitstring: '111110111',
    commentary: 'One bit flip from the all-ones ideal. A single qubit error \u2014 the sixth qubit decohered \u2014 and the haiku shifted from the echoing rooms to candlelight. The hardware almost got it right, and the mistake was the better poem.',
  },
]

export const GHZ_HAIKU = [
  {
    bitstring: '000000000',
    shots: 1427,
    poem: ['your hand finding mine', 'you pull me closer and stay', 'the door stays open'],
  },
  {
    bitstring: '111111111',
    shots: 936,
    poem: ['candlelight on skin', 'your laugh echoes through the rooms', 'our shadows as one'],
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
