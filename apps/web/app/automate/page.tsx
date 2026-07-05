"use client";

import { useState } from "react";
import Link from "next/link";

interface Recipient {
  id: number;
  label: string;
  address: string;
  sharePct: number;
}

const STEPS = ["Trigger", "Recipients", "Reserves", "Review"];

let nextId = 3;

function StepBadge({ n, state }: { n: number; state: "done" | "active" | "pending" }) {
  return (
    <span className={`step-indicator step-${state}`}>
      {state === "done" ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6l2.5 2.5L9.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        n
      )}
    </span>
  );
}

function SectionCard({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.025)",
        border: `1px solid ${accent ?? "rgba(255,255,255,0.07)"}`,
        borderRadius: "16px",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function FlowPreview({
  recipients,
  reservePct,
  holdPct,
  compact = false,
}: {
  recipients: Recipient[];
  reservePct: number;
  holdPct: number;
  compact?: boolean;
}) {
  const total = recipients.reduce((s, r) => s + r.sharePct, 0) + reservePct + holdPct;
  const balanced = Math.abs(total - 100) < 0.5;

  const nodes = [
    ...recipients.map((r) => ({ label: r.label || "Wallet", pct: r.sharePct, color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" })),
    ...(reservePct > 0 ? [{ label: "Reserve 🔒", pct: reservePct, color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" }] : []),
    ...(holdPct > 0 ? [{ label: "Hold", pct: holdPct, color: "#818cf8", bg: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.2)" }] : []),
  ];

  if (nodes.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "24px", color: "#3f3f50", fontSize: "13px" }}>
        Add recipients to preview your flow
      </div>
    );
  }

  return (
    <div>
      {/* Source */}
      <div style={{ textAlign: "center", marginBottom: "6px" }}>
        <span
          style={{
            display: "inline-block",
            fontSize: "11px",
            fontWeight: 600,
            color: "#a78bfa",
            background: "rgba(124,58,237,0.1)",
            border: "1px solid rgba(124,58,237,0.25)",
            borderRadius: "8px",
            padding: "5px 14px",
          }}
        >
          Incoming Deposit
        </span>
      </div>

      <div style={{ textAlign: "center", fontSize: "18px", color: "#52525b", lineHeight: 1, margin: "4px 0" }}>
        ↓
      </div>

      {/* Engine */}
      <div style={{ textAlign: "center", marginBottom: "6px" }}>
        <span
          style={{
            display: "inline-block",
            fontSize: "11px",
            fontWeight: 600,
            color: "#a5b4fc",
            background: "rgba(79,70,229,0.1)",
            border: "1px solid rgba(79,70,229,0.25)",
            borderRadius: "8px",
            padding: "5px 14px",
          }}
        >
          ⚡ FlowPilot Engine
        </span>
      </div>

      <div style={{ textAlign: "center", fontSize: "18px", color: "#52525b", lineHeight: 1, margin: "4px 0" }}>
        ↓
      </div>

      {/* Destination nodes */}
      <div style={{ display: "flex", gap: "6px" }}>
        {nodes.map((n, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: n.bg,
              border: `1px solid ${n.border}`,
              borderRadius: "10px",
              padding: compact ? "8px 6px" : "10px 8px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "10px", fontWeight: 600, color: n.color, marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {n.label}
            </div>
            <div style={{ fontSize: compact ? "16px" : "18px", fontWeight: 700, color: n.color }}>
              {n.pct}%
            </div>
          </div>
        ))}
      </div>

      {/* Balance bar */}
      <div style={{ marginTop: "12px" }}>
        <div style={{ height: "5px", borderRadius: "99px", overflow: "hidden", background: "rgba(255,255,255,0.05)", display: "flex", gap: "2px" }}>
          {nodes.map((n, i) => (
            <div
              key={i}
              style={{
                height: "100%",
                width: `${(n.pct / Math.max(total, 1)) * 100}%`,
                background: n.color,
                borderRadius: "99px",
                transition: "width 0.3s ease",
              }}
            />
          ))}
          {!balanced && total < 100 && (
            <div
              style={{
                height: "100%",
                flex: 1,
                background: "rgba(255,255,255,0.08)",
                borderRadius: "99px",
              }}
            />
          )}
        </div>
        <div style={{ marginTop: "6px", display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
          <span style={{ color: balanced ? "#34d399" : "#f59e0b" }}>
            {balanced ? "✓ Balanced" : `${total}% of 100%`}
          </span>
          <span style={{ color: "#52525b" }}>
            {nodes.length} destinations
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AutomatePage() {
  const [step, setStep] = useState(1);
  const [trigger] = useState("deposit");
  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: 1, label: "Alice", address: "", sharePct: 50 },
    { id: 2, label: "Bob", address: "", sharePct: 35 },
  ]);
  const [reservePct, setReservePct] = useState(10);
  const [holdPct, setHoldPct] = useState(5);
  const [unlockAt, setUnlockAt] = useState("2026-08-01");
  const [policyName, setPolicyName] = useState("my-treasury");
  const [showDev, setShowDev] = useState(false);
  const [copied, setCopied] = useState(false);

  function downloadPolicy() {
    const blob = new Blob([policyJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${policyName || "policy"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const total = recipients.reduce((s, r) => s + r.sharePct, 0) + reservePct + holdPct;
  const balanced = Math.abs(total - 100) < 0.5;

  function addRecipient() {
    setRecipients([...recipients, { id: nextId++, label: `Wallet ${recipients.length + 1}`, address: "", sharePct: 0 }]);
  }

  function removeRecipient(id: number) {
    if (recipients.length <= 1) return;
    setRecipients(recipients.filter((r) => r.id !== id));
  }

  function updateRecipient(id: number, field: keyof Recipient, value: string | number) {
    setRecipients(recipients.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  const policy = {
    name: policyName,
    recipients: recipients.map((r) => ({
      address: r.address || "ST_PLACEHOLDER",
      sharePct: r.sharePct,
      label: r.label,
    })),
    reservePct,
    holdPct,
    unlockAt: reservePct > 0 ? `${unlockAt}T00:00:00Z` : undefined,
    trigger,
  };

  const policyJson = JSON.stringify(policy, null, 2);

  function copyJson() {
    navigator.clipboard.writeText(policyJson).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function canProceed(): boolean {
    if (step === 2) return recipients.length > 0 && recipients.every((r) => r.sharePct > 0);
    if (step === 3) return balanced;
    return true;
  }

  return (
    <div style={{ padding: "32px 36px", minHeight: "100vh" }}>
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.02em", color: "#f0f0f3", marginBottom: "8px" }}>
          Create Automation
        </h1>
        <p style={{ fontSize: "14px", color: "#71717a", maxWidth: "480px" }}>
          Define how your treasury distributes incoming funds. FlowPilot executes your policy
          autonomously on every deposit — no manual work required.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", alignItems: "start" }}>
        {/* Left: Step wizard */}
        <div>
          {/* Progress */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "28px",
            }}
          >
            {STEPS.map((s, i) => {
              const n = i + 1;
              const state = n < step ? "done" : n === step ? "active" : "pending";
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <StepBadge n={n} state={state} />
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: state === "active" ? 600 : 400,
                        color: state === "done" ? "#34d399" : state === "active" ? "#c4b5fd" : "#3f3f50",
                      }}
                    >
                      {s}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      style={{
                        width: "32px",
                        height: "1px",
                        background: n < step ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.08)",
                        transition: "background 0.3s",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step 1: Trigger */}
          {step === 1 && (
            <div className="slide-in">
              <SectionCard>
                <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "16px", fontWeight: 600, color: "#f0f0f3", marginBottom: "4px" }}>
                    What triggers your automation?
                  </div>
                  <div style={{ fontSize: "13px", color: "#71717a" }}>
                    Choose when FlowPilot should execute your treasury policy
                  </div>
                </div>
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* On Deposit — selected */}
                  <div
                    style={{
                      padding: "18px 20px",
                      borderRadius: "12px",
                      background: "rgba(124,58,237,0.1)",
                      border: "2px solid rgba(124,58,237,0.4)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: "rgba(124,58,237,0.2)",
                        border: "1px solid rgba(124,58,237,0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px",
                        flexShrink: 0,
                      }}
                    >
                      ⚡
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#c4b5fd", marginBottom: "2px" }}>
                        On Every Deposit
                      </div>
                      <div style={{ fontSize: "12px", color: "#7c3aed" }}>
                        Automatically routes funds whenever USDCx arrives in your vault
                      </div>
                    </div>
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        background: "#7c3aed",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2 2L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>

                  {/* Manual — disabled */}
                  <div
                    style={{
                      padding: "18px 20px",
                      borderRadius: "12px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      opacity: 0.45,
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: "rgba(255,255,255,0.04)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px",
                        flexShrink: 0,
                      }}
                    >
                      🎛️
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#9b9ba8", marginBottom: "2px", display: "flex", alignItems: "center", gap: "8px" }}>
                        Manual Execution
                        <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "99px", background: "rgba(255,255,255,0.06)", color: "#52525b" }}>Coming soon</span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#52525b" }}>
                        Trigger treasury operations on demand from the dashboard
                      </div>
                    </div>
                  </div>

                  {/* Policy name */}
                  <div style={{ marginTop: "8px" }}>
                    <label style={{ display: "block", fontSize: "11px", letterSpacing: "0.07em", textTransform: "uppercase", color: "#52525b", marginBottom: "8px", fontWeight: 500 }}>
                      Policy Name
                    </label>
                    <input
                      value={policyName}
                      onChange={(e) => setPolicyName(e.target.value)}
                      placeholder="e.g. main-treasury"
                      style={{
                        width: "100%",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.09)",
                        borderRadius: "10px",
                        padding: "10px 14px",
                        fontSize: "14px",
                        color: "#f0f0f3",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* Step 2: Recipients */}
          {step === 2 && (
            <div className="slide-in">
              <SectionCard>
                <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "16px", fontWeight: 600, color: "#f0f0f3", marginBottom: "4px" }}>
                    Who receives funds?
                  </div>
                  <div style={{ fontSize: "13px", color: "#71717a" }}>
                    Add wallet addresses and their allocation percentage
                  </div>
                </div>
                <div style={{ padding: "20px 24px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                    {recipients.map((r, i) => (
                      <div
                        key={r.id}
                        className="animate-fade-up"
                        style={{
                          background: "rgba(16,185,129,0.04)",
                          border: "1px solid rgba(16,185,129,0.15)",
                          borderRadius: "12px",
                          padding: "16px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                          <div
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              background: `hsl(${(i * 137) % 360}, 60%, 20%)`,
                              border: `1px solid hsl(${(i * 137) % 360}, 60%, 35%)`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "11px",
                              fontWeight: 700,
                              color: `hsl(${(i * 137) % 360}, 80%, 70%)`,
                              flexShrink: 0,
                            }}
                          >
                            {(r.label?.[0] ?? "W").toUpperCase()}
                          </div>
                          <input
                            value={r.label}
                            onChange={(e) => updateRecipient(r.id, "label", e.target.value)}
                            placeholder="Label"
                            style={{
                              flex: 1,
                              background: "transparent",
                              border: "none",
                              fontSize: "14px",
                              fontWeight: 600,
                              color: "#f0f0f3",
                              outline: "none",
                            }}
                          />
                          {recipients.length > 1 && (
                            <button
                              onClick={() => removeRecipient(r.id)}
                              style={{
                                width: "22px",
                                height: "22px",
                                borderRadius: "50%",
                                background: "rgba(239,68,68,0.1)",
                                border: "1px solid rgba(239,68,68,0.2)",
                                color: "#ef4444",
                                fontSize: "14px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                lineHeight: 1,
                                flexShrink: 0,
                              }}
                            >
                              ×
                            </button>
                          )}
                        </div>

                        <input
                          value={r.address}
                          onChange={(e) => updateRecipient(r.id, "address", e.target.value)}
                          placeholder="ST... wallet address"
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "8px",
                            padding: "8px 12px",
                            fontSize: "12px",
                            fontFamily: "var(--font-mono)",
                            color: "#9b9ba8",
                            outline: "none",
                            marginBottom: "10px",
                          }}
                        />

                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={r.sharePct}
                            onChange={(e) => updateRecipient(r.id, "sharePct", parseInt(e.target.value))}
                            style={{ flex: 1 }}
                          />
                          <div
                            style={{
                              minWidth: "52px",
                              textAlign: "center",
                              fontSize: "14px",
                              fontWeight: 700,
                              color: "#34d399",
                              background: "rgba(16,185,129,0.08)",
                              border: "1px solid rgba(16,185,129,0.2)",
                              borderRadius: "7px",
                              padding: "4px 10px",
                            }}
                          >
                            {r.sharePct}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={addRecipient}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "10px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px dashed rgba(255,255,255,0.12)",
                      color: "#71717a",
                      fontSize: "13px",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                      e.currentTarget.style.color = "#9b9ba8";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                      e.currentTarget.style.color = "#71717a";
                    }}
                  >
                    <span style={{ fontSize: "16px", lineHeight: 1 }}>+</span>
                    Add recipient
                  </button>
                </div>
              </SectionCard>
            </div>
          )}

          {/* Step 3: Reserves */}
          {step === 3 && (
            <div className="slide-in">
              <SectionCard>
                <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "16px", fontWeight: 600, color: "#f0f0f3", marginBottom: "4px" }}>
                    Reserve & operational hold
                  </div>
                  <div style={{ fontSize: "13px", color: "#71717a" }}>
                    Set aside funds for strategic reserves or operational liquidity
                  </div>
                </div>
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Reserve (locked) */}
                  <div
                    style={{
                      background: "rgba(245,158,11,0.06)",
                      border: "1px solid rgba(245,158,11,0.18)",
                      borderRadius: "12px",
                      padding: "18px 20px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#fbbf24", marginBottom: "2px" }}>
                          🔒 Locked Reserve
                        </div>
                        <div style={{ fontSize: "12px", color: "#78350f" }}>
                          On-chain lock — cannot be withdrawn until unlock date
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: "22px",
                          fontWeight: 700,
                          color: "#f59e0b",
                          minWidth: "56px",
                          textAlign: "right",
                        }}
                      >
                        {reservePct}%
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, 100 - holdPct - recipients.reduce((s, r) => s + r.sharePct, 0))}
                      value={reservePct}
                      onChange={(e) => setReservePct(parseInt(e.target.value))}
                      style={{ width: "100%", marginBottom: "14px" }}
                    />
                    {reservePct > 0 && (
                      <div>
                        <label style={{ fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: "#78350f", display: "block", marginBottom: "6px", fontWeight: 500 }}>
                          Unlock Date
                        </label>
                        <input
                          type="date"
                          value={unlockAt}
                          onChange={(e) => setUnlockAt(e.target.value)}
                          style={{
                            background: "rgba(245,158,11,0.08)",
                            border: "1px solid rgba(245,158,11,0.25)",
                            borderRadius: "8px",
                            padding: "8px 12px",
                            fontSize: "13px",
                            color: "#fbbf24",
                            outline: "none",
                            colorScheme: "dark",
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Hold (unlocked) */}
                  <div
                    style={{
                      background: "rgba(99,102,241,0.06)",
                      border: "1px solid rgba(99,102,241,0.18)",
                      borderRadius: "12px",
                      padding: "18px 20px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#a5b4fc", marginBottom: "2px" }}>
                          💼 Operational Hold
                        </div>
                        <div style={{ fontSize: "12px", color: "#312e81" }}>
                          Stays in vault — unlocked and withdrawable any time
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: "22px",
                          fontWeight: 700,
                          color: "#818cf8",
                          minWidth: "56px",
                          textAlign: "right",
                        }}
                      >
                        {holdPct}%
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, 100 - reservePct - recipients.reduce((s, r) => s + r.sharePct, 0))}
                      value={holdPct}
                      onChange={(e) => setHoldPct(parseInt(e.target.value))}
                      style={{ width: "100%" }}
                    />
                  </div>

                  {/* Balance indicator */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 14px",
                      borderRadius: "9px",
                      background: balanced ? "rgba(16,185,129,0.06)" : "rgba(245,158,11,0.06)",
                      border: `1px solid ${balanced ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
                    }}
                  >
                    <span style={{ fontSize: "14px" }}>{balanced ? "✅" : "⚠️"}</span>
                    <span style={{ fontSize: "13px", color: balanced ? "#34d399" : "#fbbf24", fontWeight: 500 }}>
                      {balanced
                        ? "Allocation balanced — 100% of funds accounted for"
                        : `${total.toFixed(0)}% allocated — ${(100 - total).toFixed(0)}% unassigned`}
                    </span>
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="slide-in">
              <SectionCard>
                <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "16px", fontWeight: 600, color: "#f0f0f3", marginBottom: "4px" }}>
                    Review & activate
                  </div>
                  <div style={{ fontSize: "13px", color: "#71717a" }}>
                    Your policy is ready. Review the configuration before activating.
                  </div>
                </div>
                <div style={{ padding: "20px 24px" }}>
                  {/* Summary rows */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", fontSize: "13px" }}>
                      <span style={{ color: "#71717a" }}>Policy name</span>
                      <span style={{ color: "#f0f0f3", fontWeight: 500 }}>{policyName}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", fontSize: "13px" }}>
                      <span style={{ color: "#71717a" }}>Trigger</span>
                      <span style={{ color: "#a78bfa", fontWeight: 500 }}>On every deposit ⚡</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", fontSize: "13px" }}>
                      <span style={{ color: "#71717a" }}>Recipients</span>
                      <span style={{ color: "#34d399", fontWeight: 500 }}>
                        {recipients.map((r) => `${r.label} ${r.sharePct}%`).join(" · ")}
                      </span>
                    </div>
                    {reservePct > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(245,158,11,0.06)", borderRadius: "8px", fontSize: "13px" }}>
                        <span style={{ color: "#71717a" }}>Reserve (locked)</span>
                        <span style={{ color: "#fbbf24", fontWeight: 500 }}>{reservePct}% until {unlockAt}</span>
                      </div>
                    )}
                    {holdPct > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(99,102,241,0.06)", borderRadius: "8px", fontSize: "13px" }}>
                        <span style={{ color: "#71717a" }}>Operational hold</span>
                        <span style={{ color: "#a5b4fc", fontWeight: 500 }}>{holdPct}% unlocked in vault</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", fontSize: "13px" }}>
                      <span style={{ color: "#71717a" }}>FlowVault calls / deposit</span>
                      <span style={{ color: "#f0f0f3", fontWeight: 500 }}>
                        {recipients.length * 2 + (holdPct > 0 ? 2 : 0)} transactions
                      </span>
                    </div>
                  </div>

                  {/* Download CTA */}
                  <button
                    onClick={downloadPolicy}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "14px 20px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                      border: "none",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: "pointer",
                      boxShadow: "0 4px 20px rgba(124,58,237,0.3)",
                      marginBottom: "12px",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 6px 28px rgba(124,58,237,0.45)")}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(124,58,237,0.3)")}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 1v8M3.5 6l3.5 3.5L10.5 6" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M1.5 11h11" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                    Download policy.json
                  </button>
                  <div style={{ fontSize: "12px", color: "#52525b", textAlign: "center", marginBottom: "16px" }}>
                    Save this file to your FlowPilot runner directory — it will execute automatically on every incoming deposit.
                  </div>

                  {/* Developer section (collapsed by default) */}
                  <button
                    onClick={() => setShowDev(!showDev)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: "9px",
                      color: "#52525b",
                      fontSize: "12px",
                      cursor: "pointer",
                      marginBottom: showDev ? "0" : "0",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3.5 4L1 6l2.5 2M8.5 4L11 6l-2.5 2M7 2.5L5 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                      Developer · policy.json
                    </span>
                    <span style={{ transform: showDev ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
                  </button>

                  {showDev && (
                    <div
                      style={{
                        marginTop: "8px",
                        background: "#020204",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: "10px",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <button
                          onClick={copyJson}
                          style={{
                            fontSize: "11px",
                            color: copied ? "#34d399" : "#52525b",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {copied ? "✓ Copied" : "Copy"}
                        </button>
                      </div>
                      <pre
                        style={{
                          padding: "14px",
                          fontSize: "11px",
                          fontFamily: "var(--font-mono)",
                          color: "#71717a",
                          overflowX: "auto",
                          lineHeight: 1.6,
                          margin: 0,
                        }}
                      >
                        {policyJson}
                      </pre>
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>
          )}

          {/* Navigation buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: step === 1 ? "#3f3f50" : "#9b9ba8",
                fontSize: "14px",
                fontWeight: 500,
                cursor: step === 1 ? "not-allowed" : "pointer",
                opacity: step === 1 ? 0.5 : 1,
                transition: "all 0.15s",
              }}
              disabled={step === 1}
            >
              ← Back
            </button>

            {step < 4 ? (
              <button
                onClick={() => canProceed() && setStep(step + 1)}
                style={{
                  padding: "10px 24px",
                  borderRadius: "10px",
                  background: canProceed() ? "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" : "rgba(255,255,255,0.06)",
                  border: "none",
                  color: canProceed() ? "white" : "#52525b",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: canProceed() ? "pointer" : "not-allowed",
                  transition: "all 0.15s",
                  boxShadow: canProceed() ? "0 4px 20px rgba(124,58,237,0.3)" : "none",
                }}
              >
                Continue →
              </button>
            ) : (
              <Link
                href="/"
                style={{
                  padding: "10px 24px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: 600,
                  textDecoration: "none",
                  boxShadow: "0 4px 20px rgba(16,185,129,0.3)",
                }}
              >
                View Dashboard →
              </Link>
            )}
          </div>
        </div>

        {/* Right: Live preview */}
        <div style={{ position: "sticky", top: "24px" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "16px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#9b9ba8" }}>Live Preview</span>
              <span
                style={{
                  fontSize: "9px",
                  padding: "2px 6px",
                  borderRadius: "99px",
                  background: "rgba(16,185,129,0.1)",
                  border: "1px solid rgba(16,185,129,0.2)",
                  color: "#34d399",
                  letterSpacing: "0.05em",
                  fontWeight: 600,
                }}
              >
                UPDATES LIVE
              </span>
            </div>
            <div style={{ padding: "16px" }}>
              <FlowPreview recipients={recipients} reservePct={reservePct} holdPct={holdPct} compact />
            </div>
          </div>

          {/* Info cards */}
          <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                padding: "12px 14px",
                background: "rgba(124,58,237,0.05)",
                border: "1px solid rgba(124,58,237,0.12)",
                borderRadius: "10px",
                fontSize: "12px",
                color: "#7c3aed",
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: "#a78bfa" }}>How it works:</strong> FlowPilot compiles your policy into sequential FlowVault <code style={{ fontFamily: "var(--font-mono)" }}>setRoutingRules</code> + <code style={{ fontFamily: "var(--font-mono)" }}>deposit</code> calls, executed atomically on-chain.
            </div>
            <div
              style={{
                padding: "12px 14px",
                background: "rgba(16,185,129,0.04)",
                border: "1px solid rgba(16,185,129,0.1)",
                borderRadius: "10px",
                fontSize: "12px",
                color: "#065f46",
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: "#34d399" }}>Zero manual ops:</strong> Once activated, the runner monitors your vault 24/7 and automatically executes on every incoming deposit.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
