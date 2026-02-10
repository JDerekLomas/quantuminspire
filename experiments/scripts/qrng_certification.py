"""Quantum Randomness Certification — NIST SP 800-22 Statistical Tests.

Generates random bitstreams from three quantum sources and runs
a battery of statistical tests to certify randomness quality:

1. ANU QRNG — vacuum fluctuation measurements (optical)
2. QI Tuna-9 — spin qubit superposition (real hardware)
3. qxelarator — local quantum circuit emulator

Each test produces a p-value. p > 0.01 → sequence passes (looks random).

Usage:
    python experiments/scripts/qrng_certification.py [--bits N] [--output FILE]
"""

import argparse
import json
import math
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from scipy.special import erfc, gammaincc
from scipy.fft import fft

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

ANU_API = "https://qrng.anu.edu.au/API/jsonI.php"
TUNA9_BACKEND_ID = 6
DEFAULT_BITS = 80_000  # 10,000 bytes — good balance of speed vs. statistical power
ALPHA = 0.01  # significance level


# ---------------------------------------------------------------------------
# Sample generation
# ---------------------------------------------------------------------------

def fetch_anu_bytes(n_bytes: int, retries: int = 3) -> bytes:
    """Fetch random bytes from the ANU QRNG API with retries."""
    all_bytes = bytearray()
    batch = 1024
    for i in range(0, n_bytes, batch):
        count = min(batch, n_bytes - i)
        params = urllib.parse.urlencode({"type": "uint8", "length": count})
        url = f"{ANU_API}?{params}"
        for attempt in range(retries):
            try:
                req = urllib.request.Request(url)
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = json.loads(resp.read())
                if not data.get("success"):
                    raise RuntimeError("ANU returned success=false")
                all_bytes.extend(data["data"])
                break
            except Exception as e:
                if attempt == retries - 1:
                    raise
                print(f"  ANU retry {attempt + 1}/{retries}: {e}")
                time.sleep(2 ** attempt)  # exponential backoff
        if i + batch < n_bytes:
            time.sleep(0.2)  # rate limit courtesy
    return bytes(all_bytes[:n_bytes])


def fetch_tuna9_bytes(n_bytes: int) -> bytes:
    """Generate random bytes from Tuna-9 spin qubits via Hadamard circuits."""
    from quantuminspire.sdk.models.cqasm_algorithm import CqasmAlgorithm
    from quantuminspire.sdk.models.job_options import JobOptions
    from quantuminspire.util.api.remote_backend import RemoteBackend

    circuit = """version 3.0

qubit[8] q
bit[8] b

H q[0]
H q[1]
H q[2]
H q[3]
H q[4]
H q[5]
H q[6]
H q[7]

b = measure q"""

    backend = RemoteBackend()
    all_bytes = bytearray()
    max_shots = 1024  # smaller batches — Tuna-9 handles these faster

    while len(all_bytes) < n_bytes:
        shots = min(max_shots, n_bytes - len(all_bytes))
        algo = CqasmAlgorithm(platform_name="Quantum Inspire", program_name="qrng_cert")
        algo._content = circuit
        options = JobOptions(number_of_shots=shots)

        job_id = backend.run(algo, backend_type_id=TUNA9_BACKEND_ID, options=options)
        print(f"  Tuna-9 job {job_id} submitted ({shots} shots)...")

        # Poll for completion
        deadline = time.time() + 120  # 2 minutes per job
        while time.time() < deadline:
            job = backend.get_job(job_id)
            status = str(getattr(job, "status", ""))
            if "COMPLETED" in status:
                break
            if "FAILED" in status or "ERROR" in status:
                raise RuntimeError(f"Job {job_id} failed: {status}")
            time.sleep(1)
        else:
            raise TimeoutError(f"Job {job_id} timed out")

        # Get results
        raw = backend.get_results(job_id)
        items = raw.items if hasattr(raw, "items") else raw
        histogram = None
        for item in items:
            if hasattr(item, "results") and item.results:
                histogram = item.results
                break
        if not histogram:
            raise RuntimeError(f"No results for job {job_id}")

        # Expand histogram to bytes
        for bitstring, count in histogram.items():
            val = int(bitstring, 2)
            all_bytes.extend([val] * int(count))

        print(f"  Job {job_id} done — {len(all_bytes)}/{n_bytes} bytes collected")

    return bytes(all_bytes[:n_bytes])


