"use client"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useWallet } from "@solana/wallet-adapter-react"
import { ContactService } from "@/app/lib/contacts"

export function DebugSync() {
  const { publicKey } = useWallet()
  const { toast } = useToast()

  return (
    <div className="space-y-4 p-4 bg-gray-800 rounded-lg">
      <h4 className="text-lg font-semibold text-white">Debug</h4>

      {/* Contact Debug Section */}
      <div className="space-y-4 p-4 bg-gray-800 rounded-lg">
        <h4 className="text-lg font-semibold text-white">Contact Debug</h4>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={async () => {
              if (!publicKey) {
                console.error("No wallet connected")
                return
              }

              try {
                const contactService = new ContactService()
                const contacts = await contactService.getContacts(publicKey.toString())
                console.log("📋 Current contacts:", contacts)
                toast({
                  title: "📋 Contacts Loaded",
                  description: `Found ${contacts.length} contacts`,
                })
              } catch (error) {
                console.error("Failed to load contacts:", error)
                toast({
                  title: "❌ Load Failed",
                  description: "Failed to load contacts",
                  variant: "destructive",
                })
              }
            }}
            variant="outline"
            size="sm"
          >
            Load Contacts
          </Button>

          <Button
            onClick={async () => {
              if (!publicKey) {
                console.error("No wallet connected")
                return
              }

              try {
                const testContact = {
                  address: "11111111111111111111111111111112", // System program address
                  nickname: "Test Contact",
                  addedAt: Date.now(),
                  verified: false,
                }

                const contactService = new ContactService()
                await contactService.addContact(publicKey.toString(), testContact)
                console.log("✅ Test contact added")
                toast({
                  title: "✅ Test Contact Added",
                  description: "Test contact saved successfully",
                })
              } catch (error) {
                console.error("Failed to add test contact:", error)
                toast({
                  title: "❌ Test Failed",
                  description: "Failed to add test contact",
                  variant: "destructive",
                })
              }
            }}
            variant="outline"
            size="sm"
          >
            Add Test Contact
          </Button>
        </div>
      </div>
    </div>
  )
}
