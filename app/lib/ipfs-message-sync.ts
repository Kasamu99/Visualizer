export interface MessageCID {
  cid: string
  from: string
  to: string
  timestamp: number
  discovered: number
  synced: boolean
  retryCount: number
}

export interface ChatIndex {
  walletAddress: string
  lastSync: number
  knownCIDs: Set<string>
  messagePointers: Map<string, MessageCID>
  conversationCache: Map<string, string[]> // contact -> ordered CIDs
}

export interface SyncResult {
  newMessages: any[]
  updatedConversations: string[]
  errors: string[]
  totalSynced: number
}

export class MessageSyncManager {
  private readonly SYNC_INTERVAL = 10000 // 10 seconds
  private readonly MAX_RETRIES = 3
  private readonly BATCH_SIZE = 10
  private readonly CACHE_KEY = "solchat_sync_index"
  private readonly RATE_LIMIT_DELAY = 1000 // 1 second between API calls

  private chatIndex: ChatIndex
  private syncInterval: NodeJS.Timeout | null = null
  private issyncing = false
  private lastApiCall = 0
  private syncCallbacks: ((result: SyncResult) => void)[] = []

  constructor(walletAddress: string) {
    this.chatIndex = this.loadOrCreateIndex(walletAddress)
  }

  private loadOrCreateIndex(walletAddress: string): ChatIndex {
    try {
      const stored = localStorage.getItem(`${this.CACHE_KEY}_${walletAddress}`)
      if (stored) {
        const data = JSON.parse(stored)
        return {
          walletAddress,
          lastSync: data.lastSync || 0,
          knownCIDs: new Set(data.knownCIDs || []),
          messagePointers: new Map(Object.entries(data.messagePointers || {})),
          conversationCache: new Map(Object.entries(data.conversationCache || {})),
        }
      }
    } catch (error) {
      console.error("Failed to load sync index:", error)
    }

    return {
      walletAddress,
      lastSync: 0,
      knownCIDs: new Set(),
      messagePointers: new Map(),
      conversationCache: new Map(),
    }
  }

  private saveIndex(): void {
    try {
      const data = {
        lastSync: this.chatIndex.lastSync,
        knownCIDs: Array.from(this.chatIndex.knownCIDs),
        messagePointers: Object.fromEntries(this.chatIndex.messagePointers),
        conversationCache: Object.fromEntries(this.chatIndex.conversationCache),
      }
      localStorage.setItem(`${this.CACHE_KEY}_${this.chatIndex.walletAddress}`, JSON.stringify(data))
    } catch (error) {
      console.error("Failed to save sync index:", error)
    }
  }

  private async rateLimitedApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
    const now = Date.now()
    const timeSinceLastCall = now - this.lastApiCall

    if (timeSinceLastCall < this.RATE_LIMIT_DELAY) {
      await new Promise((resolve) => setTimeout(resolve, this.RATE_LIMIT_DELAY - timeSinceLastCall))
    }

