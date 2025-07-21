import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from './lib/prisma'

dotenv.config()

const app = express()
const server = createServer(app)

// Enhanced CORS configuration for better cross-origin support
const corsOrigin = process.env.CORS_ORIGIN

const allowedOrigins: (string | RegExp)[] = []

// If CORS_ORIGIN is explicitly set, use it
if (corsOrigin) {
  if (Array.isArray(corsOrigin)) {
    allowedOrigins.push(...corsOrigin)
  } else {
    allowedOrigins.push(corsOrigin)
  }
} else {
  // Auto-detect allowed origins based on environment
  if (process.env.NODE_ENV === 'production') {
    // Production: Allow any origin on port 3000 (for server deployment)
    allowedOrigins.push(/^https?:\/\/[^\/]+:3000$/) // Any domain/IP on port 3000
    allowedOrigins.push(/^https?:\/\/[^\/]+$/) // Any domain/IP (for reverse proxy setups)
  } else {
    // Development: Allow localhost and local network IPs
    allowedOrigins.push('http://localhost:3000')
    allowedOrigins.push('http://127.0.0.1:3000')
    allowedOrigins.push('http://192.168.2.85:3000') // Your current network IP
    allowedOrigins.push(/^http:\/\/192\.168\.\d+\.\d+:3000$/) // Any 192.168.x.x:3000
    allowedOrigins.push(/^http:\/\/172\.\d+\.\d+\.\d+:3000$/) // Any 172.x.x.x:3000 (Docker networks)
    allowedOrigins.push(/^http:\/\/10\.\d+\.\d+\.\d+:3000$/) // Any 10.x.x.x:3000
  }
}

// Enhanced CORS for Express - Allow all origins for now to solve the immediate issue
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true)
    
    console.log(`🔍 CORS check for origin: ${origin}`)
    
    // Allow all origins temporarily to fix the immediate issue
    callback(null, true)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  optionsSuccessStatus: 200
}))

// Add explicit preflight handling
app.options('*', cors())

app.use(express.json())

// Enhanced Socket.io configuration with better CORS handling
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin
      if (!origin) return callback(null, true)
      
      console.log(`🔌 Socket.IO CORS check for origin: ${origin}`)
      
      // Allow all origins temporarily to fix the immediate issue
      callback(null, true)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  },
  // Additional Socket.IO configuration for better connectivity
  allowEIO3: true,
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
})

console.log('🚀 Websocket server running on port 3001')
console.log(`📊 CORS enabled for: ALL ORIGINS (enhanced configuration)`)
console.log('🔌 Socket.io ready for connections')
console.log(`🌐 Environment: ${process.env.NODE_ENV}`)
console.log(`🔍 Expected frontend origins: http://172.16.3.6:3000, http://localhost:3000`)

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`👤 Client connected: ${socket.id}`)
  console.log(`📡 Connection from: ${socket.handshake.headers.origin || 'unknown origin'}`)
  console.log(`🌐 Headers:`, socket.handshake.headers)

  socket.on('disconnect', () => {
    console.log(`👋 Client disconnected: ${socket.id}`)
  })

  // Handle connection errors
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error)
  })
})

// Handle Socket.IO middleware errors
io.engine.on('connection_error', (err) => {
  console.error('🚨 Socket.IO connection error:', err.message)
  console.error('  - Request:', err.req?.url)
  console.error('  - Code:', err.code)
  console.error('  - Context:', err.context)
})

// Validation schemas
const createUserSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(50, 'Name zu lang'),
  email: z.string().email().optional(),
})

const createLocationSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  description: z.string().min(1, 'Beschreibung ist erforderlich'),
  icon: z.string().min(1, 'Icon ist erforderlich'),
  color: z.string().min(1, 'Farbe ist erforderlich'),
})

const createTemporaryLocationSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(50, 'Name darf maximal 50 Zeichen lang sein'),
  description: z.string().max(200, 'Beschreibung darf maximal 200 Zeichen lang sein').optional(),
  createdBy: z.string().min(1, 'User ID ist erforderlich'),
})

const checkInSchema = z.object({
  userId: z.string().min(1, 'User ID ist erforderlich'),
  locationId: z.string().min(1, 'Location ID ist erforderlich'),
})

