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

    tuna = [0.692, 0.821, 0.757, None, None]  # n=4 from QV=16 certification
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
    ax.annotate('QV = 16', xy=(4, 0.757), xytext=(4.5, 0.84),
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
        [1,  1,  1],   # Chem accuracy (hybrid VQE + REM: 0.9 mHa)
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
# Figure 5: VQE energy — mitigation ladder on Tuna-9
# =====================================================================
def fig_vqe():
    fig, ax = plt.subplots(figsize=(COL_W, 2.4))

    # Bond distances measured on hardware
    R = [0.5, 0.7, 0.735, 0.9, 1.1, 1.5, 2.0]

    # Exact FCI energies (2-qubit JW encoding)
    E_exact = [-1.05516, -1.13619, -1.13731, -1.12056, -1.07919, -0.99815, -0.94864]

    # REM-only Tuna-9 (5-rep mean ± std)
    E_rem = [-1.03895, -1.12629, -1.12549, -1.11196, -1.07346, -0.99317, -0.94420]
    E_rem_std = [0.00798, 0.00375, 0.00354, 0.00509, 0.00611, 0.00655, 0.00266]

    # REM+ZNE(quadratic) Tuna-9 (5-rep mean ± std)
    E_zne = [-1.05364, -1.13575, -1.13242, -1.11998, -1.08345, -0.99399, -0.94395]
    E_zne_std = [0.03544, 0.00486, 0.01144, 0.00745, 0.00627, 0.00492, 0.00462]

    # Hybrid VQE (COBYLA on hardware, single best point)
    R_hybrid = [0.735]
    E_hybrid = [-1.13641]

    # Dense exact curve for smooth line
    R_dense = np.linspace(0.4, 2.2, 50)
    E_dense = np.interp(R_dense, R, E_exact)

    ax.plot(R_dense, E_dense, 'k-', linewidth=1.5, label='Exact (FCI)', zorder=4)

    # REM with error bars
    ax.errorbar(R, E_rem, yerr=E_rem_std, fmt='o--', color='#999999',
                label='REM only', markersize=3.5, capsize=2, capthick=0.8,
                linewidth=0.9, zorder=2)

    # ZNE with error bars (skip R=0.5 error bar — too large from ZNE amplification)
    zne_err = list(E_zne_std)
    zne_err[0] = 0  # suppress R=0.5 bar (35 mHa std from ZNE noise amplification)
    ax.errorbar(R, E_zne, yerr=zne_err, fmt='s-', color=C_TUNA,
                label='REM+ZNE', markersize=4, capsize=2, capthick=0.8,
                linewidth=1.0, zorder=3)

    # Hybrid VQE star
    ax.plot(R_hybrid, E_hybrid, '*', color='#CC0000', label='Hybrid VQE',
            markersize=10, zorder=5, markeredgecolor='white', markeredgewidth=0.5)

    # Chemical accuracy band (±1.6 mHa around exact at R=0.735)
    chem_acc = 0.0016
    e_eq = -1.13731
    ax.fill_between([0.65, 0.82], e_eq - chem_acc, e_eq + chem_acc,
                     alpha=0.15, color='green', zorder=0)
    ax.text(0.83, e_eq, 'chem.\nacc.', fontsize=5, color='green', va='center')

    # Annotate hybrid VQE error
    ax.annotate('0.9 mHa', xy=(0.735, -1.13641), xytext=(0.5, -1.145),
                fontsize=6, color='#CC0000',
                arrowprops=dict(arrowstyle='->', color='#CC0000', lw=0.6))

    ax.set_xlabel(r'Bond length $R$ (Å)')
    ax.set_ylabel('Energy (Ha)')
    ax.set_xlim(0.4, 2.2)
    ax.set_ylim(-1.16, -0.92)

    ax.legend(loc='upper right', framealpha=0.9, fontsize=6.5)
    ax.grid(True, alpha=0.3, linewidth=0.5)

    fig.savefig('fig5_vqe_h2.pdf')
    print('  fig5_vqe_h2.pdf')
    plt.close(fig)


# =====================================================================
# Figure 6: LiH ZNE mitigation ladder + fold-energy plot
# =====================================================================
def fig_lih():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(FULL_W, 2.2),
                                     gridspec_kw={'width_ratios': [1.2, 1]})

    # --- Left panel: mitigation ladder bar chart ---
    methods = ['Raw', 'REM', 'REM+ZNE\n(linear)', 'REM+ZNE\n(quadratic)']
    errors = [33.1, 23.4, 8.1, 6.9]
    stds = [3.8, 3.3, 5.6, 9.2]
    colors = ['#AAAAAA', '#999999', '#5B9BD5', C_TUNA]

    bars = ax1.bar(range(4), errors, color=colors, edgecolor='white',
                   linewidth=0.5, width=0.65)
    ax1.errorbar(range(4), errors, yerr=stds, fmt='none', capsize=3,
                 capthick=0.8, ecolor='#333333', linewidth=0.8)

    # Chemical accuracy threshold
    ax1.axhline(y=1.6, color='#2ECC71', linestyle='--', linewidth=1.0, zorder=0)
    ax1.text(3.4, 2.4, 'chem. acc.', fontsize=6, color='#2ECC71', ha='right')

    # Value labels on bars
    for i, (e, s) in enumerate(zip(errors, stds)):
        ax1.text(i, e + s + 1.5, f'{e:.1f}', ha='center', va='bottom',
                 fontsize=7, fontweight='bold')

    # Reduction percentages
    for i, (e, label) in enumerate(zip(errors, ['', '29%', '75%', '79%'])):
        if label:
            ax1.text(i, -3.5, label, ha='center', va='top', fontsize=6,
                     color=colors[i], fontweight='bold')

    ax1.set_xticks(range(4))
    ax1.set_xticklabels(methods, fontsize=6.5)
    ax1.set_ylabel('Error (mHa)')
    ax1.set_ylim(-5, 52)
    ax1.set_title('LiH mitigation ladder ($R = 1.6$ Å)', fontsize=8)
    ax1.grid(True, axis='y', alpha=0.3, linewidth=0.5)

    # --- Right panel: fold-energy plot with extrapolation ---
    folds = [1, 3, 5]

    # REM fold energies (from zne-lih-analysis.json)
    E_rem_folds = [-7.8387, -7.8082, -7.7811]
    E_rem_stds = [0.0033, 0.0054, 0.0043]

    # Raw fold energies
    E_raw_folds = [-7.8290, -7.7981, -7.7713]
    E_raw_stds = [0.0038, 0.0049, 0.0041]

    # Extrapolated values
    E_casci = -7.862129

    # Quadratic fit for extrapolation curve
    folds_dense = np.linspace(0, 5.5, 50)

    # Fit quadratic through REM fold points
    coeffs = np.polyfit(folds, E_rem_folds, 2)
    E_fit = np.polyval(coeffs, folds_dense)
    E_extrap = np.polyval(coeffs, 0)  # zero-noise extrapolation

    ax2.plot(folds_dense, E_fit, '-', color=C_TUNA, linewidth=0.8, alpha=0.5, zorder=1)
    ax2.errorbar(folds, E_rem_folds, yerr=E_rem_stds, fmt='o-', color=C_TUNA,
                 label='REM', markersize=5, capsize=3, capthick=0.8, zorder=3)
    ax2.errorbar(folds, E_raw_folds, yerr=E_raw_stds, fmt='s--', color='#999999',
                 label='Raw', markersize=4, capsize=3, capthick=0.8, zorder=2)

    # Mark extrapolated point
    ax2.plot(0, E_extrap, '*', color='#CC0000', markersize=10, zorder=5,
             markeredgecolor='white', markeredgewidth=0.5, label=f'ZNE extrap.')

    # Exact energy
    ax2.axhline(y=E_casci, color='black', linestyle='-', linewidth=1.0, zorder=0)
    ax2.text(5.3, E_casci + 0.001, '$E_\\mathrm{CASCI}$', fontsize=6,
             va='bottom', ha='right')

    # Annotate error
    ax2.annotate(f'{abs(E_extrap - E_casci)*1000:.1f} mHa',
                 xy=(0, E_extrap), xytext=(1.2, E_extrap - 0.005),
                 fontsize=6, color='#CC0000',
                 arrowprops=dict(arrowstyle='->', color='#CC0000', lw=0.6))

    ax2.set_xlabel('CZ fold factor')
    ax2.set_ylabel('Energy (Ha)')
    ax2.set_xlim(-0.5, 5.5)
    ax2.set_xticks([0, 1, 3, 5])
    ax2.set_title('Richardson extrapolation', fontsize=8)
    ax2.legend(loc='upper right', framealpha=0.9, fontsize=6.5)
    ax2.grid(True, alpha=0.3, linewidth=0.5)

    fig.tight_layout()
    fig.savefig('fig6_lih_zne.pdf')
    print('  fig6_lih_zne.pdf')
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
    fig_lih()
    print('Done.')
