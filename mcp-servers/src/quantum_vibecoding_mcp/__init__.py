"""Quantum Vibecoding MCP servers.

Three Model Context Protocol servers that let Claude talk to real quantum
hardware through natural language:

- ``qvc-qi``   — Quantum Inspire circuit execution (Tuna-9, emulator)
- ``qvc-ibm``  — IBM Quantum job submission
- ``qvc-qrng`` — Quantum random number generator (QI Tuna-9 + ANU fallback)

See https://quantumvibecoding.org for setup.
"""

__version__ = "0.1.0"
