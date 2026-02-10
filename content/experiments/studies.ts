export interface ExperimentStudy {
  slug: string
  type: string
  title: string
  subtitle: string
  abstract: string
  researchQuestion: string
  priorWork: string
  method: string
  discussion: string
  sources: { label: string; url: string }[]
  status: 'simulation' | 'hardware' | 'complete'
}

export const studies: ExperimentStudy[] = [
  {
    slug: 'bell-calibration',
    type: 'bell_calibration',
    title: 'Bell State Calibration',
    subtitle: 'The simplest test of quantum entanglement across three platforms',
    abstract: 'We prepare the simplest entangled quantum state -- a Bell pair -- on three different quantum processors and compare how faithfully each one creates it. The emulator is perfect, IBM Marrakesh hits 99%, and Tuna-9 reaches 87%, revealing how noise varies across platforms.',
    status: 'complete',
    researchQuestion:
      'How faithfully can current quantum processors prepare a maximally entangled two-qubit Bell state, and how does noise manifest differently across hardware architectures?',
    priorWork: `
<p>The Bell state |&Phi;+&rang; = (|00&rang; + |11&rang;) / &radic;2 is the foundational building block of quantum entanglement, first described by John Bell in 1964 to test local hidden variable theories. In practice, Bell state preparation serves as the most basic calibration benchmark for any quantum processor: if a device cannot reliably produce this two-qubit state, it cannot run more complex algorithms.</p>

<p>Modern superconducting quantum processors typically achieve Bell state fidelities of 99-99.9% on their best qubit pairs. IBM's Eagle and Heron processors routinely demonstrate &gt;99% fidelity, while newer architectures like Quantum Inspire's Tuna-9 (a superconducting transmon processor) are still being characterized. The key question is not whether entanglement works -- it does -- but how the <em>noise signature</em> differs between platforms.</p>

<p>A perfect Bell state produces only |00&rang; and |11&rang; outcomes (50/50). Any leakage into |01&rang; or |10&rang; directly measures decoherence and gate errors. This makes Bell calibration the ideal first experiment for a new quantum backend.</p>
`,
    method: `
<p>We prepare the Bell state |&Phi;+&rang; using a minimal circuit: a Hadamard gate on qubit 0 followed by a CNOT gate with qubit 0 as control and qubit 1 as target. The circuit is expressed in cQASM 3.0 for Quantum Inspire backends and equivalent Qiskit for IBM.</p>

<p><strong>Circuit:</strong> H(q[0]) &rarr; CNOT(q[0], q[1]) &rarr; Measure all</p>

<p><strong>Protocol:</strong></p>
<ul>
<li>1024 shots per backend (emulator, IBM ibm_torino, QI Tuna-9)</li>
<li>Fidelity calculated as (count_00 + count_11) / total_shots</li>
<li>Same logical circuit on all platforms, translated to each native gate set by the respective compiler</li>
</ul>
`,
    discussion: `
<p>The emulator achieves perfect 100% fidelity as expected -- it simulates ideal quantum mechanics with no noise. This serves as our baseline.</p>

<p><strong>IBM ibm_torino (99.05% fidelity):</strong> Nearly perfect, with minimal leakage into |01&rang; and |10&rang; states. IBM's 133-qubit Eagle processor benefits from years of calibration and error mitigation. The ~1% error is consistent with IBM's published single-qubit and two-qubit gate error rates.</p>

<p><strong>QI Tuna-9 (result varies by run):</strong> As a newer 9-qubit superconducting processor, Tuna-9 shows more noise in the Bell state preparation. The parity leakage -- probability of measuring states with odd parity (|01&rang; or |10&rang;) -- provides a direct measure of the CNOT gate fidelity.</p>

<p>The cross-platform comparison validates our experimental pipeline: the same abstract circuit, submitted to three different backends by an autonomous agent, produces physically meaningful and distinguishable results. The emulator-first approach lets us verify circuit correctness before spending hardware time.</p>
`,
    sources: [
      { label: 'Bell, J.S. "On the Einstein Podolsky Rosen paradox" (1964)', url: 'https://doi.org/10.1103/PhysicsPhysiqueFizika.1.195' },
      { label: 'IBM Quantum Platform', url: 'https://quantum.ibm.com/' },
      { label: 'Quantum Inspire by QuTech', url: 'https://www.quantum-inspire.com/' },
    ],
  },

  {
    slug: 'ghz-state',
    type: 'ghz_state',
    title: 'GHZ State Preparation',
    subtitle: 'Testing multi-qubit entanglement scaling with 3-qubit GHZ states',
    abstract: 'We scale entanglement from two to three qubits using GHZ states and measure how noise worsens with circuit complexity. Adding one qubit drops IBM\'s fidelity from 99% to 98%, while Tuna-9 shows more significant degradation.',
    status: 'complete',
    researchQuestion:
      'How does entanglement fidelity degrade when scaling from 2-qubit Bell states to 3-qubit GHZ states, and what does parity leakage reveal about correlated errors?',
    priorWork: `
<p>The Greenberger-Horne-Zeilinger (GHZ) state |GHZ&rang; = (|000&rang; + |111&rang;) / &radic;2 extends Bell-type entanglement to three or more qubits. First proposed in 1989 by Daniel Greenberger, Michael Horne, and Anton Zeilinger, GHZ states are maximally entangled and form the basis for quantum error correction codes, quantum secret sharing, and multi-party quantum communication.</p>

<p>GHZ states are more fragile than Bell states because they require additional entangling gates and involve more qubits exposed to decoherence simultaneously. The key diagnostic is <strong>parity</strong>: a perfect GHZ state only produces even-parity outcomes (|000&rang; and |111&rang;). Any odd-parity states (|001&rang;, |010&rang;, |011&rang;, |100&rang;, |101&rang;, |110&rang;) indicate hardware errors. The ratio of even-to-odd parity outcomes measures how well the device maintains multi-qubit coherence.</p>

<p>On current NISQ hardware, 3-qubit GHZ fidelities typically range from 85-98%, depending on the connectivity and gate error rates of the specific qubit layout chosen by the compiler.</p>
`,
    method: `
<p>We prepare the 3-qubit GHZ state using a cascade of entangling gates: a Hadamard on qubit 0, then CNOT gates chaining entanglement through qubits 1 and 2.</p>

<p><strong>Circuit:</strong> H(q[0]) &rarr; CNOT(q[0], q[1]) &rarr; CNOT(q[1], q[2]) &rarr; Measure all</p>

<p><strong>Protocol:</strong></p>
<ul>
<li>1024 shots per backend</li>
<li>Fidelity = (count_000 + count_111) / total</li>
<li>Parity analysis: fraction of even-parity vs odd-parity outcomes</li>
<li>Same circuit on emulator, IBM ibm_torino, and QI Tuna-9</li>
</ul>
`,
    discussion: `
<p>The scaling from Bell (2-qubit) to GHZ (3-qubit) reveals how noise compounds with circuit depth and qubit count.</p>

<p><strong>Emulator (100% fidelity):</strong> Perfect as expected -- only |000&rang; and |111&rang; appear in exactly equal proportions.</p>

<p><strong>IBM ibm_torino (98.14% fidelity):</strong> Only a small degradation from the Bell state's 99.05%. IBM's processor handles the additional CNOT gate well, suggesting the qubit connectivity chosen by the transpiler minimizes SWAP overhead. The ~2% error is distributed across multiple odd-parity states, consistent with independent depolarizing noise on each gate.</p>

<p><strong>QI Tuna-9:</strong> Shows more significant parity leakage (~15% into wrong-parity states on some runs). This is expected for a 9-qubit device where the additional CNOT gate accumulates more error. The parity distribution provides useful diagnostic information about correlated vs. independent errors.</p>

<p>The fidelity drop from Bell to GHZ is a proxy for how algorithms with deeper circuits will perform. If each additional entangling layer costs ~1-2% fidelity, this bounds the useful circuit depth for variational algorithms on these devices.</p>
`,
    sources: [
      { label: 'Greenberger, Horne, Zeilinger "Going beyond Bell\'s theorem" (1989)', url: 'https://doi.org/10.1007/978-94-017-0849-4_10' },
      { label: 'Monz et al. "14-qubit entanglement" (2011)', url: 'https://doi.org/10.1103/PhysRevLett.106.130506' },
      { label: 'Quantum Inspire Tuna-9 backend', url: 'https://www.quantum-inspire.com/' },
    ],
  },

  {
    slug: 'vqe-h2',
    type: 'vqe_h2',
    title: 'H\u2082 Ground State Energy via VQE',
    subtitle: 'Variational quantum chemistry on 2 qubits -- from simulation to hardware',
    abstract: 'We calculate the ground state energy of a hydrogen molecule using a hybrid quantum-classical algorithm on two qubits. The emulator nails chemical accuracy across the full dissociation curve; real hardware shows how noise pushes energies away from the exact answer.',
    status: 'complete',
    researchQuestion:
      'Can a 2-qubit variational quantum eigensolver (VQE) calculate the ground state energy of molecular hydrogen within chemical accuracy (1.6 milliHartree), and how does hardware noise affect the result?',
    priorWork: `
<p>The Variational Quantum Eigensolver (VQE) was proposed by Peruzzo et al. in 2014 as a hybrid quantum-classical algorithm for finding molecular ground states. It is considered one of the most promising near-term applications of quantum computing because it can tolerate some hardware noise through its variational nature.</p>

<p>For molecular hydrogen (H&lt;sub&gt;2&lt;/sub&gt;), the electronic structure problem can be mapped to qubits using the Jordan-Wigner or Bravyi-Kitaev transformation. The minimal STO-3G basis set gives a 4-qubit Hamiltonian, but Bravyi-Kitaev transformation with qubit tapering (exploiting Z&lt;sub&gt;2&lt;/sub&gt; symmetries) reduces this to just 2 qubits -- the minimum for a non-trivial quantum chemistry calculation.</p>

<p>Sagastizabal et al. (2019) demonstrated VQE on a superconducting transmon processor, achieving chemical accuracy at the equilibrium bond distance. Our experiment replicates and extends this work across three platforms, including a full 14-point dissociation curve on the emulator.</p>

<p>The gold standard is <strong>chemical accuracy</strong>: getting within 1.6 milliHartree (1 kcal/mol) of the exact Full Configuration Interaction (FCI) energy. At the equilibrium bond distance of 0.735 &Aring;, the FCI energy is -1.1373 Hartree.</p>
`,
    method: `
<p>We use the 2-qubit Hamiltonian obtained by Bravyi-Kitaev transformation with qubit tapering of the H&lt;sub&gt;2&lt;/sub&gt; STO-3G Hamiltonian in the correct parity sector. The Hamiltonian has the form:</p>

<p style="font-family: monospace; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 4px;">
H = g&lt;sub&gt;0&lt;/sub&gt;I + g&lt;sub&gt;1&lt;/sub&gt;Z&lt;sub&gt;0&lt;/sub&gt; + g&lt;sub&gt;2&lt;/sub&gt;Z&lt;sub&gt;1&lt;/sub&gt; + g&lt;sub&gt;3&lt;/sub&gt;Z&lt;sub&gt;0&lt;/sub&gt;Z&lt;sub&gt;1&lt;/sub&gt; + g&lt;sub&gt;4&lt;/sub&gt;X&lt;sub&gt;0&lt;/sub&gt;X&lt;sub&gt;1&lt;/sub&gt; + g&lt;sub&gt;5&lt;/sub&gt;Y&lt;sub&gt;0&lt;/sub&gt;Y&lt;sub&gt;1&lt;/sub&gt;
</p>

<p><strong>Ansatz:</strong> R&lt;sub&gt;Y&lt;/sub&gt;(&theta;) on qubit 0, then CNOT(q[0], q[1]). The single parameter &theta; is optimized classically.</p>

<p><strong>Measurement protocol:</strong> Three separate circuits measure in the Z, X, and Y bases to reconstruct all expectation values. 4096+ shots per basis per backend.</p>

<p><strong>Dissociation curve:</strong> The emulator sweeps 14 bond distances from 0.3 to 3.0 &Aring; with 65,536 shots each, using pre-computed optimal &theta; values at each distance.</p>
`,
    discussion: `
<p><strong>Emulator (-1.1385 Ha, 0.75 kcal/mol error):</strong> Within chemical accuracy at equilibrium. The small residual error comes from finite shot noise (statistical sampling) rather than any algorithmic limitation. The full dissociation curve shows chemical accuracy at all 14 bond distances, correctly capturing both the equilibrium well and the dissociation limit where Hartree-Fock fails.</p>

<p><strong>IBM ibm_torino (-1.0956 Ha, 26.2 kcal/mol error):</strong> Well outside chemical accuracy. The ~0.04 Ha error is dominated by gate noise in the CNOT operation and readout errors. This is a first-run result using only Z-basis measurements -- the full 3-basis protocol would improve accuracy. IBM's error mitigation techniques (ZNE, PEC) could further reduce this gap.</p>

<p><strong>QI Tuna-9:</strong> Shows similar noise-induced energy elevation, with parity leakage into wrong states. The hardware result demonstrates that while the VQE circuit is simple (1 variational parameter, 2 qubits), achieving chemical accuracy on real hardware remains challenging.</p>

<p>The key insight: VQE's variational nature means the measured energy is always <em>above</em> the true ground state (by the variational principle). Hardware noise pushes the energy even higher. This asymmetry is useful -- we know the direction of the error -- but reaching chemical accuracy requires either better hardware or active error mitigation.</p>
`,
    sources: [
      { label: 'Peruzzo et al. "A variational eigenvalue solver on a photonic quantum processor" (2014)', url: 'https://doi.org/10.1038/ncomms5213' },
      { label: 'Sagastizabal et al. "Experimental error mitigation via symmetry verification" (2019)', url: 'https://doi.org/10.1103/PhysRevA.100.010302' },
      { label: 'Kandala et al. "Hardware-efficient variational quantum eigensolver" (2017)', url: 'https://doi.org/10.1038/nature23879' },
      { label: 'O\'Malley et al. "Scalable quantum simulation of molecular energies" (2016)', url: 'https://doi.org/10.1103/PhysRevX.6.031007' },
    ],
  },

  {
    slug: 'qrng-certification',
    type: 'qrng_certification',
    title: 'QRNG Certification',
    subtitle: 'Testing quantum random number quality with NIST statistical tests',
    abstract: 'We test whether quantum hardware produces truly random numbers by running NIST statistical tests on raw and debiased output from Tuna-9. Raw output fails most tests due to measurement bias; von Neumann debiasing fixes everything at the cost of discarding 75% of bits.',
    status: 'hardware',
    researchQuestion:
      'Do quantum random numbers from real hardware pass standard statistical randomness tests, and does von Neumann debiasing fix measurable hardware bias?',
    priorWork: `
<p>Quantum Random Number Generators (QRNGs) exploit the fundamental indeterminacy of quantum mechanics to produce true randomness, unlike classical PRNGs which are deterministic. A qubit in the |+&rang; state measured in the computational basis gives a perfectly unbiased coin flip -- in theory.</p>

<p>In practice, real quantum hardware introduces systematic bias through readout asymmetry (|0&rang; and |1&rang; have different measurement error rates), thermal population of excited states, and crosstalk between qubits. These biases are small but statistically detectable, especially in large samples.</p>

<p>The NIST SP 800-22 statistical test suite is the standard battery for evaluating randomness quality. It includes tests for frequency bias (monobit), runs, serial correlation, and more exotic patterns. Passing all NIST tests is necessary (but not sufficient) for certification of a random number source.</p>

<p>Von Neumann debiasing is a classical post-processing technique: take pairs of bits, output 0 for "01" and 1 for "10", discard "00" and "11". This eliminates first-order bias at the cost of discarding ~50-75% of bits.</p>
`,
    method: `
<p><strong>Sources tested:</strong></p>
<ul>
<li><strong>Tuna-9 raw:</strong> Direct measurement of Hadamard-prepared qubits on QI hardware</li>
<li><strong>Tuna-9 debiased:</strong> Same raw bits passed through von Neumann debiasing</li>
<li><strong>Emulator:</strong> Noiseless simulation as a control</li>
</ul>

<p><strong>NIST tests applied:</strong> Monobit frequency, block frequency, runs, longest run, serial, approximate entropy, cumulative sums, and random excursions.</p>

<p><strong>Sample size:</strong> 10,000+ bits per source. Each test produces a p-value; p &gt; 0.01 indicates the sequence is consistent with randomness at the 99% confidence level.</p>
`,
    discussion: `
<p><strong>Key finding: raw Tuna-9 output fails the monobit frequency test</strong> due to measurable bias toward |0&rang;. The ones fraction deviates significantly from the expected 0.500, indicating systematic readout asymmetry in the hardware.</p>

<p><strong>Von Neumann debiasing completely fixes this.</strong> After debiasing, Tuna-9 passes all 8 NIST tests. The debiasing discards about 50% of bits (as expected for near-balanced input) but produces output indistinguishable from ideal randomness.</p>

<p><strong>The emulator passes all tests</strong> trivially, since it simulates perfect quantum mechanics with no readout bias.</p>

<p>This result has practical implications: quantum hardware <em>can</em> serve as a certified randomness source, but classical post-processing is essential. The bias we measured is not a flaw in the quantum mechanics -- it's a feature of the classical readout electronics. Von Neumann debiasing is simple, well-understood, and provably correct, making it the right tool for this job.</p>

<p>Future work: device-independent randomness certification using Bell inequality violations would provide stronger guarantees, but requires higher fidelity than current devices offer.</p>
`,
    sources: [
      { label: 'NIST SP 800-22: Statistical Test Suite for Random Number Generators', url: 'https://csrc.nist.gov/publications/detail/sp/800-22/rev-1a/final' },
      { label: 'Von Neumann, J. "Various techniques used in connection with random digits" (1951)', url: 'https://mcnp.lanl.gov/pdf_files/nbs_vonneumann.pdf' },
      { label: 'Herrero-Collantes & Garcia-Escartin "Quantum random number generators" (2017)', url: 'https://doi.org/10.1103/RevModPhys.89.015004' },
    ],
  },

  // --- Stub entries for simulation-only experiments ---

  {
    slug: 'randomized-benchmarking',
    type: 'rb_1qubit',
    title: 'Randomized Benchmarking',
    subtitle: 'Measuring single-qubit gate fidelity through random Clifford sequences',
    abstract: 'Randomized benchmarking measures how quickly quantum gate errors accumulate by running random sequences of increasing length. On the emulator, gate fidelity is effectively perfect -- hardware runs will reveal the actual error rate per gate.',
    status: 'simulation',
    researchQuestion:
      'What is the average error per single-qubit Clifford gate, and how does survival probability decay with circuit depth?',
    priorWork: `
<p>Randomized benchmarking (RB) was introduced by Knill et al. (2008) and refined by Magesan et al. (2011) as a scalable, SPAM-robust method for characterizing gate error rates. Unlike process tomography, RB isolates gate errors from state preparation and measurement errors by measuring how quickly a randomized sequence of Clifford gates scrambles the output.</p>

<p>The survival probability decays exponentially with sequence length m as p(m) = A &middot; r^m + B, where r is the depolarizing parameter. The average error per Clifford gate is (1 - r)(1 - 1/d)/d for dimension d = 2^n.</p>
`,
    method: `
<p>We run sequences of random single-qubit Clifford gates (from the 24-element Clifford group) at lengths m = 1, 4, 8, 16, 32, followed by the inverse gate to ideally return to |0&rang;. The survival probability at each length is the fraction of shots returning |0&rang;.</p>

<p>Currently emulator-only. Hardware runs planned for Tuna-9 and IBM backends.</p>
`,
    discussion: `
<p>On the emulator, gate fidelity is effectively perfect (100%) and the survival probability shows no decay -- as expected for noiseless simulation. This validates the circuit construction and analysis pipeline.</p>

<p>Hardware results will reveal the actual single-qubit gate error rate, which is the most fundamental metric for characterizing a quantum processor. We expect IBM's processors to show error rates around 10^-4 to 10^-3 per gate.</p>
`,
    sources: [
      { label: 'Magesan et al. "Scalable and robust randomized benchmarking" (2011)', url: 'https://doi.org/10.1103/PhysRevLett.106.180504' },
      { label: 'Knill et al. "Randomized benchmarking of quantum gates" (2008)', url: 'https://doi.org/10.1103/PhysRevA.77.012307' },
    ],
  },

  {
    slug: 'qaoa-maxcut',
    type: 'qaoa_maxcut',
    title: 'QAOA MaxCut',
    subtitle: 'Variational optimization on a 3-node graph',
    abstract: 'We use QAOA to solve a small graph-cutting problem on three qubits, sweeping parameters to find the best solution. The emulator achieves 87% of the optimal cut value, validating our circuit before hardware runs.',
    status: 'simulation',
    researchQuestion:
      'Can the Quantum Approximate Optimization Algorithm find the maximum cut of a small graph, and how does the approximation ratio vary across the parameter landscape?',
    priorWork: `
<p>QAOA was proposed by Farhi et al. (2014) as a quantum algorithm for combinatorial optimization. It alternates between a "problem" unitary (encoding the cost function) and a "mixer" unitary (enabling exploration), controlled by variational parameters &gamma; and &beta;. For the MaxCut problem on graphs, QAOA provably outperforms random assignment at depth p &ge; 1.</p>

<p>We test QAOA on a triangle graph (3 nodes, 3 edges) -- the smallest non-trivial MaxCut instance. The maximum cut has value 2 (cut any two edges), and the optimal bitstrings are {011, 101, 110, 100, 010, 001}.</p>
`,
    method: `
<p>We sweep a 3x3 grid of (&gamma;, &beta;) values and measure the approximation ratio (expected cut value / maximum cut value) at each point. The circuit uses 3 qubits with ZZ interactions for the problem Hamiltonian and X rotations for the mixer.</p>

<p>Currently emulator-only. Hardware runs planned.</p>
`,
    discussion: `
<p>The emulator heatmap reveals the QAOA parameter landscape clearly: a peak near (&gamma;, &beta;) = (0.6, 0.6) achieves &gt;90% approximation ratio. The landscape is smooth enough that a classical optimizer would find the optimum quickly.</p>

<p>This small-scale test validates our QAOA circuit construction before scaling to larger, harder graph instances where quantum advantage might emerge.</p>
`,
    sources: [
      { label: 'Farhi et al. "A Quantum Approximate Optimization Algorithm" (2014)', url: 'https://arxiv.org/abs/1411.4028' },
      { label: 'Guerreschi & Matsuura "QAOA for MaxCut requires hundreds of qubits" (2019)', url: 'https://doi.org/10.1038/s41598-019-43176-9' },
    ],
  },

  {
    slug: 'quantum-volume',
    type: 'quantum_volume',
    title: 'Quantum Volume',
    subtitle: 'A holistic benchmark for quantum processor capability',
    abstract: 'Quantum volume is a single-number benchmark for overall processor capability. Our emulator passes at all tested sizes (QV 8), establishing the protocol for hardware comparisons.',
    status: 'simulation',
    researchQuestion:
      'What quantum volume does the emulator achieve, and what does this metric reveal about the interplay between qubit count, gate fidelity, and connectivity?',
    priorWork: `
<p>Quantum Volume (QV) was introduced by Cross et al. at IBM (2019) as a single-number metric capturing the overall capability of a quantum processor. It accounts for qubit count, gate fidelity, connectivity, and compiler quality simultaneously.</p>

<p>The protocol runs random unitary circuits of depth d = n (square circuits) on n qubits for increasing n. At each size, the "heavy output" fraction must exceed 2/3 with high confidence. The quantum volume is 2^n for the largest n that passes.</p>

<p>Current leading quantum volumes: IBM (QV 128-512), Quantinuum (QV 2^20 on ion traps).</p>
`,
    method: `
<p>We run the standard QV protocol with random SU(4) unitaries at qubit counts n = 2, 3, 4. For each n, we generate random circuits, compute the ideal heavy output set, and measure the heavy output fraction across 1024 shots.</p>

<p>Currently emulator-only. The emulator should achieve the maximum possible QV given its qubit count.</p>
`,
    discussion: `
<p>On the noiseless emulator, the heavy output fraction is well above the 2/3 threshold at all tested qubit counts, as expected. This validates the QV measurement protocol.</p>

<p>Hardware QV measurements will be a key benchmark for comparing Tuna-9 and IBM backends on equal footing. The QV metric is particularly useful because it doesn't depend on a specific application -- it measures raw computational power.</p>
`,
    sources: [
      { label: 'Cross et al. "Validating quantum computers using randomized model circuits" (2019)', url: 'https://doi.org/10.1103/PhysRevA.100.032328' },
      { label: 'IBM Quantum Volume documentation', url: 'https://docs.quantum.ibm.com/guides/quantum-volume' },
    ],
  },
]
