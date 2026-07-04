import Link from "next/link";

interface StepRecord {
  stepIndex: number;
  stepType: string;
  label?: string;
  txId: string;
  status: "confirmed" | "failed";
  confirmedAt: string;
  explorerUrl: string;
}

// For the demo page, this shows a hardcoded or passed execution.
// In production the runner would push records to a shared store.
export default function ExecutionDetail({
  params,
}: {
  params: { id: string };
}) {
  const HIRO_EXPLORER = "https://explorer.hiro.so/?chain=testnet&txid=";

  const stepTypeLabels: Record<string, string> = {
    setRoutingRules: "Set routing rules",
    deposit: "Deposit",
    clearRoutingRules: "Clear routing rules",
  };

  const stepTypeColors: Record<string, string> = {
    setRoutingRules: "text-violet-400",
    deposit: "text-emerald-400",
    clearRoutingRules: "text-zinc-400",
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-3 mb-2">
          Execution Detail
        </h1>
        <p className="text-zinc-500 font-mono text-xs break-all">
          Plan ID: {params.id}
        </p>
      </div>

      {/* How to read this page */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 mb-8">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">
          About Execution Plans
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed mb-4">
          Each FlowPilot execution translates a treasury policy into sequential
          FlowVault contract calls. The plan below shows the exact order of
          operations. Every step is an on-chain transaction — click any txid to
          verify on the Stacks explorer.
        </p>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="bg-zinc-950 rounded p-3">
            <div className="text-violet-400 font-mono mb-1">setRoutingRules</div>
            <div className="text-zinc-500">
              Configures the single routing slot: split recipient + amount, lock
              amount + block height
            </div>
          </div>
          <div className="bg-zinc-950 rounded p-3">
            <div className="text-emerald-400 font-mono mb-1">deposit</div>
            <div className="text-zinc-500">
              Moves USDCx into vault, applying active routing rules atomically
            </div>
          </div>
          <div className="bg-zinc-950 rounded p-3">
            <div className="text-zinc-400 font-mono mb-1">clearRoutingRules</div>
            <div className="text-zinc-500">
              Resets routing slot before the hold tranche so funds stay unlocked
            </div>
          </div>
        </div>
      </div>

      {/* Sample execution timeline for demo */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">
          Step Timeline
        </h2>
        <div className="space-y-0">
          {[
            { type: "setRoutingRules", label: "Alice (50%)", status: "confirmed" },
            { type: "deposit", label: "Alice (50%)", status: "confirmed" },
            { type: "setRoutingRules", label: "Bob (35%) + Reserve (10%)", status: "confirmed" },
            { type: "deposit", label: "Bob + Reserve (45%)", status: "confirmed" },
            { type: "clearRoutingRules", label: undefined, status: "confirmed" },
            { type: "deposit", label: "Hold (5%)", status: "confirmed" },
          ].map((step, i) => (
            <div key={i} className="flex gap-4">
              {/* Connector line */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full flex-shrink-0 mt-4 ${
                    step.status === "confirmed"
                      ? "bg-emerald-400"
                      : "bg-red-400"
                  }`}
                />
                {i < 5 && (
                  <div className="w-px flex-1 bg-zinc-800 my-1" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div
                  className={`text-sm font-mono ${
                    stepTypeColors[step.type] ?? "text-zinc-400"
                  }`}
                >
                  {stepTypeLabels[step.type] ?? step.type}
                </div>
                {step.label && (
                  <div className="text-xs text-zinc-500 mt-0.5">{step.label}</div>
                )}
                <div className="text-xs text-zinc-700 mt-1 font-mono">
                  txid: <span className="text-zinc-600">0x…{i.toString().padStart(4, "0")}</span>
                  <a
                    href={`${HIRO_EXPLORER}placeholder`}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 text-violet-700 hover:text-violet-500 transition-colors"
                  >
                    explorer ↗
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-xs text-zinc-600">
        <p>
          In production the runner pushes real txids to a shared store (Upstash
          Redis / Supabase) so the web app can render live execution records. For
          this demo, the runner logs all txids to stdout and the{" "}
          <code className="text-zinc-400 font-mono">data/executions.json</code>{" "}
          file.
        </p>
      </div>
    </div>
  );
}
