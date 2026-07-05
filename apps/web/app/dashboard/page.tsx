"use client";

import { useState, useEffect, useCallback } from "react";

const DEMO_TREASURY = process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? "";
const EXPLORER = "https://explorer.hiro.so/txid/";

interface VaultState {
  totalBalance: number;
  lockedBalance: number;
  unlockedBalance: number;
  lockUntilBlock: number;
}

interface RoutingRules {
  splitAddress?: string;
  splitAmount?: number;
  lockAmount?: number;
  lockUntilBlock?: number;
}

function micro(n: number) {
  return (n / 1_000_000).toFixed(6);
}

function shortAddr(a: string) {
  return a ? `${a.slice(0, 8)}…${a.slice(-4)}` : "—";
}

function StatRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "11px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <span style={{ fontSize: "13px", color: "#71717a" }}>{label}</span>
      <span style={{ fontSize: "13px", fontWeight: 600, color: accent ?? "#f0f0f3", fontFamily: "var(--font-mono)" }}>
        {value}
      </span>
    </div>
  );
}

export default function VaultPage() {
  const [address, setAddress] = useState(DEMO_TREASURY);
  const [inputAddr, setInputAddr] = useState(DEMO_TREASURY);
  const [vault, setVault] = useState<VaultState | null>(null);
  const [rules, setRules] = useState<RoutingRules | null>(null);
  const [blockHeight, setBlockHeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (addr: string) => {
    if (!addr) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/vault-state?address=${encodeURIComponent(addr)}`);
      if (!r.ok) throw new Error(`API ${r.status}`);
      const d = await r.json();
      setVault(d.state);
      setRules(d.rules);
      setBlockHeight(d.blockHeight);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(address);
  }, [address, load]);

  const blocksLeft =
    vault && blockHeight && vault.lockUntilBlock > 0 && vault.lockUntilBlock > blockHeight
      ? vault.lockUntilBlock - blockHeight
      : 0;

  const unlockedPct =
    vault && vault.totalBalance > 0
      ? Math.round((vault.unlockedBalance / vault.totalBalance) * 100)
      : 0;

  const lockedPct =
    vault && vault.totalBalance > 0
      ? Math.round((vault.lockedBalance / vault.totalBalance) * 100)
      : 0;

  return (
    <div style={{ padding: "32px 36px", minHeight: "100vh" }}>
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.02em", color: "#f0f0f3", marginBottom: "6px" }}>
          Vault State
        </h1>
        <p style={{ fontSize: "14px", color: "#71717a" }}>
          Live FlowVault v2 contract state on Stacks testnet
        </p>
      </div>

      {/* Address lookup */}
      <div className="animate-fade-up-1" style={{ marginBottom: "24px" }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setAddress(inputAddr.trim());
          }}
          style={{ display: "flex", gap: "10px", maxWidth: "560px" }}
        >
          <input
            value={inputAddr}
            onChange={(e) => setInputAddr(e.target.value)}
            placeholder="ST… treasury address"
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "10px",
              padding: "10px 14px",
              fontSize: "13px",
              fontFamily: "var(--font-mono)",
              color: "#9b9ba8",
              outline: "none",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              border: "none",
              color: "white",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(124,58,237,0.25)",
            }}
          >
            Load
          </button>
          {address && (
            <button
              type="button"
              onClick={() => load(address)}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "#71717a",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              ↻
            </button>
          )}
        </form>
      </div>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#f87171",
            fontSize: "13px",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="metric-card shimmer" style={{ height: "110px" }} />
          ))}
        </div>
      )}

      {vault && !loading && (
        <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Balances */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            <div className="metric-card" style={{ background: "rgba(124,58,237,0.07)", borderColor: "rgba(124,58,237,0.2)" }}>
              <div style={{ fontSize: "11px", letterSpacing: "0.07em", textTransform: "uppercase", color: "#a78bfa", opacity: 0.8, marginBottom: "10px", fontWeight: 500 }}>
                Total Balance
              </div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#c4b5fd", fontFamily: "var(--font-mono)", marginBottom: "4px" }}>
                {micro(vault.totalBalance)}
              </div>
              <div style={{ fontSize: "11px", color: "#52525b" }}>USDCx (micro-units: {vault.totalBalance.toLocaleString()})</div>
            </div>

            <div className="metric-card" style={{ background: "rgba(16,185,129,0.07)", borderColor: "rgba(16,185,129,0.2)" }}>
              <div style={{ fontSize: "11px", letterSpacing: "0.07em", textTransform: "uppercase", color: "#34d399", opacity: 0.8, marginBottom: "10px", fontWeight: 500 }}>
                Unlocked
              </div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#34d399", fontFamily: "var(--font-mono)", marginBottom: "4px" }}>
                {micro(vault.unlockedBalance)}
              </div>
              <div style={{ fontSize: "11px", color: "#52525b" }}>
                {unlockedPct}% of total · immediately withdrawable
              </div>
            </div>

            <div className="metric-card" style={{ background: "rgba(245,158,11,0.07)", borderColor: "rgba(245,158,11,0.2)" }}>
              <div style={{ fontSize: "11px", letterSpacing: "0.07em", textTransform: "uppercase", color: "#fbbf24", opacity: 0.8, marginBottom: "10px", fontWeight: 500 }}>
                Locked Reserve
              </div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#fbbf24", fontFamily: "var(--font-mono)", marginBottom: "4px" }}>
                {micro(vault.lockedBalance)}
              </div>
              <div style={{ fontSize: "11px", color: "#52525b" }}>
                {lockedPct}% of total
                {blocksLeft > 0 && ` · ${blocksLeft.toLocaleString()} blocks remaining`}
              </div>
            </div>
          </div>

          {/* Allocation bar */}
          {vault.totalBalance > 0 && (
            <div style={{ display: "flex", height: "8px", borderRadius: "99px", overflow: "hidden", background: "rgba(255,255,255,0.06)", gap: "2px" }}>
              <div style={{ width: `${unlockedPct}%`, background: "#10b981", borderRadius: "99px", transition: "width 0.6s ease" }} />
              <div style={{ width: `${lockedPct}%`, background: "#f59e0b", borderRadius: "99px", transition: "width 0.6s ease" }} />
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {/* Lock details */}
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "14px",
                padding: "20px 22px",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#9b9ba8", marginBottom: "4px" }}>
                Lock Details
              </div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: "12px" }}>
                <StatRow label="Lock until block" value={vault.lockUntilBlock > 0 ? vault.lockUntilBlock.toLocaleString() : "Not locked"} accent={vault.lockUntilBlock > 0 ? "#fbbf24" : "#52525b"} />
                <StatRow label="Current block" value={blockHeight?.toLocaleString() ?? "—"} />
                <StatRow label="Blocks remaining" value={blocksLeft > 0 ? blocksLeft.toLocaleString() : "—"} accent={blocksLeft > 0 ? "#f59e0b" : "#52525b"} />
                <StatRow label="Est. unlock" value={blocksLeft > 0 ? `~${Math.round((blocksLeft * 10) / 86400)} days` : "Available now"} accent={blocksLeft > 0 ? "#fbbf24" : "#34d399"} />
              </div>
            </div>

            {/* Routing rules */}
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "14px",
                padding: "20px 22px",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#9b9ba8", marginBottom: "4px" }}>
                Active Routing Slot
              </div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: "12px" }}>
                {rules?.splitAddress ? (
                  <>
                    <StatRow label="Split address" value={shortAddr(rules.splitAddress)} accent="#a78bfa" />
                    <StatRow label="Split amount" value={rules.splitAmount ? micro(rules.splitAmount) : "—"} />
                    <StatRow label="Lock amount" value={rules.lockAmount ? micro(rules.lockAmount) : "0"} accent="#fbbf24" />
                    <StatRow label="Lock until block" value={rules.lockUntilBlock?.toLocaleString() ?? "—"} />
                  </>
                ) : (
                  <div style={{ padding: "16px 0", textAlign: "center", color: "#3f3f50", fontSize: "13px" }}>
                    No active routing rules
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Explorer link */}
          <div style={{ display: "flex", gap: "10px" }}>
            <a
              href={`${EXPLORER}?chain=testnet`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 16px",
                borderRadius: "9px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "#71717a",
                fontSize: "13px",
                textDecoration: "none",
                transition: "all 0.15s",
              }}
            >
              View on Hiro Explorer ↗
            </a>
          </div>
        </div>
      )}

      {!loading && !vault && !error && (
        <div style={{ textAlign: "center", padding: "64px 24px", color: "#3f3f50" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔐</div>
          <div style={{ fontSize: "15px", fontWeight: 500, marginBottom: "6px", color: "#52525b" }}>
            Enter a treasury address
          </div>
          <div style={{ fontSize: "13px" }}>
            Load real-time vault state from FlowVault v2
          </div>
        </div>
      )}
    </div>
  );
}
