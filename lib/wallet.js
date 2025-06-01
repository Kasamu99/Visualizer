import { walletStore } from "./stores.js"
import { randomBytes } from "@noble/hashes/utils"

export async function connectWallet() {
  try {
    // Check if Phantom wallet is available
    if (!window.solana || !window.solana.isPhantom) {
      throw new Error("Phantom wallet not found. Please install Phantom wallet.")
    }

    const response = await window.solana.connect()

    walletStore.update((store) => ({
      ...store,
      connected: true,
      publicKey: response.publicKey,
      adapter: window.solana,
    }))

    console.log("Wallet connected:", response.publicKey.toString())
  } catch (error) {
    console.error("Failed to connect wallet:", error)
    throw error
  }
}

export async function disconnectWallet() {
  try {
    if (window.solana) {
      await window.solana.disconnect()
    }

    walletStore.update((store) => ({
      ...store,
      connected: false,
      publicKey: null,
      adapter: null,
    }))

    console.log("Wallet disconnected")
  } catch (error) {
    console.error("Failed to disconnect wallet:", error)
  }
}

export async function signMessage(message) {
  const { adapter } = walletStore.get()
  if (!adapter) {
    throw new Error("Wallet not connected")
  }

  try {
    const encodedMessage = new TextEncoder().encode(message)
    // In a real implementation, this would use the actual wallet
    // For demo purposes, we'll simulate a signature
    const signature = randomBytes(64)
    return { signature: Array.from(signature) }
  } catch (error) {
    console.error("Failed to sign message:", error)
    throw error
  }
}
