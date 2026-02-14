// Interference Draft: hardware results from Tuna-9
// 5 rotation angles interpolating Z-basis (presence) to X-basis (absence)
// Rz(2θ)+Ry(θ) pre-measurement rotation on all 9 qubits
// θ=0 and θ=90 reuse existing data; θ=22.5, 45, 67.5 are new circuits
// Jobs 426290-426292 + existing 426093, 426094 · 4,096 shots each · 2026-02-14

export type InterferencePoem = {
  bitstring: string
  count: number
  prob: number
  presence: string[]
  absence: string[]
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
      { bitstring: '000000000', count: 337, prob: 0.0823, presence: ['your hand finding mine', 'you pull me closer and stay', 'the door stays open'], absence: ['the empty pillow', 'I still remember your hands', 'the porch light still on'] },
      { bitstring: '000010000', count: 204, prob: 0.0498, presence: ['your hand finding mine', 'your voice fills the quiet house', 'the door stays open'], absence: ['the empty pillow', 'the walls remember your voice', 'the porch light still on'] },
      { bitstring: '100000000', count: 174, prob: 0.0425, presence: ['your hand finding mine', 'you pull me closer and stay', 'a shared glass of wine'], absence: ['the empty pillow', 'I still remember your hands', 'the clock keeps counting'] },
      { bitstring: '100010000', count: 147, prob: 0.0359, presence: ['your hand finding mine', 'your voice fills the quiet house', 'a shared glass of wine'], absence: ['the empty pillow', 'the walls remember your voice', 'the clock keeps counting'] },
      { bitstring: '000001000', count: 137, prob: 0.0334, presence: ['your hand finding mine', 'the room holds nothing but us', 'the door stays open'], absence: ['the empty pillow', 'your absence fills the whole room', 'the porch light still on'] },
      { bitstring: '000100000', count: 124, prob: 0.0303, presence: ['your hand finding mine', 'the silence between us hums', 'the door stays open'], absence: ['the empty pillow', 'the distance hums between us', 'the porch light still on'] },
      { bitstring: '000110000', count: 93, prob: 0.0227, presence: ['your hand finding mine', 'the whole world contracts to here', 'the door stays open'], absence: ['the empty pillow', 'what remains is what was real', 'the porch light still on'] },
      { bitstring: '000000001', count: 91, prob: 0.0222, presence: ['the warmth of your skin', 'you pull me closer and stay', 'the door stays open'], absence: ['a letter unsent', 'I still remember your hands', 'the porch light still on'] },
      { bitstring: '000011000', count: 90, prob: 0.022, presence: ['your hand finding mine', 'time slows when your eyes meet mine', 'the door stays open'], absence: ['the empty pillow', 'I keep the light on for you', 'the porch light still on'] },
      { bitstring: '100001000', count: 84, prob: 0.0205, presence: ['your hand finding mine', 'the room holds nothing but us', 'a shared glass of wine'], absence: ['the empty pillow', 'your absence fills the whole room', 'the clock keeps counting'] },
    ],
  },
  {
    angle: 22.5,
    unique: 362,
    entropy: 7.46,
    top: [
      { bitstring: '000010000', count: 116, prob: 0.0283, presence: ['your hand finding mine', 'your voice fills the quiet house', 'the door stays open'], absence: ['the empty pillow', 'the walls remember your voice', 'the porch light still on'] },
      { bitstring: '100010000', count: 103, prob: 0.0251, presence: ['your hand finding mine', 'your voice fills the quiet house', 'a shared glass of wine'], absence: ['the empty pillow', 'the walls remember your voice', 'the clock keeps counting'] },
      { bitstring: '000110000', count: 101, prob: 0.0247, presence: ['your hand finding mine', 'the whole world contracts to here', 'the door stays open'], absence: ['the empty pillow', 'what remains is what was real', 'the porch light still on'] },
      { bitstring: '000011000', count: 92, prob: 0.0225, presence: ['your hand finding mine', 'time slows when your eyes meet mine', 'the door stays open'], absence: ['the empty pillow', 'I keep the light on for you', 'the porch light still on'] },
      { bitstring: '100110000', count: 78, prob: 0.019, presence: ['your hand finding mine', 'the whole world contracts to here', 'a shared glass of wine'], absence: ['the empty pillow', 'what remains is what was real', 'the clock keeps counting'] },
      { bitstring: '100011000', count: 75, prob: 0.0183, presence: ['your hand finding mine', 'time slows when your eyes meet mine', 'a shared glass of wine'], absence: ['the empty pillow', 'I keep the light on for you', 'the clock keeps counting'] },
      { bitstring: '100111000', count: 70, prob: 0.0171, presence: ['your hand finding mine', 'your laugh echoes through the rooms', 'a shared glass of wine'], absence: ['the empty pillow', 'nothing moves without your warmth', 'the clock keeps counting'] },
      { bitstring: '100000000', count: 69, prob: 0.0168, presence: ['your hand finding mine', 'you pull me closer and stay', 'a shared glass of wine'], absence: ['the empty pillow', 'I still remember your hands', 'the clock keeps counting'] },
      { bitstring: '000010001', count: 65, prob: 0.0159, presence: ['the warmth of your skin', 'your voice fills the quiet house', 'the door stays open'], absence: ['a letter unsent', 'the walls remember your voice', 'the porch light still on'] },
      { bitstring: '000001000', count: 64, prob: 0.0156, presence: ['your hand finding mine', 'the room holds nothing but us', 'the door stays open'], absence: ['the empty pillow', 'your absence fills the whole room', 'the porch light still on'] },
    ],
  },
  {
    angle: 45,
    unique: 409,
    entropy: 7.54,
    top: [
      { bitstring: '000000000', count: 208, prob: 0.0508, presence: ['your hand finding mine', 'you pull me closer and stay', 'the door stays open'], absence: ['the empty pillow', 'I still remember your hands', 'the porch light still on'] },
      { bitstring: '100000000', count: 146, prob: 0.0356, presence: ['your hand finding mine', 'you pull me closer and stay', 'a shared glass of wine'], absence: ['the empty pillow', 'I still remember your hands', 'the clock keeps counting'] },
      { bitstring: '000001000', count: 112, prob: 0.0273, presence: ['your hand finding mine', 'the room holds nothing but us', 'the door stays open'], absence: ['the empty pillow', 'your absence fills the whole room', 'the porch light still on'] },
      { bitstring: '000010000', count: 90, prob: 0.022, presence: ['your hand finding mine', 'your voice fills the quiet house', 'the door stays open'], absence: ['the empty pillow', 'the walls remember your voice', 'the porch light still on'] },
      { bitstring: '000100000', count: 81, prob: 0.0198, presence: ['your hand finding mine', 'the silence between us hums', 'the door stays open'], absence: ['the empty pillow', 'the distance hums between us', 'the porch light still on'] },
      { bitstring: '001000000', count: 79, prob: 0.0193, presence: ['your hand finding mine', 'you pull me closer and stay', 'your name on my lips'], absence: ['the empty pillow', 'I still remember your hands', 'dust on your guitar'] },
      { bitstring: '000010010', count: 75, prob: 0.0183, presence: ['laughter in the dark', 'your voice fills the quiet house', 'the door stays open'], absence: ['rain on the window', 'the walls remember your voice', 'the porch light still on'] },
      { bitstring: '100001000', count: 68, prob: 0.0166, presence: ['your hand finding mine', 'the room holds nothing but us', 'a shared glass of wine'], absence: ['the empty pillow', 'your absence fills the whole room', 'the clock keeps counting'] },
      { bitstring: '000000001', count: 57, prob: 0.0139, presence: ['the warmth of your skin', 'you pull me closer and stay', 'the door stays open'], absence: ['a letter unsent', 'I still remember your hands', 'the porch light still on'] },
      { bitstring: '101000000', count: 55, prob: 0.0134, presence: ['your hand finding mine', 'you pull me closer and stay', 'the key in the lock'], absence: ['the empty pillow', 'I still remember your hands', 'fog on the window'] },
    ],
  },
  {
    angle: 67.5,
    unique: 269,
    entropy: 6.05,
    top: [
      { bitstring: '000000000', count: 678, prob: 0.1655, presence: ['your hand finding mine', 'you pull me closer and stay', 'the door stays open'], absence: ['the empty pillow', 'I still remember your hands', 'the porch light still on'] },
      { bitstring: '000000100', count: 193, prob: 0.0471, presence: ['the scent of your hair', 'you pull me closer and stay', 'the door stays open'], absence: ['the phone stays silent', 'I still remember your hands', 'the porch light still on'] },
      { bitstring: '010010010', count: 185, prob: 0.0452, presence: ['laughter in the dark', 'your voice fills the quiet house', 'salt on the pillow'], absence: ['rain on the window', 'the walls remember your voice', 'the train pulls away'] },
      { bitstring: '010000000', count: 163, prob: 0.0398, presence: ['your hand finding mine', 'you pull me closer and stay', 'salt on the pillow'], absence: ['the empty pillow', 'I still remember your hands', 'the train pulls away'] },
      { bitstring: '000000010', count: 155, prob: 0.0378, presence: ['laughter in the dark', 'you pull me closer and stay', 'the door stays open'], absence: ['rain on the window', 'I still remember your hands', 'the porch light still on'] },
      { bitstring: '000010010', count: 139, prob: 0.0339, presence: ['laughter in the dark', 'your voice fills the quiet house', 'the door stays open'], absence: ['rain on the window', 'the walls remember your voice', 'the porch light still on'] },
      { bitstring: '100000000', count: 128, prob: 0.0312, presence: ['your hand finding mine', 'you pull me closer and stay', 'a shared glass of wine'], absence: ['the empty pillow', 'I still remember your hands', 'the clock keeps counting'] },
      { bitstring: '001000000', count: 123, prob: 0.03, presence: ['your hand finding mine', 'you pull me closer and stay', 'your name on my lips'], absence: ['the empty pillow', 'I still remember your hands', 'dust on your guitar'] },
      { bitstring: '010010000', count: 98, prob: 0.0239, presence: ['your hand finding mine', 'your voice fills the quiet house', 'salt on the pillow'], absence: ['the empty pillow', 'the walls remember your voice', 'the train pulls away'] },
      { bitstring: '000000001', count: 93, prob: 0.0227, presence: ['the warmth of your skin', 'you pull me closer and stay', 'the door stays open'], absence: ['a letter unsent', 'I still remember your hands', 'the porch light still on'] },
    ],
  },
  {
    angle: 90,
    unique: 200,
    entropy: 5.56,
    top: [
      { bitstring: '000000000', count: 396, prob: 0.0967, presence: ['your hand finding mine', 'you pull me closer and stay', 'the door stays open'], absence: ['the empty pillow', 'I still remember your hands', 'the porch light still on'] },
      { bitstring: '010000010', count: 331, prob: 0.0808, presence: ['laughter in the dark', 'you pull me closer and stay', 'salt on the pillow'], absence: ['rain on the window', 'I still remember your hands', 'the train pulls away'] },
      { bitstring: '000000100', count: 296, prob: 0.0723, presence: ['the scent of your hair', 'you pull me closer and stay', 'the door stays open'], absence: ['the phone stays silent', 'I still remember your hands', 'the porch light still on'] },
      { bitstring: '000010000', count: 259, prob: 0.0632, presence: ['your hand finding mine', 'your voice fills the quiet house', 'the door stays open'], absence: ['the empty pillow', 'the walls remember your voice', 'the porch light still on'] },
      { bitstring: '010000000', count: 232, prob: 0.0566, presence: ['your hand finding mine', 'you pull me closer and stay', 'salt on the pillow'], absence: ['the empty pillow', 'I still remember your hands', 'the train pulls away'] },
      { bitstring: '010000110', count: 223, prob: 0.0544, presence: ['your breath on my neck', 'you pull me closer and stay', 'salt on the pillow'], absence: ['one cup on the shelf', 'I still remember your hands', 'the train pulls away'] },
      { bitstring: '000000010', count: 194, prob: 0.0474, presence: ['laughter in the dark', 'you pull me closer and stay', 'the door stays open'], absence: ['rain on the window', 'I still remember your hands', 'the porch light still on'] },
      { bitstring: '000010100', count: 149, prob: 0.0364, presence: ['the scent of your hair', 'your voice fills the quiet house', 'the door stays open'], absence: ['the phone stays silent', 'the walls remember your voice', 'the porch light still on'] },
      { bitstring: '010010010', count: 139, prob: 0.0339, presence: ['laughter in the dark', 'your voice fills the quiet house', 'salt on the pillow'], absence: ['rain on the window', 'the walls remember your voice', 'the train pulls away'] },
      { bitstring: '000000110', count: 137, prob: 0.0334, presence: ['your breath on my neck', 'you pull me closer and stay', 'the door stays open'], absence: ['one cup on the shelf', 'I still remember your hands', 'the porch light still on'] },
    ],
  },
]

// Angle labels for display
export const ANGLE_LABELS = ['0', '\u03C0/8', '\u03C0/4', '3\u03C0/8', '\u03C0/2']
export const ANGLE_DEGREES = ['0\u00B0', '22.5\u00B0', '45\u00B0', '67.5\u00B0', '90\u00B0']
