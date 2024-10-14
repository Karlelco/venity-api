import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { cache } from 'hono/cache'
import { ConvexHttpClient } from 'convex/browser'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { SignJWT, jwtVerify } from 'jose'
import { api } from '../convex/_generated/api'

const convex = new ConvexHttpClient('https://whimsical-rooster-789.convex.cloud')

const app = new Hono()

app.use('*', cors())
app.use('/products', cache({ cacheName: 'venity-api', cacheControl: 'max-age=3600' }))

const JWT_SECRET = new TextEncoder().encode('collodev')

async function generateToken(payload: any): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(JWT_SECRET)
}

async function verifyToken(token: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch (error) {
    throw new Error('Invalid token')
  }
}

async function authMiddleware(c: any, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.split(' ')[1]
  try {
    const payload = await verifyToken(token)
    c.set('user', payload)
    await next()
  } catch (error) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
}

// Health check
app.get('/', (c) => c.text('Venity API is running'))

// Auth routes
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string(),
  role: z.enum(['admin', 'vendor', 'customer']),
})

app.post('/auth/register', zValidator('json', registerSchema), async (c) => {
  const body = c.req.valid('json')
  try {
    const user = await convex.mutation(api.users.create, body)
    const token = await generateToken(user)
    return c.json({ token, user }, 201)
  } catch (error) {
    console.error('Error registering user:', error)
    return c.json({ error: 'Failed to register user' }, 500)
  }
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

app.post('/auth/login', zValidator('json', loginSchema), async (c) => {
  const body = c.req.valid('json')
  try {
    const user = await convex.query(api.users.login, body)
    const token = await generateToken(user)
    return c.json({ token, user })
  } catch (error) {
    console.error('Error logging in:', error)
    return c.json({ error: 'Invalid credentials' }, 401)
  }
})

// Protected routes
app.use('/api/*', authMiddleware)

// User routes
app.get('/api/users', async (c) => {
  const role = c.req.query('role')
  try {
    const users = await convex.query(api.users.listUsers, { role })
    return c.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return c.json({ error: 'Failed to fetch users' }, 500)
  }
})

app.get('/api/users/:id', async (c) => {
  const id = c.req.param('id')
  try {
    const user = await convex.query(api.users.getUser, { userId: id })
    return c.json(user)
  } catch (error) {
    console.error(`Error fetching user ${id}:`, error)
    return c.json({ error: 'Failed to fetch user' }, 500)
  }
})

const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'vendor', 'customer']).optional(),
})

app.patch('/api/users/:id', zValidator('json', updateUserSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')
  try {
    const result = await convex.mutation(api.users.updateUser, { userId: id, ...body })
    return c.json(result)
  } catch (error) {
    console.error(`Error updating user ${id}:`, error)
    return c.json({ error: 'Failed to update user' }, 500)
  }
})

app.delete('/api/users/:id', async (c) => {
  const id = c.req.param('id')
  try {
    const result = await convex.mutation(api.users.deleteUser, { userId: id })
    return c.json(result)
  } catch (error) {
    console.error(`Error deleting user ${id}:`, error)
    return c.json({ error: 'Failed to delete user' }, 500)
  }
})

// Product routes
app.get('/api/products', async (c) => {
  try {
    const products = await convex.query(api.products.list)
    return c.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return c.json({ error: 'Failed to fetch products' }, 500)
  }
})

app.get('/api/products/:id', async (c) => {
  const id = c.req.param('id')
  try {
    const product = await convex.query(api.products.get, { id })
    if (!product) {
      return c.json({ error: 'Product not found' }, 404)
    }
    return c.json(product)
  } catch (error) {
    console.error(`Error fetching product ${id}:`, error)
    return c.json({ error: 'Failed to fetch product' }, 500)
  }
})

const createProductSchema = z.object({
  name: z.string(),
  description: z.string(),
  price: z.number().positive(),
  vendorId: z.string(),
  imageUrl: z.string().url(),
  category: z.string(),
  stock: z.number().int().nonnegative(),
})

app.post('/api/products', zValidator('json', createProductSchema), async (c) => {
  const body = c.req.valid('json')
  try {
    const product = await convex.mutation(api.products.create, body)
    return c.json(product, 201)
  } catch (error) {
    console.error('Error creating product:', error)
    return c.json({ error: 'Failed to create product' }, 500)
  }
})

// Order routes
const createOrderSchema = z.object({
  customerId: z.string(),
  products: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
  })),
  totalAmount: z.number().positive(),
  status: z.string(),
})

app.post('/api/orders', zValidator('json', createOrderSchema), async (c) => {
  const body = c.req.valid('json')
  try {
    const order = await convex.mutation(api.orders.create, body)
    return c.json(order, 201)
  } catch (error) {
    console.error('Error creating order:', error)
    return c.json({ error: 'Failed to create order' }, 500)
  }
})

app.get('/api/orders/:id', async (c) => {
  const id = c.req.param('id')
  try {
    const order = await convex.query(api.orders.get, { id })
    if (!order) {
      return c.json({ error: 'Order not found' }, 404)
    }
    return c.json(order)
  } catch (error) {
    console.error(`Error fetching order ${id}:`, error)
    return c.json({ error: 'Failed to fetch order' }, 500)
  }
})

// Vendor routes
app.get('/api/vendors', async (c) => {
  try {
    const vendors = await convex.query(api.vendors.list)
    return c.json(vendors)
  } catch (error) {
    console.error('Error fetching vendors:', error)
    return c.json({ error: 'Failed to fetch vendors' }, 500)
  }
})

app.get('/api/vendors/:id', async (c) => {
  const id = c.req.param('id')
  try {
    const vendor = await convex.query(api.vendors.get, { id })
    if (!vendor) {
      return c.json({ error: 'Vendor not found' }, 404)
    }
    return c.json(vendor)
  } catch (error) {
    console.error(`Error fetching vendor ${id}:`, error)
    return c.json({ error: 'Failed to fetch vendor' }, 500)
  }
})

const createVendorSchema = z.object({
  userId: z.string(),
  description: z.string(),
  rating: z.number().min(0).max(5).optional(),
})

app.post('/api/vendors', zValidator('json', createVendorSchema), async (c) => {
  const body = c.req.valid('json')
  try {
    const vendor = await convex.mutation(api.vendors.create, body)
    return c.json(vendor, 201)
  } catch (error) {
    console.error('Error creating vendor:', error)
    return c.json({ error: 'Failed to create vendor' }, 500)
  }
})

export default app