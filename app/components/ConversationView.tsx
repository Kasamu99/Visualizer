"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Send, AlertCircle, CheckCircle, RefreshCw, Clock, AlertTriangle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { ConversationState } from "../lib/conversation-manager"
import type { Contact } from "../lib/contacts"

interface ConversationViewProps {
  contact: Contact
  conversationState: ConversationState | null
  onSendMessage: (message: string) => Promise<void>
  onMarkAsRead: () => void
  onRefresh: () => Promise<void>
  isSending: boolean
  walletAddress: string
}

export function ConversationView({
  contact,
  conversationState,
  onSendMessage,
  onMarkAsRead,
  onRefresh,
  isSending,
  walletAddress,
}: ConversationViewProps) {
  const [messageText, setMessageText] = useState("")
  const [autoRefresh, setAutoRefresh] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [conversationState?.messages])

  // Mark conversation as read when opened
  useEffect(() => {
    if (conversationState && conversationState.unreadCount > 0) {
      onMarkAsRead()
    }
  }, [contact.address])

  // Auto-refresh every 15 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      if (!conversationState?.isLoading) {
        onRefresh()
      }
    }, 15000)

    return () => clearInterval(interval)
  }, [autoRefresh, conversationState?.isLoading, onRefresh])

  const handleSendMessage = async () => {
    if (!messageText.trim()) return

    try {
      await onSendMessage(messageText)
      setMessageText("")

      toast({
        title: "✅ Message Sent",
        description: "Your message has been stored on IPFS",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "❌ Send Failed",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return "Just now"
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleString()
  }

  const getMessageStatusIcon = (message: any) => {
    if (message.from !== walletAddress) return null // Only show status for sent messages

    switch (message.status) {
      case "sending":
        return <Clock className="w-3 h-3 text-yellow-400 animate-pulse" title="Sending..." />
      case "sent":
        return <CheckCircle className="w-3 h-3 text-green-400" title="Sent to IPFS" />
      case "delivered":
        return <CheckCircle className="w-3 h-3 text-blue-400" title="Delivered" />
      case "failed":
        return <AlertTriangle className="w-3 h-3 text-red-400" title="Failed to send" />
      default:
        return <CheckCircle className="w-3 h-3 text-gray-400" />
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-black/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
              {(contact.nickname || contact.address).slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {contact.nickname || `${contact.address.slice(0, 8)}...`}
              </h3>
              {conversationState && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span>{conversationState.messages.length} messages</span>
                  {conversationState.unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {conversationState.unreadCount} unread
                    </Badge>
                  )}
                  {conversationState.isLoading && (
                    <div className="flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Syncing...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={conversationState?.isLoading}
              className="bg-blue-600/20 border-blue-600/30 text-blue-300 hover:bg-blue-600/30"
            >
              <RefreshCw className={`w-3 h-3 ${conversationState?.isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversationState?.isLoading && conversationState.messages.length === 0 ? (
          // Loading skeleton
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                <div className="max-w-xs space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : conversationState?.hasError ? (
          // Error state
          <Alert className="border-red-600 bg-red-900/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-300">
              Failed to load conversation: {conversationState.errorMessage}
              <Button variant="outline" size="sm" onClick={onRefresh} className="ml-2">
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : conversationState?.messages.length === 0 ? (
          // Empty state
          <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-4">
              <div className="text-4xl">💬</div>
              <div className="text-white">
                <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
                <p className="text-gray-400 text-sm">
                  Start a conversation with {contact.nickname || contact.address.slice(0, 8) + "..."}
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Messages
          <>
            {conversationState?.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.from === walletAddress ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.from === walletAddress ? "bg-purple-600 text-white" : "bg-gray-700 text-white"
                  }`}
                >
                  <div className="break-words">{message.content}</div>
                  <div className="flex items-center justify-between mt-1 text-xs opacity-70">
                    <span>{formatTimestamp(message.timestamp)}</span>
                    <div className="flex items-center gap-1">
                      {message.arweaveId?.startsWith("ipfs_") && <span title="Stored on IPFS">🌐</span>}
                      {message.localOnly && <span title="Local only">📱</span>}
                      {getMessageStatusIcon(message)}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* New messages indicator */}
            {conversationState?.isLoading && conversationState.messages.length > 0 && (
              <div className="flex justify-center">
                <div className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-xs flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Checking for new messages...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-white/10 bg-black/20">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Type your message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            className="flex-1 bg-gray-800 border-gray-600 text-white focus:ring-2 focus:ring-purple-500"
            disabled={isSending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isSending || !messageText.trim()}
            className="bg-purple-600 hover:bg-purple-700 transition-all duration-200"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

        {/* Status indicators */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span>IPFS Storage</span>
            {conversationState?.isLoading && <span className="text-blue-300">• Syncing...</span>}
          </div>
          {conversationState && (
            <span>
              {conversationState.messages.length} messages • Last sync:{" "}
              {conversationState.lastMessageTime ? formatTimestamp(conversationState.lastMessageTime) : "Never"}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
