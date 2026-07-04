import "dotenv/config";
import { FlowVault } from "flowvault-sdk";
import {
  compilePolicy,
  executePlan,
  SpendGate,
  dateToBlockHeight,
  quickBlockHeight,
} from "flowpilot-engine";
import type { IncomingTransfer } from "./watcher";
import { startWatcher } from "./watcher";
import { IdempotencyStore } from "./idempotency";
import { saveExecution } from "./persistence";
import {
  FLOWVAULT_CONFIG,
  TREASURY_ADDRESS,
  HIRO_API_URL,
  POLL_INTERVAL_MS,
  MAX_PER_EXECUTION,
  MAX_PER_DAY,
  GATE_STATE_PATH,
  IDEMPOTENCY_PATH,
  EXECUTIONS_PATH,
  loadPolicy,
} from "./config";

// Single-flight lock: never interleave two execution plans
let executing = false;

async function main() {
  console.log(`[runner] FlowPilot Runner starting`);
  console.log(`[runner] Treasury address: ${TREASURY_ADDRESS}`);

  const policy = loadPolicy();
  console.log(`[runner] Active policy: "${policy.name}"`);
  console.log(`[runner]   Recipients: ${policy.recipients.map((r) => `${r.label ?? r.address} (${r.sharePct}%)`).join(", ")}`);
  console.log(`[runner]   Reserve: ${policy.reservePct}%  Hold: ${policy.holdPct}%`);

  const sdk = new FlowVault(FLOWVAULT_CONFIG);

  const gate = new SpendGate({
    maxPerExecution: MAX_PER_EXECUTION,
    maxPerDay: MAX_PER_DAY,
    stateFilePath: GATE_STATE_PATH,
  });

  const idempotency = new IdempotencyStore(IDEMPOTENCY_PATH);

  const TOKEN_ADDRESS =
    process.env.NEXT_PUBLIC_FLOWVAULT_TOKEN_CONTRACT_ADDRESS ??
    "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
  const TOKEN_NAME =
    process.env.NEXT_PUBLIC_FLOWVAULT_TOKEN_CONTRACT_NAME ?? "usdcx";

  await startWatcher(
    TREASURY_ADDRESS,
    TOKEN_ADDRESS,
    TOKEN_NAME,
    HIRO_API_URL,
    POLL_INTERVAL_MS,
    async (transfer: IncomingTransfer) => {
      if (executing) {
        console.warn(`[runner] Execution already in progress — skipping ${transfer.txId}`);
        return;
      }

      // Mark as processed immediately (idempotency: restart safety)
      idempotency.mark(transfer.txId);
      executing = true;

      try {
        await handleDeposit(sdk, policy, gate, transfer);
      } finally {
        executing = false;
      }
    },
    (txId) => idempotency.has(txId)
  );
}

async function handleDeposit(
  sdk: FlowVault,
  policy: ReturnType<typeof loadPolicy>,
  gate: SpendGate,
  transfer: IncomingTransfer
) {
  console.log(`\n[runner] === Handling deposit ${transfer.txId} ===`);
  console.log(`[runner] Amount: ${transfer.amount} micro-USDCx from ${transfer.sender}`);

  // Gate check
  const gateResult = gate.check(transfer.amount);
  if (!gateResult.allowed) {
    console.error(`[runner] GATE BLOCKED: ${gateResult.reason}`);
    // Log the blocked attempt but don't retry
    return;
  }

  // Compute lockUntilBlock if policy has a reserve with unlock date
  let lockUntilBlock = 0;
  let blockRateEstimate = null;
  if (policy.reservePct > 0 && policy.unlockAt) {
    console.log(`[runner] Computing lock block for ${policy.unlockAt}...`);
    const blockInfo = await dateToBlockHeight(
      policy.unlockAt,
      sdk,
      TREASURY_ADDRESS
    );
    lockUntilBlock = blockInfo.lockUntilBlock;
    blockRateEstimate = blockInfo.blockRateEstimate;
    console.log(`[runner] lockUntilBlock: ${lockUntilBlock} (msPerBlock: ${blockRateEstimate.msPerBlock.toFixed(0)}ms)`);
  } else {
    lockUntilBlock = await quickBlockHeight(sdk, TREASURY_ADDRESS);
  }

  // Compile the plan
  const plan = compilePolicy(policy, transfer.amount, lockUntilBlock, blockRateEstimate);
  console.log(`[runner] Compiled plan: ${plan.tranches.length} tranches, ${plan.allSteps.length} steps`);
  plan.tranches.forEach((t) =>
    console.log(`  [tranche] ${t.label}: split=${t.setRules.splitAmount}, lock=${t.setRules.lockAmount}, deposit=${t.deposit.amount}`)
  );

  // Execute
  const record = await executePlan(plan, {
    sdk,
    senderAddress: TREASURY_ADDRESS,
    hiroApiUrl: HIRO_API_URL,
    txTimeoutMs: 300_000,
    txPollIntervalMs: 5_000,
  }, transfer.txId);

  // Persist execution record
  saveExecution(EXECUTIONS_PATH, record);

  if (record.status === "success") {
    gate.record(transfer.amount);
    console.log(`\n[runner] ✓ Plan executed successfully`);
    record.steps.forEach((s) =>
      console.log(`  [${s.stepType}] ${s.label ?? ""}: ${s.explorerUrl}`)
    );
  } else {
    console.error(`\n[runner] ✗ Plan ${record.status}: ${record.error}`);
    console.error(`[runner] Completed steps before failure:`);
    record.steps.forEach((s) =>
      console.error(`  [${s.stepType}] ${s.label ?? ""}: ${s.explorerUrl} — ${s.status}`)
    );
  }
}

main().catch((err) => {
  console.error("[runner] Fatal:", err);
  process.exit(1);
});
