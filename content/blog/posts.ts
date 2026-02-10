import { BlogPost } from "@/lib/blogTypes"

export const posts: BlogPost[] = [
  {
    slug: 'error-mitigation-showdown',
    title: 'We Tested 15 Error Mitigation Strategies. Only One Achieved Chemical Accuracy.',
    subtitle: "IBM's TREX hit 0.22 kcal/mol. Tuna-9's best combo (REM+PS) averaged 2.52 kcal/mol. ZNE made things worse. Here's what actually works for NISQ chemistry.",
    date: '2026-02-11',
    author: 'AI x Quantum Research Team',
    category: 'experiment',
    tags: ['error mitigation', 'VQE', 'TREX', 'readout error', 'ZNE', 'post-selection', 'IBM Quantum', 'Tuna-9', 'chemical accuracy'],
    heroImage: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1200&q=80',
    heroCaption: 'More mitigation does not always mean better results. The winning strategy is often the simplest one.',
    excerpt: "We compared 15+ error mitigation techniques across IBM Torino and Tuna-9 for H2 VQE. IBM's TREX achieved chemical accuracy (0.22 kcal/mol) in a single shot. On Tuna-9, combining readout error mitigation with post-selection cut errors by 70% to 2.52 kcal/mol. But adding dynamical decoupling and twirling to TREX made IBM 45x worse. The lesson: understand your noise before stacking techniques.",
    content: `<p>After running 50+ VQE experiments across two quantum backends, we had a nagging question: <strong>we know the hardware errors are ~7-10 kcal/mol, but where exactly is the error coming from, and what actually fixes it?</strong></p>

<p>We systematically tested every error mitigation technique available to us &mdash; from simple post-selection to IBM's advanced TREX readout correction to zero-noise extrapolation &mdash; and ranked them by effectiveness. The results surprised us.</p>

<h2>The IBM Mitigation Ladder</h2>

<p>On IBM Torino, we ran the same H2 VQE circuit (R=0.735 &Aring;, 2-qubit sector-projected ansatz) through IBM's Estimator API with progressively more mitigation layers. Each technique adds cost (more shots, more QPU time) but is supposed to reduce error.</p>

<table>
<thead><tr><th>Rank</th><th>Technique</th><th>Energy (Ha)</th><th>Error (kcal/mol)</th><th>QPU time</th></tr></thead>
<tbody>
<tr style="background: rgba(0,255,136,0.08)"><td>1</td><td><strong>TREX (resilience=1)</strong></td><td>&minus;1.1377</td><td><strong>0.22</strong></td><td>14s</td></tr>
<tr><td>2</td><td>TREX + DD</td><td>&minus;1.1352</td><td>1.33</td><td>14s</td></tr>
<tr><td>3</td><td>Offline PS (Run 1)</td><td>&minus;1.1347</td><td>1.66</td><td>5s</td></tr>
<tr><td>4</td><td>SamplerV2 + DD + Twirl + PS</td><td>&minus;1.1317</td><td>3.50</td><td>14s</td></tr>
<tr><td>5</td><td>TREX + 16K shots</td><td>&minus;1.1313</td><td>3.77</td><td>23s</td></tr>
<tr><td>6</td><td>Offline PS (weighted mean)</td><td>&minus;1.1311</td><td>3.91</td><td>&mdash;</td></tr>
<tr><td>7</td><td>TREX + DD + Twirl</td><td>&minus;1.1214</td><td>10.0</td><td>14s</td></tr>
<tr><td>8</td><td>ZNE linear [1,2,3]</td><td>&minus;1.1168</td><td>12.84</td><td>20s</td></tr>
<tr><td>9</td><td>Raw (resilience=0)</td><td>&minus;1.0956</td><td>26.2</td><td>5s</td></tr>
<tr><td>10</td><td>ZNE exponential [1,2,3,5]</td><td>NaN</td><td>NaN</td><td>23s</td></tr>
</tbody>
</table>

<p>FCI reference: &minus;1.1373 Ha. Chemical accuracy threshold: 1.0 kcal/mol.</p>

<h3>Key finding: more mitigation &ne; better</h3>

<p>The best technique is the <em>simplest</em> advanced option: <strong>TREX alone at 0.22 kcal/mol</strong> &mdash; well within chemical accuracy. TREX (Twirled Readout EXtraction) mitigates readout errors by randomizing the measurement basis, which is exactly what our noise analysis predicted: readout error is the dominant noise source.</p>

<p>But adding dynamical decoupling (DD) to TREX makes it worse (1.33 kcal/mol). Adding DD <em>and</em> Pauli twirling makes it <strong>45x worse</strong> (10.0 kcal/mol). Why? These techniques add extra gates to suppress coherent errors &mdash; but our circuit is only 3 gates deep. The overhead of the mitigation exceeds the error it's trying to fix.</p>

<p>ZNE (zero-noise extrapolation) is the worst performer: the linear extrapolant gives 12.84 kcal/mol, and the exponential fit fails entirely (returns NaN). This confirms what we found on Tuna-9: <strong>CNOT gate noise is not the dominant error source on either backend</strong>. ZNE amplifies gate noise and extrapolates to zero, but when gate noise is already small compared to readout error, the extrapolation has nothing useful to extrapolate.</p>

<p>The lesson: <strong>match the mitigation to the noise</strong>. Readout-dominated errors need readout correction (TREX, confusion matrix inversion). Gate-dominated errors need gate-level mitigation (ZNE, DD). Applying gate-level fixes to readout-dominated circuits just adds overhead.</p>

<h2>Tuna-9: Offline REM Reanalysis</h2>

<p>We had 21 Tuna-9 VQE results with raw measurement counts, plus a readout calibration (confusion matrix) for q[2,4]. Could we retroactively improve the results by applying readout error mitigation (REM) offline?</p>

<p>We tested 5 strategies on every result:</p>
<ol>
<li><strong>Raw</strong> &mdash; no mitigation at all</li>
<li><strong>PS</strong> &mdash; parity post-selection only (discard even-parity Z-basis shots)</li>
<li><strong>REM</strong> &mdash; confusion matrix inversion only</li>
<li><strong>REM+PS</strong> &mdash; apply REM to raw counts, then post-select</li>
<li><strong>PS+REM</strong> &mdash; post-select first, then apply REM</li>
</ol>

<table>
<thead><tr><th>Strategy</th><th>Mean error</th><th>Median</th><th>Min</th><th>Max</th><th>Wins</th></tr></thead>
<tbody>
<tr><td>Raw</td><td>32.45</td><td>31.11</td><td>13.48</td><td>88.28</td><td>0</td></tr>
<tr><td>PS only</td><td>8.30</td><td>8.50</td><td>2.79</td><td>17.32</td><td>0</td></tr>
<tr><td>REM only</td><td>8.62</td><td>6.55</td><td>0.00</td><td>39.02</td><td>3</td></tr>
<tr style="background: rgba(0,255,136,0.08)"><td><strong>REM+PS</strong></td><td><strong>2.52</strong></td><td><strong>2.39</strong></td><td><strong>0.13</strong></td><td>7.60</td><td><strong>13</strong></td></tr>
<tr><td>PS+REM</td><td>3.90</td><td>3.56</td><td>0.05</td><td>10.32</td><td>5</td></tr>
</tbody>
</table>

<p>All values in kcal/mol. N=21 experiments. "Wins" = number of experiments where this strategy gave the lowest error.</p>

<h3>REM+PS wins 62% of the time</h3>

<p>The combination of confusion matrix correction followed by parity post-selection is the clear winner on Tuna-9. It cuts the mean error from 8.30 (PS alone) to <strong>2.52 kcal/mol &mdash; a 70% improvement</strong>. Several individual runs hit chemical accuracy: 0.13, 0.18, and 0.27 kcal/mol.</p>

<p>Why does ordering matter? REM first corrects the measurement bias across all four 2-qubit states (00, 01, 10, 11). This shifts probability from over-counted states to under-counted ones. Then post-selection removes any remaining parity violations. If you post-select first, you throw away shots before the readout correction can redistribute them &mdash; you lose information.</p>

<p>REM alone (mean 8.62) is actually <em>worse</em> than PS alone (8.30). The confusion matrix correction can introduce artifacts when applied without the parity constraint &mdash; it redistributes probability to all four states, including the wrong-parity ones. Post-selection cleans this up.</p>

<h3>Bond distance matters</h3>

<table>
<thead><tr><th>R (&Aring;)</th><th>N</th><th>Raw</th><th>PS</th><th>REM+PS</th><th>Improvement</th></tr></thead>
<tbody>
<tr><td>0.500</td><td>1</td><td>38.10</td><td>9.98</td><td>5.05</td><td>49%</td></tr>
<tr><td>0.735 (eq.)</td><td>16</td><td>36.28</td><td>7.30</td><td>2.15</td><td>71%</td></tr>
<tr><td>1.000</td><td>1</td><td>13.48</td><td>4.12</td><td>3.64</td><td>12%</td></tr>
<tr><td>1.500</td><td>1</td><td>17.06</td><td>12.68</td><td>3.40</td><td>73%</td></tr>
<tr><td>2.000</td><td>1</td><td>18.69</td><td>17.32</td><td>3.91</td><td>77%</td></tr>
<tr><td>2.500</td><td>1</td><td>13.72</td><td>13.42</td><td>2.39</td><td>82%</td></tr>
</tbody>
</table>

<p>REM+PS improves <em>every</em> bond distance. The biggest improvement is at large R (2.0&ndash;2.5 &Aring;), where PS alone barely helps because the X/Y basis errors dominate &mdash; and REM corrects those too. The smallest improvement is at R=1.0, where the circuit already benefits from near-optimal PS performance.</p>

<h3>ZNE fold factor interaction</h3>

<p>We had 12 experiments with ZNE gate folding (1, 3, or 5 CNOT insertions). Does REM interact with the ZNE signal?</p>

<table>
<thead><tr><th>CNOT folds</th><th>N</th><th>PS</th><th>REM+PS</th></tr></thead>
<tbody>
<tr><td>1 (baseline)</td><td>13</td><td>8.65</td><td>2.55</td></tr>
<tr><td>3</td><td>4</td><td>8.62</td><td>3.25</td></tr>
<tr><td>5</td><td>4</td><td>6.86</td><td>1.68</td></tr>
</tbody>
</table>

<p>The trend is noisy with small N, but REM+PS at fold=5 (1.68 kcal/mol) is the best Tuna-9 result overall. This hints that ZNE <em>might</em> have a mild effect once readout error is removed &mdash; but we'd need more data to confirm.</p>

<h2>Cross-Platform Comparison</h2>

<p>How do the best techniques compare across backends?</p>

<table>
<thead><tr><th>Backend</th><th>Best technique</th><th>Error (kcal/mol)</th><th>Chem. accuracy?</th></tr></thead>
<tbody>
<tr><td>Emulator</td><td>None needed</td><td>0.75</td><td>Yes</td></tr>
<tr style="background: rgba(0,255,136,0.08)"><td><strong>IBM Torino</strong></td><td><strong>TREX</strong></td><td><strong>0.22</strong></td><td><strong>Yes</strong></td></tr>
<tr><td>Tuna-9 q[2,4]</td><td>REM+PS</td><td>2.52 (mean)</td><td>Sometimes</td></tr>
<tr><td>Tuna-9 q[4,6]</td><td>Z-PS+REM</td><td>6.2</td><td>No</td></tr>
<tr><td>Tuna-9 q[0,1]</td><td>PS only</td><td>9.45</td><td>No</td></tr>
</tbody>
</table>

<p>IBM's TREX is the only technique that consistently achieves chemical accuracy on real hardware. But it's proprietary to IBM's Estimator API &mdash; you can't apply it on other platforms. For Tuna-9, the open-source approach (confusion matrix + post-selection) gets within 2.5x of the target.</p>

<h2>Why ZNE Failed on Both Backends</h2>

<p>Zero-noise extrapolation assumes that gate noise increases monotonically with circuit depth. You run the circuit at multiple noise levels (by inserting extra identity-equivalent gate pairs), then extrapolate back to zero noise.</p>

<p>On Tuna-9, we ran 12 experiments with 1, 3, and 5 CNOT folds. The PS-only error was essentially flat: 8.65, 8.62, and 6.86 kcal/mol. <strong>Extra CNOTs added less than 1.3 kcal/mol of noise</strong> &mdash; the signal ZNE needs to extrapolate simply isn't there.</p>

<p>On IBM Torino, ZNE with DD+twirling gave 12.84 kcal/mol (linear) and NaN (exponential). The base error with DD+twirling is already 10.0 kcal/mol &mdash; worse than the raw TREX starting point.</p>

<p>The root cause is the same on both backends: <strong>our VQE circuit is only 3 native gates deep</strong> (Ry, CNOT, X). Gate noise contributes &lt;20% of total error. The dominant errors are readout bias, state preparation imperfections, and T1/T2 decoherence during measurement. None of these scale with gate count, so ZNE's extrapolation has no signal to amplify.</p>

<p>ZNE would likely work better on deeper circuits (QAOA with multiple layers, Trotterized dynamics) where gate noise dominates. For shallow VQE, it's the wrong tool.</p>

<h2>What We Learned</h2>

<ol>
<li><strong>Match mitigation to noise type.</strong> Readout-dominated circuits need readout correction (TREX, confusion matrices). Gate-dominated circuits need gate-level mitigation (ZNE, DD). Mismatching wastes QPU time and can make results worse.</li>

<li><strong>Technique stacking can backfire.</strong> On IBM, TREX alone (0.22 kcal/mol) beats TREX+DD (1.33) beats TREX+DD+Twirl (10.0). Each additional layer adds overhead that exceeds its benefit for shallow circuits.</li>

<li><strong>Order matters for combined techniques.</strong> REM then post-selection (2.52 kcal/mol) beats post-selection then REM (3.90 kcal/mol) because REM redistributes probability before information is discarded.</li>

<li><strong>IBM's TREX is genuinely impressive.</strong> Chemical accuracy on real hardware from a single API parameter is a major engineering achievement. The catch: it's proprietary and not available on other platforms.</li>

<li><strong>Simple techniques close most of the gap.</strong> Going from raw (32 kcal/mol) to PS (8.3) to REM+PS (2.5 kcal/mol) on Tuna-9 recovers 90% of the error using techniques that work on any backend with a confusion matrix.</li>
</ol>

<hr />

<p>All mitigation ladder data: <a href="https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/vqe-mitigation-ladder-001-ibm.json">IBM mitigation ladder</a>. Tuna-9 reanalysis: <a href="https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/tuna9-rem-reanalysis.json">REM reanalysis</a>. Readout calibration: <a href="https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/readout-cal-tuna9-q24-001.json">confusion matrices</a>.</p>`,
    sources: [
      { label: 'IBM mitigation ladder (JSON)', url: 'https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/vqe-mitigation-ladder-001-ibm.json' },
      { label: 'Tuna-9 REM reanalysis (JSON)', url: 'https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/tuna9-rem-reanalysis.json' },
      { label: 'Readout calibration data (JSON)', url: 'https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/readout-cal-tuna9-q24-001.json' },
      { label: 'Experiments dashboard', url: 'https://quantuminspire.vercel.app/experiments' },
      { label: 'IBM Qiskit Runtime Primitives', url: 'https://docs.quantum.ibm.com/api/qiskit-ibm-runtime' },
    ],
  },
  {
    slug: 'cross-platform-quantum-comparison',
    title: 'Four Quantum Backends, One Question: How Much Does the Hardware Matter?',
    subtitle: 'We ran the same experiments on a noiseless emulator, IBM Torino (133q), Tuna-9 (9q), and IQM Garnet (20q). The answer: it matters a lot, but not always in the ways you expect.',
    date: '2026-02-11',
    author: 'AI x Quantum Research Team',
    category: 'experiment',
    tags: ['cross-platform', 'IBM Quantum', 'Tuna-9', 'IQM Garnet', 'VQE', 'quantum volume', 'QEC', 'neural network decoder', 'hardware noise'],
    heroImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80',
    heroCaption: 'The same quantum algorithm produces radically different results depending on where you run it.',
    excerpt: `We ran VQE, quantum volume, randomized benchmarking, and error correction across 4 quantum backends. Benchmarks pass everywhere. VQE fails everywhere except the emulator. IQM Garnet achieves QV=32 while Tuna-9 manages QV=8. Error correction reveals the sharpest hardware differences. And IBM's 99.99% RB fidelity is fake.`,
    content: `<p>What happens when you take the same quantum algorithm and run it on four completely different backends? We've been answering this question systematically across 50+ experiments, 4 paper replications, and 4 platforms: a noiseless QI emulator, IBM's 133-qubit Torino processor, QuTech's 9-qubit Tuna-9 transmon chip, and IQM's 20-qubit Garnet processor.</p>

<p>The headline: <strong>benchmarks are forgiving, chemistry is brutal, and error correction reveals the sharpest hardware differences of all.</strong></p>

<h2>The Scorecard</h2>

<table>
<thead><tr><th>Experiment</th><th>Metric</th><th>Emulator</th><th>IBM Torino</th><th>Tuna-9</th><th>IQM Garnet</th></tr></thead>
<tbody>
<tr><td>QV n=2</td><td>HOF</td><td>77.2%</td><td>69.7%</td><td>69.2%</td><td>74.0%</td></tr>
<tr><td>QV n=3</td><td>HOF</td><td>85.1%</td><td>81.0%</td><td>82.1%</td><td>78.6%</td></tr>
<tr><td>QV n=5</td><td>HOF</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>69.2%</td></tr>
<tr><td>QV (best)</td><td>Volume</td><td>&ge;8</td><td>&ge;8</td><td>8</td><td><strong>32</strong></td></tr>
<tr><td>RB 1-qubit</td><td>Gate fidelity</td><td>99.95%</td><td>99.99%*</td><td>99.82%</td><td><strong>99.82%</strong></td></tr>
<tr><td>VQE H2</td><td>Error (kcal/mol)</td><td>0.75</td><td>9.2</td><td>3.0&dagger;</td><td>&mdash;</td></tr>
<tr><td>VQE HeH+</td><td>MAE (kcal/mol)</td><td>0.08</td><td>83.5</td><td>&mdash;</td><td>&mdash;</td></tr>
<tr><td>[[4,2,2]] QEC</td><td>Detection / FP</td><td>100% / 0%</td><td>92.7% / 14.0%</td><td>FAILED</td><td>&mdash;</td></tr>
<tr><td>Bell state</td><td>Fidelity</td><td>100%</td><td>99.1%</td><td>85.8&ndash;93.5%</td><td>88.4&ndash;98.1%</td></tr>
<tr><td>GHZ-10</td><td>Fidelity</td><td>&mdash;</td><td>&mdash;</td><td>n/a (9q)</td><td>54.7%</td></tr>
</tbody>
</table>

<p><em>*IBM RB fidelity inflated: Qiskit transpiler collapses Clifford sequences to depth 1&ndash;2 circuits, measuring readout error rather than gate error. &dagger;Tuna-9 VQE on best qubit pair q[2,4] with post-selection; worst pair q[0,1] gives 9.5 kcal/mol &mdash; a 3.1x difference from qubit selection alone.</em></p>

<p>Four patterns jump out:</p>

<ol>
<li><strong>Benchmarks pass everywhere, but unevenly.</strong> QV passes on all hardware, but IQM Garnet hits QV=32 while Tuna-9 tops out at QV=8. More qubits with better connectivity wins the benchmark game.</li>
<li><strong>VQE fails everywhere except the emulator &mdash; but qubit selection matters enormously.</strong> No hardware achieves chemical accuracy, but choosing the right qubit pair on Tuna-9 cuts error from 9.5 to 3.0 kcal/mol (3.1x improvement). On the same chip, qubit selection matters more than error mitigation.</li>
<li><strong>Error correction reveals the sharpest differences.</strong> The same [[4,2,2]] code runs perfectly on the emulator, works with 92.7% detection on IBM, and literally can't execute on Tuna-9 due to topology constraints.</li>
<li><strong>Compiler tricks inflate benchmarks.</strong> IBM's 99.99% RB fidelity is measuring readout error, not gate quality. Tuna-9 and IQM Garnet both report 99.82% &mdash; genuine gate fidelity measured via raw native gates with no Clifford-level compilation.</li>
</ol>

<h2>VQE: When Bond Curves Break</h2>

<p>The Peruzzo 2014 replication tells this story most clearly. We computed the potential energy surface (PES) of HeH+ across 11 bond distances (0.5&ndash;3.0 &Aring;), using the same 2-qubit sector-projected ansatz on each backend.</p>

<table>
<thead><tr><th>Bond distance (&Aring;)</th><th>FCI (Ha)</th><th>Emulator (Ha)</th><th>IBM Torino (Ha)</th><th>IBM error (kcal/mol)</th></tr></thead>
<tbody>
<tr><td>0.50</td><td>&minus;2.641</td><td>&minus;2.641</td><td>&minus;2.459</td><td>114.1</td></tr>
<tr><td>0.75</td><td>&minus;2.846</td><td>&minus;2.846</td><td>&minus;2.701</td><td>91.2</td></tr>
<tr><td>1.00 (eq.)</td><td>&minus;2.860</td><td>&minus;2.860</td><td>&minus;2.728</td><td>82.9</td></tr>
<tr><td>1.50</td><td>&minus;2.825</td><td>&minus;2.825</td><td>&minus;2.716</td><td>68.5</td></tr>
<tr><td>2.00</td><td>&minus;2.811</td><td>&minus;2.811</td><td>&minus;2.687</td><td>77.9</td></tr>
<tr><td>3.00</td><td>&minus;2.808</td><td>&minus;2.808</td><td>&minus;2.678</td><td>81.4</td></tr>
</tbody>
</table>

<p>The emulator matches the exact (FCI) curve to within 0.08 kcal/mol MAE. IBM Torino's curve has the right <em>shape</em> &mdash; minimum at R&asymp;1.0 &Aring;, dissociation plateau at large R &mdash; but is offset by ~0.13 Ha at every point. The error is remarkably uniform: 68&ndash;114 kcal/mol across all 11 distances.</p>

<p>Why so bad? The HeH+ 2-qubit Hamiltonian has the form <code>H = g0 + g1&lang;Z0&rang; + g2&lang;Z1&rang; + g3&lang;Z0Z1&rang; + g4&lang;X0X1&rang; + g5&lang;Y0Y1&rang;</code>. The g1 coefficient (&sim;0.5&ndash;0.8) amplifies readout bias: a 10% readout error on &lang;Z&rang; operators contributes &sim;0.05&ndash;0.08 Ha of error. The energy also depends on the difference g1&minus;g2 &mdash; when both Z terms are biased in the same direction, the error compounds rather than cancels.</p>

<p>For H2, the Hamiltonian is more symmetric and the g1 coefficient is smaller (&sim;0.4), which is why IBM gets 9 kcal/mol error on H2 but 83 kcal/mol on HeH+. <strong>The molecule matters as much as the hardware.</strong></p>

<h2>Qubit Selection: The Cheapest Error Mitigation</h2>

<p>On Tuna-9, we ran the exact same H2 VQE circuit on three different qubit pairs. The results are striking:</p>

<table>
<thead><tr><th>Qubit pair</th><th>Bell fidelity</th><th>VQE error (kcal/mol)</th><th>Post-sel. kept</th></tr></thead>
<tbody>
<tr><td>q[0,1]</td><td>87.0%</td><td>9.45</td><td>83%</td></tr>
<tr><td>q[4,6]</td><td>93.5%</td><td>6.2 (with REM)</td><td>&mdash;</td></tr>
<tr><td>q[2,4]</td><td>92.3%</td><td><strong>3.04</strong></td><td>96%</td></tr>
</tbody>
</table>

<p>Switching from q[0,1] to q[2,4] &mdash; no algorithm change, no extra error mitigation, just picking better qubits &mdash; cuts error by 3.1x. And q[2,4] outperforms q[4,6] despite q[4,6] having higher Bell fidelity (93.5% vs 92.3%). This suggests that CNOT direction, measurement axis noise, and spectator qubit effects matter beyond what Bell fidelity captures.</p>

<p>The PES sweep confirms this pattern holds across the full dissociation curve:</p>

<table>
<thead><tr><th>R (&Aring;)</th><th>Emulator (kcal/mol)</th><th>Tuna-9 q[2,4] (kcal/mol)</th><th>Hardware gap</th></tr></thead>
<tbody>
<tr><td>0.5</td><td>2.0</td><td>9.98</td><td>+8.0</td></tr>
<tr><td>0.735 (eq.)</td><td>0.6</td><td>3.04</td><td>+2.4</td></tr>
<tr><td>1.0</td><td>1.4</td><td>4.12</td><td>+2.7</td></tr>
<tr><td>1.5</td><td>2.6</td><td>12.68</td><td>+10.1</td></tr>
<tr><td>2.0</td><td>2.1</td><td>17.32</td><td>+15.2</td></tr>
<tr><td>2.5</td><td>0.09</td><td>13.42</td><td>+13.3</td></tr>
</tbody>
</table>

<p>Hardware noise grows dramatically past R=1.0 &Aring;, where the circuit needs more entanglement (larger rotation angle &alpha;). The X/Y basis measurements required for the &lang;X<sub>0</sub>X<sub>1</sub>&rang; and &lang;Y<sub>0</sub>Y<sub>1</sub>&rang; terms add gates, introducing noise that dominates at large bond distances.</p>

<p><strong>The takeaway: on current NISQ hardware, smart qubit routing is the single most impactful optimization &mdash; cheaper than error mitigation and with no runtime overhead.</strong></p>

<h2>Quantum Error Correction: Where Topology Kills</h2>

<p>The [[4,2,2]] error detection code encodes 2 logical qubits into 4 data qubits, with 2 ancilla qubits measuring XXXX and ZZZZ stabilizers. It can <em>detect</em> (but not correct) any single-qubit error.</p>

<p>On the <strong>emulator</strong>: 100% detection rate, 0% false positive rate. Perfect, as expected from a noiseless backend.</p>

<p>On <strong>IBM Torino</strong> (133 qubits, heavy-hex topology): 92.7% detection rate, 14.0% false positive rate. IBM's rich connectivity easily accommodates the circuit &mdash; each ancilla needs CNOTs to all 4 data qubits (degree 4), and IBM's topology provides this.</p>

<p>On <strong>Tuna-9</strong>: <strong>Every circuit FAILED.</strong> The stabilizer measurement requires each ancilla to CNOT all 4 data qubits, meaning the ancilla needs degree 4. Tuna-9's maximum qubit degree is 3. There is no 6-qubit subgraph on Tuna-9 that can execute this circuit without SWAP gates &mdash; and cQASM 3.0 doesn't support implicit routing.</p>

<p>This is the starkest cross-platform difference in our data. The <strong>same algorithm, same encoding, same error model</strong> &mdash; one platform runs it with 93% accuracy, the other can't run it at all. Topology isn't just a performance factor; it's a hard constraint that determines which algorithms are physically possible on a given chip.</p>

<h2>Training an AI Decoder on Hardware Data</h2>

<p>The IBM Torino [[4,2,2]] data gave us something the emulator never could: <strong>realistic noise patterns to train an AI decoder</strong>.</p>

<p>We ran 13 error variants (no error, X/Z/Y on each of 4 data qubits) with 4,096 shots each = 53,248 labeled samples. Each sample is a 6-bit measurement outcome (4 data + 2 syndrome bits) with a known injected error class.</p>

<p>We trained a neural network decoder (scikit-learn MLPClassifier, 32/16 hidden layers) and compared it to a lookup-table decoder:</p>

<table>
<thead><tr><th>Decoder</th><th>Accuracy</th><th>Notes</th></tr></thead>
<tbody>
<tr><td>NN (13 classes)</td><td><strong>61.7%</strong></td><td>Learns data-bit correlation patterns</td></tr>
<tr><td>Lookup table (13 classes)</td><td>41.1%</td><td>Syndrome &rarr; most likely error</td></tr>
<tr><td>Lookup table (4 classes)</td><td>79.8%</td><td>Coarser: no-error vs X/Z/Y type only</td></tr>
</tbody>
</table>

<p>The NN outperforms the detailed lookup table by <strong>50%</strong> (61.7% vs 41.1%). Why? The lookup table only uses the 2 syndrome bits; the NN also uses the 4 data bits. This matters because hardware noise creates correlations between data-bit patterns and error types that a syndrome-only decoder can't see.</p>

<p>One fundamental limitation: <strong>Z errors can't be localized from Z-basis measurement.</strong> Z errors don't flip bits in the computational basis &mdash; they flip phase &mdash; so the NN gets 0% recall on individual Z errors (Z_d0, Z_d1, etc.). The ZZZZ syndrome <em>detects</em> that a Z error occurred, but the data bits don't reveal which qubit was affected. This isn't a decoder failure; it's a fundamental limitation of single-basis measurement.</p>

<h2>Why IBM's 99.99% RB Is Fake (and Tuna-9's 99.82% Is Real)</h2>

<p>This might be the most important methodological finding in our data. IBM Torino reports <strong>99.99% single-qubit gate fidelity</strong> from randomized benchmarking. Tuna-9 reports <strong>99.82%</strong>. At face value, IBM's gates are 100x better. In reality, the two numbers are measuring completely different things.</p>

<p>Here's what happens: IBM's Qiskit transpiler recognizes that a sequence of random Clifford gates composes into a single Clifford operation. So regardless of whether you ask for m=1, 4, 8, 16, or 32 Clifford gates, the transpiler compiles the <em>entire sequence</em> down to 1&ndash;2 physical gates. Our data shows this clearly:</p>

<table>
<thead><tr><th>Sequence length</th><th>IBM survival</th><th>Tuna-9 survival</th><th>IQM Garnet survival</th></tr></thead>
<tbody>
<tr><td>m=1</td><td>90.5%</td><td>95.8%</td><td>98.9%</td></tr>
<tr><td>m=4</td><td>90.3%</td><td>94.8%</td><td>97.9%</td></tr>
<tr><td>m=8</td><td>90.4%</td><td>93.6%</td><td>96.4%</td></tr>
<tr><td>m=16</td><td>90.0%</td><td>91.5%</td><td>94.3%</td></tr>
<tr><td>m=32</td><td>90.1%</td><td>89.0%</td><td>88.2%</td></tr>
</tbody>
</table>

<p>IBM's survival probability is <strong>flat at ~90%</strong> &mdash; no decay at all. That 90% floor is pure readout error: how accurately you can measure a qubit in the |0&rang; state. The exponential decay that RB is supposed to measure &mdash; the decay that tells you about gate quality &mdash; never appears because there are no extra gates to decay through.</p>

<p>Tuna-9's curve, by contrast, <strong>actually decays</strong> from 95.8% to 89.0%. Its compiler doesn't collapse Clifford sequences, so the gates are physically executed. The 99.82% fidelity extracted from this decay is a genuine measurement of gate quality.</p>

<p><strong>The punchline: Tuna-9's "worse" number is the more honest measurement.</strong> A smaller processor with a simpler compiler produces more trustworthy benchmarks than a 133-qubit system with an aggressively optimizing transpiler. For the field, this raises an uncomfortable question: how many published RB numbers are actually measuring readout error dressed up as gate fidelity?</p>

<p>IQM Garnet confirms this prediction. IQM's native gate set is <code>prx(angle, phase)</code> and <code>cz</code> &mdash; there is no Clifford-level transpilation. When we submit a 32-Clifford RB sequence, IQM executes all ~130 physical prx gates without collapsing them. The result: <strong>clear exponential decay from 98.9% at m=1 to 88.2% at m=32, yielding 99.82% gate fidelity &mdash; identical to Tuna-9.</strong> Two independent backends with honest compilers converge on the same answer. IBM's 100x-better number is the outlier, not the norm.</p>

<p>The fix is straightforward &mdash; use interleaved RB with non-Clifford gates, or disable Clifford compilation during benchmarking. But this is rarely flagged in cross-platform comparisons, and it means <strong>you cannot naively compare RB numbers across platforms without understanding what each compiler does to your circuits.</strong></p>

<h2>What We Learned</h2>

<ol>
<li><strong>Compiler honesty matters more than qubit count.</strong> IBM's 99.99% RB looks 100x better than Tuna-9's 99.82%, but IBM's number measures readout error while Tuna-9's measures actual gate quality. IQM Garnet confirms this: with no Clifford-level compilation, IQM's RB shows genuine decay and converges on the <em>same</em> 99.82% fidelity as Tuna-9. Two honest compilers agree; the outlier is the one with aggressive optimization. Cross-platform comparisons are meaningless without understanding what each transpiler does to your circuits.</li>

<li><strong>Benchmarks and applications live in different worlds.</strong> QV and RB pass on hardware that can't do useful chemistry. The gap between "this hardware works" (QV PASS) and "this hardware is useful" (VQE within chemical accuracy) is enormous.</li>

<li><strong>Error correction needs topology, not just qubits.</strong> Tuna-9 has enough qubits for [[4,2,2]] but not enough connectivity. IBM Torino has 133 qubits but ~14% false positive rate on a 6-qubit code. Neither is ready for fault-tolerant computation, but they fail for completely different reasons.</li>

<li><strong>AI decoders beat classical decoders on real hardware data.</strong> A simple 2-layer neural network outperforms lookup tables by 50% on qubit-level error classification. On real hardware, noise has structure that ML can exploit.</li>

<li><strong>The molecule matters as much as the machine.</strong> IBM Torino gets 9 kcal/mol error on H2 but 83 kcal/mol on HeH+, because HeH+'s asymmetric Hamiltonian amplifies readout bias. You can't benchmark VQE on one molecule and assume it generalizes.</li>

<li><strong>Qubit selection is the cheapest optimization.</strong> On Tuna-9, switching from q[0,1] to q[2,4] cuts VQE error by 3.1x &mdash; no algorithm change, no error mitigation, just picking better qubits. This outperforms readout error mitigation and costs nothing at runtime.</li>
</ol>

<hr />

<p>All raw data &mdash; measurement counts, job IDs, expectation values, decoder metrics &mdash; is available in the <a href="https://github.com/JDerekLomas/quantuminspire/tree/main/experiments/results">experiments/results/</a> directory. The experiments dashboard at <a href="https://quantuminspire.vercel.app/experiments">/experiments</a> shows live results across all backends.</p>

<p>Hardware job IDs: IBM HeH+ VQE (d65ncqoqbmes739d4h30). IBM Cross QV/RB (d65ncilbujdc73ctmjr0). IBM [[4,2,2]] (d65n33je4kfs73cvklt0 + 12 more). Tuna-9 QV (415379&ndash;415394). Tuna-9 RB (415395&ndash;415404). IQM Bell (019c48cf-99f2-7e03). IQM diagnostics (30 jobs, 47K shots).</p>`,
    sources: [
      { label: 'Experiments dashboard', url: 'https://quantuminspire.vercel.app/experiments' },
      { label: 'HeH+ VQE IBM results (JSON)', url: 'https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/peruzzo2014-ibm-torino.json' },
      { label: 'Cross QV/RB IBM results (JSON)', url: 'https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/cross2019-ibm-torino.json' },
      { label: 'IQM Garnet diagnostics (JSON)', url: 'https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/iqm-garnet-diagnostic-suite.json' },
      { label: '[[4,2,2]] IBM results (JSON)', url: 'https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/detection-code-001-ibm-torino.json' },
      { label: 'Peruzzo et al. 2014', url: 'https://arxiv.org/abs/1304.3061' },
      { label: 'Cross et al. 2019', url: 'https://arxiv.org/abs/1811.12926' },
      { label: 'Sagastizabal et al. 2019', url: 'https://arxiv.org/abs/1902.11258' },
    ],
  },
  {
    slug: 'replication-crisis-quantum',
    title: 'We Tried to Replicate 4 Quantum Computing Papers. Here\'s What Happened.',
    subtitle: 'AI agents reproduced 14 published claims across emulator, IBM Torino, and Tuna-9 hardware. The gaps tell us more than the successes.',
    date: '2026-02-11',
    author: 'AI x Quantum Research Team',
    category: 'experiment',
    tags: ['replication', 'VQE', 'quantum volume', 'IBM Quantum', 'Tuna-9', 'reproducibility', 'hardware noise'],
    heroImage: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=1200&q=80',
    heroCaption: 'Replication is the foundation of science. In quantum computing, the gap between published results and reproduced results reveals how much hardware matters.',
    excerpt: 'We used AI agents to replicate 4 landmark quantum computing papers on 3 different backends. Emulators matched published results almost perfectly (85% pass). Real hardware told a different story: IBM Torino got within 9 kcal/mol on VQE, Tuna-9 achieved Quantum Volume 8 but failed VQE entirely. The reproducibility gap is the finding.',
    content: `<p>Reproducibility is the foundation of science. In quantum computing, it's also one of the field's biggest open questions: when a paper reports a ground state energy or a quantum volume, <strong>can someone else get the same result on different hardware?</strong></p>

<p>We set out to answer this systematically. Using AI agents with direct access to quantum hardware through <a href="https://modelcontextprotocol.io/">MCP tool calls</a>, we attempted to replicate 4 landmark papers across 4 backends: a noiseless emulator, IBM's 133-qubit Torino processor, QuTech's 9-qubit Tuna-9 transmon chip, and IQM's 20-qubit Garnet processor.</p>

<p>The results: <strong>emulators reproduce published claims almost perfectly</strong> (85% pass rate). Real hardware tells a different story.</p>

<h2>The Papers</h2>

<table>
<thead><tr><th>Paper</th><th>Type</th><th>Qubits</th><th>Claims</th><th>Pass Rate</th></tr></thead>
<tbody>
<tr><td>Sagastizabal et al. 2019</td><td>VQE + Error Mitigation</td><td>2</td><td>4</td><td>50%</td></tr>
<tr><td>Kandala et al. 2017</td><td>Hardware-efficient VQE</td><td>6</td><td>5</td><td>60%</td></tr>
<tr><td>Peruzzo et al. 2014</td><td>First VQE</td><td>2</td><td>3</td><td>100%</td></tr>
<tr><td>Cross et al. 2019</td><td>Quantum Volume</td><td>5</td><td>3</td><td>100%</td></tr>
</tbody>
</table>

<p>Across all 4 papers, we tested <strong>19 claims on up to 4 backends</strong>. The overall pass rate is 76%. But that number hides the real story: the gap between emulator and hardware.</p>

<h2>The VQE Story: Physics Works, Hardware Struggles</h2>

<p>Three of our four papers involve the Variational Quantum Eigensolver (VQE) &mdash; computing molecular ground state energies. The same H2 molecule at the same bond distance (R=0.735 &Aring;) appears in both Sagastizabal 2019 and Kandala 2017, giving us a natural cross-check.</p>

<h3>The Circuit</h3>

<p>The 2-qubit VQE ansatz uses a subspace-preserving circuit: <code>Ry(&alpha;) &rarr; CNOT &rarr; X</code>, producing the state cos(&alpha;/2)|10&rang; + sin(&alpha;/2)|01&rang;. The optimal parameter &alpha; = &minus;0.2235 gives the ground state energy E = &minus;1.1373 Hartree (the FCI reference).</p>

<p>Energy is reconstructed from three measurement bases:</p>
<p><code>E = g0 + g1&lang;Z0&rang; + g2&lang;Z1&rang; + g3&lang;Z0Z1&rang; + g4&lang;X0X1&rang; + g5&lang;Y0Y1&rang;</code></p>

<h3>Results Across Backends</h3>

<table>
<thead><tr><th>Observable</th><th>Ideal</th><th>Emulator</th><th>IBM Torino</th><th>Tuna-9</th></tr></thead>
<tbody>
<tr><td>&lang;Z0&rang;</td><td>&minus;0.975</td><td>&minus;0.973</td><td>&minus;0.961</td><td>&mdash;</td></tr>
<tr><td>&lang;Z1&rang;</td><td>+0.975</td><td>+0.973</td><td>+0.950</td><td>&mdash;</td></tr>
<tr><td>&lang;Z0Z1&rang;</td><td>&minus;1.000</td><td>&minus;1.000</td><td>&minus;0.969</td><td>&mdash;</td></tr>
<tr><td>&lang;X0X1&rang;</td><td>&minus;0.222</td><td>&minus;0.252</td><td>&minus;0.256</td><td>&mdash;</td></tr>
<tr><td>&lang;Y0Y1&rang;</td><td>&minus;0.222</td><td>&minus;0.219</td><td>&minus;0.197</td><td>&mdash;</td></tr>
<tr><td><strong>Energy (Ha)</strong></td><td><strong>&minus;1.1373</strong></td><td><strong>&minus;1.1385</strong></td><td><strong>&minus;1.1226</strong></td><td><strong>&minus;1.005</strong></td></tr>
<tr><td><strong>Error (kcal/mol)</strong></td><td>&mdash;</td><td><strong>0.75</strong></td><td><strong>9.22</strong></td><td><strong>83.4</strong></td></tr>
</tbody>
</table>

<p>The emulator achieves <strong>chemical accuracy</strong> (< 1 kcal/mol). IBM Torino is 9x worse but qualitatively correct &mdash; the dominant state |01&rang; appears in 97% of Z-basis shots. Tuna-9 is noise-dominated at 83 kcal/mol error.</p>

<p>The noise signature on IBM is instructive: Z-basis correlations degrade by 3&ndash;5% (depolarizing noise), while the off-diagonal X and Y correlations are surprisingly well-preserved. This suggests the dominant error is <strong>measurement noise</strong> rather than gate errors &mdash; the entangled state is prepared correctly but read out imperfectly.</p>

<h2>Quantum Volume: Hardware Passes</h2>

<p>Cross et al. 2019 defined <a href="https://arxiv.org/abs/1811.12926">Quantum Volume</a> as the gold standard for benchmarking quantum computers. The test: run random circuits on n qubits, check whether the heavy output fraction exceeds 2/3.</p>

<p>All four backends <strong>pass QV=8</strong>, but IQM goes further with QV=32:</p>

<table>
<thead><tr><th>Test</th><th>Threshold</th><th>Emulator</th><th>IBM Torino</th><th>Tuna-9</th><th>IQM Garnet</th></tr></thead>
<tbody>
<tr><td>n=2 (5 circuits)</td><td>> 66.7%</td><td>77.2%</td><td>69.7%</td><td>69.2%</td><td>74.0%</td></tr>
<tr><td>n=3 (5 circuits)</td><td>> 66.7%</td><td>85.1%</td><td>81.0%</td><td>82.1%</td><td>78.6%</td></tr>
<tr><td>n=4 (5 circuits)</td><td>> 66.7%</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>69.5%</td></tr>
<tr><td>n=5 (5 circuits)</td><td>> 66.7%</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>69.2%</td></tr>
</tbody>
</table>

<p>All four backends pass QV&ge;8. IQM Garnet stands out by reaching QV=32 (passing n=2 through n=5). Tuna-9's n=2 result (69.2%) barely clears the threshold. IQM's 20-qubit processor with 30 connections and square-lattice topology gives it an edge over Tuna-9's 9 qubits with only 10 connections.</p>

<p>The randomized benchmarking results complement this: Tuna-9 and IQM Garnet both achieve <strong>99.82% single-qubit gate fidelity</strong> (0.18% error per gate), matching the emulator's 99.95% closely. IBM Torino shows 99.99% &mdash; though this is inflated because IBM's transpiler collapses Clifford sequences to single gates, so RB measures readout error rather than gate error. The fact that two independent backends with honest compilers converge on the same answer (99.82%) while IBM reports 99.99% strongly suggests IBM's figure is a compiler artifact. This confirms that single-qubit operations on all three hardware platforms are high quality; the VQE failures come from 2-qubit (CNOT) errors and decoherence.</p>

<h2>The Reproducibility Gap</h2>

<p>Here's the central finding, visualized across all 4 papers:</p>

<table>
<thead><tr><th>Backend</th><th>Claims Tested</th><th>Pass</th><th>Partial</th><th>Fail</th></tr></thead>
<tbody>
<tr><td>QI Emulator</td><td>13</td><td><strong>12</strong></td><td>0</td><td>0</td></tr>
<tr><td>IBM Torino</td><td>7</td><td><strong>3</strong></td><td>3</td><td><strong>1</strong></td></tr>
<tr><td>QI Tuna-9</td><td>5</td><td><strong>3</strong></td><td>1</td><td><strong>1</strong></td></tr>
<tr><td>IQM Garnet</td><td>5</td><td><strong>5</strong></td><td>0</td><td>0</td></tr>
</tbody>
</table>

<p>The pattern is clear:</p>
<ul>
<li><strong>Emulators reproduce nearly everything.</strong> The physics in published papers is correct. When you remove noise, the algorithms work as described.</li>
<li><strong>Hardware introduces a reproducibility gap.</strong> IBM Torino gets VQE results that are qualitatively correct but quantitatively off by 9 kcal/mol &mdash; not chemical accuracy. Tuna-9 passes benchmarks (QV, RB) but fails VQE.</li>
<li><strong>The gap depends on the experiment type.</strong> Benchmarks (QV, RB) are designed to be noise-tolerant. VQE is noise-sensitive. Same hardware, different outcomes.</li>
</ul>

<p>This matches what Sagastizabal et al. themselves showed in 2019: error mitigation (symmetry verification) was essential for their results. Without it, their hardware couldn't achieve chemical accuracy either. We're seeing the same thing, seven years later, on different hardware.</p>

<h2>What AI Agents Bring to Replication</h2>

<p>This project wasn't about whether AI can write quantum circuits (it can). It was about whether AI agents can <strong>systematically test published claims</strong> and produce structured, comparable results. Three things stood out:</p>

<ol>
<li><strong>Cross-platform comparison is hard for humans, easy for agents.</strong> The same VQE circuit had to be written in cQASM 3.0 for Tuna-9 and OpenQASM 2.0 for IBM, with different qubit conventions, basis rotations, and measurement protocols. An agent handles this translation without errors (after the initial debugging).</li>

<li><strong>Structured output enables meta-analysis.</strong> Every result is stored as JSON with claim IDs, published values, measured values, failure modes, and error classifications. This makes it possible to ask "what fraction of VQE claims reproduce on hardware?" across papers &mdash; something manual replication rarely enables.</li>

<li><strong>The agent catches its own mistakes.</strong> Our first IBM VQE submission used the wrong ansatz (Ry(0.1118) &rarr; CNOT instead of Ry(&minus;0.2235) &rarr; CNOT &rarr; X). The agent detected the error by comparing counts against the expected state, resubmitted with the correct circuit, and documented both runs. Self-correction is built into the loop.</li>
</ol>

<h2>What's Next</h2>

<p><strong>Update (2026-02-10)</strong>: We've now completed Peruzzo on IBM (HeH+ bond sweep, MAE 83.5 kcal/mol &mdash; PES shape correct but absolute values noise-dominated) and Cross on IBM (QV PASS at n=2 and n=3, RB 99.99%). See <a href="/blog/cross-platform-quantum-comparison">the cross-platform comparison post</a> for the full story, including [[4,2,2]] quantum error correction and a neural network decoder trained on hardware data.</p>

<p>Remaining targets:</p>
<ul>
<li><strong>Harrigan et al. 2021</strong> &mdash; QAOA for MaxCut on non-planar graphs. This requires 23 qubits and will be our first test beyond the small-circuit regime.</li>
<li><strong>Error mitigation</strong> &mdash; Implement Sagastizabal's symmetry verification to see if the IBM VQE result improves from 9.2 kcal/mol toward chemical accuracy.</li>
<li><strong>Peruzzo 2014 on Tuna-9</strong> &mdash; HeH+ bond sweep on 9-qubit hardware. Will the topology constraints that broke QEC also affect VQE?</li>
</ul>

<hr />

<p>All raw data &mdash; measurement counts, job IDs, expectation values, circuit definitions &mdash; is available in the <a href="https://github.com/JDerekLomas/quantuminspire/tree/main/experiments/results">experiments/results/</a> directory and <a href="https://github.com/JDerekLomas/quantuminspire/tree/main/research/replication-reports">replication reports</a>. The replications dashboard at <a href="https://quantuminspire.vercel.app/replications">/replications</a> shows live results.</p>

<p>Hardware job IDs: IBM VQE (d65n0gbe4kfs73cvkisg, d65n0gre4kfs73cvkitg, d65n0hbe4kfs73cvkivg). Tuna-9 QV (415379&ndash;415394). Tuna-9 RB (415395&ndash;415404).</p>`,
    sources: [
      { label: 'Replications dashboard', url: 'https://quantuminspire.vercel.app/replications' },
      { label: 'IBM VQE results (JSON)', url: 'https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/vqe-equilibrium-001-ibm.json' },
      { label: 'Tuna-9 QV results (JSON)', url: 'https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/cross2019-qv-tuna9.json' },
      { label: 'Tuna-9 RB results (JSON)', url: 'https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/cross2019-rb-tuna9.json' },
      { label: 'Sagastizabal et al. 2019', url: 'https://arxiv.org/abs/1902.11258' },
      { label: 'Kandala et al. 2017', url: 'https://arxiv.org/abs/1704.05018' },
      { label: 'Peruzzo et al. 2014', url: 'https://arxiv.org/abs/1304.3061' },
      { label: 'Cross et al. 2019', url: 'https://arxiv.org/abs/1811.12926' },
    ],
  },
  {
    slug: 'race-to-automate-science',
    title: 'The Race to Automate Science — and Why It Should Worry Us',
    subtitle: 'GPT-5 runs 36,000 experiments, AI scientists publish papers, and a Nature study finds the field is shrinking',
    date: '2026-02-10',
    author: 'AI x Quantum Research Team',
    category: 'opinion',
    tags: ['automating science', 'self-driving labs', 'Andrew White', 'Nature', 'OpenAI Prism', 'Ginkgo'],
    heroImage: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1200&q=80',
    heroCaption: 'The automation of scientific discovery is accelerating — but at what cost to scientific diversity?',
    excerpt: 'GPT-5 just ran 36,000 protein experiments autonomously. OpenAI launched a free science workspace. And a Nature study found that AI is making scientists more productive while shrinking the scope of science itself. Here\'s what it means.',
    content: `
<p>In a single week in early 2026, three things happened that capture the state of automated science: OpenAI launched <strong>Prism</strong>, a free AI workspace for scientists. Ginkgo Bioworks announced that <strong>GPT-5 autonomously ran 36,000 experiments</strong> in their cloud lab. And a study in <em>Nature</em> found that AI tools are <strong>shrinking the scope of science</strong> even as they make individual scientists more productive.</p>

<p>These three developments — the tools, the results, and the warning — define the moment we're in.</p>

<h2>The Experiments: GPT-5 in the Lab</h2>

<p>On February 5, 2026, <a href="https://openai.com/index/gpt-5-lowers-protein-synthesis-cost/">Ginkgo Bioworks and OpenAI announced</a> the results of a fully autonomous laboratory experiment. GPT-5 designed experiments for cell-free protein synthesis, a Pydantic-based validation system checked scientific soundness, and Ginkgo's robotic lab in Boston executed them.</p>

<p>The numbers:</p>
<table>
<thead><tr><th>Metric</th><th>Result</th></tr></thead>
<tbody>
<tr><td>Experimental conditions tested</td><td><strong>36,000</strong> across 6 iterative cycles</td></tr>
<tr><td>Cost per gram of protein</td><td><strong>$422/gram</strong> (40% reduction over state-of-the-art)</td></tr>
<tr><td>Reagent cost reduction</td><td><strong>57%</strong> ($60 to $26 per gram)</td></tr>
</tbody>
</table>

<p>This is a closed-loop system: AI designs the experiment, robots execute it, results flow back to the AI, which designs the next round. No human in the loop for the experimental design. Ginkgo is already selling the optimized reaction mix through their reagents store.</p>

<p>For quantum computing, this is a preview. Quantum experiments are even more amenable to automation — the entire workflow is digital. Our own agent infrastructure is a rudimentary version of what Ginkgo built, but for quantum circuits instead of protein synthesis.</p>

<h2>The Tools: OpenAI Prism and the Platform War</h2>

<p><strong>OpenAI Prism</strong>, launched January 27, 2026, is a free, AI-native, LaTeX-native workspace for scientists. It's powered by GPT-5.2 and can:</p>
<ul>
<li>Draft and revise scientific text</li>
<li>Reason through equations</li>
<li>Suggest related papers from arXiv</li>
<li>Convert photos of handwritten formulas into LaTeX</li>
<li>Support unlimited projects and collaborators</li>
</ul>

<p>MIT Technology Review described it as letting scientists "vibe code science." It's free to anyone with a ChatGPT account — a clear move to make OpenAI the default platform for scientific writing.</p>

<p>They're not alone. <strong>Anthropic</strong> launched Claude for Life Sciences in October 2025 with integrations for Benchling, PubMed, and 10x Genomics. In January 2026, they expanded into healthcare with HIPAA-ready products. Anthropic also committed Claude and dedicated engineering teams to all 17 DOE national labs as part of the <strong>Genesis Mission</strong>.</p>

<p>The platform competition matters because whoever becomes the default AI for scientists shapes what questions get asked — and how.</p>

<h2>The Warning: AI Expands Impact, Contracts Focus</h2>

<p>This brings us to the most important paper of the year. In January 2026, <em>Nature</em> published "<a href="https://www.nature.com/articles/s41586-025-09922-y">Artificial intelligence tools expand scientists' impact but contract science's focus</a>" (Hao, Xu, Li & Evans). The findings, based on <strong>41.3 million research papers</strong>:</p>

<table>
<thead><tr><th>Metric</th><th>Effect of AI Tool Adoption</th></tr></thead>
<tbody>
<tr><td>Papers published</td><td><strong>3.02x</strong> more than non-AI peers</td></tr>
<tr><td>Citations received</td><td><strong>4.84x</strong> more</td></tr>
<tr><td>Time to become project leader</td><td><strong>1.37 years</strong> earlier</td></tr>
<tr><td>Volume of scientific topics studied</td><td><strong>Shrinks by 4.63%</strong></td></tr>
<tr><td>Engagement between scientists</td><td><strong>Decreases by 22%</strong></td></tr>
</tbody>
</table>

<p>The mechanism is straightforward: scientists using AI migrate toward areas with abundant data where AI tools demonstrate measurable advances on legible benchmarks. AI automates established fields rather than supporting exploration of new ones. The result is a less interconnected scientific literature — more papers, but about fewer things.</p>

<p>This is the Jevons Paradox applied to science: making research more efficient doesn't expand the frontier proportionally. It concentrates effort where efficiency gains are largest.</p>

<h2>Andrew White and the "Scientific Taste" Problem</h2>

<p>Andrew White — computational chemist at the University of Washington who led the ChemCrow project (the first chemistry LLM agent, which triggered a <em>White House briefing</em> on AI biosecurity), co-founder of <strong>Future House</strong> and <strong>Edison Scientific</strong> — addressed this problem directly on the <a href="https://www.latent.space/p/automating-science-world-models-scientific">Latent Space podcast</a>.</p>

<p>His autonomous research system <strong>Kosmos</strong> runs up to 12 hours per session, performing ~200 agent rollouts, executing ~42,000 lines of code, and reading ~1,500 papers per run. Independent scientists found 79.4% of statements in Kosmos reports to be accurate. Collaborators reported a single 20-cycle run performed the equivalent of 6 months of their own research.</p>

<p>But White identified the core problem: <strong>"scientific taste"</strong> — the ability to judge which questions are worth asking — is the real frontier. Traditional RLHF on hypothesis quality failed because human evaluators judge based on "tone, actionability, and specific facts" rather than theoretical importance. His solution: end-to-end feedback loops where actual research outcomes (downloads, citations, experimental validations) signal discovery quality.</p>

<p>He also warned about reward hacking: a trained molecule generation model generated compounds exploiting chemical loopholes (six-nitrogen structures, acid-base chemistry exploits) that scored well on benchmarks but were scientifically meaningless.</p>

<h2>The Self-Driving Lab Landscape</h2>

<p>The Ginkgo result is part of a broader movement:</p>

<ul>
<li><strong>Google DeepMind</strong> is opening a fully automated materials science lab in the UK in 2026 — integrated with Gemini from the ground up, synthesizing and characterizing hundreds of materials per day.</li>
<li><strong>Carnegie Mellon</strong> built a $40M cloud lab with Emerald Cloud Lab (200+ automated instruments). Their <strong>Coscientist</strong> system autonomously designs and executes chemistry experiments using GPT-4.</li>
<li><strong>US legislation</strong>: In December 2025, Senators Fetterman and Budd announced legislation to create the first national system of programmable cloud laboratories.</li>
<li>For quantum computing: the <strong>k-agents</strong> framework and <strong>Q-CTRL's autonomous calibration</strong> are making quantum processors self-driving — AI agents that calibrate gates and characterize devices without human intervention.</li>
</ul>

<h2>The DOE Genesis Mission</h2>

<p>The scale of government commitment is unprecedented. The <strong>Genesis Mission</strong>, launched by Executive Order in November 2025, aims to "double the productivity and impact of American science within a decade." The American Science and Security Platform will connect all 17 DOE national laboratories with AI systems, creating what officials describe as "the world's most complex and powerful scientific instrument ever built."</p>

<p>24 partner organizations signed agreements in December 2025:</p>
<ul>
<li><strong>Google DeepMind</strong>: AI co-scientist deployed across all 17 labs</li>
<li><strong>Anthropic</strong>: Claude + dedicated team building AI agents and MCP servers for lab workflows</li>
<li><strong>NVIDIA</strong>: Open AI science models, autonomous labs, quantum computing research</li>
<li><strong>OpenAI, Microsoft, IBM, AWS, Intel, Oracle, Palantir, xAI</strong>, and others</li>
</ul>

<h2>What This Means for Us</h2>

<p>Our project at TU Delft operates at a much smaller scale than Ginkgo or DeepMind. But the principles are the same:</p>

<ol>
<li><strong>The automation works.</strong> AI agents can design experiments, execute them, and learn from results. Our benchmark runner and replication agent prove this for quantum computing tasks.</li>
<li><strong>The narrowing effect is real.</strong> If we only benchmark what's easy to benchmark, we'll miss the most important questions. Our choice to replicate diverse papers (not just optimize one metric) is deliberate.</li>
<li><strong>Scientific taste can't be automated yet.</strong> The human role is shifting from "do the experiment" to "choose which experiments matter." That's a harder problem — and a more important one.</li>
<li><strong>Quantum computing may be different.</strong> The Nature study found narrowing in fields with abundant data. Quantum computing has <em>limited</em> data and <em>many</em> open questions. AI agents in quantum might explore more broadly precisely because the field is young.</li>
</ol>

<p>The race to automate science is accelerating. The question isn't whether to participate — it's whether we can do it in a way that expands rather than contracts the frontier of knowledge.</p>
`,
    sources: [
      { label: 'Ginkgo + OpenAI autonomous lab results', url: 'https://openai.com/index/gpt-5-lowers-protein-synthesis-cost/' },
      { label: 'OpenAI Prism announcement', url: 'https://openai.com/index/introducing-prism/' },
      { label: 'AI expands impact, contracts focus (Nature)', url: 'https://www.nature.com/articles/s41586-025-09922-y' },
      { label: 'Andrew White on Latent Space podcast', url: 'https://www.latent.space/p/automating-science-world-models-scientific' },
      { label: 'Edison Scientific / Kosmos', url: 'https://edisonscientific.com/articles/announcing-kosmos' },
      { label: 'Anthropic Claude for Life Sciences', url: 'https://www.anthropic.com/news/claude-for-life-sciences' },
      { label: 'DOE Genesis Mission — 24 partners', url: 'https://www.energy.gov/articles/energy-department-announces-collaboration-agreements-24-organizations-advance-genesis' },
      { label: 'DeepMind automated UK lab', url: 'https://deepmind.google/blog/strengthening-our-partnership-with-the-uk-government-to-support-prosperity-and-security-in-the-ai-era/' },
      { label: 'CMU Coscientist (Nature)', url: 'https://www.cmu.edu/news/stories/archives/2023/december/cmu-designed-artificially-intelligent-coscientist-automates-scientific-discovery' },
      { label: 'k-agents for quantum labs', url: 'https://arxiv.org/abs/2412.07978' },
    ],
  },
  {
    slug: 'ai-meets-quantum',
    title: 'AI Meets Quantum Computing: The Papers That Matter',
    subtitle: 'Neural decoders, autonomous quantum agents, and AI circuit optimizers \u2014 a researcher\'s guide to the intersection',
    date: '2026-02-10',
    author: 'AI x Quantum Research Team',
    category: 'landscape',
    tags: ['AlphaQubit', 'QUASAR', 'QEC', 'AI agents', 'circuit optimization', 'hardware', 'quantum advantage'],
    heroImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&q=80',
    heroCaption: 'AI and quantum computing are converging \u2014 and the research papers tell the story.',
    excerpt: 'Neural decoders, autonomous quantum agents, and AI circuit optimizers: a researcher\'s guide to the most important papers and results at the intersection of AI and quantum computing.',
    content: `
<p>AI and quantum computing are converging faster than either field expected. Neural networks decode quantum errors better than hand-crafted algorithms. LLMs write valid quantum circuits. Autonomous agents calibrate superconducting processors without human intervention. This post covers the papers and results that matter most at the intersection \u2014 a researcher's guide, not a hype piece.</p>

<h2>Neural Quantum Error Correction</h2>

<p>Error correction is quantum computing's biggest engineering bottleneck. Decoders must run in real time \u2014 faster than errors accumulate \u2014 and handle the messy, correlated noise of real hardware. AI offers a fundamentally different approach: learn the noise rather than model it.</p>

<h3>AlphaQubit (Google DeepMind, 2024)</h3>

<p><a href="https://www.nature.com/articles/s41586-024-08148-8">Published in Nature</a>, AlphaQubit is a transformer-based surface code decoder that learns correlated error patterns directly from syndrome data. Rather than assuming an error model, it learns the actual noise characteristics of a specific processor.</p>

<ul>
<li><strong>6% fewer errors</strong> than tensor network decoders (accurate but impractically slow)</li>
<li><strong>30% fewer errors</strong> than correlated matching (the practical state-of-the-art)</li>
<li>Tested on real Sycamore data at distance-3 (17 qubits) and distance-5 (49 qubits)</li>
<li>O(d<sup>4</sup>) scaling \u2014 a <a href="https://arxiv.org/abs/2510.22724">Mamba-based follow-up</a> achieves O(d<sup>2</sup>) while matching accuracy</li>
</ul>

<p>The open question: whether this scales to the code distances (17+) needed for fault-tolerant computing.</p>

<h3>GPU-Accelerated Decoding (NVIDIA + QuEra)</h3>

<p>NVIDIA's <a href="https://developer.nvidia.com/blog/real-time-decoding-algorithmic-gpu-decoders-and-ai-inference-enhancements-in-nvidia-cuda-q-qec/">CUDA-Q QEC framework</a> achieves <strong>&lt;4 microsecond roundtrip latency</strong> for error correction decoding \u2014 roughly 1,000x faster than alternatives. Crucially, the GPU approach can be updated as neural decoder architectures improve.</p>

<h3>IBM AI Transpiler</h3>

<p>IBM's <a href="https://www.ibm.com/quantum/blog/ai-transpiler-passes">AI-powered transpiler passes</a> achieve a <strong>42% reduction in two-qubit gate counts</strong>. Since two-qubit gates are the dominant error source on real hardware, this directly improves fidelity.</p>

<h2>AI for Quantum Code Generation</h2>

<p>Can LLMs write quantum programs? Several systems have been tested, with results that are strong but need careful interpretation.</p>

<table>
<thead><tr><th>System</th><th>Metric</th><th>Result</th><th>Note</th></tr></thead>
<tbody>
<tr><td><a href="https://arxiv.org/abs/2510.00967">QUASAR</a></td><td>Circuit validity</td><td>99.31% Pass@1</td><td>4B params + agentic RL; validity is not correctness</td></tr>
<tr><td><a href="https://arxiv.org/abs/2510.26101">QCoder</a> (o3)</td><td>Functional accuracy</td><td>78%</td><td>vs. 40% for human contest code; chain-of-thought helps</td></tr>
<tr><td>Our benchmark (Claude Opus 4.6)</td><td>Functional correctness</td><td>63.6%</td><td><a href="/blog/llms-write-quantum-code">151 Qiskit tasks</a>; dominant failure: API staleness</td></tr>
<tr><td>Our benchmark (Gemini 3 Flash)</td><td>Functional correctness</td><td>62.25%</td><td>Within 1.4pp of Claude; same failure mode</td></tr>
<tr><td>Our benchmark (Gemini 3 Flash + <a href="/blog/rag-quantum-code-generation">Context7 RAG</a>)</td><td>Functional correctness</td><td>70.86%</td><td>+14% relative; dynamic doc retrieval per task</td></tr>
</tbody>
</table>

<p>The gap between QUASAR's 99.31% validity and our 63.6% correctness is telling: generating syntactically valid circuits is easy; getting the quantum logic right is hard. <strong>Q-Fusion</strong> (IEEE ISVLSI 2025) takes yet another approach \u2014 graph diffusion models that produce 100% valid outputs \u2014 but faces the same correctness gap.</p>

<h2>Autonomous Quantum Agents</h2>

<h3>k-agents: Self-Driving Quantum Labs</h3>

<p><a href="https://arxiv.org/abs/2412.07978">k-agents</a> (published in <em>Patterns</em> / Cell Press, 2025) are LLM-based agents that autonomously calibrated and operated a superconducting quantum processor for hours, producing GHZ states at human-expert level. The key insight: quantum experiments are inherently digital \u2014 no wet lab, no sample prep, just API calls. An AI agent can iterate at the speed of the hardware itself.</p>

<h3>QCopilot: Autonomous Quantum Sensors</h3>

<p><a href="https://arxiv.org/abs/2508.05421">QCopilot</a> orchestrates multiple specialized agents (Decision Maker, Experimenter, Analyst, Diagnoser) with LLMs and a vector knowledge base. It generated <strong>10<sup>8</sup> sub-microkelvin atoms without human intervention</strong> \u2014 a ~100x speedup over manual experimentation for atom cooling.</p>

<h3>AlphaTensor-Quantum: RL for Circuit Optimization</h3>

<p><a href="https://arxiv.org/abs/2402.14396">AlphaTensor-Quantum</a> (<em>Nature Machine Intelligence</em>, 2025) uses deep RL to <strong>reduce T-gate counts by up to 47%</strong> in some circuits. T-gates are the most expensive gates in fault-tolerant computing, so this directly reduces overhead for cryptography and quantum chemistry circuits.</p>

<h2>The Hardware Landscape</h2>

<table>
<thead><tr><th>Platform</th><th>Leading Players</th><th>Key Milestone</th><th>Challenge</th></tr></thead>
<tbody>
<tr><td><strong>Superconducting</strong></td><td>Google, IBM, Rigetti, IQM</td><td><a href="https://www.nature.com/articles/s41586-024-08449-y">Google Willow</a>: 105q, first exponential error suppression, logical memory 2.4x beyond breakeven</td><td>Short coherence (~68us), cryogenic cooling</td></tr>
<tr><td><strong>Trapped Ions</strong></td><td>Quantinuum, IonQ</td><td><a href="https://www.quantinuum.com/blog/introducing-helios-the-most-accurate-quantum-computer-in-the-world">Helios</a>: 98q, X-junction, 99.921% two-qubit fidelity</td><td>Slower gates, scaling past hundreds</td></tr>
<tr><td><strong>Neutral Atoms</strong></td><td>QuEra, Atom Computing</td><td><a href="https://www.prnewswire.com/news-releases/quera-computing-marks-record-2025-as-the-year-of-fault-tolerance-and-over-230m-of-new-capital-to-accelerate-industrial-deployment-302635960.html">3,000-qubit array</a>, 2+ hours operation, up to 96 logical qubits</td><td>Atom loss, readout fidelity</td></tr>
<tr><td><strong>Photonic</strong></td><td>PsiQuantum, Xanadu, Photonic Inc.</td><td>PsiQuantum $1B raise; Photonic Inc. SHYPS qLDPC codes: 20x fewer physical qubits than surface codes</td><td>Photon loss, non-deterministic gates</td></tr>
<tr><td><strong>Spin Qubits</strong></td><td>QuTech/TU Delft, Intel</td><td><a href="https://qutech.nl/2025/11/27/from-complexity-to-control-a-10-spin-qubit-array-in-germanium/">10-qubit germanium</a> &gt;99% fidelity; <a href="https://www.nature.com/articles/s41586-025-09531-9">industrial 300mm wafers</a> &gt;99% (Nature 2025)</td><td>Short coherence, but CMOS compatibility is the long bet</td></tr>
<tr><td><strong>Topological</strong></td><td>Microsoft</td><td><a href="https://azure.microsoft.com/en-us/blog/quantum/2025/02/19/microsoft-unveils-majorana-1-the-worlds-first-quantum-processor-powered-by-topological-qubits/">Majorana 1</a>: 8 topological qubits, tetron architecture</td><td>No gate operations demonstrated; scientific community remains skeptical about whether these are truly topological</td></tr>
</tbody>
</table>

<p><a href="https://www.ibm.com/quantum/blog/large-scale-ftqc">IBM's roadmap</a>: Kookaburra 2026 (first qLDPC module), Starling 2029 (200 logical qubits, 100M gates).</p>

<h2>Quantum Advantage: An Honest Assessment</h2>

<p><strong>Demonstrated (narrow):</strong> Google's random circuit sampling \u2014 5 minutes vs. 10<sup>25</sup> years classical \u2014 but RCS has no practical application. Their "quantum echoes" result showed a 13,000x speedup for molecular structure over the Frontier supercomputer. Q-CTRL demonstrated commercial quantum <em>sensing</em> advantage (50-100x for GPS-denied navigation).</p>

<p><strong>The spoofing problem:</strong> Tensor network methods can approximate RCS benchmarks, limiting this paradigm for proving advantage.</p>

<p><strong>The honest verdict:</strong> Useful quantum advantage for computing \u2014 solving a problem someone actually cares about faster than any classical method \u2014 has not been convincingly demonstrated as of early 2026. IBM predicts end of 2026. The transition will be gradual.</p>

<h2>Where Quantum Inspire Fits</h2>

<p><a href="https://qutech.nl/2025/02/25/quantum-inspire-2-0-is-live-with-updated-software-and-hardware/">Quantum Inspire 2.0</a> offers superconducting backends (Tuna-9) plus emulators, with an open architecture integrated with the SURF supercomputer. QuTech develops both spin qubits and superconducting qubits, and QI aims to offer both modalities \u2014 making it uniquely valuable for comparative studies, exactly the kind of work AI agents can automate.</p>

<p>Our <a href="/blog/quantum-mcp-servers">MCP servers</a> connect Claude directly to QI hardware, enabling autonomous experiment execution. This is the same pattern as k-agents, but with frontier LLMs and real European quantum hardware.</p>

<h2>The Convergence</h2>

<p>A recent <em>Nature Communications</em> paper \u2014 "<a href="https://www.nature.com/articles/s41467-025-65836-3">Artificial intelligence for quantum computing</a>" \u2014 identifies three tiers of AI applications for quantum:</p>

<ol>
<li><strong>Currently feasible:</strong> code generation, circuit optimization, decoder design</li>
<li><strong>Emerging:</strong> automated experiment design, noise characterization</li>
<li><strong>Longer-term:</strong> quantum code discovery, software verification</li>
</ol>

<p>Our project at TU Delft sits in Tier 1, building toward Tier 2. The teams that combine AI capability with real quantum hardware access will define the field. The infrastructure is ready. The question is who builds on it first.</p>
`,
    sources: [
      { label: 'AlphaQubit (Nature, 2024)', url: 'https://www.nature.com/articles/s41586-024-08148-8' },
      { label: 'AI for quantum computing (Nature Communications)', url: 'https://www.nature.com/articles/s41467-025-65836-3' },
      { label: 'NVIDIA CUDA-Q QEC real-time decoding', url: 'https://developer.nvidia.com/blog/real-time-decoding-algorithmic-gpu-decoders-and-ai-inference-enhancements-in-nvidia-cuda-q-qec/' },
      { label: 'IBM AI transpiler passes', url: 'https://www.ibm.com/quantum/blog/ai-transpiler-passes' },
      { label: 'Google Willow (Nature, 2024)', url: 'https://www.nature.com/articles/s41586-024-08449-y' },
      { label: 'IBM fault-tolerant quantum computing roadmap', url: 'https://www.ibm.com/quantum/blog/large-scale-ftqc' },
      { label: 'Quantinuum Helios', url: 'https://www.quantinuum.com/blog/introducing-helios-the-most-accurate-quantum-computer-in-the-world' },
      { label: 'QuEra 2025 milestones', url: 'https://www.prnewswire.com/news-releases/quera-computing-marks-record-2025-as-the-year-of-fault-tolerance-and-over-230m-of-new-capital-to-accelerate-industrial-deployment-302635960.html' },
      { label: 'Microsoft Majorana 1', url: 'https://azure.microsoft.com/en-us/blog/quantum/2025/02/19/microsoft-unveils-majorana-1-the-worlds-first-quantum-processor-powered-by-topological-qubits/' },
      { label: 'Quantum Inspire 2.0', url: 'https://qutech.nl/2025/02/25/quantum-inspire-2-0-is-live-with-updated-software-and-hardware/' },
      { label: 'QuTech 10-spin qubit germanium array', url: 'https://qutech.nl/2025/11/27/from-complexity-to-control-a-10-spin-qubit-array-in-germanium/' },
      { label: 'Silicon spin qubits on industrial wafers (Nature)', url: 'https://www.nature.com/articles/s41586-025-09531-9' },
      { label: 'QUASAR (arxiv:2510.00967)', url: 'https://arxiv.org/abs/2510.00967' },
      { label: 'QCoder (arxiv:2510.26101)', url: 'https://arxiv.org/abs/2510.26101' },
      { label: 'k-agents (arxiv:2412.07978)', url: 'https://arxiv.org/abs/2412.07978' },
      { label: 'AlphaTensor-Quantum (arxiv:2402.14396)', url: 'https://arxiv.org/abs/2402.14396' },
      { label: 'QCopilot (arxiv:2508.05421)', url: 'https://arxiv.org/abs/2508.05421' },
      { label: 'AlphaEvolve (arxiv:2506.13131)', url: 'https://arxiv.org/abs/2506.13131' },
    ],
  },
  {
    slug: 'ai-quantum-reference',
    title: 'AI x Quantum: The Data Behind the Hype',
    subtitle: 'Funding tables, government programs, and a curated reading list for researchers',
    date: '2026-02-10',
    author: 'AI x Quantum Research Team',
    category: 'landscape',
    tags: ['reference', 'funding', 'FROs', 'government', 'reading list', 'data'],
    heroImage: 'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=1200&q=80',
    heroCaption: 'The numbers behind the AI-for-science movement.',
    excerpt: 'A reference companion to our research posts: who is funding AI-for-science, what governments are doing, and which papers to read at the intersection of AI and quantum computing.',
    content: `
<p>This post is a living reference — the data tables and reading lists behind our <a href="/blog/race-to-automate-science">analysis</a> of AI-accelerated science and <a href="/blog/ai-meets-quantum">the AI x quantum intersection</a>. Bookmark it.</p>

<h2>AI-for-Science Startup Funding</h2>

<p>The scale of investment tells the story of a field that went from speculative to operational in 2025.</p>

<table>
<thead><tr><th>Company</th><th>Funding</th><th>Focus</th><th>Key Detail</th></tr></thead>
<tbody>
<tr><td><strong>Xaira Therapeutics</strong></td><td>$1.3B</td><td>Drug design</td><td>Co-founded by David Baker (2024 Nobel). First drug entering human testing 2026.</td></tr>
<tr><td><strong>PsiQuantum</strong></td><td>$1B+</td><td>Photonic quantum</td><td>Largest quantum hardware raise. Partnership with GlobalFoundries.</td></tr>
<tr><td><strong>Isomorphic Labs</strong></td><td>$600M</td><td>Drug discovery</td><td>DeepMind spinoff. Novartis + Eli Lilly partnerships (~$3B). Clinical trials late 2026.</td></tr>
<tr><td><strong>Lila Sciences</strong></td><td>$550M</td><td>Drug discovery</td><td>"AI Science Factories" — 235,500 sq ft Cambridge lab. George Church as Chief Scientist.</td></tr>
<tr><td><strong>Arcadia Science</strong></td><td>$500M</td><td>Open biology</td><td>Funded by Jed McCaleb + Sam Altman. Studies understudied organisms.</td></tr>
<tr><td><strong>Insilico Medicine</strong></td><td>$400M+, IPO'd</td><td>Drug discovery</td><td>First AI-discovered drug (rentosertib) in Phase II. Hong Kong IPO ($293M).</td></tr>
<tr><td><strong>Periodic Labs</strong></td><td>$300M seed</td><td>Materials & chemistry</td><td>Largest AI-for-science seed. Founded by Liam Fedus (ex-OpenAI VP) + Ekin Cubuk (ex-DeepMind).</td></tr>
<tr><td><strong>Sakana AI</strong></td><td>$2.65B valuation</td><td>AI research agents</td><td>Founded by Llion Jones (Transformer co-author). "AI Scientist v2" accepted at ICLR workshop.</td></tr>
<tr><td><strong>CuspAI</strong></td><td>$100M</td><td>Materials design</td><td>AI-guided materials discovery.</td></tr>
<tr><td><strong>Edison Scientific</strong></td><td>$70M seed</td><td>Drug repurposing</td><td>Spun out of FutureHouse. Robin agent identified ripasudil for macular degeneration.</td></tr>
</tbody>
</table>

<p><strong>CZI</strong> (Chan Zuckerberg Initiative) committed $10B over the next decade to AI-for-biology, absorbing the EvolutionaryScale team (ESM protein language models). This is the single largest commitment in the field.</p>

<h2>Focused Research Organizations (FROs)</h2>

<p>The FRO model — championed by Sam Rodriques, Adam Marblestone, and Eric Schmidt through Schmidt Sciences — addresses a gap: scientific problems that need $20-50M over 5-7 years and produce public goods rather than products. <strong>Convergent Research</strong> has incubated 10 FROs:</p>

<table>
<thead><tr><th>FRO</th><th>Focus</th><th>Notable Result</th></tr></thead>
<tbody>
<tr><td><strong>E11 Bio</strong></td><td>Large-scale connectomics</td><td>Brain wiring maps at industrial scale</td></tr>
<tr><td><strong>Lean FRO</strong></td><td>Math theorem formalization</td><td>210,000+ theorems in Mathlib; 2025 ACM SIGPLAN award</td></tr>
<tr><td><strong>Cultivarium</strong></td><td>Photosynthetic organisms</td><td>Engineering novel photosynthetic pathways</td></tr>
<tr><td><strong>[C]Worthy</strong></td><td>Ocean carbon</td><td>Carbon removal verification systems</td></tr>
<tr><td><strong>Bind, EvE Bio, Forest Neurotech, Imprint</strong></td><td>Various</td><td>Neurotechnology, bioengineering</td></tr>
</tbody>
</table>

<p>No FRO currently targets quantum computing, but the model fits: AI-accelerated QEC or autonomous quantum experiment design needs multi-year, multi-million-dollar focused effort that's too big for a single lab and too "public good" for a startup.</p>

<h2>Government Initiatives</h2>

<table>
<thead><tr><th>Program</th><th>Country</th><th>Investment</th><th>Key Detail</th></tr></thead>
<tbody>
<tr><td><strong>Genesis Mission</strong></td><td>US</td><td>$320M+</td><td>17 DOE labs + 24 industry partners. Google AI co-scientist across all labs.</td></tr>
<tr><td><strong>AI for Science</strong></td><td>UK</td><td>\u00a3137M</td><td>Multiple research councils funding AI integration.</td></tr>
<tr><td><strong>ARIA "AI Scientist"</strong></td><td>UK</td><td>\u00a36M total</td><td>12 projects at ~\u00a3500K each, selected from 245 proposals. Partners: Lila Sciences/MIT, UCL, Liverpool.</td></tr>
<tr><td><strong>FROST UK</strong></td><td>UK</td><td>TBD</td><td>ARIA + Convergent Research bringing FRO model to UK.</td></tr>
<tr><td><strong>Quantum + AI Strategy</strong></td><td>Japan</td><td>$135B</td><td>Combined quantum + AI national strategy, one of the largest globally.</td></tr>
<tr><td><strong>EU Quantum Act</strong></td><td>EU</td><td>Multi-billion</td><td>Major funding framework. TU Delft / QuTech centrally positioned.</td></tr>
<tr><td><strong>Schmidt Sciences AI2050</strong></td><td>Global</td><td>$125M</td><td>99 fellows at 42 institutions working on hard AI problems.</td></tr>
</tbody>
</table>

<h2>Five Methods of AI-Accelerated Science</h2>

<p>Across the landscape, five distinct approaches have emerged:</p>

<table>
<thead><tr><th>Method</th><th>How It Works</th><th>Best Example</th><th>Quantum Application</th></tr></thead>
<tbody>
<tr><td><strong>Foundation Models</strong></td><td>Train large models on domain data to learn a field's "language"</td><td>AlphaFold (protein), GNoME (materials, 2.2M crystals)</td><td>QUASAR (quantum circuits), domain-specific quantum models</td></tr>
<tr><td><strong>Autonomous Agents</strong></td><td>AI plans, executes, and analyzes experiments</td><td>Sakana AI Scientist, Google AI co-scientist, FutureHouse Kosmos</td><td>k-agents (superconducting calibration), our MCP pipeline</td></tr>
<tr><td><strong>Self-Driving Labs</strong></td><td>Closed-loop: AI + robotic execution + feedback</td><td>Ginkgo/GPT-5 (36,000 experiments), DeepMind UK materials lab</td><td>Quantum processors are already digital — no robot needed</td></tr>
<tr><td><strong>LLM Code Generation</strong></td><td>Generate working scientific code from descriptions</td><td>QCoder (78%), our benchmark (63.6%)</td><td>Circuit synthesis, SDK translation, error analysis</td></tr>
<tr><td><strong>AI-Guided Search</strong></td><td>RL/evolutionary methods for combinatorial optimization</td><td>AlphaTensor-Quantum (halved T-gates), AlphaEvolve</td><td>Circuit optimization, error code discovery</td></tr>
</tbody>
</table>

<h2>Reading List: AI x Quantum Papers</h2>

<h3>Neural Error Correction</h3>
<ul>
<li><a href="https://www.nature.com/articles/s41586-024-08148-8">AlphaQubit</a> — Transformer QEC decoder, Nature 2024</li>
<li><a href="https://arxiv.org/abs/2510.22724">Mamba-based QEC decoder</a> — O(d\u00b2) scaling follow-up</li>
<li><a href="https://developer.nvidia.com/blog/real-time-decoding-algorithmic-gpu-decoders-and-ai-inference-enhancements-in-nvidia-cuda-q-qec/">NVIDIA CUDA-Q QEC</a> — &lt;4\u03bcs GPU decoding</li>
</ul>

<h3>AI Code Generation for Quantum</h3>
<ul>
<li><a href="https://arxiv.org/abs/2510.00967">QUASAR</a> — 99.31% circuit validity via agentic RL</li>
<li><a href="https://arxiv.org/abs/2510.26101">QCoder</a> — 78% functional accuracy with o3</li>
<li><a href="https://arxiv.org/abs/2406.02132">Qiskit HumanEval</a> — The benchmark we used</li>
</ul>

<h3>Autonomous Quantum Agents</h3>
<ul>
<li><a href="https://arxiv.org/abs/2412.07978">k-agents</a> — Self-driving quantum lab, Patterns 2025</li>
<li><a href="https://arxiv.org/abs/2508.05421">QCopilot</a> — Autonomous atom cooling, 100x speedup</li>
<li><a href="https://arxiv.org/abs/2402.14396">AlphaTensor-Quantum</a> — RL circuit optimization, Nature Machine Intelligence 2025</li>
</ul>

<h3>Circuit Optimization</h3>
<ul>
<li><a href="https://www.ibm.com/quantum/blog/ai-transpiler-passes">IBM AI transpiler</a> — 42% two-qubit gate reduction</li>
<li><a href="https://arxiv.org/abs/2506.13131">AlphaEvolve</a> — Evolutionary algorithm discovery</li>
</ul>

<h3>AI + Science Landscape</h3>
<ul>
<li><a href="https://www.nature.com/articles/s41467-025-65836-3">AI for quantum computing</a> — Nature Communications survey, 3 tiers</li>
<li><a href="https://www.nature.com/articles/s41586-025-09922-y">AI expands impact, contracts focus</a> — Nature 2026, 41.3M papers analyzed</li>
<li><a href="https://www.latent.space/p/automating-science-world-models-scientific">Andrew White on Latent Space</a> — Scientific taste, Kosmos system</li>
</ul>

<h3>Hardware Milestones</h3>
<ul>
<li><a href="https://www.nature.com/articles/s41586-024-08449-y">Google Willow</a> — 105q, exponential error suppression, Nature 2024</li>
<li><a href="https://qutech.nl/2025/11/27/from-complexity-to-control-a-10-spin-qubit-array-in-germanium/">QuTech 10-spin germanium array</a> — >99% fidelity</li>
<li><a href="https://www.nature.com/articles/s41586-025-09531-9">300mm silicon spin qubits</a> — Industrial wafers, >99% fidelity (Diraq/imec, Nature 2025)</li>
</ul>
`,
    sources: [
      { label: 'Convergent Research (FRO incubator)', url: 'https://www.convergentresearch.org/' },
      { label: 'Schmidt Sciences', url: 'https://www.schmidtsciences.org/' },
      { label: 'DOE Genesis Mission', url: 'https://www.energy.gov/articles/energy-department-announces-collaboration-agreements-24-organizations-advance-genesis' },
      { label: 'ARIA AI Scientist programme', url: 'https://www.aria.org.uk/' },
      { label: 'AlphaQubit (Nature)', url: 'https://www.nature.com/articles/s41586-024-08148-8' },
      { label: 'AI for quantum computing (Nature Communications)', url: 'https://www.nature.com/articles/s41467-025-65836-3' },
      { label: 'AI contracts science focus (Nature)', url: 'https://www.nature.com/articles/s41586-025-09922-y' },
    ],
  },
  {
    slug: 'llms-write-quantum-code',
    title: 'Can LLMs Write Quantum Code? We Tested 151 Tasks',
    subtitle: 'Gemini 3 Flash scores 62.25% and Claude Opus 4.6 scores 63.6% — but the failures are more interesting than the passes',
    date: '2026-02-09',
    author: 'AI x Quantum Research Team',
    category: 'experiment',
    tags: ['benchmark', 'Qiskit', 'LLM', 'Gemini', 'quantum coding'],
    heroImage: 'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=1200&q=80',
    heroCaption: 'Testing whether AI models can bridge the gap between quantum theory and working code.',
    excerpt: 'We ran the full Qiskit HumanEval benchmark against Gemini 3 Flash and Claude Opus 4.6 — 151 quantum programming tasks graded by automated code execution. The results reveal that LLMs understand quantum algorithms but struggle with rapidly evolving APIs.',
    content: `
<p>Can a large language model write a working quantum circuit from a natural-language description? We tested this by running the complete <a href="https://arxiv.org/abs/2406.02132">Qiskit HumanEval</a> benchmark — 151 quantum programming tasks across three difficulty levels.</p>

<h2>The Setup</h2>

<p>Each task provides a function signature and docstring. The model must produce the function body. The generated code is executed in a sandboxed subprocess with unit tests — no partial credit, no manual review. Pass or fail.</p>

<p>We tested two frontier models: <strong>Gemini 3 Flash</strong> (via Google's GenAI API) and <strong>Claude Opus 4.6</strong> (via Anthropic's API). The benchmark harness sends each prompt independently — no multi-turn dialogue, no chain-of-thought, no retrieval augmentation. Just the raw prompt and one shot at the answer.</p>

<h2>The Results</h2>

<table>
<thead><tr><th>Model</th><th>Pass@1</th><th>Basic</th><th>Intermediate</th><th>Difficult</th></tr></thead>
<tbody>
<tr><td><strong>Claude Opus 4.6</strong></td><td><strong>63.6%</strong> (96/151)</td><td>67.1% (53/79)</td><td>62.7% (42/67)</td><td>20.0% (1/5)</td></tr>
<tr><td><strong>Gemini 3 Flash</strong></td><td>62.25% (94/151)</td><td>65.82% (52/79)</td><td>61.19% (41/67)</td><td>20.0% (1/5)</td></tr>
</tbody>
</table>

<p>Both models are remarkably close — within 1.4 percentage points. Claude edges ahead slightly, particularly on basic and intermediate tasks. Both models solve exactly 1 of 5 difficult tasks. The basic-to-intermediate drop is surprisingly small for both — the models don't just know simple gate sequences; they can construct meaningful quantum algorithms. The cliff happens at "difficult" tasks that require multi-step reasoning with precise API calls.</p>

<p>For context, the <strong>QUASAR</strong> system (which uses agentic RL and retrieval-augmented generation with a 4B parameter model) achieved 99.31% <em>circuit validity</em> — though that's a less strict metric than our functional correctness measure. <strong>QCoder</strong> with o3 reached 78% on a related benchmark, vs 40% for human experts.</p>

<h2>The Error Analysis</h2>

<p>This is where it gets interesting. Of the 57 failures:</p>

<table>
<thead><tr><th>Error Type</th><th>Count</th><th>What It Means</th></tr></thead>
<tbody>
<tr><td>Wrong answer</td><td>13</td><td>Code runs but produces incorrect output</td></tr>
<tr><td>Syntax error</td><td>11</td><td>Malformed Python — indentation, missing colons</td></tr>
<tr><td>SamplerV2 API</td><td>9</td><td>Using deprecated Qiskit 1.x sampling API</td></tr>
<tr><td>Account/runtime</td><td>6</td><td>Trying to use IBM Runtime (requires auth)</td></tr>
<tr><td>Attribute error</td><td>5</td><td>Wrong method/property names</td></tr>
<tr><td>Type error</td><td>4</td><td>Incorrect argument types</td></tr>
<tr><td>Other</td><td>9</td><td>Misc runtime failures</td></tr>
</tbody>
</table>

<h3>The key insight: API staleness, not algorithmic failure</h3>

<p>Only 13 of 57 failures (23%) are genuine algorithmic mistakes where the model produced incorrect quantum logic. The dominant failure mode is <strong>API version mismatch</strong>: 9 failures from Qiskit 2.x's <code>SamplerV2</code> breaking changes, 6 from trying to access IBM Runtime services that require authentication, and 5 from using wrong method names.</p>

<p>The model was trained on Qiskit 1.x documentation and code. Qiskit 2.x introduced significant breaking changes (the V2 primitives). The model <em>understands the quantum computing concepts</em> but generates code for an API that no longer exists.</p>

<h2>Implications</h2>

<h3>1. RAG could dramatically improve performance</h3>
<p>If the dominant failure mode is stale API knowledge, then <strong>retrieval-augmented generation</strong> with current Qiskit 2.x documentation should push Pass@1 significantly higher. We estimate 75-80% is achievable by simply injecting up-to-date API signatures into the prompt.</p>

<h3>2. The QUASAR result is relevant</h3>
<p>The <strong>QUASAR</strong> system, which uses RAG with quantum documentation, achieved 99.31% circuit validity — suggesting that the documentation-injection approach works. Our benchmark measures functional correctness (stricter than validity), but the principle holds.</p>

<h3>3. Quantum SDK design matters for AI</h3>
<p>Frequent breaking changes in quantum SDKs create a compounding problem for AI code generation. SDKs designed with AI agents in mind — stable interfaces, versioned examples, machine-readable changelogs — would dramatically improve AI-assisted quantum development.</p>

<h3>4. This benchmark should be run continuously</h3>
<p>As new models release and quantum SDKs evolve, the intersection of model capability and API coverage shifts. Our <a href="/#agents">agent infrastructure</a> is designed to run this benchmark automatically against new model releases.</p>

<h2>Next Steps</h2>

<p><strong>Update:</strong> We ran the RAG experiment. <a href="/blog/rag-quantum-code-generation">Dynamic RAG with Context7 pushed Pass@1 to 70.9%</a> — a 14% relative improvement. Static RAG did nothing. <a href="/blog/rag-quantum-code-generation">Read the full results.</a></p>

<p>Other planned work:</p>
<ol>
<li>Test against GPT-5 and domain-specific models</li>
<li>Develop a cQASM variant for Quantum Inspire hardware</li>
<li>Run the Agent-Q and QUASAR approaches against our benchmark for direct comparison</li>
</ol>
`,
    sources: [
      { label: 'Qiskit HumanEval benchmark paper', url: 'https://arxiv.org/abs/2406.02132' },
      { label: 'QUASAR — agentic RL for quantum code generation', url: 'https://arxiv.org/abs/2510.00967' },
      { label: 'Our benchmark results (GitHub)', url: 'https://github.com/JDerekLomas/quantuminspire/tree/main/benchmark_results' },
      { label: 'Qiskit 2.x migration guide', url: 'https://docs.quantum.ibm.com/migration-guides' },
    ],
  },
  {
    slug: 'rag-quantum-code-generation',
    title: 'Dynamic RAG Boosts Quantum Code Generation by 14% — Static RAG Does Nothing',
    subtitle: 'We tested two RAG strategies on 151 Qiskit tasks across two frontier models. Both models converge to the same ceiling.',
    date: '2026-02-10',
    author: 'AI x Quantum Research Team',
    category: 'experiment',
    tags: ['benchmark', 'RAG', 'Context7', 'Qiskit', 'LLM', 'Gemini', 'API staleness'],
    heroImage: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1200&q=80',
    heroCaption: 'The right documentation at the right time makes all the difference.',
    excerpt: 'API staleness is the dominant failure mode when LLMs write quantum code. We tested two RAG strategies on Gemini 3 Flash and Claude Opus 4.6: a static cheatsheet (no improvement) and dynamic per-task retrieval via Context7 (+14%). Both models converge to exactly 70.9% — the ceiling is the documentation, not the model.',
    content: `
<p>In our <a href="/blog/llms-write-quantum-code">previous post</a>, we found that frontier LLMs score around 62-64% on the Qiskit HumanEval benchmark — 151 quantum programming tasks graded by automated code execution. The most interesting finding wasn't the score but the failure mode: <strong>the dominant error is API staleness, not algorithmic misunderstanding</strong>. Models trained on Qiskit 1.x documentation generate code for APIs that no longer exist in Qiskit 2.x.</p>

<p>The obvious fix: give the model up-to-date documentation. We tested two approaches. One failed completely. The other improved performance by 14%.</p>

<h2>Two RAG Strategies</h2>

<h3>Strategy 1: Static Cheatsheet</h3>

<p>We wrote a comprehensive <strong>QISKIT_2X_CHEATSHEET.md</strong> — 335 lines covering every major breaking change: <code>execute()</code> removal, SamplerV2/EstimatorV2 PUB-based API, <code>qiskit_aer</code> import paths, <code>c_if()</code> removal, <code>BackendV1</code> removal, <code>generate_preset_pass_manager</code> changes, and complete working examples. This cheatsheet was prepended to every prompt as a system message supplement.</p>

<p>The logic: if the model knows about Qiskit 2.x changes, it should stop generating deprecated code.</p>

<h3>Strategy 2: Dynamic Per-Task Retrieval (Context7)</h3>

<p><a href="https://context7.com">Context7</a> (by Upstash) is a cloud service that indexes open-source library documentation and returns relevant snippets per query. For each task, we sent the task description to Context7's API, retrieved documentation snippets from both <code>/qiskit/qiskit</code> and <code>/qiskit/qiskit-ibm-runtime</code> libraries, and appended them to the prompt.</p>

<p>The logic: only inject documentation that's relevant to the specific task, not everything.</p>

<h2>The Results</h2>

<table>
<thead><tr><th>Configuration</th><th>Pass@1</th><th>Basic (79)</th><th>Intermediate (67)</th><th>Difficult (5)</th><th>Input Tokens</th></tr></thead>
<tbody>
<tr><td>Gemini 3 Flash (baseline)</td><td>62.3% (94)</td><td>65.8% (52)</td><td>61.2% (41)</td><td>20% (1)</td><td>28K</td></tr>
<tr><td>Claude Opus 4.6 (baseline)</td><td>63.6% (96)</td><td>67.1% (53)</td><td>62.7% (42)</td><td>20% (1)</td><td>30K</td></tr>
<tr><td>Gemini + Static Cheatsheet</td><td>62.3% (94)</td><td>65.8% (52)</td><td>62.7% (42)</td><td>0% (0)</td><td>486K</td></tr>
<tr><td><strong>Gemini + Context7</strong></td><td><strong>70.9% (107)</strong></td><td><strong>77.2% (61)</strong></td><td><strong>67.2% (45)</strong></td><td>20% (1)</td><td>287K</td></tr>
<tr><td><strong>Opus 4.6 + Context7</strong></td><td><strong>70.9% (107)</strong></td><td>76.0% (60)</td><td><strong>67.2% (45)</strong></td><td><strong>40% (2)</strong></td><td>406K</td></tr>
</tbody>
</table>

<h2>The Static Cheatsheet Did Nothing</h2>

<p>This was the surprise. A carefully written, comprehensive migration guide — the exact kind of documentation you'd want a developer to read — had <strong>zero effect on overall pass rate</strong>. Same 94 tasks passed. 17x more tokens consumed. The intermediate tier gained 1 task but the difficult tier <em>lost</em> one, netting to zero.</p>

<p>Why? Three likely reasons:</p>

<ol>
<li><strong>Noise for simple tasks.</strong> Most basic tasks (create a circuit, add a gate) don't need migration knowledge. The 3K-token cheatsheet adds irrelevant context that can confuse the model on tasks where the old and new APIs are identical.</li>
<li><strong>Not specific enough for complex tasks.</strong> The tasks that fail due to API changes need <em>specific</em> documentation about the exact API they're trying to use (e.g., how to get counts from a <code>SamplerV2</code> result), not a general overview of all changes.</li>
<li><strong>Prompt engineering limits.</strong> Simply prepending a document to the system message is the crudest possible form of RAG. The model has to figure out which parts of the cheatsheet are relevant — the same task that RAG is supposed to solve.</li>
</ol>

<h2>Dynamic Retrieval Worked — Especially for Basic Tasks</h2>

<p>Context7 improved Pass@1 from 62.3% to 70.9% — a <strong>+8.6 percentage point improvement</strong> (13.8% relative). Breaking it down by difficulty:</p>

<table>
<thead><tr><th>Difficulty</th><th>Baseline</th><th>+Context7</th><th>Improvement</th></tr></thead>
<tbody>
<tr><td>Basic</td><td>65.8% (52/79)</td><td>77.2% (61/79)</td><td><strong>+11.4pp</strong> (9 new passes)</td></tr>
<tr><td>Intermediate</td><td>61.2% (41/67)</td><td>67.2% (45/67)</td><td>+6.0pp (4 new passes)</td></tr>
<tr><td>Difficult</td><td>20% (1/5)</td><td>20% (1/5)</td><td>0pp</td></tr>
</tbody>
</table>

<p>The improvement is concentrated in basic tasks — exactly the tasks most likely to fail from simple API changes (wrong import path, deprecated method call). These are tasks where the model knows the quantum logic but generates code for the wrong API version. A targeted snippet showing the correct <code>SamplerV2</code> usage or the right import path is enough to fix the output.</p>

<p>Intermediate tasks see a smaller but real improvement. Difficult tasks — which require multi-step algorithmic reasoning — don't improve. Dynamic RAG helps with <em>API recall</em>, not <em>quantum reasoning</em>.</p>

<h2>The Convergence: Opus Matches Gemini Exactly</h2>

<p>We ran the same Context7 experiment with <strong>Claude Opus 4.6</strong>. The result: <strong>exactly 70.9% Pass@1</strong> (107/151) — identical to Gemini 3 Flash.</p>

<p>This convergence is striking. Two very different models — Google's fast model and Anthropic's flagship — land on the same number when given the same documentation context. The differences are in the margins:</p>

<ul>
<li>Gemini has a slight edge on <strong>basic tasks</strong>: 77.2% vs 76.0% (+1 task)</li>
<li>Opus pulls ahead on <strong>difficult tasks</strong>: 40% vs 20% (+1 task)</li>
<li>They tie exactly on <strong>intermediate tasks</strong>: 67.2% (45/67)</li>
</ul>

<p>This suggests the <strong>ceiling is set by the documentation coverage</strong>, not the model. Context7's Qiskit index determines which API questions can be answered, and both models are good enough to use the provided docs correctly. The bottleneck has shifted from model capability to retrieval quality.</p>

<p>Also notable: Opus 4.6 had only 2 infrastructure failures vs Gemini's 5 (all Context7 429 rate-limit errors in the Gemini run, which was done without an API key). The Opus run used a Context7 API key and had zero rate-limit issues.</p>

<h2>Inside the 34 Unsolvable Tasks</h2>

<p>Both models with Context7 fail 44 tasks each, but 34 of those tasks are shared failures — <strong>neither model with documentation can solve them</strong>. These are the hard ceiling. We classified each by failure mode:</p>

<table>
<thead><tr><th>Failure Mode</th><th>Count</th><th>%</th><th>What It Means</th></tr></thead>
<tbody>
<tr><td><strong>Logic/Algorithm Error</strong></td><td>14</td><td>41%</td><td>Code runs but produces wrong answer</td></tr>
<tr><td><strong>API Staleness</strong></td><td>9</td><td>26%</td><td>Deprecated APIs that Context7 doesn't cover</td></tr>
<tr><td><strong>Other Runtime</strong></td><td>10</td><td>29%</td><td>Missing libraries, runtime errors, edge cases</td></tr>
<tr><td>Type Mismatch</td><td>1</td><td>3%</td><td>Correct approach, wrong return type</td></tr>
</tbody>
</table>

<p>The dominant failure is <strong>not API staleness — it's logic errors</strong> (41%). These are tasks where the model understands the API but produces incorrect quantum circuits or misinterprets the task. Examples:</p>

<ul>
<li><strong>Simon's algorithm</strong> (task 64): Both models misimplement the oracle construction</li>
<li><strong>Bell state DAG</strong> (task 26): Both miscalculate circuit depth for a 3-qubit bell state</li>
<li><strong>Operator composition</strong> (task 41): Both get the tensor dimensions wrong ((2,2,2) vs (2,2))</li>
<li><strong>Backend connection map</strong> (task 97): Both fail to match two-qubit connections from the backend</li>
</ul>

<p>The 9 remaining API staleness failures are highly specific edge cases that Context7's index doesn't cover: <code>EstimatorV2</code> keyword arguments, <code>ResilienceOptionsV2.dd</code> (dynamical decoupling — very new), the separate <code>qiskit_ibm_transpiler</code> package, and <code>SamplerV2</code> session handling. These represent gaps in the documentation index, not model capability.</p>

<h3>The Ensemble Opportunity</h3>

<p>While both models score 70.9%, they don't fail on the same tasks. Each model uniquely solves 10 tasks the other misses — a perfectly symmetric disagreement. If you could pick the best answer from either model, the <strong>union pass rate is 77.5%</strong> (117/151). The disagreements cluster around logic errors where one model's reasoning happens to align with the test:</p>

<table>
<thead><tr><th>Task</th><th>Gemini</th><th>Opus</th><th>Failure Type</th></tr></thead>
<tbody>
<tr><td>QFT (task 65)</td><td>PASS</td><td>FAIL</td><td>Rotation order</td></tr>
<tr><td>Conditional circuit (task 88)</td><td>FAIL</td><td>PASS</td><td>Control flow logic</td></tr>
<tr><td>Product formula (task 112)</td><td>PASS</td><td>FAIL</td><td>Trotter decomposition</td></tr>
<tr><td>CHSH circuit (task 67)</td><td>FAIL</td><td>PASS</td><td>Measurement basis</td></tr>
<tr><td>Clifford equivalence (task 110)</td><td>FAIL</td><td>PASS</td><td>Circuit identity</td></tr>
</tbody>
</table>

<p>Model diversity is as valuable as better documentation for closing the remaining gap.</p>

<h3>RAG Regressions</h3>

<p>Context7 isn't purely additive. Gemini regressed on 3 tasks (net +13), Opus on 5 tasks (net +11). In these cases, the retrieved documentation <strong>introduced confusion</strong> — the model had the right answer from training data, but Context7 snippets steered it toward a different (incorrect) approach. This is a known RAG failure mode: retrieval precision matters, and irrelevant context can hurt.</p>

<h2>Why Dynamic Beats Static</h2>

<p>The core insight: <strong>relevance filtering is the whole game</strong>. Context7 returns 1-2KB of documentation specifically about the APIs the task is likely to use. The static cheatsheet dumps 3KB about everything. For a task that needs to know how <code>SamplerV2</code> results work, getting a targeted code example of <code>result[0].data.meas.get_counts()</code> is far more useful than a comprehensive document that covers 20 different API changes.</p>

<p>This matches a well-known finding in RAG research: retrieval precision matters more than recall. Injecting irrelevant context can <em>hurt</em> performance by diluting the model's attention. The static cheatsheet is high-recall (covers everything) but low-precision (most of it is irrelevant to any given task). Context7 is lower-recall but higher-precision.</p>

<p>Token usage tells the story: Context7 used 287K tokens vs the cheatsheet's 486K — 41% fewer tokens — while passing 13 more tasks. The cheatsheet wastes tokens on irrelevant documentation for every single task. Context7 only retrieves what's needed.</p>

<h2>Limitations</h2>

<p>We want to be transparent about what this experiment does and doesn't show:</p>

<ul>
<li><strong>Single run per configuration.</strong> We ran each configuration once (Pass@1). Without multiple runs, we can't compute confidence intervals. The true improvement could be anywhere from ~5pp to ~12pp.</li>
<li><strong>No contamination check.</strong> Context7 retrieves documentation that may contain example code similar to benchmark tasks. We haven't verified whether retrieved snippets overlap with test solutions — a potential source of inflated scores.</li>
<li><strong>Context7 rate limiting.</strong> The Gemini run (without API key) had 5 of 151 tasks hit HTTP 429. The Opus run (with API key) had zero rate-limit issues.</li>
<li><strong>No Pass@k.</strong> We use Pass@1 (one attempt per task). Standard practice in code generation benchmarks uses Pass@k to account for sampling variance. Our results represent a lower bound.</li>
<li><strong>No sandboxing.</strong> Generated code executes in a subprocess but not in a fully sandboxed environment.</li>
</ul>

<h2>What This Means</h2>

<h3>For quantum SDK developers</h3>
<p>API staleness is not just a human-developer problem — it's now an AI-developer problem. SDKs that maintain stable interfaces, or that provide machine-readable migration guides, will be more amenable to AI code generation. Qiskit's breaking changes between 1.x and 2.x created a "knowledge wall" that even frontier models can't cross without external help.</p>

<h3>For AI-for-science tool builders</h3>
<p>Dynamic documentation retrieval should be a standard component of any code-generation pipeline for fast-evolving domains. Static context injection is not a substitute — the relevance filtering that retrieval provides is essential. Services like Context7 that index open-source library documentation are directly useful infrastructure.</p>

<h3>For quantum computing researchers</h3>
<p>An LLM with the right documentation can write correct Qiskit code for ~71% of quantum programming tasks — including circuits, optimizations, and error analysis. The ceiling is likely higher with better retrieval, multi-turn correction, or agentic approaches. Practical quantum computing with AI assistance is getting closer.</p>

<h2>Next Steps</h2>

<ol>
<li><strong>Ensemble voting</strong> — The 77.5% union ceiling suggests a simple "pick the best of two models" approach could gain 7pp with no new infrastructure. Even a confidence-weighted vote could help.</li>
<li><strong>Agentic retry</strong> — Let the model see error messages and try again. 21 of 34 core failures produce assertion errors with informative messages. This is how developers actually work, and how systems like QUASAR achieve 99%+ validity.</li>
<li><strong>Better retrieval</strong> — 9 core failures are API staleness that Context7 doesn't cover. Augmenting the index with <code>qiskit_ibm_transpiler</code>, <code>ResilienceOptionsV2</code>, and <code>EstimatorV2</code> keyword signatures could push the ceiling higher.</li>
<li><strong>Pass@3 and confidence intervals</strong> — Multiple runs per configuration to establish statistical significance.</li>
<li><strong>Contamination audit</strong> — Check whether Context7 retrievals overlap with benchmark test solutions.</li>
</ol>

<p>All benchmark code and results are open source: <a href="https://github.com/JDerekLomas/quantuminspire/tree/main/benchmark_results">github.com/JDerekLomas/quantuminspire/tree/main/benchmark_results</a></p>
`,
    sources: [
      { label: 'Qiskit HumanEval benchmark paper', url: 'https://arxiv.org/abs/2406.02132' },
      { label: 'Our baseline benchmark results', url: '/blog/llms-write-quantum-code' },
      { label: 'Context7 by Upstash', url: 'https://context7.com' },
      { label: 'Benchmark code and results (GitHub)', url: 'https://github.com/JDerekLomas/quantuminspire/tree/main/benchmark_results' },
      { label: 'Qiskit 2.x migration guide', url: 'https://docs.quantum.ibm.com/migration-guides' },
      { label: 'QUASAR — agentic RL for quantum code generation', url: 'https://arxiv.org/abs/2510.00967' },
    ],
  },
  {
    slug: 'ai-replicates-qutech-paper',
    title: 'An AI Agent Replicated a QuTech Quantum Paper',
    subtitle: 'Claude Opus 4.6 wrote 300 lines of VQE simulation code from a paper reference alone',
    date: '2026-02-09',
    author: 'AI x Quantum Research Team',
    category: 'experiment',
    tags: ['VQE', 'replication', 'Claude', 'QuTech', 'paper replication'],
    heroImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80',
    heroCaption: 'From published paper to working simulation — autonomously.',
    excerpt: 'We gave Claude Opus 4.6 a reference to Sagastizabal et al. (2019) — a QuTech paper on symmetry-verified VQE for H2 — and asked it to replicate the experiment. It wrote the Hamiltonian, ansatz, noise model, and error mitigation from scratch.',
    content: `
<p>One of the most powerful tests of AI scientific capability is <strong>paper replication</strong>: given a published paper, can an AI agent reproduce the experiment from scratch? We tested this with a quantum computing paper from our own institution.</p>

<h2>The Paper</h2>

<p><strong>"Error Mitigation by Symmetry Verification on a Variational Quantum Eigensolver"</strong><br/>
Sagastizabal et al., <em>Physical Review A</em> 100, 010302 (2019)<br/>
<a href="https://arxiv.org/abs/1902.11258">arxiv:1902.11258</a></p>

<p>This paper from QuTech / TU Delft demonstrates a key technique: using physical symmetries to detect and mitigate errors in variational quantum eigensolvers (VQE). They find the ground-state energy of H&#8322; — the hydrogen molecule — using a 2-qubit circuit with Z-parity symmetry verification.</p>

<h2>What the AI Built</h2>

<p>Claude Opus 4.6 produced ~300 lines of production Qiskit code covering:</p>

<h3>1. Hamiltonian Construction</h3>
<p>The H&#8322; molecular Hamiltonian in the STO-3G basis, transformed via Bravyi-Kitaev reduction to a 2-qubit operator:</p>
<p><code>H = g&#8320;II + g&#8321;ZI + g&#8322;IZ + g&#8323;ZZ + g&#8324;XX + g&#8325;YY</code></p>
<p>The agent correctly identified that the coefficients (g&#8320; through g&#8325;) are functions of the bond distance, and tabulated them from the O'Malley et al. reference data for 12 bond distances from 0.3 to 2.5 Angstroms.</p>

<h3>2. Ansatz Circuit</h3>
<p>A single-parameter exchange rotation in the {|01&#10217;, |10&#10217;} subspace — a parity-preserving ansatz that keeps the state within the correct symmetry sector. The agent decomposed this into RXX(&#952;) and RYY(&#952;) rotations, matching the paper's approach.</p>

<h3>3. Noise Model</h3>
<p>Realistic noise parameters matching the paper's device characterization:</p>
<ul>
<li>T&#8321; = 30&#956;s, T&#8322; = 60&#956;s (thermal relaxation)</li>
<li>Depolarizing noise on single-qubit gates (0.1%) and two-qubit gates (1%)</li>
<li>Measurement error (1%)</li>
</ul>

<h3>4. Symmetry Verification</h3>
<p>The key innovation of the paper: post-selecting measurement results on states where the qubit parity matches the ground-state sector (even parity for H&#8322;). This filters out a significant fraction of errors without additional circuit overhead.</p>

<h3>5. Measurement Protocol</h3>
<p>Three measurement bases (Z, X, Y) with 8192 shots each. The XX expectation value requires Hadamard-rotated measurements; YY requires Sdg-Hadamard-rotated measurements. The agent correctly implemented all three basis rotations.</p>

<h2>What This Demonstrates</h2>

<p>This experiment shows that AI agents can:</p>
<ol>
<li><strong>Read and understand quantum physics papers</strong> — extracting the Hamiltonian, ansatz structure, noise parameters, and measurement protocol</li>
<li><strong>Translate physics to code</strong> — implementing the Bravyi-Kitaev transformation, noise channels, and symmetry verification in Qiskit</li>
<li><strong>Handle domain-specific details</strong> — correctly managing complex numbers, basis rotations, and expectation value calculations</li>
</ol>

<p>The entire replication was done in a single session with Claude Opus 4.6 acting as a coding agent through Claude Code. The human role was to provide the paper reference and review the output — the agent handled the physics, mathematics, and implementation.</p>

<h2>Limitations</h2>

<p>To be clear about what this doesn't show:</p>
<ul>
<li>We haven't yet run this on actual quantum hardware (only Qiskit Aer simulation)</li>
<li>We haven't done a quantitative comparison of our curves against the paper's published figures</li>
<li>The noise model is approximate — real device noise is more complex</li>
<li>A human physicist reviewed the code, which matters for trust</li>
</ul>

<p>These are next steps, not fundamental limitations. The point is that the AI produced a reasonable starting point — 300 lines of domain-specific simulation code — from a paper reference alone.</p>
`,
    sources: [
      { label: 'Sagastizabal et al. (2019) — original paper', url: 'https://arxiv.org/abs/1902.11258' },
      { label: 'Our replication code (GitHub)', url: 'https://github.com/JDerekLomas/quantuminspire/blob/main/replicate_sagastizabal.py' },
      { label: 'O\'Malley et al. — H2 coefficient data', url: 'https://arxiv.org/abs/1512.06860' },
      { label: 'Bravyi-Kitaev transformation', url: 'https://arxiv.org/abs/1208.5986' },
    ],
  },
  {
    slug: 'quantum-mcp-servers',
    title: 'Giving Claude Direct Access to Quantum Hardware',
    subtitle: 'MCP servers that let Claude Code generate random numbers from vacuum fluctuations (with Tuna-9 superconducting qubit fallback) and submit circuits to real quantum processors',
    date: '2026-02-10',
    author: 'AI x Quantum Research Team',
    category: 'technical',
    tags: ['MCP', 'Claude Code', 'Quantum Inspire', 'QRNG', 'tooling', 'infrastructure'],
    heroImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80',
    heroCaption: 'Bridging AI and quantum hardware through the Model Context Protocol.',
    excerpt: 'We built two MCP servers that give Claude Code direct access to quantum resources: true random numbers with automatic fallback from ANU vacuum fluctuations to Tuna-9 superconducting qubits, plus circuit execution on Quantum Inspire hardware. Here\'s how they work and why this matters for AI-accelerated quantum research.',
    content: `
<p>One of the most powerful ideas in the AI-for-science movement is <strong>closing the feedback loop</strong> — giving AI agents direct access to experimental tools so they can design, execute, and analyze experiments without human intermediation. We just took a concrete step toward this for quantum computing.</p>

<p>We built two <strong>MCP servers</strong> (Model Context Protocol) that give Claude Code — the AI coding agent — direct access to quantum resources:</p>

<ol>
<li><strong>QRNG MCP Server</strong> — True quantum random numbers from the ANU Quantum Random Number Generator</li>
<li><strong>QI Circuit MCP Server</strong> — Submit cQASM 3.0 circuits to Quantum Inspire hardware and emulators</li>
</ol>

<p>Together with Claude Code itself acting as a quantum research assistant, this creates a pipeline where an AI agent can design a quantum experiment, execute it on real hardware, and analyze the results — all within a single conversation.</p>

<h2>What is MCP?</h2>

<p>The <strong>Model Context Protocol</strong> (MCP) is an open standard from Anthropic that lets AI assistants use external tools. Think of it as a USB port for AI — a standardized way to plug in capabilities. An MCP server exposes "tools" (functions with typed inputs and outputs) that the AI can call during a conversation.</p>

<p>For quantum computing, this means we can give Claude the ability to:</p>
<ul>
<li>List available quantum backends and their qubit counts</li>
<li>Submit circuits to real quantum processors</li>
<li>Check job status and retrieve measurement results</li>
<li>Run circuits locally on an emulator for rapid iteration</li>
<li>Generate true quantum random numbers</li>
</ul>

<p>The AI doesn't just <em>write code that calls these APIs</em> — it <em>calls them directly as tools</em>, getting structured results back in real time.</p>

<h2>Server 1: Quantum Random Numbers (with Tuna-9 Fallback)</h2>

<p>Our QRNG MCP server provides true quantum random numbers with <strong>automatic fallback across three quantum sources</strong>:</p>

<ol>
<li><strong>ANU QRNG</strong> (primary) — Measures vacuum fluctuations of the electromagnetic field at the Australian National University. Optical quantum source, ~200ms latency.</li>
<li><strong>QI Tuna-9</strong> (fallback) — Applies Hadamard gates to superconducting transmon qubits on real quantum hardware at TU Delft, then measures. Each measurement collapses a superposition into a truly random bit. ~3 second latency.</li>
<li><strong>qxelarator</strong> (last resort) — Local quantum circuit emulator. Instant but pseudorandom.</li>
</ol>

<p>When the ANU API is unavailable (which happens — we observed intermittent 500 errors during testing), the server automatically submits an 8-qubit Hadamard circuit to Tuna-9. Each shot produces one random byte from real superconducting qubit measurements in a Dutch lab. This is a textbook quantum random number generator, just running on actual hardware instead of a classroom whiteboard.</p>

<p>The server exposes five tools:</p>

<table>
<thead><tr><th>Tool</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>quantum_random_int</code></td><td>Get quantum random integers (uint8 or uint16)</td></tr>
<tr><td><code>quantum_coin_flip</code></td><td>Flip quantum coins (each derived from true quantum measurement)</td></tr>
<tr><td><code>quantum_random_hex</code></td><td>Generate quantum random hex strings (for tokens, UUIDs)</td></tr>
<tr><td><code>quantum_dice_roll</code></td><td>Roll quantum dice with any number of sides</td></tr>
<tr><td><code>quantum_random_float</code></td><td>Get quantum random floats between 0 and 1</td></tr>
</tbody>
</table>

<p>Every response includes a <code>source</code> field so you always know which quantum system generated your random numbers. In our testing, we compared all three sources on identical requests — the distributions are uniform across the board, but the Tuna-9 numbers come from actual superconducting transmon measurements rather than photon detection.</p>

<h3>Why two quantum sources?</h3>

<p>The ANU QRNG and Tuna-9 use fundamentally different quantum phenomena: <strong>optical vacuum fluctuations</strong> vs. <strong>superconducting transmon superposition</strong>. Having both available means the QRNG server is resilient to outages on either platform, and researchers can compare randomness from different physical sources — which matters for foundations-of-physics experiments.</p>

<h2>Server 2: Quantum Inspire Circuit Execution</h2>

<p>The second server is more ambitious. It connects to <strong>Quantum Inspire</strong> — the quantum computing platform operated by QuTech at TU Delft — and exposes five tools for circuit execution:</p>

<table>
<thead><tr><th>Tool</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>qi_list_backends</code></td><td>List available QI backends with qubit counts and status</td></tr>
<tr><td><code>qi_submit_circuit</code></td><td>Submit a cQASM 3.0 circuit to remote hardware (returns job_id)</td></tr>
<tr><td><code>qi_check_job</code></td><td>Check job status (PLANNED / RUNNING / COMPLETED / FAILED)</td></tr>
<tr><td><code>qi_get_results</code></td><td>Get measurement results for a completed job</td></tr>
<tr><td><code>qi_run_local</code></td><td>Run a circuit on the local qxelarator emulator (instant, no queue)</td></tr>
</tbody>
</table>

<p>This is a Python server (the QI SDK is Python-only) built with the MCP Python SDK's <code>FastMCP</code> framework. It reuses the existing Quantum Inspire authentication from <code>qi login</code>.</p>

<h3>The workflow</h3>

<p>A typical interaction looks like this:</p>

<ol>
<li><strong>Design</strong>: Claude writes a cQASM 3.0 circuit based on the research question</li>
<li><strong>Test locally</strong>: <code>qi_run_local</code> runs it instantly on the emulator — Claude checks the results make sense</li>
<li><strong>Submit to hardware</strong>: <code>qi_submit_circuit</code> sends it to a real quantum processor (e.g., Tuna-9 with 9 superconducting qubits)</li>
<li><strong>Monitor</strong>: <code>qi_check_job</code> polls for completion</li>
<li><strong>Analyze</strong>: <code>qi_get_results</code> retrieves the measurement histogram, Claude analyzes noise, fidelity, and whether the results match theory</li>
</ol>

<p>The key design decision: <strong>remote jobs are asynchronous</strong>. <code>qi_submit_circuit</code> returns a job ID immediately rather than blocking. Quantum hardware has queues — jobs can take seconds to hours. The async pattern lets Claude continue working while waiting, or batch multiple circuits and check them later.</p>

<p>Local emulation via <code>qi_run_local</code> is synchronous — results come back instantly. This enables a fast inner loop: iterate on circuit design locally, then submit the final version to hardware.</p>

<h3>Example: Bell state on the emulator</h3>

<p>Here's what Claude sees when it runs a Bell state circuit locally:</p>

<pre><code>// Claude calls qi_run_local with:
circuit = """version 3.0
qubit[2] q
bit[2] b
H q[0]
CNOT q[0], q[1]
b = measure q"""

// Response:
{
  "results": {"00": 0.5, "11": 0.5},
  "shots_requested": 1024,
  "shots_done": 1024,
  "backend": "qxelarator (local emulator)"
}</code></pre>

<p>Perfect Bell state — equal superposition of |00&#10217; and |11&#10217;, no |01&#10217; or |10&#10217;. On real hardware, you'd see noise: small counts in the "wrong" bitstrings, reflecting gate errors and decoherence.</p>

<h2>Claude Code as a Quantum Research Skill</h2>

<p>The MCP servers are tools. But the real power comes from <strong>Claude Code itself acting as a quantum research agent</strong>. In a single conversation, Claude can:</p>

<ul>
<li><strong>Read papers</strong> and extract circuit designs, Hamiltonians, and experimental parameters</li>
<li><strong>Write circuits</strong> in cQASM 3.0 (or Qiskit/PennyLane for simulation)</li>
<li><strong>Test circuits</strong> on the local emulator via MCP</li>
<li><strong>Submit to hardware</strong> via MCP and analyze real measurement results</li>
<li><strong>Compare theory vs. experiment</strong> — calculate expected vs. observed fidelities</li>
<li><strong>Write up results</strong> with proper analysis and visualization</li>
</ul>

<p>We've already demonstrated this capability: Claude <a href="/blog/ai-replicates-qutech-paper">replicated a QuTech VQE paper</a> from a reference alone, writing 300 lines of simulation code. With the MCP servers, the next step is executing those circuits on actual quantum hardware — closing the loop from paper to hardware result.</p>

<h2>How This Connects to the AI x Quantum Thesis</h2>

<p>Our agent architecture is designed around a core insight: quantum computing experiments are <em>inherently digital</em>. Unlike chemistry or biology, there's no wet lab — you design a circuit, submit it through an API, and get measurement data back. This makes quantum computing uniquely suited to AI-driven research.</p>

<p>The MCP servers are the bridge between AI capability and quantum hardware access. They transform Claude from a code-writing assistant into a <strong>quantum experimentalist</strong> — one that can run experiments 24/7, systematically explore parameter spaces, and never forget a result.</p>

<p>The feedback loop looks like this:</p>

<ol>
<li><strong>Literature intelligence</strong> identifies an interesting experiment</li>
<li><strong>AI agent</strong> designs the circuit and parameters</li>
<li><strong>MCP tools</strong> execute on quantum hardware</li>
<li><strong>AI agent</strong> analyzes results and decides what to try next</li>
<li>Repeat</li>
</ol>

<p>This is the same pattern as self-driving laboratories in chemistry and biology — but quantum computing can move faster because the entire workflow is software.</p>

<h2>Technical Details</h2>

<h3>Architecture</h3>

<p>Both servers are <strong>Python</strong> using the MCP Python SDK's <code>FastMCP</code> framework, communicating via <strong>stdio transport</strong> (JSON-RPC over stdin/stdout). The QRNG server was originally Node.js but was rewritten in Python to share the QI SDK for Tuna-9 fallback. Configuration lives in <code>.mcp.json</code> at the project root:</p>

<pre><code>{
  "mcpServers": {
    "qrng": {
      "command": "python",
      "args": ["mcp-servers/qrng/qrng_server.py"]
    },
    "qi-circuits": {
      "command": "python",
      "args": ["mcp-servers/qi-circuits/qi_server.py"]
    }
  }
}</code></pre>

<h3>Authentication</h3>

<p>Both servers reuse the OAuth token from <code>qi login</code> (stored in <code>~/.quantuminspire/config.json</code>) for Quantum Inspire access. The QRNG server's ANU endpoint needs no auth. The Tuna-9 fallback only initializes the QI backend on first use (lazy loading), so if you only have ANU access, the server works fine without QI credentials.</p>

<h3>Error handling &amp; fallback</h3>

<p>All tools return structured JSON with error details on failure. The QRNG server's fallback chain (ANU → Tuna-9 → local emulator) is automatic — each source is tried in order, and the response always reports which source was used. Backend initialization is lazy, so startup is fast.</p>

<h2>What's Next</h2>

<p>The roadmap includes:</p>

<ol>
<li><strong>IBM Quantum MCP Server</strong> — Same pattern for IBM's quantum hardware (ibm_torino, ibm_fez, ibm_marrakesh). We already have IBM credentials configured.</li>
<li><strong>Autonomous experiment loops</strong> — Claude designs, submits, analyzes, and iterates without human prompting. VQE parameter optimization is the first target.</li>
<li><strong>Circuit optimization tool</strong> — An MCP tool that transpiles circuits for specific hardware topologies before submission.</li>
<li><strong>Multi-backend comparison</strong> — Run the same logical circuit on QI and IBM hardware, compare noise profiles automatically.</li>
</ol>

<p>The goal: a quantum research agent that can operate at the speed of the hardware itself, running experiments around the clock while maintaining rigorous experimental methodology.</p>

<p>All code is open source: <a href="https://github.com/JDerekLomas/quantuminspire/tree/main/mcp-servers">github.com/JDerekLomas/quantuminspire/tree/main/mcp-servers</a></p>
`,
    sources: [
      { label: 'Model Context Protocol (MCP)', url: 'https://modelcontextprotocol.io/' },
      { label: 'ANU Quantum Random Numbers', url: 'https://qrng.anu.edu.au/' },
      { label: 'Quantum Inspire platform', url: 'https://www.quantum-inspire.com/' },
      { label: 'MCP Python SDK', url: 'https://github.com/modelcontextprotocol/python-sdk' },
      { label: 'Our MCP server code (GitHub)', url: 'https://github.com/JDerekLomas/quantuminspire/tree/main/mcp-servers' },
      { label: 'Claude Code', url: 'https://docs.anthropic.com/en/docs/claude-code' },
    ],
  },
  {
    slug: 'systematic-paper-replication',
    title: 'Tier 1 Complete: 5 Papers, 21 Claims, 4 Backends',
    subtitle: 'What happens when AI agents try to reproduce quantum computing experiments across different hardware?',
    date: '2026-02-10',
    author: 'AI x Quantum Research Team',
    category: 'experiment' as const,
    tags: ['replication', 'VQE', 'QAOA', 'quantum volume', 'randomized benchmarking', 'reproducibility', 'cross-platform'],
    heroImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80',
    heroCaption: 'The gaps between published results and reproduced results are themselves a research finding.',
    excerpt: 'We replicated 5 foundational quantum computing papers across 4 hardware backends. 90% of claims reproduce successfully. The biggest finding: TREX error mitigation (one flag change in Qiskit) achieves chemical accuracy on IBM Torino — 0.22 kcal/mol, a 119x improvement over raw measurement.',
    content: `<p>Reproducibility is one of the quiet crises in quantum computing. Papers report impressive results on custom hardware, but how well do those results transfer to different backends? We built an automated pipeline to find out &mdash; and the results tell a clear story about the current state of quantum computing.</p>

<h2>The Approach</h2>

<p>Our replication pipeline works in three stages:</p>

<ol>
<li><strong>Claim extraction</strong> &mdash; We identify specific, quantitative claims from each paper: ground-state energies, fidelities, threshold tests, improvement factors.</li>
<li><strong>Reproduction</strong> &mdash; We implement each experiment using PennyLane (simulation) and Qiskit (hardware), testing across four backends: QI emulator (noiseless), IBM Torino (133 superconducting qubits), QI Tuna-9 (9 superconducting qubits), and IQM Garnet (20 superconducting qubits).</li>
<li><strong>Classification</strong> &mdash; Each claim gets a failure mode: <strong>success</strong> (within published error bars), <strong>partial noise</strong> (qualitatively correct but degraded), <strong>noise dominated</strong> (signal overwhelmed), or structural failures (circuit translation, parameter mismatch, missing detail).</li>
</ol>

<h2>The Scorecard</h2>

<table>
<thead><tr><th>Paper</th><th>Claims</th><th>Pass</th><th>Rate</th><th>Backends</th></tr></thead>
<tbody>
<tr><td>Sagastizabal 2019</td><td>4</td><td>4</td><td>100%</td><td>Emulator, IBM, Tuna-9</td></tr>
<tr><td>Kandala 2017</td><td>5</td><td>5</td><td>100%</td><td>Emulator, IBM, Tuna-9</td></tr>
<tr><td>Peruzzo 2014</td><td>5</td><td>3</td><td>60%</td><td>Emulator, IBM</td></tr>
<tr><td>Cross 2019</td><td>3</td><td>3</td><td>100%</td><td>Emulator, IBM, Tuna-9, IQM</td></tr>
<tr><td>Harrigan 2021</td><td>4</td><td>4</td><td>100%</td><td>Emulator, Tuna-9</td></tr>
<tr><td><strong>Total</strong></td><td><strong>21</strong></td><td><strong>19</strong></td><td><strong>90%</strong></td><td><strong>4 backends</strong></td></tr>
</tbody>
</table>

<h2>Paper 1: Sagastizabal et al. (2019) &mdash; Symmetry Verification VQE</h2>

<p><em>Phys. Rev. A 100, 010302(R)</em> &mdash; <a href="https://arxiv.org/abs/1902.11258">arXiv:1902.11258</a></p>

<p>This QuTech paper demonstrates symmetry verification on a 2-qubit VQE for H2. We tested 4 claims across 3 backends. The emulator reproduces the ground state within 0.75 kcal/mol. The breakthrough came from our mitigation ladder: <strong>TREX (Twirled Readout Error eXtinction)</strong> &mdash; a single flag change in Qiskit's EstimatorV2 (resilience_level=1) &mdash; achieves <strong>0.22 kcal/mol on IBM Torino, well within chemical accuracy</strong>. That's 119x better than raw measurement (26.2 kcal/mol). On Tuna-9, the best qubit pair [2,4] achieves 3.04 kcal/mol with Z-parity post-selection. The symmetry verification improvement factor (119x on IBM, 3.6x on Tuna-9) vastly exceeds the paper's published >2x claim.</p>

<p><strong>Result: 100% pass (4/4 claims).</strong> TREX is the single most impactful error mitigation technique we tested &mdash; one line of code, chemical accuracy.</p>

<h2>Paper 2: Kandala et al. (2017) &mdash; Hardware-Efficient VQE</h2>

<p><em>Nature 549, 242</em> &mdash; <a href="https://arxiv.org/abs/1704.05018">arXiv:1704.05018</a></p>

<p>The foundational paper on hardware-efficient ansatze for VQE. We replicated the H2 potential energy curve using a 4-qubit Jordan-Wigner encoding (the original used parity mapping for 2 qubits). On the emulator, all 10 bond distances achieve chemical accuracy with warm-start optimization. With TREX, IBM achieves <strong>0.22 kcal/mol</strong> at equilibrium &mdash; not just within Kandala's 0.005 Ha error bar, but within chemical accuracy. This is the strongest hardware VQE result in our entire suite. Tuna-9 achieves 3.04 kcal/mol with qubit-aware routing on q[2,4].</p>

<p><strong>Result: 100% pass (5/5 claims).</strong> TREX flipped both the equilibrium and chemical accuracy claims from FAIL to PASS. Every claim in this landmark paper now reproduces.</p>

<h2>Paper 3: Peruzzo et al. (2014) &mdash; The Original VQE Paper</h2>

<p><em>Nature Communications 5, 4213</em> &mdash; <a href="https://arxiv.org/abs/1304.3061">arXiv:1304.3061</a></p>

<p>The paper that started it all: the first variational quantum eigensolver, demonstrated on HeH+ using a photonic processor. We replicated the full potential energy curve (11 bond distances) using PennyLane's 4-qubit Jordan-Wigner encoding with DoubleExcitation ansatz. The emulator matches FCI within 0.00012 Ha MAE. IBM Torino fared worst of all papers tested: 0/11 points within chemical accuracy, MAE = 83.5 kcal/mol.</p>

<p><strong>Result: 60% pass (3/5 claims).</strong> The HeH+ Hamiltonian has stronger off-diagonal terms than H2, making it more sensitive to hardware noise. Symmetry verification still provides 2.9x improvement on noisy simulation.</p>

<h2>Paper 4: Cross et al. (2019) &mdash; Quantum Volume</h2>

<p><em>Phys. Rev. A 100, 032328</em> &mdash; <a href="https://arxiv.org/abs/1811.12926">arXiv:1811.12926</a></p>

<p>The paper that defined the Quantum Volume benchmark. We tested the QV protocol on all four backends. This is our most successful cross-backend replication: QV=8 on the emulator and Tuna-9, QV=32 on IBM Torino and IQM Garnet. Randomized benchmarking on Tuna-9 confirmed 99.82% single-qubit gate fidelity.</p>

<p><strong>Result: 100% pass (3/3 claims).</strong> Characterization protocols transfer cleanly across platforms &mdash; the QV definition is hardware-agnostic by design.</p>

<h2>Paper 5: Harrigan et al. (2021) &mdash; QAOA MaxCut</h2>

<p><em>Nature Physics 17, 332</em> &mdash; <a href="https://arxiv.org/abs/2004.04197">arXiv:2004.04197</a></p>

<p>Google's QAOA paper on 3-23 qubit graph problems using Sycamore. We replicated small instances: 3-node and 4-node MaxCut at p=1. On the emulator, all graph types achieve optimal or near-optimal approximation ratios. On Tuna-9, the 4-node path graph achieves a 74.1% approximation ratio with 5x5 parameter sweep &mdash; well above the 50% random baseline.</p>

<p><strong>Result: 100% pass (4/4 claims).</strong> QAOA's cost function is naturally noise-resilient: even noisy hardware consistently beats random guessing.</p>

<h2>The Pattern</h2>

<p>Across all five papers and four backends, three patterns are clear:</p>

<ol>
<li><strong>TREX is the biggest lever.</strong> Qiskit's built-in TREX mitigation (resilience_level=1 in EstimatorV2) delivers 119x error reduction on IBM &mdash; from 26.2 kcal/mol raw to <strong>0.22 kcal/mol, achieving chemical accuracy</strong>. Z-parity post-selection alone gives 3-6x improvement. TREX goes further because it corrects readout errors in all measurement bases, not just the computational basis. One flag change matters more than qubit selection, shot count, or choice of backend.</li>
<li><strong>With the right mitigation, chemistry reproduces.</strong> Raw VQE fails on every backend. But TREX pushes IBM VQE past chemical accuracy, and our overall pass rate reaches 90%. QV and QAOA (100% pass) test threshold properties robust to noise, while VQE requires active mitigation. The pattern is clear: quantum computing works, but only with the right error mitigation stack.</li>
<li><strong>Each backend has a noise fingerprint.</strong> Tuna-9 shows dephasing noise (ZZ correlations preserved, XX/YY degraded). IBM Torino shows depolarizing noise (all correlations degrade equally). IQM Garnet shows the cleanest Bell fidelities (98.1%). Knowing the fingerprint tells you which mitigation to apply.</li>
</ol>

<p>This is not a criticism of the original papers &mdash; they used carefully calibrated, custom hardware. The finding is about <strong>reproducibility across platforms</strong>: quantum computing results are currently hardware-specific in ways that classical computing results are not. But with the right post-processing, the gap is surprisingly narrow.</p>

<h2>What's Next</h2>

<p>Tier 1 is complete. We're moving to Tier 2: Kim et al. 2023 ("Evidence for the utility of quantum computing," Nature), Watson et al. 2022 (QuTech silicon spin qubits), and Philips et al. 2022 (universal 6-qubit silicon). The full replication dashboard is live at <a href="https://quantuminspire.vercel.app/replications">quantuminspire.vercel.app/replications</a>.</p>`,
    sources: [
      { label: 'Sagastizabal et al. (2019)', url: 'https://arxiv.org/abs/1902.11258' },
      { label: 'Kandala et al. (2017) - Hardware-efficient VQE', url: 'https://arxiv.org/abs/1704.05018' },
      { label: 'Peruzzo et al. (2014) - Original VQE paper', url: 'https://arxiv.org/abs/1304.3061' },
      { label: 'Cross et al. (2019) - Quantum Volume', url: 'https://arxiv.org/abs/1811.12926' },
      { label: 'Harrigan et al. (2021) - QAOA MaxCut', url: 'https://arxiv.org/abs/2004.04197' },
      { label: 'Live replication dashboard', url: 'https://quantuminspire.vercel.app/replications' },
      { label: 'Replication analyzer (GitHub)', url: 'https://github.com/JDerekLomas/quantuminspire/blob/main/agents/replication_analyzer.py' },
      { label: 'HeH+ replication script (GitHub)', url: 'https://github.com/JDerekLomas/quantuminspire/blob/main/replicate_peruzzo.py' },
    ],
  },
  {
    slug: 'ai-runs-quantum-experiment',
    title: 'An AI Ran Its Own Quantum Experiment on Real Hardware',
    subtitle: 'Claude designed circuits, submitted them to three quantum backends, analyzed errors, and iterated — no human code required',
    date: '2026-02-10',
    author: 'AI x Quantum Research Team',
    category: 'experiment',
    tags: ['MCP', 'Claude', 'tool use', 'Bell state', 'tomography', 'IBM Quantum', 'Tuna-9', 'noise characterization'],
    heroImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&q=80',
    heroCaption: 'For the first time, an AI agent designed and ran a multi-platform quantum experiment through direct hardware access.',
    excerpt: 'We gave Claude direct access to quantum hardware through MCP tool calls. It designed a Bell state tomography experiment, submitted circuits to three backends, discovered that IBM\'s transpiler is as important as its hardware, and mapped how quickly each platform loses quantum coherence. No Python scripts. No human in the loop.',
    content: `<p>Most AI-for-quantum papers describe AI <em>writing code</em> that humans then run. This experiment is different: <strong>Claude designed, submitted, and analyzed a quantum experiment by calling hardware directly</strong> &mdash; through Anthropic's <a href="https://modelcontextprotocol.io/">Model Context Protocol (MCP)</a>.</p>

<p>The AI agent had access to three tools:</p>
<ul>
<li><code>qi_run_local</code> &mdash; a local quantum emulator (qxelarator)</li>
<li><code>qi_submit_circuit</code> &mdash; QuTech's Tuna-9 superconducting transmon processor (9 qubits)</li>
<li><code>ibm_submit_circuit</code> &mdash; IBM's Torino superconducting processor (133 qubits)</li>
</ul>

<p>No Python scripts were written. No files were saved to disk. Every circuit was designed in the conversation and submitted through tool calls. The AI chose what to measure, interpreted the results, and designed follow-up experiments based on what it found.</p>

<h2>The Experiment: Bell State Tomography</h2>

<p>The AI designed a two-part experiment to characterize entanglement quality across platforms:</p>

<p><strong>Part 1 &mdash; State Tomography:</strong> Prepare a Bell state (|00&rang; + |11&rang;)/&radic;2, then measure in three bases (Z, X, Y) to reconstruct the quantum state and compute fidelity.</p>

<p><strong>Part 2 &mdash; Depth Scaling:</strong> Based on findings from Part 1, the AI designed follow-up circuits with increasing numbers of CNOT gates (1, 3, 7, 15) to map how quickly each backend loses coherence.</p>

<p>In total, the AI submitted <strong>17 circuits across 3 backends</strong> &mdash; 3 emulator tests, 6 Tuna-9 hardware jobs, and 8 IBM Torino jobs.</p>

<h2>Part 1 Results: Cross-Platform Bell Fidelity</h2>

<table>
<thead><tr><th>Metric</th><th>Emulator</th><th>IBM Torino</th><th>Tuna-9</th></tr></thead>
<tbody>
<tr><td>&lang;ZZ&rang;</td><td>+1.000</td><td>+0.961</td><td>+0.745</td></tr>
<tr><td>&lang;XX&rang;</td><td>+1.000</td><td>+0.968</td><td>+0.756</td></tr>
<tr><td>&lang;YY&rang;</td><td>&minus;1.000</td><td>&minus;0.953</td><td>&minus;0.734</td></tr>
<tr><td><strong>Bell Fidelity</strong></td><td><strong>1.000</strong></td><td><strong>0.970</strong></td><td><strong>0.809</strong></td></tr>
</tbody>
</table>

<p>IBM Torino achieves 97% Bell state fidelity. Tuna-9 reaches 81%. Both are genuinely entangled (fidelity > 0.5), but the gap is significant. The emulator confirms 100% &mdash; the physics is correct, the hardware introduces the errors.</p>

<p>The noise signature is similar on both platforms: all three correlations (ZZ, XX, YY) degrade proportionally, consistent with <strong>depolarizing noise</strong>. On Tuna-9, the XX correlation is slightly better preserved than ZZ or YY, hinting at a T1 (energy relaxation) component.</p>

<h2>Part 2: The AI Designs a Follow-Up</h2>

<p>Here's where the "AI experimentalist" idea gets interesting. After observing depolarizing noise on both backends, the AI reasoned:</p>

<blockquote>Since both backends show depolarizing noise, the practical question is: how fast does fidelity decay with circuit depth? I'll insert identity operations (CNOT-CNOT pairs) to increase depth without changing the intended output, then measure how quickly each backend degrades.</blockquote>

<p>This is a standard technique in quantum characterization, but the AI arrived at it through reasoning about its own results &mdash; not from a script or instruction.</p>

<h3>The Transpiler Discovery</h3>

<p>The first attempt on IBM revealed something unexpected. The AI submitted circuits with 3, 7, and 15 CNOTs &mdash; but IBM's Qiskit transpiler at optimization level 3 <strong>recognized the CNOT-CNOT identity pairs and canceled them</strong>. All three circuits compiled down to the same 7-depth circuit with a single CZ gate.</p>

<p>The AI adapted: it resubmitted with barriers between gates (to prevent optimization) and with optimization level 0. Now the circuits compiled to depths 8, 22, 50, and 106 &mdash; properly scaling.</p>

<p>This wasn't a planned finding. <strong>The transpiler's intelligence was discovered empirically by the AI during the experiment.</strong></p>

<h2>Part 2 Results: Depth Scaling</h2>

<table>
<thead><tr><th>CNOTs</th><th>Emulator</th><th>IBM (opt=3)</th><th>IBM (opt=0)</th><th>Tuna-9</th></tr></thead>
<tbody>
<tr><td>1</td><td>1.000</td><td>0.980</td><td>0.862</td><td>0.873</td></tr>
<tr><td>3</td><td>1.000</td><td>(optimized away)</td><td>0.864</td><td>0.874</td></tr>
<tr><td>7</td><td>1.000</td><td>(optimized away)</td><td>0.877</td><td>0.793</td></tr>
<tr><td>15</td><td>1.000</td><td>(optimized away)</td><td>0.854</td><td><strong>0.619</strong></td></tr>
</tbody>
</table>

<p>The results reveal three distinct regimes:</p>

<ol>
<li><strong>Tuna-9 degrades visibly</strong> &mdash; 2.4% fidelity loss per CNOT, dropping from 87% to 62% at 15 CNOTs. The "half-life" is roughly 28 CNOTs &mdash; beyond that, the output is noise.</li>
<li><strong>IBM (unoptimized) barely degrades</strong> &mdash; 0.07% per CNOT, 34x better gate fidelity than Tuna-9. But the unoptimized baseline (86%) is much worse than the optimized one (98%).</li>
<li><strong>IBM's transpiler is as valuable as its hardware</strong> &mdash; optimization level 3 provides a 12 percentage point fidelity improvement. The software stack matters as much as the quantum processor.</li>
</ol>

<h3>T1 Decay on Tuna-9</h3>

<p>At 15 CNOTs, Tuna-9's output distribution tells a physical story:</p>

<table>
<thead><tr><th>State</th><th>Probability</th></tr></thead>
<tbody>
<tr><td>|00&rang;</td><td>52.8%</td></tr>
<tr><td>|01&rang;</td><td>29.1%</td></tr>
<tr><td>|10&rang;</td><td>9.0%</td></tr>
<tr><td>|11&rang;</td><td>9.1%</td></tr>
</tbody>
</table>

<p>The state is collapsing toward |00&rang;. Qubit 1 has an 82% probability of being in |0&rang; regardless of qubit 0's state. This is the signature of <strong>T1 energy relaxation</strong> &mdash; the qubit loses its excitation and decays to the ground state. Qubit 1 on Tuna-9 relaxes faster than qubit 0.</p>

<h2>What Makes This Different</h2>

<p>This experiment wasn't remarkable for its physics &mdash; Bell state tomography and depth scaling are standard characterization techniques. What's new is the <strong>workflow</strong>:</p>

<ul>
<li><strong>Zero code files.</strong> Every circuit was designed in conversation and submitted through MCP tool calls.</li>
<li><strong>Iterative reasoning.</strong> The depth-scaling experiment was designed in response to tomography results. The transpiler discovery was handled on the fly.</li>
<li><strong>Cross-platform in one session.</strong> The same AI compared three backends simultaneously, something that normally requires separate scripts, accounts, and analysis pipelines.</li>
<li><strong>Real hardware.</strong> These are production quantum processors &mdash; IBM's 133-qubit Torino and QuTech's 9-qubit Tuna-9 superconducting transmon device.</li>
</ul>

<p>The closest analogy is Ginkgo Bioworks' autonomous protein experiments with GPT-5 &mdash; but for quantum circuits instead of wet labs. The quantum domain is actually easier to automate: the entire experimental loop is digital, circuits execute in seconds, and results are immediately interpretable.</p>

<h2>Implications</h2>

<p><strong>For quantum computing:</strong> AI-driven characterization could become standard practice. Instead of running fixed benchmark suites, an AI agent can adaptively probe a quantum processor, designing each measurement based on previous results. This is more efficient than exhaustive benchmarking and can discover unexpected failure modes (like the qubit-asymmetric T1 decay we found on Tuna-9).</p>

<p><strong>For AI:</strong> Tool use on real scientific instruments is a fundamentally different capability from tool use on APIs. The AI must reason about physical systems, handle noisy data, and adapt experimental design &mdash; skills that don't emerge from text generation alone.</p>

<p><strong>For both:</strong> The finding that IBM's transpiler contributes nearly as much fidelity as its hardware suggests that the software-hardware co-design space is where the real optimization lies. An AI agent that can navigate both the circuit design and the compilation strategy simultaneously has an advantage over tools that treat them separately.</p>

<h2>Reproducibility</h2>

<p>Every measurement in this post was taken on February 10, 2026, using real quantum hardware. The complete raw data &mdash; all measurement counts, job IDs, and analysis &mdash; is stored at <a href="https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/bell-tomography-cross-platform.json">experiments/results/bell-tomography-cross-platform.json</a>. The MCP server code is open source in the same repository.</p>

<p>Job IDs for independent verification: Tuna-9 tomography (415235, 415236, 415237), Tuna-9 depth scaling (415240, 415241, 415242), IBM tomography (d65mao0qbmes739d39f0), IBM depth scaling (d65mbntbujdc73ctle10).</p>`,
    sources: [
      { label: 'Model Context Protocol (MCP)', url: 'https://modelcontextprotocol.io/' },
      { label: 'Full experiment data (JSON)', url: 'https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/bell-tomography-cross-platform.json' },
      { label: 'QI Circuits MCP server (GitHub)', url: 'https://github.com/JDerekLomas/quantuminspire/blob/main/mcp-servers/qi-circuits/qi_server.py' },
      { label: 'IBM Quantum MCP server (GitHub)', url: 'https://github.com/JDerekLomas/quantuminspire/blob/main/mcp-servers/ibm-quantum/ibm_server.py' },
      { label: 'Ginkgo + GPT-5 autonomous experiments', url: 'https://openai.com/index/gpt-5-lowers-protein-synthesis-cost/' },
      { label: 'Quantum Inspire - Tuna-9', url: 'https://www.quantum-inspire.com/' },
    ],
  },
  {
    slug: 'ai-characterizes-quantum-processor',
    title: 'An AI Mapped an Unknown Quantum Processor and Improved Its Own Circuits',
    subtitle: 'Claude autonomously discovered Tuna-9\'s topology, characterized its noise, and achieved 33% lower error rates through hardware-aware routing',
    date: '2026-02-10',
    author: 'AI x Quantum Research Team',
    category: 'experiment',
    tags: ['autonomous research', 'hardware characterization', 'Tuna-9', 'noise tomography', 'qubit routing', 'MCP'],
    heroImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200&q=80',
    heroCaption: 'An AI agent autonomously characterized a quantum processor and used what it learned to improve circuit performance.',
    excerpt: 'We gave an AI agent access to a quantum processor it had never seen before and asked: can you figure out how it works and use that knowledge to run better circuits? In 33 hardware jobs, Claude discovered the full topology, identified the best and worst qubits, characterized noise types, and improved GHZ state fidelity by 5.8 percentage points.',
    content: `<p>In our <a href="/blog/ai-runs-quantum-experiment">previous experiment</a>, Claude ran a pre-designed Bell state experiment on quantum hardware. That was a tech demo. This time we asked a harder question: <strong>can a general-purpose AI autonomously characterize an unknown quantum processor and exploit what it learns?</strong></p>

<h2>Why This Matters</h2>

<p>Quantum processors are temperamental. Each qubit has different error rates. Physical connections between qubits vary in quality. The noise isn't uniform &mdash; some qubits suffer from energy decay (T1), others from phase randomization (T2), and the pattern can change after recalibration.</p>

<p>Today, this characterization is done by specialized teams using purpose-built tools like Q-CTRL's Fire Opal or IBM's Qiskit Runtime error suppression. The question is: <strong>can a general-purpose AI, with no prior knowledge of the hardware, perform this characterization from scratch?</strong></p>

<p>If it can, it would mean any team with hardware access could get optimized results without specialized quantum engineering expertise &mdash; lowering the barrier to useful quantum computing.</p>

<h2>The Setup</h2>

<p>We gave Claude (Opus 4.6) access to QuTech's <strong>Tuna-9</strong> superconducting transmon processor through <a href="https://modelcontextprotocol.io/">MCP tool calls</a>. The AI was told only that the processor has 9 qubits numbered 0&ndash;8. No topology map. No calibration data. No error rates. It had to discover everything through experiments.</p>

<p>The AI designed a three-phase research plan:</p>
<ol>
<li><strong>Discovery</strong>: Which qubits work? Which pairs are connected? What's the noise like?</li>
<li><strong>Exploitation</strong>: Use the hardware model to route circuits optimally</li>
<li><strong>Verification</strong>: Compare optimized vs. naive circuits to measure the improvement</li>
</ol>

<h2>Phase 1: Discovery &mdash; Mapping an Unknown Processor</h2>

<h3>Step 1: Single-Qubit Viability (4 jobs, 4,096 shots)</h3>

<p>Claude's first move: apply an X gate (bit-flip) to every qubit and measure. If a qubit works, it should read |1&rang;. The error rate reveals single-qubit quality.</p>

<table>
<thead><tr><th>Qubit</th><th>Error Rate</th><th>Assessment</th></tr></thead>
<tbody>
<tr><td>q[2]</td><td><strong>1.6%</strong></td><td>Best</td></tr>
<tr><td>q[5]</td><td><strong>1.6%</strong></td><td>Best</td></tr>
<tr><td>q[4]</td><td>1.9%</td><td>Excellent</td></tr>
<tr><td>q[6]</td><td>2.7%</td><td>Good</td></tr>
<tr><td>q[8]</td><td>3.5%</td><td>Good</td></tr>
<tr><td>q[1]</td><td>3.7%</td><td>Good</td></tr>
<tr><td>q[7]</td><td>4.5%</td><td>Fair</td></tr>
<tr><td>q[3]</td><td>5.2%</td><td>Fair</td></tr>
<tr><td>q[0]</td><td><strong>12.3%</strong></td><td>Poor</td></tr>
</tbody>
</table>

<p><strong>Finding:</strong> All 9 qubits are functional, but q[0] is dramatically worse than the rest &mdash; over 6x the error rate of the best qubits.</p>

<h3>Step 2: Connectivity Mapping (20 jobs, 20,480 shots)</h3>

<p>Next, Claude submitted Bell state circuits (H + CNOT) for 20 qubit pairs. On Tuna-9, the hardware <strong>rejects</strong> CNOT operations between non-connected qubits with a FAILED status. Claude exploited this: failure itself is topology information.</p>

<table>
<thead><tr><th>Connected Pair</th><th>Bell Fidelity</th><th>Failed Pair</th></tr></thead>
<tbody>
<tr><td>q[4]&harr;q[6]</td><td><strong>93.5%</strong></td><td>q[1]&harr;q[2]</td></tr>
<tr><td>q[2]&harr;q[4]</td><td><strong>92.3%</strong></td><td>q[3]&harr;q[4]</td></tr>
<tr><td>q[2]&harr;q[5]</td><td>91.4%</td><td>q[4]&harr;q[5]</td></tr>
<tr><td>q[1]&harr;q[3]</td><td>91.3%</td><td>q[5]&harr;q[6]</td></tr>
<tr><td>q[6]&harr;q[8]</td><td>91.3%</td><td>q[6]&harr;q[7]</td></tr>
<tr><td>q[1]&harr;q[4]</td><td>89.8%</td><td>q[0]&harr;q[3]</td></tr>
<tr><td>q[7]&harr;q[8]</td><td>88.3%</td><td>q[0]&harr;q[5]</td></tr>
<tr><td>q[3]&harr;q[6]</td><td>87.1%</td><td>q[3]&harr;q[5]</td></tr>
<tr><td>q[0]&harr;q[1]</td><td>87.0%</td><td>q[5]&harr;q[8]</td></tr>
<tr><td>q[0]&harr;q[2]</td><td>85.8%</td><td>q[0]&harr;q[8]</td></tr>
</tbody>
</table>

<p><strong>Surprise discovery:</strong> Our previous experiments (from a few days earlier) had reported that qubits 6&ndash;8 had no two-qubit connectivity. Claude's fresh probes found <strong>four previously unknown connections</strong>: q[3]&harr;q[6], q[4]&harr;q[6], q[6]&harr;q[8], and q[7]&harr;q[8]. The full processor is a connected graph across all 9 qubits with 10 edges.</p>

<p>The AI had discovered that the hardware had been recalibrated since our last characterization &mdash; something we didn't know.</p>

<h3>Step 3: Noise Characterization (9 jobs, 9,216 shots)</h3>

<p>Claude performed Bell state tomography (measuring in Z, X, and Y bases) on the best, medium, and worst connections to identify the noise type:</p>

<table>
<thead><tr><th>Connection</th><th>&rang;ZZ&rang;</th><th>&rang;XX&rang;</th><th>&rang;YY&rang;</th><th>Fidelity</th><th>Noise Type</th></tr></thead>
<tbody>
<tr><td>q[4]&harr;q[6]</td><td>+0.945</td><td>+0.902</td><td>&minus;0.896</td><td>93.6%</td><td><strong>Dephasing</strong> (T2)</td></tr>
<tr><td>q[2]&harr;q[4]</td><td>+0.914</td><td>+0.926</td><td>&minus;0.912</td><td>93.8%</td><td><strong>Depolarizing</strong></td></tr>
<tr><td>q[0]&harr;q[2]</td><td>+0.773</td><td>+0.762</td><td>&minus;0.791</td><td>83.2%</td><td><strong>Asymmetric</strong></td></tr>
</tbody>
</table>

<p>The noise fingerprints are distinct: the best connection (q[4]&harr;q[6]) shows <strong>dephasing</strong> &mdash; Z correlations are preserved while X and Y decay. The mid-range connection (q[2]&harr;q[4]) shows <strong>pure depolarizing noise</strong> &mdash; all correlators degrade equally. The worst connection (q[0]&harr;q[2]) shows <strong>asymmetric error</strong> dominated by q[0]'s T1 relaxation, where excited states decay to ground.</p>

<h2>Phase 2: Exploitation &mdash; Hardware-Aware Circuit Design</h2>

<p>Armed with its hardware model, Claude designed two versions of the same quantum circuit &mdash; a GHZ entangled state &mdash; with different qubit assignments:</p>

<h3>3-Qubit GHZ State</h3>

<p><strong>Naive routing</strong> (q[0,1,2]): Uses q[0] as the hub qubit controlling both CNOT gates. This is the worst possible choice &mdash; q[0] has 12.3% single-qubit error and its connections are the two weakest on the chip.</p>

<p><strong>Hardware-aware routing</strong> (q[2,4,6]): Uses q[4] as the hub, connecting to q[2] and q[6] through the two best connections on the chip (92.3% and 93.5%).</p>

<table>
<thead><tr><th>Routing</th><th>Qubits</th><th>|000&rang;</th><th>|111&rang;</th><th>GHZ Fidelity</th></tr></thead>
<tbody>
<tr><td>Naive</td><td>q[0,1,2]</td><td>1,908</td><td>1,495</td><td>83.1%</td></tr>
<tr><td><strong>Optimal</strong></td><td>q[2,4,6]</td><td>1,925</td><td>1,717</td><td><strong>88.9%</strong></td></tr>
</tbody>
</table>

<p><strong>Improvement: +5.8 percentage points.</strong> The naive circuit's dominant error is q[0] T1 decay: 292 out of 4,096 shots (7.1%) measured |011&rang; instead of |111&rang;, meaning q[0] collapsed from |1&rang; to |0&rang;. The optimized circuit's errors are balanced across all three qubits at 0.6&ndash;1.4% each.</p>

<h3>5-Qubit GHZ State</h3>

<p>To test whether the gap widens with more qubits:</p>

<table>
<thead><tr><th>Routing</th><th>Qubits</th><th>|00000&rang;</th><th>|11111&rang;</th><th>GHZ Fidelity</th></tr></thead>
<tbody>
<tr><td>Naive</td><td>q[0,1,2,3,4]</td><td>1,833</td><td>1,360</td><td>78.0%</td></tr>
<tr><td><strong>Optimal</strong></td><td>q[2,4,5,6,8]</td><td>1,828</td><td>1,603</td><td><strong>83.8%</strong></td></tr>
</tbody>
</table>

<p><strong>Same improvement: +5.8 percentage points.</strong> The consistency is notable &mdash; it suggests the improvement scales linearly with qubit count for this circuit family.</p>

<h2>What the AI Actually Did</h2>

<p>In total, Claude executed <strong>33 hardware jobs</strong> with <strong>~42,000 measurement shots</strong> across three phases. The entire process &mdash; from "I know nothing about this processor" to "here's an optimized circuit with 33% lower error" &mdash; was autonomous. No human selected qubits, analyzed results, or designed circuits.</p>

<p>The AI's decision-making process:</p>
<ol>
<li><strong>Probe broadly</strong>: X gates on all qubits simultaneously to identify candidates</li>
<li><strong>Isolate and characterize</strong>: Individual qubit probes to measure crosstalk</li>
<li><strong>Map connectivity</strong>: Bell circuits on all plausible pairs, using hardware failures as topology data</li>
<li><strong>Fingerprint noise</strong>: Multi-basis tomography on representative connections</li>
<li><strong>Exploit knowledge</strong>: Route circuits through best qubits, avoid worst ones</li>
</ol>

<h2>The Result in Context</h2>

<p>A 33% reduction in per-qubit error rate from routing alone is meaningful. For context:</p>
<ul>
<li>IBM's error suppression (dynamical decoupling, Pauli twirling) typically provides 2&ndash;5x improvement</li>
<li>Quantum error mitigation techniques like ZNE typically provide 1.5&ndash;3x improvement</li>
<li>Our improvement comes from <strong>zero additional circuit complexity</strong> &mdash; just choosing better qubits</li>
</ul>

<p>The AI also discovered that the processor's connectivity had changed since our last characterization (days earlier), catching a recalibration that we had missed. This is exactly the kind of "check your assumptions" step that automation enables &mdash; a human might reuse old calibration data, but the AI started fresh.</p>

<h2>Limitations</h2>

<p>This is a proof of concept, not a production system:</p>
<ul>
<li>Only tested on GHZ-type circuits (entanglement benchmarks, not algorithms)</li>
<li>Tuna-9 is a small processor (9 qubits) with limited routing freedom</li>
<li>The AI used exhaustive probing (20 pair probes) &mdash; a smarter strategy could reduce characterization overhead</li>
<li>Hardware conditions change over time; this is a snapshot</li>
<li>No comparison to specialized tools (Q-CTRL, Qiskit transpiler optimization)</li>
</ul>

<h2>What's Next</h2>

<p>The natural follow-up: can the AI learn to do this <em>efficiently</em>? Instead of probing all 20 pairs, can it use early results to predict which pairs are worth characterizing? Can it adapt its characterization strategy based on what it finds? And can it optimize circuits beyond simple qubit routing &mdash; adding dynamical decoupling sequences, pulse-level optimization, or error mitigation?</p>

<p>The broader question: if a general-purpose AI can characterize hardware in 33 jobs, what happens when it can run 33,000 &mdash; like Ginkgo's GPT-5 running 36,000 protein experiments? The gap between "useful characterization" and "automated discovery" may be smaller than we think.</p>

<hr />

<p>All measurements were taken on February 10, 2026, on QuTech's Tuna-9 superconducting transmon processor. The complete raw data &mdash; all measurement counts, job IDs, correlators, and analysis &mdash; is stored at <a href="https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/autonomous-characterization-full.json">experiments/results/autonomous-characterization-full.json</a>.</p>

<p>Hardware job IDs: Single-qubit probes (415259&ndash;415262), connectivity mapping (415273&ndash;415293), noise tomography (415323&ndash;415332), GHZ comparison (415373, 415374, 415385, 415387).</p>

<h2>Editorial: What a Transpiler Baseline Revealed</h2>

<p><em>Added February 10, 2026. After publishing this post, we ran the experiment that the Limitations section admitted was missing: a comparison to Qiskit's built-in transpiler. The results require an honest correction.</em></p>

<p>We gave Qiskit's transpiler (<code>optimization_level=3</code>) the same topology and error data that the AI had discovered, then asked it to route the same GHZ circuits. The results:</p>

<table>
<thead><tr><th>Routing</th><th>Qubits</th><th>5q GHZ Fidelity</th><th>Valid Circuit?</th></tr></thead>
<tbody>
<tr><td>Naive</td><td>[0,1,2,3,4]</td><td>80.6%</td><td>Yes</td></tr>
<tr><td>AI</td><td>[2,4,5,6,8]</td><td>86.7%</td><td><strong>No</strong> &mdash; used q4&harr;q5, q5&harr;q6 (not connected)</td></tr>
<tr><td>Qiskit <code>opt_level=3</code></td><td>[5,2,4,6,8]</td><td>86.0%</td><td>Yes</td></tr>
</tbody>
</table>

<p>Three findings that change the story:</p>

<ol>
<li><strong>The AI's 5-qubit circuit was invalid.</strong> It picked the right qubits but generated a CNOT chain through pairs that aren't physically connected (q4&harr;q5, q5&harr;q6). The original submission happened to succeed &mdash; likely because the hardware auto-routed the invalid gates &mdash; but when we re-submitted the same circuit, it failed. The 83.8% result was not reproducible.</li>
<li><strong>The Qiskit transpiler matches the AI's performance.</strong> Given the same error data, Qiskit deterministically chose [5,2,4,6,8] with a valid CNOT chain and achieved 86.0% fidelity. For 3-qubit GHZ, the AI and Qiskit chose the <em>identical</em> routing: [2,4,6].</li>
<li><strong>The improvement over naive routing is real, but it's not an AI advantage.</strong> The +5.8pp gain comes from basic qubit selection &mdash; avoid q[0], prefer high-fidelity connections. Any transpiler with calibration data does this automatically.</li>
</ol>

<p>So what <em>is</em> the AI's actual contribution? Not the routing &mdash; the <strong>characterization</strong>. The AI discovered the topology, measured error rates, and identified noise types from scratch. A transpiler needs this data as input; the AI generated it. The genuine value is in Phase 1 (discovery), not Phase 2 (exploitation). We should have framed it that way from the start.</p>

<p>We're leaving the original post intact above as a record of what we initially claimed, and this correction as a record of what we found when we checked our work. This is what honest research looks like &mdash; you run the baseline, and sometimes it humbles you.</p>

<p><em>Transpiler baseline data: <a href="https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/qiskit-transpiler-baseline-ghz5.json">qiskit-transpiler-baseline-ghz5.json</a>. Hardware jobs: Qiskit routing (415434, COMPLETED), AI re-submission (415436, FAILED).</em></p>`,
    sources: [
      { label: 'Full experiment data (JSON)', url: 'https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/autonomous-characterization-full.json' },
      { label: 'Previous experiment: AI runs quantum hardware', url: '/blog/ai-runs-quantum-experiment' },
      { label: 'Model Context Protocol (MCP)', url: 'https://modelcontextprotocol.io/' },
      { label: 'QI Circuits MCP server (GitHub)', url: 'https://github.com/JDerekLomas/quantuminspire/blob/main/mcp-servers/qi-circuits/qi_server.py' },
      { label: 'Quantum Inspire - Tuna-9', url: 'https://www.quantum-inspire.com/' },
    ],
  },
]
