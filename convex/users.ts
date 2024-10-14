import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import bcrypt from 'bcryptjs'

export const create = mutation(
  async (
    { db },
    {
      email,
      password,
      name,
      role,
    }: {
      email: string
      password: string
      name: string
      role: 'admin' | 'vendor' | 'customer'
    }
  ) => {
    const existingUser = await db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first()

    if (existingUser) {
      throw new Error('User already exists')
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const userId = await db.insert('users', {
      email,
      passwordHash,
      name,
      role,
      createdAt: Date.now(),
    })

    return { userId, role }
  }
)

export const login = query(
  async ({ db }, { email, password }: { email: string; password: string }) => {
    const user = await db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first()

    if (!user) {
      throw new Error('User not found')
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash)

    if (!isValidPassword) {
      throw new Error('Invalid password')
    }

    return { userId: user._id, role: user.role }
  }
)

export const getUser = query(async ({ db }, { userId }: { userId: string }) => {
  const user = await db.get(userId)
  if (!user) {
    throw new Error('User not found')
  }
  const { passwordHash, ...userWithoutPassword } = user
  return userWithoutPassword
})

export const listUsers = query(async ({ db }, { role }: { role?: string }) => {
  let users = await db.query('users').collect()
  if (role) {
    users = users.filter((user) => user.role === role)
  }
  return users.map(({ passwordHash, ...user }) => user)
})

export const updateUser = mutation(
  async (
    { db },
    {
      userId,
      name,
      email,
      role,
    }: {
      userId: string
      name?: string
      email?: string
      role?: 'admin' | 'vendor' | 'customer'
    }
  ) => {
    const user = await db.get(userId)
    if (!user) {
      throw new Error('User not found')
    }

    const updates: Partial<typeof user> = {}
    if (name) updates.name = name
    if (email) updates.email = email
    if (role) updates.role = role

    await db.patch(userId, updates)
    return { success: true }
  }
)

export const deleteUser = mutation(async ({ db }, { userId }: { userId: string }) => {
  const user = await db.get(userId)
  if (!user) {
    throw new Error('User not found')
  }

  await db.delete(userId)
  return { success: true }
})