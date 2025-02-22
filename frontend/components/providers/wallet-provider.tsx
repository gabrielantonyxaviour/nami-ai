"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { base } from "wagmi/chains"; // add baseSepolia for testing
import { type ReactNode, useState } from "react";
import { type State, WagmiProvider } from "wagmi";

import { getConfig } from "@/lib/wagmi"; // your import path may vary
import { useTheme } from "next-themes";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";

export function WalletProvider(props: {
  children: ReactNode;
  initialState?: State;
}) {
  const [config] = useState(() => getConfig());
  const [queryClient] = useState(() => new QueryClient());
  const { theme } = useTheme();

  return (
    <WagmiProvider config={config} initialState={props.initialState}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider modalSize="compact">
          {props.children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
