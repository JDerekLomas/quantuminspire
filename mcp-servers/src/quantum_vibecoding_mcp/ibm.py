"""IBM Quantum Circuit Execution MCP Server.

Exposes tools for submitting OpenQASM 2.0 circuits to IBM Quantum
hardware, checking job status, and retrieving measurement results.

Auth: reuses ~/.qiskit/qiskit-ibm.json from QiskitRuntimeService.save_account().
"""

import json
import logging
import sys
import traceback

from mcp.server.fastmcp import FastMCP

logging.basicConfig(level=logging.INFO, stream=sys.stderr)
logger = logging.getLogger("ibm-quantum")

mcp = FastMCP("IBM Quantum")

# ---------------------------------------------------------------------------
# Lazy singletons — created on first use so server starts fast
# ---------------------------------------------------------------------------
_service = None


def _get_service():
    global _service
    if _service is None:
        from qiskit_ibm_runtime import QiskitRuntimeService
        _service = QiskitRuntimeService(channel='ibm_cloud')
        logger.info("QiskitRuntimeService initialized (ibm_cloud)")
    return _service


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

@mcp.tool()
def ibm_list_backends() -> str:
    """List available IBM Quantum backends with qubit counts and status.

    Returns JSON array of backends including name, number of qubits,
    and operational status. Requires IBM Quantum credentials
    (~/.qiskit/qiskit-ibm.json).
    """
    try:
        service = _get_service()
        backends = service.backends()

        results = []
        for b in backends:
            entry = {
                "name": b.name,
                "num_qubits": b.num_qubits,
                "operational": b.status().operational,
                "pending_jobs": b.status().pending_jobs,
                "status_msg": b.status().status_msg,
            }
            results.append(entry)

        return json.dumps(results, indent=2, default=str)
    except Exception as e:
        return json.dumps({"error": str(e), "traceback": traceback.format_exc()})


@mcp.tool()
def ibm_submit_circuit(
    qasm: str,
    backend_name: str = "",
    shots: int = 4096,
) -> str:
    """Submit an OpenQASM 2.0 circuit to IBM Quantum hardware.

    Returns the job_id immediately. Use ibm_check_job / ibm_get_results to
    poll for completion. Requires IBM Quantum credentials.

    Args:
        qasm: A complete OpenQASM 2.0 circuit string (must start with 'OPENQASM 2.0;')
        backend_name: IBM backend name (e.g. 'ibm_torino'). If empty, selects least busy backend.
        shots: Number of measurement shots (1-100000, default 4096)
    """
    try:
        from qiskit import QuantumCircuit, transpile
        from qiskit_ibm_runtime import SamplerV2

        service = _get_service()

        # Parse the OpenQASM circuit
        circuit = QuantumCircuit.from_qasm_str(qasm)
        num_qubits = circuit.num_qubits

        # Select backend
        if backend_name:
            backend = service.backend(backend_name)
        else:
            backend = service.least_busy(operational=True, min_num_qubits=num_qubits)

        # Transpile — use coupling_map + basis_gates to avoid backend plugin issues
        try:
            transpiled = transpile(circuit, backend=backend, optimization_level=1)
        except Exception:
            # Fallback: extract topology manually to bypass ibm_dynamic_circuits plugin
            transpiled = transpile(
                circuit,
                coupling_map=backend.coupling_map,
                basis_gates=list(backend.operation_names),
                optimization_level=1,
            )

        # Submit via SamplerV2
        sampler = SamplerV2(backend)
        job = sampler.run([transpiled], shots=shots)

        return json.dumps({
            "job_id": job.job_id(),
            "status": "SUBMITTED",
            "backend": backend.name,
            "backend_qubits": backend.num_qubits,
            "circuit_qubits": num_qubits,
            "transpiled_depth": transpiled.depth(),
            "transpiled_gates": dict(transpiled.count_ops()),
            "shots": shots,
            "message": f"Circuit submitted. Use ibm_check_job('{job.job_id()}') to check status.",
        }, default=str)
    except Exception as e:
        return json.dumps({"error": str(e), "traceback": traceback.format_exc()})


@mcp.tool()
def ibm_check_job(job_id: str) -> str:
    """Check the status of an IBM Quantum job.

    Returns job metadata including status (QUEUED, RUNNING, DONE, ERROR).

    Args:
        job_id: The job ID returned by ibm_submit_circuit
    """
    try:
        service = _get_service()
        job = service.job(job_id)

        result = {
            "job_id": job_id,
            "status": str(job.status()),
            "backend": job.backend().name,
        }

        # Safely extract timing metadata
        metrics = job.metrics() if hasattr(job, 'metrics') else {}
        if metrics:
            for key in ["timestamps", "usage"]:
                if key in metrics:
                    result[key] = metrics[key]

        return json.dumps(result, indent=2, default=str)
    except Exception as e:
        return json.dumps({"error": str(e), "traceback": traceback.format_exc()})


@mcp.tool()
def ibm_get_results(job_id: str) -> str:
    """Get measurement results for a completed IBM Quantum job.

    Returns the measurement histogram (bitstring counts). Returns an
    error if the job is not yet completed.

    Args:
        job_id: The job ID returned by ibm_submit_circuit
    """
    try:
        service = _get_service()
        job = service.job(job_id)

        status = str(job.status())
        if status != "DONE":
            return json.dumps({
                "job_id": job_id,
                "status": status,
                "message": "Job not yet completed. Try again later.",
            })

        result = job.result()

        # Extract counts from each pub result
        # DataBin attributes are named after classical registers (e.g. 'c', 'meas')
        pub_results = []
        for i, pub in enumerate(result):
            data_bin = pub.data
            # Find the BitArray attribute dynamically
            counts = None
            for attr_name in dir(data_bin):
                if attr_name.startswith("_"):
                    continue
                attr = getattr(data_bin, attr_name, None)
                if hasattr(attr, "get_counts"):
                    counts = attr.get_counts()
                    break
            if counts is None:
                counts = {"error": f"No BitArray found in DataBin (attrs: {[a for a in dir(data_bin) if not a.startswith('_')]})"}
            pub_results.append({
                "pub_index": i,
                "counts": counts,
                "total_shots": sum(counts.values()) if isinstance(counts, dict) and all(isinstance(v, (int, float)) for v in counts.values()) else 0,
            })

        return json.dumps({
            "job_id": job_id,
            "status": "DONE",
            "backend": job.backend().name,
            "results": pub_results,
        }, indent=2, default=str)
    except Exception as e:
        return json.dumps({"error": str(e), "traceback": traceback.format_exc()})


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
