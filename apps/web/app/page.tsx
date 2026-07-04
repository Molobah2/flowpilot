"use client";

import { useState } from "react";
import Link from "next/link";

interface Recipient {
  address: string;
  sharePct: number;
  label: string;
}

const DEFAULT_RECIPIENTS: Recipient[] = [
  { address: "", sharePct: 50, label: "Alice" },
  { address: "", sharePct: 30, label: "Bob" },
];

export default function PolicyBuilder() {
  const [recipients, setRecipients] = useState<Recipient[]>(DEFAULT_RECIPIENTS);
  const [reservePct, setReservePct] = useState(10);
  const [holdPct, setHoldPct] = useState(10);
  const [unlockAt, setUnlockAt] = useState("2026-08-01");
  const [policyName, setPolicyName] = useState("my-treasury");
  const [copied, setCopied] = useState(false);

  const total =
    recipients.reduce((s, r) => s + r.sharePct, 0) + reservePct + holdPct;
  const balanced = Math.abs(total - 100) < 0.01;

  function addRecipient() {
    setRecipients([
      ...recipients,
      { address: "", sharePct: 0, label: `Recipient ${recipients.length + 1}` },
    ]);
  }

  function removeRecipient(i: number) {
    setRecipients(recipients.filter((_, idx) => idx !== i));
  }

  function updateRecipient(
    i: number,
    field: keyof Recipient,
    value: string | number
  ) {
    setRecipients(
      recipients.map((r, idx) => (idx === i ? { ...r, [field]: value } : r))
    );
  }

  const policy = {
    name: policyName,
    recipients: recipients.map((r) => ({
      address: r.address,
      sharePct: r.sharePct,
      label: r.label,
    })),
    reservePct,
    holdPct,
    unlockAt: reservePct > 0 ? `${unlockAt}T00:00:00Z` : undefined,
    trigger: "deposit",
  };

  const policyJson = JSON.stringify(policy, null, 2);

  function copyPolicy() {
    navigator.clipboard.writeText(policyJson).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const totalCalls =
    recipients.length * 2 + (holdPct > 0 ? 2 : 0);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          <span className="text-violet-400">Policy</span> Builder
        </h1>
        <p className="text-zinc-400 text-base leading-relaxed">
          Define allocation rules. FlowPilot compiles them into sequential FlowVault
          calls and executes autonomously on every incoming deposit.
        </p>
      </div>

      {/* Policy name */}
      <div className="mb-6">
        <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">
          Policy Name
        </label>
        <input
          value={policyName}
          onChange={(e) => setPolicyName(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
          placeholder="my-treasury"
        />
      </div>

      {/* Recipients */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs text-zinc-500 uppercase tracking-wider">
            Recipients
          </label>
          <button
            onClick={addRecipient}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            + Add recipient
          </button>
        </div>
        <div className="space-y-3">
          {recipients.map((r, i) => (
            <div key={i} className="flex gap-2 items-center">
              <div className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 flex gap-2 items-center">
                <input
                  value={r.label}
                  onChange={(e) => updateRecipient(i, "label", e.target.value)}
                  placeholder="Label"
                  className="w-24 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <input
                  value={r.address}
                  onChange={(e) => updateRecipient(i, "address", e.target.value)}
                  placeholder="ST... address"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={r.sharePct}
                  onChange={(e) =>
                    updateRecipient(i, "sharePct", parseFloat(e.target.value) || 0)
                  }
                  className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <span className="text-xs text-zinc-500">%</span>
              </div>
              {recipients.length > 1 && (
                <button
                  onClick={() => removeRecipient(i)}
                  className="text-zinc-600 hover:text-red-400 transition-colors text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Reserve & Hold */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
          <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-3">
            Reserve (locked)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={reservePct}
              onChange={(e) => setReservePct(parseFloat(e.target.value) || 0)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <span className="text-zinc-500 text-sm">%</span>
          </div>
          {reservePct > 0 && (
            <div className="mt-3">
              <label className="block text-xs text-zinc-600 mb-1">
                Unlock date (UTC)
              </label>
              <input
                type="date"
                value={unlockAt}
                onChange={(e) => setUnlockAt(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          )}
          <p className="text-xs text-zinc-600 mt-2">
            Locked on-chain until unlock date
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
          <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-3">
            Hold (unlocked)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={holdPct}
              onChange={(e) => setHoldPct(parseFloat(e.target.value) || 0)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <span className="text-zinc-500 text-sm">%</span>
          </div>
          <p className="text-xs text-zinc-600 mt-3">
            Stays in vault, immediately withdrawable
          </p>
        </div>
      </div>

      {/* Balance indicator */}
      <div
        className={`mb-8 flex items-center gap-2 text-sm ${
          balanced ? "text-emerald-400" : "text-amber-400"
        }`}
      >
        <span>{balanced ? "✓" : "⚠"}</span>
        <span>
          Total: {total.toFixed(1)}%{" "}
          {!balanced && `— needs ${(100 - total).toFixed(1)}% more`}
          {balanced && "— balanced"}
        </span>
      </div>

      {/* Compiled execution plan preview */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-300">
            Compiled Execution Plan
          </h2>
          <span className="text-xs text-zinc-600 font-mono">
            {totalCalls} FlowVault calls per deposit
          </span>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-3 font-mono text-xs">
          {recipients.map((r, i) => {
            const isLast = i === recipients.length - 1;
            const depositAmt = r.sharePct + (isLast && reservePct > 0 ? reservePct : 0);
            return (
              <div key={i}>
                <div className="text-zinc-500">
                  setRoutingRules{" "}
                  <span className="text-violet-400">
                    split={r.label || "?"}
                  </span>
                  {isLast && reservePct > 0 && (
                    <span className="text-amber-400"> lock={reservePct}%·D until {unlockAt}</span>
                  )}
                </div>
                <div className="text-emerald-500 pl-6">
                  → deposit({depositAmt}%·D)
                </div>
              </div>
            );
          })}
          {holdPct > 0 && (
            <div>
              <div className="text-zinc-500">clearRoutingRules</div>
              <div className="text-emerald-500 pl-6">
                → deposit({holdPct}%·D) [hold]
              </div>
            </div>
          )}
          <div className="pt-2 border-t border-zinc-800 text-zinc-600">
            ✓ Abort condition validated: split+lock ≤ deposit for every tranche
          </div>
        </div>
      </div>

      {/* Policy JSON */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-300">policy.json</h2>
          <button
            onClick={copyPolicy}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
        <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-xs font-mono text-zinc-400 overflow-x-auto">
          {policyJson}
        </pre>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <Link
          href="/dashboard"
          className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          View Dashboard →
        </Link>
        <p className="text-xs text-zinc-600">
          Save policy.json to the runner — it executes autonomously on deposit.
        </p>
      </div>
    </div>
  );
}
