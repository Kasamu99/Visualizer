interface SpamAnalysis {
  action: "allow" | "warn" | "block"
  score: number
  reasons: string[]
}

interface MessagePattern {
  content: string
  timestamp: number
  from: string
  to: string
}

export class SpamProtectionService {
  private static instance: SpamProtectionService
  private blockedAddresses: Set<string> = new Set()
  private messageHistory: Map<string, MessagePattern[]> = new Map()
  private rateLimits: Map<string, number[]> = new Map()

  // Spam detection thresholds
  private readonly MAX_MESSAGES_PER_MINUTE = 10
  private readonly MAX_MESSAGES_PER_HOUR = 100
  private readonly DUPLICATE_MESSAGE_THRESHOLD = 3
  private readonly SUSPICIOUS_KEYWORDS = [
    "free money",
    "click here",
    "urgent",
    "limited time",
    "act now",
    "guaranteed",
    "risk free",
    "no obligation",
    "call now",
    "winner",
    "congratulations",
    "selected",
    "crypto giveaway",
    "double your",
    "investment opportunity",
    "get rich quick",
  ]

  static getInstance(): SpamProtectionService {
    if (!SpamProtectionService.instance) {
      SpamProtectionService.instance = new SpamProtectionService()
    }
    return SpamProtectionService.instance
  }

  constructor() {
    this.loadBlockedAddresses()
  }

  private loadBlockedAddresses(): void {
    try {
      const stored = localStorage.getItem("solchat_blocked_addresses")
      if (stored) {
        const addresses = JSON.parse(stored)
        this.blockedAddresses = new Set(addresses)
      }
    } catch (error) {
      console.error("Failed to load blocked addresses:", error)
    }
  }

  private saveBlockedAddresses(): void {
    try {
      const addresses = Array.from(this.blockedAddresses)
      localStorage.setItem("solchat_blocked_addresses", JSON.stringify(addresses))
    } catch (error) {
      console.error("Failed to save blocked addresses:", error)
    }
  }

  async analyzeMessage(from: string, to: string, content: string): Promise<SpamAnalysis> {
    const analysis: SpamAnalysis = {
      action: "allow",
      score: 0,
      reasons: [],
    }

    // Check if sender is blocked
    if (this.isBlocked(from)) {
      analysis.action = "block"
      analysis.score = 100
      analysis.reasons.push("Sender is blocked")
      return analysis
    }

    // Rate limiting check
    const rateLimitScore = this.checkRateLimit(from)
    if (rateLimitScore > 0) {
      analysis.score += rateLimitScore
      if (rateLimitScore >= 50) {
        analysis.reasons.push("Rate limit exceeded")
      } else {
        analysis.reasons.push("High message frequency")
      }
    }

    // Content analysis
    const contentScore = this.analyzeContent(content)
    if (contentScore > 0) {
      analysis.score += contentScore
      analysis.reasons.push("Suspicious content detected")
    }

    // Duplicate message check
    const duplicateScore = this.checkDuplicateMessages(from, to, content)
    if (duplicateScore > 0) {
      analysis.score += duplicateScore
      analysis.reasons.push("Duplicate or repetitive messages")
    }

    // Message length analysis
    const lengthScore = this.analyzeLengthPattern(content)
    if (lengthScore > 0) {
      analysis.score += lengthScore
      analysis.reasons.push("Suspicious message length pattern")
    }

    // Determine action based on score
    if (analysis.score >= 80) {
      analysis.action = "block"
    } else if (analysis.score >= 40) {
      analysis.action = "warn"
    }

    // Store message for future analysis
    this.storeMessage(from, to, content)

    return analysis
  }

