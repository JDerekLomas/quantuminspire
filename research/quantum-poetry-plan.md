# Quantum Poetry: A Research Plan

## Thesis

Poetry is the literary form most naturally suited to quantum computation. Its essential operations — superposition of meaning, entanglement of images, interference of readings, measurement-dependent interpretation — are not merely analogous to quantum mechanics but structurally isomorphic. We propose a series of experiments that use real quantum hardware to create poetry that is genuinely quantum: texts whose meaning cannot be fully rendered by any classical process.

## Prior Art & Positioning

| What exists | What's missing |
|---|---|
| Catanzano's "World Lines" — topological QC as poetic form (metaphorical, not hardware-executed) | Poetry actually executed on quantum hardware |
| Quanthoven — lambeq/DisCoCat adapted for music, run on IBM | lambeq applied to poetic language |
| Quantum cognition (Busemeyer/Pothos) — empirical evidence that word meaning is quantum-like | Connecting quantum cognition to hardware-executed poetry |
| Barad's agential realism — philosophical framework for measurement-as-meaning | Agential realism as a design principle for quantum software |
| 375 poems *about* quantum physics (IYQ 2025) | Poetry that *is* quantum — structurally, computationally |
| Libby Heaney's quantum visual art, Miranda's quantum music | No quantum literary art on European hardware (Tuna-9) |
| QRNG-based prompt generators (Sandhir) | Quantum structure shaping meaning, not just selecting randomly |

**Our unique position:** We have access to Tuna-9 (9 superconducting qubits, full connectivity), IBM backends (156 qubits), a local emulator, and a Next.js web platform. We can build, run, and publish quantum poetry experiments end-to-end.

## Conceptual Framework

### Poetic operations as quantum gates

| Poetic device | Quantum operation | Why |
|---|---|---|
| Rhyme | Entanglement (Bell pair) | Distant words bound by sound; measuring one constrains the other |
| Metaphor | CNOT | Two independent concepts become correlated; can't separate them after |
| Enjambment | Delayed measurement | Line break = boundary between collapsed and uncollapsed text |
| Volta (sonnet turn) | Hadamard gate | Same state, new basis, different reading |
| Repetition/refrain | Measure → rotate → re-measure | Same observable, changed system, different outcome |
| Allusion | Entanglement with external system | Poem becomes correlated with another text |
| Tone/register | Phase | Invisible to word-frequency analysis; determines how meanings interfere |
| Formal constraint | Top-k / Hilbert space restriction | Limiting possibilities to make what emerges more meaningful |
| Ambiguity | Superposition | Multiple meanings coexist until reader "measures" |
| Poetic structure | Non-local correlations | First and last lines correlated without propagating through the middle |

### The LLM connection

- LLM token generation = sequential measurement (collapse at every position)
- Temperature = spread of the probability distribution before collapse
- Top-k = dimension of the allowed Hilbert space
- Poetry's challenge: high local entropy + high global structure
- Entanglement is the mechanism: maximum local uncertainty, maximum global correlation
- A quantum-LLM hybrid could use entanglement to enforce structural coherence while maintaining the surprise of high temperature

---

## Phase 1: Foundations (Weeks 1-2)

### 1.1 Word Bank Construction

Build curated word banks that map bitstrings to words. For 9 qubits (Tuna-9), we have 512 possible outcomes.

- **Thematic banks:** 512 words each for contrasting themes (e.g., eros/thanatos, growth/decay, sea/sky)
- **Phonetic banks:** words organized by sound so that entangled bitstrings map to rhyming or assonant words
- **Semantic embedding banks:** words selected from LLM embedding space so that Hamming-close bitstrings map to semantically related words
- Use word embeddings (e.g., from a small model) to ensure the mapping from Hilbert space to word space preserves some structure

### 1.2 lambeq Exploration

