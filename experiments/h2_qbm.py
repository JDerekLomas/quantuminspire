#!/usr/bin/env python3
"""
Quantum Boltzmann Machine for H2 Thermal States
=================================================
Learns the thermal (Gibbs) state of molecular hydrogen at different
temperatures using the variational purification method.

VQE finds only the ground state. A QBM learns the full thermal state —
internal energy U(T), entropy S(T), and free energy F(T). At T→0 it
recovers VQE; at finite T it captures physics VQE cannot.

Method:
  Purification ansatz on 4 qubits (2 system + 2 ancilla).
  A parameterized circuit prepares |ψ(θ)⟩ on all 4 qubits.
  Tracing out the ancilla gives a mixed state ρ_sys(θ) on the system.
  We minimize the variational free energy:
    F(θ) = Tr[ρ_sys H] - T · S(ρ_sys)
  which equals the exact Gibbs free energy at the optimum.

At T→0: entropy term vanishes, F = ⟨H⟩ → VQE.
At T>0: optimizer balances low energy with high entropy → thermal state.

Hardware: QI emulator → Tuna-9 (9 qubits) → IBM Fez (156 qubits)
"""
import numpy as np
import json
from scipy.optimize import minimize

# === Pauli matrices ===
I2 = np.eye(2, dtype=complex)
X = np.array([[0, 1], [1, 0]], dtype=complex)
Y = np.array([[0, -1j], [1j, 0]], dtype=complex)
Z = np.array([[1, 0], [0, -1]], dtype=complex)

def mkron(*mats):
    out = mats[0]
    for m in mats[1:]:
        out = np.kron(out, m)
    return out


# === H2 Hamiltonian at equilibrium (R = 0.735 Å) ===
# H = g0·II + g1·ZI + g2·IZ + g3·ZZ + g4·XX + g5·YY
# Source: O'Malley et al., Phys. Rev. X 6, 031007 (2016)
COEFFS = {
    'II': -0.8692, 'ZI': 0.3435, 'IZ': -0.3435,
    'ZZ':  0.5596, 'XX': 0.0910, 'YY':  0.0910,
}
PAULI_MAP = {'I': I2, 'X': X, 'Y': Y, 'Z': Z}
H_2q = sum(c * mkron(PAULI_MAP[p[0]], PAULI_MAP[p[1]]) for p, c in COEFFS.items())

# Exact spectrum
EIGENVALUES, EIGENVECTORS = np.linalg.eigh(H_2q)
E_GROUND = EIGENVALUES[0]
ENERGY_GAP = EIGENVALUES[1] - EIGENVALUES[0]


# =====================================================================
# Part 1: Exact thermal properties (analytical reference)
# =====================================================================

def exact_thermal(H, temps):
    evals = np.linalg.eigvalsh(H)
    results = []
    for T in temps:
        beta = 1.0 / max(T, 1e-12)
        w = np.exp(-beta * (evals - evals[0]))  # shift for numerical stability
        Z = w.sum()
        p = w / Z
        U = (p * evals).sum()
        S = -np.sum(p * np.log(np.clip(p, 1e-30, None)))
        F = U - T * S
        C = beta**2 * ((p * evals**2).sum() - U**2)
        purity = (p**2).sum()
        results.append(dict(T=T, beta=beta, U=U, S=S, F=F, C=C, purity=purity))
    return results


# =====================================================================
# Part 2: Statevector simulation for 4-qubit purification
# =====================================================================

N_Q = 4
DIM = 2 ** N_Q

def _ry(angle):
    c, s = np.cos(angle / 2), np.sin(angle / 2)
    return np.array([[c, -s], [s, c]], dtype=complex)

def _gate_on_qubit(mat, qubit):
    """Expand a 2x2 gate to act on `qubit` in the N_Q-qubit space."""
    ops = [I2] * N_Q
    ops[qubit] = mat
    return mkron(*ops)

# Pre-build CNOT matrices (they don't change)
_CNOT_CACHE = {}
def _cnot_matrix(ctrl, tgt):
    key = (ctrl, tgt)
    if key not in _CNOT_CACHE:
        mat = np.zeros((DIM, DIM), dtype=complex)
        for i in range(DIM):
            bits = [(i >> (N_Q - 1 - q)) & 1 for q in range(N_Q)]
            if bits[ctrl] == 1:
                bits[tgt] ^= 1
            j = sum(b << (N_Q - 1 - q) for q, b in enumerate(bits))
            mat[j, i] = 1.0
        _CNOT_CACHE[key] = mat
    return _CNOT_CACHE[key]