    this.lastApiCall = Date.now()
    return apiCall()
  }

  /**
   * Discover new message CIDs from Pinata using search API
   */
  async discoverNewCIDs(credentials: { apiKey: string; secretKey: string }): Promise<MessageCID[]> {
    try {
      console.log(`🔍 Discovering new message CIDs for ${this.chatIndex.walletAddress.slice(0, 8)}...`)

      const searchQueries = [
        // Messages TO this wallet
        {
          keyvalues: {
            app: { value: "solchat", op: "eq" },
            type: { value: "message", op: "eq" },
            to: { value: this.chatIndex.walletAddress, op: "eq" },
          },
        },
        // Messages FROM this wallet
        {
          keyvalues: {
            app: { value: "solchat", op: "eq" },
            type: { value: "message", op: "eq" },
            from: { value: this.chatIndex.walletAddress, op: "eq" },
          },
        },
      ]

      const allCIDs: MessageCID[] = []

      for (const query of searchQueries) {
        try {
          const searchParams = new URLSearchParams({
            status: "pinned",
            pageLimit: "1000",
            metadata: JSON.stringify(query),
          })

          const response = await this.rateLimitedApiCall(() =>
            fetch(`https://api.pinata.cloud/data/pinList?${searchParams}`, {
              headers: {
                pinata_api_key: credentials.apiKey,
                pinata_secret_api_key: credentials.secretKey,
              },
            }),
          )

          if (!response.ok) {
            console.warn(`Pinata search failed: ${response.status}`)
            continue
          }

          const data = await response.json()
          console.log(`📋 Found ${data.rows.length} pins for query`)

          for (const pin of data.rows) {
            const metadata = pin.metadata?.keyvalues
            if (!metadata) continue

            // Skip if we already know about this CID
            if (this.chatIndex.knownCIDs.has(pin.ipfs_pin_hash)) continue

            // Skip if message is older than our last sync (with buffer)
            const messageTimestamp = Number.parseInt(metadata.timestamp || "0")
            if (messageTimestamp < this.chatIndex.lastSync - 60000) continue // 1 minute buffer

            const messageCID: MessageCID = {
              cid: pin.ipfs_pin_hash,
              from: metadata.from || "",
              to: metadata.to || "",
              timestamp: messageTimestamp,
              discovered: Date.now(),
              synced: false,
              retryCount: 0,
            }

            allCIDs.push(messageCID)
            this.chatIndex.knownCIDs.add(pin.ipfs_pin_hash)
            this.chatIndex.messagePointers.set(pin.ipfs_pin_hash, messageCID)
          }
        } catch (error) {
          console.error("Search query failed:", error)
        }
      }

      console.log(`✅ Discovered ${allCIDs.length} new message CIDs`)
      return allCIDs.sort((a, b) => a.timestamp - b.timestamp)
    } catch (error) {
      console.error("❌ Failed to discover new CIDs:", error)
      return []
    }
  }

  /**
   * Retrieve message content from IPFS gateways with fallback
   */
  async retrieveMessage(cid: string, retryCount = 0): Promise<any | null> {
    const gateways = [
      "https://gateway.pinata.cloud/ipfs/",
      "https://ipfs.io/ipfs/",
      "https://cloudflare-ipfs.com/ipfs/",
      "https://dweb.link/ipfs/",
    ]

    for (const gateway of gateways) {
      try {
        const response = await fetch(`${gateway}${cid}`, {
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        })

        if (response.ok) {
          const message = await response.json()
          console.log(`✅ Retrieved message ${cid.slice(0, 8)}... from ${gateway}`)
          return message
        }
      } catch (error) {
        console.warn(`⚠️ Gateway ${gateway} failed for ${cid}:`, error.message)
      }
    }

    // Mark for retry if under limit
    const pointer = this.chatIndex.messagePointers.get(cid)
    if (pointer && pointer.retryCount < this.MAX_RETRIES) {
      pointer.retryCount++
      console.log(`🔄 Will retry ${cid} (attempt ${pointer.retryCount}/${this.MAX_RETRIES})`)
    }

    return null
  }

  /**
   * Sync messages in ordered batches
   */
  async syncMessages(credentials: { apiKey: string; secretKey: string }): Promise<SyncResult> {
    if (this.issyncing) {
      console.log("⏳ Sync already in progress, skipping...")
      return { newMessages: [], updatedConversations: [], errors: [], totalSynced: 0 }
    }

    this.issyncing = true
    const result: SyncResult = {
      newMessages: [],
      updatedConversations: [],
      errors: [],
      totalSynced: 0,
    }

    try {
      console.log(`🔄 Starting message sync for ${this.chatIndex.walletAddress.slice(0, 8)}...`)

      // Step 1: Discover new CIDs
      const newCIDs = await this.discoverNewCIDs(credentials)

      // Step 2: Retrieve messages in chronological batches
      const unsynced = Array.from(this.chatIndex.messagePointers.values())
        .filter((pointer) => !pointer.synced && pointer.retryCount < this.MAX_RETRIES)
        .sort((a, b) => a.timestamp - b.timestamp)

      const allToSync = [...newCIDs, ...unsynced]
      console.log(`📦 Processing ${allToSync.length} messages in batches of ${this.BATCH_SIZE}`)

      for (let i = 0; i < allToSync.length; i += this.BATCH_SIZE) {
        const batch = allToSync.slice(i, i + this.BATCH_SIZE)

        const batchPromises = batch.map(async (pointer) => {
          try {
            const message = await this.retrieveMessage(pointer.cid)
            if (message) {
              // Mark as synced
              pointer.synced = true
              this.chatIndex.messagePointers.set(pointer.cid, pointer)

              // Update conversation cache
              this.updateConversationCache(message)

              return message
            }
            return null
          } catch (error) {
            result.errors.push(`Failed to retrieve ${pointer.cid}: ${error.message}`)
            return null
          }
        })

        const batchResults = await Promise.allSettled(batchPromises)

        batchResults.forEach((promiseResult, index) => {
          if (promiseResult.status === "fulfilled" && promiseResult.value) {
            result.newMessages.push(promiseResult.value)
            result.totalSynced++
          }
        })

        // Small delay between batches to be respectful to gateways
        if (i + this.BATCH_SIZE < allToSync.length) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      // Step 3: Update sync timestamp and save
      this.chatIndex.lastSync = Date.now()
      this.saveIndex()

      // Step 4: Sort messages chronologically
      result.newMessages.sort((a, b) => a.timestamp - b.timestamp)

      console.log(`✅ Sync complete: ${result.totalSynced} messages synced, ${result.errors.length} errors`)

      // Notify callbacks
      this.syncCallbacks.forEach((callback) => callback(result))

      return result
    } catch (error) {
      console.error("❌ Sync failed:", error)
      result.errors.push(`Sync failed: ${error.message}`)
      return result
    } finally {
      this.issyncing = false
    }
  }

  private updateConversationCache(message: any): void {
    const { from, to, timestamp } = message
    const walletAddress = this.chatIndex.walletAddress

    // Determine the other party in the conversation
    const otherParty = from === walletAddress ? to : from

    // Get existing conversation CIDs
    const conversationCIDs = this.chatIndex.conversationCache.get(otherParty) || []

    // Add this message CID if not already present
    const messageCID = this.findCIDForMessage(message)
    if (messageCID && !conversationCIDs.includes(messageCID)) {
      conversationCIDs.push(messageCID)

      // Sort by timestamp (we have timestamp info in pointers)
      conversationCIDs.sort((a, b) => {
        const pointerA = this.chatIndex.messagePointers.get(a)
        const pointerB = this.chatIndex.messagePointers.get(b)
        return (pointerA?.timestamp || 0) - (pointerB?.timestamp || 0)
      })

      this.chatIndex.conversationCache.set(otherParty, conversationCIDs)
    }
  }

  private findCIDForMessage(message: any): string | null {
    // Find the CID that corresponds to this message
    for (const [cid, pointer] of this.chatIndex.messagePointers) {
      if (
        pointer.from === message.from &&
        pointer.to === message.to &&
        Math.abs(pointer.timestamp - message.timestamp) < 1000
      ) {
        // 1 second tolerance
        return cid
      }
    }
    return null
  }

  /**
   * Get conversation messages in chronological order
   */
  async getConversationMessages(contactAddress: string): Promise<any[]> {
    const conversationCIDs = this.chatIndex.conversationCache.get(contactAddress) || []
    const messages: any[] = []

    for (const cid of conversationCIDs) {
      try {
        const message = await this.retrieveMessage(cid)
        if (message) {
          messages.push(message)
        }
      } catch (error) {
        console.warn(`Failed to retrieve conversation message ${cid}:`, error)
      }
    }

    // Final sort by timestamp to ensure chronological order
    return messages.sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Start automatic syncing
   */
  startAutoSync(credentials: { apiKey: string; secretKey: string }): void {
    this.stopAutoSync()

    console.log(`🔄 Starting auto-sync every ${this.SYNC_INTERVAL / 1000} seconds`)

    // Initial sync
    this.syncMessages(credentials)

    // Set up interval
    this.syncInterval = setInterval(() => {
      this.syncMessages(credentials)
    }, this.SYNC_INTERVAL)
  }

  /**
   * Stop automatic syncing
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      console.log("⏹️ Auto-sync stopped")
    }
  }

  /**
   * Register callback for sync events
   */
  onSync(callback: (result: SyncResult) => void): void {
    this.syncCallbacks.push(callback)
  }

  /**
   * Get sync statistics
   */
  getStats(): {
    totalCIDs: number
    syncedCIDs: number
    lastSync: Date | null
    conversationCount: number
    pendingRetries: number
  } {
    const totalCIDs = this.chatIndex.messagePointers.size
    const syncedCIDs = Array.from(this.chatIndex.messagePointers.values()).filter((p) => p.synced).length
    const pendingRetries = Array.from(this.chatIndex.messagePointers.values()).filter(
      (p) => !p.synced && p.retryCount < this.MAX_RETRIES,
    ).length

    return {
      totalCIDs,
      syncedCIDs,
      lastSync: this.chatIndex.lastSync ? new Date(this.chatIndex.lastSync) : null,
      conversationCount: this.chatIndex.conversationCache.size,
      pendingRetries,
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.chatIndex.knownCIDs.clear()
    this.chatIndex.messagePointers.clear()
    this.chatIndex.conversationCache.clear()
    this.chatIndex.lastSync = 0
    this.saveIndex()
    console.log("🗑️ Message sync cache cleared")
  }
}
