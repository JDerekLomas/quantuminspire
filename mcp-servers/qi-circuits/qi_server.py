"""Quantum Inspire Circuit Execution MCP Server.

Exposes tools for submitting cQASM 3.0 circuits to Quantum Inspire
hardware (remote) or the local qxelarator emulator, checking job
status, and retrieving measurement results.

Auth: reuses ~/.quantuminspire/config.json from `qi login`.
"""

import json
import logging
import sys
import traceback

from mcp.server.fastmcp import FastMCP

logging.basicConfig(level=logging.INFO, stream=sys.stderr)
logger = logging.getLogger("qi-circuits")

# ---------------------------------------------------------------------------
# Monkey-patch: QI API returns image_id longer than the SDK's max_length=16.
# Widen the constraint until upstream fixes it.
# ---------------------------------------------------------------------------
try:
    from compute_api_client.models.backend_type import BackendType as _BT
    for field_name, field_info in _BT.model_fields.items():
        if field_name == "image_id":
            field_info.metadata = [
                m for m in field_info.metadata
                if not (hasattr(m, "max_length") and m.max_length == 16)
            ]
            from annotated_types import MaxLen
            field_info.metadata.append(MaxLen(256))
    _BT.model_rebuild(force=True)
    logger.info("Patched BackendType.image_id max_length")
except Exception as exc:
    logger.warning("Could not patch BackendType.image_id: %s", exc)

mcp = FastMCP("Quantum Inspire Circuits")

# ---------------------------------------------------------------------------
# Lazy singletons — created on first use so server starts fast
# ---------------------------------------------------------------------------
_remote_backend = None
_local_backend = None


def _get_remote():
    global _remote_backend
    if _remote_backend is None:
        from quantuminspire.util.api.remote_backend import RemoteBackend
        _remote_backend = RemoteBackend()
        logger.info("RemoteBackend initialized")
    return _remote_backend


def _reset_remote():
    """Discard the cached RemoteBackend so the next call picks up fresh tokens."""
    global _remote_backend
    _remote_backend = None
    logger.info("RemoteBackend singleton reset")


_AUTH_ERROR_KEYWORDS = ("invalid_grant", "unauthorized", "401", "token", "refresh",
                        "authentication", "forbidden", "403", "expired")


def _is_auth_error(exc: Exception) -> bool:
    """Check whether an exception looks like a stale-token / auth failure."""
    msg = str(exc).lower()
    return any(kw in msg for kw in _AUTH_ERROR_KEYWORDS)


def _with_auth_retry(func, *args, **kwargs):
    """Call *func*; if it raises an auth-related error, reset the remote
    backend singleton and retry once with a fresh RemoteBackend."""
    try:
        return func(*args, **kwargs)
    except Exception as first_exc:
        if not _is_auth_error(first_exc):
            raise
        logger.warning("Auth error detected (%s), resetting RemoteBackend and retrying...",
                       first_exc)
        _reset_remote()
        return func(*args, **kwargs)


def _get_local():
    global _local_backend
    if _local_backend is None:
        from quantuminspire.util.api.local_backend import LocalBackend
        _local_backend = LocalBackend()
        logger.info("LocalBackend initialized")
    return _local_backend


def _make_cqasm_algorithm(circuit: str, name: str = "mcp_circuit", compile_stage=None):
    """Create a CqasmAlgorithm from a raw cQASM string."""
    from quantuminspire.sdk.models.cqasm_algorithm import CqasmAlgorithm

    if compile_stage is not None:
        # Subclass to override the compile_stage property
        class _Algo(CqasmAlgorithm):
            @property
            def compile_stage(self):
                return compile_stage
        algo = _Algo(platform_name="Quantum Inspire", program_name=name)
    else:
        algo = CqasmAlgorithm(platform_name="Quantum Inspire", program_name=name)
    algo._content = circuit
    return algo


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

@mcp.tool()
def qi_list_backends() -> str:
    """List available Quantum Inspire backends with qubit counts and status.

    Returns JSON array of backend types including id, name, description,
    qubit count, and whether the backend is currently available.
    Requires QI authentication (~/.quantuminspire/config.json).
    """
    def _do():
        backend = _get_remote()
        backend_types = backend.get_backend_types()

        results = []
        for bt in backend_types.items if hasattr(backend_types, "items") else backend_types:
            entry = {
                "id": bt.id,
                "name": bt.name,
            }
            # Safely extract optional attributes
            for attr in ["description", "number_of_qubits", "is_allowed", "status"]:
                if hasattr(bt, attr):
                    entry[attr] = getattr(bt, attr)
            results.append(entry)

        return json.dumps(results, indent=2, default=str)

    try:
        return _with_auth_retry(_do)
    except Exception as e:
        return json.dumps({"error": str(e), "traceback": traceback.format_exc()})


