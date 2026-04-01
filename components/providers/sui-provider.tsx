"use client";

import "@mysten/dapp-kit/dist/index.css";
import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";

const queryClient = new QueryClient();

const networks = {
  testnet: {
    url: "https://fullnode.testnet.sui.io:443",
  },
  mainnet: {
    url: "https://fullnode.mainnet.sui.io:443",
  },
};

export default function SuiProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={networks as any}   /* 👈 THIS FIXES IT */
        defaultNetwork="testnet"
      >
        <WalletProvider autoConnect>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}