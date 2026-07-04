import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FlowPilot — Autonomous Treasury Engine",
  description: "Set your rules once. Your treasury manages itself.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} h-full`}>
      <body className="min-h-full bg-[#0a0a0f] text-zinc-100 font-sans antialiased">
        <nav className="border-b border-zinc-800 bg-[#0d0d14]">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg font-semibold tracking-tight">
                <span className="text-violet-400">Flow</span>Pilot
              </span>
              <span className="text-[10px] text-zinc-500 border border-zinc-700 rounded px-1.5 py-0.5 font-mono">
                TESTNET
              </span>
            </Link>
            <div className="flex items-center gap-6 text-sm text-zinc-400">
              <Link href="/" className="hover:text-zinc-100 transition-colors">Policy</Link>
              <Link href="/dashboard" className="hover:text-zinc-100 transition-colors">Dashboard</Link>
              <a
                href="https://github.com/Molobah2/flowpilot"
                target="_blank"
                rel="noreferrer"
                className="hover:text-zinc-100 transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
        <footer className="border-t border-zinc-800 mt-20">
          <div className="max-w-5xl mx-auto px-6 py-6 text-xs text-zinc-600 flex justify-between">
            <span>FlowPilot — FlowVault Builder Bounty 2026</span>
            <span>Powered by FlowVault v2 · Stacks testnet</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