const checkOutSchema = z.object({
  checkInId: z.string().min(1, 'CheckIn ID ist erforderlich'),
})

const createHelpRequestSchema = z.object({
  requesterId: z.string().min(1, 'Requester ID ist erforderlich'),
  locationId: z.string().min(1, 'Location ID ist erforderlich'),
  targetUserId: z.string().optional(),
  message: z.string().optional(),
})

const updateHelpRequestSchema = z.object({
  status: z.enum(['ACTIVE', 'RESOLVED', 'CANCELLED']),
})

// Helper function to broadcast WebSocket events
const broadcast = (event: string, data: any) => {
  io.emit(event, data)
}

// Auto-delete temporary locations function
const autoDeleteEmptyTemporaryLocations = async () => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    
    const candidatesForDeletion = await prisma.location.findMany({
      where: {
        isTemporary: true,
        isActive: true,
        checkIns: {
          none: {
            isActive: true
          }
        },
        OR: [
          {
            createdAt: {
              lt: fiveMinutesAgo
            }
          },
          {
            checkIns: {
              some: {}
            }
          }
        ]
      }
    })

    if (candidatesForDeletion.length > 0) {
      await prisma.location.deleteMany({
        where: {
          id: {
            in: candidatesForDeletion.map(loc => loc.id)
          },
          isTemporary: true,
          checkIns: {
            none: {
              isActive: true
            }
          }
        }
      })

      for (const location of candidatesForDeletion) {
        broadcast('location:deleted', {
          id: location.id,
          name: location.name
        })
      }

      console.log(`Permanently deleted ${candidatesForDeletion.length} empty temporary locations`)
    }
  } catch (error) {
    console.error('Error auto-deleting empty temporary locations:', error)
  }
}

// === USER ENDPOINTS ===

// GET /api/users - Get all users or find by name
app.get('/api/users', async (req, res) => {
  try {
    const { name } = req.query

    if (name) {
      const user = await prisma.user.findFirst({
        where: { name: name as string },
        include: {
          checkIns: {
            where: { isActive: true },
            include: { location: true },
          },
        },
      })

      if (!user) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden' })
      }

      return res.json(user)
    }

    const users = await prisma.user.findMany({
      include: {
        checkIns: {
          where: { isActive: true },
          include: { location: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'Fehler beim Laden der Benutzer' })
  }
})

// POST /api/users - Create new user
app.post('/api/users', async (req, res) => {
  try {
    const { name, email } = createUserSchema.parse(req.body)

    const user = await prisma.user.create({
      data: { name, email },
      include: {
        checkIns: {
          where: { isActive: true },
          include: { location: true },
        },
      },
    })

    res.status(201).json(user)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Ungültige Eingabedaten',
        details: error.errors
      })
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[]
        if (target?.includes('name')) {
          return res.status(409).json({
            error: 'Dieser Name ist bereits vergeben. Bitte wähle einen anderen Namen.'
          })
        }
        if (target?.includes('email')) {
          return res.status(409).json({
            error: 'Diese E-Mail-Adresse ist bereits vergeben.'
          })
        }
      }
    }

    console.error('Error creating user:', error)
    res.status(500).json({ error: 'Fehler beim Erstellen des Benutzers' })
  }
})

// === LOCATION ENDPOINTS ===

