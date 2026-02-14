"""Analyze H2 2-qubit VQE results from Tuna-9 hardware.

Reads measurement counts from QI jobs, computes expectation values
for each Pauli term, reconstructs the energy at each bond distance,
and compares to FCI (exact) values.

Hamiltonian: H = g0*I + g1*(Z0 - Z1) + g4*(X0X1 + Y0Y1)
  (using g2=-g1, g3=0, g5=g4 symmetries of H2 STO-3G)

Physical qubits: q4 (logical 0), q6 (logical 1) on Tuna-9.
Bitstring convention: MSB-first, 9-bit. q4 = bit[4], q6 = bit[2] (0-indexed from left).
"""

import json
import numpy as np
from pathlib import Path
from datetime import datetime, timezone

# Physical qubit positions in 9-bit MSB-first bitstring
Q0_POS = 4  # q4 → position 4 (0-indexed from left)
Q1_POS = 2  # q6 → position 2


def extract_qubit_values(bitstring, pos0, pos1):
    """Extract two qubit values from a 9-bit bitstring."""
    return int(bitstring[pos0]), int(bitstring[pos1])


def compute_zz_expval(counts, pos0, pos1):
    """Compute <Z0>, <Z1>, <Z0Z1> from Z-basis measurements.

    Z eigenvalue: |0⟩ → +1, |1⟩ → -1
    """
    total = sum(counts.values())
    z0, z1, z0z1 = 0.0, 0.0, 0.0

    for bitstring, count in counts.items():
        b0, b1 = extract_qubit_values(bitstring, pos0, pos1)
        # Z eigenvalue: (-1)^bit
        s0 = 1 - 2 * b0
        s1 = 1 - 2 * b1
        z0 += s0 * count
        z1 += s1 * count
        z0z1 += s0 * s1 * count

    return z0 / total, z1 / total, z0z1 / total


def compute_xx_expval(counts, pos0, pos1):
    """Compute <X0X1> from X-basis measurements.

    The X-basis circuit applies Ry(-π/2) before measurement,
    so measuring ZZ in the rotated basis gives XX.
    """
    total = sum(counts.values())
    xx = 0.0

    for bitstring, count in counts.items():
        b0, b1 = extract_qubit_values(bitstring, pos0, pos1)
        s0 = 1 - 2 * b0
        s1 = 1 - 2 * b1
        xx += s0 * s1 * count

    return xx / total


def compute_yy_expval(counts, pos0, pos1):
    """Compute <Y0Y1> from Y-basis measurements.

    The Y-basis circuit applies Rx(π/2) = Rz(-π/2)·Ry(π/2)·Rz(π/2)
    before measurement, so measuring ZZ gives YY.
    """
    total = sum(counts.values())
    yy = 0.0

    for bitstring, count in counts.items():
        b0, b1 = extract_qubit_values(bitstring, pos0, pos1)
        s0 = 1 - 2 * b0
        s1 = 1 - 2 * b1
        yy += s0 * s1 * count

    return yy / total


def compute_energy(g0, g1, g4, z0, z1, xx, yy):
    """E = g0 + g1*(Z0 - Z1) + g4*(X0X1 + Y0Y1)"""
    return g0 + g1 * (z0 - z1) + g4 * (xx + yy)


def bootstrap_energy_error(counts_z, counts_x, counts_y, g0, g1, g4,
                           n_bootstrap=1000, seed=42):
    """Bootstrap estimate of energy standard error."""
    rng = np.random.RandomState(seed)

    # Convert to arrays for resampling
    def counts_to_arrays(counts):
        bitstrings = list(counts.keys())
        weights = np.array([counts[b] for b in bitstrings])
        probs = weights / weights.sum()
        return bitstrings, probs, weights.sum()

    bs_z, p_z, n_z = counts_to_arrays(counts_z)
    bs_x, p_x, n_x = counts_to_arrays(counts_x)
    bs_y, p_y, n_y = counts_to_arrays(counts_y)

    energies = []
    for _ in range(n_bootstrap):
        # Resample
        idx_z = rng.choice(len(bs_z), size=int(n_z), p=p_z)
        idx_x = rng.choice(len(bs_x), size=int(n_x), p=p_x)
        idx_y = rng.choice(len(bs_y), size=int(n_y), p=p_y)

        # Recount
        rc_z, rc_x, rc_y = {}, {}, {}
        for i in idx_z:
            rc_z[bs_z[i]] = rc_z.get(bs_z[i], 0) + 1
        for i in idx_x:
            rc_x[bs_x[i]] = rc_x.get(bs_x[i], 0) + 1
        for i in idx_y:
            rc_y[bs_y[i]] = rc_y.get(bs_y[i], 0) + 1

        z0, z1, _ = compute_zz_expval(rc_z, Q0_POS, Q1_POS)
        xx = compute_xx_expval(rc_x, Q0_POS, Q1_POS)
        yy = compute_yy_expval(rc_y, Q0_POS, Q1_POS)
        energies.append(compute_energy(g0, g1, g4, z0, z1, xx, yy))

    return float(np.std(energies))


