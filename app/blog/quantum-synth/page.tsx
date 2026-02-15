import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import QuantumSynthClient from '@/app/synth/QuantumSynthClient'

export const metadata = {
  title: 'What Does a Molecule Sound Like?',
  description: 'We turned quantum chemistry eigenspectra into sound. Energy levels become harmonics, bond stretching becomes a pitch sweep, and dissociation sounds like a chord collapsing. Try it yourself.',
  alternates: { canonical: '/blog/quantum-synth' },
  openGraph: {
    title: 'What Does a Molecule Sound Like?',
    description: 'Quantum chemistry, sonified. Energy levels become harmonics you can hear.',
    type: 'article',
    publishedTime: '2026-02-16',
    authors: ['AI x Quantum Research Team'],
    tags: ['sonification', 'quantum chemistry', 'Web Audio', 'eigenspectrum', 'H2', 'LiH'],
  },
}

export default function QuantumSynthBlogPost() {
  const dataDir = join(process.cwd(), 'public/data')
  const h2 = JSON.parse(readFileSync(join(dataDir, 'h2-eigenspectrum.json'), 'utf8'))
  const lihPath = join(dataDir, 'lih-eigenspectrum.json')
  const lih = existsSync(lihPath) ? JSON.parse(readFileSync(lihPath, 'utf8')) : null
  const molecules = [h2, ...(lih ? [lih] : [])]

  return (
    <>
      <Nav section="blog" />

      <article className="pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-6">
          {/* Meta */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border text-[#8b5cf6] border-[#8b5cf630]">
              Technical
            </span>
            <span className="text-xs font-mono text-gray-500">2026-02-16</span>
            <span className="text-xs font-mono text-gray-600">AI x Quantum Research Team</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3 leading-tight">
            What Does a Molecule Sound Like?
          </h1>
          <p className="text-lg text-gray-400 mb-8 leading-relaxed">
            We turned quantum chemistry eigenspectra into sound. Energy levels become harmonics,
            bond stretching becomes a pitch sweep, and dissociation sounds like a chord collapsing.
          </p>

          <div className="flex flex-wrap gap-2 mb-10">
            {['sonification', 'quantum chemistry', 'Web Audio', 'eigenspectrum', 'H2', 'LiH', 'PySCF', 'OpenFermion'].map(tag => (
              <span key={tag} className="text-[10px] font-mono text-gray-500 px-2 py-0.5 rounded bg-white/5">{tag}</span>
            ))}
          </div>

          {/* ─── Content ──────────────────────────────────────────────────── */}
          <div className="prose-quantum">

            <p>
              Every molecule has a set of discrete energy levels &mdash; the eigenvalues of its
              Hamiltonian. These are the same values that determine which wavelengths of light
              a molecule absorbs or emits. Spectroscopists measure them with lasers. Quantum
              computers try to calculate them with VQE.
            </p>

            <p>
              We thought: what if you could <em>hear</em> them instead?
            </p>

            <h2>The idea</h2>

            <p>
              Map each energy eigenvalue to an audio oscillator. The ground state becomes a
              low-frequency fundamental. Excited states become higher harmonics, spaced
              according to their energy gaps. Degenerate levels &mdash; states with identical
              energy but different quantum numbers &mdash; add extra amplitude, like a louder
              partial in a chord.
            </p>

            <p>
              The mapping is exponential, the same way musical pitch works:
            </p>

            <pre><code>f = f_base &times; 2^(&Delta;E / octave_scale)</code></pre>

            <p>
              A 1.2 Ha energy gap maps to one octave above the fundamental.
              The ground state sits at 65 Hz (low C). Higher excited states
              climb up the frequency ladder. The result is a chord whose intervals
              are determined entirely by quantum mechanics.
            </p>

            <h2>Stretching the bond</h2>

            <p>
              The interesting part happens when you change the molecule&rsquo;s geometry.
              At equilibrium bond distance (0.74 &Aring; for H<sub>2</sub>), the energy levels
              are spread wide apart &mdash; you hear distinct harmonics with clear intervals.
              As you stretch the bond toward dissociation, the excited states converge toward
              the ground state. The harmonics crowd together. The chord collapses.
            </p>

            <p>
              You&rsquo;re hearing the potential energy surface. The same curve that every
              quantum chemistry textbook plots as energy vs. bond distance &mdash; now mapped
              to sound vs. time.
            </p>

            <h2>Try it</h2>

            <p>
              Press play, then drag the bond distance slider. Start with H<sub>2</sub> at
              equilibrium, then slowly pull the atoms apart. Switch to LiH for a richer
              sound &mdash; 12 qubits instead of 4, more energy levels, more harmonic complexity.
              Use Auto-Sweep to hear the full dissociation curve as a 12-second glissando.
            </p>

          </div>
        </div>

        {/* ─── Full-width interactive synth ─────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-6 my-12">
          <QuantumSynthClient molecules={molecules} embedded />
        </div>

        <div className="max-w-3xl mx-auto px-6">
          <div className="prose-quantum">

            <h2>What the controls mean</h2>

            <p>
              Every parameter has a physical interpretation:
            </p>

            <table>
              <thead>
                <tr><th>Control</th><th>Physics</th><th>Sound effect</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Bond distance</strong></td>
                  <td>Nuclear separation in &Aring;ngstr&ouml;ms</td>
                  <td>Spreading apart = harmonics converge, chord collapses</td>
                </tr>
                <tr>
                  <td><strong>Excitation</strong></td>
                  <td>Boltzmann temperature (Ha). Higher = more thermal population of excited states</td>
                  <td>Low = mostly fundamental. High = all levels equally loud</td>
                </tr>
                <tr>
                  <td><strong>Base frequency</strong></td>
                  <td>Pitch assigned to the ground state</td>
                  <td>Shifts everything up or down without changing intervals</td>
                </tr>
                <tr>
                  <td><strong>Spread</strong></td>
                  <td>Energy-to-frequency scaling (Ha per octave)</td>
                  <td>Compress = tighter harmonics. Expand = wider intervals</td>
                </tr>
                <tr>
                  <td><strong>Waveform</strong></td>
                  <td>Oscillator shape (not a quantum property &mdash; purely audio)</td>
                  <td>Sine = pure tone. Sawtooth = buzzy (extra overtones of each harmonic)</td>
                </tr>
                <tr>
                  <td><strong>Harmonic layers</strong></td>
                  <td>Toggle individual energy levels on/off</td>
                  <td>Isolate specific transitions. E<sub>0</sub> alone = pure fundamental</td>
                </tr>
              </tbody>
            </table>

            <h2>Two molecules</h2>

            <h3>H<sub>2</sub> &mdash; Hydrogen</h3>

            <p>
              The simplest molecule. 2 electrons, 4 spin-orbitals, 16 eigenvalues (9&ndash;10
              unique after degeneracy). The Jordan-Wigner encoding maps to 4 qubits. The
              sound is clean &mdash; a simple chord with clear harmonic structure. At
              equilibrium (0.74 &Aring;), the intervals are wide. The fundamental dominates.
            </p>

            <h3>LiH &mdash; Lithium hydride</h3>

            <p>
              An ionic molecule: lithium donates its valence electron to hydrogen. 4 electrons,
              12 spin-orbitals, 4,096 eigenvalues (we extract the lowest 30, yielding ~10
              unique levels after collapsing degeneracies). The sound is denser &mdash; more
              closely-spaced harmonics, a more complex timbre. The ionic character means
              the energy levels respond differently to bond stretching. The dissociation sound
              is qualitatively different from H<sub>2</sub>.
            </p>

            <h2>How we built it</h2>

            <p>The pipeline has five stages:</p>

            <ol>
              <li>
                <strong>Molecular integrals</strong> &mdash; <a href="https://pyscf.org" target="_blank" rel="noopener noreferrer">PySCF</a> computes
                one- and two-electron integrals from the molecular geometry in the STO-3G
                basis set. For LiH, this means solving Hartree-Fock for 4 electrons in 6 orbitals.
              </li>
              <li>
                <strong>Qubit Hamiltonian</strong> &mdash; <a href="https://quantumai.google/openfermion" target="_blank" rel="noopener noreferrer">OpenFermion</a> maps
                the fermionic Hamiltonian to Pauli operators via the Jordan-Wigner transformation.
                H<sub>2</sub> gives a 16&times;16 matrix. LiH gives 4,096&times;4,096.
              </li>
              <li>
                <strong>Diagonalization</strong> &mdash; NumPy (H<sub>2</sub>) or SciPy sparse
                eigensolver (LiH) extracts the eigenvalues at each bond distance. We compute
                28 distances for H<sub>2</sub> (0.3&ndash;3.0 &Aring;) and 33 for LiH (0.8&ndash;4.0 &Aring;).
              </li>
              <li>
                <strong>Audio synthesis</strong> &mdash; The <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API" target="_blank" rel="noopener noreferrer">Web Audio API</a> creates
                one OscillatorNode per energy level, each connected through a GainNode for
                Boltzmann weighting. Frequencies and amplitudes update in real time via
                exponentialRampToValueAtTime for smooth parameter transitions.
              </li>
              <li>
                <strong>Visualization</strong> &mdash; Two HTML Canvas panels, both sharing a
                frequency y-axis so energy level lines align exactly with their spectral peaks.
                The spectrogram scrolls left in a requestAnimationFrame loop, reading FFT data
                from an AnalyserNode. Wrapped in a CRT monitor aesthetic because science
                should look cool.
              </li>
            </ol>

            <h2>The quantum connection</h2>

            <p>
              These are the same Hamiltonians that run on quantum hardware. Our
              <a href="/experiments"> VQE experiments</a> on <a href="/tuna9">Tuna-9</a> and
              IBM Quantum try to find the ground state energy of H<sub>2</sub> and LiH
              variationally &mdash; using parameterized circuits and classical optimization.
              The eigenvalues you&rsquo;re hearing are what those quantum computers are trying
              to compute.
            </p>

            <p>
              The difference: quantum hardware gets one eigenvalue at a time (usually just the
              ground state), measured through noisy circuits with finite shots. Here, we cheat &mdash;
              we diagonalize the full Hamiltonian classically and get all eigenvalues at once.
              For H<sub>2</sub> (4 qubits) and LiH (12 qubits), classical diagonalization is
              trivial. For larger molecules &mdash; the ones that actually need quantum computers &mdash;
              you&rsquo;d need the real hardware. The sound would get richer. And harder to compute.
            </p>

            <p>
              <a href="/synth" className="text-[#00d4ff]">Open the full Quantum Synth &rarr;</a>
            </p>

          </div>

          {/* Sources */}
          <div className="mt-16 p-6 rounded-xl border border-white/5 bg-white/[0.02]">
            <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">Sources & References</h3>
            <ul className="space-y-2">
              <li className="text-sm">
                <a href="https://pyscf.org" target="_blank" rel="noopener noreferrer" className="text-[#00d4ff] hover:underline">PySCF</a>
                <span className="text-gray-600 text-xs font-mono ml-2">Molecular integral computation</span>
              </li>
              <li className="text-sm">
                <a href="https://quantumai.google/openfermion" target="_blank" rel="noopener noreferrer" className="text-[#00d4ff] hover:underline">OpenFermion</a>
                <span className="text-gray-600 text-xs font-mono ml-2">Fermionic-to-qubit Hamiltonian mapping</span>
              </li>
              <li className="text-sm">
                <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API" target="_blank" rel="noopener noreferrer" className="text-[#00d4ff] hover:underline">Web Audio API</a>
                <span className="text-gray-600 text-xs font-mono ml-2">Browser-native audio synthesis</span>
              </li>
              <li className="text-sm">
                <a href="https://en.wikipedia.org/wiki/Eigenvalue_algorithm" target="_blank" rel="noopener noreferrer" className="text-[#00d4ff] hover:underline">Eigenvalue algorithms</a>
                <span className="text-gray-600 text-xs font-mono ml-2">numpy.linalg.eigvalsh / scipy.sparse.linalg.eigsh</span>
              </li>
              <li className="text-sm">
                <a href="/synth" className="text-[#00d4ff] hover:underline">Quantum Synth (full interactive)</a>
                <span className="text-gray-600 text-xs font-mono ml-2">haiqu.org/synth</span>
              </li>
            </ul>
          </div>

          {/* Navigation */}
          <div className="mt-12 flex justify-between gap-4">
            <Link
              href="/blog"
              className="flex-1 p-4 rounded-lg border border-white/5 hover:border-white/10 transition-all group"
            >
              <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">&larr; Back</span>
              <div className="text-sm text-gray-300 group-hover:text-white mt-1">All posts</div>
            </Link>
            <Link
              href="/synth"
              className="flex-1 p-4 rounded-lg border border-white/5 hover:border-white/10 transition-all group text-right"
            >
              <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Full synth &rarr;</span>
              <div className="text-sm text-gray-300 group-hover:text-white mt-1">Quantum Synth</div>
            </Link>
          </div>
        </div>
      </article>

      <Footer links={[{ href: '/blog', label: 'All Posts' }, { href: '/synth', label: 'Quantum Synth' }, { href: '/', label: 'Research Home' }]} />
    </>
  )
}
