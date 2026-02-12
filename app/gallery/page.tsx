'use client'

import { useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Image from 'next/image'

type Viz = {
  name: string
  source: string
  url: string
  tech: string
  description: string
  quality: 'exceptional' | 'high' | 'medium'
  openSource: boolean
  ourVersion?: string
  embedUrl?: string
  category: string
  screenshot?: string
}

// Screenshot manifest — maps viz name to image path
const SCREENSHOTS: Record<string, string> = {
  "Blochy (kherb.io)": "/gallery/blochy-kherb-io.png",
  "unBLOCHed": "/gallery/unbloched.png",
  "cduck/bloch_sphere": "/gallery/cduck-bloch-sphere.png",
  "Quirk": "/gallery/quirk.png",
  "Quirk-E": "/gallery/quirk-e.png",
  "quantum-viz.js": "/gallery/quantum-viz-js.png",
  "QCVIS": "/gallery/qcvis.png",
  "BraKetVue": "/gallery/braketvue.png",
  "animated-qubits": "/gallery/animated-qubits.png",
  "Quantum Flytrap Virtual Lab": "/gallery/quantum-flytrap-virtual-lab.png",
  "VENUS": "/gallery/venus.png",
  "Visual QFT": "/gallery/visual-qft.png",
  "ShorVis": "/gallery/shorvis.png",
  "Black Opal": "/gallery/black-opal.png",
  "Quantum Playground": "/gallery/quantum-playground.png",
  "IBM Quantum Composer": "/gallery/ibm-quantum-composer.png",
  "Qiskit Visualization Suite": "/gallery/qiskit-visualization-suite.png",
  "QuTiP Visualization": "/gallery/qutip-visualization.png",
  "Surface Code Interactive": "/gallery/surface-code-interactive.png",
  "QML Playground": "/gallery/qml-playground.png",
}

const VISUALIZATIONS: Viz[] = [
  // --- Bloch Sphere ---
  {
    name: 'Blochy (kherb.io)',
    source: 'Kevin Herb',
    url: 'https://bloch.kherb.io/',
    tech: 'WebGL',
    description: 'Publication-quality Bloch sphere with time evolution, gate sequences, and exportable plots.',
    quality: 'high',
    openSource: false,
    ourVersion: '/bloch-sphere',
    embedUrl: 'https://bloch.kherb.io/',
    category: 'Bloch Sphere',
  },
  {
    name: 'unBLOCHed',
    source: 'gamberoillecito',
    url: 'https://unbloched.xyz/',
    tech: 'JavaScript',
    description: 'Interactive Bloch sphere for classroom teaching. Simple gate application with visual feedback.',
    quality: 'medium',
    openSource: true,
    ourVersion: '/bloch-sphere',
    embedUrl: 'https://unbloched.xyz/',
    category: 'Bloch Sphere',
  },
  {
    name: 'cduck/bloch_sphere',
    source: 'Casey Duckering',
    url: 'https://github.com/cduck/bloch_sphere',
    tech: 'Python / SVG / GIF',
    description: 'Programmatic Bloch sphere — generates animated GIFs and SVGs of gate sequences. 113 stars.',
    quality: 'high',
    openSource: true,
    category: 'Bloch Sphere',
  },

  // --- Circuit Visualizers ---
  {
    name: 'Quirk',
    source: 'Craig Gidney (Google)',
    url: 'https://algassert.com/quirk',
    tech: 'JavaScript / Canvas',
    description: 'The gold standard. Drag-and-drop gates, real-time probability/amplitude/Bloch displays inline. Up to 16 qubits. URL-shareable.',
    quality: 'exceptional',
    openSource: true,
    embedUrl: 'https://algassert.com/quirk',
    category: 'Circuit Editors',
  },
  {
    name: 'Quirk-E',
    source: 'DEQSE Project',
    url: 'https://quirk-e.dev/',
    tech: 'JavaScript',
    description: 'Extended Quirk with step-by-step inspector. Imports/exports OpenQASM, Qiskit, Cirq, Q#. PNG/SVG/PDF circuit export.',
    quality: 'high',
    openSource: true,
    embedUrl: 'https://quirk-e.dev/',
    category: 'Circuit Editors',
  },
  {
    name: 'quantum-viz.js',
    source: 'Microsoft',
    url: 'https://github.com/microsoft/quantum-viz.js',
    tech: 'TypeScript / SVG',
    description: 'Lightweight circuit diagram renderer. CDN-loadable, simple API. Designed for embedding.',
    quality: 'high',
    openSource: true,
    category: 'Circuit Editors',
  },

  // --- State Vector / Amplitude ---
  {
    name: 'QCVIS',
    source: 'Fraunhofer IGD',
    url: 'https://github.com/fh-igd-iet/qcvis',
    tech: 'Vue 3 / TypeScript / Tauri',
    description: 'Four visualization modes: state bar plot, Q-sphere, state cube (4D), hybrid state cube with phase disks. Oklab color space. Animated transitions.',
    quality: 'high',
    openSource: true,
    ourVersion: '/state-vector',
    category: 'State Vectors',
  },
  {
    name: 'BraKetVue',
    source: 'Quantum Flytrap',
    url: 'https://github.com/Quantum-Flytrap/bra-ket-vue',
    tech: 'Vue 3 / TypeScript',
    description: 'Reusable Vue components for quantum state (ket-viewer) and matrix (matrix-viewer) visualization. Backed by Unitary Fund.',
    quality: 'high',
    openSource: true,
    category: 'State Vectors',
  },
  {
    name: 'animated-qubits',
    source: 'David B Kemp',
    url: 'https://github.com/davidbkemp/animated-qubits',
    tech: 'JavaScript / npm',
    description: 'Smooth animated amplitude bar visualizations. Powers a Grover\'s algorithm step-through demo.',
    quality: 'high',
    openSource: true,
    ourVersion: '/grovers',
    embedUrl: 'http://davidbkemp.github.io/animated-qubits/grover.html',
    category: 'State Vectors',
  },

  // --- Entanglement ---
  {
    name: 'Quantum Flytrap Virtual Lab',
    source: 'Piotr Migdal et al.',
    url: 'https://quantumflytrap.com/virtual-lab/',
    tech: 'Vue.js / quantum-tensors',
    description: 'Optical table simulation with drag-and-drop beam splitters, polarizers, detectors. Real-time entanglement. Published at CHI 2022.',
    quality: 'exceptional',
    openSource: false,
    ourVersion: '/entanglement',
    category: 'Entanglement',
  },
  {
    name: 'VENUS',
    source: 'EuroVis 2023',
    url: 'https://arxiv.org/abs/2303.08366',
    tech: 'Research prototype',
    description: 'Novel geometric representation using semicircles. Addresses Bloch sphere\'s inability to show entanglement. 2D encoding of amplitude + phase.',
    quality: 'high',
    openSource: false,
    category: 'Entanglement',
  },

  // --- Algorithms ---
  {
    name: 'Visual QFT',
    source: 'hapax (GitHub)',
    url: 'https://hapax.github.io/assets/visual-qft/',
    tech: 'Web-based',
    description: 'QFT through geometric intuition — interactive linkage applet shows how Fourier transform relates to high-dimensional Hilbert spaces.',
    quality: 'high',
    openSource: true,
    embedUrl: 'https://hapax.github.io/assets/visual-qft/',
    category: 'Algorithms',
  },
  {
    name: 'ShorVis',
    source: 'IEEE VIS 2019',
    url: 'https://ieeexplore.ieee.org/document/8719175/',
    tech: 'Web-based',
    description: 'Comprehensive Shor\'s algorithm visualization integrating Bloch sphere, circuit diagram, and probability distribution in one view.',
    quality: 'high',
    openSource: true,
    category: 'Algorithms',
  },

  // --- Educational Platforms ---
  {
    name: 'Black Opal',
    source: 'Q-CTRL',
    url: 'https://q-ctrl.com/black-opal',
    tech: 'Web (Chrome/Safari)',
    description: '350+ interactive activities, 3D Bloch spheres, wave simulations. University-adopted. The gold standard for educational quantum UX.',
    quality: 'exceptional',
    openSource: false,
    category: 'Education Platforms',
  },
  {
    name: 'Quantum Playground',
    source: 'Google',
    url: 'https://www.quantumplayground.net/',
    tech: 'WebGL (GPU-accelerated)',
    description: 'GPU-accelerated via WebGL textures. Up to 22 qubits in browser. Own scripting language, built-in Grover\'s and Shor\'s, 3D amplitude/phase viz.',
    quality: 'high',
    openSource: true,
    embedUrl: 'https://www.quantumplayground.net/',
    category: 'Education Platforms',
  },
  {
    name: 'IBM Quantum Composer',
    source: 'IBM',
    url: 'https://quantum.cloud.ibm.com/composer',
    tech: 'Web-based',
    description: 'Drag-and-drop circuits with phase disks, inspect mode. Connects to real IBM quantum processors. Export to SVG/PNG.',
    quality: 'high',
    openSource: false,
    category: 'Education Platforms',
  },

  // --- Measurement / Probability ---
  {
    name: 'Qiskit Visualization Suite',
    source: 'IBM / Qiskit',
    url: 'https://docs.quantum.ibm.com/api/qiskit/visualization',
    tech: 'Python / Matplotlib',
    description: 'The publication standard: Q-sphere, city plot, Hinton diagram, Paulivec, histograms, Bloch multivector. Used in most quantum papers.',
    quality: 'exceptional',
    openSource: true,
    ourVersion: '/measurement',
    category: 'Publication Tools',
  },
  {
    name: 'QuTiP Visualization',
    source: 'QuTiP Project',
    url: 'https://qutip.readthedocs.io/en/latest/guide/guide-visualization.html',
    tech: 'Python / Matplotlib',
    description: 'Wigner functions, Husimi Q-functions, density matrices, process tomography. The standard for open quantum systems research.',
    quality: 'high',
    openSource: true,
    category: 'Publication Tools',
  },

  // --- Unique / Novel ---
  {
    name: 'Surface Code Interactive',
    source: 'Arthur Pesah',
    url: 'https://arthurpesah.me/blog/2023-05-13-surface-code/',
    tech: 'Web-based',
    description: 'Interactive web explanation of surface codes (toric, planar, rotated) with clickable visual elements. Excellent for QEC education.',
    quality: 'high',
    openSource: true,
    category: 'Novel / Unique',
  },
  {
    name: 'QML Playground',
    source: 'arXiv 2025',
    url: 'https://arxiv.org/abs/2507.17931',
    tech: 'Web-based',
    description: 'TensorFlow Playground-style interface for quantum ML. Visualizes data re-uploading classifiers and parameter optimization.',
    quality: 'high',
    openSource: false,
    category: 'Novel / Unique',
  },
]

const CATEGORIES = Array.from(new Set(VISUALIZATIONS.map(v => v.category)))

type OurViz = {
  name: string
  href: string
  description: string
  concept: string
  tech: string
}

const OUR_INTERACTIVES: OurViz[] = [
  { name: 'Bloch Sphere', href: '/bloch-sphere', concept: 'Single-qubit states', description: 'Apply H, X, Y, Z, S, T gates and watch the state vector rotate in 3D', tech: 'Three.js' },
  { name: 'State Vector', href: '/state-vector', concept: 'Multi-qubit amplitudes', description: 'Amplitude bars and phase wheels for up to 4 qubits', tech: 'React + SVG' },
  { name: 'Q-Sphere', href: '/qsphere', concept: 'Multi-qubit geometry', description: 'Qiskit-style Q-sphere with amplitude-sized dots on a Hamming-distance sphere', tech: 'Three.js' },
  { name: 'Entanglement', href: '/entanglement', concept: 'Two-qubit correlations', description: 'Create Bell states with H+CNOT and see measurement correlations build up', tech: 'React + Canvas' },
  { name: 'Interference', href: '/interference', concept: 'Wave mechanics', description: 'Constructive and destructive interference of quantum amplitudes', tech: 'React + SVG' },
  { name: 'Measurement', href: '/measurement', concept: 'Born rule / collapse', description: 'Repeated measurement of superposition states, histogram builds shot by shot', tech: 'React + Canvas' },
  { name: 'Teleportation', href: '/teleportation', concept: 'Quantum teleportation', description: 'Step through the full protocol: entanglement, Bell measurement, correction', tech: 'React + SVG' },
  { name: "Grover's Search", href: '/grovers', concept: 'Amplitude amplification', description: 'Watch the marked state amplitude grow with each oracle + diffusion iteration', tech: 'React + SVG' },
  { name: 'Rabi Oscillations', href: '/rabi', concept: 'Driven qubit dynamics', description: 'Tune drive frequency and amplitude, see resonance and decoherence', tech: 'Three.js + Canvas' },
  { name: 'Hamiltonians', href: '/hamiltonians', concept: 'Molecular energy', description: 'Explore H2 Pauli decomposition, coefficients, and bond-distance dependence', tech: 'React + Recharts' },
  { name: 'Ansatz Explorer', href: '/ansatz', concept: 'VQE circuit design', description: 'Adjust variational parameters and see how the ansatz covers Hilbert space', tech: 'React + SVG' },
  { name: 'Sonification', href: '/listen', concept: 'Quantum as sound', description: 'Hear the difference between separable and entangled states', tech: 'Web Audio API' },
]

const qualityColor = {
  exceptional: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  high: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  medium: 'text-gray-400 bg-gray-400/10 border-gray-400/30',
}

const qualityLabel = {
  exceptional: 'Exceptional',
  high: 'High',
  medium: 'Good',
}

export default function GalleryPage() {
  const [filter, setFilter] = useState<string | null>(null)
  const [embedViz, setEmbedViz] = useState<Viz | null>(null)

  const filtered = filter
    ? VISUALIZATIONS.filter(v => v.category === filter)
    : VISUALIZATIONS

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      <Nav section="gallery" />
      {/* Header */}
      <div className="bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5 px-4 h-12 flex items-center gap-4">
        <Link href="/" className="text-xs font-mono text-gray-500 hover:text-white transition-colors">&larr; home</Link>
        <span className="text-sm font-semibold text-[#00d4ff]">Visualization Gallery</span>
        <span className="text-xs text-gray-600 font-mono ml-auto">{VISUALIZATIONS.length} visualizations cataloged</span>
      </div>

      {/* Intro */}
      <div className="max-w-6xl mx-auto px-6 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-white mb-2">Quantum Visualization Gallery</h1>
        <p className="text-sm text-gray-400 max-w-2xl">
          Interactive demos we built to make quantum intuitive, plus a curated catalog of
          the best visualization tools across the web.
        </p>
      </div>

      {/* Our Interactives */}
      <div className="max-w-6xl mx-auto px-6 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-gradient-to-r from-[#00ff88]/30 to-transparent" />
          <span className="text-xs font-mono uppercase tracking-widest text-[#00ff88]/70">Our interactives</span>
          <div className="h-px flex-1 bg-gradient-to-l from-[#00ff88]/30 to-transparent" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {OUR_INTERACTIVES.map(viz => (
            <Link
              key={viz.href}
              href={viz.href}
              className="group p-4 rounded-lg border border-[#00ff88]/10 bg-[#00ff88]/[0.02] hover:bg-[#00ff88]/[0.06] hover:border-[#00ff88]/25 transition-all"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-white group-hover:text-[#00ff88] transition-colors">{viz.name}</span>
                <span className="text-[10px] font-mono text-gray-600">{viz.tech}</span>
              </div>
              <span className="block text-[10px] font-mono text-[#00ff88]/60 uppercase tracking-wider mb-1.5">{viz.concept}</span>
              <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{viz.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* External Tools Section */}
      <div className="max-w-6xl mx-auto px-6 pb-2">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-gradient-to-r from-[#00d4ff]/30 to-transparent" />
          <span className="text-xs font-mono uppercase tracking-widest text-[#00d4ff]/70">External tools</span>
          <div className="h-px flex-1 bg-gradient-to-l from-[#00d4ff]/30 to-transparent" />
        </div>
      </div>

      {/* Category filters */}
      <div className="max-w-6xl mx-auto px-6 pb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1.5 text-xs font-mono rounded border transition-all ${
              filter === null
                ? 'bg-[#00d4ff]/20 border-[#00d4ff]/40 text-[#00d4ff]'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
            }`}
          >
            All ({VISUALIZATIONS.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = VISUALIZATIONS.filter(v => v.category === cat).length
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat === filter ? null : cat)}
                className={`px-3 py-1.5 text-xs font-mono rounded border transition-all ${
                  filter === cat
                    ? 'bg-[#00d4ff]/20 border-[#00d4ff]/40 text-[#00d4ff]'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                {cat} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((viz, i) => (
            <div
              key={i}
              className="bg-white/[0.03] border border-white/5 rounded-lg overflow-hidden hover:border-white/10 transition-all group"
            >
              {/* Preview area */}
              <div className="h-44 bg-gradient-to-br from-white/[0.02] to-transparent flex items-center justify-center relative overflow-hidden">
                {SCREENSHOTS[viz.name] ? (
                  <button
                    onClick={() => viz.embedUrl ? setEmbedViz(viz) : window.open(viz.url, '_blank')}
                    className="w-full h-full relative group/img"
                  >
                    <Image
                      src={SCREENSHOTS[viz.name]}
                      alt={`Screenshot of ${viz.name}`}
                      fill
                      className="object-cover object-top opacity-80 group-hover/img:opacity-100 transition-opacity"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    {viz.embedUrl && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity">
                        <svg className="w-10 h-10 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                  </button>
                ) : viz.embedUrl ? (
                  <button
                    onClick={() => setEmbedViz(viz)}
                    className="text-xs font-mono text-gray-500 hover:text-[#00d4ff] transition-colors flex flex-col items-center gap-2"
                  >
                    <svg className="w-8 h-8 opacity-40 group-hover:opacity-70 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Preview live demo
                  </button>
                ) : (
                  <div className="text-xs font-mono text-gray-600 text-center px-4">
                    {viz.tech}
                  </div>
                )}

                {/* Quality badge */}
                <span className={`absolute top-2 right-2 text-[10px] font-mono px-2 py-0.5 rounded border ${qualityColor[viz.quality]} z-10`}>
                  {qualityLabel[viz.quality]}
                </span>

                {/* Our version badge */}
                {viz.ourVersion && (
                  <Link
                    href={viz.ourVersion}
                    className="absolute top-2 left-2 text-[10px] font-mono px-2 py-0.5 rounded border border-green-400/30 bg-green-400/10 text-green-400 hover:bg-green-400/20 transition-colors z-10"
                  >
                    Our version &rarr;
                  </Link>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-white">{viz.name}</h3>
                  {viz.openSource && (
                    <span className="text-[10px] font-mono text-gray-500 border border-white/10 px-1.5 py-0.5 rounded shrink-0">
                      OSS
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-gray-500 mb-2">{viz.source} &middot; {viz.tech}</div>
                <p className="text-xs text-gray-400 leading-relaxed mb-3">{viz.description}</p>
                <a
                  href={viz.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-[#00d4ff]/70 hover:text-[#00d4ff] transition-colors"
                >
                  Visit &rarr;
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-t border-white/5 py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap gap-8 text-xs font-mono text-gray-500">
          <div><span className="text-white">{VISUALIZATIONS.filter(v => v.openSource).length}</span> open source</div>
          <div><span className="text-white">{VISUALIZATIONS.filter(v => v.quality === 'exceptional').length}</span> exceptional quality</div>
          <div><span className="text-white">{VISUALIZATIONS.filter(v => v.ourVersion).length}</span> with our replications</div>
          <div><span className="text-white">{VISUALIZATIONS.filter(v => v.embedUrl).length}</span> with live demos</div>
          <div className="ml-auto">
            <Link href="/gallery" className="text-[#00d4ff]/60 hover:text-[#00d4ff]">
              Full visualization catalog &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Embed modal */}
      {embedViz && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setEmbedViz(null)}
        >
          <div
            className="w-full max-w-5xl h-[80vh] bg-[#0a0a1a] border border-white/10 rounded-lg overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 h-10 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-white">{embedViz.name}</span>
                <a
                  href={embedViz.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-[#00d4ff]/60 hover:text-[#00d4ff]"
                >
                  Open in new tab &rarr;
                </a>
              </div>
              <button
                onClick={() => setEmbedViz(null)}
                className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
              >
                &times;
              </button>
            </div>
            <iframe
              src={embedViz.embedUrl}
              className="flex-1 w-full bg-white"
              sandbox="allow-scripts allow-same-origin"
              title={embedViz.name}
            />
          </div>
        </div>
      )}
    </div>
  )
}
