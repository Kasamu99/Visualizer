import { RealArweaveService } from "./arweave-real"
import { IPFSMessagingService } from "./ipfs-messaging"
import type { Message } from "./messages"

export type StorageType = "arweave" | "ipfs" | "local"

export interface StorageStats {
  type: StorageType
  messageCount: number
  isAvailable: boolean
  costEstimate?: string
  storageSize?: string
  lastSync?: Date
}

export class StorageManager {
  private static instance: StorageManager
  private arweaveService: RealArweaveService
  private ipfsService: IPFSMessagingService
  private currentStorage: StorageType = "local"
  private pollingInterval: NodeJS.Timeout | null = null
  private readonly POLLING_DELAY = 15000 // 15 seconds
  private readonly STORAGE_PREFERENCE_KEY = "solchat_storage_preference"
  private onNewMessagesCallback: ((messages: Message[]) => void) | null = null

  private constructor() {
    this.arweaveService = new RealArweaveService()
    this.ipfsService = new IPFSMessagingService()
    this.loadStoragePreference()
  }

  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager()
    }
    return StorageManager.instance
  }

  private loadStoragePreference(): void {
    try {
      const preference = localStorage.getItem(this.STORAGE_PREFERENCE_KEY)
      if (preference && (preference === "arweave" || preference === "ipfs" || preference === "local")) {
        this.currentStorage = preference as StorageType
      }
    } catch (error) {
      console.error("Failed to load storage preference:", error)
    }
  }

  public saveStoragePreference(): void {
    try {
      localStorage.setItem(this.STORAGE_PREFERENCE_KEY, this.currentStorage)
    } catch (error) {
      console.error("Failed to save storage preference:", error)
    }
  }

  public getCurrentStorage(): StorageType {
    return this.currentStorage
  }

  public setCurrentStorage(type: StorageType): void {
    this.currentStorage = type
    this.saveStoragePreference()
  }

  public async storeMessage(message: any): Promise<string> {
    switch (this.currentStorage) {
      case "arweave":
        try {
          const arweaveId = await this.arweaveService.storeMessage(message)
          if (
            arweaveId.includes("arweave_insufficient_balance") ||
            (arweaveId.includes("arweave_") && arweaveId.includes("_failed"))
          ) {
            console.warn("Arweave storage failed, falling back to IPFS")
            return this.ipfsService.storeMessage(message)
          }
          return arweaveId
        } catch (error) {
          console.error("Arweave storage failed, falling back to IPFS:", error)
          return this.ipfsService.storeMessage(message)
        }
      case "ipfs":
        return this.ipfsService.storeMessage(message)
      case "local":
      default:
        return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  public async retrieveMessage(id: string): Promise<any> {
    if (id.startsWith("arweave_")) {
      return this.arweaveService.retrieveMessage(id)
    } else if (id.startsWith("Qm") || id.startsWith("bafy")) {
      // IPFS CID format
      return this.ipfsService.retrieveMessage(id)
    } else {
      // Local messages are already in the message store
      return null
    }
  }

  public startPolling(walletAddress: string, callback: (messages: Message[]) => void): void {
    this.onNewMessagesCallback = callback

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
    }

    this.pollingInterval = setInterval(() => {
      this.checkForNewMessages(walletAddress)
    }, this.POLLING_DELAY)

    // Initial check
    this.checkForNewMessages(walletAddress)
  }

  public stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
  }

  public async checkForNewMessages(walletAddress: string): Promise<void> {
    try {
      const newMessages: Message[] = []

      if (this.currentStorage === "ipfs") {
        console.log(`🔄 Checking for new IPFS messages for ${walletAddress.slice(0, 8)}...`)

        // Use the new IPFS messaging service to sync messages
        const ipfsMessages = await this.ipfsService.syncMessages(walletAddress)

        for (const ipfsMessage of ipfsMessages) {
          // Convert IPFS message format to app message format
          const message: Message = {
            id: ipfsMessage.id,
            from: ipfsMessage.from,
            to: ipfsMessage.to,
            content: ipfsMessage.content,
            encryptedContent: ipfsMessage.encryptedContent,
            timestamp: ipfsMessage.timestamp,
            signature: ipfsMessage.signature,
            arweaveId: `ipfs_${Date.now()}`, // Placeholder
            isRead: false, // New messages are unread
            messageType: ipfsMessage.messageType || "text",
          }

          // Only add messages TO this wallet (received messages)
          if (message.to === walletAddress) {
            newMessages.push(message)
          }
        }
      }

      if (newMessages.length > 0 && this.onNewMessagesCallback) {
        console.log(`🆕 Found ${newMessages.length} new messages from ${this.currentStorage}`)
        this.onNewMessagesCallback(newMessages)
      }
    } catch (error) {
      console.error("Failed to check for new messages:", error)
    }
  }

  public async getStorageStats(): Promise<StorageStats[]> {
    const stats: StorageStats[] = []

    // Local storage stats
    const localMessages = JSON.parse(localStorage.getItem("solchat_messages") || "[]")
    stats.push({
      type: "local",
      messageCount: localMessages.length,
      isAvailable: true,
      storageSize: this.formatBytes(new Blob([JSON.stringify(localMessages)]).size),
    })

    // IPFS stats
    const ipfsStats = await this.ipfsService.getStats()
    stats.push({
      type: "ipfs",
      messageCount: ipfsStats.totalMessages,
      isAvailable: ipfsStats.isConfigured,
      storageSize: "Distributed",
      costEstimate: "Free",
      lastSync: ipfsStats.lastSync,
    })

    // Arweave stats - would need actual implementation
    stats.push({
      type: "arweave",
      messageCount: 0, // Would need actual query
      isAvailable: true, // Would check balance
      costEstimate: "~$0.001 per message",
    })

    return stats
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Expose IPFS service methods
  public getIPFSService(): IPFSMessagingService {
    return this.ipfsService
  }
}
