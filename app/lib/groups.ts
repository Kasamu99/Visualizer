export interface Group {
  id: string
  name: string
  description?: string
  members: string[]
  admins: string[]
  createdBy: string
  createdAt: number
  avatar?: string
  lastActivity: number
}

export interface GroupMessage {
  id: string
  groupId: string
  from: string
  content: string
  encryptedContent?: string
  timestamp: number
  signature?: number[]
  arweaveId: string
  messageType: "text" | "system"
  replyTo?: string
}

export class GroupService {
  private getGroupsKey(walletAddress: string): string {
    return `groups_${walletAddress}`
  }

  private getGroupMessagesKey(walletAddress: string): string {
    return `group_messages_${walletAddress}`
  }

  async getGroups(walletAddress: string): Promise<Group[]> {
    try {
      const stored = localStorage.getItem(this.getGroupsKey(walletAddress))
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error("Failed to load groups:", error)
      return []
    }
  }

  async createGroup(walletAddress: string, name: string, description: string, members: string[]): Promise<string> {
    try {
      // Validate group constraints
      if (members.length < 2) {
        throw new Error("Group must have at least 2 additional members")
      }
      if (members.length > 7) {
        throw new Error("Group cannot have more than 7 additional members")
      }

      const groups = await this.getGroups(walletAddress)
      const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const group: Group = {
        id: groupId,
        name: name.trim(),
        description: description.trim() || undefined,
        members: [walletAddress, ...members],
        admins: [walletAddress], // Creator is admin
        createdBy: walletAddress,
        createdAt: Date.now(),
        lastActivity: Date.now(),
      }

      groups.push(group)
      localStorage.setItem(this.getGroupsKey(walletAddress), JSON.stringify(groups))

      // Create system message for group creation
      await this.addSystemMessage(
        walletAddress,
        groupId,
        `Group "${name}" was created by ${walletAddress.slice(0, 8)}...`,
      )

      return groupId
    } catch (error) {
      console.error("Failed to create group:", error)
      throw error
    }
  }

  async addMemberToGroup(walletAddress: string, groupId: string, memberAddress: string): Promise<void> {
    try {
      const groups = await this.getGroups(walletAddress)
      const groupIndex = groups.findIndex((g) => g.id === groupId)

      if (groupIndex === -1) {
        throw new Error("Group not found")
      }

      const group = groups[groupIndex]

      // Check if user is admin
      if (!group.admins.includes(walletAddress)) {
        throw new Error("Only admins can add members")
      }

      // Check if member already exists
      if (group.members.includes(memberAddress)) {
        throw new Error("Member already in group")
      }

      // Check group size limit
      if (group.members.length >= 8) {
        throw new Error("Group is at maximum capacity (8 members)")
      }

      group.members.push(memberAddress)
      group.lastActivity = Date.now()
      groups[groupIndex] = group

      localStorage.setItem(this.getGroupsKey(walletAddress), JSON.stringify(groups))

      // Create system message
      await this.addSystemMessage(walletAddress, groupId, `${memberAddress.slice(0, 8)}... was added to the group`)
    } catch (error) {
      console.error("Failed to add member to group:", error)
      throw error
    }
  }

  async removeMemberFromGroup(walletAddress: string, groupId: string, memberAddress: string): Promise<void> {
    try {
      const groups = await this.getGroups(walletAddress)
      const groupIndex = groups.findIndex((g) => g.id === groupId)

      if (groupIndex === -1) {
        throw new Error("Group not found")
      }

      const group = groups[groupIndex]

      // Check if user is admin or removing themselves
      if (!group.admins.includes(walletAddress) && memberAddress !== walletAddress) {
        throw new Error("Only admins can remove members")
      }

      group.members = group.members.filter((m) => m !== memberAddress)
      group.admins = group.admins.filter((a) => a !== memberAddress)
      group.lastActivity = Date.now()
      groups[groupIndex] = group

      localStorage.setItem(this.getGroupsKey(walletAddress), JSON.stringify(groups))

      // Create system message
      const action = memberAddress === walletAddress ? "left" : "was removed from"
      await this.addSystemMessage(walletAddress, groupId, `${memberAddress.slice(0, 8)}... ${action} the group`)
    } catch (error) {
      console.error("Failed to remove member from group:", error)
      throw error
    }
  }

  async getGroupMessages(walletAddress: string): Promise<GroupMessage[]> {
    try {
      const stored = localStorage.getItem(this.getGroupMessagesKey(walletAddress))
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error("Failed to load group messages:", error)
      return []
    }
  }

  async saveGroupMessage(walletAddress: string, message: GroupMessage): Promise<void> {
    try {
      const messages = await this.getGroupMessages(walletAddress)
      messages.push(message)
      localStorage.setItem(this.getGroupMessagesKey(walletAddress), JSON.stringify(messages))

      // Update group last activity
      await this.updateGroupActivity(walletAddress, message.groupId)
    } catch (error) {
      console.error("Failed to save group message:", error)
      throw error
    }
  }

  async getMessagesForGroup(walletAddress: string, groupId: string): Promise<GroupMessage[]> {
    try {
      const allMessages = await this.getGroupMessages(walletAddress)
      return allMessages.filter((m) => m.groupId === groupId).sort((a, b) => a.timestamp - b.timestamp)
    } catch (error) {
      console.error("Failed to get messages for group:", error)
      return []
    }
  }

  private async addSystemMessage(walletAddress: string, groupId: string, content: string): Promise<void> {
    const systemMessage: GroupMessage = {
      id: `system_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      groupId,
      from: "system",
      content,
      timestamp: Date.now(),
      arweaveId: "",
      messageType: "system",
    }

    await this.saveGroupMessage(walletAddress, systemMessage)
  }

  private async updateGroupActivity(walletAddress: string, groupId: string): Promise<void> {
    try {
      const groups = await this.getGroups(walletAddress)
      const groupIndex = groups.findIndex((g) => g.id === groupId)

      if (groupIndex !== -1) {
        groups[groupIndex].lastActivity = Date.now()
        localStorage.setItem(this.getGroupsKey(walletAddress), JSON.stringify(groups))
      }
    } catch (error) {
      console.error("Failed to update group activity:", error)
    }
  }

  async updateGroup(walletAddress: string, group: Group): Promise<void> {
    try {
      const groups = await this.getGroups(walletAddress)
      const index = groups.findIndex((g) => g.id === group.id)

      if (index >= 0) {
        groups[index] = group
        localStorage.setItem(this.getGroupsKey(walletAddress), JSON.stringify(groups))
      }
    } catch (error) {
      console.error("Failed to update group:", error)
      throw error
    }
  }

  async deleteGroup(walletAddress: string, groupId: string): Promise<void> {
    try {
      const groups = await this.getGroups(walletAddress)
      const filtered = groups.filter((g) => g.id !== groupId)
      localStorage.setItem(this.getGroupsKey(walletAddress), JSON.stringify(filtered))

      // Also remove group messages
      const messages = await this.getGroupMessages(walletAddress)
      const filteredMessages = messages.filter((m) => m.groupId !== groupId)
      localStorage.setItem(this.getGroupMessagesKey(walletAddress), JSON.stringify(filteredMessages))
    } catch (error) {
      console.error("Failed to delete group:", error)
      throw error
    }
  }
}