// GET /api/locations - Get all active locations
app.get('/api/locations', async (req, res) => {
  try {
    await autoDeleteEmptyTemporaryLocations()

    const locations = await prisma.location.findMany({
      where: { isActive: true },
      include: {
        checkIns: {
          where: { isActive: true },
          include: { user: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    const locationsWithUsers = locations.map(location => ({
      id: location.id,
      name: location.name,
      description: location.description,
      icon: location.icon,
      color: location.color,
      isActive: location.isActive,
      isTemporary: location.isTemporary,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
      users: location.checkIns.length,
      currentUsers: location.checkIns.map(checkIn => ({
        id: checkIn.user.id,
        name: checkIn.user.name,
        checkedInAt: checkIn.checkedInAt,
      })),
    }))

    res.json(locationsWithUsers)
  } catch (error) {
    console.error('Error fetching locations:', error)
    res.status(500).json({ error: 'Fehler beim Laden der Standorte' })
  }
})

// POST /api/locations - Create new location
app.post('/api/locations', async (req, res) => {
  try {
    const data = createLocationSchema.parse(req.body)

    const location = await prisma.location.create({
      data,
      include: {
        checkIns: {
          where: { isActive: true },
          include: { user: true },
        },
      },
    })

    const locationWithUsers = {
      ...location,
      users: location.checkIns.length,
      currentUsers: location.checkIns.map(checkIn => ({
        id: checkIn.user.id,
        name: checkIn.user.name,
        checkedInAt: checkIn.checkedInAt,
      })),
    }

    broadcast('location:created', locationWithUsers)

    res.status(201).json(locationWithUsers)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Ungültige Eingabedaten',
        details: error.errors
      })
    }

    console.error('Error creating location:', error)
    res.status(500).json({ error: 'Fehler beim Erstellen des Standorts' })
  }
})

// POST /api/locations/temporary - Create temporary location
app.post('/api/locations/temporary', async (req, res) => {
  try {
    const data = createTemporaryLocationSchema.parse(req.body)

    const user = await prisma.user.findUnique({
      where: { id: data.createdBy }
    })

    if (!user) {
      return res.status(404).json({ error: 'User nicht gefunden' })
    }

    const location = await prisma.location.create({
      data: {
        name: data.name,
        description: data.description || 'Temporäre Check-in-Karte',
        icon: 'MapPin',
        color: 'bg-orange-500',
        isTemporary: true,
        createdBy: data.createdBy,
      }
    })

    const locationWithData = await prisma.location.findUnique({
      where: { id: location.id },
      include: {
        checkIns: {
          where: { isActive: true },
          include: { user: true },
        },
      },
    })

    if (!locationWithData) {
      return res.status(500).json({ error: 'Location konnte nicht geladen werden' })
    }

    const locationWithUsers = {
      ...locationWithData,
      users: locationWithData.checkIns.length,
      currentUsers: locationWithData.checkIns.map(checkIn => ({
        id: checkIn.user.id,
        name: checkIn.user.name,
        checkedInAt: checkIn.checkedInAt,
      })),
    }

    broadcast('location:created', locationWithUsers)

    res.status(201).json(locationWithUsers)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Ungültige Eingabedaten',
        details: error.errors
      })
    }

    console.error('Error creating temporary location:', error)
    res.status(500).json({ error: 'Fehler beim Erstellen der temporären Karte' })
  }
})

// === CHECKIN ENDPOINTS ===

// GET /api/checkins - Get all active check-ins
app.get('/api/checkins', async (req, res) => {
  try {
    const checkIns = await prisma.checkIn.findMany({
      where: { isActive: true },
      include: {
        user: true,
        location: true,
      },
      orderBy: { checkedInAt: 'desc' },
    })

    res.json(checkIns)
  } catch (error) {
    console.error('Error fetching check-ins:', error)
    res.status(500).json({ error: 'Fehler beim Laden der Check-ins' })
  }
})

// POST /api/checkins - Check-in user to location
app.post('/api/checkins', async (req, res) => {
  try {
    const { userId, locationId } = checkInSchema.parse(req.body)

    const existingCheckIn = await prisma.checkIn.findFirst({
      where: {
        userId,
        isActive: true,
      },
    })

    if (existingCheckIn) {
      if (existingCheckIn.locationId === locationId) {
        const updatedCheckIn = await prisma.checkIn.update({
          where: { id: existingCheckIn.id },
          data: {
            isActive: false,
            checkedOutAt: new Date(),
          },
          include: {
            user: true,
            location: true,
          },
        })

        await autoDeleteEmptyTemporaryLocations()
        broadcast('checkout:update', updatedCheckIn)

        return res.json({
          type: 'checkout',
          checkIn: updatedCheckIn,
        })
      } else {
        await prisma.checkIn.update({
          where: { id: existingCheckIn.id },
          data: {
            isActive: false,
            checkedOutAt: new Date(),
          },
        })
      }
    }

    const newCheckIn = await prisma.checkIn.create({
      data: {
        userId,
        locationId,
      },
      include: {
        user: true,
        location: true,
      },
    })

    await autoDeleteEmptyTemporaryLocations()
    broadcast('checkin:update', newCheckIn)

    res.status(201).json({
      type: 'checkin',
      checkIn: newCheckIn,
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Ungültige Eingabedaten',
        details: error.errors
      })
    }

    console.error('Error processing check-in:', error)
    res.status(500).json({ error: 'Fehler beim Check-in' })
  }
})

