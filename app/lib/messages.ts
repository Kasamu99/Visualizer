export interface UnreadCount {
  contactAddress?: string
  groupId?: string
  count: number
  lastMessageTimestamp: number
}

export interface Message {
  id: string
  from: string
  to: string
  content: string
  encryptedContent?: string
  timestamp: number
  signature?: number[]
  arweaveId?: string
  isRead?: boolean
  messageType?: "text" | "image" | "file"
  status?: "sending" | "sent" | "delivered" | "failed"
  localOnly?: boolean // For messages not yet synced to IPFS
}

export interface GroupMessage {
  id: string
  groupId: string
  from: string
  content: string
  encryptedContent?: string
  timestamp: number
  signature?: number[]
  arweaveId?: string
  isRead?: boolean
  messageType?: "text" | "image" | "file"
}

export class MessageService {
  private readonly STORAGE_KEY_PREFIX = "solchat_messages_"
  private readonly UNREAD_KEY_PREFIX = "solchat_unread_"

  async getMessages(walletAddress: string): Promise<Message[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_PREFIX + walletAddress)
      if (stored) {
        return JSON.parse(stored)
      }
      return []
    } catch (error) {
      console.error("Failed to load messages:", error)
      return []
    }
  }

  async saveMessage(walletAddress: string, message: Message): Promise<void> {
    try {
      const messages = await this.getMessages(walletAddress)

      // Check if message already exists (prevent duplicates)
      const existingIndex = messages.findIndex((m) => m.id === message.id)
      if (existingIndex >= 0) {
        // Update existing message
        messages[existingIndex] = { ...messages[existingIndex], ...message }
      } else {
        // Add new message
        messages.push(message)
      }

      // Sort by timestamp
      messages.sort((a, b) => a.timestamp - b.timestamp)

      localStorage.setItem(this.STORAGE_KEY_PREFIX + walletAddress, JSON.stringify(messages))
      console.log(`💾 Saved message ${message.id} for ${walletAddress.slice(0, 8)}...`)
    } catch (error) {
      console.error("Failed to save message:", error)
      throw error
    }
  }

  async saveSentMessage(walletAddress: string, message: Message): Promise<void> {
    // Immediately save sent messages locally with "sent" status
    const messageWithStatus = {
      ...message,
      status: "sent" as const,
      isRead: true, // Sent messages are considered "read" by sender
    }

    await this.saveMessage(walletAddress, messageWithStatus)
    console.log(`📤 Saved sent message locally: ${message.id}`)
  }

  async saveReceivedMessage(walletAddress: string, message: Message): Promise<void> {
    // Save received messages with "delivered" status and unread
    const messageWithStatus = {
      ...message,
      status: "delivered" as const,
      isRead: false, // Received messages start as unread
    }

    await this.saveMessage(walletAddress, messageWithStatus)
    console.log(`📥 Saved received message locally: ${message.id}`)
  }

  async updateMessageStatus(walletAddress: string, messageId: string, status: Message["status"]): Promise<void> {
    try {
      const messages = await this.getMessages(walletAddress)
      const message = messages.find((m) => m.id === messageId)

      if (message) {
        message.status = status
        localStorage.setItem(this.STORAGE_KEY_PREFIX + walletAddress, JSON.stringify(messages))
        console.log(`🔄 Updated message ${messageId} status to ${status}`)
      }
    } catch (error) {
      console.error("Failed to update message status:", error)
    }
  }

  async getUnreadCounts(walletAddress: string): Promise<UnreadCount[]> {
    try {
      const messages = await this.getMessages(walletAddress)
      const unreadCounts: Map<string, UnreadCount> = new Map()

      messages.forEach((message) => {
        // Only count messages TO this wallet as unread
        if (message.to === walletAddress && !message.isRead) {
          const key = message.from
          const existing = unreadCounts.get(key)

          if (existing) {
            existing.count++
            existing.lastMessageTimestamp = Math.max(existing.lastMessageTimestamp, message.timestamp)
          } else {
            unreadCounts.set(key, {
              contactAddress: message.from,
              count: 1,
              lastMessageTimestamp: message.timestamp,
            })
          }
        }
      })

      return Array.from(unreadCounts.values())
    } catch (error) {
      console.error("Failed to get unread counts:", error)
      return []
    }
  }

  async getTotalUnreadCount(walletAddress: string): Promise<number> {
    try {
      const unreadCounts = await this.getUnreadCounts(walletAddress)
      return unreadCounts.reduce((total, count) => total + count.count, 0)
    } catch (error) {
      console.error("Failed to get total unread count:", error)
      return 0
    }
  }

  async markConversationAsRead(walletAddress: string, contactAddress: string): Promise<void> {
    try {
      const messages = await this.getMessages(walletAddress)
      let updated = false

      messages.forEach((message) => {
        if (
          (message.from === contactAddress && message.to === walletAddress) ||
          (message.from === walletAddress && message.to === contactAddress)
        ) {
          if (!message.isRead) {
            message.isRead = true
            updated = true
          }
        }
      })

      if (updated) {
        localStorage.setItem(this.STORAGE_KEY_PREFIX + walletAddress, JSON.stringify(messages))
      }
    } catch (error) {
      console.error("Failed to mark conversation as read:", error)
      throw error
    }
  }

  async markMessageAsRead(walletAddress: string, messageId: string): Promise<void> {
    try {
      const messages = await this.getMessages(walletAddress)
      const message = messages.find((m) => m.id === messageId)

      if (message && !message.isRead) {
        message.isRead = true
        localStorage.setItem(this.STORAGE_KEY_PREFIX + walletAddress, JSON.stringify(messages))
      }
    } catch (error) {
      console.error("Failed to mark message as read:", error)
      throw error
    }
  }

  async deleteMessage(walletAddress: string, messageId: string): Promise<void> {
    try {
      const messages = await this.getMessages(walletAddress)
      const filteredMessages = messages.filter((m) => m.id !== messageId)
      localStorage.setItem(this.STORAGE_KEY_PREFIX + walletAddress, JSON.stringify(filteredMessages))
    } catch (error) {
      console.error("Failed to delete message:", error)
      throw error
    }
  }

  async getConversationMessages(walletAddress: string, contactAddress: string): Promise<Message[]> {
    try {
      const messages = await this.getMessages(walletAddress)
      return messages
        .filter(
          (m) =>
            (m.from === contactAddress && m.to === walletAddress) ||
            (m.from === walletAddress && m.to === contactAddress),
        )
        .sort((a, b) => a.timestamp - b.timestamp)
    } catch (error) {
      console.error("Failed to get conversation messages:", error)
      return []
    }
  }

  async clearAllMessages(walletAddress: string): Promise<void> {
    try {
      localStorage.removeItem(this.STORAGE_KEY_PREFIX + walletAddress)
      localStorage.removeItem(this.UNREAD_KEY_PREFIX + walletAddress)
    } catch (error) {
      console.error("Failed to clear messages:", error)
      throw error
    }
  }

  async exportMessages(walletAddress: string): Promise<string> {
    try {
      const messages = await this.getMessages(walletAddress)
      return JSON.stringify(messages, null, 2)
    } catch (error) {
      console.error("Failed to export messages:", error)
      throw error
    }
  }

  async importMessages(walletAddress: string, messagesJson: string): Promise<void> {
    try {
      const importedMessages = JSON.parse(messagesJson)
      if (!Array.isArray(importedMessages)) {
        throw new Error("Invalid message format")
      }

      const existingMessages = await this.getMessages(walletAddress)
      const allMessages = [...existingMessages, ...importedMessages]

      // Remove duplicates based on message ID
      const uniqueMessages = allMessages.filter(
        (message, index, self) => index === self.findIndex((m) => m.id === message.id),
      )

      localStorage.setItem(this.STORAGE_KEY_PREFIX + walletAddress, JSON.stringify(uniqueMessages))
    } catch (error) {
      console.error("Failed to import messages:", error)
      throw error
    }
  }
}
