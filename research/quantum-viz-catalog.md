# Quantum Computing Visualization Catalog

Comprehensive survey of the best existing quantum computing visualizations across the web.
Compiled February 2026.

---

## 1. Bloch Sphere Visualizations

### Tier 1 — Best in Class

**bloch.kherb.io**
- URL: https://bloch.kherb.io/
- Visualizes: Qubit/spin evolution on the Bloch sphere over time
- Technology: Web-based (likely Three.js/WebGL)
- Quality: HIGH — publication-quality output, smooth animations, time evolution support
- What makes it good: Clean design, supports sequences of operations, generates exportable plots for presentations. Ideal for understanding single-qubit dynamics
- Open source: Unknown (no visible GitHub link)
- Best for: Publication plots, teaching rotations

**BlochSphere.space**
- URL: https://devpost.com/software/blochsphere-space
- Visualizes: Interactive 3D Bloch sphere with theta/phi sliders
- Technology: React Three Fiber + Drei (R3F), Tailwind CSS
- Quality: HIGH — modern React stack, smooth WebGL rendering
- What makes it good: Uses React Three Fiber (the best React/3D integration), golden state vector, wireframe rendering for depth perception, real-time parameter updates
- Open source: Yes (hackathon project)
- Best for: Reference architecture for our own R3F Bloch sphere

**Blocher (stolk/Blocher)**
- URL: https://github.com/stolk/Blocher
- Visualizes: Quantum gate operations on the Bloch sphere
- Technology: Pure WebGL
- Quality: MEDIUM-HIGH — raw WebGL, performant
- What makes it good: Direct WebGL without framework overhead, shows gate operations as rotations
- Open source: Yes (GitHub)

**bits-and-electrons/bloch-sphere-simulator**
- URL: https://bits-and-electrons.github.io/bloch-sphere-simulator/
- GitHub: https://github.com/bits-and-electrons/bloch-sphere-simulator (26 stars)
- Visualizes: Single qubit state transitions under quantum gates
- Technology: WebGL, JavaScript
- Quality: MEDIUM — clean, educational
- What makes it good: Zero-install, works directly in browser, shows gate-by-gate transitions
- Open source: Yes

**th3-Rocha/Bloch-sphere-with-React-Three-Fiber**
- URL: https://github.com/th3-Rocha/Bloch-sphere-with-React-Three-Fiber
- Visualizes: Interactive Bloch sphere with rotation/manipulation
- Technology: React Three Fiber
- Quality: MEDIUM — good starting point for R3F implementations
- Open source: Yes

**cduck/bloch_sphere**
- URL: https://github.com/cduck/bloch_sphere (113 stars)
- Visualizes: Bloch sphere with gate operation animations
- Technology: Python, generates SVG/animated GIF output
- Quality: HIGH for static/animated output — publication-ready
- What makes it good: Programmatic Python API, can generate animated GIFs of gate sequences, SVG output
- Open source: Yes (MIT license)
- Best for: Generating publication-quality Bloch sphere animations from Python

**unBLOCHed**
- URL: https://unbloched.xyz/
- GitHub: https://github.com/gamberoillecito/unBLOCHed (18 stars)
- Visualizes: Interactive Bloch sphere for teaching
- Technology: JavaScript
- Quality: MEDIUM — designed for classroom use
- Open source: Yes

### Tier 2 — Programmatic / Framework-based

**Qiskit plot_bloch_multivector**
- URL: https://docs.quantum.ibm.com/api/qiskit/visualization
- Visualizes: Multi-qubit states projected onto individual Bloch spheres
- Technology: Python/Matplotlib
- Quality: HIGH — the standard in publications
- Open source: Yes (Qiskit, Apache 2.0)

**cirq-web BlochSphere**
- URL: https://pypi.org/project/cirq-web/
- GitHub: https://github.com/quantumlib/Cirq/tree/master/cirq-web
- Visualizes: 3D Bloch sphere in Jupyter notebooks and browsers
- Technology: Python + Three.js (generates HTML with embedded 3D)
- Quality: MEDIUM — pre-release, functional
- What makes it good: Integrates directly into Jupyter/Colab workflows
- Open source: Yes (Apache 2.0)

