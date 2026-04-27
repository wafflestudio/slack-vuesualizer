import { mongo } from '~/server/utils/mongo'
import normalizeMessages from '~/server/utils/normalizeMessages'
import type { Message } from '~/types/Message'

export default defineEventHandler(async (event) => {
  const channel = decodeURIComponent(event.context.params!.name)
  const { page, size } = getQuery(event)
  const pageValue = Number(Array.isArray(page) ? page[0] : page ?? 0)
  const sizeValue = Number(Array.isArray(size) ? size[0] : size ?? 100)

  if (!Number.isInteger(pageValue) || pageValue < 0)
    throw createError({ statusCode: 400, statusMessage: 'Invalid page' })

  if (!Number.isInteger(sizeValue) || sizeValue <= 0 || sizeValue > 200)
    throw createError({ statusCode: 400, statusMessage: 'Invalid size' })

  const db = await mongo(event.context.mongouuid)
  const collection = db.collection<Message>('messages')
  const filter = { channel }
  const total = await collection.countDocuments(filter)

  const endExclusive = total - pageValue * sizeValue
  const start = Math.max(endExclusive - sizeValue, 0)
  const limit = Math.max(endExclusive - start, 0)

  if (limit <= 0) {
    return {
      messages: [],
      hasMore: false,
      total,
    }
  }

  const messages = await collection
    .find(filter)
    .sort({ ts: 1 })
    .skip(start)
    .limit(limit)
    .toArray()

  return {
    messages: normalizeMessages(messages),
    hasMore: start > 0,
    total,
  }
})
