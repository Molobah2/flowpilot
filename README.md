# FlowPilot — Autonomous Treasury Policy Engine

> **Set your rules once. Your treasury manages itself.**

FlowPilot compiles high-level treasury policies (N recipients, percentage splits,
locked reserves, hold slices) into ordered sequences of FlowVault v2 contract calls
and executes them autonomously every time funds arrive — no manual routing, no trust.

Built for the **FlowVault Builder Bounty 2026**.

---

## The Problem

Treasury routing on-chain is manual and error-prone. A DAO receives funds and someone
has to manually split them to contributors, lock reserves, and hold operational capital —
every single time. One wrong transaction aborts and funds sit idle.

## The Solution

FlowPilot treats FlowVault's single routing slot as a **programmable instruction set**.
A policy like:

```
Alice: 50%   Bob: 35%   Reserve (locked): 10%   Hold: 5%
```

compiles to exactly 6 FlowVault calls, with all amounts precomputed in bigint micro-units
to guarantee the abort condition (`split + lock > deposit`) is mathematically impossible.

```
setRoutingRules(split=Alice, amt=50%·D)  →  deposit(50%·D)
setRoutingRules(split=Bob, amt=35%·D, lock=10%·D)  →  deposit(45%·D)
clearRoutingRules()  →  deposit(5%·D)   [hold]
```

The runner agent watches for incoming USDCx, fires the plan, and logs every txid.

---

## Architecture

```
Policy JSON
    │
    ▼
┌──────────────────────────────────┐
│  flowpilot-engine (npm package)  │
│  ┌──────────┐  ┌─────────────┐  │
│  │ compiler │  │  executor   │  │
│  │ policy → │  │ seq calls   │  │
│  │   plan   │  │ poll-verify │  │
│  └────┬─────┘  └──────┬──────┘  │
│       │               │         │
└───────┼───────────────┼─────────┘
        │               │
        ▼               ▼
   ExecutionPlan   FlowVault SDK
   (bigint math)   setRoutingRules
                   deposit
                   clearRoutingRules
                   getVaultState
```

### Monorepo layout

```
flowpilot/
├── packages/engine/     # flowpilot-engine — reusable npm package
│   ├── src/policy.ts    # zod schema: recipients, reservePct, holdPct, unlockAt
│   ├── src/compiler.ts  # policy → ExecutionPlan (precomputed bigint amounts)
│   ├── src/blocks.ts    # ISO date → lockUntilBlock (sampled block rate)
│   ├── src/executor.ts  # sequential execution, poll-verify, ExecutionRecord
│   └── src/gate.ts      # per-execution + per-day spend cap
├── apps/runner/         # Node worker — backend signer mode (Railway)
│   ├── src/watcher.ts   # polls Hiro API for incoming USDCx
│   ├── src/main.ts      # watcher → gate → compile → execute → persist
│   └── policy.json      # active treasury policy
└── apps/web/            # Next.js — wallet executor mode (Vercel)
    ├── app/page.tsx      # policy builder
    ├── app/dashboard/    # live vault state + execution timeline
    └── app/executions/   # per-execution step detail with explorer links
```

---

## Why This Needs FlowVault

| Engine stage | FlowVault primitive |
|---|---|
| Tranche routing | `setRoutingRules(splitAddress, splitAmount, lockAmount, lockUntilBlock)` |
| Fund movement | `deposit(amount)` — rules applied atomically at deposit time |
| Hold slice | `clearRoutingRules()` + `deposit(holdAmount)` |
| State verification | `getVaultState(address)` — polled after every write |
| Block height | `getCurrentBlockHeight()` — converts ISO dates to lock blocks |

---

## Quickstart

### Prerequisites

- Node 18+
- Testnet STX (Hiro faucet)
- Testnet USDCx (FlowVault site faucet button)

### Runner (autonomous mode)

```bash
cd apps/runner
cp ../../.env.example .env
# Fill in STACKS_PRIVATE_KEY
# Edit policy.json with your recipients
npm install
npm run dev
```

Send testnet USDCx to the treasury address printed on startup. The runner detects
the deposit and executes the policy automatically.

### Web app

```bash
cd apps/web
npm install
NEXT_PUBLIC_TREASURY_ADDRESS=ST... npm run dev
# Open http://localhost:3000
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full schema.

Key variables:

| Variable | Description |
|---|---|
| `STACKS_PRIVATE_KEY` | Runner signing key (testnet only, never commit) |
| `FLOWPILOT_MAX_PER_EXECUTION` | Hard cap in micro-USDCx per execution |
| `FLOWPILOT_MAX_PER_DAY` | Hard daily cap in micro-USDCx |
| `NEXT_PUBLIC_TREASURY_ADDRESS` | Treasury address shown on dashboard |

---

## Testnet Explorer Links

> Curated from the GATE 1 smoke test run — to be updated after production run.

| Step | Function | Explorer |
|---|---|---|
| Tranche 1 routing | `set-routing-rules` | *(added after smoke test)* |
| Tranche 1 deposit | `deposit` | *(added after smoke test)* |
| Tranche 2 routing | `set-routing-rules` | *(added after smoke test)* |
| Tranche 2 deposit | `deposit` | *(added after smoke test)* |

---

## Security Model

- **Backend key scope**: the runner key controls only its own FlowVault vault. It cannot
  touch any other principal's funds. Key is funded minimally (gas only).
- **Wallet mode**: user keys never leave the browser. `@stacks/connect` signs; no private
  key in web app code.
- **No custody**: FlowPilot never holds user funds. Routing rules execute atomically at
  deposit time via FlowVault's contract.
- **Spend gate**: hard per-execution and per-day caps evaluated before every plan
  compilation. Gate failures are loud and do not retry.

## Limitations & Roadmap

- **Single-slot sequencing**: N-recipient policies require 2N + 2 transactions. Stacks
  Nakamoto fast blocks (~5s) make this acceptable for typical treasury sizes but not
  for hundreds of recipients.
- **Sequential only**: two concurrent deposits would interleave plans. The runner
  enforces a single-flight lock; second deposit is queued, not dropped.
- **Mainnet path**: replace testnet contracts, generate a fresh key, raise spend gate
  caps, add Upstash for execution record persistence across Vercel/Railway restarts.
- **v3 vision**: batch routing rules in a single contract call eliminates the N-call
  overhead entirely.

---

## FlowVault Integration Details

See [`docs/INTEGRATION.md`](docs/INTEGRATION.md) for a full mapping of every
engine stage to the FlowVault SDK method it calls.