def fetch_emulator_bytes(n_bytes: int) -> bytes:
    """Generate random bytes from the local quantum emulator."""
    from quantuminspire.util.api.local_backend import LocalBackend

    circuit = """version 3.0

qubit[8] q
bit[8] b

H q[0]
H q[1]
H q[2]
H q[3]
H q[4]
H q[5]
H q[6]
H q[7]

b = measure q"""

    backend = LocalBackend()
    all_bytes = bytearray()
    max_shots = 4096

    while len(all_bytes) < n_bytes:
        shots = min(max_shots, n_bytes - len(all_bytes))
        result = backend.run_quantum(circuit, number_of_shots=shots)
        histogram = result.results if hasattr(result, "results") else result
        for bitstring, count in histogram.items():
            val = int(bitstring, 2)
            all_bytes.extend([val] * int(count))

    return bytes(all_bytes[:n_bytes])


def bytes_to_bits(data: bytes) -> np.ndarray:
    """Convert bytes to a numpy array of bits (0s and 1s)."""
    bits = np.unpackbits(np.frombuffer(data, dtype=np.uint8))
    return bits


# ---------------------------------------------------------------------------
# NIST SP 800-22 Statistical Tests
# ---------------------------------------------------------------------------

def frequency_test(bits: np.ndarray) -> dict:
    """Test 1: Frequency (Monobit) — are 0s and 1s equally likely?"""
    n = len(bits)
    s = np.sum(2 * bits.astype(int) - 1)
    s_obs = abs(s) / math.sqrt(n)
    p_value = erfc(s_obs / math.sqrt(2))
    return {
        "test": "Frequency (Monobit)",
        "statistic": float(s_obs),
        "p_value": float(p_value),
        "pass": p_value >= ALPHA,
        "ones_fraction": float(np.mean(bits)),
    }


def block_frequency_test(bits: np.ndarray, block_size: int = 128) -> dict:
    """Test 2: Block Frequency — are 0s and 1s balanced in each block?"""
    n = len(bits)
    n_blocks = n // block_size
    if n_blocks == 0:
        return {"test": "Block Frequency", "p_value": 0.0, "pass": False, "error": "too few bits"}

    blocks = bits[:n_blocks * block_size].reshape(n_blocks, block_size)
    proportions = np.mean(blocks, axis=1)
    chi_sq = 4 * block_size * np.sum((proportions - 0.5) ** 2)
    p_value = gammaincc(n_blocks / 2, chi_sq / 2)
    return {
        "test": "Block Frequency",
        "block_size": block_size,
        "n_blocks": n_blocks,
        "statistic": float(chi_sq),
        "p_value": float(p_value),
        "pass": p_value >= ALPHA,
    }


def runs_test(bits: np.ndarray) -> dict:
    """Test 3: Runs — are runs of consecutive identical bits as expected?"""
    n = len(bits)
    pi = np.mean(bits)

    # Pre-test: if proportion is too far from 0.5, skip
    tau = 2 / math.sqrt(n)
    if abs(pi - 0.5) >= tau:
        return {
            "test": "Runs",
            "p_value": 0.0,
            "pass": False,
            "note": f"Pre-test failed: pi={pi:.4f}, tau={tau:.4f}",
        }

    # Count runs
    v_obs = 1 + np.sum(bits[1:] != bits[:-1])
    p_value = erfc(abs(v_obs - 2 * n * pi * (1 - pi)) / (2 * math.sqrt(2 * n) * pi * (1 - pi)))
    return {
        "test": "Runs",
        "observed_runs": int(v_obs),
        "expected_runs": float(2 * n * pi * (1 - pi)),
        "statistic": float(v_obs),
        "p_value": float(p_value),
        "pass": p_value >= ALPHA,
    }


