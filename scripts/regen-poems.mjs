#!/usr/bin/env node
// Regenerate poem text in three data files using new word banks.
// Usage: node scripts/regen-poems.mjs

import { writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'app', 'poetry', 'data')

// ── New word banks ────────────────────────────────────────────────────

const PRESENCE_LINES = {
  line1: ['morning light through glass', 'your laugh, sudden rain', 'peaches on the sill', 'fingerprints in flour', 'the dog knows your step', 'two shadows, one wall', 'bread rising all night', 'plums warm from the tree'],
  line2: ['I learn your breathing by heart', 'the kitchen fills with slow steam', 'nothing needs to be explained', 'we hold still and the world turns', 'sunlight maps your sleeping face', 'we breathe in the same small room', 'something in us knows to stay', 'your hand rests where the light falls'],
  line3: ['the kettle exhales', 'both pillow dents warm', 'our coats share one hook', 'the garden gate swings', 'mint in the teacup', 'jam jar left open', 'the cat knows our bed', 'smoke curls from the roof'],
}

const ABSENCE_LINES = {
  line1: ['one plate in the rack', 'your book, spine still cracked', 'rain and no one home', 'fingerprints in flour', 'crumbs on the counter', 'cold side of the bed', 'one cup on the shelf', 'your scarf on the chair'],
  line2: ['the fridge hums for no one now', 'the stairs still creak where you stepped', 'I still reach across at night', 'each room holds a draft of you', 'no one turns the porch light off', 'even the shadows have left', 'nothing stirs except the dust', 'who waters the garden now'],
  line3: ['two keys, now just one', 'your mug, cold and stained', 'the faucet still drips', 'the blinds halfway drawn', 'moths at the window', 'frost on the inside', 'a half-read letter', 'weeds through the front path'],
}

// ── Bitstring → poem mapping ──────────────────────────────────────────

function bitstringToPoem(bs, bank) {
  const i1 = parseInt(bs.slice(6, 9), 2) // bits 6-8 → line1 index
  const i2 = parseInt(bs.slice(3, 6), 2) // bits 3-5 → line2 index
  const i3 = parseInt(bs.slice(0, 3), 2) // bits 0-2 → line3 index
  return [bank.line1[i1], bank.line2[i2], bank.line3[i3]]
}

function presence(bs) { return bitstringToPoem(bs, PRESENCE_LINES) }
function absence(bs) { return bitstringToPoem(bs, ABSENCE_LINES) }

// ── Load distributions ────────────────────────────────────────────────

const distSrc = readFileSync(join(DATA_DIR, 'distributions.ts'), 'utf-8')

function extractDist(name) {
  const re = new RegExp(`export const ${name}[^=]*=\\s*({[^}]+})`, 's')
  const m = distSrc.match(re)
  if (!m) throw new Error(`Could not find ${name} in distributions.ts`)
  return new Function(`return (${m[1]})`)()
}

const DIST_Z = extractDist('DIST_Z')
const DIST_X = extractDist('DIST_X')
const DIST_GHZ = extractDist('DIST_GHZ')

function topN(dist, n) {
  const TOTAL = 4096
  return Object.entries(dist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([bs, count]) => ({ bs, count, prob: +(count / TOTAL).toFixed(4) }))
}

// ── Helper to format arrays for TS output ─────────────────────────────

function q(s) { return `'${s.replace(/'/g, "\\'")}'` }
function fmtLines(lines) { return `[${lines.map(q).join(', ')}]` }

// ── FILE 1: topPoems.ts ──────────────────────────────────────────────