  private checkRateLimit(from: string): number {
    const now = Date.now()
    const timestamps = this.rateLimits.get(from) || []

    // Clean old timestamps (older than 1 hour)
    const recentTimestamps = timestamps.filter((ts) => now - ts < 3600000)

    // Add current timestamp
    recentTimestamps.push(now)
    this.rateLimits.set(from, recentTimestamps)

    // Check rate limits
    const messagesLastMinute = recentTimestamps.filter((ts) => now - ts < 60000).length
    const messagesLastHour = recentTimestamps.length

    let score = 0

    if (messagesLastMinute > this.MAX_MESSAGES_PER_MINUTE) {
      score += 60 // High penalty for exceeding per-minute limit
    } else if (messagesLastMinute > this.MAX_MESSAGES_PER_MINUTE * 0.7) {
      score += 20 // Warning for approaching limit
    }

    if (messagesLastHour > this.MAX_MESSAGES_PER_HOUR) {
      score += 40 // Penalty for exceeding hourly limit
    } else if (messagesLastHour > this.MAX_MESSAGES_PER_HOUR * 0.8) {
      score += 15 // Warning for approaching limit
    }

    return score
  }

  private analyzeContent(content: string): number {
    let score = 0
    const lowerContent = content.toLowerCase()

    // Check for suspicious keywords
    const keywordMatches = this.SUSPICIOUS_KEYWORDS.filter((keyword) => lowerContent.includes(keyword))
    score += keywordMatches.length * 15

    // Check for excessive capitalization
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length
    if (capsRatio > 0.5 && content.length > 10) {
      score += 20
    }

    // Check for excessive punctuation
    const punctuationRatio = (content.match(/[!?]{2,}/g) || []).length
    if (punctuationRatio > 0) {
      score += punctuationRatio * 10
    }

    // Check for URLs (potential phishing)
    const urlPattern = /(https?:\/\/[^\s]+)/gi
    const urls = content.match(urlPattern) || []
    if (urls.length > 0) {
      score += urls.length * 25
    }

    // Check for cryptocurrency addresses (potential scam)
    const cryptoAddressPattern = /[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59}/g
    const cryptoAddresses = content.match(cryptoAddressPattern) || []
    if (cryptoAddresses.length > 1) {
      score += 30
    }

    return Math.min(score, 60) // Cap content score
  }

  private checkDuplicateMessages(from: string, to: string, content: string): number {
    const conversationKey = `${from}-${to}`
    const messages = this.messageHistory.get(conversationKey) || []

    // Check for exact duplicates in the last 24 hours
    const now = Date.now()
    const recentMessages = messages.filter((msg) => now - msg.timestamp < 86400000)

    const duplicates = recentMessages.filter((msg) => msg.content === content)
    if (duplicates.length >= this.DUPLICATE_MESSAGE_THRESHOLD) {
      return 50
    }

    // Check for similar messages (fuzzy matching)
    const similarMessages = recentMessages.filter((msg) => this.calculateSimilarity(msg.content, content) > 0.8)
    if (similarMessages.length >= 2) {
      return 25
    }

    return 0
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) return 1.0

    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  private analyzeLengthPattern(content: string): number {
    // Very short messages repeated frequently can be spam
    if (content.length < 5) {
      return 10
    }

    // Very long messages might be spam
    if (content.length > 1000) {
      return 15
    }

    return 0
  }

  private storeMessage(from: string, to: string, content: string): void {
    const conversationKey = `${from}-${to}`
    const messages = this.messageHistory.get(conversationKey) || []

    messages.push({
      content,
      timestamp: Date.now(),
      from,
      to,
    })

    // Keep only last 50 messages per conversation
    if (messages.length > 50) {
      messages.splice(0, messages.length - 50)
    }

    this.messageHistory.set(conversationKey, messages)
  }

  blockAddress(address: string): void {
    this.blockedAddresses.add(address)
    this.saveBlockedAddresses()
  }

  unblockAddress(address: string): void {
    this.blockedAddresses.delete(address)
    this.saveBlockedAddresses()
  }

  isBlocked(address: string): boolean {
    return this.blockedAddresses.has(address)
  }

  getBlockedAddresses(): string[] {
    return Array.from(this.blockedAddresses)
  }

  clearMessageHistory(): void {
    this.messageHistory.clear()
    this.rateLimits.clear()
  }

  getSpamStats(): {
    blockedAddresses: number
    trackedConversations: number
    totalMessages: number
  } {
    let totalMessages = 0
    this.messageHistory.forEach((messages) => {
      totalMessages += messages.length
    })

    return {
      blockedAddresses: this.blockedAddresses.size,
      trackedConversations: this.messageHistory.size,
      totalMessages,
    }
  }
}
