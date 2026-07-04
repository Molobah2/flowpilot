import { FlowVault } from "flowvault-sdk";

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_FLOWVAULT_CONTRACT_ADDRESS ??
  "STD7QG84VQQ0C35SZM2EYTHZV4M8FQ0R7YNSQWPD";
const CONTRACT_NAME =
  process.env.NEXT_PUBLIC_FLOWVAULT_CONTRACT_NAME ?? "flowvault-v2";
const TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_FLOWVAULT_TOKEN_CONTRACT_ADDRESS ??
  "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
const TOKEN_NAME =
  process.env.NEXT_PUBLIC_FLOWVAULT_TOKEN_CONTRACT_NAME ?? "usdcx";

export function getReadOnlySdk(senderAddress: string): FlowVault {
  return new FlowVault({
    network: "testnet",
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    tokenContractAddress: TOKEN_ADDRESS,
    tokenContractName: TOKEN_NAME,
    senderAddress,
  });
}

export const HIRO_API = "https://api.testnet.hiro.so";
export const EXPLORER_BASE = "https://explorer.hiro.so/?chain=testnet";

export function explorerTxUrl(txId: string): string {
  return `${EXPLORER_BASE}&txid=${txId}`;
}

export const TREASURY_ADDRESS =
  process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? "";
