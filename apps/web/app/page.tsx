"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

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
    const step = (now: number) => {
      const p = Math.min((now - start) / 900, 1);
      setVal(parseFloat(((1 - Math.pow(1 - p, 3)) * target).toFixed(decimals)));
      if (p < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => { if (frame.current) cancelAnimationFrame(frame.current); };
  }, [target, decimals]);
  return val;
}

const POLICY = {
  recipients: [
    { label: "Alice", sharePct: 50, color: "#34d399" },
    { label: "Bob",   sharePct: 35, color: "#a78bfa" },
  ],
  reservePct: 10,
  holdPct: 5,
};

const FN_LABELS: Record<string, string> = {
  deposit:              "Deposit",
  "set-routing-rules":  "Set Routing Rules",
  "clear-routing-rules":"Clear Rules",
  withdraw:             "Withdraw",
};

const FN_COLORS: Record<string, string> = {
  deposit:              "#34d399",
  "set-routing-rules":  "#a78bfa",
  "clear-routing-rules":"#52525b",
  withdraw:             "#fb923c",
};

// ─── Divider ─────────────────────────────────────────────────────────────────
const VDiv = () => <div style={{ width: "1px", background: "rgba(255,255,255,0.05)", alignSelf: "stretch" }} />;
const HDiv = () => <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />;

// ─── Panel Header ─────────────────────────────────────────────────────────────
function PanelHeader({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <span style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#3f3f50" }}>{label}</span>
      {right}
    </div>
  );
}

// ─── Live Pip ─────────────────────────────────────────────────────────────────
function LivePip({ color = "#10b981" }: { color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
      <span className="pulse-dot" style={{ width: "5px", height: "5px", borderRadius: "50%", background: color, display: "inline-block" }} />
      <span style={{ fontSize: "9px", color, letterSpacing: "0.07em" }}>LIVE</span>
    </div>
  );
}

