import { randomBytes } from "@noble/hashes/utils"
import { x25519 } from "@noble/curves/ed25519"
import { xchacha20poly1305 } from "@noble/ciphers/chacha"

// Generate a new keypair for encryption
export function generateKeyPair() {
  const privateKey = randomBytes(32)
  const publicKey = x25519.getPublicKey(privateKey)

  return {
    publicKey,
    privateKey,
  }
}

// Encrypt a message using XChaCha20-Poly1305
export function encryptMessage(message, recipientPublicKey, senderPrivateKey) {
  // Derive shared secret using X25519
  const sharedSecret = x25519.getSharedSecret(senderPrivateKey, recipientPublicKey)

  // Generate nonce
  const nonce = randomBytes(24)

  // Encrypt message
  const messageBytes = new TextEncoder().encode(message)
  const cipher = xchacha20poly1305(sharedSecret, nonce)
  const encrypted = cipher.seal(messageBytes)

  return {
    encrypted: Array.from(encrypted),
    nonce: Array.from(nonce),
  }
}

// Decrypt a message
export function decryptMessage(encryptedData, senderPublicKey, recipientPrivateKey) {
  try {
    // Derive shared secret using X25519
    const sharedSecret = x25519.getSharedSecret(recipientPrivateKey, senderPublicKey)

    // Decrypt message
    const cipher = xchacha20poly1305(sharedSecret, new Uint8Array(encryptedData.nonce))
    const decrypted = cipher.open(new Uint8Array(encryptedData.encrypted))

    return new TextDecoder().decode(decrypted)
  } catch (error) {
    console.error("Decryption failed:", error)
    throw new Error("Failed to decrypt message")
  }
}

// Generate a message signature
export function signMessage(message, privateKey) {
  // In a real implementation, you would use Ed25519 signatures
  // For simplicity, we'll return a mock signature
  return {
    signature: randomBytes(64),
  }
}