function generateTopPoems() {
  const topZ = topN(DIST_Z, 10)
  const topX = topN(DIST_X, 10)
  const topGhz = topN(DIST_GHZ, 4)

  // Build commentary for NOISE_POEMS referencing new poem text
  const noiseEntries = [
    {
      bs: '000101101', count: 27, source: 'GHZ', bank: 'presence',
      mkCommentary: (lines) =>
        `The GHZ state should produce only all-zeros or all-ones — full domestic calm or full intensity. This haiku leaked through decoherence into something sideways: ${lines[0]}, ${lines[1]}. The hardware found a middle register the circuit tried to forbid — not the grand entangled poles but ${lines[2]}, a small thing holding steady.`,
    },
    {
      bs: '110111010', count: 27, source: 'GHZ', bank: 'presence',
      mkCommentary: (lines) =>
        `Another impossible GHZ haiku. The circuit demanded unanimity; the hardware gave us ${lines[0]} and ${lines[1]}. Most of the qubits flipped but not all — a near-miss that reads like love remembered in its physical traces. ${lines[2]} closes it with something no one asked for.`,
    },
    {
      bs: '000100001', count: 50, source: 'X-basis', bank: 'absence',
      mkCommentary: (lines) =>
        `The Hadamard rotation reshuffles all the probabilities. Most outcomes cluster around the expected absence haiku, but 50 shots landed here — ${lines[0]} and ${lines[1]}. ${lines[2]}: the measurement basis changed, and what showed up was the quiet aftermath nobody predicted.`,
    },
    {
      bs: '101010010', count: 7, source: 'Z-basis', bank: 'presence',
      mkCommentary: (lines) =>
        `Deep in the tail of the distribution. The hardware found this haiku 7 times in 4,096 tries — a rare fluctuation where ${lines[0]} meets ${lines[1]}. ${lines[2]} is the kind of detail only noise would invent, too specific to be likely, too vivid to dismiss.`,
    },
    {
      bs: '111110111', count: 297, source: 'GHZ', bank: 'presence',
      mkCommentary: (lines) => {
        const fullOne = presence('111111111')
        return `One bit flip from the all-ones ideal. A single qubit error — the sixth qubit decohered — and the haiku shifted from the full ${fullOne[1]} to ${lines[1]}. The hardware almost got it right: ${lines[0]}, ${lines[2]}. The mistake was the better poem.`
      },
    },
  ]

  // GHZ_HAIKU
  const ghzHaiku = [
    { bitstring: '000000000', shots: 1427, poem: presence('000000000') },
    { bitstring: '111111111', shots: 936, poem: presence('111111111') },
  ]

  // Build output
  let out = ''

  // TOP_Z
  out += 'export const TOP_Z = [\n'
  for (const { bs, count, prob } of topZ) {
    out += `  { lines: ${fmtLines(presence(bs))}, count: ${count}, prob: ${prob} },\n`
  }
  out += ']\n\n'

  // TOP_X
  out += 'export const TOP_X = [\n'
  for (const { bs, count, prob } of topX) {
    out += `  { lines: ${fmtLines(absence(bs))}, count: ${count}, prob: ${prob} },\n`
  }
  out += ']\n\n'

  // TOP_GHZ
  out += 'export const TOP_GHZ = [\n'
  for (const { bs, count, prob } of topGhz) {
    out += `  { lines: ${fmtLines(presence(bs))}, count: ${count}, prob: ${prob} },\n`
  }
  out += ']\n\n'

  // NOISE_POEMS
  out += 'export const NOISE_POEMS = [\n'
  for (const np of noiseEntries) {
    const lines = np.bank === 'absence' ? absence(np.bs) : presence(np.bs)
    const commentary = np.mkCommentary(lines)
    out += '  {\n'
    out += `    lines: ${fmtLines(lines)},\n`
    out += `    count: ${np.count}, source: '${np.source}', bitstring: '${np.bs}',\n`
    out += `    commentary: '${commentary.replace(/'/g, "\\'")}',\n`
    out += '  },\n'
  }
  out += ']\n\n'

  // GHZ_HAIKU
  out += 'export const GHZ_HAIKU = [\n'
  for (const h of ghzHaiku) {
    out += '  {\n'
    out += `    bitstring: '${h.bitstring}',\n`
    out += `    shots: ${h.shots},\n`
    out += `    poem: ${fmtLines(h.poem)},\n`
    out += '  },\n'
  }
  out += ']\n\n'

  // BELL_COUPLETS — keep as-is from original
  const origSrc = readFileSync(join(DATA_DIR, 'topPoems.ts'), 'utf-8')
  const bellMatch = origSrc.match(/export const BELL_COUPLETS = \[[\s\S]*?\n\]/)
  if (!bellMatch) throw new Error('Could not find BELL_COUPLETS in topPoems.ts')
  out += bellMatch[0] + '\n'

  return out
}

