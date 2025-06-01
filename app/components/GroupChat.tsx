"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import {
  Users,
  Plus,
  Send,
  Settings,
  UserPlus,
  UserMinus,
  Crown,
  Loader2,
  Copy,
  Check,
  Shield,
  Key,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"

import { GroupService, type Group, type GroupMessage } from "../lib/groups"
import { RealArweaveService } from "../lib/arweave-real"
import { EncryptionService } from "../lib/encryption"
import { SolanaService } from "../lib/solana"
import type { Contact } from "../lib/contacts"

interface GroupChatProps {
  selectedGroup: Group | null
  onGroupSelect: (group: Group | null) => void
  encryptionKeys: any
  contacts: Contact[]
}

export function GroupChat({ selectedGroup, onGroupSelect, encryptionKeys, contacts }: GroupChatProps) {
  const { publicKey, signMessage } = useWallet()
  const { toast } = useToast()

  const [groups, setGroups] = useState<Group[]>([])
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([])
  const [messageText, setMessageText] = useState("")
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showGroupSettings, setShowGroupSettings] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupDescription, setNewGroupDescription] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [newMemberAddress, setNewMemberAddress] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  // Initialize services
  const groupService = new GroupService()
  const arweaveService = new RealArweaveService()
  const encryptionService = new EncryptionService()
  const solanaService = new SolanaService()

  useEffect(() => {
    if (publicKey) {
      loadGroups()
      loadGroupMessages()
    }
  }, [publicKey])

  const loadGroups = async () => {
    if (!publicKey) return

    try {
      const loadedGroups = await groupService.getGroups(publicKey.toString())
      setGroups(loadedGroups)
    } catch (error) {
      console.error("Failed to load groups:", error)
    }
  }

  const loadGroupMessages = async () => {
    if (!publicKey) return

    try {
      const loadedMessages = await groupService.getGroupMessages(publicKey.toString())
      setGroupMessages(loadedMessages)
    } catch (error) {
      console.error("Failed to load group messages:", error)
    }
  }

  const createGroup = async () => {
    if (!publicKey || !signMessage) return

    if (!newGroupName.trim()) {
      toast({
        title: "❌ Missing Group Name",
        description: "Please enter a group name",
        variant: "destructive",
      })
      return
    }

    if (selectedMembers.length < 2) {
      toast({
        title: "❌ Insufficient Members",
        description: "Please add at least 2 members to create a group",
        variant: "destructive",
      })
      return
    }

    if (selectedMembers.length > 7) {
      toast({
        title: "❌ Too Many Members",
        description: "Groups can have a maximum of 8 members (including you)",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const groupId = await groupService.createGroup(
        publicKey.toString(),
        newGroupName,
        newGroupDescription,
        selectedMembers,
      )

      await loadGroups()

      // Clear form
      setNewGroupName("")
      setNewGroupDescription("")
      setSelectedMembers([])
      setShowCreateGroup(false)

      toast({
        title: "✅ Group Created",
        description: `"${newGroupName}" has been created successfully`,
        variant: "success",
      })
    } catch (error) {
      console.error("Failed to create group:", error)
      toast({
        title: "❌ Failed to Create Group",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const sendGroupMessage = async () => {
    if (!messageText.trim() || !selectedGroup || !publicKey || !signMessage || !encryptionKeys) return

    setIsSending(true)

    try {
      toast({
        title: "🔏 Signing Message",
        description: "Please sign the message in your wallet",
      })

      // Encrypt message for group
      const encryptedContent = await encryptionService.encryptMessage(
        messageText,
        selectedGroup.id, // Use group ID as recipient for group encryption
        encryptionKeys.privateKey,
      )

      // Sign the message
      const messageToSign = new TextEncoder().encode(
        JSON.stringify({
          groupId: selectedGroup.id,
          content: messageText,
          timestamp: Date.now(),
        }),
      )

      const signature = await signMessage(messageToSign)

      toast({
        title: "📡 Storing Message",
        description: "Storing on Arweave...",
      })

      const message: GroupMessage = {
        id: `group_msg_${Date.now()}_${Math.random()}`,
        groupId: selectedGroup.id,
        from: publicKey.toString(),
        content: messageText,
        encryptedContent,
        timestamp: Date.now(),
        signature: Array.from(signature),
        arweaveId: "",
        messageType: "text",
      }

      // Store on Arweave
      const arweaveId = await arweaveService.storeGroupMessage(message)
      message.arweaveId = arweaveId

      await groupService.saveGroupMessage(publicKey.toString(), message)
      await loadGroupMessages()

      setMessageText("")

      toast({
        title: "✅ Message Sent",
        description: "Your encrypted group message has been sent",
        variant: "success",
      })
    } catch (error) {
      console.error("Failed to send group message:", error)
      toast({
        title: "❌ Failed to Send Message",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const addMemberToGroup = async () => {
    if (!publicKey || !selectedGroup || !newMemberAddress.trim()) return

    try {
      const isValid = await solanaService.isValidAddress(newMemberAddress.trim())
      if (!isValid) {
        toast({
          title: "❌ Invalid Address",
          description: "Please enter a valid Solana address",
          variant: "destructive",
        })
        return
      }

      await groupService.addMemberToGroup(publicKey.toString(), selectedGroup.id, newMemberAddress.trim())

      await loadGroups()
      await loadGroupMessages()

      setNewMemberAddress("")
      setShowAddMember(false)

      toast({
        title: "✅ Member Added",
        description: "New member has been added to the group",
        variant: "success",
      })
    } catch (error) {
      console.error("Failed to add member:", error)
      toast({
        title: "❌ Failed to Add Member",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  const removeMemberFromGroup = async (memberAddress: string) => {
    if (!publicKey || !selectedGroup) return

    try {
      await groupService.removeMemberFromGroup(publicKey.toString(), selectedGroup.id, memberAddress)

      await loadGroups()
      await loadGroupMessages()

      toast({
        title: "✅ Member Removed",
        description: "Member has been removed from the group",
        variant: "success",
      })
    } catch (error) {
      console.error("Failed to remove member:", error)
      toast({
        title: "❌ Failed to Remove Member",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedAddress(text)
      setTimeout(() => setCopiedAddress(null), 2000)

      toast({
        title: "📋 Copied",
        description: "Address copied to clipboard",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "❌ Copy Failed",
        description: "Failed to copy to clipboard",
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
    return date.toLocaleDateString()
  }

  const getGroupMessages = (groupId: string) => {
    return groupMessages.filter((m) => m.groupId === groupId).sort((a, b) => a.timestamp - b.timestamp)
  }

  const toggleMemberSelection = (address: string) => {
    setSelectedMembers((prev) =>
      prev.includes(address) ? prev.filter((a) => a !== address) : prev.length < 7 ? [...prev, address] : prev,
    )
  }

  return (
    <TooltipProvider>
      <div className="flex h-full">
        {/* Groups List */}
        <div className="w-80 bg-black/10 backdrop-blur-md border-r border-white/10 flex flex-col">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Groups</h3>
              <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button
                        variant="default"
                        size="icon"
                        className="bg-purple-600 hover:bg-purple-700 transition-all duration-200 hover:scale-110"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create new group</p>
                  </TooltipContent>
                </Tooltip>
                <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-white">Create Group</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      createGroup()
                    }}
                    className="space-y-4"
                  >
                    <Input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Group name..."
                      className="bg-gray-800 border-gray-600 text-white"
                      maxLength={50}
                    />
                    <Textarea
                      value={newGroupDescription}
                      onChange={(e) => setNewGroupDescription(e.target.value)}
                      placeholder="Group description (optional)..."
                      className="bg-gray-800 border-gray-600 text-white resize-none"
                      rows={2}
                      maxLength={200}
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Add Members (2-7 required)</label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {contacts.map((contact) => (
                          <div
                            key={contact.address}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                              selectedMembers.includes(contact.address)
                                ? "bg-purple-600/20 border border-purple-500"
                                : "bg-gray-800 hover:bg-gray-700"
                            }`}
                            onClick={() => toggleMemberSelection(contact.address)}
                          >
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                              {(contact.nickname || contact.address).slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">
                                {contact.nickname || `${contact.address.slice(0, 8)}...`}
                              </p>
                              <p className="text-gray-400 text-xs truncate">{contact.address}</p>
                            </div>
                            {selectedMembers.includes(contact.address) && <Check className="w-4 h-4 text-green-400" />}
                          </div>
                        ))}
                      </div>
                      {contacts.length === 0 && (
                        <p className="text-gray-400 text-sm">No contacts available. Add contacts first.</p>
                      )}
                    </div>

                    <Alert className="border-blue-600 bg-blue-900/20">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-blue-300">
                        Selected: {selectedMembers.length}/7 members
                        {selectedMembers.length < 2 && " (minimum 2 required)"}
                      </AlertDescription>
                    </Alert>

                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        disabled={!newGroupName.trim() || selectedMembers.length < 2 || isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Users className="w-4 h-4 mr-2" />
                        )}
                        Create Group
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setShowCreateGroup(false)
                          setNewGroupName("")
                          setNewGroupDescription("")
                          setSelectedMembers([])
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {groups.map((group) => {
              const messages = getGroupMessages(group.id)
              const lastMessage = messages[messages.length - 1]

              return (
                <div
                  key={group.id}
                  className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-all duration-200 ${
                    selectedGroup?.id === group.id ? "bg-white/10 shadow-lg" : ""
                  }`}
                  onClick={() => onGroupSelect(group)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center text-white font-semibold">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-white truncate">{group.name}</h4>
                        {lastMessage && (
                          <span className="text-xs text-gray-400">{formatTimestamp(lastMessage.timestamp)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {group.members.length} members
                        </Badge>
                        {group.admins.includes(publicKey?.toString() || "") && (
                          <Crown className="w-3 h-3 text-yellow-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-400 truncate">
                        {lastMessage
                          ? lastMessage.messageType === "system"
                            ? lastMessage.content
                            : `${lastMessage.from.slice(0, 8)}...: ${lastMessage.content.slice(0, 30)}...`
                          : "No messages yet"}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}

            {groups.length === 0 && (
              <div className="p-8 text-center">
                <div className="text-4xl mb-4">👥</div>
                <p className="text-gray-400 mb-2">No groups yet</p>
                <p className="text-sm text-gray-500">Create a group to start messaging</p>
              </div>
            )}
          </div>
        </div>

        {/* Group Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedGroup ? (
            <>
              {/* Group Header */}
              <div className="p-4 border-b border-white/10 bg-black/10 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center text-white font-semibold">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">{selectedGroup.name}</h3>
                        {selectedGroup.admins.includes(publicKey?.toString() || "") && (
                          <Crown className="w-4 h-4 text-yellow-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        {selectedGroup.members.length} members • Created {formatTimestamp(selectedGroup.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {selectedGroup.admins.includes(publicKey?.toString() || "") && (
                      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <UserPlus className="w-3 h-3 mr-1" />
                                Add Member
                              </Button>
                            </DialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Add new member to group</p>
                          </TooltipContent>
                        </Tooltip>
                        <DialogContent className="bg-gray-900 border-gray-700">
                          <DialogHeader>
                            <DialogTitle className="text-white">Add Member</DialogTitle>
                          </DialogHeader>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault()
                              addMemberToGroup()
                            }}
                            className="space-y-4"
                          >
                            <Input
                              value={newMemberAddress}
                              onChange={(e) => setNewMemberAddress(e.target.value)}
                              placeholder="Enter Solana address..."
                              className="bg-gray-800 border-gray-600 text-white"
                            />
                            <div className="flex gap-2">
                              <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                                <UserPlus className="w-4 h-4 mr-2" />
                                Add Member
                              </Button>
                              <Button
                                type="button"
                                onClick={() => {
                                  setShowAddMember(false)
                                  setNewMemberAddress("")
                                }}
                                variant="outline"
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}

                    <Dialog open={showGroupSettings} onOpenChange={setShowGroupSettings}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Settings className="w-3 h-3" />
                            </Button>
                          </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Group settings</p>
                        </TooltipContent>
                      </Tooltip>
                      <DialogContent className="bg-gray-900 border-gray-700">
                        <DialogHeader>
                          <DialogTitle className="text-white">Group Settings</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-white font-medium mb-2">Members ({selectedGroup.members.length})</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {selectedGroup.members.map((member) => (
                                <div
                                  key={member}
                                  className="flex items-center justify-between p-2 bg-gray-800 rounded-lg"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                      {member.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-white text-sm">
                                        {member.slice(0, 8)}...{member.slice(-8)}
                                      </p>
                                      {selectedGroup.admins.includes(member) && (
                                        <Badge variant="secondary" className="text-xs">
                                          Admin
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => copyToClipboard(member)}
                                          className="h-6 w-6 p-0"
                                        >
                                          {copiedAddress === member ? (
                                            <Check className="w-3 h-3" />
                                          ) : (
                                            <Copy className="w-3 h-3" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Copy address</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    {selectedGroup.admins.includes(publicKey?.toString() || "") &&
                                      member !== publicKey?.toString() && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => removeMemberFromGroup(member)}
                                              className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                                            >
                                              <UserMinus className="w-3 h-3" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Remove member</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>

              {/* Group Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {getGroupMessages(selectedGroup.id).map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.from === publicKey?.toString() ? "justify-end" : "justify-start"
                    } animate-in slide-in-from-bottom-2`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="max-w-xs lg:max-w-md">
                      {message.messageType === "system" ? (
                        <div className="text-center">
                          <Badge variant="secondary" className="bg-gray-600/20 text-gray-300">
                            {message.content}
                          </Badge>
                        </div>
                      ) : (
                        <div
                          className={`${
                            message.from === publicKey?.toString() ? "bg-purple-600" : "bg-gray-700"
                          } rounded-lg p-3 text-white shadow-lg hover:shadow-xl transition-all duration-200`}
                        >
                          {message.from !== publicKey?.toString() && (
                            <p className="text-xs text-gray-300 mb-1">
                              {message.from.slice(0, 8)}...{message.from.slice(-8)}
                            </p>
                          )}
                          <p className="break-words">{message.content}</p>
                          <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                            <span>{formatTimestamp(message.timestamp)}</span>
                            <div className="flex items-center gap-1">
                              {message.encryptedContent && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Key className="w-3 h-3 text-green-400" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>End-to-end encrypted</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {message.signature && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Shield className="w-3 h-3 text-blue-400" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Cryptographically signed</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {message.arweaveId && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="secondary" className="text-xs bg-orange-600/20 text-orange-300">
                                      Arweave
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Stored on Arweave: {message.arweaveId}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {getGroupMessages(selectedGroup.id).length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-4">
                      <div className="text-4xl">💬</div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Start the conversation</h3>
                        <p className="text-gray-400">Send the first message to "{selectedGroup.name}"</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-white/10 bg-black/10 backdrop-blur-md">
                <div className="flex gap-2">
                  <Textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        sendGroupMessage()
                      }
                    }}
                    placeholder="Type your group message..."
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder-gray-400 resize-none transition-all duration-200 focus:ring-2 focus:ring-purple-500"
                    rows={1}
                    disabled={isSending}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={sendGroupMessage}
                        disabled={!messageText.trim() || isSending}
                        className="bg-purple-600 hover:bg-purple-700 transition-all duration-200 hover:scale-110 disabled:hover:scale-100"
                      >
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Send group message (Enter)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="text-6xl">👥</div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Select a group</h3>
                  <p className="text-gray-400">Choose a group to start messaging</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
