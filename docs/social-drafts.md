# Social Media Drafts — Quantum Vibecoding Launch

## Twitter/X

Quantum Vibecoding: run experiments on real quantum hardware using natural language.

Paste one link into Claude Code. In under 15 minutes you're submitting circuits to superconducting qubits — no SDK code, no quantum programming experience needed. Python 3.9-3.13, all free tier hardware.

We used this setup to replicate 6 published quantum papers across 3 chips. 93% of claims passed.

Open source, free hardware access, 12 quantum tools:
https://haiqu.org/get-started

Built at TU Delft / QuTech. 445 sessions, 349 prompts, 0 lines of quantum code written by hand.

---

## Hacker News

**Title:** Quantum Vibecoding – Run circuits on real quantum hardware via Claude Code MCP servers

**Post:**

We connected Claude Code to three quantum backends (Quantum Inspire Tuna-9, IBM Torino, ANU QRNG) via MCP servers — simple Python wrappers around vendor SDKs that expose submit/check/get-results as tools.

You describe an experiment in natural language. The agent writes cQASM 3.0 or OpenQASM 2.0, submits to hardware, polls for results, and analyzes the measurement histogram. A local emulator works instantly with no accounts.

We used this to replicate 6 published quantum computing papers (Sagastizabal 2019, Peruzzo 2014, Cross 2019, etc.) across 3 hardware platforms, testing 27 specific claims. 93% passed. The 7% that failed were genuinely interesting — hardware noise amplifies Hamiltonian coefficient errors in predictable ways.

We also benchmarked 12 LLMs on Qiskit HumanEval (151 quantum programming tasks). General-purpose frontier models beat every fine-tuned quantum specialist zero-shot. Adding RAG pushed accuracy to 70.9%.

Setup: paste `https://haiqu.org/get-started` into Claude Code and it sets itself up. Or manually: clone the repo, `pip install -r mcp-servers/requirements.txt`, run `claude`. Python 3.9-3.13 supported, .mcp.json auto-configures the servers.

All open source. MCP servers are ~200-400 lines of Python each. Free hardware access on all three platforms.

https://haiqu.org/get-started

Paper (PDF): https://haiqu.org/haiqu-paper.pdf
GitHub: https://github.com/JDerekLomas/quantuminspire

---

## Getting Started (copy-paste for sharing)

Quantum Vibecoding on real quantum hardware in under 15 minutes.

Paste this into Claude Code:

    Set me up for quantum vibecoding: https://haiqu.org/get-started

What happens:
1. Claude reads the page and clones the repo
2. Sets up a Python virtual environment and installs dependencies (3.9-3.13)
3. MCP servers start automatically — 3 quantum backends become available as tools
4. You ask for an experiment in natural language. Claude writes the circuit, runs it, and analyzes results.

12 tools across 3 backends: Quantum Inspire (9 qubits, unlimited free), IBM Quantum (133 qubits, 10 min/month free), Quantum Random (ANU vacuum fluctuations).

No accounts needed for the local emulator. Add real hardware when you're ready.

https://haiqu.org/get-started
