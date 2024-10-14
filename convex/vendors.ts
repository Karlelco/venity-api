import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

export const list = query(async ({ db }) => {
  return await db.query('vendors').collect()
})

export const get = query(async ({ db }, { id }: { id: string }) => {
  return await db.get(id)
})

export const create = mutation(
  async (
    { db },
    {
      userId,
      description,
      rating,
    }: {
      userId: string
      description: string
      rating?: number
    }
  ) => {
    const vendorId = await db.insert('vendors', {
      userId,
      description,
      rating,
    })
    return vendorId
  }
)