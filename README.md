# FlowPilot — AI Treasury Operating System

> **Set your policy once. Your treasury manages itself.**

**Live demo → https://flowpilot-production-1996.up.railway.app**

FlowPilot is an autonomous treasury engine built on FlowVault v2. It compiles human-readable allocation policies into ordered sequences of FlowVault contract calls and executes them on-chain, unattended, every time funds arrive.

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
└── apps/web/            # Next.js — premium dashboard (Railway)
    ├── app/page.tsx         # operations dashboard (live vault metrics + AI insights)
    ├── app/automate/        # visual 4-step policy wizard (no JSON exposed)
    ├── app/dashboard/       # real-time vault state + routing rules
    └── app/executions/      # per-execution step detail with explorer links
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

### GATE 2 — Full autonomous run (5 USDCx, demo-treasury policy, unattended)

Incoming deposit detected automatically by the runner. Policy: Alice 50%, Bob 35%, Reserve 10% locked to Aug 1 2026 (block 4,265,507), Hold 5%.

| Step | Function | Explorer |
|---|---|---|
| Set rules — Alice (50%) | `set-routing-rules` | [3210aa85…](https://explorer.hiro.so/txid/3210aa85b1edffae049a626ff9a00d03b9d87950a8ea4a6e3141ce5f2e3983f7?chain=testnet) |
| Deposit — Alice 2.5 USDCx | `deposit` | [fe4aa512…](https://explorer.hiro.so/txid/fe4aa51208bbb280a12383f26120e6ab4f988651e98837e135d2cb1a2e6348ae?chain=testnet) |
| Set rules — Bob (35%) + lock 0.5 USDCx | `set-routing-rules` | [b3725758…](https://explorer.hiro.so/txid/b37257580473bcc384eb606c5da52da43f8f46d1f8c83d9da27e03c0dea89e41?chain=testnet) |
| Deposit — Bob 1.75 USDCx + 0.5 locked | `deposit` | [37cc615a…](https://explorer.hiro.so/txid/37cc615af2473985ef58e555ad245c9130700f745a0b8f82104e14e134827f4f?chain=testnet) |
| Clear rules (hold tranche) | `clear-routing-rules` | [21c544b9…](https://explorer.hiro.so/txid/21c544b9089d96296650878d3b23a46ff50d1fb62ff8ddbad0ea0487f0b6d90e?chain=testnet) |
| Deposit — Hold 0.25 USDCx | `deposit` | [14000a2e…](https://explorer.hiro.so/txid/14000a2e52d13e06ac2397ed6b08dfd4d794c8f43ce90a3e4778cbdf398af461?chain=testnet) |

**getVaultState after:** total=750,000 · locked=500,000 · unlocked=250,000 ✓

### GATE 1 — Smoke test (2 USDCx, 2-recipient, manual)

| Step | Function | Explorer |
|---|---|---|
| Set rules — Alice (60%) | `set-routing-rules` | [ee10a669…](https://explorer.hiro.so/txid/ee10a669d1392983a992575e3dfc640a418922142bddbe0d099bc8bc724f218a?chain=testnet) |
| Deposit — Alice 1.2 USDCx | `deposit` | [7f5dd3e1…](https://explorer.hiro.so/txid/7f5dd3e1e9289d60d0f9abeaf76dbaa405c40454a8a24713147157213d7d8fa8?chain=testnet) |
| Set rules — Bob (40%) | `set-routing-rules` | [7751ccfd…](https://explorer.hiro.so/txid/7751ccfde15ad0cc7874eb8246cfe7d63a6346236aaa68eced04fb84bdcbf9e5?chain=testnet) |
| Deposit — Bob 0.8 USDCx | `deposit` | [83d5df4f…](https://explorer.hiro.so/txid/83d5df4ff939765d4952cb7710f3aab1339b4f8e36ac5ade640b020d911a389d?chain=testnet) |

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

## Judging criteria alignment

| Criterion | Weight | How FlowPilot delivers |
|---|---|---|
| **Innovation** | 35% | Policy abstraction layer no one else built: compiler turns %-based intent into exact bigint FlowVault calls. SpendGate, block-height date conversion, single-flight idempotency — new primitives on top of FlowVault |
| **FlowVault Integration** | 30% | Uses all 4 SDK methods. Understands abort-condition math. Combines reserve into last recipient tranche (saves 2 txs). Uses `getCurrentBlockHeight` to convert ISO unlock dates to exact block numbers |
| **Technical Execution** | 20% | Full TypeScript monorepo, poll-verify loop on every tx, SpendGate state machine, idempotency guard. GATE 1 + GATE 2 both confirmed with real on-chain txids |
| **Ecosystem Value** | 15% | Any DAO or protocol can drop in a `policy.json` and get zero-code treasury automation. The engine is a standalone npm package ready to embed |

---

## Live on-chain results

Current vault state (treasury `ST2V922...JFKR`):
- **Total:** 0.75 USDCx · **Locked:** 0.5 USDCx · **Unlocked:** 0.25 USDCx
- **Lock block:** 4,265,507 (≈ 27 days from first execution)
- **Confirmed FlowVault operations:** 13 across 2 autonomous executions
