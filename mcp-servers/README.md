# quantum-vibecoding-mcp

Model Context Protocol servers that let Claude run real quantum experiments on real hardware through natural language.

Three servers ship in one package:

| Command | What it does | Backend |
|---|---|---|
| `qvc-qi` | Submit cQASM 3.0 circuits, poll jobs, fetch histograms | [Quantum Inspire](https://www.quantum-inspire.com) (Tuna-9, emulator) |
| `qvc-ibm` | Run circuits on IBM Quantum processors | IBM Quantum (Heron, Eagle, etc.) |
| `qvc-qrng` | Generate true quantum random numbers | QI Tuna-9 + ANU fallback |

## Install

The recommended path uses [`uvx`](https://docs.astral.sh/uv/) — no manual install needed.

### Claude Code (CLI / Desktop)

Add to your `.mcp.json` (project-level) or `~/.claude.json` (global):

```json
{
  "mcpServers": {
    "qi-circuits": {
      "type": "stdio",
      "command": "uvx",
      "args": ["--from", "quantum-vibecoding-mcp[qi]", "qvc-qi"]
    }
  }
}
```

For all three servers:

```json
{
  "mcpServers": {
    "qi-circuits": {
      "command": "uvx",
      "args": ["--from", "quantum-vibecoding-mcp[qi]", "qvc-qi"]
    },
    "ibm-quantum": {
      "command": "uvx",
      "args": ["--from", "quantum-vibecoding-mcp[ibm]", "qvc-ibm"]
    },
    "qrng": {
      "command": "uvx",
      "args": ["--from", "quantum-vibecoding-mcp[qi]", "qvc-qrng"]
    }
  }
}
```

### Manual install

```bash
pip install "quantum-vibecoding-mcp[all]"
qvc-qi   # then point claude at this binary
```

## Authentication

| Backend | How |
|---|---|
| Quantum Inspire | Run `qi login` once — opens a browser, stores creds in `~/.quantuminspire/config.json` |
| IBM Quantum | Set `IBM_QUANTUM_TOKEN` env var (get one at [quantum.ibm.com](https://quantum.ibm.com)) |

## Hello world

After config, prompt Claude:

> Submit a Bell-state circuit to QI's local emulator with 1024 shots and show me the histogram.

Claude calls `qi_run_local`, you see `{"00": ~512, "11": ~512}`.

## Tools

`qvc-qi` exposes: `qi_list_backends`, `qi_submit_circuit`, `qi_check_job`, `qi_get_results`, `qi_run_local`.

`qvc-ibm` exposes: `ibm_list_backends`, `ibm_submit_circuit`, `ibm_check_job`, `ibm_get_results`.

`qvc-qrng` exposes: `quantum_random_int`, `quantum_coin_flip`, `quantum_random_hex`, `quantum_dice_roll`, and friends.

## Hardware notes

Tuna-9 (Quantum Inspire) native gate set: `CZ, Ry, Rz, X`. Pass `compile_stage="routing"` to let QI's compiler decompose for you.

Bitstrings are MSB-first across the board — qubit 0 is the leftmost character. See the [Quantum Vibecoding paper](https://quantumvibecoding.org/quantum-vibecoding-paper.pdf) §3.4 for the conventions and silent-bug list.

## Development

```bash
git clone https://github.com/JDerekLomas/quantuminspire.git
cd quantuminspire/mcp-servers
pip install -e ".[all]"
```

## License

MIT.
