import type { ApiMessage, Message } from '~/types/Message'

export default function (messages: ApiMessage[]): Message[] {
  const cpy: ApiMessage[] = []
  const seen = new Set<string>()

  messages.forEach((m) => {
    if (seen.has(m.ts)) {
      // this message is a reply, we already added it
      return
    }

    cpy.push(m)
    seen.add(m.ts)

    // replies is empty or undefined - we can just leave it as is, replies will be cleaned up later
    if (!m.replies) {
      return
    }

    // for each reply, move it to the correct position in cpy
    m.replies.forEach((reply, i) => {
      const replyMessage = messages.find(
        m => m.ts === reply.ts && m.user === reply.user,
      )
      if (!replyMessage)
        return

      const existingReplyIndex = cpy.findIndex(
        existing => existing.ts === reply.ts && existing.user === reply.user,
      )

      if (existingReplyIndex >= 0) {
        cpy[existingReplyIndex] = {
          ...cpy[existingReplyIndex],
          reply: true,
          last_reply: i === m.replies!.length - 1,
        } as Message
        seen.add(reply.ts)
        return
      }

      // first remove from cpy
      cpy.push({
        ...replyMessage,
        reply: true,
        last_reply: i === m.replies!.length - 1,
      } as Message)
      seen.add(reply.ts)
    })
  })
  return cpy
}
