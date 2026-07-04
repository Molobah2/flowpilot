"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const HIRO_EXPLORER = "https://explorer.hiro.so/?chain=testnet&txid=";

interface VaultState {
  totalBalance: number;
  lockedBalance: number;
  unlockedBalance: number;
  lockUntilBlock: number;
  currentBlock: number;
}

interface TxEntry {
  tx_id: string;
  tx_status: string;
  block_height: number;
  burn_block_time_iso: string;
  tx_type: string;
  contract_call?: { function_name: string };
}

function micro(n: number): string {
  return (n / 1_000_000).toFixed(6) + " USDCx";
}

function short(addr: string): string {
  return addr.slice(0, 8) + "…" + addr.slice(-4);
}

export default function Dashboard() {
  const [address, setAddress] = useState(
    process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? ""
  );
  const [inputAddr, setInputAddr] = useState(address);
  const [vaultState, setVaultState] = useState<VaultState | null>(null);
  const [blockHeight, setBlockHeight] = useState<number | null>(null);
  const [txs, setTxs] = useState<TxEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    load(address);
  }, [address]);

  async function load(addr: string) {
    setLoading(true);
    setError(null);
    try {
      const [vaultRes, txRes] = await Promise.all([
        fetch(`/api/vault-state?address=${encodeURIComponent(addr)}`),
        fetch(`/api/transactions?address=${encodeURIComponent(addr)}`),
      ]);

      if (!vaultRes.ok) throw new Error(`Vault API: ${vaultRes.status}`);
      const vaultData = await vaultRes.json();
      setVaultState(vaultData.state);
      setBlockHeight(vaultData.blockHeight);

      if (txRes.ok) {
        const txData = await txRes.json();
        setTxs(txData.results ?? []);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setAddress(inputAddr.trim());
  }

  const lockedExpired =
    vaultState &&
    blockHeight !== null &&
    vaultState.lockUntilBlock > 0 &&
    vaultState.lockUntilBlock <= blockHeight;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          <span className="text-violet-400">Vault</span> Dashboard
        </h1>
        <p className="text-zinc-400 text-sm">
          Live state from FlowVault v2 on Stacks testnet.
        </p>
      </div>

      {/* Address input */}
      <form onSubmit={submit} className="mb-8 flex gap-2">
        <input
          value={inputAddr}
          onChange={(e) => setInputAddr(e.target.value)}
          placeholder="ST... treasury address"
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
        <button
          type="submit"
          className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Load
        </button>
        {address && (
          <button
            type="button"
            onClick={() => load(address)}
            className="border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            ↻
          </button>
        )}
      </form>

      {error && (
        <div className="mb-6 bg-red-950/50 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-zinc-500 text-sm mb-6 animate-pulse">
          Loading vault state…
        </div>
      )}

      {vaultState && (
        <>
          {/* Vault state cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                Total Balance
              </div>
              <div className="text-xl font-semibold text-zinc-100">
                {micro(vaultState.totalBalance)}
              </div>
            </div>
            <div className="bg-zinc-900 border border-emerald-800/50 rounded-lg p-4">
              <div className="text-xs text-emerald-600 uppercase tracking-wider mb-2">
                Unlocked
              </div>
              <div className="text-xl font-semibold text-emerald-400">
                {micro(vaultState.unlockedBalance)}
              </div>
            </div>
            <div
              className={`bg-zinc-900 border rounded-lg p-4 ${
                lockedExpired ? "border-zinc-700" : "border-amber-800/50"
              }`}
            >
              <div
                className={`text-xs uppercase tracking-wider mb-2 ${
                  lockedExpired ? "text-zinc-500" : "text-amber-600"
                }`}
              >
                Locked
              </div>
              <div
                className={`text-xl font-semibold ${
                  lockedExpired ? "text-zinc-500" : "text-amber-400"
                }`}
              >
                {micro(vaultState.lockedBalance)}
              </div>
              {vaultState.lockUntilBlock > 0 && (
                <div className="text-xs text-zinc-600 mt-1">
                  until block {vaultState.lockUntilBlock}
                  {lockedExpired ? " (released)" : ""}
                </div>
              )}
            </div>
          </div>

          {/* Block height */}
          {blockHeight !== null && (
            <div className="mb-8 text-xs text-zinc-600 font-mono">
              Current block: {blockHeight}
              {vaultState.lockUntilBlock > 0 && !lockedExpired && (
                <span className="ml-4 text-amber-700">
                  Lock expires in ~{vaultState.lockUntilBlock - blockHeight} blocks
                </span>
              )}
            </div>
          )}
        </>
      )}

      {/* Execution history from Hiro */}
      {txs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">
            Recent Transactions
          </h2>
          <div className="space-y-2">
            {txs.slice(0, 20).map((tx) => {
              const fnName = tx.contract_call?.function_name;
              const isFlowVault =
                fnName &&
                ["deposit", "withdraw", "set-routing-rules", "clear-routing-rules"].includes(fnName);
              return (
                <a
                  key={tx.tx_id}
                  href={`${HIRO_EXPLORER}${tx.tx_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg px-4 py-3 transition-colors group"
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      tx.tx_status === "success"
                        ? "bg-emerald-400"
                        : "bg-red-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-zinc-300 font-mono truncate">
                      {fnName ? (
                        <span className={isFlowVault ? "text-violet-400" : ""}>
                          {fnName}
                        </span>
                      ) : (
                        tx.tx_type
                      )}
                    </div>
                    <div className="text-xs text-zinc-600 mt-0.5">
                      block {tx.block_height} ·{" "}
                      {new Date(tx.burn_block_time_iso).toLocaleString()}
                    </div>
                  </div>
                  <span className="text-xs font-mono text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0">
                    {tx.tx_id.slice(0, 10)}… ↗
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {!loading && !error && !vaultState && (
        <div className="text-center py-16 text-zinc-600">
          <p className="text-4xl mb-4">🏦</p>
          <p>Enter a treasury address to load vault state</p>
        </div>
      )}

      <div className="mt-10 flex gap-4">
        <Link
          href="/"
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          ← Policy Builder
        </Link>
      </div>
    </div>
  );
}