# === QBM Ansatz ===
# Per layer: Ry(4 qubits) → CNOTs → Ry(4 qubits)
# CNOT pattern: (0,1) system-system, (0,2) and (1,3) system-ancilla
CNOTS = [(0, 1), (0, 2), (1, 3)]
CNOT_MATS = [_cnot_matrix(c, t) for c, t in CNOTS]
PARAMS_PER_LAYER = 8  # two Ry sublayers × 4 qubits

def qbm_statevector(params, n_layers):
    """Prepare |ψ(θ)⟩ on 4 qubits."""
    state = np.zeros(DIM, dtype=complex)
    state[0] = 1.0
    idx = 0
    for _ in range(n_layers):
        # Ry sublayer
        for q in range(N_Q):
            state = _gate_on_qubit(_ry(params[idx]), q) @ state
            idx += 1
        # CNOT entangling layer
        for mat in CNOT_MATS:
            state = mat @ state
        # Second Ry sublayer
        for q in range(N_Q):
            state = _gate_on_qubit(_ry(params[idx]), q) @ state
            idx += 1
    return state

def partial_trace_ancilla(state):
    """Trace out ancilla (q2,q3) → 4×4 system density matrix on (q0,q1)."""
    # Reshape: (dim_sys=4, dim_anc=4)
    psi = state.reshape(4, 4)
    return psi @ psi.conj().T

def von_neumann_entropy(rho):
    eigs = np.linalg.eigvalsh(rho)
    eigs = eigs[eigs > 1e-15]
    return -np.sum(eigs * np.log(eigs))

def purity(rho):
    return np.real(np.trace(rho @ rho))


# =====================================================================
# Part 3: Training
# =====================================================================

def variational_free_energy(params, H, beta, n_layers):
    """F(θ) = Tr[ρ_sys H] - (1/β) S(ρ_sys). Minimized by the Gibbs state."""
    state = qbm_statevector(params, n_layers)
    rho = partial_trace_ancilla(state)
    U = np.real(np.trace(rho @ H))
    S = von_neumann_entropy(rho)
    T = 1.0 / beta
    return U - T * S

def train_qbm(H, beta, n_layers=2, restarts=10):
    n_params = n_layers * PARAMS_PER_LAYER
    best = None
    for _ in range(restarts):
        p0 = np.random.randn(n_params) * 0.5
        res = minimize(variational_free_energy, p0, args=(H, beta, n_layers),
                       method='L-BFGS-B', options={'maxiter': 500, 'ftol': 1e-12})
        if best is None or res.fun < best.fun:
            best = res
    return best


# =====================================================================
# Part 4: Hardware circuit generation
# =====================================================================

def _oqasm_prep(params, n_layers):
    """OpenQASM 2.0 state-preparation gates."""
    lines = []
    idx = 0
    for _ in range(n_layers):
        for q in range(4):
            lines.append(f'ry({params[idx]:.8f}) q[{q}];'); idx += 1
        for c, t in CNOTS:
            lines.append(f'cx q[{c}], q[{t}];')
        for q in range(4):
            lines.append(f'ry({params[idx]:.8f}) q[{q}];'); idx += 1
    return lines

def openqasm_circuits(params, n_layers):
    """3 OpenQASM 2.0 circuits for Z, X, Y basis measurement of system qubits."""
    hdr = ['OPENQASM 2.0;', 'include "qelib1.inc";', 'qreg q[4];', 'creg c[4];']
    meas = [f'measure q[{i}] -> c[{i}];' for i in range(4)]
    prep = _oqasm_prep(params, n_layers)
    return {
        'Z': '\n'.join(hdr + prep + meas),
        'X': '\n'.join(hdr + prep + ['h q[0];', 'h q[1];'] + meas),
        'Y': '\n'.join(hdr + prep + ['sdg q[0];', 'h q[0];', 'sdg q[1];', 'h q[1];'] + meas),
    }

