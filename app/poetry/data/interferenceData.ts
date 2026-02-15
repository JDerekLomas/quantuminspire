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
      { bitstring: '000000000', count: 337, prob: 0.0823, presence: ['morning light through glass', 'I learn your breathing by heart', 'the kettle exhales'], absence: ['one plate in the rack', 'the fridge hums for no one now', 'two keys, now just one'] },
    ],
  },
  {
    angle: 22.5,
    unique: 362,
    entropy: 7.46,
    top: [
      { bitstring: '000010000', count: 116, prob: 0.0283, presence: ['morning light through glass', 'nothing needs to be explained', 'the kettle exhales'], absence: ['one plate in the rack', 'I still reach across at night', 'two keys, now just one'] },
    ],
  },
  {
    angle: 45,
    unique: 409,
    entropy: 7.54,
    top: [
      { bitstring: '000000000', count: 208, prob: 0.0508, presence: ['morning light through glass', 'I learn your breathing by heart', 'the kettle exhales'], absence: ['one plate in the rack', 'the fridge hums for no one now', 'two keys, now just one'] },
    ],
  },
  {
    angle: 67.5,
    unique: 269,
    entropy: 6.05,
    top: [
      { bitstring: '000000000', count: 678, prob: 0.1655, presence: ['morning light through glass', 'I learn your breathing by heart', 'the kettle exhales'], absence: ['one plate in the rack', 'the fridge hums for no one now', 'two keys, now just one'] },
    ],
  },
  {
    angle: 90,
    unique: 200,
    entropy: 5.56,
    top: [
      { bitstring: '000000000', count: 396, prob: 0.0967, presence: ['morning light through glass', 'I learn your breathing by heart', 'the kettle exhales'], absence: ['one plate in the rack', 'the fridge hums for no one now', 'two keys, now just one'] },
    ],
  },
]

// Angle labels for display
export const ANGLE_LABELS = ['0', 'π/8', 'π/4', '3π/8', 'π/2']
export const ANGLE_DEGREES = ['0°', '22.5°', '45°', '67.5°', '90°']
