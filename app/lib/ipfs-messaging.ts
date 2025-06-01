export interface IPFSMessage {
  id: string
  from: string
  to: string
  content: string
  encryptedContent?: string
  timestamp: number
  signature?: number[]
  messageType?: "text" | "image" | "file"
  nonce?: string // For uniqueness even with same content
}

export interface MessagePointer {
  cid: string
  from: string
  to: string
  timestamp: number
  discovered: number // When we discovered this message
}

export class IPFSMessagingService {
  private readonly PUBLIC_GATEWAYS = [
    "https://gateway.pinata.cloud/ipfs/",
    "https://ipfs.io/ipfs/",
    "https://cloudflare-ipfs.com/ipfs/",
    "https://dweb.link/ipfs/",
  ]

  private readonly PINATA_CREDENTIALS_KEY = "solchat_pinata_credentials"
  private readonly MESSAGE_POINTERS_KEY = "solchat_message_pointers"
  private readonly LAST_SYNC_KEY = "solchat_last_sync"

  // Local cache of message pointers (CID -> MessagePointer)
  private messagePointers: Map<string, MessagePointer> = new Map()

  constructor() {
    this.loadMessagePointers()
  }

  private loadMessagePointers() {
    try {
      const stored = localStorage.getItem(this.MESSAGE_POINTERS_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        this.messagePointers = new Map(Object.entries(data))
      }
    } catch (error) {
      console.error("Failed to load message pointers:", error)
    }
  }

