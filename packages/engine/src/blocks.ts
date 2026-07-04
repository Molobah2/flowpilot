import { FlowVault } from "flowvault-sdk";

const SAMPLE_DURATION_MS = 60_000;
const SAMPLE_INTERVAL_MS = 10_000;

export interface BlockRateEstimate {
  currentHeight: number;
  msPerBlock: number;
  sampledAt: string;
}

export async function estimateBlockRate(
  sdk: FlowVault,
  senderAddress: string
): Promise<BlockRateEstimate> {
  const h1 = await sdk.getCurrentBlockHeight(senderAddress);
  const t1 = Date.now();

  await new Promise((r) => setTimeout(r, SAMPLE_DURATION_MS));

  const h2 = await sdk.getCurrentBlockHeight(senderAddress);
  const t2 = Date.now();

  const blocksDelta = h2 - h1;
  const msDelta = t2 - t1;

  // Nakamoto fast blocks ~5s; fall back to 10s if chain didn't advance
  const msPerBlock =
    blocksDelta > 0 ? msDelta / blocksDelta : 10_000;

  return { currentHeight: h2, msPerBlock, sampledAt: new Date().toISOString() };
}

export async function dateToBlockHeight(
  unlockAt: string,
  sdk: FlowVault,
  senderAddress: string,
  estimate?: BlockRateEstimate
): Promise<{ lockUntilBlock: number; blockRateEstimate: BlockRateEstimate }> {
  const est = estimate ?? (await estimateBlockRate(sdk, senderAddress));
  const targetMs = new Date(unlockAt).getTime();
  const nowMs = Date.now();
  const deltaMs = Math.max(0, targetMs - nowMs);
  const blocksAhead = Math.ceil(deltaMs / est.msPerBlock);
  const lockUntilBlock = est.currentHeight + blocksAhead;
  return { lockUntilBlock, blockRateEstimate: est };
}

export async function quickBlockHeight(
  sdk: FlowVault,
  senderAddress: string
): Promise<number> {
  return sdk.getCurrentBlockHeight(senderAddress);
}