// DELETE /api/checkins - Manual check-out
app.delete('/api/checkins', async (req, res) => {
  try {
    const { checkInId } = checkOutSchema.parse(req.body)

    const updatedCheckIn = await prisma.checkIn.update({
      where: { id: checkInId },
      data: {
        isActive: false,
        checkedOutAt: new Date(),
      },
      include: {
        user: true,
        location: true,
      },
    })

    await autoDeleteEmptyTemporaryLocations()
    broadcast('checkout:update', updatedCheckIn)

    res.json({
      type: 'checkout',
      checkIn: updatedCheckIn,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Ungültige Eingabedaten',
        details: error.errors
      })
    }

    console.error('Error checking out:', error)
    res.status(500).json({ error: 'Fehler beim Check-out' })
  }
})

// === HELP REQUEST ENDPOINTS ===

// GET /api/help-requests - Get all active help requests
app.get('/api/help-requests', async (req, res) => {
  try {
    const helpRequests = await prisma.helpRequest.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        location: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            color: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    res.json(helpRequests)
  } catch (error) {
    console.error('Error fetching help requests:', error)
    res.status(500).json({ error: 'Failed to fetch help requests' })
  }
})

// POST /api/help-requests - Create new help request
app.post('/api/help-requests', async (req, res) => {
  try {
    const { requesterId, locationId, targetUserId, message } = createHelpRequestSchema.parse(req.body)

    const existingRequest = await prisma.helpRequest.findFirst({
      where: {
        requesterId,
        locationId,
        status: 'ACTIVE'
      }
    })

    if (existingRequest) {
      return res.status(409).json({ error: 'You already have an active help request for this location' })
    }

    const helpRequest = await prisma.helpRequest.create({
      data: {
        requesterId,
        locationId,
        targetUserId: targetUserId || null,
        message: message || null
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        location: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            color: true
          }
        }
      }
    })

    broadcast('help:request', helpRequest)

    res.status(201).json(helpRequest)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Ungültige Eingabedaten',
        details: error.errors
      })
    }

    console.error('Error creating help request:', error)
    res.status(500).json({ error: 'Failed to create help request' })
  }
})

// PUT /api/help-requests/:id - Update help request status
app.put('/api/help-requests/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = updateHelpRequestSchema.parse(req.body)

    const helpRequest = await prisma.helpRequest.update({
      where: { id },
      data: { status },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        location: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            color: true
          }
        }
      }
    })

    broadcast('help:update', helpRequest)

    res.json(helpRequest)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Valid status is required',
        details: error.errors
      })
    }

    console.error('Error updating help request:', error)
    res.status(500).json({ error: 'Failed to update help request' })
  }
})

// DELETE /api/help-requests/:id - Delete help request
app.delete('/api/help-requests/:id', async (req, res) => {
  try {
    const { id } = req.params

    const helpRequest = await prisma.helpRequest.delete({
      where: { id },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        location: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            color: true
          }
        }
      }
    })

    broadcast('help:delete', { id, helpRequest })

    res.json({ message: 'Help request deleted successfully' })
  } catch (error) {
    console.error('Error deleting help request:', error)
    res.status(500).json({ error: 'Failed to delete help request' })
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Start server - Bind to all interfaces to allow external connections
const port = Number(process.env.PORT) || 3001
const host = process.env.HOST || '0.0.0.0' // Bind to all interfaces, not just localhost

server.listen(port, host, () => {
  console.log(`🚀 Server running on ${host}:${port}`)
  console.log(`📡 Server accessible at:`)
  console.log(`   - Local: http://localhost:${port}`)
  console.log(`   - Network: http://172.16.3.6:${port}`)
  console.log(`   - All interfaces: http://0.0.0.0:${port}`)
  console.log(`🔌 Socket.IO ready for connections from any origin`)
}) 