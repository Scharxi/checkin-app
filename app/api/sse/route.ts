import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// Store active connections
const connections = new Set<ReadableStreamDefaultController>()

// Broadcast update to all connected clients
export const broadcastUpdate = async (type: string, data: any) => {
  const message = `data: ${JSON.stringify({ type, data, timestamp: Date.now() })}\n\n`
  
  connections.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(message))
    } catch (error) {
      // Remove failed connections
      connections.delete(controller)
    }
  })
}

// Get current state and send to client
const getCurrentState = async () => {
  const [locations, checkIns] = await Promise.all([
    prisma.location.findMany({
      where: { isActive: true },
      include: {
        checkIns: {
          where: { isActive: true },
          include: { user: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.checkIn.findMany({
      where: { isActive: true },
      include: {
        user: true,
        location: true,
      },
      orderBy: { checkedInAt: 'desc' },
    })
  ])

  const locationsWithUsers = locations.map(location => ({
    id: location.id,
    name: location.name,
    description: location.description,
    icon: location.icon,
    color: location.color,
    isActive: location.isActive,
    createdAt: location.createdAt,
    updatedAt: location.updatedAt,
    users: location.checkIns.length,
    currentUsers: location.checkIns.map(checkIn => ({
      id: checkIn.user.id,
      name: checkIn.user.name,
      checkedInAt: checkIn.checkedInAt,
    })),
  }))

  return { locations: locationsWithUsers, checkIns }
}

export const GET = async (request: NextRequest) => {
  const stream = new ReadableStream({
    start(controller) {
      connections.add(controller)
      
      // Send initial state
      getCurrentState().then(state => {
        const message = `data: ${JSON.stringify({ 
          type: 'initial', 
          data: state, 
          timestamp: Date.now() 
        })}\n\n`
        controller.enqueue(new TextEncoder().encode(message))
      })

      // Send keep-alive ping every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode('data: {"type":"ping"}\n\n'))
        } catch (error) {
          clearInterval(keepAlive)
          connections.delete(controller)
        }
      }, 30000)

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive)
        connections.delete(controller)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
} 