"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface WalletCtx {
  address: string | null;
  connecting: boolean;
  handleConnect: () => Promise<void>;
  handleDisconnect: () => void;
}

const WalletContext = createContext<WalletCtx>({
  address: null,
  connecting: false,
  handleConnect: async () => {},
  handleDisconnect: () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Restore persisted wallet address on mount (browser only)
  useEffect(() => {
    import("@stacks/connect")
      .then(({ isConnected, getLocalStorage }) => {
        if (isConnected()) {
          const data = getLocalStorage();
          const addr =
            data?.addresses?.stx?.find((a) => a.address.startsWith("ST"))?.address ??
            data?.addresses?.stx?.[0]?.address ??
            null;
          if (addr) setAddress(addr);
        }
      })
      .catch(() => {});
  }, []);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    try {
      const { connect } = await import("@stacks/connect");
      const result = await connect({ enableLocalStorage: true });
      // Prefer testnet address (ST prefix); wallets return both mainnet (SP) and testnet (ST)
      const stxTestnet = result.addresses.find((a) => a.address.startsWith("ST"));
      const addr = stxTestnet?.address ?? result.addresses[0]?.address ?? null;
      if (addr) setAddress(addr);
    } catch (e) {
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
  }, []);

  return (
    <WalletContext.Provider value={{ address, connecting, handleConnect, handleDisconnect }}>
      {children}
    </WalletContext.Provider>
  );
}