def longest_run_test(bits: np.ndarray) -> dict:
    """Test 4: Longest Run of Ones in a Block."""
    n = len(bits)

    # Parameters depend on block size
    if n < 6272:
        return {"test": "Longest Run of Ones", "p_value": 0.0, "pass": False, "error": "too few bits (need >=6272)"}
    elif n < 750_000:
        M, K = 8, 3
        N = n // M
        v_values = [1, 2, 3, 4]  # bins for longest run lengths
        pi = [0.2148, 0.3672, 0.2305, 0.1875]
    else:
        M, K = 10000, 5
        N = n // M
        v_values = [10, 11, 12, 13, 14, 15]
        pi = [0.0882, 0.2092, 0.2483, 0.1933, 0.1208, 0.0675 + 0.0727]

    blocks = bits[:N * M].reshape(N, M)

    # Find longest run of ones in each block
    v = np.zeros(len(v_values), dtype=int)
    for block in blocks:
        max_run = 0
        current_run = 0
        for bit in block:
            if bit == 1:
                current_run += 1
                max_run = max(max_run, current_run)
            else:
                current_run = 0

        if max_run <= v_values[0]:
            v[0] += 1
        elif max_run >= v_values[-1]:
            v[-1] += 1
        else:
            for i in range(1, len(v_values)):
                if max_run == v_values[i]:
                    v[i] += 1
                    break

    chi_sq = np.sum((v - N * np.array(pi)) ** 2 / (N * np.array(pi)))
    p_value = gammaincc(K / 2, chi_sq / 2)
    return {
        "test": "Longest Run of Ones",
        "block_size": M,
        "statistic": float(chi_sq),
        "p_value": float(p_value),
        "pass": p_value >= ALPHA,
    }


