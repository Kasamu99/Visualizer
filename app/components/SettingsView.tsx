"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Settings,
  Database,
  Bell,
  Shield,
  Download,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { IPFSMessagingService } from "../lib/ipfs-messaging"
import { DebugSync } from "./DebugSync"

interface SettingsViewProps {
  currentStorage: string
  onStorageChange: (storage: string) => void
  notificationsEnabled: boolean
  toggleNotifications: () => void
  publicKey: string | null
  disconnect: () => void
}

export function SettingsView({
  currentStorage,
  onStorageChange,
  notificationsEnabled,
  toggleNotifications,
  publicKey,
  disconnect,
}: SettingsViewProps) {
  const [pinataApiKey, setPinataApiKey] = useState("")
  const [pinataSecretKey, setPinataSecretKey] = useState("")
  const [showSecrets, setShowSecrets] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle")
  const { toast } = useToast()

  const ipfsService = new IPFSMessagingService()

  useEffect(() => {
    // Load existing credentials
    const credentials = ipfsService.getPinataCredentials()
    if (credentials) {
      setPinataApiKey(credentials.apiKey)
      setPinataSecretKey(credentials.secretKey)
      setConnectionStatus("success")
    }
  }, [])

  const savePinataCredentials = async () => {
    if (!pinataApiKey.trim() || !pinataSecretKey.trim()) {
      toast({
        title: "❌ Missing Credentials",
        description: "Please enter both API key and secret key",
        variant: "destructive",
      })
      return
    }

    try {
      ipfsService.setPinataCredentials(pinataApiKey, pinataSecretKey)
      setConnectionStatus("success")

      toast({
        title: "✅ Credentials Saved",
        description: "Pinata credentials have been saved successfully",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "❌ Save Failed",
        description: "Failed to save Pinata credentials",
        variant: "destructive",
      })
    }
  }

  const testConnection = async () => {
    if (!pinataApiKey.trim() || !pinataSecretKey.trim()) {
      toast({
        title: "❌ Missing Credentials",
        description: "Please enter credentials first",
        variant: "destructive",
      })
      return
    }

    setIsTestingConnection(true)
    try {
      // Temporarily save credentials for testing
      ipfsService.setPinataCredentials(pinataApiKey, pinataSecretKey)

      const isConnected = await ipfsService.testPinataConnection()
      if (isConnected) {
        setConnectionStatus("success")
        toast({
          title: "✅ Connection Success",
          description: "Pinata connection is working correctly",
          variant: "success",
        })
      } else {
        setConnectionStatus("error")
        toast({
          title: "❌ Connection Failed",
          description: "Please check your credentials",
          variant: "destructive",
        })
      }
    } catch (error) {
      setConnectionStatus("error")
      toast({
        title: "❌ Connection Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  const clearCredentials = () => {
    ipfsService.clearPinataCredentials()
    setPinataApiKey("")
    setPinataSecretKey("")
    setConnectionStatus("idle")

    toast({
      title: "🗑️ Credentials Cleared",
      description: "Pinata credentials have been removed",
    })
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white">Settings</h2>
          <p className="text-gray-400">Configure your SolChat preferences and storage settings</p>
        </div>

        <Tabs defaultValue="storage" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800">
            <TabsTrigger value="storage" className="text-white">
              <Database className="w-4 h-4 mr-2" />
              Storage
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-white">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="privacy" className="text-white">
              <Shield className="w-4 h-4 mr-2" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="debug" className="text-white">
              <Settings className="w-4 h-4 mr-2" />
              Debug
            </TabsTrigger>
          </TabsList>

          <TabsContent value="storage" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">IPFS Storage (Pinata)</CardTitle>
                <p className="text-gray-400">Configure your Pinata credentials for decentralized message storage</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pinata-api-key" className="text-white">
                    Pinata API Key
                  </Label>
                  <Input
                    id="pinata-api-key"
                    type={showSecrets ? "text" : "password"}
                    value={pinataApiKey}
                    onChange={(e) => setPinataApiKey(e.target.value)}
                    placeholder="Enter your Pinata API key..."
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pinata-secret-key" className="text-white">
                    Pinata Secret Key
                  </Label>
                  <Input
                    id="pinata-secret-key"
                    type={showSecrets ? "text" : "password"}
                    value={pinataSecretKey}
                    onChange={(e) => setPinataSecretKey(e.target.value)}
                    placeholder="Enter your Pinata secret key..."
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-secrets"
                    checked={showSecrets}
                    onCheckedChange={setShowSecrets}
                    className="data-[state=checked]:bg-purple-600"
                  />
                  <Label htmlFor="show-secrets" className="text-gray-300">
                    {showSecrets ? (
                      <>
                        <EyeOff className="w-4 h-4 inline mr-1" />
                        Hide credentials
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 inline mr-1" />
                        Show credentials
                      </>
                    )}
                  </Label>
                </div>

                {connectionStatus !== "idle" && (
                  <Alert
                    className={`${
                      connectionStatus === "success"
                        ? "border-green-600 bg-green-900/20"
                        : "border-red-600 bg-red-900/20"
                    }`}
                  >
                    {connectionStatus === "success" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertDescription className={connectionStatus === "success" ? "text-green-300" : "text-red-300"}>
                      {connectionStatus === "success"
                        ? "Pinata connection is working correctly"
                        : "Connection failed - please check your credentials"}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button onClick={testConnection} disabled={isTestingConnection} variant="outline">
                    {isTestingConnection ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Test Connection
                  </Button>

                  <Button onClick={savePinataCredentials} className="bg-green-600 hover:bg-green-700">
                    <Download className="w-4 h-4 mr-2" />
                    Save Credentials
                  </Button>

                  <Button onClick={clearCredentials} variant="destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </div>

                <Alert className="border-blue-600 bg-blue-900/20">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-blue-300">
                    Get your free Pinata API credentials at{" "}
                    <a
                      href="https://pinata.cloud"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-200"
                    >
                      pinata.cloud
                    </a>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Notification Preferences</CardTitle>
                <p className="text-gray-400">Control how you receive notifications for new messages</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-white">Browser Notifications</Label>
                    <p className="text-sm text-gray-400">Get notified when you receive new messages</p>
                  </div>
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={toggleNotifications}
                    className="data-[state=checked]:bg-purple-600"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Privacy & Security</CardTitle>
                <p className="text-gray-400">Manage your privacy settings and wallet connection</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white">Connected Wallet</Label>
                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-400" />
                      <span className="text-white font-mono text-sm">
                        {publicKey ? `${publicKey.slice(0, 8)}...${publicKey.slice(-8)}` : "Not connected"}
                      </span>
                    </div>
                    <Button onClick={disconnect} variant="destructive" size="sm">
                      Disconnect
                    </Button>
                  </div>
                </div>

                <Alert className="border-yellow-600 bg-yellow-900/20">
                  <Shield className="h-4 w-4" />
                  <AlertDescription className="text-yellow-300">
                    Your messages are end-to-end encrypted and stored on IPFS. Only you and the recipient can read them.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="debug" className="space-y-6">
            {publicKey && <DebugSync walletAddress={publicKey} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