@mcp.tool()
def qi_submit_circuit(
    circuit: str,
    backend_type_id: int,
    number_of_shots: int = 1024,
    name: str = "mcp_circuit",
    compile_stage: str = "none",
) -> str:
    """Submit a cQASM 3.0 circuit to Quantum Inspire remote hardware.

    Returns the job_id immediately. Use qi_check_job / qi_get_results to
    poll for completion. Requires QI authentication.

    Args:
        circuit: A complete cQASM 3.0 circuit string (must start with 'version 3.0')
        backend_type_id: QI backend type ID (use qi_list_backends to find available backends, e.g. 6 for Tuna-9)
        number_of_shots: Number of measurement shots (1-4096, default 1024)
        name: Optional name for the circuit project
        compile_stage: Compilation stage. Use 'routing' for pre-compiled circuits in native gate set
            (CZ, Ry, Rz) to skip server-side compilation. Options: none, decomposition, mapping,
            optimization, routing. Default 'none' applies full compilation.
    """
    def _do():
        from compute_api_client import CompileStage
        from quantuminspire.sdk.models.job_options import JobOptions

        stage = CompileStage(compile_stage.lower())
        algo = _make_cqasm_algorithm(circuit, name, compile_stage=stage)

        options = JobOptions(number_of_shots=number_of_shots)
        backend = _get_remote()
        job_id = backend.run(algo, backend_type_id=backend_type_id, options=options)

        return json.dumps({
            "job_id": job_id,
            "status": "SUBMITTED",
            "backend_type_id": backend_type_id,
            "number_of_shots": number_of_shots,
            "compile_stage": compile_stage,
            "message": f"Circuit submitted. Use qi_check_job({job_id}) to check status.",
        })

    try:
        return _with_auth_retry(_do)
    except Exception as e:
        return json.dumps({"error": str(e), "traceback": traceback.format_exc()})


@mcp.tool()
def qi_check_job(job_id: int) -> str:
    """Check the status of a Quantum Inspire job.

    Returns job metadata including status (PLANNED, RUNNING, COMPLETED, FAILED).

    Args:
        job_id: The job ID returned by qi_submit_circuit
    """
    def _do():
        backend = _get_remote()
        job = backend.get_job(job_id)

        result = {"job_id": job_id}
        for attr in ["status", "created_on", "started_on", "completed_on",
                      "status_message", "error_message", "message", "nshots",
                      "queued_at"]:
            if hasattr(job, attr):
                val = getattr(job, attr)
                result[attr] = str(val) if val is not None else None

        return json.dumps(result, default=str)

    try:
        return _with_auth_retry(_do)
    except Exception as e:
        return json.dumps({"error": str(e), "traceback": traceback.format_exc()})


@mcp.tool()
def qi_get_results(job_id: int) -> str:
    """Get measurement results for a completed Quantum Inspire job.

    Returns the measurement histogram (bitstring counts). Returns an
    error if the job is not yet completed.

    Args:
        job_id: The job ID returned by qi_submit_circuit
    """
    def _do():
        backend = _get_remote()

        # get_results returns a PageResult — access .items for the list
        raw = backend.get_results(job_id)
        items = raw.items if hasattr(raw, "items") else (raw or [])

        results_data = []
        for r in items:
            entry = {}
            for attr in ["shots_requested", "shots_done", "results"]:
                if hasattr(r, attr):
                    entry[attr] = getattr(r, attr)
            results_data.append(entry)

        if results_data and any(e.get("results") for e in results_data):
            return json.dumps({"job_id": job_id, "status": "COMPLETED", "results": results_data}, default=str)

        # Job may not be done yet
        job = backend.get_job(job_id)
        status = str(getattr(job, "status", "UNKNOWN"))
        return json.dumps({
            "job_id": job_id,
            "status": status,
            "message": "Job not yet completed or no results available.",
        })

    try:
        return _with_auth_retry(_do)
    except Exception as e:
        return json.dumps({"error": str(e), "traceback": traceback.format_exc()})


@mcp.tool()
def qi_run_local(
    circuit: str,
    number_of_shots: int = 1024,
) -> str:
    """Run a cQASM 3.0 circuit on the local QI emulator (qxelarator).

    Returns measurement results synchronously — no queue, instant execution.
    Great for testing circuits before submitting to real hardware.
    Does NOT require QI authentication.

    Args:
        circuit: A complete cQASM 3.0 circuit string (must start with 'version 3.0')
        number_of_shots: Number of measurement shots (default 1024)
    """
    try:
        import qxelarator
        from qxelarator import SimulationError as QxSimError

        result = qxelarator.execute_string(circuit, iterations=number_of_shots)

        # qxelarator returns SimulationError (not an exception) on failure
        if isinstance(result, QxSimError):
            return json.dumps({
                "error": f"Simulation failed: {result.message}",
                "backend": "qxelarator (local emulator)",
            })

        return json.dumps({
            "results": result.results,
            "shots_requested": result.shots_requested,
            "shots_done": result.shots_done,
            "backend": "qxelarator (local emulator)",
        })
    except Exception as e:
        return json.dumps({"error": str(e), "traceback": traceback.format_exc()})


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
