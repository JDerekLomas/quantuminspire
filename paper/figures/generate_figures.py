"""Generate publication-quality figures for the paper.

Outputs PDF files sized for revtex4-2 two-column format (3.375 in column width).
"""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import numpy as np

# --- Style setup ---
plt.rcParams.update({
    'font.family': 'serif',
    'font.size': 8,
    'axes.labelsize': 9,
    'axes.titlesize': 9,
    'legend.fontsize': 7,
    'xtick.labelsize': 7,
    'ytick.labelsize': 7,
    'figure.dpi': 300,
    'savefig.dpi': 300,
    'savefig.bbox': 'tight',
    'savefig.pad_inches': 0.05,
    'lines.linewidth': 1.2,
    'lines.markersize': 5,
})

COL_W = 3.375  # revtex single column width in inches
FULL_W = 7.0   # revtex full page width

# Platform colors (colorblind-friendly)
C_EMU = '#888888'
C_TUNA = '#0072B2'
C_GARNET = '#D55E00'
C_TORINO = '#009E73'


# =====================================================================
# Figure 1: GHZ Scaling
# =====================================================================
def fig_ghz():
    fig, ax = plt.subplots(figsize=(COL_W, 2.2))

    n_emu = [3, 5, 10, 20, 50]
    f_emu = [100, 100, 100, 100, 100]

    n_tuna = [3, 5]
    f_tuna = [88.9, 83.8]

    n_garnet = [3, 5, 10]
    f_garnet = [93.9, 81.8, 54.7]

    n_torino = [3, 5, 10, 20, 50]
    f_torino = [82.9, 76.6, 62.2, 34.3, 8.5]

    ax.plot(n_emu, f_emu, '--', color=C_EMU, label='Emulator', zorder=1)
    ax.plot(n_tuna, f_tuna, 'o-', color=C_TUNA, label='Tuna-9 (9q)', zorder=3)
    ax.plot(n_garnet, f_garnet, 's-', color=C_GARNET, label='Garnet (20q)', zorder=3)
    ax.plot(n_torino, f_torino, 'D-', color=C_TORINO, label='Torino (133q)', zorder=3)

    ax.set_xscale('log')
    ax.set_xlim(2.5, 60)
    ax.set_ylim(0, 105)
    ax.set_xticks([3, 5, 10, 20, 50])
    ax.get_xaxis().set_major_formatter(ticker.ScalarFormatter())
    ax.set_xlabel('Number of qubits ($n$)')
    ax.set_ylabel('GHZ fidelity (%)')

    # Annotate 50-qubit point
    ax.annotate('8.5%', xy=(50, 8.5), xytext=(35, 20),
                fontsize=6, color=C_TORINO,
                arrowprops=dict(arrowstyle='->', color=C_TORINO, lw=0.8))

    ax.legend(loc='upper right', framealpha=0.9)
    ax.grid(True, alpha=0.3, linewidth=0.5)

    fig.savefig('fig1_ghz_scaling.pdf')
    print('  fig1_ghz_scaling.pdf')
    plt.close(fig)


# =====================================================================
# Figure 2: Noise Fingerprint (Bell correlators)
# =====================================================================
def fig_noise():
    fig, ax = plt.subplots(figsize=(COL_W, 2.0))

    platforms = ['Tuna-9', 'Garnet', 'Torino']
    zz = [0.871, 0.963, 0.729]
    xx = [0.803, 0.911, 0.704]
    yy = [0.792, 0.929, 0.675]

    x = np.arange(len(platforms))
    w = 0.22

    bars_zz = ax.bar(x - w, zz, w, label=r'$\langle ZZ \rangle$',
                      color='#2166AC', edgecolor='white', linewidth=0.5)
    bars_xx = ax.bar(x, xx, w, label=r'$\langle XX \rangle$',
                      color='#B2182B', edgecolor='white', linewidth=0.5)
    bars_yy = ax.bar(x + w, yy, w, label=r'$|\langle YY \rangle|$',
                      color='#F4A582', edgecolor='white', linewidth=0.5)

    ax.set_ylim(0.6, 1.0)
    ax.set_xticks(x)
    ax.set_xticklabels(platforms)
    ax.set_ylabel('Correlator magnitude')

    # Annotate noise type
    ax.text(0, 0.62, 'Dephasing', ha='center', fontsize=6, fontstyle='italic', color='#555')
    ax.text(1, 0.62, 'Dephasing', ha='center', fontsize=6, fontstyle='italic', color='#555')
    ax.text(2, 0.62, 'Depolarizing', ha='center', fontsize=6, fontstyle='italic', color='#555')

    ax.legend(loc='upper left', framealpha=0.9, ncol=3)
    ax.grid(True, axis='y', alpha=0.3, linewidth=0.5)

    fig.savefig('fig2_noise_fingerprint.pdf')
    print('  fig2_noise_fingerprint.pdf')
    plt.close(fig)


