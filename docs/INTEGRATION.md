# FlowVault Integration

FlowPilot is built entirely on top of the FlowVault v2 SDK and contract.
This document maps every engine stage to the specific FlowVault primitive it uses.

## Contract identifiers (testnet)

| Component | Value |
|-----------|-------|
| FlowVault contract | `STD7QG84VQQ0C35SZM2EYTHZV4M8FQ0R7YNSQWPD.flowvault-v2` |
| USDCx token | `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx` |
| SDK | `flowvault-sdk@0.1.1` |
| Network | Stacks testnet |

## How the routing slot becomes an instruction set

FlowVault v2 exposes exactly **one** routing rule slot per principal:

```
{ splitAddress, splitAmount, lockAmount, lockUntilBlock }
```

Deposit pipeline (deterministic, on-chain):
1. **Split** — `splitAmount` transferred to `splitAddress`
2. **Lock** — `lockAmount` locked until `lockUntilBlock`
3. **Hold** — remainder stays in vault, immediately withdrawable

Constraint: if `splitAmount + lockAmount > depositAmount`, the entire tx aborts.

FlowPilot treats this single slot as an instruction set, sequencing calls to express
N-recipient policies:

```
Policy:  Alice 50% · Bob 35% · Reserve 10% (locked) · Hold 5%

Compiles to 6 FlowVault calls:
  1. setRoutingRules(split=Alice, splitAmt=50%·D, lock=0)
  2. deposit(50%·D)                      ← Alice receives her share
  3. setRoutingRules(split=Bob, splitAmt=35%·D, lockAmt=10%·D, lockUntilBlock=H)
  4. deposit(45%·D)                      ← Bob + reserve lock, within deposit
  5. clearRoutingRules()
  6. deposit(5%·D)                       ← 5% lands in vault unlocked (hold)
```

Every amount is precomputed in bigint micro-units client-side so no on-chain
aborts are ever possible.

## SDK methods used

### State-changing (backend signer mode)

| Method | When used |
|--------|-----------|
| `sdk.setRoutingRules(rules)` | Before every deposit tranche to configure the routing slot |
| `sdk.deposit(amount)` | Moves USDCx from treasury wallet into FlowVault; rules applied atomically |
| `sdk.clearRoutingRules()` | Before the hold tranche to ensure funds stay unlocked |

### State-changing (wallet executor mode — web app)

Same methods called via `contractCallExecutor` backed by `@stacks/connect`
`request("stx_callContract")`. No private key ever touches browser code.

### Read-only

| Method | When used |
|--------|-----------|
| `sdk.getVaultState(address)` | Poll-verify after every write; dashboard live state |
| `sdk.getRoutingRules(address)` | Dashboard: show active routing slot |
| `sdk.hasLockedFunds(address)` | Gate: skip re-lock if already locked |
| `sdk.getCurrentBlockHeight(senderAddress)` | Convert ISO date → `lockUntilBlock` |

## Docs-mandated practices implemented

From `https://docs.flow-vault.dev/docs/sdk`:

- **Amounts as string/bigint only** — compiler outputs `bigint`; SDK methods accept `MicroAmount`
- **Poll read state after every write** — executor calls `pollTxConfirmed` (Hiro API) before
  proceeding to the next step; `setRoutingRules` must be confirmed before its paired `deposit`
- **Validate principals at startup** — `assertValidAddress` called on all recipient addresses
  before compiling; `InvalidAddressError` surfaced to dashboard
- **Surface typed errors directly** — executor catches `ContractCallError`, `NetworkError`,
  `InvalidRoutingRuleError` and writes them verbatim into the `ExecutionRecord`

## Spend gate (non-FlowVault)

The spend gate is a FlowPilot addition: a per-execution and per-day micro-USDCx cap
evaluated **before** compiling the plan. If the incoming deposit exceeds either cap,
the runner logs a loud warning and skips execution. Gate state is persisted locally
(`data/gate-state.json`) and is reset every 24h.

## Security model

- **Backend key scope**: the runner's private key controls only its own FlowVault vault.
  It cannot move anyone else's funds. The key is funded minimally — enough STX for gas.
- **User vaults (wallet mode)**: user wallets never leave the browser. The
  `contractCallExecutor` passes unsigned call requests to `@stacks/connect`; the wallet
  signs and broadcasts.
- **No custody**: FlowPilot never holds user funds. Routing rules execute atomically
  at deposit time; recipients receive directly via the FlowVault split mechanism.
