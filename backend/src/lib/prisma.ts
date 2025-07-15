import { PrismaClient } from '@prisma/client'

// Initialize Prisma Client for backend database operations with error handling
let prisma: PrismaClient

try {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
  })
  console.log('✅ Backend Prisma Client initialized successfully')
} catch (error) {
  console.error('❌ Backend Prisma Client initialization failed:', error)
  // Create a mock Prisma client for fallback
  prisma = {} as PrismaClient
  throw error
}

export { prisma } 