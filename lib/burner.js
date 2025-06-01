import { burnerWalletStore } from "./stores.js"
import { storeOnArweave } from "./storage.js"
import { generateKeyPair } from "./encryption.js"

// Create a new burner wallet
export function createBurnerWallet() {
  const keypair = generateKeyPair()

  // Convert the Uint8Array to a string for display
  const publicKeyString = Array.from(keypair.publicKey)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  const burnerWallet = {
    keypair: {
      ...keypair,
      publicKey: {
        toString: () => publicKeyString,
      },
    },
    messages: [],
  }

  burnerWalletStore.set(burnerWallet)

  console.log("Burner wallet created:", publicKeyString)
  return burnerWallet.keypair
}

// Send a burner message with expiration
export async function sendBurnerMessage(recipientAddress, content, expirationSeconds) {
  const burnerWallet = burnerWalletStore.get()

  if (!burnerWallet.keypair) {
    throw new Error("No burner wallet available")
  }

  try {
    const message = {
      id: generateBurnerMessageId(),
      from: burnerWallet.keypair.publicKey.toString(),
      to: recipientAddress,
      content,
      timestamp: Date.now(),
      expiresAt: Date.now() + expirationSeconds * 1000,
      burner: true,
    }

    // Store on Arweave with expiration metadata
    const storageId = await storeOnArweave({
      ...message,
      selfDestruct: true,
      expirationSeconds,
    })

    message.storageId = storageId

    // Add to burner messages
    burnerWalletStore.update((store) => ({
      ...store,
      messages: [...store.messages, message],
    }))

    // Set up auto-deletion
    setTimeout(() => {
      burnerWalletStore.update((store) => ({
        ...store,
        messages: store.messages.filter((m) => m.id !== message.id),
      }))
    }, expirationSeconds * 1000)

    console.log("Burner message sent:", message.id)
    return message
  } catch (error) {
    console.error("Failed to send burner message:", error)
    throw error
  }
}

function generateBurnerMessageId() {
  return "burner_" + Date.now().toString(36) + Math.random().toString(36).substr(2)
}