def _cqasm_prep(params, n_layers):
    """cQASM 3.0 state-preparation gates."""
    lines = []
    idx = 0
    for _ in range(n_layers):
        for q in range(4):
            lines.append(f'Ry({params[idx]:.8f}) q[{q}]'); idx += 1
        for c, t in CNOTS:
            lines.append(f'CNOT q[{c}], q[{t}]')
        for q in range(4):
            lines.append(f'Ry({params[idx]:.8f}) q[{q}]'); idx += 1
    return lines

def cqasm_circuits(params, n_layers):
    """3 cQASM 3.0 circuits for QI emulator / Tuna-9."""
    hdr = ['version 3.0', 'qubit[4] q', 'bit[4] b']
    meas = ['b = measure q']
    prep = _cqasm_prep(params, n_layers)
    return {
        'Z': '\n'.join(hdr + prep + meas),
        'X': '\n'.join(hdr + prep + ['H q[0]', 'H q[1]'] + meas),
        'Y': '\n'.join(hdr + prep + ['Sdag q[0]', 'H q[0]', 'Sdag q[1]', 'H q[1]'] + meas),
    }


# =====================================================================
# Part 5: Hardware result analysis
# =====================================================================

def energy_from_counts(z_counts, x_counts, y_counts):
    """
    Reconstruct ⟨H⟩ from 4-qubit measurement counts.

    System qubits: q0, q1.  Ancilla: q2, q3 (marginalized out).
    Bitstring convention (MSB-first): str[0]=q3, str[1]=q2, str[2]=q1, str[3]=q0.
    """
    def pauli_expect(counts, q0_pauli, q1_pauli):
        total = sum(counts.values())
        val = 0
        for bs, n in counts.items():
            q0 = int(bs[3])  # system qubit 0
            q1 = int(bs[2])  # system qubit 1
            sign = 1
            if q0_pauli == 'Z': sign *= (-1)**q0
            if q1_pauli == 'Z': sign *= (-1)**q1
            val += sign * n
        return val / total

    E = COEFFS['II']
    E += COEFFS['ZI'] * pauli_expect(z_counts, 'Z', 'I')
    E += COEFFS['IZ'] * pauli_expect(z_counts, 'I', 'Z')
    E += COEFFS['ZZ'] * pauli_expect(z_counts, 'Z', 'Z')
    # X-basis: H rotates X→Z, so Z-measurement in rotated frame = X-measurement
    E += COEFFS['XX'] * pauli_expect(x_counts, 'Z', 'Z')
    # Y-basis: Sdg+H rotates Y→Z
    E += COEFFS['YY'] * pauli_expect(y_counts, 'Z', 'Z')
    return E


# =====================================================================
# Main
# =====================================================================

