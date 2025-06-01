import { MessageService, type Message } from "./messages"
import { IPFSMessagingService } from "./ipfs-messaging"

export interface ConversationState {
  contactAddress: string
  messages: Message[]
  lastMessageTime: number
  unreadCount: number
  isLoading: boolean
  hasError: boolean
  errorMessage?: string
}

export class ConversationManager {
  private ipfsService: IPFSMessagingService
  private messageService: MessageService
  private walletAddress: string
  private conversations: Map<string, ConversationState> = new Map()
  private listeners: Map<string, ((state: ConversationState) => void)[]> = new Map()
  private syncInterval: NodeJS.Timeout | null = null

  constructor(walletAddress: string) {
    this.walletAddress = walletAddress
    this.ipfsService = new IPFSMessagingService()
    this.messageService = new MessageService()

    console.log(`🔧 ConversationManager initialized for wallet: ${walletAddress.slice(0, 8)}...`)
  }

  private async handleSyncResult(newMessages: any[]): Promise<void> {
    console.log(`🔄 Processing sync result: ${newMessages.length} new messages`)

    if (!newMessages || newMessages.length === 0) {
      return
    }

    // Group messages by conversation
    const conversationUpdates: Map<string, Message[]> = new Map()

    for (const ipfsMessage of newMessages) {
      try {
        // Convert IPFS message to app message format
        const message: Message = {
          id: ipfsMessage.id || `msg_${ipfsMessage.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
          from: ipfsMessage.from,
          to: ipfsMessage.to,
          content: ipfsMessage.content,
          encryptedContent: ipfsMessage.encryptedContent,
          timestamp: ipfsMessage.timestamp,
          signature: ipfsMessage.signature,
          arweaveId: `ipfs_${Date.now()}`,
          isRead: false,
          messageType: ipfsMessage.messageType || "text",
          status: "delivered",
        }

        // Save received messages to local storage
        if (message.to === this.walletAddress) {
          await this.messageService.saveReceivedMessage(this.walletAddress, message)
        }

        // Determine conversation partner
        const conversationPartner = message.from === this.walletAddress ? message.to : message.from

        // Group by conversation
        const conversationMessages = conversationUpdates.get(conversationPartner) || []
        conversationMessages.push(message)
        conversationUpdates.set(conversationPartner, conversationMessages)
      } catch (error) {
        console.error("Error processing message:", error)
      }
    }

    // Update conversation states
    for (const [contactAddress, newMessages] of conversationUpdates) {
      await this.updateConversation(contactAddress, newMessages)
    }
  }

  private async updateConversation(contactAddress: string, newMessages: Message[] = []): Promise<void> {
    const currentState = this.conversations.get(contactAddress) || {
      contactAddress,
      messages: [],
      lastMessageTime: 0,
      unreadCount: 0,
      isLoading: false,
      hasError: false,
    }

    try {
      // Get all local messages for this conversation
      const localMessages = await this.messageService.getConversationMessages(this.walletAddress, contactAddress)

      // Merge with any new messages from sync
      const allMessages = [...localMessages, ...newMessages]

      // Remove duplicates and sort chronologically
      const uniqueMessages = allMessages
        .filter((message, index, array) => array.findIndex((m) => m.id === message.id) === index)
        .sort((a, b) => a.timestamp - b.timestamp)

      // Calculate unread count (messages TO this wallet that aren't read)
      const unreadCount = uniqueMessages.filter((m) => m.to === this.walletAddress && !m.isRead).length

      // Update state
      const updatedState: ConversationState = {
        ...currentState,
        messages: uniqueMessages,
        lastMessageTime: uniqueMessages.length > 0 ? uniqueMessages[uniqueMessages.length - 1].timestamp : 0,
        unreadCount,
        isLoading: false,
        hasError: false,
      }

      this.conversations.set(contactAddress, updatedState)

      // Notify listeners
      this.notifyListeners(contactAddress, updatedState)

      console.log(
        `📱 Updated conversation with ${contactAddress.slice(0, 8)}...: ${uniqueMessages.length} total messages, ${unreadCount} unread`,
      )
    } catch (error) {
      console.error(`Failed to update conversation with ${contactAddress}:`, error)

      const errorState: ConversationState = {
        ...currentState,
        isLoading: false,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      }

      this.conversations.set(contactAddress, errorState)
      this.notifyListeners(contactAddress, errorState)
    }
  }

  private notifyListeners(contactAddress: string, state: ConversationState): void {
    const listeners = this.listeners.get(contactAddress) || []
    listeners.forEach((listener) => {
      try {
        listener(state)
      } catch (error) {
        console.error("Error in conversation listener:", error)
      }
    })
  }

  /**
   * Load conversation for a contact
   */
  async loadConversation(contactAddress: string): Promise<ConversationState> {
    console.log(`📂 Loading conversation with ${contactAddress.slice(0, 8)}...`)

    const currentState = this.conversations.get(contactAddress) || {
      contactAddress,
      messages: [],
      lastMessageTime: 0,
      unreadCount: 0,
      isLoading: true,
      hasError: false,
    }

    // Set loading state
    currentState.isLoading = true
    this.conversations.set(contactAddress, currentState)
    this.notifyListeners(contactAddress, currentState)

    try {
      // Load from local storage first (immediate)
      await this.updateConversation(contactAddress)

      // Then sync from IPFS (background)
      const credentials = this.getIPFSCredentials()
      if (credentials) {
        this.syncMessages(credentials).catch((error) => {
          console.error("Background sync failed:", error)
        })
      }

      return this.conversations.get(contactAddress)!
    } catch (error) {
      console.error(`Failed to load conversation with ${contactAddress}:`, error)

      const errorState: ConversationState = {
        ...currentState,
        isLoading: false,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      }

      this.conversations.set(contactAddress, errorState)
      this.notifyListeners(contactAddress, errorState)

      return errorState
    }
  }

  private getIPFSCredentials() {
    try {
      const stored = localStorage.getItem("solchat_pinata_credentials")
      if (stored) {
        const parsed = JSON.parse(stored)
        return parsed
      }

      // Try environment variables as fallback
      if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_PINATA_API_KEY) {
        return {
          apiKey: process.env.NEXT_PUBLIC_PINATA_API_KEY,
          secretKey: process.env.NEXT_PUBLIC_PINATA_SECRET || "",
        }
      }

      return null
    } catch (error) {
      console.error("Error getting IPFS credentials:", error)
      return null
    }
  }

  /**
   * Manual sync with IPFS
   */
  async syncMessages(credentials: { apiKey: string; secretKey: string }): Promise<void> {
    try {
      console.log("🔄 Starting manual sync...")
      const newMessages = await this.ipfsService.syncMessages(this.walletAddress)
      await this.handleSyncResult(newMessages)
      console.log(`✅ Sync completed: ${newMessages.length} new messages`)
    } catch (error) {
      console.error("❌ Sync failed:", error)
      throw error
    }
  }

  /**
   * Subscribe to conversation updates
   */
  subscribeToConversation(contactAddress: string, callback: (state: ConversationState) => void): () => void {
    const listeners = this.listeners.get(contactAddress) || []
    listeners.push(callback)
    this.listeners.set(contactAddress, listeners)

    console.log(`👂 Subscribed to conversation with ${contactAddress.slice(0, 8)}...`)

    // Return unsubscribe function
    return () => {
      const currentListeners = this.listeners.get(contactAddress) || []
      const updatedListeners = currentListeners.filter((l) => l !== callback)
      if (updatedListeners.length === 0) {
        this.listeners.delete(contactAddress)
      } else {
        this.listeners.set(contactAddress, updatedListeners)
      }
      console.log(`👋 Unsubscribed from conversation with ${contactAddress.slice(0, 8)}...`)
    }
  }

  /**
   * Mark conversation as read
   */
  async markConversationAsRead(contactAddress: string): Promise<void> {
    try {
      await this.messageService.markConversationAsRead(this.walletAddress, contactAddress)

      // Update local state
      const state = this.conversations.get(contactAddress)
      if (state) {
        const updatedMessages = state.messages.map((message) => ({
          ...message,
          isRead: true,
        }))

        const updatedState: ConversationState = {
          ...state,
          messages: updatedMessages,
          unreadCount: 0,
        }

        this.conversations.set(contactAddress, updatedState)
        this.notifyListeners(contactAddress, updatedState)
      }
    } catch (error) {
      console.error("Failed to mark conversation as read:", error)
    }
  }

  /**
   * Get conversation state
   */
  getConversationState(contactAddress: string): ConversationState | null {
    return this.conversations.get(contactAddress) || null
  }

  /**
   * Get all conversations
   */
  getAllConversations(): ConversationState[] {
    return Array.from(this.conversations.values()).sort((a, b) => b.lastMessageTime - a.lastMessageTime)
  }

  /**
   * Get total unread count
   */
  getTotalUnreadCount(): number {
    return Array.from(this.conversations.values()).reduce((total, conv) => total + conv.unreadCount, 0)
  }

  /**
   * Start auto sync - THIS IS THE MISSING METHOD
   */
  startSync(credentials: { apiKey: string; secretKey: string }): void {
    this.stopSync() // Clear any existing interval

    console.log("🔄 Starting auto-sync with credentials...")

    // Initial sync
    this.syncMessages(credentials).catch((error) => {
      console.error("Initial sync failed:", error)
    })

    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      this.syncMessages(credentials).catch((error) => {
        console.error("Periodic sync failed:", error)
      })
    }, 30000) // Sync every 30 seconds

    console.log("🔄 Started auto-sync (30s interval)")
  }

  /**
   * Stop auto sync
   */
  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      console.log("⏹️ Stopped auto-sync")
    }
  }

  /**
   * Manual sync
   */
  async manualSync(credentials: { apiKey: string; secretKey: string }): Promise<void> {
    await this.syncMessages(credentials)
  }

  /**
   * Get sync statistics
   */
  getSyncStats() {
    try {
      return this.ipfsService.getStats()
    } catch (error) {
      console.error("Error getting sync stats:", error)
      return {
        totalMessages: 0,
        lastSync: null,
        syncErrors: 0,
      }
    }
  }

  /**
   * Clear all data
   */
  clearAllData(): void {
    this.conversations.clear()
    this.listeners.clear()
    this.stopSync()

    try {
      this.ipfsService.clearCache()
    } catch (error) {
      console.error("Error clearing IPFS cache:", error)
    }

    console.log("🗑️ Cleared all conversation data")
  }
}