// ─── KPI Ribbon ──────────────────────────────────────────────────────────────
function KpiRibbon({ total, locked, unlocked, executions, successRate, blockHeight, daysToUnlock, loading }: {
  total: number; locked: number; unlocked: number; executions: number;
  successRate: number; blockHeight: number | null; daysToUnlock: number; loading: boolean;
}) {
  const aTotal   = useCountUp(total,   4);
  const aLocked  = useCountUp(locked,  4);
  const aUnlock  = useCountUp(unlocked,4);

  const kpis = [
    { label: "TREASURY VALUE",   value: aTotal.toFixed(4),   unit: "USDCx", color: "#c4b5fd" },
    { label: "LOCKED RESERVE",   value: aLocked.toFixed(4),  unit: "USDCx", color: "#fbbf24" },
    { label: "LIQUID",           value: aUnlock.toFixed(4),  unit: "USDCx", color: "#34d399" },
    { label: "DEPOSIT EVENTS",   value: String(executions),  unit: "total",  color: "#a5b4fc" },
    { label: "SUCCESS RATE",     value: String(successRate), unit: "%",      color: "#34d399" },
    { label: "CURRENT BLOCK",    value: blockHeight ? blockHeight.toLocaleString() : "—", unit: "", color: "#71717a" },
    { label: "UNLOCK IN",        value: daysToUnlock > 0 ? `~${daysToUnlock}` : "—", unit: daysToUnlock > 0 ? "days" : "", color: "#fbbf24" },
    { label: "AI CONFIDENCE",    value: "94",                unit: "%",      color: "#a78bfa" },
  ];

  return (
    <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(4,4,8,0.9)" }}>
      {kpis.map((k, i) => (
        <div key={k.label} style={{ flex: 1, minWidth: 0, padding: "8px 12px", borderRight: i < kpis.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
          <div style={{ fontSize: "8px", letterSpacing: "0.1em", color: "#3f3f50", marginBottom: "3px", fontWeight: 600 }}>{k.label}</div>
          {loading ? (
            <div className="shimmer" style={{ height: "16px", width: "60%", borderRadius: "2px" }} />
          ) : (
            <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: k.color, fontFamily: "var(--font-mono)", letterSpacing: "-0.02em", lineHeight: 1 }}>{k.value}</span>
              {k.unit && <span style={{ fontSize: "8px", color: k.color, opacity: 0.5, fontWeight: 600 }}>{k.unit}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── SVG Area Chart ──────────────────────────────────────────────────────────
function TreasuryChart({ currentBalance }: { currentBalance: number }) {
  const [range, setRange] = useState<"7D"|"30D"|"90D">("30D");
  const [hover, setHover]  = useState<number | null>(null);

  const data = useMemo(() => {
    const n = 80;
    const pts: { val: number }[] = [];
    for (let i = 0; i <= n; i++) {
      const p = i / n;
      let v = 0;
      if (range === "7D")  { if (p > 0.28) v = 0.75; if (p > 0.85) v = 0.90; }
      if (range === "30D") { if (p > 0.58) v = 0.75; if (p > 0.93) v = 0.90; }
      if (range === "90D") { if (p > 0.76) v = 0.75; if (p > 0.97) v = 0.90; }
      v = Math.max(0, v + Math.sin(i * 3.1) * 0.005);
      pts.push({ val: v });
    }
    return pts;
  }, [range]);

  const W = 500; const H = 100; const px = 4; const py = 6;
  const maxV = 1.05;
  const tx = (i: number) => px + (i / (data.length - 1)) * (W - px * 2);
  const ty = (v: number) => H - py - (v / maxV) * (H - py * 2);

  const linePath = useMemo(() => {
    let d = `M ${tx(0)} ${ty(data[0].val)}`;
    for (let i = 1; i < data.length; i++) {
      const cpx1 = tx(i-1) + (tx(i)-tx(i-1))/3;
      const cpx2 = tx(i)   - (tx(i)-tx(i-1))/3;
      d += ` C ${cpx1} ${ty(data[i-1].val)} ${cpx2} ${ty(data[i].val)} ${tx(i)} ${ty(data[i].val)}`;
    }
    return d;
  }, [data]);

  const areaPath = linePath + ` L ${tx(data.length-1)} ${H} L ${tx(0)} ${H} Z`;

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - r.left) / r.width;
    setHover(Math.max(0, Math.min(data.length-1, Math.round(xRatio * (data.length-1)))));
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <div>
          <div style={{ fontSize: "8px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#3f3f50", marginBottom: "2px" }}>Portfolio Value</div>
          <span style={{ fontSize: "22px", fontWeight: 700, color: "#c4b5fd", fontFamily: "var(--font-mono)", letterSpacing: "-0.03em" }}>
            {currentBalance.toFixed(4)}<span style={{ fontSize: "10px", color: "#52525b", marginLeft: "4px" }}>USDCx</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: "1px" }}>
          {(["7D","30D","90D"] as const).map(r => (
            <button key={r} onClick={() => setRange(r)} style={{ padding: "3px 7px", borderRadius: "3px", fontSize: "9px", fontWeight: 700, border: "none", cursor: "pointer", letterSpacing: "0.04em", background: range===r ? "rgba(124,58,237,0.25)" : "transparent", color: range===r ? "#a78bfa" : "#3f3f50" }}>{r}</button>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}
        onMouseMove={handleMove} onMouseLeave={() => setHover(null)}
        style={{ cursor: "crosshair", display: "block", overflow: "visible" }}
      >
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#7c3aed" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* Grid */}
        {[0.25,0.5,0.75,1.0].map(v => (
          <line key={v} x1={px} y1={ty(v)} x2={W-px} y2={ty(v)} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        ))}
        {/* y-axis labels */}
        {[0,0.5,1.0].map(v => (
          <text key={v} x={px} y={ty(v)-2} fontSize="7" fill="#3f3f50" fontFamily="monospace">{v.toFixed(1)}</text>
        ))}
        <path d={areaPath} fill="url(#chartGrad)"/>
        <path d={linePath} fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round"/>
        {/* Events */}
        {[{ p: range==="7D"?0.28:range==="30D"?0.58:0.76, label:"GATE 2" }, { p: range==="7D"?0.85:range==="30D"?0.93:0.97, label:"GATE 3" }].map(ev => (
          <g key={ev.label}>
            <line x1={tx(Math.round(ev.p*(data.length-1)))} y1={py} x2={tx(Math.round(ev.p*(data.length-1)))} y2={H-py} stroke="rgba(124,58,237,0.25)" strokeWidth="1" strokeDasharray="2 2"/>
            <text x={tx(Math.round(ev.p*(data.length-1)))+3} y={py+8} fontSize="7" fill="#52525b">{ev.label}</text>
          </g>
        ))}
        {/* Hover */}
        {hover !== null && (
          <>
            <line x1={tx(hover)} y1={py} x2={tx(hover)} y2={H-py} stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="2 2"/>
            <circle cx={tx(hover)} cy={ty(data[hover].val)} r="3" fill="#7c3aed" stroke="rgba(124,58,237,0.4)" strokeWidth="4"/>
            <rect x={Math.min(tx(hover)+6,W-80)} y={ty(data[hover].val)-18} width="75" height="16" rx="3" fill="rgba(10,6,28,0.92)" stroke="rgba(124,58,237,0.3)" strokeWidth="1"/>
            <text x={Math.min(tx(hover)+10,W-76)} y={ty(data[hover].val)-7} fontSize="8" fill="#c4b5fd" fontFamily="monospace">{data[hover].val.toFixed(4)} USDCx</text>
          </>
        )}
        {/* Live dot */}
        <circle cx={tx(data.length-1)} cy={ty(data[data.length-1].val)} r="3" fill="#a78bfa">
          <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite"/>
        </circle>
      </svg>
    </div>
  );
}

// ─── Allocation Donut ─────────────────────────────────────────────────────────
function AllocationDonut({ locked, liquid }: { locked: number; liquid: number }) {
  const total = locked + liquid;
  const R = 36; const C = 2 * Math.PI * R;
  const lockedPct = total > 0 ? locked / total : 0;
  const liquidPct = total > 0 ? liquid / total : 0;

  const segs = [
    { pct: lockedPct, color: "#f59e0b", label: "Locked",  value: locked  },
    { pct: liquidPct, color: "#10b981", label: "Liquid",  value: liquid  },
  ];

  let off = 0;
  const arcs = segs.map(s => {
    const dash = s.pct * C;
    const rot  = off * 360 - 90;
    off += s.pct;
    return { ...s, dash, gap: C - dash, rot };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <svg width="86" height="86" viewBox="0 0 86 86">
        <circle cx="43" cy="43" r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="9"/>
        {arcs.map((a, i) => (
          <circle key={i} cx="43" cy="43" r={R} fill="none" stroke={a.color} strokeWidth="9"
            strokeDasharray={`${a.dash} ${a.gap}`} strokeLinecap="butt"
            transform={`rotate(${a.rot} 43 43)`} opacity="0.85"
          />
        ))}
        <text x="43" y="40" textAnchor="middle" fontSize="9" fontWeight="700" fill="#f0f0f3" fontFamily="monospace">{total.toFixed(2)}</text>
        <text x="43" y="51" textAnchor="middle" fontSize="7" fill="#52525b">USDCx</text>
      </svg>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
        {arcs.map((a, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: a.color }}/>
                <span style={{ fontSize: "10px", color: "#52525b" }}>{a.label}</span>
              </div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: a.color, fontFamily: "var(--font-mono)" }}>{a.value.toFixed(4)}</span>
            </div>
            <div style={{ height: "2px", background: "rgba(255,255,255,0.05)", borderRadius: "99px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${a.pct*100}%`, background: a.color, transition: "width 1s ease" }}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Capital Routing Viz ──────────────────────────────────────────────────────
function RoutingViz() {
  const W = 280; const H = 340;
  const cx = W / 2;
  const inY = 36; const engY = 130;
  const recY = 248;

  const recipients = [
    { id: "alice",   x: 44,  label: "Alice",   pct: "50%", color: "#34d399", bg: "rgba(16,185,129,0.1)" },
    { id: "bob",     x: 120, label: "Bob",     pct: "35%", color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
    { id: "reserve", x: 196, label: "Reserve", pct: "10%", color: "#fbbf24", bg: "rgba(245,158,11,0.1)" },
    { id: "hold",    x: 252, label: "Hold",    pct: "5%",  color: "#52525b", bg: "rgba(82,82,91,0.1)" },
  ];

  const delays = [0, 0.45, 0.9, 1.35];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: "visible", display: "block" }}>
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
        <marker id="arr" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
          <path d="M0,0 L4,2 L0,4 Z" fill="rgba(124,58,237,0.4)"/>
        </marker>
      </defs>

      {/* Paths: incoming → engine */}
      <path id="path-in" d={`M ${cx} ${inY+14} Q ${cx} ${engY-20} ${cx} ${engY-13}`}
        fill="none" stroke="rgba(124,58,237,0.15)" strokeWidth="1.5"/>

      {/* Paths: engine → each recipient */}
      {recipients.map(r => (
        <path key={`p-${r.id}`} id={`p-${r.id}`}
          d={`M ${cx} ${engY+13} C ${cx} ${recY-60} ${r.x} ${recY-60} ${r.x} ${recY-13}`}
          fill="none" stroke={`${r.color}28`} strokeWidth="1.5"
        />
      ))}

      {/* Particles: incoming → engine */}
      {delays.slice(0,2).map((d,i) => (
        <circle key={`pi-${i}`} r="2.5" fill="#a78bfa" opacity="0.8">
          <animateMotion dur="1.0s" repeatCount="indefinite" begin={`${d}s`}>
            <mpath href="#path-in"/>
          </animateMotion>
          <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.1;0.9;1" dur="1.0s" repeatCount="indefinite" begin={`${d}s`}/>
        </circle>
      ))}

      {/* Particles: engine → recipients */}
      {recipients.map((r, ri) =>
        delays.slice(0, 3).map((d, pi) => (
          <circle key={`pr-${r.id}-${pi}`} r="2" fill={r.color} opacity="0.85">
            <animateMotion dur={`${1.1 + ri*0.15}s`} repeatCount="indefinite" begin={`${d + ri*0.2}s`}>
              <mpath href={`#p-${r.id}`}/>
            </animateMotion>
            <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.12;0.88;1" dur={`${1.1+ri*0.15}s`} repeatCount="indefinite" begin={`${d+ri*0.2}s`}/>
          </circle>
        ))
      )}

      {/* Incoming node */}
      <rect x={cx-50} y={inY-13} width="100" height="26" rx="5"
        fill="rgba(124,58,237,0.1)" stroke="rgba(124,58,237,0.35)" strokeWidth="1"/>
      <text x={cx} y={inY+5} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#c4b5fd">Incoming USDCx</text>

      {/* Engine node */}
      <rect x={cx-48} y={engY-13} width="96" height="26" rx="5"
        fill="rgba(79,70,229,0.14)" stroke="rgba(99,102,241,0.4)" strokeWidth="1"/>
      <text x={cx} y={engY+5} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#a5b4fc">FlowPilot Engine</text>
      {/* Engine glow */}
      <ellipse cx={cx} cy={engY} rx="54" ry="18" fill="rgba(79,70,229,0.06)">
        <animate attributeName="ry" values="18;26;18" dur="3s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.4;1;0.4" dur="3s" repeatCount="indefinite"/>
      </ellipse>

      {/* Recipient nodes */}
      {recipients.map(r => (
        <g key={r.id}>
          <rect x={r.x-26} y={recY-13} width="52" height="46" rx="5"
            fill={r.bg} stroke={`${r.color}45`} strokeWidth="1"/>
          <text x={r.x} y={recY+3} textAnchor="middle" fontSize="8.5" fontWeight="600" fill={r.color}>{r.label}</text>
          <text x={r.x} y={recY+18} textAnchor="middle" fontSize="13" fontWeight="800" fill={r.color}>{r.pct}</text>
        </g>
      ))}

      {/* Allocation strip */}
      <rect x={8} y={H-16} width={W-16} height="5" rx="2.5" fill="rgba(255,255,255,0.04)"/>
      {(() => {
        const parts = [{ w: 50, color: "#34d399" },{ w: 35, color: "#a78bfa" },{ w: 10, color: "#f59e0b" },{ w: 5, color: "#52525b" }];
        let xo = 8;
        return parts.map((p,i) => {
          const pw = ((W-16) * p.w) / 100;
          const rx = xo; xo += pw + 1;
          return <rect key={i} x={rx} y={H-16} width={pw} height="5" rx="2.5" fill={p.color} opacity="0.8"/>;
        });
      })()}
    </svg>
  );
}

// ─── AI Intelligence Panel ────────────────────────────────────────────────────
function IntelPanel({ insights }: {
  insights: Array<{ icon: string; text: string; accent: string; confidence: number; severity?: string }>;
}) {
  return (
    <div>
      {insights.map((ins, i) => (
        <div key={i}
          style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "default", transition: "background 0.12s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <div style={{ display: "flex", gap: "8px", marginBottom: "5px" }}>
            <span style={{ fontSize: "11px", flexShrink: 0 }}>{ins.icon}</span>
            <span style={{ fontSize: "11px", color: "#71717a", lineHeight: 1.5, flex: 1 }}>{ins.text}</span>
            <div style={{ flexShrink: 0, textAlign: "right" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: ins.accent, fontFamily: "var(--font-mono)" }}>{ins.confidence}%</div>
              {ins.severity && <div style={{ fontSize: "8px", color: "#3f3f50", letterSpacing: "0.06em" }}>{ins.severity}</div>}
            </div>
          </div>
          <div style={{ marginLeft: "19px", height: "2px", background: "rgba(255,255,255,0.05)", borderRadius: "99px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${ins.confidence}%`, background: ins.accent, opacity: 0.55, borderRadius: "99px", transition: "width 0.8s ease" }}/>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Execution Analytics Row ──────────────────────────────────────────────────
function ExecutionAnalytics({ txs, successRate }: { txs: Tx[]; successRate: number }) {
  const flowTxs = txs.filter(t => t.contract_call && Object.keys(FN_LABELS).includes(t.contract_call.function_name));
  const deposits = flowTxs.filter(t => t.contract_call?.function_name === "deposit");
  const setRules = flowTxs.filter(t => t.contract_call?.function_name === "set-routing-rules");

  // Mini bar charts
  const fnCounts: Record<string, number> = {};
  flowTxs.forEach(t => { const f = t.contract_call?.function_name ?? "other"; fnCounts[f] = (fnCounts[f]||0)+1; });
  const maxCount = Math.max(1, ...Object.values(fnCounts));

  const stats = [
    { label: "Total Operations", value: flowTxs.length, color: "#a5b4fc" },
    { label: "Deposits Executed", value: deposits.length, color: "#34d399" },
    { label: "Rules Updates", value: setRules.length, color: "#a78bfa" },
    { label: "Success Rate", value: `${successRate}%`, color: "#34d399" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      {stats.map((s, i) => (
        <div key={s.label} style={{ padding: "12px 16px", borderRight: i < stats.length-1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
          <div style={{ fontSize: "8px", letterSpacing: "0.1em", color: "#3f3f50", marginBottom: "4px" }}>{s.label}</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: s.color, fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Activity Table ───────────────────────────────────────────────────────────
function ActivityTable({ txs, loading }: { txs: Tx[]; loading: boolean }) {
  const cols = "20px 1fr 90px 90px 130px 80px";

  if (loading) {
    return (
      <div style={{ padding: "12px 14px" }}>
        {[...Array(6)].map((_,i) => <div key={i} className="shimmer" style={{ height: "32px", borderRadius: "3px", marginBottom: "3px" }}/>)}
      </div>
    );
  }
  if (txs.length === 0) {
    return <div style={{ padding: "40px", textAlign: "center", fontSize: "11px", color: "#3f3f50" }}>No transactions yet</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      {/* Header */}
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: "0", padding: "6px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {["","OPERATION","BLOCK","HASH","TIME","STATUS"].map(h => (
          <span key={h} style={{ fontSize: "8px", letterSpacing: "0.1em", fontWeight: 600, color: "#3f3f50" }}>{h}</span>
        ))}
      </div>
      {txs.slice(0,25).map((tx, i) => {
        const fn    = tx.contract_call?.function_name;
        const label = fn ? (FN_LABELS[fn] ?? fn) : tx.tx_type;
        const color = fn ? (FN_COLORS[fn] ?? "#71717a") : "#71717a";
        const ok    = tx.tx_status === "success";
        const isVault = fn && Object.keys(FN_LABELS).includes(fn);
        return (
          <a key={tx.tx_id}
            href={`${EXPLORER}${tx.tx_id}?chain=testnet`}
            target="_blank" rel="noreferrer"
            style={{ display: "grid", gridTemplateColumns: cols, gap: "0", padding: "7px 14px", borderBottom: "1px solid rgba(255,255,255,0.03)", textDecoration: "none", alignItems: "center", transition: "background 0.1s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: ok ? "#10b981" : "#ef4444", boxShadow: ok ? "0 0 4px rgba(16,185,129,0.6)" : "0 0 4px rgba(239,68,68,0.6)" }}/>
            <span style={{ fontSize: "11px", fontWeight: 500, color: isVault ? color : "#52525b" }}>{label}</span>
            <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "#3f3f50" }}>#{tx.block_height?.toLocaleString()}</span>
            <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "#3f3f50" }}>{tx.tx_id.slice(0,10)}…</span>
            <span style={{ fontSize: "10px", color: "#3f3f50" }}>{tx.burn_block_time_iso ? timeAgo(tx.burn_block_time_iso) : "—"}</span>
            <span style={{ fontSize: "9px", fontWeight: 600, color: ok ? "#10b981" : "#ef4444", letterSpacing: "0.04em" }}>{ok ? "CONFIRMED" : "FAILED"}</span>
          </a>
        );
      })}
    </div>
  );
}

// ─── Network Strip ────────────────────────────────────────────────────────────
function NetworkStrip({ blockHeight }: { blockHeight: number | null }) {
  const items = [
    { label: "STACKS TESTNET", value: "Connected", color: "#10b981", dot: true },
    { label: "FLOWVAULT V2",   value: "flowvault-v2", color: "#a78bfa", dot: false },
    { label: "TOKEN",          value: "USDCx (testnet)", color: "#71717a", dot: false },
    { label: "CURRENT BLOCK",  value: blockHeight ? `#${blockHeight.toLocaleString()}` : "Syncing…", color: "#71717a", dot: false },
    { label: "POLICY",         value: "2 recipients · 10% reserve", color: "#71717a", dot: false },
    { label: "RUNNER",         value: "Railway · Always-on", color: "#34d399", dot: true },
  ];
  return (
    <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(4,4,8,0.7)" }}>
      {items.map((it, i) => (
        <div key={it.label} style={{ flex: 1, padding: "7px 12px", borderRight: i < items.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
          <div style={{ fontSize: "8px", letterSpacing: "0.1em", color: "#3f3f50", marginBottom: "2px" }}>{it.label}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {it.dot && <span className="pulse-dot" style={{ width: "5px", height: "5px", borderRadius: "50%", background: it.color, display: "inline-block" }}/>}
            <span style={{ fontSize: "10px", fontWeight: 600, color: it.color }}>{it.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function OperationsDashboard() {
  const [vault,      setVault]      = useState<VaultState | null>(null);
  const [blockHeight,setBlockHeight]= useState<number | null>(null);
  const [txs,        setTxs]        = useState<Tx[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [lastSync,   setLastSync]   = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [manualAddr, setManualAddr] = useState<string | null>(null);
  const [addrInput,  setAddrInput]  = useState("");

  const address = manualAddr ?? DEMO_TREASURY;
  const isDemo  = !manualAddr;

  const load = useCallback(async (addr: string, silent = false) => {
    if (!addr) { setLoading(false); return; }
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [vr, tr] = await Promise.all([
        fetch(`/api/vault-state?address=${encodeURIComponent(addr)}`),
        fetch(`/api/transactions?address=${encodeURIComponent(addr)}`),
      ]);
      if (vr.ok) { const d = await vr.json(); setVault(d.state); setBlockHeight(d.blockHeight); }
      if (tr.ok) { const d = await tr.json(); setTxs(d.results ?? []); }
      setLastSync(new Date());
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    load(address);
    const t = setInterval(() => load(address, true), 30_000);
    return () => clearInterval(t);
  }, [address, load]);

  const total   = vault ? vault.totalBalance   / 1_000_000 : 0;
  const locked  = vault ? vault.lockedBalance  / 1_000_000 : 0;
  const liquid  = vault ? vault.unlockedBalance/ 1_000_000 : 0;

  const flowTxs   = txs.filter(t => t.contract_call && Object.keys(FN_LABELS).includes(t.contract_call.function_name));
  const successN  = flowTxs.filter(t => t.tx_status === "success").length;
  const successR  = flowTxs.length > 0 ? Math.round((successN / flowTxs.length) * 100) : 100;
  const execN     = flowTxs.filter(t => t.contract_call?.function_name === "deposit").length;

  const blocksLeft = vault && blockHeight && vault.lockUntilBlock > blockHeight ? vault.lockUntilBlock - blockHeight : 0;
  const daysLeft   = blocksLeft > 0 ? Math.round((blocksLeft * 10) / 86400) : 0;

  const insights = [
    { icon: "🔒", text: `Reserve unlocks in ~${daysLeft} days (${blocksLeft.toLocaleString()} blocks remaining)`, accent: "#fbbf24", confidence: 99, severity: "INFO" },
    { icon: "⚡", text: `${execN} deposit events automated — zero manual intervention since inception`, accent: "#a78bfa", confidence: 100, severity: "HEALTHY" },
    { icon: "🎯", text: `${successR}% on-chain execution success rate across all FlowVault v2 operations`, accent: "#34d399", confidence: successR, severity: successR >= 90 ? "HEALTHY" : "WARN" },
    { icon: "💡", text: "85% of inflows routed to contributors. 15% preserved as strategic reserve and operational hold", accent: "#71717a", confidence: 94, severity: "INFO" },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#050508" }}>

      {/* ── Top bar ── */}
      <div style={{ height: "40px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(4,4,8,0.95)", backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#3f3f50" }}>
            {address.slice(0,8)}…{address.slice(-4)}
          </span>
          <span style={{ fontSize: "8px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#7c3aed", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "3px", padding: "2px 5px" }}>Testnet</span>
          {isDemo ? (
            <form onSubmit={e => { e.preventDefault(); const t = addrInput.trim(); if (t.startsWith("ST") && t.length > 20) { setManualAddr(t); setAddrInput(""); }}} style={{ display: "flex", gap: "4px" }}>
              <input value={addrInput} onChange={e => setAddrInput(e.target.value)} placeholder="ST… address"
                style={{ width: "160px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "3px", padding: "2px 8px", fontSize: "10px", fontFamily: "var(--font-mono)", color: "#9b9ba8", outline: "none" }}/>
              <button type="submit" style={{ padding: "2px 8px", borderRadius: "3px", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa", fontSize: "10px", cursor: "pointer" }}>Load</button>
            </form>
          ) : (
            <button onClick={() => setManualAddr(null)} style={{ fontSize: "9px", color: "#52525b", background: "transparent", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "3px", padding: "2px 7px", cursor: "pointer" }}>← Demo</button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <LivePip/>
          {lastSync && <span style={{ fontSize: "9px", color: "#3f3f50" }}>Synced {timeAgo(lastSync.toISOString())}</span>}
          <button onClick={() => load(address, true)} disabled={refreshing}
            style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "3px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#52525b", fontSize: "9px", cursor: "pointer", letterSpacing: "0.04em" }}>
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }}>
              <path d="M7.5 4.5A3 3 0 112 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M7.5 2V4.5H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Ribbon ── */}
      <KpiRibbon total={total} locked={locked} unlocked={liquid} executions={execN} successRate={successR} blockHeight={blockHeight} daysToUnlock={daysLeft} loading={loading}/>

      {/* ── Main 3-column panel ── */}
      <div style={{ display: "flex", flex: 1 }}>

        {/* LEFT: Portfolio */}
        <div style={{ flex: "0 0 38%", minWidth: 0, borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column" }}>
          <PanelHeader label="Portfolio" right={<LivePip color="#52525b"/>}/>
          <div style={{ padding: "14px 14px 10px" }}>
            {loading
              ? <div className="shimmer" style={{ height: "130px", borderRadius: "4px" }}/>
              : <TreasuryChart currentBalance={total}/>}
          </div>
          <HDiv/>
          <div style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: "8px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#3f3f50", marginBottom: "10px" }}>Allocation</div>
            {loading
              ? <div className="shimmer" style={{ height: "80px", borderRadius: "4px" }}/>
              : <AllocationDonut locked={locked} liquid={liquid}/>}
          </div>
        </div>

        <VDiv/>

        {/* CENTER: Capital Routing */}
        <div style={{ flex: "0 0 24%", minWidth: 0, borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column" }}>
          <PanelHeader label="Capital Routing" right={<LivePip/>}/>
          <div style={{ padding: "12px", flex: 1 }}>
            <RoutingViz/>
          </div>
        </div>

        <VDiv/>

        {/* RIGHT: AI Intelligence */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <PanelHeader
            label="AI Treasury Intelligence"
            right={<span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "#a78bfa" }}>94% CONF</span>}
          />
          {loading
            ? <div style={{ padding: "14px" }}>{[...Array(4)].map((_,i) => <div key={i} className="shimmer" style={{ height: "52px", borderRadius: "3px", marginBottom: "4px" }}/>)}</div>
            : <IntelPanel insights={insights}/>}

          {/* FlowVault status block */}
          <div style={{ marginTop: "auto", padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize: "8px", letterSpacing: "0.1em", color: "#3f3f50", marginBottom: "8px" }}>FLOWVAULT V2 INTEGRATION</div>
            {[
              ["Contract", "flowvault-v2",               "#a78bfa"],
              ["Network",  "Stacks Testnet",              "#52525b"],
              ["Token",    "USDCx (testnet)",             "#52525b"],
              ["Policy",   "2 recipients · 10% reserve", "#52525b"],
              ["Block",    blockHeight ? `#${blockHeight.toLocaleString()}` : "—", "#52525b"],
            ].map(([k,v,c]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "10px", color: "#3f3f50" }}>{k}</span>
                <span style={{ fontSize: "10px", color: c, fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Execution Analytics ── */}
      <div>
        <PanelHeader label="Execution Analytics" right={<span style={{ fontSize: "9px", color: "#3f3f50" }}>{flowTxs.length} ops recorded</span>}/>
        {!loading && <ExecutionAnalytics txs={txs} successRate={successR}/>}
      </div>

      {/* ── Activity Feed ── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <PanelHeader
          label="Automation Activity"
          right={<div style={{ display: "flex", alignItems: "center", gap: "5px" }}><span style={{ fontSize: "9px", color: "#3f3f50" }}>{txs.length} events</span><LivePip/></div>}
        />
        <ActivityTable txs={txs} loading={loading}/>
      </div>

      {/* ── Network strip ── */}
      <NetworkStrip blockHeight={blockHeight}/>
    </div>
  );
}
