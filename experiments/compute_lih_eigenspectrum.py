"""Compute LiH eigenspectrum for quantum synth sonification.

Uses scipy sparse eigensolver to find lowest 30 eigenvalues efficiently
(instead of full diagonalization of 4096x4096 matrix).
"""
import json
import numpy as np
from scipy.sparse.linalg import eigsh
from openfermion import MolecularData, jordan_wigner, get_sparse_operator
from openfermionpyscf import run_pyscf

NUM_EIGENVALUES = 30  # Enough unique levels for sonification
distances = np.round(np.linspace(0.8, 4.0, 33), 2).tolist()
results = []

for i, r in enumerate(distances):
    print(f"[{i+1}/{len(distances)}] r = {r:.2f} Å ...", end=" ", flush=True)
    mol = MolecularData(
        geometry=[('Li', (0, 0, 0)), ('H', (0, 0, r))],
        basis='sto-3g',
        multiplicity=1,
        charge=0,
    )
    mol = run_pyscf(mol)
    hamiltonian = jordan_wigner(mol.get_molecular_hamiltonian())
    sparse_h = get_sparse_operator(hamiltonian)

    # Use sparse eigensolver for lowest k eigenvalues (MUCH faster than full diag)
    eigenvalues, _ = eigsh(sparse_h.real, k=NUM_EIGENVALUES, which='SA')
    eigenvalues = np.sort(eigenvalues)

    # Keep unique levels (collapse degeneracies within tolerance)
    unique = []
    prev = None
    for ev in eigenvalues:
        if prev is None or abs(ev - prev) > 1e-6:
            unique.append(float(ev))
            prev = ev
        if len(unique) >= 20:
            break

    ground = unique[0]
    gaps = [round(e - ground, 8) for e in unique]

    results.append({
        'r': r,
        'eigenvalues': [round(e, 8) for e in unique],
        'gaps': gaps,
    })
    print(f"E0 = {ground:.6f} Ha, {len(unique)} unique levels", flush=True)

output = {
    'molecule': 'LiH',
    'basis': 'sto-3g',
    'distances': results,
}

outpath = '/Users/dereklomas/haiqu/public/data/lih-eigenspectrum.json'
with open(outpath, 'w') as f:
    json.dump(output, f, indent=2)

print(f"\nDone! Wrote {outpath}")
