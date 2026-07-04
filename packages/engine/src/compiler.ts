import type { Policy, Recipient } from "./policy";
import type { BlockRateEstimate } from "./blocks";

// Micro-unit bigint helpers
const PCT_SCALE = 10_000n; // 4 decimal places of precision for percentages

export interface RoutingStep {
  type: "setRoutingRules";
  splitAddress: string | null;
  splitAmount: bigint;
  lockAmount: bigint;
  lockUntilBlock: number;
}

export interface DepositStep {
  type: "deposit";
  amount: bigint;
  label: string;
}

export interface ClearStep {
  type: "clearRoutingRules";
}

export type PlanStep = RoutingStep | DepositStep | ClearStep;

export interface Tranche {
  label: string;
  setRules: RoutingStep;
  deposit: DepositStep;
}

export interface ExecutionPlan {
  policyName: string;
  totalAmount: bigint;
  tranches: Tranche[];
  holdTranche: { deposit: DepositStep } | null;
  lockUntilBlock: number;
  blockRateEstimate: BlockRateEstimate | null;
  compiledAt: string;
  allSteps: PlanStep[];
}

function pct(amount: bigint, percentage: number): bigint {
  // Use integer arithmetic: (amount * percentage * 10000) / (100 * 10000)
  const scaled = BigInt(Math.round(percentage * 10_000));
  return (amount * scaled) / (100n * PCT_SCALE);
}

export function compilePolicy(
  policy: Policy,
  totalAmount: bigint,
  lockUntilBlock: number,
  blockRateEstimate: BlockRateEstimate | null
): ExecutionPlan {
  if (totalAmount <= 0n) {
    throw new Error("totalAmount must be positive");
  }

  const tranches: Tranche[] = [];
  let allocated = 0n;

  // Compute each recipient's share in micro-units
  const recipientAmounts: { recipient: Recipient; amount: bigint }[] = [];
  for (const r of policy.recipients) {
    const amount = pct(totalAmount, r.sharePct);
    recipientAmounts.push({ recipient: r, amount });
    allocated += amount;
  }

  const reserveAmount =
    policy.reservePct > 0 ? pct(totalAmount, policy.reservePct) : 0n;
  allocated += reserveAmount;

  // Hold absorbs all rounding remainders — never loses or over-allocates
  const holdAmount = totalAmount - allocated;

  // Validate: no tranche can have split+lock > deposit
  // (all our tranches are exact by construction, so this is a safety assertion)
  for (const { amount } of recipientAmounts) {
    if (amount <= 0n) {
      throw new Error(
        `Recipient share computed to 0 micro-units — amount too small for policy percentages`
      );
    }
  }

  // Build tranches: one per recipient
  // If there is a reserve, combine it into the LAST recipient's tranche
  // to minimize transaction count.
  for (let i = 0; i < recipientAmounts.length; i++) {
    const { recipient, amount: splitAmount } = recipientAmounts[i];
    const isLast = i === recipientAmounts.length - 1;
    const lockAmount = isLast && reserveAmount > 0n ? reserveAmount : 0n;
    const depositAmount = splitAmount + lockAmount;

    // Safety: abort condition check
    if (splitAmount + lockAmount > depositAmount) {
      throw new Error(
        `BUG: split+lock > deposit for tranche "${recipient.label ?? recipient.address}"`
      );
    }

    const setRules: RoutingStep = {
      type: "setRoutingRules",
      splitAddress: recipient.address,
      splitAmount,
      lockAmount,
      lockUntilBlock: lockAmount > 0n ? lockUntilBlock : 0,
    };

    const deposit: DepositStep = {
      type: "deposit",
      amount: depositAmount,
      label: recipient.label ?? recipient.address,
    };

    tranches.push({ label: recipient.label ?? recipient.address, setRules, deposit });
  }

  // If there's a reserve but no recipients, create a standalone reserve tranche
  if (reserveAmount > 0n && policy.recipients.length === 0) {
    const setRules: RoutingStep = {
      type: "setRoutingRules",
      splitAddress: null,
      splitAmount: 0n,
      lockAmount: reserveAmount,
      lockUntilBlock,
    };
    const deposit: DepositStep = {
      type: "deposit",
      amount: reserveAmount,
      label: "reserve",
    };
    tranches.push({ label: "reserve", setRules, deposit });
  }

  const holdTranche: ExecutionPlan["holdTranche"] =
    holdAmount > 0n
      ? {
          deposit: {
            type: "deposit",
            amount: holdAmount,
            label: "hold",
          },
        }
      : null;

  // Flatten all steps in execution order
  const allSteps: PlanStep[] = [];
  for (const t of tranches) {
    allSteps.push(t.setRules);
    allSteps.push(t.deposit);
  }
  if (holdTranche) {
    allSteps.push({ type: "clearRoutingRules" });
    allSteps.push(holdTranche.deposit);
  }

  return {
    policyName: policy.name,
    totalAmount,
    tranches,
    holdTranche,
    lockUntilBlock,
    blockRateEstimate,
    compiledAt: new Date().toISOString(),
    allSteps,
  };
}