Install and explore lambeq (Quantinuum's text→circuit library). Key questions:
- Can it parse poetic syntax (enjambment, fragment, inverted word order)?
- What circuits does it produce for ambiguous sentences?
- Can we run lambeq-generated circuits on Tuna-9 via cQASM translation?
- How does DisCoCat handle polysemy — does superposition emerge naturally?

### 1.3 Baseline: Classical vs. Quantum Random Poetry

Control experiment. Generate poems using:
1. Pseudorandom number generator (classical)
2. QRNG (quantum random, but no entanglement)
3. Entangled quantum circuit (correlations between word positions)

Compare: Can readers distinguish them? Can statistical tests? This establishes that entanglement adds something beyond randomness.

---

## Phase 2: Core Experiments (Weeks 3-6)

### 2.1 Complementary Poems

**Concept:** One quantum state, two poems. Z-basis measurement produces poem A; X-basis (Hadamard before measurement) produces poem B. The poems are complementary in Bohr's sense — both real, mutually exclusive, jointly exhaustive.

**Implementation:**
1. Prepare a specific 9-qubit entangled state on Tuna-9
2. Run N shots in Z-basis → collect bitstrings → map to word bank A → assemble poem A
3. Run N shots in X-basis → collect bitstrings → map to word bank B → assemble poem B
4. Word bank A themed around presence/body; word bank B themed around absence/memory
5. The quantum state is the "real" poem; A and B are projections

**Presentation:** Web page where reader selects a "lens" (basis) and receives the corresponding poem. Each visit = new measurement. Display both poems side by side with a visualization of the quantum state they share.

**What it demonstrates:** Complementarity — the poem genuinely cannot be fully read in one basis. Not a gimmick; a structural property of the quantum state.

### 2.2 Entangled Couplets

**Concept:** Bell pairs generate correlated word-pairs for two lines of a couplet. The correlation between lines comes from entanglement, not classical selection.

**Implementation:**
1. Prepare 4 Bell pairs on Tuna-9 (8 qubits, 4 pairs)
2. Each pair produces 2 correlated bits
3. Map bit-pairs to word-pairs: (0,0)→word pair A, (0,1)→B, (1,0)→C, (1,1)→D
4. Word pairs chosen so correlations produce: rhyme (sound entanglement), antithesis (semantic entanglement), or echo (image entanglement)
5. Run 1000 shots → 1000 couplets

**Verification:** Run CHSH inequality test on the same circuit. Prove the correlations violate Bell's inequality — they are stronger than any classical process could produce. The couplets are *certified non-classical*.

**Presentation:** Display couplets alongside Bell inequality violation data. "These lines are more tightly bound than any classical process could achieve."

### 2.3 Quantum-Temperature Poetry

**Concept:** Quantum measurements control LLM sampling temperature, with entanglement creating correlated patterns of clarity and strangeness.

**Implementation:**
1. Prepare 9-qubit GHZ state on Tuna-9
2. Measure → 9 bits, perfectly correlated (all 0 or all 1 for GHZ)
3. Use more complex entangled states to get richer correlation patterns
4. Each bit controls one line's temperature: 0 → temp=0.3 (precise), 1 → temp=1.5 (wild)
5. Feed temperature + a shared prompt to an LLM to generate each line
6. Run many shots → many poems, each with a different but quantum-correlated pattern of clarity/strangeness

**Variations:**
- GHZ state: all lines lucid OR all lines strange (never mixed) — a poem of pure commitment
- W state: exactly one line is strange, the rest lucid — a poem with one surreal irruption
- Cluster state: complex correlation structure — neighboring lines are anti-correlated (lucid/strange alternation)

**Presentation:** Show the correlation structure as a quantum circuit diagram alongside each poem. Reader can select "entanglement pattern" and see how it shapes the poem's texture.

### 2.4 Decoherence Gradient

**Concept:** Watch a poem dissolve as quantum coherence is lost. Decoherence as the heat death of meaning.

**Implementation:**
1. Design a circuit that produces a meaningful, structured poem when run ideally
2. Progressively add depolarizing noise (or just add random gates)
3. At each noise level, collect measurements and generate the poem
4. Display as a visual gradient: coherent poem → fragments → word salad

**Presentation:** Scrollable or animated visualization. The poem crystallizes at the top, dissolves toward the bottom. The reader watches meaning emerge from and return to noise.

---

## Phase 3: Advanced Experiments (Weeks 7-12)

### 3.1 The Circuit Poem

**Concept:** A quantum circuit that is simultaneously valid cQASM and a visual poem. The circuit diagram is the poem's score; executing it produces the reading.

**Implementation:**
1. Design a notation where quantum gates map to poetic operations (see framework above)
2. Compose a "poem" as a sequence of gates, chosen for both their poetic and computational meaning
3. The circuit diagram is displayed as the poem (annotated with poetic operation names)
4. Running the circuit on Tuna-9 produces bitstrings that map to a textual realization
5. Multiple readings (shots) produce variations — the score is fixed, the performances vary

**Artistic goal:** Collapse the distinction between the poem and its medium. The circuit IS the poem, not a tool for generating it.

### 3.2 Interference Draft

**Concept:** Two drafts of a poem interfere quantum-mechanically. What survives is the essential core; what cancels is the contingent.

**Implementation:**
1. Write two classical drafts of the same poem
2. Encode each as a quantum state (draft A = computational basis encoding, draft B = rotated encoding)
3. Prepare their superposition: |poem⟩ = (|A⟩ + |B⟩)/√2
4. Measure → the output poem is neither draft but an interference pattern
5. Lines where drafts agree are amplified; lines where they conflict are suppressed
6. Hardware noise adds a third voice — decoherence as an uninvited collaborator

**Presentation:** Show draft A, draft B, and the interference poem side by side. Highlight which lines survived (constructive interference) and which were destroyed (destructive interference).

### 3.3 lambeq Poetry Encoding

**Concept:** Use lambeq to encode a poem as a parameterized quantum circuit. Run the circuit. Measure whether semantic content survives quantum execution.

**Implementation:**
1. Select short poems (haiku, couplets) with known semantic content
2. Use lambeq to parse and convert to quantum circuits
3. Translate circuits to cQASM 3.0 for Tuna-9 (or OpenQASM for IBM)
4. Train the circuit parameters on a meaning-classification task (e.g., "is this poem about love or death?")
5. Run on hardware — does the classification survive noise?
6. Compare: classical NLP vs. quantum circuit encoding for poetic ambiguity

**Research question:** Does lambeq's quantum encoding naturally represent poetic ambiguity as superposition? Does measurement collapse ambiguity in a way that mirrors human reading?

### 3.4 Non-Local Poem (Bell Poetry)

**Concept:** A poem whose first and last lines are entangled, with a Bell inequality violation proving the correlation is stronger than classically possible.

**Implementation:**
1. Prepare a Bell state across 2 qubits
2. First qubit selects the opening line; second qubit selects the closing line
3. Run CHSH protocol: measure in multiple bases, compute S-value
4. If S > 2 (Bell violation), the correlation between opening and closing is certified non-classical
5. Curate word banks so that the correlated outcomes produce opening/closing pairs that resonate poetically

**Artistic claim:** No left-to-right generative process — no LLM, no human writing sequentially — could produce this specific correlation between opening and closing. The poem's structural coherence is guaranteed by quantum mechanics, not by authorial intent.

---

## Phase 4: Synthesis & Publication (Weeks 13-16)

### 4.1 Web Experience

Build an interactive web experience on haiqu.dev that lets readers:
- Choose experiments and interact with quantum poems
- Select measurement bases and see poems change
- View quantum circuit diagrams alongside their poetic output
- See Bell inequality data proving non-classical correlations
- Compare quantum poems with classical-random controls

### 4.2 Written Outputs

1. **Research paper** — "Quantum Poetry: Entanglement, Superposition, and Measurement in Computational Poetics" — targeting Leonardo (MIT Press) or Quantum Science and Technology
2. **Essay/manifesto** — accessible version for a literary/art audience — targeting Poetry Foundation, Granta, or e-flux
3. **Blog series** on haiqu.dev documenting experiments and results

### 4.3 Exhibition/Performance

- Live quantum poetry reading where each poem is generated in real-time from Tuna-9 measurements
- The audience collectively chooses measurement bases (votes → basis selection)
- Each performance is unique, unrepeatable, and certified quantum

### 4.4 Open-Source Release

- All experiment code, word banks, and circuit designs
- A `quantum-poetry` Python package that wraps lambeq + our word-mapping infrastructure
- cQASM and OpenQASM circuit files for reproducibility on other hardware

---

## Key Research Questions

1. **Can readers perceive the difference between quantum-entangled and classically-random poetry?** (Experiment 1.3, 2.2)
2. **Does lambeq's quantum encoding naturally represent poetic ambiguity as superposition?** (Experiment 3.3)
3. **Can Bell inequality violation serve as a formal criterion for "non-classical" literary structure?** (Experiment 3.4)
4. **Does quantum-controlled LLM temperature produce qualitatively different poetry than classically-controlled temperature?** (Experiment 2.3)
5. **Is decoherence a useful metaphor AND mechanism for poetic editing?** (Experiment 2.4)
6. **Can a quantum circuit diagram function as a poetic score — a notation system for poems?** (Experiment 3.1)

## Dependencies & Resources

| Resource | Status | Notes |
|---|---|---|
| Tuna-9 access | Available | 9 qubits, full connectivity, via MCP server |
| IBM backends | Available | ibm_fez (156q), free tier (limited shots) |
| QI emulator | Available | Local, instant, unlimited shots |
| lambeq | Not installed | `pip install lambeq`, requires Python 3.9+ |
| Word embeddings | Not built | Need curated thematic word banks |
| Next.js web platform | Available | haiqu.dev |
| LLM API access | Available | For quantum-temperature experiments |

## References

- Catanzano, A. "World Lines: A Quantum Supercomputer Poem" — amycatanzano.com/world-lines
- Coecke, B. et al. "QNLP in Practice" — JAIR (2023)
- Meichanetzidis, K. et al. "Quanthoven" — arXiv:2111.06741
- Barad, K. *Meeting the Universe Halfway* — Duke UP (2007)
- Busemeyer, J. & Pothos, E. *Quantum Models of Cognition and Decision* — Cambridge UP
- Albright, D. *Quantum Poetics* — Cambridge UP (1997)
- Heaney, L. *Ent-* — libbyheaney.co.uk/artworks/ent/
- Abdyssagin & Coecke. "Quantum Concept Music" — arXiv:2510.05391
- lambeq documentation — docs.quantinuum.com/lambeq/
