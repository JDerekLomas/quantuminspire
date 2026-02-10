"""Tests for quantum primitives used in the experiment daemon.

Validates:
1. The 24 single-qubit Clifford gates are distinct and form a group
2. Clifford inverse computation is correct
3. The QV ideal simulator produces correct probabilities for known circuits
"""
import sys
import math
import numpy as np
import pytest

sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent.parent))
from agents.experiment_daemon import (
    SINGLE_QUBIT_CLIFFORDS,
    _clifford_matrix,
    _CLIFF_MATS,
    _find_inverse_clifford,
    _ideal_qv_probs,
)


# ─── Clifford Group Tests ───────────────────────────────────────────────────

class TestCliffordGroup:
    """Verify the 24 single-qubit Cliffords form a valid group."""

    def test_exactly_24_cliffords(self):
        assert len(SINGLE_QUBIT_CLIFFORDS) == 24
        assert len(_CLIFF_MATS) == 24

    def test_all_unitary(self):
        """Each Clifford matrix must be unitary: U^dag U = I."""
        for i, mat in enumerate(_CLIFF_MATS):
            product = mat.conj().T @ mat
            np.testing.assert_allclose(
                product, np.eye(2), atol=1e-10,
                err_msg=f"Clifford {i} is not unitary"
            )

    def test_all_distinct(self):
        """All 24 Cliffords must be distinct (up to global phase)."""
        # Two unitaries are the same Clifford iff they differ by at most a global phase.
        # Compare by normalizing: divide by first nonzero element.
        def normalize(mat):
            flat = mat.flatten()
            for v in flat:
                if abs(v) > 1e-10:
                    return mat / v
            return mat

        normalized = [normalize(m) for m in _CLIFF_MATS]
        for i in range(24):
            for j in range(i + 1, 24):
                # They should NOT be equal
                if np.allclose(normalized[i], normalized[j], atol=1e-8):
                    pytest.fail(
                        f"Cliffords {i} and {j} are the same (up to global phase):\n"
                        f"  {i}: {SINGLE_QUBIT_CLIFFORDS[i]}\n"
                        f"  {j}: {SINGLE_QUBIT_CLIFFORDS[j]}"
                    )

    def test_closure(self):
        """Product of any two Cliffords must be another Clifford in the set."""
        for i in range(24):
            for j in range(24):
                product = _CLIFF_MATS[i] @ _CLIFF_MATS[j]
                # Find which Clifford this matches
                found = False
                for k in range(24):
                    # Check if product == phase * C_k
                    ratio = None
                    match = True
                    for r in range(2):
                        for c in range(2):
                            if abs(_CLIFF_MATS[k][r, c]) > 1e-10:
                                this_ratio = product[r, c] / _CLIFF_MATS[k][r, c]
                                if ratio is None:
                                    ratio = this_ratio
                                elif abs(this_ratio - ratio) > 1e-8:
                                    match = False
                                    break
                            elif abs(product[r, c]) > 1e-10:
                                match = False
                                break
                        if not match:
                            break
                    if match and ratio is not None:
                        found = True
                        break
                assert found, f"C_{i} * C_{j} is not in the Clifford group"

    def test_identity_is_first(self):
        """Clifford 0 should be the identity."""
        np.testing.assert_allclose(
            _CLIFF_MATS[0], np.eye(2), atol=1e-10
        )

    def test_inverse_computation(self):
        """For every Clifford, _find_inverse_clifford should return its actual inverse."""
        for i in range(24):
            inv_idx = _find_inverse_clifford(_CLIFF_MATS[i])
            product = _CLIFF_MATS[inv_idx] @ _CLIFF_MATS[i]
            # Product should be proportional to identity
            assert abs(abs(product[0, 0]) - 1) < 1e-8, \
                f"Inverse of Clifford {i} (index {inv_idx}) doesn't give identity"
            assert abs(product[0, 1]) < 1e-8, \
                f"Inverse of Clifford {i} has off-diagonal elements"

    def test_inverse_of_composition(self):
        """Inverse of a random composition of Cliffords should work."""
        rng = np.random.RandomState(42)
        for _ in range(50):
            # Random sequence of 1-20 Cliffords
            length = rng.randint(1, 21)
            indices = rng.randint(0, 24, size=length)
            composed = np.eye(2, dtype=complex)
            for idx in indices:
                composed = _CLIFF_MATS[idx] @ composed
            inv_idx = _find_inverse_clifford(composed)
            product = _CLIFF_MATS[inv_idx] @ composed
            assert abs(abs(product[0, 0]) - 1) < 1e-6, \
                f"Failed for sequence {indices.tolist()}: inv_idx={inv_idx}"


