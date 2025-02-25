"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { type State, WagmiProvider } from "wagmi";

import { getConfig } from "@/lib/wagmi"; // your import path may vary
import { useTheme } from "next-themes";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { BitcoinWalletConnectors } from "@dynamic-labs/bitcoin";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import {
  DynamicContextProvider,
  FilterChain,
} from "@dynamic-labs/sdk-react-core";
import { SolanaIcon, BitcoinIcon } from "@dynamic-labs/iconic";

export function WalletProvider(props: {
  children: ReactNode;
  initialState?: State;
}) {
  const [config] = useState(() => getConfig());
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config} initialState={props.initialState}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider modalSize="compact">
          <DynamicContextProvider
            settings={{
              environmentId: process.env.NEXT_PUBLIC_DYNAMIC_BTC || "",
              walletConnectors: [
                BitcoinWalletConnectors,
                SolanaWalletConnectors,
              ],
              overrides: {
                views: [
                  {
                    type: "wallet-list",
                    tabs: {
                      items: [
                        {
                          label: { icon: <SolanaIcon /> },
                          walletsFilter: FilterChain("SOL"),
                        },
                        {
                          label: { icon: <BitcoinIcon /> },
                          walletsFilter: FilterChain("BTC"),
                        },
                      ],
                    },
                  },
                ],
              },
            }}
          >
            {props.children}
          </DynamicContextProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
