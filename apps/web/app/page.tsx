"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const DEMO_TREASURY = process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? "";
const EXPLORER = "https://explorer.hiro.so/txid/";

interface VaultState {
  totalBalance: number;
  lockedBalance: number;
  unlockedBalance: number;
  lockUntilBlock: number;
}

interface Tx {
  tx_id: string;
  tx_status: string;
  block_height: number;
  burn_block_time_iso: string;
  tx_type: string;
  contract_call?: { function_name: string };
}

function micro(n: number) {
  return (n / 1_000_000).toFixed(4);
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function useCountUp(target: number, decimals = 4) {
  const [val, setVal] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    if (frame.current) cancelAnimationFrame(frame.current);
    const start = performance.now();
    const duration = 1100;
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(parseFloat((eased * target).toFixed(decimals)));
      if (p < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => { if (frame.current) cancelAnimationFrame(frame.current); };
  }, [target, decimals]);

  return val;
}

function MetricCard({
  label,
  sublabel,
  value,
  unit,
  accent,
  badge,
  delay = 0,
}: {
  label: string;
  sublabel?: string;
  value: string | number;
  unit?: string;
  accent?: "violet" | "green" | "amber" | "default";
  badge?: string;
  delay?: number;
}) {
  const colors: Record<string, string> = {
    violet: "#a78bfa",
    green: "#34d399",
    amber: "#fbbf24",
    default: "#f0f0f3",
  };
  const bgs: Record<string, string> = {
    violet: "rgba(124,58,237,0.08)",
    green: "rgba(16,185,129,0.08)",
    amber: "rgba(245,158,11,0.08)",
    default: "rgba(255,255,255,0.028)",
  };
  const borders: Record<string, string> = {
    violet: "rgba(124,58,237,0.2)",
    green: "rgba(16,185,129,0.2)",
    amber: "rgba(245,158,11,0.2)",
    default: "rgba(255,255,255,0.07)",
  };

  const col = colors[accent ?? "default"];
  const bg = bgs[accent ?? "default"];
  const border = borders[accent ?? "default"];

  return (
    <div
      className={`metric-card animate-fade-up-${delay}`}
      style={{ background: bg, borderColor: border }}
    >
      <div
        style={{ fontSize: "11px", letterSpacing: "0.07em", textTransform: "uppercase", color: col, opacity: 0.8, marginBottom: "12px", fontWeight: 500 }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
        <span style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.02em", color: col, lineHeight: 1 }}>
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: "13px", color: col, opacity: 0.6, fontWeight: 500 }}>
            {unit}
          </span>
        )}
      </div>
      {sublabel && (
        <div style={{ fontSize: "12px", color: "#4a4a58", marginTop: "6px" }}>
          {sublabel}
        </div>
      )}
      {badge && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            marginTop: "10px",
            fontSize: "10px",
            letterSpacing: "0.05em",
            padding: "3px 8px",
            borderRadius: "99px",
            background: "rgba(255,255,255,0.05)",
            color: col,
            border: `1px solid ${border}`,
            fontWeight: 500,
          }}
        >
          {badge}
        </div>
      )}
    </div>
  );
}

