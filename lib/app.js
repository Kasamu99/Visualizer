import { settingsStore } from "./stores.js"

export async function initializeApp() {
  // Load settings from localStorage
  const savedSettings = localStorage.getItem("decentrachat-settings")
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings)
      settingsStore.set(settings)
    } catch (error) {
      console.error("Failed to load settings:", error)
    }
  }

  // Initialize other app components
  console.log("DecentraChat initialized")
}
