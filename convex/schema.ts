import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  users: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    role: v.string(), // 'admin', 'vendor', or 'customer'
    name: v.string(),
    createdAt: v.number(),
  }).index('by_email', ['email']),
  products: defineTable({
    name: v.string(),
    description: v.string(),
    price: v.number(),
    vendorId: v.id('users'),
    imageUrl: v.string(),
    category: v.string(),
    stock: v.number(),
  }),
  orders: defineTable({
    customerId: v.id('users'),
    products: v.array(
      v.object({
        productId: v.id('products'),
        quantity: v.number(),
      })
    ),
    totalAmount: v.number(),
    status: v.string(),
  }),
  vendors: defineTable({
    userId: v.id('users'),
    description: v.string(),
    rating: v.optional(v.number()),
  }),
})