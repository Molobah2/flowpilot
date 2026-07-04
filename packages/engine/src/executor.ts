import { FlowVault, ContractCallError } from "flowvault-sdk";
import type { ExecutionPlan, PlanStep, RoutingStep, DepositStep } from "./compiler";

export interface StepRecord {
  stepIndex: number;
  stepType: PlanStep["type"];
  label?: string;
  txId: string;
  status: "confirmed" | "failed";
  confirmedAt: string;
  explorerUrl: string;
}

export interface ExecutionRecord {
  planId: string;
  policyName: string;
  totalAmount: bigint;
  startedAt: string;
  finishedAt: string | null;
  status: "success" | "degraded" | "failed";
  steps: StepRecord[];
  error?: string;
  incomingTxId?: string;
}

export interface ExecutorConfig {
  sdk: FlowVault;
  senderAddress: string;
  hiroApiUrl: string;
  txTimeoutMs?: number;
  txPollIntervalMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;   // 5 minutes per step
const DEFAULT_POLL_MS = 5_000;

function explorerUrl(txId: string, network: string): string {
  return network === "mainnet"
    ? `https://explorer.hiro.so/txid/${txId}`
    : `https://explorer.hiro.so/txid/${txId}?chain=testnet`;
}

async function pollTxConfirmed(
  txId: string,
  hiroApiUrl: string,
  timeoutMs: number,
  pollIntervalMs: number
): Promise<"success" | "abort_by_response" | "abort_by_post_condition" | "timeout"> {
  const deadline = Date.now() + timeoutMs;
  const url = `${hiroApiUrl}/extended/v1/tx/${txId}`;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as { tx_status?: string };
        const status = data.tx_status;
        if (status === "success") return "success";
        if (status === "abort_by_response") return "abort_by_response";
        if (status === "abort_by_post_condition") return "abort_by_post_condition";
        // pending or microblock — keep polling
      }
    } catch {
      // network hiccup — keep polling
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  return "timeout";
}

export async function executePlan(
  plan: ExecutionPlan,
  config: ExecutorConfig,
  incomingTxId?: string
): Promise<ExecutionRecord> {
  const {
    sdk,
    senderAddress,
    hiroApiUrl,
    txTimeoutMs = DEFAULT_TIMEOUT_MS,
    txPollIntervalMs = DEFAULT_POLL_MS,
  } = config;

  const planId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const record: ExecutionRecord = {
    planId,
    policyName: plan.policyName,
    totalAmount: plan.totalAmount,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    status: "failed",
    steps: [],
    incomingTxId,
  };

  const network = "testnet";

  for (let i = 0; i < plan.allSteps.length; i++) {
    const step = plan.allSteps[i];
    let txId: string;

    try {
      if (step.type === "setRoutingRules") {
        const s = step as RoutingStep;
        const result = await sdk.setRoutingRules({
          splitAddress: s.splitAddress,
          splitAmount: s.splitAmount,
          lockAmount: s.lockAmount,
          lockUntilBlock: s.lockUntilBlock,
        });
        if (result.status !== "success") {
          throw new ContractCallError(`setRoutingRules broadcast failed: ${result.status}`);
        }
        txId = result.txId;
      } else if (step.type === "deposit") {
        const s = step as DepositStep;
        const result = await sdk.deposit(s.amount);
        if (result.status !== "success") {
          throw new ContractCallError(`deposit broadcast failed: ${result.status}`);
        }
        txId = result.txId;
      } else {
        // clearRoutingRules
        const result = await sdk.clearRoutingRules();
        if (result.status !== "success") {
          throw new ContractCallError(`clearRoutingRules broadcast failed: ${result.status}`);
        }
        txId = result.txId;
      }

      // Poll for on-chain confirmation before proceeding
      const confirmStatus = await pollTxConfirmed(
        txId,
        hiroApiUrl,
        txTimeoutMs,
        txPollIntervalMs
      );

      const label =
        step.type === "deposit"
          ? (step as DepositStep).label
          : step.type === "setRoutingRules"
          ? (step as RoutingStep).splitAddress ?? "reserve"
          : undefined;

      if (confirmStatus === "success") {
        record.steps.push({
          stepIndex: i,
          stepType: step.type,
          label,
          txId,
          status: "confirmed",
          confirmedAt: new Date().toISOString(),
          explorerUrl: explorerUrl(txId, network),
        });
      } else {
        record.steps.push({
          stepIndex: i,
          stepType: step.type,
          label,
          txId,
          status: "failed",
          confirmedAt: new Date().toISOString(),
          explorerUrl: explorerUrl(txId, network),
        });
        record.status = "degraded";
        record.error = `Step ${i} (${step.type}) ended with tx status: ${confirmStatus}`;
        record.finishedAt = new Date().toISOString();
        return record;
      }
    } catch (err) {
      record.status = "degraded";
      record.error = `Step ${i} (${step.type}) threw: ${String(err)}`;
      record.finishedAt = new Date().toISOString();
      return record;
    }
  }

  // Final state verification
  try {
    const state = await sdk.getVaultState(senderAddress);
    console.log(
      `[executor] getVaultState after plan: total=${state.totalBalance}, locked=${state.lockedBalance}, unlocked=${state.unlockedBalance}`
    );
  } catch (err) {
    console.warn(`[executor] getVaultState check failed (non-fatal): ${String(err)}`);
  }

  record.status = "success";
  record.finishedAt = new Date().toISOString();
  return record;
}