// ── FILE 2: interferenceData.ts ──────────────────────────────────────

function generateInterferenceData() {
  const origSrc = readFileSync(join(DATA_DIR, 'interferenceData.ts'), 'utf-8')

  // Parse each angle block
  const angleBlocks = []
  const angleRe = /\{\s*angle:\s*(\d+(?:\.\d+)?),\s*unique:\s*(\d+),\s*entropy:\s*([\d.]+),\s*top:\s*\[([\s\S]*?)\],?\s*\}/g
  let m
  while ((m = angleRe.exec(origSrc)) !== null) {
    const angle = parseFloat(m[1])
    const unique = parseInt(m[2])
    const entropy = parseFloat(m[3])
    const topBlock = m[4]

    const poems = []
    const poemRe = /bitstring:\s*'(\d+)',\s*count:\s*(\d+),\s*prob:\s*([\d.]+)/g
    let pm
    while ((pm = poemRe.exec(topBlock)) !== null) {
      poems.push({ bitstring: pm[1], count: parseInt(pm[2]), prob: parseFloat(pm[3]) })
    }

    angleBlocks.push({ angle, unique, entropy, poems })
  }

  let out = ''
  out += '// Interference Draft: hardware results from Tuna-9\n'
  out += '// 5 rotation angles interpolating Z-basis (presence) to X-basis (absence)\n'
  out += '// Rz(2\u03B8)+Ry(\u03B8) pre-measurement rotation on all 9 qubits\n'
  out += '// \u03B8=0 and \u03B8=90 reuse existing data; \u03B8=22.5, 45, 67.5 are new circuits\n'
  out += '// Jobs 426290-426292 + existing 426093, 426094 \u00B7 4,096 shots each \u00B7 2026-02-14\n'
  out += '\n'
  out += 'export type InterferencePoem = {\n'
  out += '  bitstring: string\n'
  out += '  count: number\n'
  out += '  prob: number\n'
  out += '  presence: string[]\n'
  out += '  absence: string[]\n'
  out += '}\n'
  out += '\n'
  out += 'export type InterferenceAngle = {\n'
  out += '  angle: number\n'
  out += '  unique: number\n'
  out += '  entropy: number\n'
  out += '  top: InterferencePoem[]\n'
  out += '}\n'
  out += '\n'
  out += 'export const INTERFERENCE_DATA: InterferenceAngle[] = [\n'

  for (const { angle, unique, entropy, poems } of angleBlocks) {
    out += '  {\n'
    out += `    angle: ${angle},\n`
    out += `    unique: ${unique},\n`
    out += `    entropy: ${entropy},\n`
    out += '    top: [\n'
    for (const p of poems) {
      const pres = presence(p.bitstring)
      const abs = absence(p.bitstring)
      out += `      { bitstring: '${p.bitstring}', count: ${p.count}, prob: ${p.prob}, presence: ${fmtLines(pres)}, absence: ${fmtLines(abs)} },\n`
    }
    out += '    ],\n'
    out += '  },\n'
  }

  out += ']\n'
  out += '\n'
  out += '// Angle labels for display\n'
  out += "export const ANGLE_LABELS = ['0', '\u03C0/8', '\u03C0/4', '3\u03C0/8', '\u03C0/2']\n"
  out += "export const ANGLE_DEGREES = ['0\u00B0', '22.5\u00B0', '45\u00B0', '67.5\u00B0', '90\u00B0']\n"

  return out
}

// ── FILE 3: decoherenceData.ts ───────────────────────────────────────