# =====================================================================
# Figure 3: Quantum Volume comparison
# =====================================================================
def fig_qv():
    fig, ax = plt.subplots(figsize=(COL_W, 2.0))

    # Data: HOF per width
    widths = [2, 3, 4, 5, 6]

    tuna = [0.692, 0.821, None, None, None]
    garnet = [0.757, 0.635, 0.686, 0.713, None]
    torino = [0.698, 0.736, 0.706, 0.676, 0.602]

    def plot_line(data, color, marker, label):
        xs = [w for w, v in zip(widths, data) if v is not None]
        ys = [v for v in data if v is not None]
        ax.plot(xs, ys, marker + '-', color=color, label=label)

    plot_line(tuna, C_TUNA, 'o', 'Tuna-9')
    plot_line(garnet, C_GARNET, 's', 'Garnet')
    plot_line(torino, C_TORINO, 'D', 'Torino')

    # Pass threshold
    ax.axhline(y=2/3, color='#999', linestyle='--', linewidth=0.8, zorder=0)
    ax.text(5.8, 0.673, 'Pass = 2/3', fontsize=6, color='#777', ha='right')

    ax.set_xlim(1.7, 6.3)
    ax.set_ylim(0.55, 0.9)
    ax.set_xticks(widths)
    ax.set_xlabel('Circuit width ($n$)')
    ax.set_ylabel('Heavy output fraction')

    # Mark QV values
    ax.annotate('QV = 8', xy=(3, 0.821), xytext=(3.5, 0.86),
                fontsize=6, color=C_TUNA,
                arrowprops=dict(arrowstyle='->', color=C_TUNA, lw=0.6))
    ax.annotate('QV = 32', xy=(5, 0.676), xytext=(5.5, 0.58),
                fontsize=6, color=C_TORINO,
                arrowprops=dict(arrowstyle='->', color=C_TORINO, lw=0.6))

    ax.legend(loc='upper right', framealpha=0.9)
    ax.grid(True, alpha=0.3, linewidth=0.5)

    fig.savefig('fig3_quantum_volume.pdf')
    print('  fig3_quantum_volume.pdf')
    plt.close(fig)


# =====================================================================
# Figure 4: Replication scorecard heatmap
# =====================================================================
def fig_scorecard():
    fig, ax = plt.subplots(figsize=(FULL_W, 2.2))

    # Rows = claims, columns = backends
    # 1 = PASS, 0 = FAIL, -1 = not tested
    papers = [
        'Sagastizabal [2]', '', '', '',
        'Kandala [3]', '', '',
        'Peruzzo [4]', '', '',
        'Cross [5]', '', '',
        'Harrigan [6]', '', '', '',
    ]
    claims = [
        r'H$_2$ energy', 'Sym. verif. >2×', 'Chem. accuracy', 'Post-sel. >95%',
        'PES MAE <1.6 mHa', 'HW-eff. ansatz', 'Chem. acc. + mitig.',
        r'HeH$^+$ energy', r'HeH$^+$ curve', 'Sym. verif. helps',
        'QV ≥ 8', 'QV validates', 'RB > 99%',
        'QAOA > random', 'Depth improves', '3-regular perf.', 'Tree subgraph',
    ]
    backends = ['Emulator', 'Tuna-9', 'Garnet/Torino']

    data = np.array([
        # Sagastizabal
        [1,  1,  1],   # H2 energy
        [-1, 1,  1],   # Sym verif
        [1,  0,  1],   # Chem accuracy
        [-1, 1, -1],   # Post-sel
        # Kandala
        [1, -1, -1],   # PES MAE
        [1, -1,  1],   # HW-eff ansatz
        [1,  1,  1],   # Chem acc + mitig
        # Peruzzo
        [1, -1,  0],   # HeH+ energy
        [1, -1,  0],   # HeH+ curve
        [1, -1, -1],   # Sym verif
        # Cross
        [1,  1,  1],   # QV >= 8
        [1,  1,  1],   # QV validates
        [1,  1,  1],   # RB > 99%
        # Harrigan
        [1,  1, -1],   # QAOA > random
        [1, -1, -1],   # Depth improves
        [1, -1, -1],   # 3-regular
        [-1, 1, -1],   # Tree subgraph
    ])

    # Custom colormap: grey for not tested, green for pass, red for fail
    from matplotlib.colors import ListedColormap
    cmap = ListedColormap(['#E8E8E8', '#E74C3C', '#2ECC71'])
    # Map: -1 -> 0 (grey), 0 -> 1 (red), 1 -> 2 (green)
    display = data + 1

    im = ax.imshow(display, cmap=cmap, aspect='auto', vmin=0, vmax=2)

    # Add text annotations
    for i in range(len(claims)):
        for j in range(3):
            if data[i, j] == 1:
                ax.text(j, i, 'P', ha='center', va='center', fontsize=7, fontweight='bold', color='white', family='sans-serif')
            elif data[i, j] == 0:
                ax.text(j, i, 'F', ha='center', va='center', fontsize=7, fontweight='bold', color='white', family='sans-serif')
            else:
                ax.text(j, i, '-', ha='center', va='center', fontsize=7, color='#AAA', family='sans-serif')

    ax.set_xticks(range(3))
    ax.set_xticklabels(backends, fontsize=8)
    ax.xaxis.set_ticks_position('top')

    ax.set_yticks(range(len(claims)))
    ax.set_yticklabels(claims, fontsize=6.5)

    # Draw paper group separators
    for y in [3.5, 6.5, 9.5, 12.5]:
        ax.axhline(y=y, color='white', linewidth=2)

    # Paper labels on the left
    paper_positions = [(1.5, 'Sagastizabal'), (5, 'Kandala'), (8, 'Peruzzo'),
                       (11, 'Cross'), (15, 'Harrigan')]
    for ypos, name in paper_positions:
        ax.text(-0.6, ypos, name, ha='right', va='center', fontsize=7,
                fontweight='bold', transform=ax.get_yaxis_transform())

    # Legend
    from matplotlib.patches import Patch
    legend_elements = [
        Patch(facecolor='#2ECC71', label='PASS'),
        Patch(facecolor='#E74C3C', label='FAIL'),
        Patch(facecolor='#E8E8E8', edgecolor='#CCC', label='Not tested'),
    ]
    ax.legend(handles=legend_elements, loc='lower right', fontsize=6,
              ncol=3, framealpha=0.9, bbox_to_anchor=(1.0, -0.15))

    fig.savefig('fig4_scorecard.pdf')
    print('  fig4_scorecard.pdf')
    plt.close(fig)


