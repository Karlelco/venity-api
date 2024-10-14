import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

export const list = query(async ({ db }) => {
  return await db.query('products').collect()
})

export const get = query(async ({ db }, { id }: { id: string }) => {
  return await db.get(id)
})

export const create = mutation(
  async (
    { db },
    {
      name,
      description,
      price,
      vendorId,
      imageUrl,
      category,
      stock,
    }: {
      name: string
      description: string
      price: number
      vendorId: string
      imageUrl: string
      category: string
      stock: number
    }
  ) => {
    const productId = await db.insert('products', {
      name,
      description,
      price,
      vendorId,
      imageUrl,
      category,
      stock,
    })
    return productId
  }
)