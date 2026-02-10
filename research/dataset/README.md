# AI x Quantum Experiment Dataset

**Project**: Quantum Inspire — AI x Quantum (TU Delft / QuTech)
**Date**: February 2026
**Repository**: https://github.com/JDerekLomas/quantuminspire

## Overview

This dataset documents experiments conducted by AI agents (Claude Opus 4.6 and Gemini 3 Flash) on quantum computing hardware and emulators, including paper replications, entanglement characterization, variational algorithms, and LLM code generation benchmarks.

## Dataset Structure

```
research/dataset/
├── README.md                          # This file
├── experiment_summary.csv             # All experiments in tabular form
├── hardware_comparison.csv            # Cross-backend results
├── benchmark_summary.csv              # LLM code generation benchmark
├── replication_summary.csv            # Paper replication outcomes
└── figures/                           # (generated from data)
```

## Hardware Platforms

| Platform | ID | Qubits | Type | Access |
|---|---|---|---|---|
| qxelarator | emulator | N/A | Local emulator | QI SDK |
| IBM Marrakesh | ibm_marrakesh | 156 | Superconducting (Eagle r3) | IBM Quantum |
| IBM Torino | ibm_torino | 133 | Superconducting (Heron r2) | IBM Quantum |
| QI Tuna-9 | tuna-9 | 9 | Superconducting (transmon) | Quantum Inspire |

## Experiment Types

1. **Entanglement characterization** — Bell states, GHZ states
2. **Variational quantum eigensolver (VQE)** — H2 and HeH+ molecules
3. **Quantum benchmarking** — Randomized benchmarking, quantum volume
4. **Quantum optimization** — QAOA MaxCut
5. **Quantum randomness** — QRNG certification (NIST SP 800-22)
6. **Paper replication** — Sagastizabal 2019, Peruzzo 2014, Cross 2019
7. **LLM code generation** — Qiskit HumanEval (151 tasks)

## Citation

If using this dataset, please cite:
```
Lomas, D. et al. (2026). AI-Driven Replication of Quantum Computing Experiments:
A Cross-Platform Study. TU Delft / QuTech.
```
