import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

export const get = query(async ({ db }, { id }: { id: string }) => {
  return await db.get(id)
})

export const create = mutation(
  async (
    { db },
    {
      customerId,
      products,
      totalAmount,
      status,
    }: {
      customerId: string
      products: { productId: string; quantity: number }[]
      totalAmount: number
      status: string
    }
  ) => {
    const orderId = await db.insert('orders', {
      customerId,
      products,
      totalAmount,
      status,
    })
    return orderId
  }
)