function TreasuryFlowSVG({ policy }: {
  policy: { recipients: { label: string; sharePct: number }[]; reservePct: number; holdPct: number };
}) {
  const { recipients, reservePct, holdPct } = policy;

  const total = recipients.reduce((s, r) => s + r.sharePct, 0) + reservePct + holdPct;
  const barWidth = (pct: number) => `${Math.round((pct / total) * 100)}%`;

  return (
    <div style={{ padding: "24px" }}>
      {/* Incoming */}
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(124,58,237,0.12)",
            border: "1px solid rgba(124,58,237,0.3)",
            borderRadius: "10px",
            padding: "8px 16px",
            fontSize: "12px",
            fontWeight: 600,
            color: "#c4b5fd",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1.5C3.515 1.5 1.5 3.515 1.5 6S3.515 10.5 6 10.5 10.5 8.485 10.5 6 8.485 1.5 6 1.5z" stroke="#c4b5fd" strokeWidth="1.2"/>
            <path d="M6 4v4M4 6h4" stroke="#c4b5fd" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          Incoming USDCx
        </div>
      </div>

      {/* Connector */}
      <svg width="100%" height="32" style={{ display: "block" }}>
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(124,58,237,0.4)" strokeWidth="1.5" className="flow-line" />
      </svg>

      {/* Engine */}
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(79,70,229,0.1)",
            border: "1px solid rgba(79,70,229,0.35)",
            borderRadius: "10px",
            padding: "8px 16px",
            fontSize: "12px",
            fontWeight: 600,
            color: "#a5b4fc",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1L7.4 4.3H10.5L8.1 6.4L9 9.5L6 7.8L3 9.5L3.9 6.4L1.5 4.3H4.6L6 1Z" fill="#a5b4fc"/>
          </svg>
          FlowPilot Engine
        </div>
      </div>

      {/* Fan-out SVG */}
      <svg width="100%" height="40" viewBox="0 0 400 40" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
        {recipients.map((_, i) => {
          const count = recipients.length + (reservePct > 0 ? 1 : 0);
          const spread = 320;
          const startX = 200 - spread / 2;
          const stepX = spread / Math.max(count - 1, 1);
          const x = startX + i * stepX;
          return (
            <line key={i} x1="200" y1="0" x2={x} y2="40"
              stroke="rgba(16,185,129,0.45)" strokeWidth="1.5" className="flow-line" />
          );
        })}
        {reservePct > 0 && (
          <line x1="200" y1="0" x2="340" y2="40"
            stroke="rgba(245,158,11,0.45)" strokeWidth="1.5" className="flow-line-slow" />
        )}
      </svg>

      {/* Recipient cards */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        {recipients.map((r, i) => (
          <div key={i}
            style={{
              flex: 1,
              background: "rgba(16,185,129,0.07)",
              border: "1px solid rgba(16,185,129,0.2)",
              borderRadius: "10px",
              padding: "10px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#34d399", marginBottom: "2px" }}>
              {r.label}
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#10b981" }}>
              {r.sharePct}%
            </div>
            <div style={{ fontSize: "10px", color: "#065f46", marginTop: "2px" }}>Split</div>
          </div>
        ))}
        {reservePct > 0 && (
          <div
            style={{
              flex: 1,
              background: "rgba(245,158,11,0.07)",
              border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: "10px",
              padding: "10px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#fbbf24", marginBottom: "2px" }}>
              Reserve
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#f59e0b" }}>
              {reservePct}%
            </div>
            <div style={{ fontSize: "10px", color: "#78350f", marginTop: "2px" }}>🔒 Locked</div>
          </div>
        )}
        {holdPct > 0 && (
          <div
            style={{
              flex: 1,
              background: "rgba(99,102,241,0.07)",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: "10px",
              padding: "10px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#a5b4fc", marginBottom: "2px" }}>
              Hold
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#818cf8" }}>
              {holdPct}%
            </div>
            <div style={{ fontSize: "10px", color: "#312e81", marginTop: "2px" }}>Vault</div>
          </div>
        )}
      </div>

      {/* Allocation bar */}
      <div style={{ marginTop: "16px" }}>
        <div style={{ display: "flex", height: "6px", borderRadius: "99px", overflow: "hidden", gap: "2px" }}>
          {recipients.map((r, i) => (
            <div key={i} style={{ width: barWidth(r.sharePct), background: "#10b981", borderRadius: "99px" }} />
          ))}
          {reservePct > 0 && (
            <div style={{ width: barWidth(reservePct), background: "#f59e0b", borderRadius: "99px" }} />
          )}
          {holdPct > 0 && (
            <div style={{ width: barWidth(holdPct), background: "#818cf8", borderRadius: "99px" }} />
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
          {recipients.map((r, i) => (
            <span key={i} style={{ fontSize: "10px", color: "#10b981" }}>{r.label} {r.sharePct}%</span>
          ))}
          {reservePct > 0 && <span style={{ fontSize: "10px", color: "#f59e0b" }}>Reserve {reservePct}%</span>}
          {holdPct > 0 && <span style={{ fontSize: "10px", color: "#818cf8" }}>Hold {holdPct}%</span>}
        </div>
      </div>
    </div>
  );
}

function InsightItem({ icon, text, accent }: { icon: string; text: string; accent?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        padding: "12px 14px",
        borderRadius: "10px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <span style={{ fontSize: "14px", flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: "13px", color: accent ?? "#9b9ba8", lineHeight: "1.5" }}>{text}</span>
    </div>
  );
}

const POLICY = {
  recipients: [
    { label: "Alice", sharePct: 50 },
    { label: "Bob", sharePct: 35 },
  ],
  reservePct: 10,
  holdPct: 5,
};

const FN_LABELS: Record<string, string> = {
  deposit: "Deposit",
  "set-routing-rules": "Set Routing Rules",
  "clear-routing-rules": "Clear Routing Rules",
  withdraw: "Withdraw",
};

const FN_COLORS: Record<string, string> = {
  deposit: "#34d399",
  "set-routing-rules": "#a78bfa",
  "clear-routing-rules": "#71717a",
  withdraw: "#fb923c",
};

function SkeletonCard() {
  return (
    <div className="metric-card">
      <div className="shimmer rounded" style={{ height: "12px", width: "60%", marginBottom: "16px" }} />
      <div className="shimmer rounded" style={{ height: "28px", width: "75%" }} />
    </div>
  );
}

export default function OperationsDashboard() {
  const [vault, setVault] = useState<VaultState | null>(null);
  const [blockHeight, setBlockHeight] = useState<number | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [manualAddr, setManualAddr] = useState<string | null>(null);
  const [addrInput, setAddrInput] = useState("");

  const address = manualAddr ?? DEMO_TREASURY;
  const isDemo = !manualAddr;

  const load = useCallback(async (addr: string, silent = false) => {
    if (!addr) { setLoading(false); return; }
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [vaultRes, txRes] = await Promise.all([
        fetch(`/api/vault-state?address=${encodeURIComponent(addr)}`),
        fetch(`/api/transactions?address=${encodeURIComponent(addr)}`),
      ]);

      if (vaultRes.ok) {
        const d = await vaultRes.json();
        setVault(d.state);
        setBlockHeight(d.blockHeight);
      }
      if (txRes.ok) {
        const d = await txRes.json();
        setTxs(d.results ?? []);
      }
      setLastSync(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(address);
    const interval = setInterval(() => load(address, true), 30_000);
    return () => clearInterval(interval);
  }, [address, load]);

  const totalMicro = vault ? vault.totalBalance / 1_000_000 : 0;
  const lockedMicro = vault ? vault.lockedBalance / 1_000_000 : 0;

  const animatedTotal = useCountUp(totalMicro, 4);
  const animatedLocked = useCountUp(lockedMicro, 4);

  const flowVaultTxs = txs.filter(
    (t) => t.contract_call && Object.keys(FN_LABELS).includes(t.contract_call.function_name)
  );
  const successCount = flowVaultTxs.filter((t) => t.tx_status === "success").length;
  const successRate = flowVaultTxs.length > 0 ? Math.round((successCount / flowVaultTxs.length) * 100) : 100;
  const executions = flowVaultTxs.filter(t => t.contract_call?.function_name === "deposit").length;

  const blocksToUnlock =
    vault && blockHeight && vault.lockUntilBlock > 0 && vault.lockUntilBlock > blockHeight
      ? vault.lockUntilBlock - blockHeight
      : 0;
  const daysToUnlock = blocksToUnlock > 0 ? Math.round((blocksToUnlock * 10) / 86400) : 0;

  const insights = [
    blocksToUnlock > 0
      ? { icon: "🔒", text: `Reserve unlocks in ~${daysToUnlock} days (${blocksToUnlock.toLocaleString()} blocks remaining)`, accent: "#fbbf24" }
      : { icon: "✅", text: "Reserve funds are available — lock period has ended", accent: "#34d399" },
    { icon: "⚡", text: `${executions} treasury deposit events automated since inception — zero manual intervention`, accent: "#a78bfa" },
    { icon: "🎯", text: `${successRate}% on-chain execution success rate across all FlowVault operations`, accent: "#34d399" },
    { icon: "💡", text: "Policy routes 85% to contributors, preserving 15% as strategic reserve and operational hold", accent: "#9b9ba8" },
  ];

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ padding: "32px 36px", minHeight: "100vh" }}>
      {/* Page header */}
      <div className="animate-fade-up" style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "12px", color: "#52525b", marginBottom: "6px", letterSpacing: "0.05em" }}>
              {greeting} · {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </div>
            <h1 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.02em", color: "#f0f0f3", lineHeight: 1.1, marginBottom: "8px" }}>
              Treasury Operations
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "11px",
                  color: "#52525b",
                  fontFamily: "var(--font-mono)",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "6px",
                  padding: "3px 8px",
                }}
              >
                {address.slice(0, 8)}…{address.slice(-6)}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#7c3aed",
                  background: "rgba(124,58,237,0.1)",
                  border: "1px solid rgba(124,58,237,0.2)",
                  borderRadius: "4px",
                  padding: "2px 7px",
                  fontWeight: 600,
                }}
              >
                Testnet
              </span>
              {isDemo && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmed = addrInput.trim();
                    if (trimmed.startsWith("ST") && trimmed.length > 20) {
                      setManualAddr(trimmed);
                      setAddrInput("");
                    }
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <input
                    value={addrInput}
                    onChange={(e) => setAddrInput(e.target.value)}
                    placeholder="Paste ST… address to view your vault"
                    style={{
                      width: "260px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      borderRadius: "6px",
                      padding: "4px 10px",
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      color: "#9b9ba8",
                      outline: "none",
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: "4px 12px",
                      borderRadius: "6px",
                      background: "rgba(124,58,237,0.15)",
                      border: "1px solid rgba(124,58,237,0.3)",
                      color: "#a78bfa",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Load
                  </button>
                </form>
              )}
              {manualAddr && (
                <button
                  onClick={() => setManualAddr(null)}
                  style={{
                    fontSize: "10px",
                    color: "#52525b",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "5px",
                    padding: "3px 8px",
                    cursor: "pointer",
                  }}
                >
                  ← Back to demo
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {lastSync && (
              <span style={{ fontSize: "12px", color: "#3f3f50" }}>
                Synced {timeAgo(lastSync.toISOString())}
              </span>
            )}
            <button
              onClick={() => load(address, true)}
              disabled={refreshing || loading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: refreshing ? "#52525b" : "#9b9ba8",
                fontSize: "12px",
                fontWeight: 500,
                cursor: refreshing ? "not-allowed" : "pointer",
                transition: "all 0.15s",
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }}
              >
                <path d="M10 6A4 4 0 012 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M10 3.5V6H7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <MetricCard
              label="Treasury Balance"
              value={animatedTotal.toFixed(4)}
              unit="USDCx"
              accent="violet"
              sublabel="Total vault holdings"
              delay={1}
            />
            <MetricCard
              label="Locked Reserve"
              value={animatedLocked.toFixed(4)}
              unit="USDCx"
              accent="amber"
              sublabel={daysToUnlock > 0 ? `Unlocks in ${daysToUnlock}d` : "Lock period ended"}
              badge={daysToUnlock > 0 ? `Block ${vault?.lockUntilBlock?.toLocaleString()}` : "Available"}
              delay={2}
            />
            <MetricCard
              label="Automated Events"
              value={executions}
              accent="green"
              sublabel="Deposit executions"
              badge="Zero manual ops"
              delay={3}
            />
            <MetricCard
              label="Success Rate"
              value={`${successRate}%`}
              accent="green"
              sublabel="On-chain execution"
              badge={`${successCount} confirmed`}
              delay={4}
            />
          </>
        )}
      </div>

      {/* Main content: Flow + Insights */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
        {/* Treasury Flow */}
        <div
          className="animate-fade-up-1"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "16px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#f0f0f3" }}>Treasury Flow</div>
              <div style={{ fontSize: "11px", color: "#52525b", marginTop: "2px" }}>
                Active policy · {POLICY.recipients.length} recipients
              </div>
            </div>
            <span
              style={{
                fontSize: "10px",
                padding: "3px 8px",
                borderRadius: "99px",
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.2)",
                color: "#34d399",
                letterSpacing: "0.04em",
                fontWeight: 500,
              }}
            >
              LIVE
            </span>
          </div>
          <TreasuryFlowSVG policy={POLICY} />
        </div>

        {/* AI Insights + FlowVault Status */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Insights */}
          <div
            className="animate-fade-up-2"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "16px",
              overflow: "hidden",
              flex: 1,
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L8.4 4.8H12.5L9.3 7.2L10.5 11L7 8.8L3.5 11L4.7 7.2L1.5 4.8H5.6L7 1Z" fill="#a78bfa"/>
              </svg>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#f0f0f3" }}>AI Insights</span>
            </div>
            <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {insights.map((ins, i) => (
                <InsightItem key={i} icon={ins.icon} text={ins.text} accent={ins.accent} />
              ))}
            </div>
          </div>

          {/* FlowVault Status */}
          <div
            className="animate-fade-up-3"
            style={{
              background: "rgba(124,58,237,0.05)",
              border: "1px solid rgba(124,58,237,0.15)",
              borderRadius: "14px",
              padding: "16px 18px",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#a78bfa", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
              FlowVault v2 Integration
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {[
                { k: "Contract", v: "flowvault-v2", accent: "#c4b5fd" },
                { k: "Network", v: "Stacks Testnet", accent: "#9b9ba8" },
                { k: "Token", v: "USDCx (testnet)", accent: "#9b9ba8" },
                { k: "Routing", v: `${POLICY.recipients.length} recipients · ${POLICY.reservePct}% reserve`, accent: "#9b9ba8" },
              ].map(({ k, v, accent }) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                  <span style={{ color: "#52525b" }}>{k}</span>
                  <span style={{ color: accent, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div
        className="animate-fade-up-4"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "16px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#f0f0f3" }}>Automation Activity</div>
            <div style={{ fontSize: "11px", color: "#52525b", marginTop: "2px" }}>
              Live FlowVault transaction history
            </div>
          </div>
          {txs.length > 0 && (
            <span style={{ fontSize: "11px", color: "#52525b" }}>
              {txs.length} total events
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ padding: "20px" }}>
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="shimmer"
                style={{ height: "48px", borderRadius: "8px", marginBottom: "6px" }}
              />
            ))}
          </div>
        ) : txs.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#3f3f50" }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>⏳</div>
            <div style={{ fontSize: "14px" }}>No transactions recorded yet</div>
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              Transactions will appear as the runner executes policies
            </div>
          </div>
        ) : (
          <div>
            {txs.slice(0, 15).map((tx, i) => {
              const fn = tx.contract_call?.function_name;
              const label = fn ? (FN_LABELS[fn] ?? fn) : tx.tx_type;
              const color = fn ? (FN_COLORS[fn] ?? "#9b9ba8") : "#9b9ba8";
              const isVault = fn && Object.keys(FN_LABELS).includes(fn);

              return (
                <a
                  key={tx.tx_id}
                  href={`${EXPLORER}${tx.tx_id}?chain=testnet`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "12px 20px",
                    borderBottom: i < Math.min(txs.length, 15) - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    textDecoration: "none",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Status dot */}
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: tx.tx_status === "success" ? "#10b981" : "#ef4444",
                      boxShadow: tx.tx_status === "success" ? "0 0 6px rgba(16,185,129,0.5)" : "0 0 6px rgba(239,68,68,0.5)",
                    }}
                  />

                  {/* Function badge */}
                  <div
                    style={{
                      padding: "3px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "0.02em",
                      color: isVault ? color : "#71717a",
                      background: isVault ? `${color}18` : "rgba(255,255,255,0.04)",
                      border: `1px solid ${isVault ? `${color}30` : "rgba(255,255,255,0.06)"}`,
                      flexShrink: 0,
                      minWidth: "140px",
                      textAlign: "center",
                    }}
                  >
                    {label}
                  </div>

                  {/* Meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", color: "#52525b" }}>
                      Block {tx.block_height?.toLocaleString() ?? "—"}
                      {tx.burn_block_time_iso && (
                        <span style={{ marginLeft: "8px" }}>
                          · {timeAgo(tx.burn_block_time_iso)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Txid + arrow */}
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        color: "#3f3f50",
                      }}
                    >
                      {tx.tx_id.slice(0, 10)}…
                    </span>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: "#3f3f50" }}>
                      <path d="M2 8L8 2M8 2H4M8 2v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