function generateDecoherenceData() {
  const origSrc = readFileSync(join(DATA_DIR, 'decoherenceData.ts'), 'utf-8')

  const depthBlocks = []
  const depthRe = /\{\s*label:\s*'([^']+)',\s*nQubits:\s*(\d+),\s*nCZ:\s*(\d+),\s*fidelity:\s*([\d.]+),\s*entropy:\s*([\d.]+),\s*unique:\s*(\d+),\s*idealZero:\s*'(\d+)',\s*idealOne:\s*'(\d+)',\s*zeroCount:\s*(\d+),\s*oneCount:\s*(\d+),\s*top:\s*\[([\s\S]*?)\],?\s*\}/g
  let m
  while ((m = depthRe.exec(origSrc)) !== null) {
    const topBlock = m[11]
    const poems = []
    const poemRe2 = /\{\s*lines:\s*\[.*?\],\s*count:\s*(\d+),\s*prob:\s*([\d.]+),\s*bitstring:\s*'(\d+)'/g
    let pm
    while ((pm = poemRe2.exec(topBlock)) !== null) {
      poems.push({ bitstring: pm[3], count: parseInt(pm[1]), prob: parseFloat(pm[2]) })
    }

    depthBlocks.push({
      label: m[1], nQubits: parseInt(m[2]), nCZ: parseInt(m[3]),
      fidelity: parseFloat(m[4]), entropy: parseFloat(m[5]),
      unique: parseInt(m[6]), idealZero: m[7], idealOne: m[8],
      zeroCount: parseInt(m[9]), oneCount: parseInt(m[10]),
      poems,
    })
  }

  let out = ''
  out += '// Decoherence Gradient: GHZ states of increasing depth on Tuna-9\n'
  out += '// Linear CNOT chains on Hamiltonian path 3\u21921\u21924\u21922\u21925\u21927\u21928\u21926\n'
  out += '// GHZ-3 (job 426293), GHZ-5 (426294), GHZ-7 (426295), GHZ-9 (from DIST_GHZ)\n'
  out += '// 4,096 shots each \u00B7 2026-02-14\n'
  out += '\n'
  out += 'export type DecoherencePoem = {\n'
  out += '  lines: string[]\n'
  out += '  count: number\n'
  out += '  prob: number\n'
  out += '  bitstring: string\n'
  out += '}\n'
  out += '\n'
  out += 'export type DecoherenceDepth = {\n'
  out += '  label: string\n'
  out += '  nQubits: number\n'
  out += '  nCZ: number\n'
  out += '  fidelity: number\n'
  out += '  entropy: number\n'
  out += '  unique: number\n'
  out += '  idealZero: string\n'
  out += '  idealOne: string\n'
  out += '  zeroCount: number\n'
  out += '  oneCount: number\n'
  out += '  top: DecoherencePoem[]\n'
  out += '}\n'
  out += '\n'
  out += 'export const DECOHERENCE_DATA: DecoherenceDepth[] = [\n'

  for (const d of depthBlocks) {
    out += '  {\n'
    out += `    label: '${d.label}',\n`
    out += `    nQubits: ${d.nQubits},\n`
    out += `    nCZ: ${d.nCZ},\n`
    out += `    fidelity: ${d.fidelity},\n`
    out += `    entropy: ${d.entropy},\n`
    out += `    unique: ${d.unique},\n`
    out += `    idealZero: '${d.idealZero}',\n`
    out += `    idealOne: '${d.idealOne}',\n`
    out += `    zeroCount: ${d.zeroCount},\n`
    out += `    oneCount: ${d.oneCount},\n`
    out += '    top: [\n'
    for (const p of d.poems) {
      out += `      { lines: ${fmtLines(presence(p.bitstring))}, count: ${p.count}, prob: ${p.prob}, bitstring: '${p.bitstring}' },\n`
    }
    out += '    ],\n'
    out += '  },\n'
  }

  out += ']\n'

  return out
}

// ── Main ──────────────────────────────────────────────────────────────

console.log('Regenerating poem data files with new word banks...\n')

console.log('Sample mappings:')
console.log('  000000000 presence:', presence('000000000'))
console.log('  000000000 absence: ', absence('000000000'))
console.log('  111111111 presence:', presence('111111111'))
console.log('  111111111 absence: ', absence('111111111'))
console.log()

const topPoemsOut = generateTopPoems()
writeFileSync(join(DATA_DIR, 'topPoems.ts'), topPoemsOut)
console.log('Wrote topPoems.ts')

const interferenceOut = generateInterferenceData()
writeFileSync(join(DATA_DIR, 'interferenceData.ts'), interferenceOut)
console.log('Wrote interferenceData.ts')

const decoherenceOut = generateDecoherenceData()
writeFileSync(join(DATA_DIR, 'decoherenceData.ts'), decoherenceOut)
console.log('Wrote decoherenceData.ts')

console.log('\nDone.')
