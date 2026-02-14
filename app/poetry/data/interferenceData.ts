// Interference Draft: hardware results from Tuna-9
// 5 rotation angles interpolating Z-basis (tenderness) to X-basis (resentment)
// Rz(2θ)+Ry(θ) pre-measurement rotation on all 9 qubits
// θ=0 and θ=90 reuse existing marriage data; θ=22.5, 45, 67.5 are new circuits
// Jobs 426290-426292 + existing 426093, 426094 · 4,096 shots each · 2026-02-14

export type InterferencePoem = {
  bitstring: string
  count: number
  prob: number
  tenderness: string[]
  resentment: string[]
}

export type InterferenceAngle = {
  angle: number
  unique: number
  entropy: number
  top: InterferencePoem[]
}

export const INTERFERENCE_DATA: InterferenceAngle[] = [
  {
    angle: 0,
    unique: 307,
    entropy: 6.67,
    top: [
      { bitstring: '000000000', count: 337, prob: 0.0823, tenderness: ['your hand finds mine', 'and something holds that should have broken', 'still, your warmth'], resentment: ['your silence fills the room', 'and something stays that should have left by now', 'still, your weight'] },
      { bitstring: '000010000', count: 204, prob: 0.0498, tenderness: ['your hand finds mine', 'I trace the atlas of your changing face', 'still, your warmth'], resentment: ['your silence fills the room', 'I count the ways your face has disappointed', 'still, your weight'] },
      { bitstring: '100000000', count: 174, prob: 0.0425, tenderness: ['your hand finds mine', 'and something holds that should have broken', 'a hand-worn ring'], resentment: ['your silence fills the room', 'and something stays that should have left by now', 'a hand-worn groove'] },
      { bitstring: '100010000', count: 147, prob: 0.0359, tenderness: ['your hand finds mine', 'I trace the atlas of your changing face', 'a hand-worn ring'], resentment: ['your silence fills the room', 'I count the ways your face has disappointed', 'a hand-worn groove'] },
      { bitstring: '000001000', count: 137, prob: 0.0334, tenderness: ['your hand finds mine', 'the years have made us porous to each other', 'still, your warmth'], resentment: ['your silence fills the room', 'the years have worn us thin as excuses', 'still, your weight'] },
      { bitstring: '000100000', count: 124, prob: 0.0303, tenderness: ['your hand finds mine', 'we speak a language no one else can hear', 'still, your warmth'], resentment: ['your silence fills the room', 'we speak the same exhausted arguments', 'still, your weight'] },
      { bitstring: '000110000', count: 93, prob: 0.0227, tenderness: ['your hand finds mine', 'four lives grew upward from this tangled root', 'still, your warmth'], resentment: ['your silence fills the room', 'four lives demand more than this hollow truce', 'still, your weight'] },
      { bitstring: '000000001', count: 91, prob: 0.0222, tenderness: ['the children sleeping', 'and something holds that should have broken', 'still, your warmth'], resentment: ['the children watch us watching', 'and something stays that should have left by now', 'still, your weight'] },
      { bitstring: '000011000', count: 90, prob: 0.022, tenderness: ['your hand finds mine', 'the fractures are the places where light enters', 'still, your warmth'], resentment: ['your silence fills the room', 'the fractures are just fractures, nothing more', 'still, your weight'] },
      { bitstring: '100001000', count: 84, prob: 0.0205, tenderness: ['your hand finds mine', 'the years have made us porous to each other', 'a hand-worn ring'], resentment: ['your silence fills the room', 'the years have worn us thin as excuses', 'a hand-worn groove'] },
    ],
  },
  {
    angle: 22.5,
    unique: 362,
    entropy: 7.46,
    top: [
      { bitstring: '000010000', count: 116, prob: 0.0283, tenderness: ['your hand finds mine', 'I trace the atlas of your changing face', 'still, your warmth'], resentment: ['your silence fills the room', 'I count the ways your face has disappointed', 'still, your weight'] },
      { bitstring: '100010000', count: 103, prob: 0.0251, tenderness: ['your hand finds mine', 'I trace the atlas of your changing face', 'a hand-worn ring'], resentment: ['your silence fills the room', 'I count the ways your face has disappointed', 'a hand-worn groove'] },
      { bitstring: '000110000', count: 101, prob: 0.0247, tenderness: ['your hand finds mine', 'four lives grew upward from this tangled root', 'still, your warmth'], resentment: ['your silence fills the room', 'four lives demand more than this hollow truce', 'still, your weight'] },
      { bitstring: '000011000', count: 92, prob: 0.0225, tenderness: ['your hand finds mine', 'the fractures are the places where light enters', 'still, your warmth'], resentment: ['your silence fills the room', 'the fractures are just fractures, nothing more', 'still, your weight'] },
      { bitstring: '100110000', count: 78, prob: 0.019, tenderness: ['your hand finds mine', 'four lives grew upward from this tangled root', 'a hand-worn ring'], resentment: ['your silence fills the room', 'four lives demand more than this hollow truce', 'a hand-worn groove'] },
      { bitstring: '100011000', count: 75, prob: 0.0183, tenderness: ['your hand finds mine', 'the fractures are the places where light enters', 'a hand-worn ring'], resentment: ['your silence fills the room', 'the fractures are just fractures, nothing more', 'a hand-worn groove'] },
      { bitstring: '100111000', count: 70, prob: 0.0171, tenderness: ['your hand finds mine', 'the ordinary days are what I\'ll grieve', 'a hand-worn ring'], resentment: ['your silence fills the room', 'the ordinary days are all there is', 'a hand-worn groove'] },
      { bitstring: '100000000', count: 69, prob: 0.0168, tenderness: ['your hand finds mine', 'and something holds that should have broken', 'a hand-worn ring'], resentment: ['your silence fills the room', 'and something stays that should have left by now', 'a hand-worn groove'] },
      { bitstring: '000010001', count: 65, prob: 0.0159, tenderness: ['the children sleeping', 'I trace the atlas of your changing face', 'still, your warmth'], resentment: ['the children watch us watching', 'I count the ways your face has disappointed', 'still, your weight'] },
      { bitstring: '000001000', count: 64, prob: 0.0156, tenderness: ['your hand finds mine', 'the years have made us porous to each other', 'still, your warmth'], resentment: ['your silence fills the room', 'the years have worn us thin as excuses', 'still, your weight'] },
    ],
  },
  {
    angle: 45,
    unique: 409,
    entropy: 7.54,
    top: [
      { bitstring: '000000000', count: 208, prob: 0.0508, tenderness: ['your hand finds mine', 'and something holds that should have broken', 'still, your warmth'], resentment: ['your silence fills the room', 'and something stays that should have left by now', 'still, your weight'] },
      { bitstring: '100000000', count: 146, prob: 0.0356, tenderness: ['your hand finds mine', 'and something holds that should have broken', 'a hand-worn ring'], resentment: ['your silence fills the room', 'and something stays that should have left by now', 'a hand-worn groove'] },
      { bitstring: '000001000', count: 112, prob: 0.0273, tenderness: ['your hand finds mine', 'the years have made us porous to each other', 'still, your warmth'], resentment: ['your silence fills the room', 'the years have worn us thin as excuses', 'still, your weight'] },
      { bitstring: '000010000', count: 90, prob: 0.022, tenderness: ['your hand finds mine', 'I trace the atlas of your changing face', 'still, your warmth'], resentment: ['your silence fills the room', 'I count the ways your face has disappointed', 'still, your weight'] },
      { bitstring: '000100000', count: 81, prob: 0.0198, tenderness: ['your hand finds mine', 'we speak a language no one else can hear', 'still, your warmth'], resentment: ['your silence fills the room', 'we speak the same exhausted arguments', 'still, your weight'] },
      { bitstring: '001000000', count: 79, prob: 0.0193, tenderness: ['your hand finds mine', 'and something holds that should have broken', 'the door left open'], resentment: ['your silence fills the room', 'and something stays that should have left by now', 'the door slammed shut'] },
      { bitstring: '000010010', count: 75, prob: 0.0183, tenderness: ['seventeen winters', 'I trace the atlas of your changing face', 'still, your warmth'], resentment: ['seventeen years of this', 'I count the ways your face has disappointed', 'still, your weight'] },
      { bitstring: '100001000', count: 68, prob: 0.0166, tenderness: ['your hand finds mine', 'the years have made us porous to each other', 'a hand-worn ring'], resentment: ['your silence fills the room', 'the years have worn us thin as excuses', 'a hand-worn groove'] },
      { bitstring: '000000001', count: 57, prob: 0.0139, tenderness: ['the children sleeping', 'and something holds that should have broken', 'still, your warmth'], resentment: ['the children watch us watching', 'and something stays that should have left by now', 'still, your weight'] },
      { bitstring: '101000000', count: 55, prob: 0.0134, tenderness: ['your hand finds mine', 'and something holds that should have broken', 'roots under stone'], resentment: ['your silence fills the room', 'and something stays that should have left by now', 'walls closing in'] },
    ],
  },
  {
    angle: 67.5,
    unique: 269,
    entropy: 6.05,
    top: [
      { bitstring: '000000000', count: 678, prob: 0.1655, tenderness: ['your hand finds mine', 'and something holds that should have broken', 'still, your warmth'], resentment: ['your silence fills the room', 'and something stays that should have left by now', 'still, your weight'] },
      { bitstring: '000000100', count: 193, prob: 0.0471, tenderness: ['the kitchen light still on', 'and something holds that should have broken', 'still, your warmth'], resentment: ['the kitchen light, still on', 'and something stays that should have left by now', 'still, your weight'] },
      { bitstring: '010010010', count: 185, prob: 0.0452, tenderness: ['seventeen winters', 'I trace the atlas of your changing face', 'bread on the table'], resentment: ['seventeen years of this', 'I count the ways your face has disappointed', 'crumbs on the table'] },
      { bitstring: '010000000', count: 163, prob: 0.0398, tenderness: ['your hand finds mine', 'and something holds that should have broken', 'bread on the table'], resentment: ['your silence fills the room', 'and something stays that should have left by now', 'crumbs on the table'] },
      { bitstring: '000000010', count: 155, prob: 0.0378, tenderness: ['seventeen winters', 'and something holds that should have broken', 'still, your warmth'], resentment: ['seventeen years of this', 'and something stays that should have left by now', 'still, your weight'] },
      { bitstring: '000010010', count: 139, prob: 0.0339, tenderness: ['seventeen winters', 'I trace the atlas of your changing face', 'still, your warmth'], resentment: ['seventeen years of this', 'I count the ways your face has disappointed', 'still, your weight'] },
      { bitstring: '100000000', count: 128, prob: 0.0312, tenderness: ['your hand finds mine', 'and something holds that should have broken', 'a hand-worn ring'], resentment: ['your silence fills the room', 'and something stays that should have left by now', 'a hand-worn groove'] },
      { bitstring: '001000000', count: 123, prob: 0.03, tenderness: ['your hand finds mine', 'and something holds that should have broken', 'the door left open'], resentment: ['your silence fills the room', 'and something stays that should have left by now', 'the door slammed shut'] },
      { bitstring: '010010000', count: 98, prob: 0.0239, tenderness: ['your hand finds mine', 'I trace the atlas of your changing face', 'bread on the table'], resentment: ['your silence fills the room', 'I count the ways your face has disappointed', 'crumbs on the table'] },
      { bitstring: '000000001', count: 93, prob: 0.0227, tenderness: ['the children sleeping', 'and something holds that should have broken', 'still, your warmth'], resentment: ['the children watch us watching', 'and something stays that should have left by now', 'still, your weight'] },
    ],
  },
  {
    angle: 90,
    unique: 200,
    entropy: 5.56,
    top: [
      { bitstring: '000000000', count: 396, prob: 0.0967, tenderness: ['your hand finds mine', 'and something holds that should have broken', 'still, your warmth'], resentment: ['your silence fills the room', 'and something stays that should have left by now', 'still, your weight'] },
      { bitstring: '010000010', count: 331, prob: 0.0808, tenderness: ['seventeen winters', 'and something holds that should have broken', 'bread on the table'], resentment: ['seventeen years of this', 'and something stays that should have left by now', 'crumbs on the table'] },
      { bitstring: '000000100', count: 296, prob: 0.0723, tenderness: ['the kitchen light still on', 'and something holds that should have broken', 'still, your warmth'], resentment: ['the kitchen light, still on', 'and something stays that should have left by now', 'still, your weight'] },
      { bitstring: '000010000', count: 259, prob: 0.0632, tenderness: ['your hand finds mine', 'I trace the atlas of your changing face', 'still, your warmth'], resentment: ['your silence fills the room', 'I count the ways your face has disappointed', 'still, your weight'] },
      { bitstring: '010000000', count: 232, prob: 0.0566, tenderness: ['your hand finds mine', 'and something holds that should have broken', 'bread on the table'], resentment: ['your silence fills the room', 'and something stays that should have left by now', 'crumbs on the table'] },
      { bitstring: '010000110', count: 223, prob: 0.0544, tenderness: ['we built this room together', 'and something holds that should have broken', 'bread on the table'], resentment: ['we built these walls together', 'and something stays that should have left by now', 'crumbs on the table'] },
      { bitstring: '000000010', count: 194, prob: 0.0474, tenderness: ['seventeen winters', 'and something holds that should have broken', 'still, your warmth'], resentment: ['seventeen years of this', 'and something stays that should have left by now', 'still, your weight'] },
      { bitstring: '000010100', count: 149, prob: 0.0364, tenderness: ['the kitchen light still on', 'I trace the atlas of your changing face', 'still, your warmth'], resentment: ['the kitchen light, still on', 'I count the ways your face has disappointed', 'still, your weight'] },
      { bitstring: '010010010', count: 139, prob: 0.0339, tenderness: ['seventeen winters', 'I trace the atlas of your changing face', 'bread on the table'], resentment: ['seventeen years of this', 'I count the ways your face has disappointed', 'crumbs on the table'] },
      { bitstring: '000000110', count: 137, prob: 0.0334, tenderness: ['we built this room together', 'and something holds that should have broken', 'still, your warmth'], resentment: ['we built these walls together', 'and something stays that should have left by now', 'still, your weight'] },
    ],
  },
]

// Angle labels for display
export const ANGLE_LABELS = ['0', '\u03C0/8', '\u03C0/4', '3\u03C0/8', '\u03C0/2']
export const ANGLE_DEGREES = ['0\u00B0', '22.5\u00B0', '45\u00B0', '67.5\u00B0', '90\u00B0']
