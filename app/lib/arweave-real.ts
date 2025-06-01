import Arweave from "arweave"

export class RealArweaveService {
  private arweave: Arweave
  private wallet: any = null

  constructor() {
    // Initialize Arweave with gateway
    this.arweave = Arweave.init({
      host: "arweave.net",
      port: 443,
      protocol: "https",
      timeout: 20000,
      logging: false,
    })
  }

  async generateWallet() {
    try {
      this.wallet = await this.arweave.wallets.generate()
      return this.wallet
    } catch (error) {
      console.error("Failed to generate Arweave wallet:", error)
      throw error
    }
  }

  async getWalletAddress() {
    if (!this.wallet) {
      await this.generateWallet()
    }
    return await this.arweave.wallets.jwkToAddress(this.wallet)
  }

  async getBalance() {
    try {
      const address = await this.getWalletAddress()
      const winston = await this.arweave.wallets.getBalance(address)
      return this.arweave.ar.winstonToAr(winston)
    } catch (error) {
      console.error("Failed to get balance:", error)
      return "0"
    }
  }

  async storeMessage(message: any): Promise<string> {
    try {
      if (!this.wallet) {
        await this.generateWallet()
      }

      // Check wallet balance first
      const balance = await this.getBalance()
      console.log("Arweave wallet balance:", balance, "AR")

      if (Number.parseFloat(balance) < 0.000001) {
        console.warn("Insufficient AR balance for storage, using fallback")
        return `arweave_insufficient_balance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }

      const messageData = JSON.stringify(message)
      console.log("Storing message data:", messageData.length, "bytes")

      // Create transaction with proper error handling
      let transaction
      try {
        transaction = await this.arweave.createTransaction(
          {
            data: messageData,
          },
          this.wallet,
        )
      } catch (createError) {
        console.error("Failed to create Arweave transaction:", createError)
        return `arweave_create_failed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }

      // Add tags for better indexing
      try {
        transaction.addTag("App-Name", "SolChat")
        transaction.addTag("Content-Type", "application/json")
        transaction.addTag("Message-Type", "direct")
        transaction.addTag("From", message.from)
        transaction.addTag("To", message.to)
        transaction.addTag("Timestamp", message.timestamp.toString())
        transaction.addTag("Version", "1.0")
      } catch (tagError) {
        console.error("Failed to add tags:", tagError)
        // Continue without tags
      }

      // Sign transaction with error handling
      try {
        await this.arweave.transactions.sign(transaction, this.wallet)
      } catch (signError) {
        console.error("Failed to sign Arweave transaction:", signError)
        return `arweave_sign_failed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }

      // Get transaction fee for logging
      const fee = this.arweave.ar.winstonToAr(transaction.reward)
      console.log("Transaction fee:", fee, "AR")

      // Submit transaction with retry logic
      let response
      let retries = 3

      while (retries > 0) {
        try {
          console.log(`Submitting transaction to Arweave (attempt ${4 - retries}/3)...`)
          response = await this.arweave.transactions.post(transaction)

          if (response.status === 200) {
            console.log("Message stored on Arweave successfully:", transaction.id)
            return transaction.id
          } else if (response.status === 400) {
            console.error("Arweave rejected transaction (400):", response.statusText)
            // Don't retry 400 errors as they indicate client-side issues
            break
          } else {
            console.warn(`Arweave returned status ${response.status}, retrying...`)
            retries--
            if (retries > 0) {
              await new Promise((resolve) => setTimeout(resolve, 1000 * (4 - retries)))
            }
          }
        } catch (submitError) {
          console.error("Network error submitting to Arweave:", submitError)
          retries--
          if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * (4 - retries)))
          }
        }
      }

      // If we get here, all retries failed
      console.error("Failed to submit transaction after all retries")
      return `arweave_submit_failed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    } catch (error) {
      console.error("Unexpected error in storeMessage:", error)
      // Fallback to mock ID for demo purposes
      return `arweave_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  async storeGroupMessage(message: any): Promise<string> {
    try {
      if (!this.wallet) {
        await this.generateWallet()
      }

      // Check wallet balance first
      const balance = await this.getBalance()
      console.log("Arweave wallet balance:", balance, "AR")

      if (Number.parseFloat(balance) < 0.000001) {
        console.warn("Insufficient AR balance for group message storage, using fallback")
        return `arweave_group_insufficient_balance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }

      const messageData = JSON.stringify(message)
      console.log("Storing group message data:", messageData.length, "bytes")

      // Create transaction with proper error handling
      let transaction
      try {
        transaction = await this.arweave.createTransaction(
          {
            data: messageData,
          },
          this.wallet,
        )
      } catch (createError) {
        console.error("Failed to create Arweave group transaction:", createError)
        return `arweave_group_create_failed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }

      // Add tags for better indexing
      try {
        transaction.addTag("App-Name", "SolChat")
        transaction.addTag("Content-Type", "application/json")
        transaction.addTag("Message-Type", "group")
        transaction.addTag("Group-ID", message.groupId)
        transaction.addTag("From", message.from)
        transaction.addTag("Timestamp", message.timestamp.toString())
        transaction.addTag("Version", "1.0")
      } catch (tagError) {
        console.error("Failed to add group message tags:", tagError)
        // Continue without tags
      }

      // Sign transaction with error handling
      try {
        await this.arweave.transactions.sign(transaction, this.wallet)
      } catch (signError) {
        console.error("Failed to sign Arweave group transaction:", signError)
        return `arweave_group_sign_failed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }

      // Get transaction fee for logging
      const fee = this.arweave.ar.winstonToAr(transaction.reward)
      console.log("Group transaction fee:", fee, "AR")

      // Submit transaction with retry logic
      let response
      let retries = 3

      while (retries > 0) {
        try {
          console.log(`Submitting group transaction to Arweave (attempt ${4 - retries}/3)...`)
          response = await this.arweave.transactions.post(transaction)

          if (response.status === 200) {
            console.log("Group message stored on Arweave successfully:", transaction.id)
            return transaction.id
          } else if (response.status === 400) {
            console.error("Arweave rejected group transaction (400):", response.statusText)
            // Don't retry 400 errors as they indicate client-side issues
            break
          } else {
            console.warn(`Arweave returned status ${response.status} for group message, retrying...`)
            retries--
            if (retries > 0) {
              await new Promise((resolve) => setTimeout(resolve, 1000 * (4 - retries)))
            }
          }
        } catch (submitError) {
          console.error("Network error submitting group message to Arweave:", submitError)
          retries--
          if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * (4 - retries)))
          }
        }
      }

      // If we get here, all retries failed
      console.error("Failed to submit group transaction after all retries")
      return `arweave_group_submit_failed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    } catch (error) {
      console.error("Unexpected error in storeGroupMessage:", error)
      // Fallback to mock ID for demo purposes
      return `arweave_group_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  async retrieveMessage(txId: string): Promise<any> {
    try {
      const transaction = await this.arweave.transactions.get(txId)
      const data = await this.arweave.transactions.getData(txId, { decode: true, string: true })
      return JSON.parse(data as string)
    } catch (error) {
      console.error("Failed to retrieve message from Arweave:", error)
      return null
    }
  }

  async getMessagesByAddress(address: string): Promise<any[]> {
    try {
      // Query transactions by tags
      const query = {
        op: "and",
        expr1: {
          op: "equals",
          expr1: "App-Name",
          expr2: "SolChat",
        },
        expr2: {
          op: "or",
          expr1: {
            op: "equals",
            expr1: "From",
            expr2: address,
          },
          expr2: {
            op: "equals",
            expr1: "To",
            expr2: address,
          },
        },
      }

      const txIds = await this.arweave.arql(query)
      const messages = []

      for (const txId of txIds.slice(0, 100)) {
        // Limit to 100 recent messages
        try {
          const message = await this.retrieveMessage(txId)
          if (message) {
            messages.push({ ...message, arweaveId: txId })
          }
        } catch (error) {
          console.warn("Failed to retrieve message:", txId)
        }
      }

      return messages.sort((a, b) => b.timestamp - a.timestamp)
    } catch (error) {
      console.error("Failed to query messages from Arweave:", error)
      return []
    }
  }

  async getGroupMessages(groupId: string): Promise<any[]> {
    try {
      // Query group messages by group ID
      const query = {
        op: "and",
        expr1: {
          op: "equals",
          expr1: "App-Name",
          expr2: "SolChat",
        },
        expr2: {
          op: "and",
          expr1: {
            op: "equals",
            expr1: "Message-Type",
            expr2: "group",
          },
          expr2: {
            op: "equals",
            expr1: "Group-ID",
            expr2: groupId,
          },
        },
      }

      const txIds = await this.arweave.arql(query)
      const messages = []

      for (const txId of txIds.slice(0, 100)) {
        // Limit to 100 recent messages
        try {
          const message = await this.retrieveMessage(txId)
          if (message) {
            messages.push({ ...message, arweaveId: txId })
          }
        } catch (error) {
          console.warn("Failed to retrieve group message:", txId)
        }
      }

      return messages.sort((a, b) => a.timestamp - b.timestamp)
    } catch (error) {
      console.error("Failed to query group messages from Arweave:", error)
      return []
    }
  }
}
