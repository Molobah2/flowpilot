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
      const { request } = await import("@stacks/connect");

      // Use SIP-030 request('getAddresses') directly — works with Leather, Xverse,
      // and any WBIP-compatible extension without requiring the connect-ui modal.
      // enableLocalStorage persists the address for the next page load.
      const result = await (request as Function)(
        { enableLocalStorage: true },
        "getAddresses",
        { network: "testnet" }
      );

      const addr = pickTestnetAddr(result?.addresses ?? []);
      if (addr) {
        setAddress(addr);
      } else {
        setError("No testnet address returned. Make sure your wallet is set to Stacks Testnet.");
      }
    } catch (e: unknown) {
      // UserCanceled (code -31001) is not an error worth showing
      const code = (e as { code?: number })?.code;
      if (code !== -31001 && code !== -32000) {
        setError("Wallet connection failed. Is Leather or Xverse installed and unlocked?");
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