def analyze_distance(meta, counts_z, counts_x, counts_y):
    """Analyze one bond distance."""
    g0 = meta["g0"]
    g1 = meta["g1"]
    g4 = meta["g4"]
    fci = meta["fci_energy"]

    # Expectation values
    z0, z1, z0z1 = compute_zz_expval(counts_z, Q0_POS, Q1_POS)
    xx = compute_xx_expval(counts_x, Q0_POS, Q1_POS)
    yy = compute_yy_expval(counts_y, Q0_POS, Q1_POS)

    # Energy
    energy = compute_energy(g0, g1, g4, z0, z1, xx, yy)
    error_mha = abs(energy - fci) * 1000

    # Symmetry check: Z0Z1 should be -1 ({|01⟩,|10⟩} sector)
    symmetry_z0z1 = z0z1

    # Bootstrap error bar
    sigma = bootstrap_energy_error(counts_z, counts_x, counts_y, g0, g1, g4)

    # Post-selection: keep only bitstrings where idle qubits are 0
    def post_select(counts):
        """Keep only shots where non-active qubits (not q4, q6) are 0."""
        filtered = {}
        total_in = sum(counts.values())
        for bs, c in counts.items():
            # Active: positions 4 (q4) and 2 (q6). All others must be '0'.
            keep = True
            for i in range(9):
                if i not in (Q0_POS, Q1_POS) and bs[i] == '1':
                    keep = False
                    break
            if keep:
                filtered[bs] = c
        total_out = sum(filtered.values())
        return filtered, total_out / total_in if total_in > 0 else 0

    ps_z, ret_z = post_select(counts_z)
    ps_x, ret_x = post_select(counts_x)
    ps_y, ret_y = post_select(counts_y)

    ps_retention = (ret_z + ret_x + ret_y) / 3

    if ps_z and ps_x and ps_y:
        ps_z0, ps_z1, ps_z0z1 = compute_zz_expval(ps_z, Q0_POS, Q1_POS)
        ps_xx = compute_xx_expval(ps_x, Q0_POS, Q1_POS)
        ps_yy = compute_yy_expval(ps_y, Q0_POS, Q1_POS)
        ps_energy = compute_energy(g0, g1, g4, ps_z0, ps_z1, ps_xx, ps_yy)
        ps_error_mha = abs(ps_energy - fci) * 1000
        ps_sigma = bootstrap_energy_error(ps_z, ps_x, ps_y, g0, g1, g4)
    else:
        ps_energy = None
        ps_error_mha = None
        ps_sigma = None
        ps_z0z1 = None

    return {
        "bond_distance": meta["bond_distance"],
        "fci_energy": fci,
        "optimal_alpha": meta["optimal_alpha"],
        "g0": g0, "g1": g1, "g4": g4,
        "expvals": {
            "Z0": round(z0, 6), "Z1": round(z1, 6),
            "Z0Z1": round(z0z1, 6),
            "X0X1": round(xx, 6), "Y0Y1": round(yy, 6),
        },
        "symmetry_Z0Z1": round(symmetry_z0z1, 4),
        "energy": round(energy, 8),
        "error_mHa": round(error_mha, 4),
        "sigma_mHa": round(sigma * 1000, 4),
        "ps_energy": round(ps_energy, 8) if ps_energy else None,
        "ps_error_mHa": round(ps_error_mha, 4) if ps_error_mha else None,
        "ps_sigma_mHa": round(ps_sigma * 1000, 4) if ps_sigma else None,
        "ps_retention_pct": round(ps_retention * 100, 2),
        "ps_symmetry_Z0Z1": round(ps_z0z1, 4) if ps_z0z1 is not None else None,
    }


# ── Job ID mapping ────────────────────────────────────────────────

JOB_MAP = {
    0.500: {"X": 426697, "Y": 426698, "Z": 426699},
    0.700: {"X": 426700, "Y": 426701, "Z": 426702},
    0.735: {"X": 426703, "Y": 426704, "Z": 426705},
    0.900: {"X": 426706, "Y": 426707, "Z": 426708},
    1.100: {"X": 426709, "Y": 426710, "Z": 426711},
    1.500: {"X": 426712, "Y": 426713, "Z": 426714},
    2.000: {"X": 426715, "Y": 426716, "Z": 426717},
}


def load_results_from_file(results_file):
    """Load pre-fetched results from a JSON file."""
    with open(results_file) as f:
        return json.load(f)


