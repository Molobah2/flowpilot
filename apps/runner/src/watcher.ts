/**
 * Polls Hiro API for incoming USDCx transfers to the treasury address.
 * Uses /extended/v1/address/{addr}/transactions_with_transfers which
 * returns ft_transfers inline per transaction.
 */

// Actual fungible token name as reported by the Hiro API
const USDCX_TOKEN_IDENTIFIER = "usdcx-token";

export interface IncomingTransfer {
  txId: string;
  amount: bigint;     // micro-USDCx
  sender: string;
  blockHeight: number;
  timestamp: string;
}

type OnDeposit = (transfer: IncomingTransfer) => Promise<void>;

interface FtTransfer {
  asset_identifier: string;
  recipient: string;
  sender: string;
  amount: string;
}

interface HiroTxWithTransfers {
  tx: {
    tx_id: string;
    tx_status: string;
    block_height: number;
    burn_block_time_iso: string;
  };
  ft_transfers: FtTransfer | FtTransfer[] | null;
}

export async function startWatcher(
  treasuryAddress: string,
  tokenContractAddress: string,
  tokenContractName: string,
  hiroApiUrl: string,
  pollIntervalMs: number,
  onDeposit: OnDeposit,
  idempotencyHas: (txId: string) => boolean
): Promise<void> {
  const assetIdentifier = `${tokenContractAddress}.${tokenContractName}::${USDCX_TOKEN_IDENTIFIER}`;
  console.log(`[watcher] Monitoring ${treasuryAddress} for ${assetIdentifier}`);
  console.log(`[watcher] Poll interval: ${pollIntervalMs}ms`);

  while (true) {
    try {
      await poll(
        treasuryAddress,
        assetIdentifier,
        hiroApiUrl,
        onDeposit,
        idempotencyHas
      );
    } catch (err) {
      console.error(`[watcher] Poll error (will retry): ${String(err)}`);
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
}

async function poll(
  treasuryAddress: string,
  assetIdentifier: string,
  hiroApiUrl: string,
  onDeposit: OnDeposit,
  idempotencyHas: (txId: string) => boolean
): Promise<void> {
  // v1 transactions_with_transfers includes ft_transfers inline
  const url =
    `${hiroApiUrl}/extended/v1/address/${treasuryAddress}/transactions_with_transfers` +
    `?limit=50`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Hiro API ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as { results?: HiroTxWithTransfers[] };
  const txs = data.results ?? [];

  for (const entry of txs) {
    const tx = entry.tx;
    if (tx.tx_status !== "success") continue;
    if (idempotencyHas(tx.tx_id)) continue;

    // ft_transfers may be a single object or an array depending on event count
    const ftList: FtTransfer[] = entry.ft_transfers
      ? Array.isArray(entry.ft_transfers)
        ? entry.ft_transfers
        : [entry.ft_transfers]
      : [];

    for (const ft of ftList) {
      if (
        ft.recipient === treasuryAddress &&
        ft.asset_identifier === assetIdentifier
      ) {
        const transfer: IncomingTransfer = {
          txId: tx.tx_id,
          amount: BigInt(ft.amount),
          sender: ft.sender,
          blockHeight: tx.block_height,
          timestamp: tx.burn_block_time_iso,
        };
        console.log(
          `[watcher] Incoming transfer detected: ${transfer.amount} micro-USDCx ` +
          `from ${transfer.sender} (tx: ${transfer.txId})`
        );
        await onDeposit(transfer);
        break;
      }
    }
  }
}