# ─── QV Ideal Simulator Tests ───────────────────────────────────────────────

class TestQVSimulator:
    """Validate the QV ideal simulator against known circuits."""

    def test_identity_circuit(self):
        """No gates applied: should give |0> with probability 1."""
        circuit = """version 3.0
qubit[1] q
bit[1] b

b = measure q"""
        probs = _ideal_qv_probs(circuit, 1)
        np.testing.assert_allclose(probs, [1.0, 0.0], atol=1e-10)

    def test_x_gate(self):
        """X gate: |0> -> |1>."""
        circuit = """version 3.0
qubit[1] q
bit[1] b

X q[0]
b = measure q"""
        probs = _ideal_qv_probs(circuit, 1)
        np.testing.assert_allclose(probs, [0.0, 1.0], atol=1e-10)

    def test_hadamard(self):
        """H gate: |0> -> |+> = equal superposition."""
        circuit = """version 3.0
qubit[1] q
bit[1] b

H q[0]
b = measure q"""
        probs = _ideal_qv_probs(circuit, 1)
        np.testing.assert_allclose(probs, [0.5, 0.5], atol=1e-10)

    def test_bell_state(self):
        """H + CNOT: should give 50% |00> and 50% |11>."""
        circuit = """version 3.0
qubit[2] q
bit[2] b

H q[0]
CNOT q[0], q[1]
b = measure q"""
        probs = _ideal_qv_probs(circuit, 2)
        np.testing.assert_allclose(probs, [0.5, 0.0, 0.0, 0.5], atol=1e-10)

    def test_ghz_3qubit(self):
        """H + CNOT chain: 50% |000> + 50% |111>."""
        circuit = """version 3.0
qubit[3] q
bit[3] b

H q[0]
CNOT q[0], q[1]
CNOT q[1], q[2]
b = measure q"""
        probs = _ideal_qv_probs(circuit, 3)
        expected = np.zeros(8)
        expected[0] = 0.5  # |000>
        expected[7] = 0.5  # |111>
        np.testing.assert_allclose(probs, expected, atol=1e-10)

    def test_ry_rotation(self):
        """Ry(pi/2) on |0> gives equal superposition."""
        circuit = f"""version 3.0
qubit[1] q
bit[1] b

Ry({math.pi / 2:.6f}) q[0]
b = measure q"""
        probs = _ideal_qv_probs(circuit, 1)
        np.testing.assert_allclose(probs, [0.5, 0.5], atol=1e-6)

    def test_rz_phase(self):
        """Rz on |0> doesn't change measurement probabilities."""
        circuit = f"""version 3.0
qubit[1] q
bit[1] b

Rz({math.pi / 3:.6f}) q[0]
b = measure q"""
        probs = _ideal_qv_probs(circuit, 1)
        np.testing.assert_allclose(probs, [1.0, 0.0], atol=1e-10)

    def test_cnot_control_zero(self):
        """CNOT with control=|0> does nothing to target."""
        circuit = """version 3.0
qubit[2] q
bit[2] b

CNOT q[0], q[1]
b = measure q"""
        probs = _ideal_qv_probs(circuit, 2)
        np.testing.assert_allclose(probs, [1.0, 0.0, 0.0, 0.0], atol=1e-10)

    def test_cnot_control_one(self):
        """CNOT with control=|1> flips target."""
        circuit = """version 3.0
qubit[2] q
bit[2] b

X q[0]
CNOT q[0], q[1]
b = measure q"""
        probs = _ideal_qv_probs(circuit, 2)
        # |10> -> CNOT -> |11> = index 3
        np.testing.assert_allclose(probs, [0.0, 0.0, 0.0, 1.0], atol=1e-10)

    def test_probabilities_sum_to_one(self):
        """Any circuit's probabilities must sum to 1."""
        circuit = f"""version 3.0
qubit[3] q
bit[3] b

H q[0]
Ry({1.234:.6f}) q[1]
CNOT q[0], q[2]
Rz({0.567:.6f}) q[1]
H q[2]
CNOT q[1], q[2]
b = measure q"""
        probs = _ideal_qv_probs(circuit, 3)
        assert abs(sum(probs) - 1.0) < 1e-10, f"Probabilities sum to {sum(probs)}"
        assert all(p >= -1e-15 for p in probs), "Negative probability found"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