def spectral_test(bits: np.ndarray) -> dict:
    """Test 5: Discrete Fourier Transform (Spectral) — detect periodic features."""
    n = len(bits)
    x = 2 * bits.astype(float) - 1  # map to +1/-1
    S = np.abs(fft(x))
    S = S[:n // 2]  # first half

    T = math.sqrt(math.log(1 / 0.05) * n)  # threshold
    N0 = 0.95 * n / 2  # expected peaks below threshold
    N1 = np.sum(S < T)  # observed peaks below threshold

    d = (N1 - N0) / math.sqrt(n * 0.95 * 0.05 / 4)
    p_value = erfc(abs(d) / math.sqrt(2))
    return {
        "test": "Spectral (DFT)",
        "threshold": float(T),
        "expected_below": float(N0),
        "observed_below": int(N1),
        "statistic": float(d),
        "p_value": float(p_value),
        "pass": p_value >= ALPHA,
    }


def serial_test(bits: np.ndarray, m: int = 2) -> dict:
    """Test 6: Serial — are all m-bit patterns equally likely?"""
    n = len(bits)
    # Augment the sequence
    augmented = np.concatenate([bits, bits[:m - 1]])

    def psi_sq(block_len):
        if block_len == 0:
            return 0.0
        counts = {}
        for i in range(n):
            pattern = tuple(augmented[i:i + block_len])
            counts[pattern] = counts.get(pattern, 0) + 1
        return (2 ** block_len / n) * sum(c ** 2 for c in counts.values()) - n

    psi_m = psi_sq(m)
    psi_m1 = psi_sq(m - 1)
    psi_m2 = psi_sq(m - 2) if m >= 2 else 0

    del1 = psi_m - psi_m1
    del2 = psi_m - 2 * psi_m1 + psi_m2

    p_value1 = gammaincc(2 ** (m - 2), del1 / 2)
    p_value2 = gammaincc(2 ** (m - 3), del2 / 2) if m >= 3 else 1.0

    return {
        "test": f"Serial (m={m})",
        "del1": float(del1),
        "del2": float(del2),
        "p_value": float(p_value1),
        "p_value2": float(p_value2),
        "pass": p_value1 >= ALPHA and p_value2 >= ALPHA,
    }


def approximate_entropy_test(bits: np.ndarray, m: int = 4) -> dict:
    """Test 7: Approximate Entropy — sequence complexity measure."""
    n = len(bits)
    augmented = np.concatenate([bits, bits[:m]])

    def phi(block_len):
        counts = {}
        for i in range(n):
            pattern = tuple(augmented[i:i + block_len])
            counts[pattern] = counts.get(pattern, 0) + 1
        probs = np.array(list(counts.values())) / n
        return np.sum(probs * np.log(probs))

    phi_m = phi(m)
    phi_m1 = phi(m + 1)
    ap_en = phi_m - phi_m1

    chi_sq = 2 * n * (math.log(2) - ap_en)
    p_value = gammaincc(2 ** (m - 1), chi_sq / 2)
    return {
        "test": f"Approximate Entropy (m={m})",
        "approximate_entropy": float(ap_en),
        "statistic": float(chi_sq),
        "p_value": float(p_value),
        "pass": p_value >= ALPHA,
    }


def cumulative_sums_test(bits: np.ndarray) -> dict:
    """Test 8: Cumulative Sums — does the random walk stay centered?"""
    n = len(bits)
    x = 2 * bits.astype(int) - 1
    S = np.cumsum(x)
    z = np.max(np.abs(S))

    # Compute p-value
    sum1 = 0.0
    sum2 = 0.0
    k_start = int((-n / z + 1) / 4)
    k_end = int((n / z - 1) / 4) + 1
    for k in range(k_start, k_end + 1):
        import scipy.stats as st
        sum1 += st.norm.cdf((4 * k + 1) * z / math.sqrt(n)) - st.norm.cdf((4 * k - 1) * z / math.sqrt(n))
    for k in range(k_start, k_end + 1):
        sum2 += st.norm.cdf((4 * k + 3) * z / math.sqrt(n)) - st.norm.cdf((4 * k + 1) * z / math.sqrt(n))
    p_value = 1 - sum1 + sum2

    # Clamp to [0, 1]
    p_value = max(0.0, min(1.0, p_value))
    return {
        "test": "Cumulative Sums",
        "max_excursion": int(z),
        "p_value": float(p_value),
        "pass": p_value >= ALPHA,
    }


# ---------------------------------------------------------------------------
# Run all tests
# ---------------------------------------------------------------------------

def run_all_tests(bits: np.ndarray) -> list[dict]:
    """Run the full NIST test battery on a bitstream."""
    return [
        frequency_test(bits),
        block_frequency_test(bits),
        runs_test(bits),
        longest_run_test(bits),
        spectral_test(bits),
        serial_test(bits, m=2),
        approximate_entropy_test(bits, m=4),
        cumulative_sums_test(bits),
    ]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="NIST SP 800-22 Quantum Randomness Certification")
    parser.add_argument("--bits", type=int, default=DEFAULT_BITS, help="Number of bits per source")
    parser.add_argument("--output", type=str, default=None, help="Output JSON file path")
    parser.add_argument("--skip-tuna", action="store_true", help="Skip Tuna-9 hardware (faster)")
    parser.add_argument("--skip-anu", action="store_true", help="Skip ANU QRNG")
    args = parser.parse_args()

    n_bytes = args.bits // 8
    sources = {}

    # Collect samples
    print(f"\n=== NIST SP 800-22 Quantum Randomness Certification ===")
    print(f"    Sample size: {args.bits:,} bits ({n_bytes:,} bytes) per source\n")

    if not args.skip_anu:
        print("[1/3] Fetching from ANU QRNG (vacuum fluctuations)...")
        t0 = time.time()
        try:
            anu_bytes = fetch_anu_bytes(n_bytes)
            sources["anu_qrng"] = {
                "name": "ANU QRNG",
                "method": "Vacuum fluctuations of the electromagnetic field",
                "hardware": "Optical homodyne detection (ANU, Canberra)",
                "bytes": n_bytes,
                "fetch_time_s": round(time.time() - t0, 2),
                "data": anu_bytes,
            }
            print(f"  Done in {sources['anu_qrng']['fetch_time_s']}s\n")
        except Exception as e:
            print(f"  FAILED: {e}\n")

    if not args.skip_tuna:
        print("[2/3] Fetching from QI Tuna-9 (spin qubit superposition)...")
        t0 = time.time()
        try:
            tuna_bytes = fetch_tuna9_bytes(n_bytes)
            sources["tuna9"] = {
                "name": "QI Tuna-9",
                "method": "Hadamard gate superposition on electron spin qubits",
                "hardware": "9-qubit spin processor (QuTech, TU Delft)",
                "bytes": n_bytes,
                "fetch_time_s": round(time.time() - t0, 2),
                "data": tuna_bytes,
            }
            print(f"  Done in {sources['tuna9']['fetch_time_s']}s\n")
        except Exception as e:
            print(f"  FAILED: {e}\n")

    print("[3/3] Fetching from qxelarator (local quantum emulator)...")
    t0 = time.time()
    emu_bytes = fetch_emulator_bytes(n_bytes)
    sources["emulator"] = {
        "name": "qxelarator",
        "method": "Simulated Hadamard + measurement (quantum circuit emulator)",
        "hardware": "Local CPU (qxelarator)",
        "bytes": n_bytes,
        "fetch_time_s": round(time.time() - t0, 2),
        "data": emu_bytes,
    }
    print(f"  Done in {sources['emulator']['fetch_time_s']}s\n")

    # Run tests
    results = {}
    for key, source in sources.items():
        print(f"--- Testing: {source['name']} ---")
        bits = bytes_to_bits(source["data"])[:args.bits]
        tests = run_all_tests(bits)

        passed = sum(1 for t in tests if t["pass"])
        total = len(tests)
        print(f"  {passed}/{total} tests passed")
        for t in tests:
            status = "PASS" if t["pass"] else "FAIL"
            print(f"  [{status}] {t['test']}: p={t['p_value']:.6f}")
        print()

        results[key] = {
            "source": source["name"],
            "method": source["method"],
            "hardware": source["hardware"],
            "n_bits": args.bits,
            "fetch_time_s": source["fetch_time_s"],
            "tests": tests,
            "passed": passed,
            "total": total,
            "pass_rate": round(passed / total, 4),
        }

    # Summary
    print("=== SUMMARY ===\n")
    print(f"{'Source':<25} {'Passed':<10} {'Rate':<10} {'Fetch Time':<12}")
    print("-" * 57)
    for key, r in results.items():
        print(f"{r['source']:<25} {r['passed']}/{r['total']:<7} {r['pass_rate']:.0%}{'':<6} {r['fetch_time_s']}s")

    # Save experiment result
    experiment = {
        "experiment_id": "qrng-certification-001",
        "experiment_type": "qrng-certification",
        "title": "NIST SP 800-22 Quantum Randomness Certification",
        "description": "Statistical certification of three quantum random sources using NIST SP 800-22 test battery",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "parameters": {
            "n_bits": args.bits,
            "n_bytes": n_bytes,
            "alpha": ALPHA,
            "tests": [
                "Frequency (Monobit)", "Block Frequency", "Runs",
                "Longest Run of Ones", "Spectral (DFT)", "Serial",
                "Approximate Entropy", "Cumulative Sums",
            ],
        },
        "results": results,
        "analysis": {
            "conclusion": _make_conclusion(results),
        },
    }

    output_path = args.output or "experiments/results/qrng-certification-001.json"
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(experiment, f, indent=2, default=str)
    print(f"\nResults saved to {output_path}")


def _make_conclusion(results: dict) -> str:
    parts = []
    for key, r in results.items():
        if r["pass_rate"] >= 1.0:
            parts.append(f"{r['source']}: All {r['total']} tests passed — randomness is statistically indistinguishable from ideal.")
        elif r["pass_rate"] >= 0.75:
            parts.append(f"{r['source']}: {r['passed']}/{r['total']} tests passed — minor deviations detected but generally random.")
        else:
            parts.append(f"{r['source']}: {r['passed']}/{r['total']} tests passed — significant deviations from randomness detected.")
    return " | ".join(parts)


if __name__ == "__main__":
    main()
