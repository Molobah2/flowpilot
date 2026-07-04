/**
 * Smoke test: compile a 2-recipient policy and execute on testnet via backend signer.
 * Run: npx ts-node src/smoketest.ts
 *
 * Requires env vars:
 *   STACKS_PRIVATE_KEY   — runner's testnet private key
 *   RECIPIENT_A          — any valid testnet Stacks address
 *   RECIPIENT_B          — any valid testnet Stacks address
 *   SMOKE_AMOUNT_MICRO   — micro-USDCx to distribute (default: 2_000_000 = 2 USDCx)
 */
import { FlowVault, DEFAULT_CONTRACTS } from "flowvault-sdk";
import { PolicySchema } from "./policy";
import { compilePolicy } from "./compiler";
import { executePlan } from "./executor";
import { quickBlockHeight } from "./blocks";

async function main() {
  const key = process.env.STACKS_PRIVATE_KEY;
  if (!key) throw new Error("STACKS_PRIVATE_KEY not set");

  const recipientA = process.env.RECIPIENT_A;
  const recipientB = process.env.RECIPIENT_B;
  if (!recipientA || !recipientB)
    throw new Error("RECIPIENT_A and RECIPIENT_B must be set");

  const totalMicro = BigInt(process.env.SMOKE_AMOUNT_MICRO ?? "2000000");

  const contracts = DEFAULT_CONTRACTS["testnet"];
  const sdk = new FlowVault({
    network: "testnet",
    ...contracts,
    senderKey: key,
  });

  // Derive sender address for read-only calls
  const { getAddressFromPrivateKey } = await import("@stacks/transactions");
  const senderAddress = getAddressFromPrivateKey(key, "testnet");
  console.log(`\n[smoke] Treasury address: ${senderAddress}`);

  // Check raw USDCx wallet balance (NOT vault balance — deposit() moves wallet→vault)
  const TOKEN_ID = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx::usdcx-token";
  const balRes = await fetch(
    `https://api.testnet.hiro.so/extended/v1/address/${senderAddress}/balances`
  );
  const balData = (await balRes.json()) as {
    fungible_tokens?: Record<string, { balance: string }>;
  };
  const rawBalance = BigInt(
    balData.fungible_tokens?.[TOKEN_ID]?.balance ?? "0"
  );
  console.log(`[smoke] USDCx wallet balance: ${rawBalance} micro-USDCx`);

  if (rawBalance < totalMicro) {
    console.warn(
      `[smoke] WARNING: wallet balance (${rawBalance}) < smoke amount (${totalMicro}). ` +
      `Fund ${senderAddress} with testnet USDCx first.`
    );
    process.exit(1);
  }

  // Vault state before (will be 0 if no prior deposits — that's correct)
  const before = await sdk.getVaultState(senderAddress);
  console.log(`[smoke] Vault BEFORE: total=${before.totalBalance}, unlocked=${before.unlockedBalance}`);

  // Policy: Alice 60%, Bob 40%
  const policy = PolicySchema.parse({
    name: "smoke-test-2recipient",
    recipients: [
      { address: recipientA, sharePct: 60, label: "Alice" },
      { address: recipientB, sharePct: 40, label: "Bob" },
    ],
    reservePct: 0,
    holdPct: 0,
    trigger: "manual",
  });

  const currentBlock = await quickBlockHeight(sdk, senderAddress);
  console.log(`[smoke] Current block height: ${currentBlock}`);

  const plan = compilePolicy(policy, totalMicro, 0, null);
  console.log(`\n[smoke] Compiled plan:`);
  console.log(JSON.stringify(plan, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));

  console.log(`\n[smoke] Executing plan...`);
  const record = await executePlan(plan, {
    sdk,
    senderAddress,
    hiroApiUrl: "https://api.testnet.hiro.so",
    txTimeoutMs: 300_000,
    txPollIntervalMs: 5_000,
  });

  console.log(`\n[smoke] Execution record:`);
  console.log(JSON.stringify(record, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));

  if (record.status !== "success") {
    console.error(`[smoke] FAILED: ${record.error}`);
    process.exit(1);
  }

  // Verify via getVaultState
  const after = await sdk.getVaultState(senderAddress);
  console.log(`\n[smoke] Vault AFTER: total=${after.totalBalance}, unlocked=${after.unlockedBalance}, locked=${after.lockedBalance}`);

  console.log("\n[smoke] GATE 1 PASSED ✓");
  console.log("Explorer links:");
  for (const step of record.steps) {
    console.log(`  [${step.stepType}] ${step.label ?? ""}: ${step.explorerUrl}`);
  }
}

main().catch((err) => {
  console.error("[smoke] Fatal:", err);
  process.exit(1);
});
