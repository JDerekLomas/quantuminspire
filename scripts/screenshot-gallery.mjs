#!/usr/bin/env node
/**
 * Takes screenshots of all gallery visualizations using Puppeteer.
 * Usage: node scripts/screenshot-gallery.mjs
 *
 * Saves screenshots to public/gallery/ as slugified filenames.
 */

import puppeteer from 'puppeteer'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = join(__dirname, '..', 'public', 'gallery')

// All gallery items with their URLs
const VISUALIZATIONS = [
  { name: 'Blochy (kherb.io)', url: 'https://bloch.kherb.io/' },
  { name: 'unBLOCHed', url: 'https://unbloched.xyz/' },
  { name: 'cduck/bloch_sphere', url: 'https://github.com/cduck/bloch_sphere' },
  { name: 'Quirk', url: 'https://algassert.com/quirk' },
  { name: 'Quirk-E', url: 'https://quirk-e.dev/' },
  { name: 'quantum-viz.js', url: 'https://github.com/microsoft/quantum-viz.js' },
  { name: 'QCVIS', url: 'https://github.com/fh-igd-iet/qcvis' },
  { name: 'BraKetVue', url: 'https://github.com/Quantum-Flytrap/bra-ket-vue' },
  { name: 'animated-qubits', url: 'http://davidbkemp.github.io/animated-qubits/grover.html' },
  { name: 'Quantum Flytrap Virtual Lab', url: 'https://quantumflytrap.com/virtual-lab/' },
  { name: 'VENUS', url: 'https://arxiv.org/abs/2303.08366' },
  { name: 'Visual QFT', url: 'https://hapax.github.io/assets/visual-qft/' },
  { name: 'ShorVis', url: 'https://ieeexplore.ieee.org/document/8719175/' },
  { name: 'Black Opal', url: 'https://q-ctrl.com/black-opal' },
  { name: 'Quantum Playground', url: 'https://www.quantumplayground.net/' },
  { name: 'IBM Quantum Composer', url: 'https://quantum.cloud.ibm.com/composer' },
  { name: 'Qiskit Visualization Suite', url: 'https://docs.quantum.ibm.com/api/qiskit/visualization' },
  { name: 'QuTiP Visualization', url: 'https://qutip.readthedocs.io/en/latest/guide/guide-visualization.html' },
  { name: 'Surface Code Interactive', url: 'https://arthurpesah.me/blog/2023-05-13-surface-code/' },
  { name: 'QML Playground', url: 'https://arxiv.org/abs/2507.17931' },
]

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function takeScreenshot(page, viz, index) {
  const slug = slugify(viz.name)
  const filepath = join(OUTPUT_DIR, `${slug}.png`)

  // Skip if already exists (for resumability)
  if (existsSync(filepath)) {
    console.log(`[${index + 1}/${VISUALIZATIONS.length}] SKIP ${viz.name} (exists)`)
    return { name: viz.name, slug, status: 'skipped' }
  }

  console.log(`[${index + 1}/${VISUALIZATIONS.length}] ${viz.name} → ${viz.url}`)

  try {
    await page.goto(viz.url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    })

    // Wait a bit for JS-heavy apps to render
    await new Promise(r => setTimeout(r, 3000))

    await page.screenshot({
      path: filepath,
      type: 'png',
      clip: { x: 0, y: 0, width: 1280, height: 800 },
    })

    console.log(`  ✓ Saved ${slug}.png`)
    return { name: viz.name, slug, status: 'ok' }
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message}`)
    return { name: viz.name, slug, status: 'error', error: err.message }
  }
}

async function main() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 },
  })

  const page = await browser.newPage()

  // Block heavy resources for speed (optional — comment out for accuracy)
  // await page.setRequestInterception(true)

  const results = []

  for (let i = 0; i < VISUALIZATIONS.length; i++) {
    const result = await takeScreenshot(page, VISUALIZATIONS[i], i)
    results.push(result)
  }

  await browser.close()

  // Summary
  const ok = results.filter(r => r.status === 'ok').length
  const skipped = results.filter(r => r.status === 'skipped').length
  const errors = results.filter(r => r.status === 'error')

  console.log(`\nDone: ${ok} captured, ${skipped} skipped, ${errors.length} failed`)
  if (errors.length > 0) {
    console.log('Failed:')
    errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`))
  }

  // Write manifest for the gallery component to use
  const manifest = results
    .filter(r => r.status !== 'error')
    .reduce((acc, r) => {
      acc[r.name] = `/gallery/${r.slug}.png`
      return acc
    }, {})

  writeFileSync(
    join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  )
  console.log(`Manifest written to public/gallery/manifest.json`)
}

main().catch(console.error)
