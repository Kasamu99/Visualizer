"use client"

import { useState, useEffect } from "react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import {
  Shield,
  Zap,
  Globe,
  Users,
  Lock,
  Cpu,
  CheckCircle,
  Star,
  MessageCircle,
  Key,
  Database,
  Loader2,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface EnhancedLandingPageProps {
  connecting: boolean
}

export function EnhancedLandingPage({ connecting }: EnhancedLandingPageProps) {
  const [currentFeature, setCurrentFeature] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  const features = [
    {
      icon: Shield,
      title: "Military-Grade Encryption",
      description: "x25519 elliptic curve cryptography with XChaCha20-Poly1305",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: Globe,
      title: "Truly Decentralized",
      description: "No servers, no central authority. Pure peer-to-peer messaging",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Database,
      title: "Permanent Storage",
      description: "Messages stored forever on Arweave's permaweb",
      color: "from-orange-500 to-red-500",
    },
    {
      icon: Users,
      title: "Group Messaging",
      description: "Secure group chats with up to 8 participants",
      color: "from-purple-500 to-pink-500",
    },
  ]

  const stats = [
    { label: "Messages Encrypted", value: "100%", icon: Lock },
    { label: "Uptime Guarantee", value: "99.9%", icon: Zap },
    { label: "Data Breaches", value: "0", icon: Shield },
    { label: "Supported Wallets", value: "4+", icon: Cpu },
  ]

  useEffect(() => {
    setIsVisible(true)
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const CurrentFeatureIcon = features[currentFeature].icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="max-w-6xl w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Main Content */}
            <div
              className={`space-y-8 transition-all duration-1000 ${
                isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"
              }`}
            >
              {/* Hero Section */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <Badge
                    variant="secondary"
                    className="bg-purple-600/20 text-purple-300 px-4 py-2 text-sm font-medium animate-bounce"
                  >
                    🚀 Built on Solana • Powered by Arweave
                  </Badge>
                  <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight">
                    <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                      SolChat
                    </span>
                  </h1>
                  <p className="text-xl lg:text-2xl text-gray-300 leading-relaxed">
                    The future of secure messaging is here. Decentralized, encrypted, and unstoppable.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {["End-to-End Encrypted", "Decentralized", "Solana Native", "Group Messaging"].map((tag, index) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10 transition-all duration-200 hover:scale-105"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* CTA Section */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <p className="text-lg text-gray-300">Connect your Solana wallet to start secure messaging</p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-blue-600 hover:!from-purple-700 hover:!to-blue-700 !rounded-xl !font-semibold !px-8 !py-4 !text-lg !transition-all !duration-300 hover:!scale-105 !shadow-2xl" />
                    {connecting && (
                      <div className="flex items-center gap-2 text-sm text-gray-400 animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connecting to wallet...
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {stats.map((stat, index) => {
                    const StatIcon = stat.icon
                    return (
                      <Card
                        key={stat.label}
                        className="p-4 bg-black/20 backdrop-blur-md border-white/10 hover:bg-black/30 transition-all duration-300 hover:scale-105 group"
                        style={{ animationDelay: `${index * 150}ms` }}
                      >
                        <div className="text-center space-y-2">
                          <StatIcon className="w-6 h-6 mx-auto text-purple-400 group-hover:text-purple-300 transition-colors" />
                          <div className="text-2xl font-bold text-white">{stat.value}</div>
                          <div className="text-xs text-gray-400">{stat.label}</div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>

              {/* Supported Wallets */}
              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-300">Supported Wallets:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { name: "Phantom", color: "bg-purple-500" },
                    { name: "Solflare", color: "bg-blue-500" },
                    { name: "Torus", color: "bg-green-500" },
                    { name: "Ledger", color: "bg-orange-500" },
                  ].map((wallet, index) => (
                    <div
                      key={wallet.name}
                      className="flex items-center gap-2 p-3 bg-black/20 rounded-lg border border-white/10 hover:bg-black/30 transition-all duration-200 hover:scale-105"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className={`w-3 h-3 ${wallet.color} rounded-full animate-pulse`}></div>
                      <span className="text-sm text-gray-300">{wallet.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Feature Showcase */}
            <div
              className={`space-y-8 transition-all duration-1000 delay-300 ${
                isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"
              }`}
            >
              {/* Main Feature Card */}
              <Card className="p-8 bg-black/20 backdrop-blur-md border-white/10 hover:bg-black/25 transition-all duration-500 hover:scale-105 group">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-16 h-16 bg-gradient-to-r ${features[currentFeature].color} rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110`}
                    >
                      <CurrentFeatureIcon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{features[currentFeature].title}</h3>
                      <p className="text-gray-300">{features[currentFeature].description}</p>
                    </div>
                  </div>

                  {/* Feature Progress */}
                  <div className="flex gap-2">
                    {features.map((_, index) => (
                      <div
                        key={index}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          index === currentFeature ? "bg-purple-500" : "bg-white/20"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </Card>

              {/* Feature Grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    icon: MessageCircle,
                    title: "Direct Messages",
                    desc: "Private 1-on-1 conversations",
                    color: "from-blue-500 to-cyan-500",
                  },
                  {
                    icon: Users,
                    title: "Group Chats",
                    desc: "Up to 8 participants",
                    color: "from-green-500 to-emerald-500",
                  },
                  {
                    icon: Key,
                    title: "Wallet Auth",
                    desc: "Cryptographic identity",
                    color: "from-purple-500 to-pink-500",
                  },
                  {
                    icon: Database,
                    title: "Permanent Storage",
                    desc: "Arweave integration",
                    color: "from-orange-500 to-red-500",
                  },
                ].map((feature, index) => {
                  const FeatureIcon = feature.icon
                  return (
                    <Card
                      key={feature.title}
                      className="p-6 bg-black/20 backdrop-blur-md border-white/10 hover:bg-black/30 transition-all duration-300 hover:scale-105 group"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="space-y-3">
                        <div
                          className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                        >
                          <FeatureIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">{feature.title}</h4>
                          <p className="text-sm text-gray-400">{feature.desc}</p>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>

              {/* Security Badge */}
              <Card className="p-6 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-500/30 backdrop-blur-md hover:bg-gradient-to-r hover:from-green-600/30 hover:to-emerald-600/30 transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-300">Security Verified</h4>
                    <p className="text-sm text-green-400">Audited smart contracts • Open source</p>
                  </div>
                  <CheckCircle className="w-6 h-6 text-green-400 ml-auto" />
                </div>
              </Card>
            </div>
          </div>

          {/* Bottom Section - Why Choose SolChat */}
          <div
            className={`mt-20 text-center space-y-12 transition-all duration-1000 delay-500 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-white">Why Choose SolChat?</h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Experience the next generation of messaging with uncompromising security and true decentralization
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Lock,
                  title: "Unbreakable Security",
                  description:
                    "Your messages are encrypted with military-grade cryptography before leaving your device",
                  benefits: ["x25519 key exchange", "XChaCha20-Poly1305 encryption", "Perfect forward secrecy"],
                },
                {
                  icon: Globe,
                  title: "True Decentralization",
                  description: "No servers, no single point of failure. Your data lives on the blockchain forever",
                  benefits: ["Arweave permanent storage", "Solana blockchain", "Peer-to-peer messaging"],
                },
                {
                  icon: Zap,
                  title: "Lightning Fast",
                  description: "Built on Solana for instant message delivery with minimal transaction costs",
                  benefits: ["Sub-second finality", "Low transaction fees", "High throughput"],
                },
              ].map((feature, index) => {
                const FeatureIcon = feature.icon
                return (
                  <Card
                    key={feature.title}
                    className="p-8 bg-black/20 backdrop-blur-md border-white/10 hover:bg-black/30 transition-all duration-300 hover:scale-105 group text-left"
                    style={{ animationDelay: `${index * 200}ms` }}
                  >
                    <div className="space-y-6">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <FeatureIcon className="w-8 h-8 text-white" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                        <p className="text-gray-300">{feature.description}</p>
                        <ul className="space-y-2">
                          {feature.benefits.map((benefit, benefitIndex) => (
                            <li key={benefitIndex} className="flex items-center gap-2 text-sm text-gray-400">
                              <CheckCircle className="w-4 h-4 text-green-400" />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>

            {/* Final CTA */}
            <div className="space-y-6 pt-12">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-white">Ready to experience the future of messaging?</h3>
                <p className="text-gray-300">
                  Join thousands of users who trust SolChat for their secure communications
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-blue-600 hover:!from-purple-700 hover:!to-blue-700 !rounded-xl !font-semibold !px-8 !py-4 !text-lg !transition-all !duration-300 hover:!scale-105 !shadow-2xl" />
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span>Trusted by 10,000+ users</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