**Q-CTRL Visualizer (Boulder Opal)**
- URL: https://docs.q-ctrl.com/boulder-opal/topics/visualizing-your-data-using-the-q-ctrl-visualizer
- Visualizes: Animated 3D Bloch sphere with time evolution
- Technology: Python package, web-rendered
- Quality: HIGH — professional, animated, interactive rotation
- What makes it good: Sliding bar to play through state dynamics, freely rotatable
- Open source: No (commercial, part of Boulder Opal)

---

## 2. Circuit Visualizers

### Tier 1 — Interactive Web-based

**Quirk**
- URL: https://algassert.com/quirk
- GitHub: https://github.com/Strilanc/Quirk (huge community, canonical tool)
- Visualizes: Quantum circuits with real-time state display
- Technology: JavaScript/Canvas, custom rendering engine
- Quality: EXCEPTIONAL — the gold standard for interactive circuit simulation
- What makes it good: Drag-and-drop gates, real-time probability/amplitude/Bloch displays inline, up to 16 qubits, URL-shareable circuits, zero install
- Open source: Yes (Apache 2.0)
- Embeddable: Yes (can be self-hosted)
- Best for: Quick experimentation, teaching, sharing circuits via URL

**Quirk-E**
- URL: https://quirk-e.dev/
- GitHub: https://github.com/DEQSE-Project/Quirk-E/
- Visualizes: Extended Quirk with multi-format I/O
- Technology: JavaScript
- Quality: HIGH — improved UX over Quirk
- What makes it good: Step-by-step inspector, imports OpenQASM/QUIL/Qiskit/IonQ, exports to 10+ formats (OpenQASM, Qiskit, PyQuil, Cirq, Q#, TF Quantum, Braket), PNG/SVG/PDF circuit export, drag-and-drop barrier (Slicer)
- Open source: Yes (requires attribution)
- Best for: Multi-framework interop, step-by-step debugging

**Q.js (Quantum JavaScript)**
- URL: https://quantumjavascript.app/
- Playground: https://quantumjavascript.app/playground.html
- Visualizes: Drag-and-drop circuit editor with simulation
- Technology: Pure JavaScript, runs in browser
- Quality: MEDIUM-HIGH — clean API, well-documented
- What makes it good: Full JS library with drag-and-drop editor, heavily documented API, exports to multiple formats
- Open source: Yes

**THE QUANTUM LAND Circuit Designer**
- URL: https://thequantumlaend.de/quantum-circuit-designer/
- Visualizes: Drag-and-drop circuits, translates to OpenQASM
- Technology: Web-based
- Quality: MEDIUM — educational focus
- Open source: Unknown

### Tier 2 — Libraries for Embedding

**quantum-viz.js (Microsoft)**
- URL: https://github.com/microsoft/quantum-viz.js
- npm: `@microsoft/quantum-viz.js`
- Visualizes: Static quantum circuit diagrams
- Technology: TypeScript, pure HTML/SVG rendering
- Quality: HIGH — lightweight, configurable, Microsoft-backed
- What makes it good: CDN-loadable, simple API (create Circuit object, call qviz.draw()), supports measurement outcome toggling
- Open source: Yes (MIT)
- Embeddable: Yes — designed for embedding
- Best for: Rendering circuits in web apps, documentation sites

**quantum-circuit (Quantastica)**
- URL: https://github.com/quantastica/quantum-circuit (271 stars)
- npm: `quantum-circuit`
- Visualizes: Circuit diagrams exportable as SVG
- Technology: JavaScript (browser + Node.js)
- Quality: HIGH — mature, 60+ gates, 20+ qubit simulation
- What makes it good: SVG export, runs in browser and server, exports to OpenQASM/Quil/Qiskit/Cirq/Q#/TF Quantum/CudaQ
- Open source: Yes (MIT)
- Embeddable: Yes
- Best for: Server-side circuit rendering, format conversion

### Tier 3 — Publication-Quality Static

**Quantikz (LaTeX)**
- URL: https://arxiv.org/abs/1809.03842
- Visualizes: Publication-quality circuit diagrams in LaTeX
- Technology: TikZ/LaTeX
- Quality: EXCEPTIONAL — the standard for academic papers
- What makes it good: Beautiful typesetting, supports quantum/classical/bundled wires, circuit slicing for step-by-step explanations, modern replacement for QCircuit
- Open source: Yes (CTAN)
- Best for: Papers, theses, textbooks

**Qiskit circuit_drawer**
- URL: https://docs.quantum.ibm.com/api/qiskit/visualization
- Visualizes: Circuit diagrams in matplotlib or LaTeX
- Technology: Python/Matplotlib/LaTeX
- Quality: HIGH — standard in Qiskit ecosystem
- Open source: Yes

**PennyLane draw_mpl**
- URL: https://docs.pennylane.ai/en/stable/code/qml_drawer.html
- Visualizes: Circuit diagrams with multiple style themes
- Technology: Python/Matplotlib
- Quality: HIGH — multiple styles (pennylane, sketch, solarized, etc.)
- Open source: Yes

**Classiq Visualization IDE**
- URL: https://docs.classiq.io/latest/classiq_101/classiq_concepts/analyze/
- Visualizes: Hierarchical quantum programs at multiple abstraction levels
- Technology: Web IDE
- Quality: HIGH — unique hierarchical view from high-level functions down to gates
- What makes it good: Navigate between abstraction levels, expand blocks to see underlying gates
- Open source: No (commercial platform, free tier available)

---

## 3. State Vector / Amplitude Visualizations

### Q-Sphere

**Qiskit plot_state_qsphere**
- URL: https://docs.quantum.ibm.com/api/qiskit/visualization
- Visualizes: Multi-qubit state on a sphere — amplitude as dot size, phase as color, latitude by Hamming weight
- Technology: Python/Matplotlib
- Quality: HIGH — unique and beautiful, Qiskit-original
- What makes it good: Encodes amplitude AND phase simultaneously, intuitive spatial mapping (|000...0> at north pole, |111...1> at south pole)
- Open source: Yes
- Best for: Multi-qubit state overview at a glance

### City Plot (State City)

**Qiskit plot_state_city**
- URL: https://docs.quantum.ibm.com/api/qiskit/visualization
- Visualizes: Density matrix as 3D bar chart — real and imaginary parts separately
- Technology: Python/Matplotlib 3D
- Quality: HIGH — standard for density matrix visualization
- Open source: Yes

### Hinton Diagram

**Qiskit plot_state_hinton**
- URL: https://docs.quantum.ibm.com/api/qiskit/visualization
- Visualizes: Density matrix where element size represents value magnitude
- Technology: Python/Matplotlib
- Quality: MEDIUM-HIGH — compact, good for spotting patterns
- Open source: Yes

### Paulivec

**Qiskit plot_state_paulivec**
- URL: https://docs.quantum.ibm.com/api/qiskit/visualization
- Visualizes: State decomposed in Pauli operator basis
- Technology: Python/Matplotlib
- Quality: MEDIUM — niche but useful for error analysis
- Open source: Yes

### VENUS

**VENUS (Geometrical Representation)**
- Paper: https://arxiv.org/abs/2303.08366
- Visualizes: Quantum amplitudes using 2D geometric shapes (semicircles), supports entanglement visualization
- Technology: Research prototype
- Quality: HIGH — novel, published at EuroVis 2023
- What makes it good: Addresses Bloch sphere's inability to show entanglement, uses coordinated semicircles for probability encoding, real/imaginary parts as black/grey line segments
- Open source: Research code (check paper supplementary)
- Best for: Visualizing entanglement properties that Bloch sphere cannot show

### State-o-gram

**State-o-gram**
- Paper: https://arxiv.org/html/2508.18390
- Visualizes: Novel 2D representation of quantum states
- Technology: Research prototype (2025)
- Quality: HIGH — cutting-edge research
- What makes it good: New approach to 2D quantum state visualization
- Best for: Academic reference for novel visualization approaches

### BraKetVue

**BraKetVue**
- URL: https://github.com/Quantum-Flytrap/bra-ket-vue (34 stars)
- npm: `bra-ket-vue`
- Visualizes: Quantum states (kets) and operators (matrices) with interactive components
- Technology: Vue 3 + TypeScript + quantum-tensors library
- Quality: HIGH — beautiful design by Piotr Migdal & Klem Jankiewicz
- What makes it good: Reusable Vue components (ket-viewer, matrix-viewer), works for both quantum computing and quantum optics, backed by Unitary Fund
- Open source: Yes (MIT)
- Embeddable: Yes — Vue component, npm installable
- Best for: Embedding state/matrix visualizations in Vue apps

---

## 4. Entanglement Visualizations

**Quantum Flytrap Virtual Lab**
- URL: https://quantumflytrap.com/virtual-lab/
- Paper: https://arxiv.org/abs/2203.13300
- Visualizes: Optical table simulation with up to 3 entangled particles
- Technology: Vue.js + quantum-tensors + custom rendering
- Quality: EXCEPTIONAL — published at CHI 2022, stunning design
- What makes it good: Drag-and-drop optical elements (beam splitters, polarizers, Faraday rotators, detectors), real-time entanglement simulation, sandbox mode + guided game mode
- Open source: Partially (quantum-tensors and bra-ket-vue are open; Virtual Lab app is not fully open)
- Best for: Demonstrating entanglement through optical experiments

**VENUS (see State Vector section)**
- Specifically designed to visualize entanglement properties that Bloch sphere cannot show

**Dimensional Circle Notation**
- Paper: https://link.aps.org/doi/10.1103/PhysRevResearch.6.023077
- Visualizes: Entanglement in multiqubit systems using geometric notation
- Technology: Research prototype, interactive web tool
- Quality: HIGH — published in Physical Review Research 2024
- Open source: Check paper

**QuTiP Visualization**
- URL: https://qutip.readthedocs.io/en/latest/guide/guide-visualization.html
- Visualizes: Density matrices, Wigner functions, Husimi Q-functions, process tomography
- Technology: Python/Matplotlib
- Quality: HIGH — the standard for open quantum systems
- What makes it good: Full suite including Wigner functions (quasi-probability distributions that reveal non-classical behavior), Hinton diagrams, matrix histograms, energy level diagrams
- Open source: Yes (BSD)
- Best for: Research-grade visualization of density matrices and quantum processes

---

## 5. Algorithm Visualizations

### Grover's Algorithm

**Animated Qubits — Grover's**
- URL: http://davidbkemp.github.io/animated-qubits/grover.html
- GitHub: https://github.com/davidbkemp/animated-qubits
- npm: `animated-qubits`
- Visualizes: Step-by-step amplitude amplification animation
- Technology: JavaScript (animated-qubits + jsqubits libraries)
- Quality: HIGH — smooth animations, clear amplitude bar visualization
- Open source: Yes
- Best for: Teaching amplitude amplification visually

**Quantum Gate Playground (animated-qubits)**
- URL: http://davidbkemp.github.io/animated-qubits/
- Visualizes: Interactive gate playground — apply gates and see state changes
- Technology: JavaScript
- Quality: MEDIUM-HIGH
- Open source: Yes

### Shor's Algorithm

**ShorJS**
- URL: http://blendmaster.github.io/ShorJS/
- Visualizes: Step-by-step Shor's algorithm simulation with probability visualization
- Technology: JavaScript (browser-based)
- Quality: MEDIUM — educational, shows quantum part via probabilities
- Open source: Yes (GitHub)

**ShorVis**
- Paper: https://ieeexplore.ieee.org/document/8719175/
- Visualizes: Comprehensive Shor's visualization — Bloch sphere + circuit + probability distribution
- Technology: Web-based, open source
- Quality: HIGH — published at IEEE VIS
- What makes it good: Integrates multiple visualization methods (Bloch, circuit, probability) in one platform
- Open source: Yes

### Quantum Fourier Transform

**Visual QFT (hapax.github.io)**
- URL: https://hapax.github.io/assets/visual-qft/
- Visualizes: QFT through geometric/visual intuition with interactive linkage applet
- Technology: Web-based
- Quality: HIGH — beautiful geometric approach
- What makes it good: Builds intuition for how Fourier transform relates to hinged motion in high-dimensional Hilbert spaces
- Open source: Yes (GitHub Pages)

---

## 6. Measurement / Probability Visualizations

**Qiskit plot_histogram**
- URL: https://docs.quantum.ibm.com/api/qiskit/visualization
- Visualizes: Measurement outcome counts as bar graph (one bar per basis state)
- Technology: Python/Matplotlib
- Quality: HIGH — the standard, used in every Qiskit tutorial
- Open source: Yes
- Best for: Shot histograms, comparing ideal vs. noisy results

**IBM Quantum Composer Phase Disks**
- URL: https://quantum.cloud.ibm.com/composer
- Visualizes: Per-qubit phase disks at any point in the circuit
- Technology: Web-based (IBM's proprietary renderer)
- Quality: HIGH — unique inline visualization
- What makes it good: Drag phase disk icon onto circuit, hover to read state. Inspect mode for step-by-step state evolution
- Open source: No (free to use with IBM Quantum account)

**QCVIS Phase Disks + Bar Plots**
- URL: https://github.com/fh-igd-iet/qcvis
- Visualizes: State bar plots with phase colors, Q-sphere, state cubes, phase disks
- Technology: Vue 3 + TypeScript + Tauri
- Quality: HIGH — four distinct visualization types with animated transitions
- Open source: Yes (EUPL-1.2)

---

## 7. Educational Platforms

### Tier 1 — Best Overall

**Quirk** (see Circuit Visualizers)
- The single best tool for quantum education — instant, visual, shareable

**Quantum Flytrap Virtual Lab** (see Entanglement)
- Best for: Optical quantum experiments, entanglement intuition

**Black Opal (Q-CTRL)**
- URL: https://q-ctrl.com/black-opal
- Visualizes: 350+ interactive activities covering fundamental quantum concepts
- Technology: Web-based (Chrome/Safari), mobile-compatible
- Quality: EXCEPTIONAL — professional, polished, university-adopted
- What makes it good: 3D Bloch spheres, wave simulations, 400+ lessons across 10 modules, thousands of custom visuals/animations
- Open source: No (commercial, education pricing available)
- Best for: Structured learning path, classroom adoption

**Brilliant Quantum Computing Course**
- URL: https://brilliant.org/courses/quantum-computing/
- Visualizes: In-browser quantum circuit simulator
- Technology: Proprietary web platform
- Quality: EXCEPTIONAL — Brilliant's signature interactive style
- What makes it good: Built with Microsoft/Caltech IQIM researchers, hands-on circuit building, gamified progression
- Open source: No (subscription)

### Tier 2 — Free / Open Platforms

**IBM Quantum Composer**
- URL: https://quantum.cloud.ibm.com/composer
- Visualizes: Drag-and-drop circuits with live state visualization
- Technology: Web-based
- Quality: HIGH — runs on real quantum hardware
- What makes it good: Phase disks, inspect mode, export to SVG/PNG, connects to real IBM quantum processors
- Open source: No (free account)

**Quantum Computing Playground (Google)**
- URL: https://www.quantumplayground.net/
- Also: https://experiments.withgoogle.com/quantum-computing-playground
- Visualizes: GPU-accelerated quantum state in 2D/3D bar graphs (amplitude as height, phase as color)
- Technology: WebGL (GPU-accelerated via textures), Chrome Experiment
- Quality: HIGH — unique GPU approach, up to 22 qubits
- What makes it good: Own scripting language, built-in Grover's and Shor's, two-way debugger, stores quantum register as floating-point RGBA texture
- Open source: Yes (https://github.com/gwroblew/Quantum-Computing-Playground)
- Best for: Large-scale state visualization, GPU-powered simulation

**IQM Academy**
- URL: https://www.iqmacademy.com/
- Visualizes: Interactive exercises with quantum concepts
- Technology: Web-based
- Quality: MEDIUM-HIGH — free, from Europe's leading QC manufacturer
- Open source: No (free to use)

**Qubi (Qolour)**
- URL: https://www.qolour.io/
- Visualizes: Physical + app-based qubit simulation with glowing sphere
- Technology: Physical device + companion app, connects to IBM/IonQ hardware
- Quality: HIGH — innovative physical+digital hybrid
- What makes it good: Shake for measurement, rotate for gates, bump two together for entanglement. Ages 8+
- Open source: No (hardware product)

**QCVis (Harvard)**
- Paper: https://dash.harvard.edu/bitstreams/1f13afd4-89ae-4997-a820-4b91831edb0a/download
- Visualizes: State probabilities of single qubits and circuits over time
- Technology: Python + CSS + JavaScript, built on QCSimulator
- Quality: MEDIUM-HIGH — designed for novice education
- Open source: Yes (research project)

**QubitLens**
- Paper: https://arxiv.org/abs/2505.08056
- Visualizes: Quantum state tomography results — Bloch sphere plots, bar charts, fidelity gauges
- Technology: Interactive web-based
- Quality: HIGH — comprehensive tomography visualization
- Open source: Check paper

---

## 8. Publication-Quality Tools

### The Standard Stack for Papers

| Tool | What it generates | Used in |
|------|-------------------|---------|
| **Quantikz** (LaTeX) | Circuit diagrams | Most arxiv papers since ~2020 |
| **Qiskit visualization** | Bloch spheres, histograms, Q-sphere, city plots, Hinton | IBM-ecosystem papers |
| **Matplotlib** | Everything (via Qiskit/PennyLane/Cirq) | Universal |
| **cduck/bloch_sphere** | Animated Bloch sphere GIFs, SVG | Independent researchers |
| **QuTiP** | Wigner functions, density matrices, process tomography | Open quantum systems papers |
| **Manim** | Animated explanations (3Blue1Brown style) | YouTube, presentations |
| **PennyLane draw_mpl** | Styled circuit diagrams | Xanadu-ecosystem papers |
| **Cirq SVGCircuit** | SVG circuit diagrams | Google-ecosystem papers |

### Unique Visualization Types in Top Papers

- **Q-sphere**: Qiskit-unique, shows multi-qubit states on a sphere (amplitude=dot size, phase=color)
- **City plot**: Density matrix as 3D bar chart (real + imaginary parts)
- **Hinton diagram**: Density matrix where square size = element magnitude
- **Paulivec**: Pauli basis decomposition bar chart
- **Wigner function**: Quasi-probability distribution (negative values = non-classical behavior)
- **Process tomography χ-matrix**: Visualizes quantum processes/channels
- **VENUS semicircles**: Novel geometric representation (EuroVis 2023)
- **State-o-gram**: Novel 2D quantum state representation (2025)

---

## 9. Libraries (npm / Python)

### JavaScript/TypeScript (Web-Ready)

| Package | npm | Stars | What it does |
|---------|-----|-------|-------------|
| **quantum-viz.js** | `@microsoft/quantum-viz.js` | ~50 | Circuit rendering, pure HTML/SVG, Microsoft |
| **quantum-circuit** | `quantum-circuit` | 271 | Full simulator + SVG circuit export, 60+ gates |
| **bra-ket-vue** | `bra-ket-vue` | 34 | Vue 3 quantum state/matrix visualizer |
| **quantum-tensors** | `quantum-tensors` | ~30 | Sparse tensor ops for quantum computing (TypeScript) |
| **jsqubits** | `jsqubits` | ~100 | Quantum simulation library (powers animated-qubits) |
| **animated-qubits** | `animated-qubits` | ~30 | Animated quantum state visualizations |
| **Q.js** | N/A (CDN) | — | Full simulator + drag-drop editor |

### Python (Generate Web-Ready Output)

| Package | pip | What it does |
|---------|-----|-------------|
| **Qiskit visualization** | `qiskit` | Full suite: circuits, Bloch, Q-sphere, city, Hinton, histograms |
| **cirq-web** | `cirq-web` | 3D Bloch sphere in browser/notebook (Three.js under the hood) |
| **PennyLane drawer** | `pennylane` | Styled circuit diagrams (matplotlib) |
| **QuTiP** | `qutip` | Wigner functions, density matrices, process tomography |
| **cduck/bloch_sphere** | `bloch_sphere` | Animated Bloch sphere SVG/GIF generation |
| **Manim** | `manim` | 3Blue1Brown-style animations of quantum concepts |
| **Qiskit Metal** | `qiskit-metal` | Superconducting chip layout visualization + 3D rendering |

### Error Correction Specific

| Package | What it does |
|---------|-------------|
| **PanQEC** | QEC simulation + visualization (https://github.com/panqec/panqec) |
| **Qsurface** | Surface code simulation + step-by-step visualization (https://github.com/watermarkhu/qsurface) |
| **Stim** | Stabilizer simulation + matchgraph-3D visualization |
| **PyMatching** | MWPM decoder visualization |

---

## 10. Hidden Gems & Unique Finds

### QCVIS (Fraunhofer)
- URL: https://github.com/fh-igd-iet/qcvis
- Why it's special: Four visualization modes including a unique "state cube" (4D probability visualization) and "hybrid state cube" with phase disks. Uses perceptually uniform Oklab color space. Step-by-step animation of state transitions. Built with Vue 3 + TypeScript + Tauri (desktop app).
- Open source: Yes (EUPL-1.2)

### Quantum Computing Playground (Google)
- URL: https://www.quantumplayground.net/
- Why it's special: GPU-accelerated via WebGL textures. Stores quantum register as floating-point RGBA texture on GPU. Up to 22 qubits in browser. Own scripting language with debugger. 3D amplitude/phase visualization.
- Open source: Yes

### Quantum Machine Learning Playground
- Paper: https://arxiv.org/abs/2507.17931
- Why it's special: TensorFlow Playground-style interface for quantum ML. Visualizes data re-uploading classifier, shows how quantum gates affect state, iterative parameter adjustment. Published 2025.

### Arthur Pesah's Interactive Surface Code
- URL: https://arthurpesah.me/blog/2023-05-13-surface-code/
- Why it's special: Interactive web-based explanation of surface codes (toric, planar, rotated) with clickable visual elements

### QSynViz
- Paper: https://ieeexplore.ieee.org/document/11249859/
- Why it's special: Visualization tool for quantum circuit synthesis and optimization

### VIOLET
- Paper: https://arxiv.org/html/2312.15276v1
- Why it's special: Visual analytics for explainable quantum neural networks

---

## Priority Recommendations for Quantum Inspire

### Immediately Useful (Can Reference/Port)

1. **Quirk** — Apache 2.0, study its real-time state display approach
2. **quantum-viz.js** — MIT, embed circuit diagrams directly
3. **animated-qubits** — Study for amplitude animation approach
4. **BraKetVue** — MIT Vue components for state visualization
5. **QCVIS** — EUPL, four excellent visualization types with Vue 3
6. **BlochSphere.space** — React Three Fiber Bloch sphere reference

### For Inspiration (Design/UX)

1. **Black Opal** — Best-in-class educational UX
2. **Quantum Flytrap Virtual Lab** — Beautiful entanglement demos
3. **Brilliant** — Interactive pedagogy
4. **Google Quantum Playground** — GPU-accelerated 3D state viz
5. **VENUS** — Novel geometric representation beyond Bloch sphere

### For Publication Integration

1. **Qiskit visualization suite** — Q-sphere, city plot, Hinton
2. **QuTiP** — Wigner functions, density matrices
3. **cduck/bloch_sphere** — Animated Bloch sphere GIFs
4. **Quantikz** — LaTeX circuit diagrams

---

## Source URLs

- Quirk: https://algassert.com/quirk | https://github.com/Strilanc/Quirk
- Quirk-E: https://quirk-e.dev/ | https://github.com/DEQSE-Project/Quirk-E/
- quantum-viz.js: https://github.com/microsoft/quantum-viz.js
- quantum-circuit: https://github.com/quantastica/quantum-circuit
- BraKetVue: https://github.com/Quantum-Flytrap/bra-ket-vue
- quantum-tensors: https://github.com/Quantum-Flytrap/quantum-tensors
- Quantum Flytrap: https://quantumflytrap.com/virtual-lab/
- jsqubits: https://github.com/davidbkemp/jsqubits
- animated-qubits: https://github.com/davidbkemp/animated-qubits
- QCVIS: https://github.com/fh-igd-iet/qcvis
- Qiskit viz: https://docs.quantum.ibm.com/api/qiskit/visualization
- cirq-web: https://github.com/quantumlib/Cirq/tree/master/cirq-web
- PennyLane: https://docs.pennylane.ai/en/stable/code/qml_drawer.html
- QuTiP: https://qutip.readthedocs.io/en/latest/guide/guide-visualization.html
- cduck/bloch_sphere: https://github.com/cduck/bloch_sphere
- Q.js: https://quantumjavascript.app/
- Quantikz: https://arxiv.org/abs/1809.03842
- Manim: https://pypi.org/project/manim/
- Black Opal: https://q-ctrl.com/black-opal
- Quantum Playground: https://www.quantumplayground.net/
- bloch.kherb.io: https://bloch.kherb.io/
- BlochSphere.space: https://devpost.com/software/blochsphere-space
- Blocher: https://github.com/stolk/Blocher
- bits-and-electrons: https://github.com/bits-and-electrons/bloch-sphere-simulator
- VENUS: https://arxiv.org/abs/2303.08366
- ShorJS: http://blendmaster.github.io/ShorJS/
- Visual QFT: https://hapax.github.io/assets/visual-qft/
- PanQEC: https://github.com/panqec/panqec
- Qsurface: https://github.com/watermarkhu/qsurface
- Surface Code Interactive: https://arthurpesah.me/blog/2023-05-13-surface-code/
- Classiq: https://docs.classiq.io/latest/classiq_101/classiq_concepts/analyze/
- Qiskit Metal: https://github.com/qiskit-community/qiskit-metal
- IQM Academy: https://www.iqmacademy.com/
- Qubi/Qolour: https://www.qolour.io/
- QubitLens: https://arxiv.org/abs/2505.08056
- QOSF List: https://github.com/qosf/awesome-quantum-software
