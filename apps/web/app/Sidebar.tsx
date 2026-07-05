"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "./WalletContext";

const NAV = [
  {
    href: "/",
    label: "Overview",
    sub: "Operations dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6.5" height="6.5" rx="1.5" fill="currentColor" />
        <rect x="8.5" y="1" width="6.5" height="6.5" rx="1.5" fill="currentColor" opacity=".6" />
        <rect x="1" y="8.5" width="6.5" height="6.5" rx="1.5" fill="currentColor" opacity=".6" />
        <rect x="8.5" y="8.5" width="6.5" height="6.5" rx="1.5" fill="currentColor" opacity=".35" />
      </svg>
    ),
  },
  {
    href: "/automate",
    label: "Automate",
    sub: "Policy builder",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1.5L9.8 5.5H13.5L10.5 8.2L11.8 12.5L8 10L4.2 12.5L5.5 8.2L2.5 5.5H6.2L8 1.5Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/dashboard",
    label: "Vault",
    sub: "Live vault state",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1.5" y="3" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8" cy="8" r="2" fill="currentColor" />
        <line x1="11.5" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="3" y1="8" x2="4.5" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const path = usePathname();
  const { address, connecting, error, handleConnect, handleDisconnect } = useWallet();

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-30 flex flex-col"
      style={{
        width: "240px",
        background: "rgba(5,5,8,0.92)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5"
        style={{ height: "64px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="flex items-center justify-center rounded-lg"
          style={{
            width: "30px",
            height: "30px",
            background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
            boxShadow: "0 0 20px rgba(124,58,237,0.4)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1L9.2 5.4H13L9.9 8.2L11.1 12.5L7 10L2.9 12.5L4.1 8.2L1 5.4H4.8L7 1Z"
              fill="white"
            />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "-0.01em", color: "#f0f0f3" }}>
            FlowPilot
          </div>
          <div style={{ fontSize: "10px", color: "#52525b", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Treasury OS
          </div>
        </div>
      </div>

      {/* Section label */}
      <div style={{ padding: "20px 20px 8px", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#3f3f50" }}>
        Navigation
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map(({ href, label, sub, icon }) => {
          const active = path === href || (href !== "/" && path.startsWith(href));
          return (
            <Link key={href} href={href} className={`nav-item ${active ? "active" : ""}`}>
              <span style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ lineHeight: "1.2" }}>{label}</div>
                <div style={{ fontSize: "11px", color: active ? "rgba(196,181,253,0.6)" : "#3f3f50", fontWeight: 400, marginTop: "1px" }}>
                  {sub}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div style={{ margin: "0 20px", borderTop: "1px solid rgba(255,255,255,0.05)" }} />

      {/* Bottom */}
      <div className="p-4 space-y-3">
        {/* Wallet connect */}
        {address ? (
          <button
            onClick={handleDisconnect}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 12px",
              borderRadius: "10px",
              background: "rgba(124,58,237,0.1)",
              border: "1px solid rgba(124,58,237,0.3)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="4" r="2.5" fill="white" />
                <path d="M1.5 10.5C1.5 8.567 3.567 7 6 7s4.5 1.567 4.5 3.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#c4b5fd" }}>Connected</div>
              <div style={{ fontSize: "10px", color: "#7c3aed", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {address.slice(0, 8)}…{address.slice(-4)}
              </div>
            </div>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: "#4c1d95", flexShrink: 0 }}>
              <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={connecting}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 12px",
              borderRadius: "10px",
              background: connecting ? "rgba(124,58,237,0.05)" : "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              border: connecting ? "1px solid rgba(124,58,237,0.2)" : "none",
              color: "white",
              fontSize: "13px",
              fontWeight: 600,
              cursor: connecting ? "not-allowed" : "pointer",
              opacity: connecting ? 0.7 : 1,
              boxShadow: connecting ? "none" : "0 4px 16px rgba(124,58,237,0.3)",
              transition: "all 0.15s",
            }}
          >
            {connecting ? (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                  <path d="M10 6A4 4 0 012 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Connecting…
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Connect Wallet
              </>
            )}
          </button>
        )}

        {/* Wallet error */}
        {error && (
          <div
            style={{
              padding: "8px 10px",
              borderRadius: "8px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              fontSize: "10px",
              color: "#f87171",
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {/* Network status */}
        <div
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5"
          style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.15)" }}
        >
          <span className="pulse-dot w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
          <div>
            <div style={{ fontSize: "11px", fontWeight: 500, color: "#34d399" }}>Stacks Testnet</div>
            <div style={{ fontSize: "10px", color: "#065f46" }}>FlowVault v2 connected</div>
          </div>
        </div>

        {/* Bounty badge */}
        <div
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5"
          style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.15)" }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
            <path d="M6 1L7.3 4.2H10.5L8 6.3L8.9 9.5L6 7.8L3.1 9.5L4 6.3L1.5 4.2H4.7L6 1Z" fill="#a78bfa" />
          </svg>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 500, color: "#a78bfa" }}>FlowVault Bounty</div>
            <div style={{ fontSize: "10px", color: "#4c1d95" }}>Builder submission 2026</div>
          </div>
        </div>

        {/* GitHub */}
        <a
          href="https://github.com/Molobah2/flowpilot"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors"
          style={{ color: "#52525b", fontSize: "12px" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M7 .5C3.41.5.5 3.41.5 7a6.5 6.5 0 004.448 6.175c.325.06.444-.141.444-.313v-1.1c-1.806.393-2.188-.875-2.188-.875-.295-.75-.72-.95-.72-.95-.589-.403.045-.395.045-.395.65.046 1.003.668 1.003.668.577.99 1.514.703 1.884.538.059-.419.226-.703.411-.864-1.441-.164-2.955-.72-2.955-3.204 0-.708.253-1.287.668-1.74-.067-.165-.29-.824.063-1.718 0 0 .545-.174 1.784.665A6.23 6.23 0 017 3.573c.552.003 1.108.075 1.627.22 1.238-.84 1.782-.665 1.782-.665.354.894.131 1.553.064 1.718.416.453.667 1.032.667 1.74 0 2.49-1.517 3.038-2.962 3.199.233.201.44.598.44 1.205v1.786c0 .174.118.376.447.312A6.502 6.502 0 0013.5 7C13.5 3.41 10.59.5 7 .5z" />
          </svg>
          <span>View source</span>
          <span style={{ marginLeft: "auto", fontSize: "10px", opacity: 0.5 }}>↗</span>
        </a>
      </div>
    </aside>
  );
}