def fetch_results_from_qi():
    """Fetch results from QI API (requires running MCP server).
    Returns dict mapping job_id -> counts dict.
    """
    # This is meant to be called with results already fetched.
    # Use the fetch_all_results.py helper or MCP tools to get results first.
    raise NotImplementedError(
        "Use MCP tools to fetch results, then save to JSON and use load_results_from_file"
    )


if __name__ == "__main__":
    import sys

    # Load circuit metadata
    circuits_file = Path("experiments/results/replication-tuna9-circuits.json")
    with open(circuits_file) as f:
        circuit_data = json.load(f)

    # Check for pre-fetched results file
    results_file = Path("experiments/results/h2-2qubit-tuna9-raw-counts-v3.json")
    if not results_file.exists():
        print(f"Results file not found: {results_file}")
        print("Fetch results using MCP tools and save as:")
        print('  {"426343": {"000000000": 123, ...}, "426344": {...}, ...}')
        print()
        print("Or pass --check to just check job statuses.")
        if "--check" in sys.argv:
            print("\nJob status check not available without MCP. Use qi_check_job.")
        sys.exit(1)

    results = load_results_from_file(results_file)

    # Metadata for each distance
    h2_meta = circuit_data["sagastizabal2019"]["distances"]

    print("=" * 75)
    print("H2 2-QUBIT VQE — TUNA-9 HARDWARE ANALYSIS")
    print("=" * 75)
    print(f"Qubits: q4 (logical 0), q6 (logical 1)")
    print(f"Gate set: native (CZ, Ry, Rz, X)")
    print(f"Shots: 4,096 per basis per distance")
    print()

    all_results = []
    for meta in h2_meta:
        R = meta["bond_distance"]
        jobs = JOB_MAP[R]

        counts_z = results[str(jobs["Z"])]
        counts_x = results[str(jobs["X"])]
        counts_y = results[str(jobs["Y"])]

        result = analyze_distance(meta, counts_z, counts_x, counts_y)
        all_results.append(result)

        chem_acc = result["error_mHa"] < 1.6
        ps_chem_acc = result["ps_error_mHa"] < 1.6 if result["ps_error_mHa"] else False

        print(f"R = {R:.3f} A")
        print(f"  FCI:      {result['fci_energy']:.6f} Ha")
        print(f"  Raw:      {result['energy']:.6f} Ha  "
              f"({result['error_mHa']:.1f} +/- {result['sigma_mHa']:.1f} mHa)"
              f"{'  ** CHEMICAL ACCURACY **' if chem_acc else ''}")
        if result["ps_energy"] is not None:
            print(f"  PostSel:  {result['ps_energy']:.6f} Ha  "
                  f"({result['ps_error_mHa']:.1f} +/- {result['ps_sigma_mHa']:.1f} mHa)"
                  f"  [{result['ps_retention_pct']:.0f}% kept]"
                  f"{'  ** CHEMICAL ACCURACY **' if ps_chem_acc else ''}")
        print(f"  Symmetry: <Z0Z1> = {result['symmetry_Z0Z1']:+.4f}"
              f"  (ideal: -1.000)")
        if result["ps_symmetry_Z0Z1"] is not None:
            print(f"  PS Symm:  <Z0Z1> = {result['ps_symmetry_Z0Z1']:+.4f}")
        print()

    # Summary table
    print("=" * 75)
    print(f"{'R (A)':>7} {'FCI':>10} {'Raw E':>10} {'Err':>7} {'PS E':>10} {'PS Err':>7}")
    print("-" * 75)
    for r in all_results:
        ps_e = f"{r['ps_energy']:.6f}" if r['ps_energy'] else "N/A"
        ps_err = f"{r['ps_error_mHa']:.1f}" if r['ps_error_mHa'] else "N/A"
        print(f"{r['bond_distance']:>7.3f} {r['fci_energy']:>10.6f} "
              f"{r['energy']:>10.6f} {r['error_mHa']:>6.1f} "
              f"{ps_e:>10} {ps_err:>7}")

    # Save
    output = {
        "experiment": "H2 2-qubit VQE dissociation curve",
        "backend": "Tuna-9",
        "physical_qubits": [4, 6],
        "gate_set": "native (CZ, Ry, Rz, X)",
        "compile_stage": "routing",
        "shots_per_basis": 4096,
        "total_shots": 4096 * 3 * len(all_results),
        "analyzed": datetime.now(timezone.utc).isoformat(),
        "job_map": {str(k): v for k, v in JOB_MAP.items()},
        "results": all_results,
    }

    outfile = Path("experiments/results/h2-2qubit-vqe-tuna9-analysis.json")
    with open(outfile, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nSaved to: {outfile}")
