// lib/utils.js
// Utility functions for timestamp formatting, address truncation, validation, avatar colors, and classNames (cn)

// Join class names, ignoring falsy values
export function cn(...classes) {
  return classes.filter(Boolean).join(" ")
}

// Format timestamp for display
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) {
    return "Just now"
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}m ago`
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}h ago`
  } else {
    return date.toLocaleDateString()
  }
}

// Truncate Solana address for UI display
export function truncateAddress(address, length = 8) {
  if (!address) return ""
  if (address.length <= length + 4) return address
  return `${address.slice(0, length)}...${address.slice(-4)}`
}

// Validate Solana address (basic check on length and base58 chars)
export function isValidSolanaAddress(address) {
  if (!address) return false
  if (address.length < 32 || address.length > 44) return false
  const base58Regex = /^[A-HJ-NP-Za-km-z1-9]+$/
  return base58Regex.test(address)
}

// Generate deterministic avatar color gradient from address string
export function generateAvatarColor(address) {
  const colors = [
    "from-purple-500 to-blue-500",
    "from-green-500 to-teal-500",
    "from-orange-500 to-red-500",
    "from-pink-500 to-purple-500",
    "from-blue-500 to-indigo-500",
  ]

  const hash = address.split("").reduce((acc, char) => {
    acc = (acc << 5) - acc + char.charCodeAt(0)
    return acc & acc
  }, 0)

  return colors[Math.abs(hash) % colors.length]
}
