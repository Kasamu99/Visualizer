export class IPFSService {
  private readonly PUBLIC_GATEWAYS = [
    "https://gateway.pinata.cloud/ipfs/",
    "https://ipfs.io/ipfs/",
    "https://cloudflare-ipfs.com/ipfs/",
    "https://dweb.link/ipfs/",
  ]
  private messageIndex: Map<string, string[]> = new Map() // walletAddress -> [messageHashes]
  private readonly MESSAGE_INDEX_KEY = "solchat_message_index"
  private readonly PINATA_CREDENTIALS_KEY = "solchat_pinata_credentials"

  constructor() {
    this.loadMessageIndex()
  }

  private loadMessageIndex() {
    try {
      const stored = localStorage.getItem(this.MESSAGE_INDEX_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        this.messageIndex = new Map(Object.entries(data))
      }
    } catch (error) {
      console.error("Failed to load message index:", error)
    }
  }

  private saveMessageIndex() {
    try {
      const data = Object.fromEntries(this.messageIndex)
      localStorage.setItem(this.MESSAGE_INDEX_KEY, JSON.stringify(data))
    } catch (error) {
      console.error("Failed to save message index:", error)
    }
  }

  public getPinataCredentials(): { apiKey: string; secretKey: string } | null {
    // First check environment variables
    const envApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY
    const envSecret = process.env.NEXT_PUBLIC_PINATA_SECRET

    if (envApiKey && envSecret) {
      return { apiKey: envApiKey, secretKey: envSecret }
    }

    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(this.PINATA_CREDENTIALS_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.error("Failed to load Pinata credentials:", error)
    }
    return null
  }

  public setPinataCredentials(apiKey: string, secretKey: string): void {
    try {
      const credentials = { apiKey: apiKey.trim(), secretKey: secretKey.trim() }
      localStorage.setItem(this.PINATA_CREDENTIALS_KEY, JSON.stringify(credentials))
      console.log("✅ Pinata credentials saved successfully")
    } catch (error) {
      console.error("Failed to save Pinata credentials:", error)
      throw new Error("Failed to save credentials")
    }
  }

  public clearPinataCredentials(): void {
    try {
      localStorage.removeItem(this.PINATA_CREDENTIALS_KEY)
      console.log("🗑️ Pinata credentials cleared")
    } catch (error) {
      console.error("Failed to clear Pinata credentials:", error)
    }
  }

  public async testPinataConnection(): Promise<boolean> {
    const credentials = this.getPinataCredentials()
    if (!credentials) {
      throw new Error("No Pinata credentials found")
    }

    try {
      const response = await fetch("https://api.pinata.cloud/data/testAuthentication", {
        method: "GET",
        headers: {
          pinata_api_key: credentials.apiKey,
          pinata_secret_api_key: credentials.secretKey,
        },
      })

      if (response.ok) {
        const result = await response.json()
        console.log("✅ Pinata connection test successful:", result.message)
        return true
      } else {
        const error = await response.text()
        console.error("❌ Pinata connection test failed:", error)
        return false
      }
    } catch (error) {
      console.error("❌ Pinata connection test error:", error)
      return false
    }
  }

  async storeMessage(message: any): Promise<string> {
    const credentials = this.getPinataCredentials()
    if (!credentials) {
      throw new Error("Pinata credentials not configured. Please set them in Settings.")
    }

    try {
      const messageData = JSON.stringify({
        ...message,
        timestamp: Date.now(),
        type: "solchat_message",
        version: "1.0",
      })

      const cid = await this.storeViaPinata(messageData, credentials)

      // Update message index for both sender and receiver
      this.addToMessageIndex(message.from, cid)
      this.addToMessageIndex(message.to, cid)
      this.saveMessageIndex()

      return cid
    } catch (error) {
      console.error("❌ Failed to store on IPFS:", error)
      // Fallback to local storage with unique ID
      const fallbackId = `ipfs_local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      this.storeLocalFallback(fallbackId, message)
      throw new Error(`IPFS storage failed: ${error.message}. Message saved locally as fallback.`)
    }
  }

  private async storeViaPinata(data: string, credentials: { apiKey: string; secretKey: string }): Promise<string> {
    try {
      // Method 1: Pin JSON directly (recommended for text data)
      const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          pinata_api_key: credentials.apiKey,
          pinata_secret_api_key: credentials.secretKey,
        },
        body: JSON.stringify({
          pinataContent: JSON.parse(data),
          pinataMetadata: {
            name: `SolChat Message ${Date.now()}`,
            keyvalues: {
              app: "solchat",
              type: "message",
              timestamp: Date.now().toString(),
              version: "1.0",
            },
          },
          pinataOptions: {
            cidVersion: 1,
            wrapWithDirectory: false,
          },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("✅ Successfully stored on Pinata IPFS:", result.IpfsHash)
        return result.IpfsHash
      } else {
        const errorText = await response.text()
        console.warn("⚠️ Pinata JSON upload failed:", errorText)

        // Fallback to file upload method
        return await this.storeViaPinataFile(data, credentials)
      }
    } catch (error) {
      console.warn("⚠️ Pinata JSON upload failed:", error)
      // Fallback to file upload method
      return await this.storeViaPinataFile(data, credentials)
    }
  }

  private async storeViaPinataFile(data: string, credentials: { apiKey: string; secretKey: string }): Promise<string> {
    try {
      const formData = new FormData()
      formData.append("file", new Blob([data], { type: "application/json" }), "message.json")

      const metadata = JSON.stringify({
        name: `SolChat Message ${Date.now()}`,
        keyvalues: {
          app: "solchat",
          type: "message",
          timestamp: Date.now().toString(),
          version: "1.0",
        },
      })
      formData.append("pinataMetadata", metadata)

      const options = JSON.stringify({
        cidVersion: 1,
        wrapWithDirectory: false,
      })
      formData.append("pinataOptions", options)

      const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        body: formData,
        headers: {
          pinata_api_key: credentials.apiKey,
          pinata_secret_api_key: credentials.secretKey,
        },
      })

      if (response.ok) {
        const result = await response.json()
        console.log("✅ Successfully stored on Pinata IPFS (file method):", result.IpfsHash)
        return result.IpfsHash
      } else {
        const errorText = await response.text()
        throw new Error(`Pinata file upload failed: ${errorText}`)
      }
    } catch (error) {
      console.error("❌ Pinata file upload failed:", error)

      // Generate local hash as final fallback
      const hash = await this.generateContentHash(data)
      this.storeLocalFallback(hash, JSON.parse(data))
      console.log("⚠️ Using local fallback storage with hash:", hash)
      throw new Error(`All IPFS upload methods failed: ${error.message}`)
    }
  }

  private async generateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
    return `Qm${hashHex.slice(0, 44)}` // Simulate IPFS hash format
  }

  private storeLocalFallback(id: string, message: any) {
    try {
      const localStore = JSON.parse(localStorage.getItem("ipfs_local_messages") || "[]")
      localStore.push({ id, message, timestamp: Date.now() })
      localStorage.setItem("ipfs_local_messages", JSON.stringify(localStore))
      console.log("💾 Stored message locally as fallback")
    } catch (error) {
      console.error("Failed to store local fallback:", error)
    }
  }

  private addToMessageIndex(walletAddress: string, messageHash: string) {
    const existing = this.messageIndex.get(walletAddress) || []
    if (!existing.includes(messageHash)) {
      existing.push(messageHash)
      this.messageIndex.set(walletAddress, existing)
    }
  }

  async retrieveMessage(cid: string): Promise<any> {
    // Check local fallback first
    if (cid.startsWith("ipfs_local_")) {
      return this.retrieveLocalFallback(cid)
    }

    try {
      // Try Pinata gateway first (fastest for Pinata-stored content)
      try {
        const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`, {
          timeout: 5000,
          headers: {
            Accept: "application/json",
            "User-Agent": "SolChat/1.0",
          },
        })

        if (response.ok) {
          const text = await response.text()
          console.log("✅ Retrieved from Pinata gateway:", cid)
          return JSON.parse(text)
        }
      } catch (pinataError) {
        console.warn("⚠️ Pinata gateway failed:", pinataError)
      }

      // Try other public gateways
      for (const gateway of this.PUBLIC_GATEWAYS.slice(1)) {
        // Skip Pinata since we tried it first
        try {
          const response = await fetch(`${gateway}${cid}`, {
            timeout: 5000,
            headers: { Accept: "application/json" },
          })

          if (response.ok) {
            const text = await response.text()
            console.log(`✅ Retrieved from ${gateway}:`, cid)
            return JSON.parse(text)
          }
        } catch (gatewayError) {
          console.warn(`⚠️ Gateway ${gateway} failed:`, gatewayError)
        }
      }

      throw new Error("All IPFS retrieval methods failed")
    } catch (error) {
      console.error("❌ Failed to retrieve from IPFS:", error)
      return this.retrieveLocalFallback(cid)
    }
  }

  private retrieveLocalFallback(id: string): any {
    try {
      const localStore = JSON.parse(localStorage.getItem("ipfs_local_messages") || "[]")
      const entry = localStore.find((item: any) => item.id === id)
      return entry ? entry.message : null
    } catch (error) {
      console.error("Failed to retrieve local fallback:", error)
      return null
    }
  }

  async getMessagesByAddress(walletAddress: string): Promise<any[]> {
    const messageHashes = this.messageIndex.get(walletAddress) || []
    const messages: any[] = []

    console.log(`🔍 Retrieving ${messageHashes.length} messages for ${walletAddress.slice(0, 8)}...`)

    // Retrieve messages in parallel with limited concurrency
    const batchSize = 5
    for (let i = 0; i < messageHashes.length; i += batchSize) {
      const batch = messageHashes.slice(i, i + batchSize)

      const retrievalPromises = batch.map(async (hash) => {
        try {
          const message = await this.retrieveMessage(hash)
          if (message && (message.from === walletAddress || message.to === walletAddress)) {
            return { ...message, ipfsHash: hash }
          }
        } catch (error) {
          console.warn(`⚠️ Failed to retrieve message ${hash}:`, error)
        }
        return null
      })

      const results = await Promise.allSettled(retrievalPromises)

      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
          messages.push(result.value)
        }
      })
    }

    console.log(`✅ Successfully retrieved ${messages.length} messages`)
    return messages.sort((a, b) => a.timestamp - b.timestamp)
  }

  async getAllMessagesForUser(walletAddress: string): Promise<any[]> {
    try {
      // Get messages from IPFS index
      const indexedMessages = await this.getMessagesByAddress(walletAddress)

      // Also check local fallback storage
      const localStore = JSON.parse(localStorage.getItem("ipfs_local_messages") || "[]")
      const localMessages = localStore
        .filter(
          (item: any) => item.message && (item.message.from === walletAddress || item.message.to === walletAddress),
        )
        .map((item: any) => ({ ...item.message, ipfsHash: item.id }))

      // Combine and deduplicate
      const allMessages = [...indexedMessages, ...localMessages]
      const uniqueMessages = allMessages.filter(
        (message, index, self) => index === self.findIndex((m) => m.id === message.id),
      )

      return uniqueMessages.sort((a, b) => a.timestamp - b.timestamp)
    } catch (error) {
      console.error("❌ Failed to get all messages:", error)
      return []
    }
  }

  // NEW: Search Pinata for messages by wallet address using metadata
  async searchPinataForMessages(walletAddress: string): Promise<any[]> {
    const credentials = this.getPinataCredentials()
    if (!credentials) {
      console.warn("No Pinata credentials available for search")
      return []
    }

    try {
      console.log(`🔍 Searching Pinata for messages to/from ${walletAddress.slice(0, 8)}...`)

      // Search for pins with SolChat metadata
      const response = await fetch("https://api.pinata.cloud/data/pinList?status=pinned&pageLimit=1000", {
        headers: {
          pinata_api_key: credentials.apiKey,
          pinata_secret_api_key: credentials.secretKey,
        },
      })

      if (!response.ok) {
        console.warn("Failed to search Pinata pins:", await response.text())
        return []
      }

      const data = await response.json()
      const messages: any[] = []

      // Filter pins that are SolChat messages
      const solchatPins = data.rows.filter(
        (pin: any) => pin.metadata?.keyvalues?.app === "solchat" && pin.metadata?.keyvalues?.type === "message",
      )

      console.log(`📋 Found ${solchatPins.length} SolChat pins on Pinata`)

      // Retrieve and check each message
      for (const pin of solchatPins) {
        try {
          const message = await this.retrieveMessage(pin.ipfs_pin_hash)

          if (message && (message.to === walletAddress || message.from === walletAddress)) {
            // Add to our local index for faster future access
            this.addToMessageIndex(walletAddress, pin.ipfs_pin_hash)

            messages.push({
              ...message,
              ipfsHash: pin.ipfs_pin_hash,
              pinDate: pin.date_pinned,
            })

            console.log(`📨 Found message: ${message.from.slice(0, 8)}... → ${message.to.slice(0, 8)}...`)
          }
        } catch (error) {
          console.warn(`Failed to retrieve message ${pin.ipfs_pin_hash}:`, error)
        }
      }

      // Save updated index
      this.saveMessageIndex()

      console.log(`✅ Found ${messages.length} messages for ${walletAddress.slice(0, 8)}...`)
      return messages.sort((a, b) => a.timestamp - b.timestamp)
    } catch (error) {
      console.error("❌ Failed to search Pinata for messages:", error)
      return []
    }
  }

  async discoverNewMessages(walletAddress: string, knownMessageIds: string[]): Promise<any[]> {
    try {
      console.log(`🔍 Discovering new messages for ${walletAddress.slice(0, 8)}...`)

      // First, search Pinata for all messages involving this wallet
      const pinataMessages = await this.searchPinataForMessages(walletAddress)

      // Get all messages from local index as well
      const indexedMessages = await this.getAllMessagesForUser(walletAddress)

      // Combine all messages and deduplicate
      const allMessages = [...pinataMessages, ...indexedMessages]
      const uniqueMessages = allMessages.filter(
        (message, index, self) => index === self.findIndex((m) => m.id === message.id),
      )

      // Filter out known messages and only return messages TO this wallet (incoming)
      const newMessages = uniqueMessages.filter(
        (message) => !knownMessageIds.includes(message.id) && message.to === walletAddress,
      )

      if (newMessages.length > 0) {
        console.log(`🆕 Discovered ${newMessages.length} new messages for ${walletAddress.slice(0, 8)}...`)

        // Log details for debugging
        newMessages.forEach((msg) => {
          console.log(
            `📨 New message from ${msg.from.slice(0, 8)}... at ${new Date(msg.timestamp).toLocaleTimeString()}: "${msg.content}"`,
          )
        })
      } else {
        console.log(`✅ No new messages found for ${walletAddress.slice(0, 8)}...`)
      }

      return newMessages
    } catch (error) {
      console.error("❌ Failed to discover new messages:", error)
      return []
    }
  }

  // Get Pinata usage stats
  async getPinataStats(): Promise<{ pinCount: number; totalSize: number; isConfigured: boolean }> {
    const credentials = this.getPinataCredentials()
    if (!credentials) {
      return { pinCount: 0, totalSize: 0, isConfigured: false }
    }

    try {
      const response = await fetch("https://api.pinata.cloud/data/userPinnedDataTotal", {
        headers: {
          pinata_api_key: credentials.apiKey,
          pinata_secret_api_key: credentials.secretKey,
        },
      })

      if (response.ok) {
        const data = await response.json()
        return {
          pinCount: data.pin_count || 0,
          totalSize: data.pin_size_total || 0,
          isConfigured: true,
        }
      }
    } catch (error) {
      console.warn("Failed to get Pinata stats:", error)
    }

    return { pinCount: 0, totalSize: 0, isConfigured: true }
  }

  // Cleanup old message references
  async cleanupOldMessages(maxAge: number = 7 * 24 * 60 * 60 * 1000) {
    try {
      const now = Date.now()
      let cleaned = false

      console.log("🧹 Starting cleanup of old message references...")

      for (const [walletAddress, hashes] of this.messageIndex.entries()) {
        const validHashes: string[] = []

        for (const hash of hashes) {
          try {
            const message = await this.retrieveMessage(hash)
            if (message && now - message.timestamp < maxAge) {
              validHashes.push(hash)
            } else {
              cleaned = true
              console.log(`🗑️ Removing old/invalid message: ${hash}`)
            }
          } catch (error) {
            // Remove unretrievable messages
            cleaned = true
            console.log(`🗑️ Removing unretrievable message: ${hash}`)
          }
        }

        this.messageIndex.set(walletAddress, validHashes)
      }

      if (cleaned) {
        this.saveMessageIndex()
        console.log("✅ Cleaned up old IPFS message references")
      } else {
        console.log("✅ No cleanup needed")
      }
    } catch (error) {
      console.error("❌ Failed to cleanup old messages:", error)
    }
  }
}
