"use client"

import { WalletProvider } from "./components/WalletProvider"
import { MainApp } from "./components/MainApp"
import { MessageTest } from "./components/MessageTest"
import { Toaster } from "@/components/ui/toaster"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function Home() {
  const [showTest, setShowTest] = useState(false)

  return (
    <WalletProvider>
      <div className="min-h-screen">
        {showTest ? (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-white">Message System Test</h1>
              <Button onClick={() => setShowTest(false)} variant="outline">
                Back to App
              </Button>
            </div>
            <MessageTest />
          </div>
        ) : (
          <>
            <MainApp />
            <div className="fixed bottom-4 right-4">
              <Button
                onClick={() => setShowTest(true)}
                variant="outline"
                size="sm"
                className="bg-gray-800 text-white border-gray-600"
              >
                Test Messages
              </Button>
            </div>
          </>
        )}
      </div>
      <Toaster />
    </WalletProvider>
  )
}
