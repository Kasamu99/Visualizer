"use client"

import type React from "react"
import { useMemo } from "react"
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from "@solana/wallet-adapter-wallets"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css"

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // Use mainnet for production
  const network = WalletAdapterNetwork.Mainnet

  // Use multiple RPC endpoints with fallback
  const endpoint = useMemo(() => {
    const endpoints = [
      "https://rpc.ankr.com/solana",
      "https://solana.public-rpc.com",
      "https://api.mainnet-beta.solana.com",
      "https://solana-api.projectserum.com",
    ]

    // For now, use the first one. In a real app, you'd implement endpoint rotation
    return endpoints[0]
  }, [])

  // Initialize supported wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    [],
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  )
}
