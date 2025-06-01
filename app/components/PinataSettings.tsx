"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { IPFSService } from "../lib/ipfs"
import {
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Key,
  Shield,
  Loader2,
  Trash2,
  TestTube,
  Database,
  Server,
  Settings,
} from "lucide-react"

export function PinataSettings() {
  const [apiKey, setApiKey] = useState("")
  const [secretKey, setSecretKey] = useState("")
  const [showSecrets, setShowSecrets] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "success" | "error">("unknown")
  const [errorMessage, setErrorMessage] = useState("")
  const [stats, setStats] = useState<{ pinCount: number; totalSize: number; isConfigured: boolean }>({
    pinCount: 0,
    totalSize: 0,
    isConfigured: false,
  })
  const [usingEnvVars, setUsingEnvVars] = useState(false)

  const ipfsService = new IPFSService()

  useEffect(() => {
    checkCredentialSource()
    loadExistingCredentials()
    loadStats()
  }, [])

  const checkCredentialSource = () => {
    // Check if environment variables are set
    const hasEnvVars = !!(process.env.NEXT_PUBLIC_PINATA_API_KEY && process.env.NEXT_PUBLIC_PINATA_SECRET)
    setUsingEnvVars(hasEnvVars)

    if (hasEnvVars) {
      setConnectionStatus("success")
    }
  }

  const loadExistingCredentials = () => {
    const credentials = ipfsService.getPinataCredentials()
    if (credentials) {
      // Check if these are from environment variables
      const isFromEnv = !!(process.env.NEXT_PUBLIC_PINATA_API_KEY && process.env.NEXT_PUBLIC_PINATA_SECRET)

      if (isFromEnv) {
        // Show masked environment variables
        setApiKey("••••••••••••••••••••")
        setSecretKey("••••••••••••••••••••••••••••••••••••••••")
      } else {
        // Show actual stored credentials
        setApiKey(credentials.apiKey)
        setSecretKey(credentials.secretKey)
      }
      setConnectionStatus("success")
    }
  }

  const loadStats = async () => {
    try {
      const pinataStats = await ipfsService.getPinataStats()
      setStats(pinataStats)
    } catch (error) {
      console.error("Failed to load Pinata stats:", error)
    }
  }

  const handleSave = async () => {
    if (usingEnvVars) {
      setErrorMessage("Cannot modify credentials when using environment variables")
      return
    }

    if (!apiKey.trim() || !secretKey.trim()) {
      setErrorMessage("Both API Key and Secret Key are required")
      return
    }

    setIsLoading(true)
    setErrorMessage("")

    try {
      ipfsService.setPinataCredentials(apiKey, secretKey)
      setConnectionStatus("success")
      await loadStats()
    } catch (error) {
      setErrorMessage("Failed to save credentials")
      setConnectionStatus("error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestConnection = async () => {
    setIsTestingConnection(true)
    setErrorMessage("")

    try {
      const isConnected = await ipfsService.testPinataConnection()

      if (isConnected) {
        setConnectionStatus("success")
        await loadStats()
      } else {
        setConnectionStatus("error")
        setErrorMessage("Connection test failed. Please check your credentials.")
      }
    } catch (error) {
      setConnectionStatus("error")
      setErrorMessage(`Connection test failed: ${error.message}`)
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleClear = () => {
    if (usingEnvVars) {
      setErrorMessage("Cannot clear environment variables from the UI")
      return
    }

    ipfsService.clearPinataCredentials()
    setApiKey("")
    setSecretKey("")
    setConnectionStatus("unknown")
    setErrorMessage("")
    setStats({ pinCount: 0, totalSize: 0, isConfigured: false })
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 border-white/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-400" />
            <CardTitle className="text-white">Pinata IPFS Configuration</CardTitle>
          </div>
          <CardDescription className="text-gray-400">
            Configure your Pinata API credentials for decentralized message storage. Get your free API keys from{" "}
            <a
              href="https://app.pinata.cloud/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
            >
              Pinata Dashboard
              <ExternalLink className="w-3 h-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Credential Source Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Source:</span>
            {usingEnvVars ? (
              <Badge variant="secondary" className="bg-purple-600/20 text-purple-300">
                <Server className="w-3 h-3 mr-1" />
                Environment Variables
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-blue-600/20 text-blue-300">
                <Settings className="w-3 h-3 mr-1" />
                UI Settings
              </Badge>
            )}
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Status:</span>
            {connectionStatus === "success" && (
              <Badge variant="secondary" className="bg-green-600/20 text-green-300">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            )}
            {connectionStatus === "error" && (
              <Badge variant="secondary" className="bg-red-600/20 text-red-300">
                <AlertCircle className="w-3 h-3 mr-1" />
                Error
              </Badge>
            )}
            {connectionStatus === "unknown" && (
              <Badge variant="secondary" className="bg-gray-600/20 text-gray-300">
                <AlertCircle className="w-3 h-3 mr-1" />
                Not Configured
              </Badge>
            )}
          </div>

          {/* Environment Variables Notice */}
          {usingEnvVars && (
            <Alert className="bg-purple-600/20 border-purple-600/30">
              <Server className="h-4 w-4" />
              <AlertDescription className="text-purple-300">
                Using environment variables configured in Vercel. These credentials are managed at the deployment level
                and cannot be modified through the UI.
              </AlertDescription>
            </Alert>
          )}

          {/* API Key Input */}
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-white">
              API Key
            </Label>
            <Input
              id="apiKey"
              type={showSecrets ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={usingEnvVars ? "Set via environment variables" : "Enter your Pinata API Key"}
              disabled={usingEnvVars}
              className="bg-black/20 border-white/10 text-white disabled:opacity-50"
            />
          </div>

          {/* Secret Key Input */}
          <div className="space-y-2">
            <Label htmlFor="secretKey" className="text-white">
              Secret API Key
            </Label>
            <Input
              id="secretKey"
              type={showSecrets ? "text" : "password"}
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder={usingEnvVars ? "Set via environment variables" : "Enter your Pinata Secret API Key"}
              disabled={usingEnvVars}
              className="bg-black/20 border-white/10 text-white disabled:opacity-50"
            />
          </div>

          {/* Show/Hide Toggle */}
          {!usingEnvVars && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSecrets(!showSecrets)}
              className="text-gray-400 hover:text-white"
            >
              {showSecrets ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Hide Keys
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Show Keys
                </>
              )}
            </Button>
          )}

          {/* Error Message */}
          {errorMessage && (
            <Alert className="bg-red-600/20 border-red-600/30">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-300">{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!usingEnvVars && (
              <Button onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Save Credentials
                  </>
                )}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="border-white/10 hover:bg-white/10"
            >
              {isTestingConnection ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>

            {!usingEnvVars && (apiKey || secretKey) && (
              <Button variant="outline" onClick={handleClear} className="border-red-600/30 hover:bg-red-600/10">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      {stats.isConfigured && (
        <Card className="bg-black/20 border-white/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-green-400" />
              <CardTitle className="text-white">Pinata Usage</CardTitle>
            </div>
            <CardDescription className="text-gray-400">Your current Pinata storage usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-400">Total Pins</p>
                <p className="text-2xl font-bold text-white">{stats.pinCount.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-400">Storage Used</p>
                <p className="text-2xl font-bold text-white">{formatBytes(stats.totalSize)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!usingEnvVars && (
        <Card className="bg-black/10 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-sm">How to get Pinata API Keys</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-400">
            <div className="space-y-2">
              <p>1. Visit the Pinata Dashboard and create a free account</p>
              <p>2. Go to API Keys section and create a new key</p>
              <p>3. Give it admin permissions for full functionality</p>
              <p>4. Copy both the API Key and Secret API Key</p>
              <p>5. Paste them above and click "Save Credentials"</p>
            </div>
            <Separator className="bg-white/10" />
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span>Free tier includes 1GB storage and 100,000 requests/month</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
