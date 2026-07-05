import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "./Sidebar";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FlowPilot — AI Treasury Operating System",
  description:
    "Autonomous treasury automation on FlowVault. Set your policy once. Your treasury manages itself.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} h-full`}>
      <body className="h-full" style={{ background: "var(--bg)", color: "var(--text-1)" }}>
        {/* Ambient gradient orbs — fixed, behind everything */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
          <div
            className="orb-a absolute rounded-full"
            style={{
              width: "700px",
              height: "700px",
              top: "-280px",
              right: "-180px",
              background: "radial-gradient(circle at center, rgba(91,33,182,0.28) 0%, transparent 65%)",
              filter: "blur(60px)",
            }}
          />
          <div
            className="orb-b absolute rounded-full"
            style={{
              width: "600px",
              height: "600px",
              bottom: "-200px",
              left: "-150px",
              background: "radial-gradient(circle at center, rgba(8,145,178,0.18) 0%, transparent 65%)",
              filter: "blur(60px)",
            }}
          />
          {/* Subtle grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
              backgroundSize: "80px 80px",
            }}
          />
        </div>

        {/* App shell */}
        <div className="relative flex h-full min-h-screen" style={{ zIndex: 1 }}>
          <Sidebar />
          <div
            className="flex-1 flex flex-col min-h-screen overflow-auto"
            style={{ marginLeft: "240px" }}
          >
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