def main():
    N_LAYERS = 2
    n_cnots = N_LAYERS * len(CNOTS)
    n_params = N_LAYERS * PARAMS_PER_LAYER

    print("=" * 65)
    print("  QUANTUM BOLTZMANN MACHINE: H2 THERMAL STATES")
    print("  Purification method — 2 system + 2 ancilla qubits")
    print("=" * 65)

    print(f"\n  H2 eigenvalues:  {EIGENVALUES}")
    print(f"  Ground state:    {E_GROUND:.6f} Ha")
    print(f"  Energy gap:      {ENERGY_GAP:.4f} Ha")
    print(f"  Ansatz:          {n_params} Ry params, {n_cnots} CNOTs, {N_LAYERS} layers")

    # Temperature range: from ~zero (β·gap >> 1) to hot (β·gap << 1)
    temps = [0.01, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0]
    exact = exact_thermal(H_2q, temps)

    print(f"\n--- Exact thermal properties ---")
    print(f"  {'T':>6} {'β':>8} {'U (Ha)':>10} {'S':>8} {'F (Ha)':>10} {'Purity':>8}")
    print("  " + "-" * 54)
    for e in exact:
        print(f"  {e['T']:>6.2f} {e['beta']:>8.1f} {e['U']:>10.6f} "
              f"{e['S']:>8.4f} {e['F']:>10.6f} {e['purity']:>8.4f}")

    # Train QBM at each temperature
    print(f"\n--- Training QBM ---")
    np.random.seed(42)
    qbm_results = []

    for i, T in enumerate(temps):
        beta = 1.0 / max(T, 1e-12)
        print(f"\n  T={T:.2f} (β={beta:.1f}) ... ", end="", flush=True)
        res = train_qbm(H_2q, beta, N_LAYERS, restarts=15)

        state = qbm_statevector(res.x, N_LAYERS)
        rho = partial_trace_ancilla(state)
        U = np.real(np.trace(rho @ H_2q))
        S = von_neumann_entropy(rho)
        F = U - T * S
        pur = purity(rho)
        dU = abs(U - exact[i]['U']) * 1000
        dF = abs(F - exact[i]['F']) * 1000

        print(f"U={U:.6f} (Δ={dU:.2f} mHa), S={S:.4f}, purity={pur:.4f}")

        qbm_results.append({
            'T': T, 'beta': float(beta),
            'U': float(U), 'S': float(S), 'F': float(F),
            'purity': float(pur),
            'exact_U': exact[i]['U'], 'exact_S': exact[i]['S'],
            'exact_F': exact[i]['F'], 'exact_purity': exact[i]['purity'],
            'delta_U_mHa': float(dU), 'delta_F_mHa': float(dF),
            'rho_eigenvalues': np.sort(np.linalg.eigvalsh(rho))[::-1].tolist(),
            'params': res.x.tolist(),
            'converged': bool(res.success),
        })

    # Generate hardware circuits at 3 temperatures
    hw_temps = [0.1, 0.5, 2.0]
    circuits = {}
    print(f"\n--- Hardware circuits for T = {hw_temps} ---")
    for T in hw_temps:
        r = next(r for r in qbm_results if r['T'] == T)
        p = np.array(r['params'])
        circuits[str(T)] = {
            'openqasm': openqasm_circuits(p, N_LAYERS),
            'cqasm': cqasm_circuits(p, N_LAYERS),
            'expected_U': r['U'],
        }
        print(f"  T={T}: expected U = {r['U']:.6f} Ha  "
              f"(3 circuits × {n_cnots} CNOTs)")

    # Save everything
    output = {
        'molecule': 'H2',
        'bond_distance_A': 0.735,
        'method': 'variational_qbm_purification',
        'n_system_qubits': 2,
        'n_ancilla_qubits': 2,
        'n_layers': N_LAYERS,
        'n_params': n_params,
        'n_cnots_per_circuit': n_cnots,
        'cnot_pattern': CNOTS,
        'hamiltonian': COEFFS,
        'eigenvalues': EIGENVALUES.tolist(),
        'ground_energy': float(E_GROUND),
        'energy_gap': float(ENERGY_GAP),
        'qbm_results': qbm_results,
        'circuits': circuits,
    }
    path = 'experiments/h2_qbm_output.json'
    with open(path, 'w') as f:
        json.dump(output, f, indent=2)
    print(f"\n  Saved to {path}")

    # Summary table
    print(f"\n{'=' * 65}")
    print("  SUMMARY: QBM vs Exact")
    print(f"{'=' * 65}")
    print(f"  {'T':>5} {'QBM U':>10} {'Exact U':>10} {'ΔU mHa':>8} "
          f"{'QBM S':>7} {'Exact S':>7} {'Purity':>7}")
    print("  " + "-" * 58)
    for r in qbm_results:
        print(f"  {r['T']:>5.2f} {r['U']:>10.6f} {r['exact_U']:>10.6f} "
              f"{r['delta_U_mHa']:>8.2f} {r['S']:>7.4f} {r['exact_S']:>7.4f} "
              f"{r['purity']:>7.4f}")

    print(f"\n  VQE ground state:  {E_GROUND:.6f} Ha")
    r0 = qbm_results[0]
    print(f"  QBM at T=0.01:     {r0['U']:.6f} Ha (Δ = {r0['delta_U_mHa']:.2f} mHa)")
    r_hot = next(r for r in qbm_results if r['T'] == 2.0)
    print(f"  QBM at T=2.0:      {r_hot['U']:.6f} Ha, "
          f"S={r_hot['S']:.4f} (purity {r_hot['purity']:.4f})")
    print(f"\n  At low T, QBM recovers the VQE ground state (pure, purity≈1).")
    print(f"  At high T, QBM learns a mixed thermal state — inaccessible to VQE.")

if __name__ == '__main__':
    main()
