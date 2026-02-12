export type GlossaryEntry = {
  term: string
  definition: string
  category: string
  vizLink?: { label: string; href: string }
  expLink?: { label: string; href: string }
  related?: string[]
}

export const CATEGORIES = [
  { id: 'fundamentals', label: 'Fundamentals', color: '#00d4ff' },
  { id: 'gates', label: 'Gates & Circuits', color: '#8b5cf6' },
  { id: 'states', label: 'Quantum States', color: '#00ff88' },
  { id: 'algorithms', label: 'Algorithms', color: '#ff8c42' },
  { id: 'metrics', label: 'Metrics & Benchmarks', color: '#ff6b9d' },
  { id: 'hardware', label: 'Hardware', color: '#94a3b8' },
  { id: 'techniques', label: 'Techniques', color: '#f59e0b' },
]

export const GLOSSARY: GlossaryEntry[] = [
  // Fundamentals
  {
    term: 'Qubit',
    definition: 'The basic unit of quantum information. Unlike a classical bit (0 or 1), a qubit can exist in a superposition of both states simultaneously. Physically realized as superconducting transmons (IBM, Tuna-9), spin qubits (QuTech Spin-2+), trapped ions, or photons.',
    category: 'fundamentals',
    vizLink: { label: 'Bloch Sphere', href: '/bloch-sphere' },
    related: ['Superposition', 'Bloch sphere'],
  },
  {
    term: 'Superposition',
    definition: 'A qubit in superposition is in a combination of |0> and |1> states, described by amplitudes alpha and beta where |alpha|^2 + |beta|^2 = 1. Measurement collapses the superposition to a definite state with probabilities given by the Born rule.',
    category: 'fundamentals',
    vizLink: { label: 'Bloch Sphere', href: '/bloch-sphere' },
    related: ['Measurement', 'Born rule', 'Qubit'],
  },
  {
    term: 'Entanglement',
    definition: 'A quantum correlation between two or more qubits where the state of one cannot be described independently of the others. Measuring one instantly determines the other, regardless of distance. The resource behind quantum teleportation and many quantum algorithms.',
    category: 'fundamentals',
    vizLink: { label: 'Entanglement Lab', href: '/entanglement' },
    expLink: { label: 'Bell calibration results', href: '/experiments/bell-calibration' },
    related: ['Bell state', 'GHZ state', 'Concurrence'],
  },
  {
    term: 'Measurement',
    definition: 'Extracting classical information from a qubit. Measurement collapses the quantum state: a qubit in superposition becomes |0> or |1> with probabilities determined by its amplitudes (Born rule). Measurement in different bases (X, Y, Z) reveals different information.',
    category: 'fundamentals',
    vizLink: { label: 'Measurement Lab', href: '/measurement' },
    related: ['Born rule', 'Superposition', 'Basis'],
  },
  {
    term: 'Born rule',
    definition: 'The probability of measuring a quantum state |psi> in state |x> is |<x|psi>|^2 — the squared magnitude of the amplitude. This connects the abstract quantum state to observable outcomes.',
    category: 'fundamentals',
    vizLink: { label: 'Measurement Lab', href: '/measurement' },
  },
  {
    term: 'Bloch sphere',
    definition: 'A geometric representation of a single qubit state as a point on a unit sphere. |0> is the north pole, |1> the south pole, and superposition states lie on the surface. Single-qubit gates are rotations on this sphere.',
    category: 'fundamentals',
    vizLink: { label: 'Bloch Sphere Explorer', href: '/bloch-sphere' },
  },
  {
    term: 'Quantum state vector',
    definition: 'The mathematical description of a quantum system. For n qubits, it is a vector of 2^n complex amplitudes. A 3-qubit system has 8 amplitudes. State vectors live in Hilbert space and evolve via unitary operations.',
    category: 'fundamentals',
    vizLink: { label: 'State Vector Explorer', href: '/state-vector' },
  },
  {
    term: 'Density matrix',
    definition: 'A more general representation of quantum states that can describe both pure states and mixed states (statistical ensembles). The diagonal elements give measurement probabilities; off-diagonal elements encode coherence and entanglement.',
    category: 'fundamentals',
    vizLink: { label: 'Entanglement Lab', href: '/entanglement' },
    related: ['Partial trace', 'Decoherence'],
  },

  // Gates & Circuits
  {
    term: 'Quantum gate',
    definition: 'A unitary operation that transforms qubit states. Single-qubit gates (X, Y, Z, H, S, T) rotate the Bloch sphere. Multi-qubit gates (CNOT, CZ, Toffoli) create entanglement. Any quantum computation can be decomposed into single-qubit gates plus CNOT.',
    category: 'gates',
    vizLink: { label: 'Bloch Sphere', href: '/bloch-sphere' },
  },
  {
    term: 'Pauli gates (X, Y, Z)',
    definition: 'The three fundamental single-qubit gates. X is a bit-flip (|0> <-> |1>). Z is a phase-flip (|1> -> -|1>). Y = iXZ combines both. They form the Pauli group and are the building blocks of error correction and Hamiltonian simulation.',
    category: 'gates',
    vizLink: { label: 'Bloch Sphere', href: '/bloch-sphere' },
    related: ['Pauli group', 'Clifford gates'],
  },
  {
    term: 'Hadamard gate (H)',
    definition: 'Creates an equal superposition: H|0> = (|0>+|1>)/sqrt(2). The workhorse gate for creating superposition. H is its own inverse (applying it twice returns to the original state). Central to nearly every quantum algorithm.',
    category: 'gates',
    vizLink: { label: 'Bloch Sphere', href: '/bloch-sphere' },
  },
  {
    term: 'CNOT (Controlled-NOT)',
    definition: 'A two-qubit gate that flips the target qubit if and only if the control qubit is |1>. The standard entangling gate. Together with single-qubit rotations, CNOT forms a universal gate set — any quantum computation can be built from these.',
    category: 'gates',
    vizLink: { label: 'State Vector Explorer', href: '/state-vector' },
    related: ['Entanglement', 'Universal gate set'],
  },
  {
    term: 'Clifford gates',
    definition: 'The group generated by H, S, and CNOT gates. Clifford circuits can be efficiently simulated classically (Gottesman-Knill theorem), which makes them important for error correction but insufficient for quantum advantage. Adding the T gate breaks out of the Clifford group.',
    category: 'gates',
    related: ['T gate', 'Gottesman-Knill theorem', 'Stabilizer states'],
  },
  {
    term: 'T gate',
    definition: 'A pi/8 phase gate that, combined with Clifford gates, forms a universal gate set. T gates are the expensive resource in fault-tolerant quantum computing — they require magic state distillation, making T-count a key metric for circuit cost.',
    category: 'gates',
    related: ['Clifford gates', 'Magic state distillation'],
  },
  {
    term: 'Circuit depth',
    definition: 'The number of sequential gate layers in a quantum circuit (gates that can run in parallel count as one layer). Deeper circuits accumulate more noise on real hardware. Reducing depth while preserving function is a key optimization challenge.',
    category: 'gates',
    related: ['Transpilation', 'Decoherence'],
  },
  {
    term: 'Transpilation',
    definition: 'Converting a quantum circuit into the native gate set of a specific hardware backend. Different processors support different gates (e.g., IBM uses CX+sqrt(X)+Rz). Transpilation also handles qubit routing when hardware connectivity is limited.',
    category: 'gates',
    related: ['Circuit depth', 'Native gate set'],
  },

  // Quantum States
  {
    term: 'Bell state',
    definition: 'The four maximally entangled two-qubit states: |Phi+> = (|00>+|11>)/sqrt(2), |Phi-> = (|00>-|11>)/sqrt(2), |Psi+> = (|01>+|10>)/sqrt(2), |Psi-> = (|01>-|10>)/sqrt(2). The simplest entangled states, used in teleportation, superdense coding, and as calibration benchmarks.',
    category: 'states',
    vizLink: { label: 'Entanglement Lab', href: '/entanglement' },
    expLink: { label: 'Bell fidelity across 3 backends', href: '/experiments/bell-calibration' },
    related: ['Entanglement', 'Quantum teleportation'],
  },
  {
    term: 'GHZ state',
    definition: 'Greenberger-Horne-Zeilinger state: (|000...0> + |111...1>)/sqrt(2). A maximally entangled multi-qubit state where all qubits are correlated. Used for testing multipartite entanglement and as a benchmark for hardware quality.',
    category: 'states',
    vizLink: { label: 'Measurement Lab', href: '/measurement' },
    expLink: { label: 'GHZ 3-50 qubit experiments', href: '/experiments/ghz-state' },
    related: ['Bell state', 'W state'],
  },
  {
    term: 'W state',
    definition: 'An entangled three-qubit state: (|001>+|010>+|100>)/sqrt(3). Unlike GHZ, W state entanglement is robust — tracing out one qubit leaves the remaining two still entangled. Represents a different class of multipartite entanglement.',
    category: 'states',
    vizLink: { label: 'Entanglement Lab', href: '/entanglement' },
    related: ['GHZ state', 'Entanglement'],
  },
  {
    term: 'Stabilizer states',
    definition: 'States that can be created from |0...0> using only Clifford gates. Efficiently described by their stabilizer group rather than the full state vector. Include computational basis states, Bell states, and GHZ states. Can be classically simulated.',
    category: 'states',
    related: ['Clifford gates', 'Gottesman-Knill theorem'],
  },

  // Algorithms
  {
    term: 'VQE (Variational Quantum Eigensolver)',
    definition: 'A hybrid quantum-classical algorithm for finding molecular ground state energies. A parameterized quantum circuit (ansatz) prepares a trial state, the quantum computer measures the energy, and a classical optimizer adjusts the parameters. Our H2 experiments use VQE.',
    category: 'algorithms',
    vizLink: { label: 'VQE Explainer', href: '/vqe' },
    expLink: { label: 'H\u2082 VQE results', href: '/experiments/vqe-h2' },
    related: ['Ansatz', 'Hamiltonian', 'Chemical accuracy'],
  },
  {
    term: 'QAOA (Quantum Approximate Optimization Algorithm)',
    definition: 'A variational algorithm for combinatorial optimization problems like MaxCut. Alternates between a problem Hamiltonian and a mixer Hamiltonian with tunable parameters. Performance improves with more layers (depth p) but requires more optimization. Our Tuna-9 QAOA achieved 74.1% approximation ratio on a 4-node MaxCut problem.',
    category: 'algorithms',
    expLink: { label: 'QAOA MaxCut results', href: '/experiments/qaoa-maxcut' },
    related: ['VQE', 'MaxCut', 'Approximation ratio'],
  },
  {
    term: "Grover's algorithm",
    definition: 'A quantum search algorithm that finds a marked item in an unsorted database of N items using only O(sqrt(N)) queries — a quadratic speedup over classical search. Uses amplitude amplification: the oracle marks the target, and diffusion amplifies its amplitude.',
    category: 'algorithms',
    vizLink: { label: "Grover's Search", href: '/grovers' },
    related: ['Amplitude amplification', 'Oracle'],
  },
  {
    term: 'Quantum teleportation',
    definition: 'A protocol that transfers a quantum state from one qubit to another using entanglement and classical communication. Does not transmit information faster than light — the classical bits are still needed. Demonstrates the power of entanglement as a resource.',
    category: 'algorithms',
    vizLink: { label: 'Teleportation Protocol', href: '/teleportation' },
    related: ['Bell state', 'Entanglement'],
  },
  {
    term: 'Ansatz',
    definition: 'A parameterized quantum circuit used as a trial wavefunction in variational algorithms. The choice of ansatz determines what states are reachable and affects convergence. Common types: hardware-efficient, UCCSD (chemistry-inspired), and problem-specific.',
    category: 'algorithms',
    vizLink: { label: 'Ansatz Explorer', href: '/ansatz' },
    related: ['VQE', 'Variational circuit'],
  },
  {
    term: 'Hamiltonian',
    definition: 'The energy operator of a quantum system. In quantum chemistry, the molecular Hamiltonian encodes all electron-electron and electron-nucleus interactions. For quantum computing, it must be decomposed into Pauli strings (via Jordan-Wigner or Bravyi-Kitaev transforms).',
    category: 'algorithms',
    vizLink: { label: 'H\u2082 Hamiltonian Explorer', href: '/hamiltonians' },
    related: ['Jordan-Wigner transform', 'VQE', 'Pauli gates'],
  },

  // Metrics & Benchmarks
  {
    term: 'Fidelity',
    definition: 'A measure of how close a quantum state or operation is to the ideal. State fidelity F = |<psi_ideal|psi_actual>|^2 ranges from 0 (orthogonal) to 1 (identical). Gate fidelity measures how well a physical gate matches its ideal unitary. Our Bell state experiments measure fidelity across backends.',
    category: 'metrics',
    related: ['Gate fidelity', 'Randomized benchmarking'],
  },
  {
    term: 'Chemical accuracy',
    definition: 'The threshold of 1 kcal/mol (0.0016 Ha / 1.6 mHa) — the accuracy needed for quantum chemistry results to be practically useful. Our emulator achieves 0.75 kcal/mol, IBM TREX achieves 0.22 kcal/mol, and Tuna-9 REM+PS achieves 0.92 kcal/mol — all within chemical accuracy.',
    category: 'metrics',
    expLink: { label: 'Mitigation techniques ranked', href: '/blog/error-mitigation-showdown' },
    related: ['VQE', 'Hartree', 'Error mitigation'],
  },
  {
    term: 'Quantum volume',
    definition: 'A single-number benchmark (IBM) that captures the largest random circuit a processor can execute reliably. QV = 2^n where n is the effective number of qubits that can maintain sufficient fidelity through n layers of random 2-qubit gates. Higher is better. We measured QV=8 on Tuna-9 and QV=32 on IBM Torino and IQM Garnet.',
    category: 'metrics',
    expLink: { label: 'QV across 3 backends', href: '/experiments/quantum-volume' },
    related: ['Circuit depth', 'Fidelity'],
  },
  {
    term: 'Randomized benchmarking (RB)',
    definition: 'A protocol for measuring average gate fidelity by running random sequences of Clifford gates of increasing length, followed by an inverting gate. The decay rate of the survival probability gives the error per Clifford. Robust against state preparation and measurement errors. We measured 99.82% on both Tuna-9 and IQM Garnet — but IBM reports 99.99% because their transpiler collapses Clifford sequences.',
    category: 'metrics',
    expLink: { label: 'RB results + IBM compiler artifact', href: '/blog/cross-platform-quantum-comparison' },
    related: ['Clifford gates', 'Gate fidelity'],
  },
  {
    term: 'Approximation ratio',
    definition: 'For optimization algorithms like QAOA, the ratio of the algorithm\'s solution quality to the optimal. An approximation ratio of 0.7 means the algorithm achieves 70% of the best possible result. Our QAOA MaxCut emulator run achieves 68.5%.',
    category: 'metrics',
    related: ['QAOA', 'MaxCut'],
  },

  // Hardware
  {
    term: 'Spin qubit',
    definition: 'A qubit encoded in the spin state of an electron confined in a semiconductor quantum dot. Used by QuTech/Quantum Inspire (Spin-2+ processor). Note: Tuna-9 uses superconducting transmon qubits, not spin qubits. Advantages: small size, long coherence in silicon, compatibility with existing semiconductor fabrication.',
    category: 'hardware',
    related: ['T1', 'T2', 'Qubit'],
  },
  {
    term: 'Superconducting qubit',
    definition: 'A qubit made from a superconducting circuit with a Josephson junction, operated at ~15 millikelvin. Used by IBM (ibm_torino, ibm_fez, ibm_marrakesh — 133-156 qubits) and Google. Currently the most mature quantum computing platform.',
    category: 'hardware',
    related: ['T1', 'T2', 'Qubit'],
  },
  {
    term: 'T1 (relaxation time)',
    definition: 'The time constant for energy relaxation — how long before an excited qubit (|1>) decays to ground state (|0>). Limits the total computation time. Typical values: ~100us for superconducting qubits, variable for spin qubits.',
    category: 'hardware',
    related: ['T2', 'Decoherence'],
  },
  {
    term: 'T2 (dephasing time)',
    definition: 'The time constant for phase coherence — how long superposition states maintain their relative phase. Always T2 <= 2*T1. Limits the useful circuit depth. Dephasing turns pure quantum states into classical mixtures.',
    category: 'hardware',
    vizLink: { label: 'Rabi Oscillations', href: '/rabi' },
    related: ['T1', 'Decoherence', 'Density matrix'],
  },
  {
    term: 'Decoherence',
    definition: 'The process by which quantum information is lost to the environment. Includes both energy relaxation (T1) and phase randomization (T2). The fundamental challenge for quantum computing — longer algorithms need better coherence or error correction.',
    category: 'hardware',
    vizLink: { label: 'Rabi Oscillations', href: '/rabi' },
    related: ['T1', 'T2', 'Error correction'],
  },
  {
    term: 'Readout error',
    definition: 'The probability of incorrectly measuring a qubit state. A qubit in |0> might be read as 1 (and vice versa). Typical rates: 0.5-5% depending on hardware. Can be partially corrected with readout error mitigation (measuring calibration matrices). On Tuna-9, readout error accounts for >80% of total VQE error.',
    category: 'hardware',
    expLink: { label: 'Readout as dominant error source', href: '/blog/error-mitigation-showdown' },
    related: ['Measurement', 'Error mitigation', 'Readout error mitigation'],
  },

  // Techniques
  {
    term: 'Jordan-Wigner transform',
    definition: 'A mapping from fermionic operators (electrons) to qubit operators (Pauli strings). Preserves the antisymmetry of fermions using strings of Z gates. Requires n qubits for n spin-orbitals. Our H2 VQE uses JW to get a 4-qubit Hamiltonian from the molecular problem.',
    category: 'techniques',
    related: ['Bravyi-Kitaev transform', 'Hamiltonian', 'VQE'],
  },
  {
    term: 'Bravyi-Kitaev transform',
    definition: 'An alternative fermion-to-qubit mapping that balances locality of occupation and parity information. Produces Pauli strings of length O(log n) instead of O(n) for Jordan-Wigner. Combined with tapering (symmetry reduction), can reduce qubit count — our H2 paper replication uses BK to get from 4 to 2 qubits.',
    category: 'techniques',
    related: ['Jordan-Wigner transform', 'Qubit tapering'],
  },
  {
    term: 'Error mitigation',
    definition: 'Classical post-processing techniques to reduce the effect of noise without full error correction. Includes zero-noise extrapolation (run at multiple noise levels, extrapolate to zero), probabilistic error cancellation, and readout error correction. Practical for near-term devices. We tested 15+ techniques — TREX and REM+PS achieved chemical accuracy.',
    category: 'techniques',
    expLink: { label: '15 techniques ranked', href: '/blog/error-mitigation-showdown' },
    related: ['Error correction', 'Decoherence', 'TREX', 'Post-selection', 'Readout error mitigation'],
  },
  {
    term: 'TREX (Twirled Readout EXtraction)',
    definition: "IBM's readout error mitigation technique. Randomizes the measurement basis across shots to average out readout bias, then classically corrects the expectation values. Available via IBM's Estimator API at resilience_level=1. Achieved 0.22 kcal/mol on H2 VQE — the best hardware result in our experiments.",
    category: 'techniques',
    expLink: { label: 'IBM TREX results', href: '/blog/error-mitigation-showdown' },
    related: ['Readout error', 'Error mitigation', 'Chemical accuracy'],
  },
  {
    term: 'Post-selection',
    definition: 'Discarding measurement shots that violate a known symmetry. For H2 VQE, the ground state has odd parity (one qubit in |0>, one in |1>), so even-parity shots (|00> or |11> in Z-basis) are noise and can be thrown away. Keeps 95-97% of shots on good qubit pairs. Simple, effective, but only works when you know the symmetry.',
    category: 'techniques',
    expLink: { label: 'Post-selection vs other techniques', href: '/blog/error-mitigation-showdown' },
    related: ['Error mitigation', 'Parity'],
  },
  {
    term: 'Readout error mitigation (REM)',
    definition: 'Calibrating a confusion matrix (how often |0> is read as 1 and vice versa), then applying its inverse to correct measurement distributions. Requires separate calibration circuits. Most effective when combined with post-selection: apply REM first to correct readout bias, then post-select on parity. Our REM+PS achieved 0.92 kcal/mol on Tuna-9.',
    category: 'techniques',
    expLink: { label: 'REM+PS on Tuna-9', href: '/blog/error-mitigation-showdown' },
    related: ['Readout error', 'Error mitigation', 'Post-selection'],
  },
  {
    term: 'Zero-noise extrapolation (ZNE)',
    definition: 'An error mitigation technique that intentionally amplifies gate noise (by repeating gates), measures at multiple noise levels, and extrapolates to the zero-noise limit. Effective when gate noise dominates. We found ZNE ineffective on both Tuna-9 and IBM for shallow VQE circuits because >80% of error is readout, not gates.',
    category: 'techniques',
    expLink: { label: 'Why ZNE failed', href: '/blog/error-mitigation-showdown' },
    related: ['Error mitigation', 'Circuit depth'],
  },
  {
    term: 'Dynamical decoupling (DD)',
    definition: 'Inserting sequences of identity-equivalent gate pairs during idle periods to refocus unwanted interactions with the environment. Effective against low-frequency noise and crosstalk. On IBM, adding DD to TREX made results worse for our 3-gate VQE circuit — the overhead exceeded the benefit.',
    category: 'techniques',
    related: ['Decoherence', 'Error mitigation', 'T2'],
  },
  {
    term: 'Quantum error correction (QEC)',
    definition: 'Encoding logical qubits across multiple physical qubits to detect and correct errors. The surface code is the leading approach, requiring ~1000 physical qubits per logical qubit. The threshold theorem guarantees reliability if physical error rates are below a threshold (~1%).',
    category: 'techniques',
    related: ['Surface code', 'Logical qubit', 'Error mitigation'],
  },
  {
    term: 'Qubit tapering',
    definition: 'A symmetry reduction technique that identifies conserved quantities (like electron number or spin parity) and uses them to eliminate qubits from the Hamiltonian. Our Sagastizabal replication uses BK + tapering to reduce H2 from 4 qubits to 2.',
    category: 'techniques',
    related: ['Bravyi-Kitaev transform', 'Hamiltonian'],
  },
  {
    term: 'Rabi oscillation',
    definition: 'The periodic oscillation of a qubit between |0> and |1> under a resonant driving field. The Rabi frequency depends on the drive amplitude. Observing clean Rabi oscillations is a basic calibration check for qubit control. Detuning and dephasing modify the oscillation pattern.',
    category: 'techniques',
    vizLink: { label: 'Rabi Oscillations', href: '/rabi' },
    related: ['T2', 'Decoherence'],
  },
]
