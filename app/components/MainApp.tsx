"use client"

import { useState, useEffect } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import {
  Home,
  MessageCircle,
  SettingsIcon,
  Plus,
  Search,
  Users,
  Shield,
  AlertCircle,
  CheckCircle,
  Loader2,
  Copy,
  Check,
  Bell,
  BellOff,
  Wifi,
  WifiOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"

import { EncryptionService } from "../lib/encryption"
import { ContactService, type Contact } from "../lib/contacts"
import { SearchService } from "../lib/search"
import { SolanaService } from "../lib/solana"
import { GroupService, type Group } from "../lib/groups"
import { ConversationManager } from "../lib/conversation-manager"
import { IPFSMessagingService } from "../lib/ipfs-messaging"
import { MessageService } from "../lib/messages"
import { EnhancedLandingPage } from "./EnhancedLandingPage"
import { SettingsView } from "./SettingsView"
import { ConversationView } from "./ConversationView"

export function MainApp() {
  const { publicKey, signMessage, connected, connecting, disconnect } = useWallet()
  const { connection } = useConnection()
  const { toast } = useToast()

  const [currentView, setCurrentView] = useState("home")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddContact, setShowAddContact] = useState(false)
  const [newContactAddress, setNewContactAddress] = useState("")
  const [newContactNickname, setNewContactNickname] = useState("")
  const [encryptionKeys, setEncryptionKeys] = useState<any>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [addressValidation, setAddressValidation] = useState<{
    isValid: boolean | null
    isValidating: boolean
    error?: string
    fromCache?: boolean
    networkIssue?: boolean
  }>({ isValid: null, isValidating: false })
  const [isSending, setIsSending] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [walletOperationInProgress, setWalletOperationInProgress] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [conversationManager, setConversationManager] = useState<ConversationManager | null>(null)
  const [conversationStates, setConversationStates] = useState<Map<string, any>>(new Map())
  const [totalUnreadCount, setTotalUnreadCount] = useState(0)
  const [isAddingContact, setIsAddingContact] = useState(false)

  // Initialize services
  const encryptionService = new EncryptionService()
  const contactService = new ContactService()
  const searchService = new SearchService()
  const solanaService = new SolanaService(connection)
  const groupService = new GroupService()
  const ipfsService = new IPFSMessagingService()
  const messageService = new MessageService()

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      console.log("🌐 Network connection restored")
      toast({
        title: "🌐 Back Online",
        description: "Network connection restored",
        variant: "default",
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      console.log("📡 Network connection lost")
      toast({
        title: "📡 Network Issue",
        description: "Connection lost. Some features may not work.",
        variant: "destructive",
      })
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [toast])

  // Initialize conversation manager when wallet connects
  useEffect(() => {
    if (publicKey && connected) {
      try {
        const manager = new ConversationManager(publicKey.toString())
        setConversationManager(manager)

        // Start sync if credentials are available
        const credentials = ipfsService.getPinataCredentials()
        if (credentials) {
          try {
            manager.startSync(credentials)
            console.log("🔄 Started auto-sync with Pinata credentials")
          } catch (syncError) {
            console.error("Failed to start sync:", syncError)
            toast({
              title: "⚠️ Sync Error",
              description: "Failed to start message sync. Check your IPFS settings.",
              variant: "destructive",
            })
          }
        } else {
          console.log("⚠️ No Pinata credentials found - sync disabled")
          toast({
            title: "⚠️ No IPFS Credentials",
            description: "Please configure Pinata credentials in Settings to enable message sync.",
            variant: "destructive",
          })
        }

        return () => {
          try {
            manager.stopSync()
          } catch (error) {
            console.error("Error stopping sync:", error)
          }
        }
      } catch (error) {
        console.error("Failed to initialize conversation manager:", error)
        toast({
          title: "❌ Initialization Error",
          description: "Failed to initialize messaging system.",
          variant: "destructive",
        })
      }
    } else {
      setConversationManager(null)
    }
  }, [publicKey, connected])

  // Listen for conversation updates
  useEffect(() => {
    if (!conversationManager) return

    const updateUnreadCounts = () => {
      const total = conversationManager.getTotalUnreadCount()
      setTotalUnreadCount(total)
    }

    // Update unread counts periodically
    const interval = setInterval(updateUnreadCounts, 1000)
    updateUnreadCounts() // Initial update

    return () => clearInterval(interval)
  }, [conversationManager])

  // Subscribe to selected conversation updates
  useEffect(() => {
    if (!conversationManager || !selectedContact) return

    const unsubscribe = conversationManager.subscribeToConversation(selectedContact.address, (state) => {
      setConversationStates((prev) => new Map(prev.set(selectedContact.address, state)))
    })

    // Load initial conversation
    conversationManager.loadConversation(selectedContact.address)

    return unsubscribe
  }, [conversationManager, selectedContact])

  // Load data on wallet connection
  useEffect(() => {
    if (publicKey && connected) {
      setIsLoadingData(true)
      Promise.all([loadContacts(), loadGroups(), initializeEncryption()])
        .then(() => {
          toast({
            title: "✅ Wallet Connected",
            description: "Your data has been loaded successfully",
            variant: "default",
          })
        })
        .catch((error) => {
          console.error("Failed to load data:", error)
          toast({
            title: "⚠️ Loading Error",
            description: "Some data failed to load. Please refresh the page.",
            variant: "destructive",
          })
        })
        .finally(() => {
          setIsLoadingData(false)
        })
    }
  }, [publicKey, connected])

  // Enhanced address validation with network resilience
  useEffect(() => {
    const validateAddress = async () => {
      if (!newContactAddress.trim()) {
        setAddressValidation({ isValid: null, isValidating: false })
        return
      }

      setAddressValidation({ isValid: null, isValidating: true })

      try {
        const result = await solanaService.validateAddress(newContactAddress.trim())
        setAddressValidation({
          isValid: result.isValid,
          isValidating: false,
          error: result.error,
          fromCache: result.fromCache,
          networkIssue: result.networkIssue,
        })
      } catch (error) {
        console.error("Address validation error:", error)
        setAddressValidation({
          isValid: false,
          isValidating: false,
          error: "Validation failed - network issue",
          networkIssue: true,
        })
      }
    }

    const timeoutId = setTimeout(validateAddress, 300)
    return () => clearTimeout(timeoutId)
  }, [newContactAddress])

  const initializeEncryption = async () => {
    if (!publicKey) return

    try {
      const keys = await encryptionService.generateOrLoadKeys(publicKey.toString())
      setEncryptionKeys(keys)
    } catch (error) {
      console.error("Failed to initialize encryption:", error)
      toast({
        title: "🔐 Encryption Error",
        description: "Failed to initialize encryption keys",
        variant: "destructive",
      })
    }
  }

  const loadContacts = async () => {
    if (!publicKey) return

    try {
      console.log("📚 Loading contacts for wallet:", publicKey.toString().slice(0, 8) + "...")
      const loadedContacts = await contactService.getContacts(publicKey.toString())
      console.log("📚 Loaded contacts:", loadedContacts.length)
      setContacts(loadedContacts)
    } catch (error) {
      console.error("Failed to load contacts:", error)
      throw error
    }
  }

  const loadGroups = async () => {
    if (!publicKey) return

    try {
      const loadedGroups = await groupService.getGroups(publicKey.toString())
      setGroups(loadedGroups)
    } catch (error) {
      console.error("Failed to load groups:", error)
      throw error
    }
  }

  const addContact = async () => {
    console.log("🔍 addContact function called")

    if (isAddingContact) {
      console.log("⚠️ Already adding contact, ignoring duplicate call")
      return
    }

    setIsAddingContact(true)

    try {
      if (!publicKey) {
        console.error("❌ No wallet connected")
        toast({
          title: "❌ Wallet Not Connected",
          description: "Please connect your wallet first",
          variant: "destructive",
        })
        return
      }

      const trimmedAddress = newContactAddress.trim()
      const trimmedNickname = newContactNickname.trim()

      console.log("📝 Form data:", { address: trimmedAddress, nickname: trimmedNickname })

      if (!trimmedAddress) {
        console.error("❌ Empty address")
        toast({
          title: "❌ Missing Address",
          description: "Please enter a Solana address",
          variant: "destructive",
        })
        return
      }

      // Basic format validation (works offline)
      try {
        const basicFormatValid = await solanaService.isValidAddress(trimmedAddress)
        console.log("🔍 Address format validation:", basicFormatValid)

        if (!basicFormatValid) {
          console.error("❌ Invalid address format")
          toast({
            title: "❌ Invalid Address Format",
            description: "Please enter a valid Solana address",
            variant: "destructive",
          })
          return
        }
      } catch (validationError) {
        console.error("❌ Address validation failed:", validationError)

        // If validation fails due to network, allow adding if format looks correct
        if (!isOnline || validationError.message?.includes("network")) {
          console.log("⚠️ Network issue during validation, checking basic format...")

          // Basic format check (32-44 characters, base58)
          if (trimmedAddress.length < 32 || trimmedAddress.length > 44) {
            toast({
              title: "❌ Invalid Address Length",
              description: "Solana addresses should be 32-44 characters long",
              variant: "destructive",
            })
            return
          }

          console.log("✅ Basic format check passed, proceeding despite network issue")
        } else {
          toast({
            title: "❌ Validation Error",
            description: "Failed to validate address format",
            variant: "destructive",
          })
          return
        }
      }

      // Check for existing contact
      const existingContact = contacts.find((c) => c.address === trimmedAddress)
      if (existingContact) {
        console.warn("⚠️ Contact already exists")
        toast({
          title: "👥 Contact Exists",
          description: "This contact is already in your list",
          variant: "destructive",
        })
        return
      }

      // Check if trying to add self
      if (trimmedAddress === publicKey.toString()) {
        console.warn("⚠️ Trying to add self")
        toast({
          title: "❌ Cannot Add Yourself",
          description: "You cannot add your own wallet address",
          variant: "destructive",
        })
        return
      }

      console.log("💾 Attempting to save contact...")

      const contact: Contact = {
        address: trimmedAddress,
        nickname: trimmedNickname || undefined,
        addedAt: Date.now(),
        verified: false,
      }

      console.log("📝 Contact object:", contact)

      // Save the contact (this works offline as it uses localStorage)
      await contactService.addContact(publicKey.toString(), contact)
      console.log("✅ Contact saved to storage")

      // Reload contacts from storage
      await loadContacts()
      console.log("🔄 Contacts reloaded")

      // Reset form and close dialog
      setNewContactAddress("")
      setNewContactNickname("")
      setShowAddContact(false)
      setAddressValidation({ isValid: null, isValidating: false })

      console.log("✅ Form reset and dialog closed")

      toast({
        title: "✅ Contact Added",
        description: `${contact.nickname || contact.address.slice(0, 8) + "..."} has been added to your contacts`,
        variant: "default",
      })

      console.log("✅ Success toast shown")
    } catch (error) {
      console.error("❌ Failed to add contact:", error)
      toast({
        title: "❌ Failed to Add Contact",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsAddingContact(false)
    }
  }

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || !publicKey || !signMessage || !encryptionKeys || !selectedContact) {
      throw new Error("Missing required data for sending message")
    }

    setIsSending(true)
    setWalletOperationInProgress(true)

    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const timestamp = Date.now()

      // Create the message object
      const message = {
        id: messageId,
        from: publicKey.toString(),
        to: selectedContact.address,
        content: messageText,
        timestamp,
        messageType: "text" as const,
      }

      // Encrypt the message
      const encryptedContent = await encryptionService.encryptMessage(
        messageText,
        selectedContact.address,
        encryptionKeys.privateKey,
      )

      // Sign the message
      const messageToSign = new TextEncoder().encode(
        JSON.stringify({
          to: selectedContact.address,
          content: messageText,
          timestamp,
        }),
      )

      const signature = await signMessage(messageToSign)

      const fullMessage = {
        ...message,
        encryptedContent,
        signature: Array.from(signature),
      }

      // 1. IMMEDIATELY save the sent message locally so user can see it
      await messageService.saveSentMessage(publicKey.toString(), {
        ...fullMessage,
        arweaveId: `pending_${messageId}`,
        isRead: true,
        status: "sending",
      })

      // Update the conversation view immediately
      if (conversationManager) {
        // Trigger a refresh of the conversation to show the sent message
        await conversationManager.loadConversation(selectedContact.address)
      }

      // 2. Store message on IPFS in the background
      try {
        const cid = await ipfsService.storeMessage(fullMessage)

        // Update the message with the actual CID
        await messageService.updateMessageStatus(publicKey.toString(), messageId, "sent")
        await messageService.saveMessage(publicKey.toString(), {
          ...fullMessage,
          arweaveId: cid,
          status: "sent",
        })

        console.log(`✅ Message stored on IPFS with CID: ${cid}`)
      } catch (ipfsError) {
        console.error("Failed to store on IPFS:", ipfsError)
        // Update status to failed but keep the local message
        await messageService.updateMessageStatus(publicKey.toString(), messageId, "failed")
        throw new Error("Failed to store message on IPFS")
      }

      // 3. Trigger sync to update conversation
      if (conversationManager) {
        const credentials = ipfsService.getPinataCredentials()
        if (credentials) {
          // Don't await this - let it happen in background
          conversationManager.manualSync(credentials).catch(console.error)
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error)
      throw error
    } finally {
      setIsSending(false)
      setWalletOperationInProgress(false)
    }
  }

  const handleRefreshConversation = async () => {
    if (!conversationManager || !selectedContact) return

    const credentials = ipfsService.getPinataCredentials()
    if (credentials) {
      await conversationManager.manualSync(credentials)
    }
  }

  const handleMarkConversationAsRead = () => {
    if (!conversationManager || !selectedContact) return
    conversationManager.markConversationAsRead(selectedContact.address)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedAddress(text)
      setTimeout(() => setCopiedAddress(null), 2000)

      toast({
        title: "📋 Copied",
        description: "Address copied to clipboard",
        variant: "default",
      })
    } catch (error) {
      toast({
        title: "❌ Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      })
    }
  }

  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false)
      toast({
        title: "🔕 Notifications Disabled",
        description: "You won't receive notifications",
      })
    } else {
      if ("Notification" in window) {
        const permission = await Notification.requestPermission()
        if (permission === "granted") {
          setNotificationsEnabled(true)
          toast({
            title: "🔔 Notifications Enabled",
            description: "You'll receive notifications for new messages",
            variant: "default",
          })
        } else {
          toast({
            title: "❌ Permission Denied",
            description: "Please enable notifications in your browser settings",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "❌ Not Supported",
          description: "Your browser doesn't support notifications",
          variant: "destructive",
        })
      }
    }
  }

  const getUnreadCountForContact = (contactAddress: string): number => {
    const state = conversationStates.get(contactAddress)
    return state?.unreadCount || 0
  }

  if (!connected) {
    return <EnhancedLandingPage connecting={connecting} />
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="flex flex-col h-screen">
          {/* Header */}
          <header className="bg-black/20 backdrop-blur-md border-b border-white/10 p-4">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-white">SolChat</h1>
                {isLoadingData && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </div>
                )}
                {totalUnreadCount > 0 && (
                  <Badge variant="destructive" className="animate-pulse">
                    {totalUnreadCount} unread
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleNotifications}
                      className={`${
                        notificationsEnabled
                          ? "bg-green-600/20 border-green-600/30 text-green-300 hover:bg-green-600/30"
                          : "bg-gray-600/20 border-gray-600/30 text-gray-300 hover:bg-gray-600/30"
                      } transition-all duration-200`}
                    >
                      {notificationsEnabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{notificationsEnabled ? "Disable notifications" : "Enable notifications"}</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger>
                    <Badge
                      variant="secondary"
                      className={`${
                        isOnline
                          ? "bg-green-600/20 text-green-300 hover:bg-green-600/30"
                          : "bg-red-600/20 text-red-300 hover:bg-red-600/30"
                      } transition-colors`}
                    >
                      {isOnline ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
                      {isOnline ? "Online" : "Offline"}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Network connection status</p>
                  </TooltipContent>
                </Tooltip>

                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(publicKey?.toString() || "")}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20 transition-all duration-200"
                      >
                        {copiedAddress === publicKey?.toString() ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy wallet address</p>
                    </TooltipContent>
                  </Tooltip>

                  <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !rounded-lg !transition-all !duration-200 hover:!scale-105" />
                </div>
              </div>
            </div>
          </header>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <nav className="w-64 bg-black/20 backdrop-blur-md border-r border-white/10 p-4">
              <div className="space-y-2">
                {[
                  { id: "home", icon: Home, label: "Home", badge: null },
                  { id: "chat", icon: MessageCircle, label: "Messages", badge: totalUnreadCount },
                  { id: "groups", icon: Users, label: "Groups", badge: groups.length },
                  { id: "search", icon: Search, label: "Search", badge: null },
                  { id: "settings", icon: SettingsIcon, label: "Settings", badge: null },
                ].map((item) => (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setCurrentView(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white hover:bg-white/10 transition-all duration-200 ${
                          currentView === item.id ? "bg-white/20 shadow-lg" : ""
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                        {item.badge !== null && item.badge > 0 && (
                          <Badge variant="destructive" className="ml-auto animate-pulse">
                            {item.badge}
                          </Badge>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden">
              {currentView === "home" && (
                <div className="flex items-center justify-center h-full p-8">
                  <div className="text-center max-w-2xl space-y-8">
                    <div className="space-y-4">
                      <h2 className="text-4xl font-bold text-white">Welcome to SolChat</h2>
                      <p className="text-xl text-gray-300">
                        A fully decentralized messaging platform with end-to-end encryption, IPFS storage, and real-time
                        synchronization.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { title: "Secure", desc: "End-to-end encryption with x25519", icon: "🔐" },
                        { title: "Decentralized", desc: "IPFS storage with individual message CIDs", icon: "🌐" },
                        { title: "Real-time", desc: "Automatic message discovery and sync", icon: "⚡" },
                        { title: "Verified", desc: "Cryptographically signed messages", icon: "✅" },
                      ].map((feature, index) => (
                        <Card
                          key={index}
                          className="p-4 bg-black/20 border-white/10 hover:bg-black/30 transition-all duration-200 hover:scale-105"
                        >
                          <div className="text-2xl mb-2">{feature.icon}</div>
                          <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                          <p className="text-gray-300 text-sm">{feature.desc}</p>
                        </Card>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <Button
                        onClick={() => setCurrentView("chat")}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
                        size="lg"
                      >
                        Start Messaging
                      </Button>

                      <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                        <Shield className="w-4 h-4" />
                        Connected: {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentView === "chat" && (
                <div className="flex h-full">
                  {/* Contact List */}
                  <div className="w-80 bg-black/10 backdrop-blur-md border-r border-white/10 flex flex-col">
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Contacts</h3>
                        <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DialogTrigger asChild>
                                <Button
                                  variant="default"
                                  size="icon"
                                  className="bg-purple-600 hover:bg-purple-700 transition-all duration-200 hover:scale-110"
                                  disabled={isAddingContact}
                                  onClick={(e) => {
                                    console.log("🔘 Add Contact button clicked!")
                                    console.log("Current showAddContact state:", showAddContact)
                                    console.log("isAddingContact:", isAddingContact)
                                    if (!showAddContact) {
                                      setShowAddContact(true)
                                      console.log("✅ Setting showAddContact to true")
                                    }
                                  }}
                                >
                                  {isAddingContact ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Plus className="w-4 h-4" />
                                  )}
                                </Button>
                              </DialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Add new contact</p>
                            </TooltipContent>
                          </Tooltip>
                          <DialogContent className="bg-gray-900 border-gray-700">
                            <DialogHeader>
                              <DialogTitle className="text-white">Add Contact</DialogTitle>
                            </DialogHeader>
                            <div className="text-white mb-4">
                              <p className="text-sm text-gray-400">
                                Debug: Dialog is {showAddContact ? "open" : "closed"}
                              </p>
                            </div>
                            <form
                              onSubmit={(e) => {
                                console.log("📝 Form submitted")
                                e.preventDefault()
                                e.stopPropagation()
                                addContact()
                              }}
                              className="space-y-4"
                            >
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  Solana Wallet Address
                                </label>
                                <div className="relative">
                                  <Input
                                    value={newContactAddress}
                                    onChange={(e) => setNewContactAddress(e.target.value)}
                                    placeholder="Enter valid Solana address..."
                                    className="bg-gray-800 border-gray-600 text-white pr-10 transition-all duration-200 focus:ring-2 focus:ring-purple-500"
                                    disabled={isAddingContact}
                                  />
                                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    {addressValidation.isValidating && (
                                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                                    )}
                                    {!addressValidation.isValidating && addressValidation.isValid === true && (
                                      <CheckCircle className="w-4 h-4 text-green-400" />
                                    )}
                                    {!addressValidation.isValidating && addressValidation.isValid === false && (
                                      <AlertCircle className="w-4 h-4 text-red-400" />
                                    )}
                                  </div>
                                </div>
                                {addressValidation.error && (
                                  <Alert className="mt-2 border-red-600 bg-red-900/20 animate-in slide-in-from-top-2">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="text-red-300">
                                      {addressValidation.error}
                                      {addressValidation.networkIssue && (
                                        <span className="block text-xs mt-1 text-yellow-300">
                                          Network issue detected - basic validation will be used
                                        </span>
                                      )}
                                    </AlertDescription>
                                  </Alert>
                                )}
                                {addressValidation.isValid && (
                                  <Alert className="mt-2 border-green-600 bg-green-900/20 animate-in slide-in-from-top-2">
                                    <CheckCircle className="h-4 w-4" />
                                    <AlertDescription className="text-green-300 flex items-center gap-2">
                                      Valid Solana address
                                      {addressValidation.fromCache && (
                                        <Badge variant="secondary" className="text-xs">
                                          cached
                                        </Badge>
                                      )}
                                      {addressValidation.networkIssue && (
                                        <Badge variant="outline" className="text-xs text-yellow-300">
                                          offline validation
                                        </Badge>
                                      )}
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </div>
                              <Input
                                value={newContactNickname}
                                onChange={(e) => setNewContactNickname(e.target.value)}
                                placeholder="Nickname (optional)..."
                                className="bg-gray-800 border-gray-600 text-white transition-all duration-200 focus:ring-2 focus:ring-purple-500"
                                disabled={isAddingContact}
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="submit"
                                  className="flex-1 bg-green-600 hover:bg-green-700 transition-all duration-200 hover:scale-105"
                                  disabled={
                                    !newContactAddress.trim() || addressValidation.isValidating || isAddingContact
                                  }
                                >
                                  {isAddingContact ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  ) : addressValidation.isValidating ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  ) : (
                                    <Plus className="w-4 h-4 mr-2" />
                                  )}
                                  {isAddingContact ? "Adding..." : "Add Contact"}
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() => {
                                    console.log("🚫 Cancel button clicked")
                                    setShowAddContact(false)
                                    setNewContactAddress("")
                                    setNewContactNickname("")
                                    setAddressValidation({ isValid: null, isValidating: false })
                                  }}
                                  variant="outline"
                                  className="flex-1 transition-all duration-200 hover:scale-105"
                                  disabled={isAddingContact}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button
                          onClick={() => {
                            console.log("🔧 Debug: Forcing dialog open")
                            setShowAddContact(true)
                          }}
                          variant="outline"
                          size="sm"
                          className="ml-2"
                        >
                          Debug Open
                        </Button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      {isLoadingData ? (
                        <div className="p-4 space-y-4">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <Skeleton className="w-10 h-10 rounded-full" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        contacts.map((contact) => {
                          const unreadCount = getUnreadCountForContact(contact.address)

                          return (
                            <div key={contact.address} className="relative group">
                              <button
                                onClick={() => {
                                  setSelectedContact(contact)
                                  setSelectedGroup(null)
                                }}
                                className={`w-full p-4 text-left hover:bg-white/5 border-b border-white/5 transition-all duration-200 ${
                                  selectedContact?.address === contact.address ? "bg-white/10 shadow-lg" : ""
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                                      {(contact.nickname || contact.address).slice(0, 2).toUpperCase()}
                                    </div>
                                    {unreadCount > 0 && (
                                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold animate-pulse">
                                        {unreadCount > 9 ? "9+" : unreadCount}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <h4
                                          className={`font-medium truncate ${unreadCount > 0 ? "text-white font-bold" : "text-white"}`}
                                        >
                                          {contact.nickname || `${contact.address.slice(0, 8)}...`}
                                        </h4>
                                        {contact.verified && (
                                          <Tooltip>
                                            <TooltipTrigger>
                                              <Shield className="w-3 h-3 text-green-400" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Verified contact</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* Message Area */}
                  <div className="flex-1 flex flex-col">
                    {selectedContact ? (
                      <ConversationView
                        contact={selectedContact}
                        conversationState={conversationStates.get(selectedContact.address) || null}
                        onSendMessage={sendMessage}
                        onMarkAsRead={handleMarkConversationAsRead}
                        onRefresh={handleRefreshConversation}
                        isSending={isSending}
                        walletAddress={publicKey?.toString() || ""}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-white text-2xl">
                        <div className="text-center space-y-4">
                          <div className="text-6xl">💬</div>
                          <h3 className="text-2xl font-bold">Select a Contact</h3>
                          <p className="text-gray-400">Choose someone to start messaging</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentView === "settings" && (
                <SettingsView
                  currentStorage="ipfs"
                  onStorageChange={() => {}}
                  notificationsEnabled={notificationsEnabled}
                  toggleNotifications={toggleNotifications}
                  publicKey={publicKey?.toString() || null}
                  disconnect={disconnect}
                />
              )}

              {currentView === "search" && (
                <div className="p-8">
                  <div className="max-w-2xl mx-auto space-y-6">
                    <div className="space-y-4">
                      <h2 className="text-2xl font-bold text-white">Search Messages</h2>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search your messages..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                    </div>

                    <div className="text-center text-white">
                      <p className="text-gray-300">Search functionality coming soon!</p>
                      <p className="text-sm text-gray-400 mt-2">Will search across all your decentralized messages</p>
                    </div>
                  </div>
                </div>
              )}

              {currentView === "groups" && (
                <div className="p-8">
                  <div className="text-center text-white">
                    <h2 className="text-2xl font-bold mb-4">Group Chat</h2>
                    <p className="text-gray-300">Group messaging feature coming soon!</p>
                    <p className="text-sm text-gray-400 mt-2">Will support decentralized group conversations</p>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
