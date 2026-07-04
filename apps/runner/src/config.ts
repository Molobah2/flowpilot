import "dotenv/config";
import { getAddressFromPrivateKey, TransactionVersion } from "@stacks/transactions";
import { PolicySchema } from "flowpilot-engine";
import type { Policy } from "flowpilot-engine";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optionalBigInt(name: string, fallback: bigint): bigint {
  const v = process.env[name];
  return v ? BigInt(v) : fallback;
}

export const STACKS_PRIVATE_KEY = required("STACKS_PRIVATE_KEY");
export const HIRO_API_URL = process.env.HIRO_API_URL ?? "https://api.testnet.hiro.so";
export const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS ?? "10000", 10);
export const MAX_PER_EXECUTION = optionalBigInt("FLOWPILOT_MAX_PER_EXECUTION", 50_000_000n); // 50 USDCx
export const MAX_PER_DAY = optionalBigInt("FLOWPILOT_MAX_PER_DAY", 200_000_000n);           // 200 USDCx

export const TREASURY_ADDRESS = (() => {
  try {
    return getAddressFromPrivateKey(STACKS_PRIVATE_KEY, TransactionVersion.Testnet);
  } catch {
    throw new Error("Invalid STACKS_PRIVATE_KEY — cannot derive treasury address");
  }
})();

const FLOWVAULT_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_FLOWVAULT_CONTRACT_ADDRESS ?? "STD7QG84VQQ0C35SZM2EYTHZV4M8FQ0R7YNSQWPD";
const FLOWVAULT_CONTRACT_NAME =
  process.env.NEXT_PUBLIC_FLOWVAULT_CONTRACT_NAME ?? "flowvault-v2";
const TOKEN_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_FLOWVAULT_TOKEN_CONTRACT_ADDRESS ?? "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
const TOKEN_CONTRACT_NAME =
  process.env.NEXT_PUBLIC_FLOWVAULT_TOKEN_CONTRACT_NAME ?? "usdcx";

export const FLOWVAULT_CONFIG = {
  network: "testnet" as const,
  contractAddress: FLOWVAULT_CONTRACT_ADDRESS,
  contractName: FLOWVAULT_CONTRACT_NAME,
  tokenContractAddress: TOKEN_CONTRACT_ADDRESS,
  tokenContractName: TOKEN_CONTRACT_NAME,
  senderKey: STACKS_PRIVATE_KEY,
};

export const GATE_STATE_PATH =
  process.env.GATE_STATE_PATH ?? "./data/gate-state.json";

export const IDEMPOTENCY_PATH =
  process.env.IDEMPOTENCY_PATH ?? "./data/processed-txids.json";

export const EXECUTIONS_PATH =
  process.env.EXECUTIONS_PATH ?? "./data/executions.json";

// Active policy — loaded from env or policy.json
export function loadPolicy(): Policy {
  const policyJson = process.env.FLOWPILOT_POLICY;
  if (!policyJson) {
    // Try loading from file
    try {
      const fs = require("fs") as typeof import("fs");
      const raw = fs.readFileSync("policy.json", "utf8");
      return PolicySchema.parse(JSON.parse(raw));
    } catch {
      throw new Error(
        "No policy configured. Set FLOWPILOT_POLICY env var (JSON) or create policy.json"
      );
    }
  }
  return PolicySchema.parse(JSON.parse(policyJson));
}
