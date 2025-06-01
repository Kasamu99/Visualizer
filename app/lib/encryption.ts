import { randomBytes } from "crypto"

export class EncryptionService {
  private async generateKeyPair() {
    // Generate x25519 key pair
    const privateKey = randomBytes(32)
    const publicKey = await this.derivePublicKey(privateKey)

    return {
      privateKey: Array.from(privateKey),
      publicKey: Array.from(publicKey),
    }
  }

  private async derivePublicKey(privateKey: Uint8Array): Promise<Uint8Array> {
    // In a real implementation, this would use actual x25519 curve operations
    // For demo purposes, we'll simulate it
    return new Uint8Array(32).map((_, i) => privateKey[i] ^ 0x42)
  }

  async generateOrLoadKeys(walletAddress: string) {
    const storageKey = `encryption_keys_${walletAddress}`
    const stored = localStorage.getItem(storageKey)

    if (stored) {
      return JSON.parse(stored)
    }

    const keys = await this.generateKeyPair()
    localStorage.setItem(storageKey, JSON.stringify(keys))
    return keys
  }

  async encryptMessage(message: string, recipientPublicKey: string, senderPrivateKey: number[]): Promise<string> {
    // In a real implementation, this would use actual x25519 + ChaCha20-Poly1305
    // For demo purposes, we'll use a simple XOR cipher
    const messageBytes = new TextEncoder().encode(message)
    const key = senderPrivateKey.slice(0, 32)

    const encrypted = messageBytes.map((byte, i) => byte ^ key[i % key.length])
    return btoa(String.fromCharCode(...encrypted))
  }

  async decryptMessage(
    encryptedMessage: string,
    senderPublicKey: string,
    recipientPrivateKey: number[],
  ): Promise<string> {
    // In a real implementation, this would use actual x25519 + ChaCha20-Poly1305
    // For demo purposes, we'll use a simple XOR cipher
    const encrypted = new Uint8Array(
      atob(encryptedMessage)
        .split("")
        .map((c) => c.charCodeAt(0)),
    )
    const key = recipientPrivateKey.slice(0, 32)

    const decrypted = encrypted.map((byte, i) => byte ^ key[i % key.length])
    return new TextDecoder().decode(decrypted)
  }
}
