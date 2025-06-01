"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { StorageManager, type StorageType, type StorageStats } from "../lib/storage-manager"
import { IPFSService } from "../lib/ipfs"
import { Database, Cloud, HardDrive, CheckCircle, AlertCircle, Loader2, Zap, Shield, DollarSign } from "lucide-react"

interface StorageSelectorProps {
  currentStorage: StorageType
  onStorageChange: (type: StorageType) => void
}

export function StorageSelector({ currentStorage, onStorageChange }: StorageSelectorProps) {
  const [stats, setStats] = useState<StorageStats[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [pinataStats, setPinataStats] = useState<{ pinCount: number; totalSize: number }>({ pinCount: 0, totalSize: 0 })
  const [isPinataConfigured, setIsPinataConfigured] = useState(false)
  const ipfsService = new IPFSService()

  const storageManager = StorageManager.getInstance()

  useEffect(() => {
    loadStats()
    checkPinataConfig()
    loadPinataStats()
  }, [])

  const loadStats = async () => {
    try {
      const storageStats = await storageManager.getStorageStats()
      setStats(storageStats)
    } catch (error) {
      console.error("Failed to load storage stats:", error)
    }
  }

  const loadPinataStats = async () => {
    try {
      const stats = await ipfsService.getPinataStats()
      setPinataStats(stats)
    } catch (error) {
      console.error("Failed to load Pinata stats:", error)
    }
  }

  const checkPinataConfig = () => {
    const credentials = ipfsService.getPinataCredentials()
    setIsPinataConfigured(!!credentials)
  }

  const handleStorageChange = async (type: StorageType) => {
    setIsLoading(true)
    try {
      storageManager.setCurrentStorage(type)
      onStorageChange(type)
      await loadStats()
    } catch (error) {
      console.error("Failed to change storage:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const storageOptions = [
    {
      type: "ipfs" as StorageType,
      name: "Pinata IPFS",
      description: isPinataConfigured ? "Pinata IPFS - Ready to use" : "Pinata IPFS - Needs configuration",
      icon: Cloud,
      features: isPinataConfigured
        ? ["Configured", "Fast retrieval", "Global CDN", "Real-time sync"]
        : ["Needs setup", "Fast retrieval", "Global CDN", "Real-time sync"],
      recommended: true,
      status: "available",
      color: "bg-green-600/20 text-green-300 border-green-600/30",
    },
    {
      type: "arweave" as StorageType,
      name: "Arweave",
      description: "Permanent storage on blockchain",
      icon: Database,
      features: ["Permanent storage", "Blockchain verified", "Pay once, store forever"],
      recommended: false,
      status: "available",
      color: "bg-orange-600/20 text-orange-300 border-orange-600/30",
    },
    {
      type: "local" as StorageType,
      name: "Local Storage",
      description: "Private, browser-only storage",
      icon: HardDrive,
      features: ["Private", "Instant", "No network required", "No sync"],
      recommended: false,
      status: "available",
      color: "bg-blue-600/20 text-blue-300 border-blue-600/30",
    },
  ]

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Storage Options</h3>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>

        <div className="grid gap-3">
          {storageOptions.map((option) => {
            const isSelected = currentStorage === option.type
            const stat = stats.find((s) => s.type === option.type)

            return (
              <Card
                key={option.type}
                className={`p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                  isSelected
                    ? `${option.color} shadow-lg ring-2 ring-current`
                    : "bg-black/20 border-white/10 hover:bg-black/30"
                }`}
                onClick={() => handleStorageChange(option.type)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${isSelected ? "bg-current/20" : "bg-white/10"}`}>
                      <option.icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white">{option.name}</h4>
                        {option.recommended && (
                          <Badge variant="secondary" className="bg-green-600/20 text-green-300 text-xs">
                            <Zap className="w-3 h-3 mr-1" />
                            Recommended
                          </Badge>
                        )}
                        {isSelected && <CheckCircle className="w-4 h-4 text-green-400" />}
                      </div>

                      <p className="text-sm text-gray-400 mb-2">{option.description}</p>

                      <div className="flex flex-wrap gap-1 mb-2">
                        {option.features.map((feature, index) => (
                          <Badge key={index} variant="secondary" className="text-xs bg-white/10 text-gray-300">
                            {feature}
                          </Badge>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        {stat && (
                          <>
                            <span>Messages: {stat.messageCount}</span>
                            {stat.storageSize && <span>Size: {stat.storageSize}</span>}
                            {stat.costEstimate && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                {stat.costEstimate}
                              </span>
                            )}
                          </>
                        )}

                        {option.type === "ipfs" && pinataStats.pinCount > 0 && (
                          <span>
                            Pinned: {pinataStats.pinCount} ({formatBytes(pinataStats.totalSize)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {option.status === "available" ? (
                      <Tooltip>
                        <TooltipTrigger>
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Available and ready</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertCircle className="w-4 h-4 text-yellow-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Limited availability</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Current selection info */}
        <Card className="p-3 bg-black/10 border-white/10">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-gray-300">
              Currently using{" "}
              <span className="font-semibold text-white">
                {storageOptions.find((o) => o.type === currentStorage)?.name}
              </span>{" "}
              for message storage
            </span>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  )
}