  private saveMessagePointers() {
    try {
      const data = Object.fromEntries(this.messagePointers)
      localStorage.setItem(this.MESSAGE_POINTERS_KEY, JSON.stringify(data))
    } catch (error) {
      console.error("Failed to save message pointers:", error)
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

  /**
   * Store a single message as an individual IPFS object
   */
  async storeMessage(message: IPFSMessage): Promise<string> {
    const credentials = this.getPinataCredentials()
    if (!credentials) {
      throw new Error("Pinata credentials not configured. Please set them in Settings.")
    }

    try {
      // Add nonce for uniqueness
      const messageWithNonce = {
        ...message,
        nonce: Math.random().toString(36).substr(2, 9),
        timestamp: message.timestamp || Date.now(),
        type: "solchat_message",
        version: "1.0",
      }

      console.log(`📤 Storing message from ${message.from.slice(0, 8)}... to ${message.to.slice(0, 8)}...`)

      const cid = await this.storeViaPinata(messageWithNonce, credentials)

      // Create message pointer
      const pointer: MessagePointer = {
        cid,
        from: message.from,
        to: message.to,
        timestamp: message.timestamp,
        discovered: Date.now(),
      }

      // Add to local cache
      this.messagePointers.set(cid, pointer)
      this.saveMessagePointers()

      console.log(`✅ Message stored with CID: ${cid}`)
      return cid
    } catch (error) {
      console.error("❌ Failed to store message on IPFS:", error)
      throw new Error(`IPFS storage failed: ${error.message}`)
    }
  }

  private async storeViaPinata(message: any, credentials: { apiKey: string; secretKey: string }): Promise<string> {
    try {
      // Create simplified metadata with only essential key-values (max 10)
      const metadata = {
        name: `SolChat_${Date.now()}`,
        keyvalues: {
          app: "solchat",
          type: "message",
          from: message.from,
          to: message.to,
          timestamp: message.timestamp.toString(),
          // Combined participants field for searching conversations
          participants: `${message.from}_${message.to}`,
        },
      }

      console.log("📋 Storing with simplified metadata:", metadata.keyvalues)

      // Use the correct Pinata API endpoint
      const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          pinata_api_key: credentials.apiKey,
          pinata_secret_api_key: credentials.secretKey,
        },
        body: JSON.stringify({
          pinataContent: message,
          pinataMetadata: metadata,
          pinataOptions: {
            cidVersion: 1,
          },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("✅ Successfully stored on Pinata IPFS:", result.IpfsHash)
        return result.IpfsHash
      } else {
        const errorText = await response.text()
        console.error("❌ Pinata upload failed:", errorText)
        throw new Error(`Pinata upload failed: ${errorText}`)
      }
    } catch (error) {
      console.error("❌ Pinata upload failed:", error)
      throw error
    }
  }

  /**
   * Retrieve a message by its CID
   */
  async retrieveMessage(cid: string): Promise<IPFSMessage | null> {
    try {
      // Try Pinata gateway first
      try {
        const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`, {
          headers: {
            Accept: "application/json",
            "User-Agent": "SolChat/1.0",
          },
        })

        if (response.ok) {
          const message = await response.json()
          console.log(`✅ Retrieved message from Pinata: ${cid}`)
          return message
        }
      } catch (pinataError) {
        console.warn("⚠️ Pinata gateway failed:", pinataError)
      }

      // Try other public gateways
      for (const gateway of this.PUBLIC_GATEWAYS.slice(1)) {
        try {
          const response = await fetch(`${gateway}${cid}`, {
            headers: { Accept: "application/json" },
          })

          if (response.ok) {
            const message = await response.json()
            console.log(`✅ Retrieved message from ${gateway}: ${cid}`)
            return message
          }
        } catch (gatewayError) {
          console.warn(`⚠️ Gateway ${gateway} failed:`, gatewayError)
        }
      }

      throw new Error("All IPFS retrieval methods failed")
    } catch (error) {
      console.error(`❌ Failed to retrieve message ${cid}:`, error)
      return null
    }
  }

  /**
   * Discover new messages for a wallet address by searching Pinata
   */
  async discoverMessages(walletAddress: string, sinceTimestamp?: number): Promise<IPFSMessage[]> {
    const credentials = this.getPinataCredentials()
    if (!credentials) {
      console.warn("No Pinata credentials available for message discovery")
      return []
    }

    try {
      console.log(
        `🔍 Discovering messages for ${walletAddress.slice(0, 8)}... since ${sinceTimestamp ? new Date(sinceTimestamp).toLocaleString() : "beginning"}`,
      )

      const messages: IPFSMessage[] = []
      const newPointers: MessagePointer[] = []

      // Get all SolChat pins from Pinata using pinList
      const allPins = await this.getAllSolChatPins(credentials, walletAddress)

      console.log(`📋 Found ${allPins.length} SolChat pins involving this wallet`)

      // Process each pin
      for (const pin of allPins) {
        try {
          const metadata = pin.metadata?.keyvalues
          if (!metadata) continue

          // Skip if we already know about this message
          if (this.messagePointers.has(pin.ipfs_pin_hash)) {
            console.log(`⏭️ Skipping known message: ${pin.ipfs_pin_hash}`)
            continue
          }

          // Skip if message is older than our sync point
          const messageTimestamp = Number.parseInt(metadata.timestamp || "0")
          if (sinceTimestamp && messageTimestamp < sinceTimestamp) {
            console.log(`⏭️ Skipping old message: ${pin.ipfs_pin_hash} (${new Date(messageTimestamp).toLocaleString()})`)
            continue
          }

          console.log(
            `📨 Processing new message: ${pin.ipfs_pin_hash} from ${new Date(messageTimestamp).toLocaleString()}`,
          )

          // Retrieve the actual message content
          const message = await this.retrieveMessage(pin.ipfs_pin_hash)
          if (message) {
            messages.push(message)

            // Create pointer for local cache
            const pointer: MessagePointer = {
              cid: pin.ipfs_pin_hash,
              from: message.from,
              to: message.to,
              timestamp: message.timestamp,
              discovered: Date.now(),
            }
            newPointers.push(pointer)
            console.log(`✅ Successfully processed message: ${pin.ipfs_pin_hash}`)
          } else {
            console.warn(`❌ Failed to retrieve message content for: ${pin.ipfs_pin_hash}`)
          }
        } catch (error) {
          console.warn(`Failed to process pin ${pin.ipfs_pin_hash}:`, error)
        }
      }

      // Update local cache with new pointers
      for (const pointer of newPointers) {
        this.messagePointers.set(pointer.cid, pointer)
      }
      this.saveMessagePointers()

      // Update last sync timestamp
      localStorage.setItem(this.LAST_SYNC_KEY, Date.now().toString())

      console.log(`✅ Discovered ${messages.length} new messages for ${walletAddress.slice(0, 8)}...`)
      return messages.sort((a, b) => a.timestamp - b.timestamp)
    } catch (error) {
      console.error("❌ Failed to discover messages:", error)
      return []
    }
  }

  private async searchPinataMessages(credentials: any, keyvalues: any): Promise<any[]> {
    try {
      // Use pinList API to get all pins, then filter locally
      const searchParams = new URLSearchParams({
        status: "pinned",
        pageLimit: "1000", // Get up to 1000 pins
        sortBy: "date_pinned",
        sortOrder: "DESC", // Most recent first
      })

      const response = await fetch(`https://api.pinata.cloud/data/pinList?${searchParams}`, {
        headers: {
          pinata_api_key: credentials.apiKey,
          pinata_secret_api_key: credentials.secretKey,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.warn("Failed to fetch pin list:", errorText)
        return []
      }

      const data = await response.json()
      console.log(`📋 Retrieved ${data.rows?.length || 0} total pins from Pinata`)

      // Filter pins to only include SolChat messages
      const solchatPins = (data.rows || []).filter((pin: any) => {
        const metadata = pin.metadata?.keyvalues
        if (!metadata) return false

        // Must be a SolChat message
        if (metadata.app !== "solchat" || metadata.type !== "message") return false

        // Check if this message involves the target wallet
        const targetWallet = keyvalues.sender?.value || keyvalues.receiver?.value
        if (!targetWallet) return true // If no specific wallet filter, include all SolChat messages

        return metadata.from === targetWallet || metadata.to === targetWallet
      })

      console.log(`🎯 Found ${solchatPins.length} SolChat messages after filtering`)
      return solchatPins
    } catch (error) {
      console.error("Pinata pinList failed:", error)
      return []
    }
  }

  private async getAllSolChatPins(credentials: any, walletAddress: string): Promise<any[]> {
    try {
      let allPins: any[] = []
      let pageOffset = 0
      const pageLimit = 1000
      let hasMore = true

      // Paginate through all pins using the correct API
      while (hasMore) {
        const searchParams = new URLSearchParams({
          status: "pinned",
          pageLimit: pageLimit.toString(),
          pageOffset: pageOffset.toString(),
          sortBy: "date_pinned",
          sortOrder: "DESC",
        })

        const response = await fetch(`https://api.pinata.cloud/data/pinList?${searchParams}`, {
          headers: {
            pinata_api_key: credentials.apiKey,
            pinata_secret_api_key: credentials.secretKey,
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.warn(`Failed to fetch pin list page ${pageOffset}:`, errorText)
          break
        }

        const data = await response.json()
        const pins = data.rows || []

        console.log(`📄 Retrieved page ${pageOffset / pageLimit + 1}: ${pins.length} pins`)

        // Filter for SolChat messages involving this wallet
        const relevantPins = pins.filter((pin: any) => {
          const metadata = pin.metadata?.keyvalues
          if (!metadata) return false

          // Must be a SolChat message
          if (metadata.app !== "solchat" || metadata.type !== "message") return false

          // Must involve this wallet address
          return metadata.from === walletAddress || metadata.to === walletAddress
        })

        allPins = allPins.concat(relevantPins)

        // Check if we have more pages
        hasMore = pins.length === pageLimit
        pageOffset += pageLimit

        // Safety limit to prevent infinite loops
        if (pageOffset > 10000) {
          console.warn("⚠️ Reached safety limit for pin pagination")
          break
        }
      }

      console.log(`📊 Total relevant SolChat pins found: ${allPins.length}`)
      return allPins
    } catch (error) {
      console.error("Failed to get all SolChat pins:", error)
      return []
    }
  }

  /**
   * Get all known messages for a wallet address from local cache
   */
  async getKnownMessages(walletAddress: string): Promise<IPFSMessage[]> {
    const messages: IPFSMessage[] = []

    // Get relevant pointers from cache
    const relevantPointers = Array.from(this.messagePointers.values()).filter(
      (pointer) => pointer.from === walletAddress || pointer.to === walletAddress,
    )

    console.log(`📚 Loading ${relevantPointers.length} known messages for ${walletAddress.slice(0, 8)}...`)

    // Retrieve messages in parallel (with concurrency limit)
    const batchSize = 5
    for (let i = 0; i < relevantPointers.length; i += batchSize) {
      const batch = relevantPointers.slice(i, i + batchSize)

      const retrievalPromises = batch.map(async (pointer) => {
        try {
          const message = await this.retrieveMessage(pointer.cid)
          return message
        } catch (error) {
          console.warn(`Failed to retrieve cached message ${pointer.cid}:`, error)
          return null
        }
      })

      const results = await Promise.allSettled(retrievalPromises)

      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
          messages.push(result.value)
        }
      })
    }

    return messages.sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Get conversation messages between two addresses
   */
  async getConversation(address1: string, address2: string): Promise<IPFSMessage[]> {
    const allMessages = await this.getKnownMessages(address1)

    return allMessages
      .filter(
        (message) =>
          (message.from === address1 && message.to === address2) ||
          (message.from === address2 && message.to === address1),
      )
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Sync messages - discover new ones and return them
   */
  async syncMessages(walletAddress: string): Promise<IPFSMessage[]> {
    try {
      // Get last sync timestamp
      const lastSyncStr = localStorage.getItem(this.LAST_SYNC_KEY)
      const lastSync = lastSyncStr ? Number.parseInt(lastSyncStr) : 0

      console.log(`🔄 Syncing messages since ${lastSync ? new Date(lastSync).toLocaleString() : "beginning"}`)

      // Discover new messages since last sync
      const newMessages = await this.discoverMessages(walletAddress, lastSync)

      if (newMessages.length > 0) {
        console.log(`🆕 Found ${newMessages.length} new messages during sync`)
      } else {
        console.log(`✅ No new messages found during sync`)
      }

      return newMessages
    } catch (error) {
      console.error("❌ Failed to sync messages:", error)
      return []
    }
  }

  /**
   * Get statistics about stored messages
   */
  async getStats(): Promise<{
    totalPointers: number
    totalMessages: number
    lastSync: Date | null
    isConfigured: boolean
  }> {
    const credentials = this.getPinataCredentials()
    const lastSyncStr = localStorage.getItem(this.LAST_SYNC_KEY)

    return {
      totalPointers: this.messagePointers.size,
      totalMessages: this.messagePointers.size, // Same for now
      lastSync: lastSyncStr ? new Date(Number.parseInt(lastSyncStr)) : null,
      isConfigured: !!credentials,
    }
  }

  /**
   * Clear all local message cache
   */
  clearCache(): void {
    this.messagePointers.clear()
    localStorage.removeItem(this.MESSAGE_POINTERS_KEY)
    localStorage.removeItem(this.LAST_SYNC_KEY)
    console.log("🗑️ Cleared message cache")
  }
}
