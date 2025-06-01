"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageService } from "../lib/messages"
import { IPFSMessagingService } from "../lib/ipfs-messaging"

export function MessageTest() {
  const [testWallet] = useState("test_wallet_123")
  const [testContact] = useState("test_contact_456")
  const [messageText, setMessageText] = useState("")
  const [messages, setMessages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [ipfsStats, setIpfsStats] = useState<any>(null)

  const messageService = new MessageService()
  const ipfsService = new IPFSMessagingService()

  const sendTestMessage = async () => {
    if (!messageText.trim()) return

    setIsLoading(true)
    try {
      const message = {
        id: `test_${Date.now()}`,
        from: testWallet,
        to: testContact,
        content: messageText,
        timestamp: Date.now(),
        messageType: "text" as const,
        status: "sent" as const,
      }

      // Save locally first
      await messageService.saveSentMessage(testWallet, message)

      // Load updated messages
      const updatedMessages = await messageService.getConversationMessages(testWallet, testContact)
      setMessages(updatedMessages)

      setMessageText("")
      console.log("✅ Test message sent successfully")
    } catch (error) {
      console.error("❌ Failed to send test message:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMessages = async () => {
    setIsLoading(true)
    try {
      const conversationMessages = await messageService.getConversationMessages(testWallet, testContact)
      setMessages(conversationMessages)
      console.log(`📚 Loaded ${conversationMessages.length} messages`)
    } catch (error) {
      console.error("❌ Failed to load messages:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const checkIPFSStats = async () => {
    try {
      const stats = await ipfsService.getStats()
      setIpfsStats(stats)
      console.log("📊 IPFS Stats:", stats)
    } catch (error) {
      console.error("❌ Failed to get IPFS stats:", error)
    }
  }

  const clearTestData = async () => {
    try {
      await messageService.clearAllMessages(testWallet)
      setMessages([])
      console.log("🗑️ Cleared test data")
    } catch (error) {
      console.error("❌ Failed to clear test data:", error)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Message System Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type a test message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendTestMessage()
                }
              }}
            />
            <Button onClick={sendTestMessage} disabled={isLoading || !messageText.trim()}>
              Send Test
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={loadMessages} disabled={isLoading}>
              Load Messages
            </Button>
            <Button variant="outline" onClick={checkIPFSStats}>
              IPFS Stats
            </Button>
            <Button variant="destructive" onClick={clearTestData}>
              Clear Data
            </Button>
          </div>

          {ipfsStats && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 p-3 rounded">
                <div className="text-sm text-gray-400">IPFS Configured</div>
                <div className="text-white">
                  {ipfsStats.isConfigured ? (
                    <Badge variant="success">✅ Yes</Badge>
                  ) : (
                    <Badge variant="destructive">❌ No</Badge>
                  )}
                </div>
              </div>
              <div className="bg-gray-800 p-3 rounded">
                <div className="text-sm text-gray-400">Message Pointers</div>
                <div className="text-white">{ipfsStats.totalPointers}</div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="text-white font-semibold">Messages ({messages.length})</h4>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded ${
                    message.from === testWallet ? "bg-purple-600/20 ml-8" : "bg-gray-700/50 mr-8"
                  }`}
                >
                  <div className="text-white">{message.content}</div>
                  <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                    <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                    {message.status && <Badge variant="secondary">{message.status}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
