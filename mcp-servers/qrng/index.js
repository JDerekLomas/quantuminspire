import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const ANU_API = "https://qrng.anu.edu.au/API/jsonI.php";

async function fetchQuantumRandom(type, length, size) {
  const params = new URLSearchParams({ type, length: String(length) });
  if (type === "hex16" && size) params.set("size", String(size));

  const res = await fetch(`${ANU_API}?${params}`);
  if (!res.ok) throw new Error(`ANU QRNG API error: ${res.status}`);

  const json = await res.json();
  if (!json.success) throw new Error("ANU QRNG API returned success=false");
  return json.data;
}

const server = new McpServer({
  name: "Quantum Random Number Generator",
  version: "1.0.0",
});

// Tool: get quantum random integers
server.tool(
  "quantum_random_int",
  "Get true quantum random integers from the ANU QRNG (measured from vacuum fluctuations of light). Returns integers from a real quantum optical source at the Australian National University.",
  {
    count: z
      .number()
      .int()
      .min(1)
      .max(1024)
      .default(1)
      .describe("How many random integers to generate (1-1024)"),
    max: z
      .enum(["255", "65535"])
      .default("255")
      .describe("Maximum value: 255 (uint8) or 65535 (uint16)"),
  },
  async ({ count, max }) => {
    const type = max === "65535" ? "uint16" : "uint8";
    const data = await fetchQuantumRandom(type, count);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            source: "ANU Quantum Random Number Generator",
            method: "Vacuum fluctuations of the electromagnetic field",
            type,
            count,
            numbers: data,
          }),
        },
      ],
    };
  }
);

// Tool: quantum coin flip
server.tool(
  "quantum_coin_flip",
  "Flip a quantum coin (or multiple). Each result is derived from a true quantum random source — not pseudorandom.",
  {
    flips: z
      .number()
      .int()
      .min(1)
      .max(1024)
      .default(1)
      .describe("Number of coin flips (1-1024)"),
  },
  async ({ flips }) => {
    const data = await fetchQuantumRandom("uint8", flips);
    const results = data.map((n) => (n < 128 ? "heads" : "tails"));
    const heads = results.filter((r) => r === "heads").length;
    const tails = flips - heads;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            source: "ANU QRNG",
            flips,
            results,
            summary: { heads, tails },
          }),
        },
      ],
    };
  }
);

// Tool: quantum random hex
server.tool(
  "quantum_random_hex",
  "Get quantum random hex strings. Useful for generating cryptographic tokens, UUIDs, or random identifiers from a true quantum source.",
  {
    count: z
      .number()
      .int()
      .min(1)
      .max(1024)
      .default(1)
      .describe("Number of hex blocks (1-1024)"),
    block_size: z
      .number()
      .int()
      .min(1)
      .max(1024)
      .default(16)
      .describe("Bytes per block (1-1024). 16 = 32 hex chars, like a UUID"),
  },
  async ({ count, block_size }) => {
    const data = await fetchQuantumRandom("hex16", count, block_size);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            source: "ANU QRNG",
            count,
            block_size_bytes: block_size,
            hex_strings: data,
          }),
        },
      ],
    };
  }
);

// Tool: quantum dice roll
server.tool(
  "quantum_dice_roll",
  "Roll quantum dice. Each die result is derived from true quantum randomness.",
  {
    dice: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(1)
      .describe("Number of dice to roll (1-100)"),
    sides: z
      .number()
      .int()
      .min(2)
      .max(100)
      .default(6)
      .describe("Number of sides per die (2-100)"),
  },
  async ({ dice, sides }) => {
    const data = await fetchQuantumRandom("uint16", dice);
    const rolls = data.map((n) => (n % sides) + 1);
    const total = rolls.reduce((a, b) => a + b, 0);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            source: "ANU QRNG",
            dice,
            sides,
            rolls,
            total,
          }),
        },
      ],
    };
  }
);

// Tool: quantum random float
server.tool(
  "quantum_random_float",
  "Get quantum random floating-point numbers between 0 and 1 (exclusive). Derived from true quantum randomness.",
  {
    count: z
      .number()
      .int()
      .min(1)
      .max(1024)
      .default(1)
      .describe("How many random floats to generate (1-1024)"),
  },
  async ({ count }) => {
    const data = await fetchQuantumRandom("uint16", count);
    const floats = data.map((n) => Number((n / 65536).toFixed(8)));
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            source: "ANU QRNG",
            count,
            floats,
          }),
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
