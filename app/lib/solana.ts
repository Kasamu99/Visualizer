import { type Connection, PublicKey } from "@solana/web3.js"

export class SolanaService {
  private connection: Connection
  private addressCache = new Map<string, { isValid: boolean; timestamp: number }>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  constructor(connection: Connection) {
    this.connection = connection
  }

  /**
   * Validates if a string is a valid Solana address format
   */
  async isValidAddress(address: string): Promise<boolean> {
    try {
      // Check if the address is the correct length and format
      if (!address || address.length < 32 || address.length > 44) {
        return false
      }

      // Try to create a PublicKey object
      new PublicKey(address)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Checks cache first, then validates address
   */
  private getCachedValidation(address: string): boolean | null {
    const cached = this.addressCache.get(address)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.isValid
    }
    return null
  }

  /**
   * Caches validation result
   */
  private setCachedValidation(address: string, isValid: boolean): void {
    this.addressCache.set(address, {
      isValid,
      timestamp: Date.now(),
    })
  }

  /**
   * Check if the RPC connection is healthy
   */
  async checkConnectionHealth(): Promise<boolean> {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Health check timeout")), 5000)
      })

      const healthPromise = this.connection.getSlot("confirmed")
      await Promise.race([healthPromise, timeoutPromise])

      return true
    } catch (error) {
      console.warn("RPC connection health check failed:", error)
      return false
    }
  }

  /**
   * Attempt to recover from connection issues
   */
  async recoverConnection(): Promise<boolean> {
    try {
      // Clear any cached connection state
      this.clearCache()

      // Test the connection
      const isHealthy = await this.checkConnectionHealth()

      if (isHealthy) {
        console.log("Connection recovered successfully")
        return true
      } else {
        console.warn("Connection recovery failed")
        return false
      }
    } catch (error) {
      console.error("Connection recovery error:", error)
      return false
    }
  }

  /**
   * Enhanced address validation with network resilience
   */
  async validateAddress(address: string): Promise<{
    isValid: boolean
    error?: string
    fromCache?: boolean
    networkIssue?: boolean
  }> {
    try {
      // Check cache first
      const cached = this.getCachedValidation(address)
      if (cached !== null) {
        return { isValid: cached, fromCache: true }
      }

      // Validate format first (this doesn't require network)
      const isValidFormat = await this.isValidAddress(address)
      if (!isValidFormat) {
        this.setCachedValidation(address, false)
        return {
          isValid: false,
          error: "Invalid Solana address format",
        }
      }

      // For format validation, we can consider it valid even without network
      // This provides better UX during network issues
      this.setCachedValidation(address, true)

      // Try network validation but don't fail if network is down
      try {
        const networkExists = await this.checkNetworkExistence(address)
        // Network check is supplementary, don't override format validation
        return {
          isValid: true,
          networkIssue: !networkExists && !navigator.onLine,
        }
      } catch (networkError) {
        // Network issue, but format is valid
        return {
          isValid: true,
          networkIssue: true,
        }
      }
    } catch (error) {
      return {
        isValid: false,
        error: `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }

  /**
   * Optional network check (can fail gracefully)
   */
  async checkNetworkExistence(address: string): Promise<boolean> {
    try {
      const publicKey = new PublicKey(address)

      // Quick timeout to avoid hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Timeout")), 3000)
      })

      const accountPromise = this.connection.getAccountInfo(publicKey, "confirmed")

      await Promise.race([accountPromise, timeoutPromise])
      return true
    } catch (error) {
      // Don't throw, just return false for network checks
      console.warn("Network check failed (this is okay):", error)
      return false
    }
  }

  /**
   * Gets account balance with timeout
   */
  async getBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address)

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Timeout")), 3000)
      })

      const balancePromise = this.connection.getBalance(publicKey, "confirmed")
      const balance = await Promise.race([balancePromise, timeoutPromise])

      return balance / 1e9 // Convert lamports to SOL
    } catch (error) {
      console.warn("Balance check failed:", error)
      return 0
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.addressCache.clear()
  }
}
