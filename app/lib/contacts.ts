export interface Contact {
  address: string
  nickname?: string
  avatar?: string
  addedAt: number
  verified: boolean
  publicKey?: string
}

export class ContactService {
  private getStorageKey(walletAddress: string): string {
    return `contacts_${walletAddress}`
  }

  async getContacts(walletAddress: string): Promise<Contact[]> {
    try {
      const stored = localStorage.getItem(this.getStorageKey(walletAddress))
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error("Failed to load contacts:", error)
      return []
    }
  }

  async addContact(walletAddress: string, contact: Contact): Promise<void> {
    try {
      console.log(`📝 ContactService.addContact called for wallet ${walletAddress}:`, contact)

      // Validate inputs
      if (!walletAddress || !contact.address) {
        throw new Error("Missing required parameters: walletAddress or contact.address")
      }

      // Get current contacts
      const contacts = await this.getContacts(walletAddress)
      console.log("📋 Current contacts:", contacts.length)

      // Check if contact already exists
      const existingIndex = contacts.findIndex((c) => c.address === contact.address)
      if (existingIndex >= 0) {
        console.log("🔄 Contact already exists, updating:", existingIndex)
        contacts[existingIndex] = { ...contacts[existingIndex], ...contact }
      } else {
        console.log("➕ Adding new contact")
        contacts.push(contact)
      }

      // Save to localStorage
      const storageKey = this.getStorageKey(walletAddress)
      const contactsJson = JSON.stringify(contacts)

      console.log("💾 Saving to storage key:", storageKey)
      console.log("📄 Contacts JSON length:", contactsJson.length)

      localStorage.setItem(storageKey, contactsJson)

      // Verify the save worked
      const savedContacts = localStorage.getItem(storageKey)
      if (!savedContacts) {
        throw new Error("Failed to save contacts - localStorage returned null")
      }

      const parsedSaved = JSON.parse(savedContacts)
      console.log("✅ Verified save - contacts count:", parsedSaved.length)

      if (parsedSaved.length !== contacts.length) {
        throw new Error(`Save verification failed - expected ${contacts.length}, got ${parsedSaved.length}`)
      }
    } catch (error) {
      console.error("❌ ContactService.addContact failed:", error)
      throw error
    }
  }

  async updateContact(walletAddress: string, contact: Contact): Promise<void> {
    try {
      const contacts = await this.getContacts(walletAddress)
      const index = contacts.findIndex((c) => c.address === contact.address)

      if (index >= 0) {
        contacts[index] = contact
        localStorage.setItem(this.getStorageKey(walletAddress), JSON.stringify(contacts))
      }
    } catch (error) {
      console.error("Failed to update contact:", error)
      throw error
    }
  }

  async removeContact(walletAddress: string, contactAddress: string): Promise<void> {
    try {
      const contacts = await this.getContacts(walletAddress)
      const filtered = contacts.filter((c) => c.address !== contactAddress)
      localStorage.setItem(this.getStorageKey(walletAddress), JSON.stringify(filtered))
    } catch (error) {
      console.error("Failed to remove contact:", error)
      throw error
    }
  }
}
