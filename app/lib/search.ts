import type { Message, GroupMessage } from "./messages"

export class SearchService {
  async searchMessages(
    query: string,
    messages: Message[],
    groupMessages: GroupMessage[],
  ): Promise<(Message | GroupMessage)[]> {
    const lowercaseQuery = query.toLowerCase()

    const messageResults = messages.filter((message) => message.content.toLowerCase().includes(lowercaseQuery))

    const groupMessageResults = groupMessages.filter((message) =>
      message.content.toLowerCase().includes(lowercaseQuery),
    )

    // Combine and sort by timestamp (newest first)
    const allResults = [...messageResults, ...groupMessageResults]
    return allResults.sort((a, b) => b.timestamp - a.timestamp)
  }
}