# =====================================================================
# Figure 5: VQE energy comparison (H2 across backends)
# =====================================================================
def fig_vqe():
    fig, ax = plt.subplots(figsize=(COL_W, 2.2))

    # Exact FCI energy for H2 at various bond lengths
    R_exact = [0.5, 0.735, 1.0, 1.5, 2.0, 2.5]
    E_exact = [-0.8727, -1.1373, -1.1011, -0.9919, -0.9486, -0.9359]

    # Emulator results (near-exact)
    R_emu = [0.5, 0.735, 1.0, 1.5, 2.0, 2.5]
    E_emu = [-0.8694, -1.1385, -1.0988, -0.9878, -0.9459, -0.9358]

    # Tuna-9 results (with post-selection)
    R_tuna = [0.5, 0.735, 1.0, 1.5, 2.0]
    E_tuna = [-0.8568, -1.1325, -1.0946, -0.9717, -0.9210]

    # IBM Torino (TREX, single point)
    R_ibm = [0.735]
    E_ibm = [-1.1377]

    ax.plot(R_exact, E_exact, 'k-', linewidth=1.5, label='Exact (FCI)', zorder=4)
    ax.plot(R_emu, E_emu, 'o--', color=C_EMU, label='Emulator', markersize=4, zorder=3)
    ax.plot(R_tuna, E_tuna, 's-', color=C_TUNA, label='Tuna-9 (PS)', markersize=4, zorder=3)
    ax.plot(R_ibm, E_ibm, 'D', color=C_TORINO, label='Torino (TREX)',
            markersize=7, zorder=5, markeredgecolor='white', markeredgewidth=0.8)

    # Chemical accuracy band around exact at R=0.735
    chem_acc = 0.0016  # Ha
    ax.fill_between([0.65, 0.82], -1.1373 - chem_acc, -1.1373 + chem_acc,
                     alpha=0.15, color='green', zorder=0)
    ax.text(0.83, -1.137, 'chem.\nacc.', fontsize=5, color='green', va='center')

    ax.set_xlabel(r'Bond length $R$ (Å)')
    ax.set_ylabel('Energy (Ha)')
    ax.set_xlim(0.4, 2.6)
    ax.set_ylim(-1.2, -0.82)

    ax.legend(loc='upper right', framealpha=0.9)
    ax.grid(True, alpha=0.3, linewidth=0.5)

    fig.savefig('fig5_vqe_h2.pdf')
    print('  fig5_vqe_h2.pdf')
    plt.close(fig)


# =====================================================================
# Run all
# =====================================================================
if __name__ == '__main__':
    print('Generating figures...')
    fig_ghz()
    fig_noise()
    fig_qv()
    fig_scorecard()
    fig_vqe()
    print('Done.')
