import type { Filter } from 'mongodb'
import { mongo } from '~/server/utils/mongo'
import type { Message } from '~/types/Message'

export default defineEventHandler(async (event) => {
  const { query, channel, regex, sender, fromDate, toDate, sort, page, size } = getQuery(event)

  const queryValue = Array.isArray(query) ? query[0] : query
  const channelValue = Array.isArray(channel) ? channel[0] : channel
  const regexValue = Array.isArray(regex) ? regex[0] : regex
  const senderValue = Array.isArray(sender) ? sender[0] : sender
  const fromDateValue = Array.isArray(fromDate) ? fromDate[0] : fromDate
  const toDateValue = Array.isArray(toDate) ? toDate[0] : toDate
  const sortValue = Array.isArray(sort) ? sort[0] : sort ?? 'newest'
  const pageValue = Number(Array.isArray(page) ? page[0] : page ?? 0)
  const sizeValue = Number(Array.isArray(size) ? size[0] : size ?? 30)

  if (!queryValue)
    throw createError({ statusCode: 400, statusMessage: 'Missing query' })

  if (!Number.isInteger(pageValue) || pageValue < 0)
    throw createError({ statusCode: 400, statusMessage: 'Invalid page' })

  if (!Number.isInteger(sizeValue) || sizeValue <= 0 || sizeValue > 100)
    throw createError({ statusCode: 400, statusMessage: 'Invalid size' })

  const db = await mongo(event.context.mongouuid)
  const searchByRegex = ['1', 'true', 'yes'].includes(
    (regexValue ?? '').toLowerCase(),
  )

  const filter: Filter<Message> = {
    $and: [],
  }

  if (searchByRegex) {
    try {
      filter.$and.push({ text: { $regex: new RegExp(queryValue.toString(), 'i') } })
    }
    catch {
      throw createError({ statusCode: 400, statusMessage: 'Invalid regex pattern' })
    }
  }
  else {
    filter.$and.push({ $text: { $search: queryValue.toString() } })
  }

  if (channelValue)
    filter.$and.push({ channel: decodeURIComponent(channelValue.toString()) })

  if (senderValue)
    filter.$and.push({ user: senderValue.toString() })

  const from = fromDateValue ? new Date(`${fromDateValue.toString()}T00:00:00.000Z`) : null
  const to = toDateValue ? new Date(`${toDateValue.toString()}T23:59:59.999Z`) : null

  if (from && Number.isNaN(from.getTime()))
    throw createError({ statusCode: 400, statusMessage: 'Invalid fromDate' })

  if (to && Number.isNaN(to.getTime()))
    throw createError({ statusCode: 400, statusMessage: 'Invalid toDate' })

  if (from && to && from.getTime() > to.getTime()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'fromDate must be before or equal to toDate',
    })
  }

  if (from) {
    filter.$and.push({
      $expr: { $gte: [{ $toDouble: '$ts' }, from.getTime() / 1000] },
    })
  }

  if (to) {
    filter.$and.push({
      $expr: { $lte: [{ $toDouble: '$ts' }, to.getTime() / 1000] },
    })
  }

  const collection = db.collection<Message>('messages')
  const cursor = collection.find(filter).skip(pageValue * sizeValue).limit(sizeValue)

  // Determine sort order based on sort parameter
  let sortSpec: any = { ts: -1 } // Default: newest first
  if (sortValue === 'oldest')
    sortSpec = { ts: 1 } // Oldest first
  else if (sortValue === 'atoz')
    sortSpec = { text: 1 } // A to Z
  else if (sortValue === 'ztoa')
    sortSpec = { text: -1 } // Z to A

  if (searchByRegex) {
    return await cursor
      .sort(sortSpec)
      .toArray()
  }

  const messages = await cursor
    .project({ score: { $meta: 'textScore' } })
    .sort(sortValue === 'newest' || sortValue === 'oldest' ? sortSpec : { score: { $meta: 'textScore' } })
    .toArray()

  return messages
})
