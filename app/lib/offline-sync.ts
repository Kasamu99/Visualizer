interface PendingMessage {
  id: string
  type: "direct" | "group"
  from: string
  to?: string
  groupId?: string
  content: string
  timestamp: number
  retryCount: number
}

export class OfflineSyncService {
  private static instance: OfflineSyncService
  private pendingMessages: Map<string, PendingMessage> = new Map()
  private syncInProgress = false
  private maxRetries = 3

  static getInstance(): OfflineSyncService {
    if (!OfflineSyncService.instance) {
      OfflineSyncService.instance = new OfflineSyncService()
    }
    return OfflineSyncService.instance
  }

  constructor() {
    this.loadPendingMessages()
    this.setupEventListeners()
  }

  private loadPendingMessages(): void {
    try {
      const stored = localStorage.getItem("solchat_pending_messages")
      if (stored) {
        const messages = JSON.parse(stored)
        this.pendingMessages = new Map(Object.entries(messages))
      }
    } catch (error) {
      console.error("Failed to load pending messages:", error)
    }
  }

  private savePendingMessages(): void {
    try {
      const messages = Object.fromEntries(this.pendingMessages)
      localStorage.setItem("solchat_pending_messages", JSON.stringify(messages))
    } catch (error) {
      console.error("Failed to save pending messages:", error)
    }
  }

  private setupEventListeners(): void {
    window.addEventListener("online", () => {
      if (this.pendingMessages.size > 0) {
        this.syncPendingMessages()
      }
    })
  }

  async queueMessage(message: Omit<PendingMessage, "id" | "retryCount">): Promise<string> {
    const id = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const pendingMessage: PendingMessage = {
      ...message,
      id,
      retryCount: 0,
    }

    this.pendingMessages.set(id, pendingMessage)
    this.savePendingMessages()

    // Try to sync immediately if online
    if (navigator.onLine) {
      this.syncPendingMessages()
    }

    return id
  }

  async syncPendingMessages(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine || this.pendingMessages.size === 0) {
      return
    }

    this.syncInProgress = true
    const successfulSyncs: string[] = []
    const failedSyncs: string[] = []

    try {
      for (const [id, message] of this.pendingMessages) {
        try {
          const success = await this.sendMessage(message)
          if (success) {
            successfulSyncs.push(id)
          } else {
            message.retryCount++
            if (message.retryCount >= this.maxRetries) {
              failedSyncs.push(id)
            }
          }
        } catch (error) {
          console.error(`Failed to sync message ${id}:`, error)
          message.retryCount++
          if (message.retryCount >= this.maxRetries) {
            failedSyncs.push(id)
          }
        }
      }

      // Remove successfully synced messages
      successfulSyncs.forEach((id) => {
        this.pendingMessages.delete(id)
      })

      // Remove failed messages that exceeded retry limit
      failedSyncs.forEach((id) => {
        this.pendingMessages.delete(id)
      })

      this.savePendingMessages()

      // Dispatch sync complete event
      window.dispatchEvent(
        new CustomEvent("offlineSyncComplete", {
          detail: {
            synced: successfulSyncs.length,
            failed: failedSyncs.length,
            pending: this.pendingMessages.size,
          },
        }),
      )
    } finally {
      this.syncInProgress = false
    }
  }

  private async sendMessage(message: PendingMessage): Promise<boolean> {
    try {
      // Simulate message sending - in a real app, this would call your message service
      // For now, we'll just simulate a delay and return success
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // In a real implementation, you would:
      // 1. Encrypt the message
      // 2. Sign it with the wallet
      // 3. Store it on Arweave
      // 4. Update local storage

      console.log(`Syncing message: ${message.content.slice(0, 50)}...`)

      // Simulate 90% success rate
      return Math.random() > 0.1
    } catch (error) {
      console.error("Failed to send message:", error)
      return false
    }
  }

  getPendingMessagesCount(): number {
    return this.pendingMessages.size
  }

  getPendingMessages(): PendingMessage[] {
    return Array.from(this.pendingMessages.values())
  }

  clearPendingMessages(): void {
    this.pendingMessages.clear()
    this.savePendingMessages()
  }

  removePendingMessage(id: string): boolean {
    const removed = this.pendingMessages.delete(id)
    if (removed) {
      this.savePendingMessages()
    }
    return removed
  }

  retryMessage(id: string): void {
    const message = this.pendingMessages.get(id)
    if (message) {
      message.retryCount = 0
      this.savePendingMessages()

      if (navigator.onLine) {
        this.syncPendingMessages()
      }
    }
  }

  getSyncStatus(): {
    pending: number
    syncing: boolean
    online: boolean
  } {
    return {
      pending: this.pendingMessages.size,
      syncing: this.syncInProgress,
      online: navigator.onLine,
    }
  }
}
