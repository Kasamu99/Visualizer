import { writable } from "svelte/store"

// Wallet store
export const walletStore = writable({
  connected: false,
  publicKey: null,
  adapter: null,
})

// Message store
export const messageStore = writable([])

// Contact store
export const contactStore = writable([])

// Settings store
export const settingsStore = writable({
  primaryStorage: "arweave",
  enableBackupStorage: true,
  enableE2EE: true,
  defaultExpiration: 0,
  rpcEndpoint: "https://api.mainnet-beta.solana.com",
  ipfsGateway: "https://ipfs.io/ipfs/",
})

// Burner wallet store
export const burnerWalletStore = writable({
  keypair: null,
  messages: [],
})
