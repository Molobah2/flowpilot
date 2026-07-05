"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface WalletCtx {
  address: string | null;
  connecting: boolean;
  error: string | null;
  handleConnect: () => Promise<void>;
  handleDisconnect: () => void;
}

const WalletContext = createContext<WalletCtx>({
  address: null,
  connecting: false,
  error: null,
  handleConnect: async () => {},
  handleDisconnect: () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

function pickTestnetAddr(addresses: { address: string }[]): string | null {
  return (
    addresses.find((a) => a.address.startsWith("ST"))?.address ??
    addresses[0]?.address ??
    null
  );
}

// WBIP provider type (Leather v6+, Xverse)
interface WbipProvider {
  id?: string;
  name?: string;
  icon?: string;
  webUrl?: string;
  // Sends a JSON-RPC style request to the wallet
  request: (args: { method: string; params?: Record<string, unknown> }) => Promise<{
    result?: { addresses?: { address: string; publicKey?: string }[] };
    addresses?: { address: string; publicKey?: string }[];
    error?: { code: number; message: string };
  }>;
}

function getWbipProvider(): WbipProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;

  // WBIP discovery — both Leather and Xverse register here
  const wbip = w.wbip_providers as WbipProvider[] | undefined;
  if (wbip && wbip.length > 0) {
    // Prefer Leather, then Xverse, then first available
    return (
      wbip.find((p) => p.id?.toLowerCase().includes("leather") || p.name?.toLowerCase().includes("leather")) ??
      wbip.find((p) => p.id?.toLowerCase().includes("xverse") || p.name?.toLowerCase().includes("xverse")) ??
      wbip[0]
    );
  }

  // Legacy fallback — older Leather / Hiro Wallet
  const legacy = (w.LeatherProvider ?? w.StacksProvider) as WbipProvider | undefined;
  return legacy ?? null;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore persisted session on mount
  useEffect(() => {
    import("@stacks/connect")
      .then(({ isConnected, getLocalStorage }) => {
        if (isConnected()) {
          const data = getLocalStorage();
          const addr = pickTestnetAddr(data?.addresses?.stx ?? []);
          if (addr) setAddress(addr);
        }
      })
      .catch(() => {});
  }, []);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      // --- Strategy 1: WBIP / direct provider (Leather v6+, Xverse) ---
      const provider = getWbipProvider();
      if (provider) {
        const resp = await provider.request({
          method: "getAddresses",
          params: { network: "testnet" },
        });
        // Some wallets wrap result, others return flat
        const addrs =
          resp?.result?.addresses ??
          (resp as { addresses?: { address: string }[] })?.addresses ??
          [];
        const addr = pickTestnetAddr(addrs);
        if (addr) {
          setAddress(addr);
          // Persist so @stacks/connect knows we're connected on next load
          try {
            const connectMod = await import("@stacks/connect");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (connectMod as any).setLocalStorageData?.({
              addresses: { stx: [{ address: addr, publicKey: "" }] },
            });
          } catch {}
          return;
        }
      }

      // --- Strategy 2: @stacks/connect connect() with modal ---
      // Falls back to the wallet selector UI if direct access fails
      const { connect } = await import("@stacks/connect");
      const result = await connect({ enableLocalStorage: true });
      const addr = pickTestnetAddr(result?.addresses ?? []);
      if (addr) setAddress(addr);
      else setError("No testnet address returned. Switch your wallet to Stacks Testnet.");
    } catch (e: unknown) {
      const code = (e as { code?: number })?.code;
      const msg = (e as { message?: string })?.message ?? String(e);
      // -31001 = UserCanceled, -32000 = UserRejection — don't show error for these
      if (code !== -31001 && code !== -32000) {
        setError(`Connect failed (${code ?? "—"}): ${msg}`);
      }
      console.warn("Wallet connect:", e);
    } finally {
      setConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    try {
      const { disconnect } = await import("@stacks/connect");
      disconnect();
    } catch {}
    setAddress(null);
    setError(null);
  }, []);

  return (
    <WalletContext.Provider value={{ address, connecting, error, handleConnect, handleDisconnect }}>
      {children}
    </WalletContext.Provider>
  );
}
