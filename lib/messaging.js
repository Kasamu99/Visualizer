import { messageStore, walletStore, settingsStore } from "./stores.js"
import { storeOnArweave, storeOnIPFS } from "./storage.js"
import { signMessage } from "./wallet.js"

// Send a message
export async function sendMessage(recipientAddress, content, expirationTime = null) {
  const wallet = walletStore.get()
  const settings = settingsStore.get()

  if (!wallet.connected) {
    throw new Error("Wallet not connected")
  }

  try {
    // Create message object
    const message = {
      id: generateMessageId(),
      from: wallet.publicKey.toString(),
      to: recipientAddress,
      content,
      timestamp: Date.now(),
      expiresAt: expirationTime ? Date.now() + expirationTime * 1000 : null,
      encrypted: settings.enableE2EE,
    }

    // Encrypt message if E2EE is enabled
    if (settings.enableE2EE) {
      // In a real implementation, you would exchange public keys
      // For demo purposes, we'll simulate encryption
      message.content = `[ENCRYPTED] ${content}`
    }

    // Sign the message
    const signature = await signMessage(JSON.stringify(message))
    message.signature = Array.from(signature.signature)

    // Store on decentralized storage
    let storageId
    if (settings.primaryStorage === "arweave") {
      storageId = await storeOnArweave(message)
    } else {
      storageId = await storeOnIPFS(message)
    }

    message.storageId = storageId

    // Add to local store
    messageStore.update((messages) => [...messages, message])

    console.log("Message sent:", message.id)
    return message
  } catch (error) {
    console.error("Failed to send message:", error)
    throw error
  }
}

// Load messages (in a real implementation, this would query the blockchain/storage)
export async function loadMessages() {
  try {
    // For demo purposes, we'll load from localStorage
    const savedMessages = localStorage.getItem("decentrachat-messages")
    if (savedMessages) {
      const messages = JSON.parse(savedMessages)
      messageStore.set(messages)
    }
  } catch (error) {
    console.error("Failed to load messages:", error)
  }
}

// Generate a unique message ID
function generateMessageId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// Save messages to localStorage (for demo purposes)
messageStore.subscribe((messages) => {
  localStorage.setItem("decentrachat-messages", JSON.stringify(messages))
})
