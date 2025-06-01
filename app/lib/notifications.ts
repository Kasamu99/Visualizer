export class NotificationService {
  private static instance: NotificationService
  private notificationPermission: NotificationPermission = "default"

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  async initialize(): Promise<boolean> {
    try {
      // Check if notifications are supported
      if (!("Notification" in window)) {
        console.warn("Notifications not supported")
        return false
      }

      this.notificationPermission = Notification.permission
      console.log("Notifications initialized successfully")
      return true
    } catch (error) {
      console.error("Failed to initialize notifications:", error)
      return false
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      if (!("Notification" in window)) {
        return false
      }

      if (this.notificationPermission === "default") {
        this.notificationPermission = await Notification.requestPermission()
      }

      return this.notificationPermission === "granted"
    } catch (error) {
      console.error("Failed to request notification permission:", error)
      return false
    }
  }

  async subscribeToPush(): Promise<boolean> {
    // For basic notifications, we don't need push subscriptions
    // This would be used for server-sent push notifications
    return this.notificationPermission === "granted"
  }

  async showLocalNotification(
    title: string,
    options: {
      body?: string
      icon?: string
      badge?: string
      tag?: string
      data?: any
      requireInteraction?: boolean
    } = {},
  ): Promise<void> {
    try {
      if (this.notificationPermission !== "granted") {
        console.warn("Notification permission not granted")
        return
      }

      // Check if the page is visible
      if (document.visibilityState === "visible") {
        // Don't show notification if user is actively using the app
        return
      }

      const notification = new Notification(title, {
        body: options.body,
        icon: options.icon || "/icon-192.png",
        badge: options.badge || "/icon-192.png",
        tag: options.tag || "solchat-message",
        data: options.data,
        requireInteraction: options.requireInteraction || false,
        silent: false,
      })

      notification.onclick = () => {
        window.focus()
        notification.close()

        // Handle notification click
        if (options.data?.action) {
          this.handleNotificationAction(options.data.action, options.data)
        }
      }

      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close()
      }, 10000)
    } catch (error) {
      console.error("Failed to show local notification:", error)
    }
  }

  private handleNotificationAction(action: string, data: any): void {
    switch (action) {
      case "reply":
        // Focus on message input
        const messageInput = document.querySelector('textarea[placeholder*="message"]') as HTMLTextAreaElement
        if (messageInput) {
          messageInput.focus()
        }
        break
      case "view":
        // Scroll to message or contact
        if (data.contactAddress) {
          // Trigger contact selection
          window.dispatchEvent(
            new CustomEvent("selectContact", {
              detail: { address: data.contactAddress },
            }),
          )
        }
        break
    }
  }

  async notifyNewMessage(from: string, content: string, contactNickname?: string): Promise<void> {
    const title = `New message from ${contactNickname || from.slice(0, 8) + "..."}`
    const body = content.length > 100 ? content.slice(0, 100) + "..." : content

    await this.showLocalNotification(title, {
      body,
      tag: `message-${from}`,
      requireInteraction: true,
      data: {
        action: "view",
        contactAddress: from,
        messageContent: content,
      },
    })
  }

  async notifyNewGroupMessage(groupName: string, from: string, content: string): Promise<void> {
    const title = `New message in ${groupName}`
    const body = `${from.slice(0, 8)}...: ${content.length > 80 ? content.slice(0, 80) + "..." : content}`

    await this.showLocalNotification(title, {
      body,
      tag: `group-message-${groupName}`,
      requireInteraction: true,
      data: {
        action: "view",
        groupName,
      },
    })
  }

  getSubscription(): null {
    // Return null since we're not using push subscriptions
    return null
  }

  async unsubscribe(): Promise<boolean> {
    // For basic notifications, we just return true
    return true
  }

  getPermissionStatus(): NotificationPermission {
    return this.notificationPermission
  }

  isSupported(): boolean {
    return "Notification" in window
  }
}
