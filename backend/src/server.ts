import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import type { ServerToClientEvents, ClientToServerEvents } from './types/events'
import { CheckInService } from './services/checkinService'

dotenv.config()

const app = express()
const server = createServer(app)
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

// Initialize services
const checkInService = new CheckInService()

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000"
}))
app.use(express.json())

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)

  // Send initial data when client connects
  socket.on('get:initial-data', async (callback) => {
    try {
      const [checkins, locations] = await Promise.all([
        checkInService.getActiveCheckIns(),
        checkInService.getLocationsWithUsers()
      ])

      callback({ checkins, locations })
      console.log(`Initial data sent to ${socket.id}`)
    } catch (error) {
      console.error('Error fetching initial data:', error)
      socket.emit('error', { 
        message: 'Fehler beim Laden der initialen Daten',
        code: 'INITIAL_DATA_ERROR'
      })
    }
  })

  // Handle user check-in
  socket.on('user:checkin', async (data, callback) => {
    try {
      const result = await checkInService.checkIn(data)
      
      // Send success response to the requesting client
      callback({ 
        success: true, 
        data: result.checkIn 
      })

      // Broadcast update to all clients
      if (result.type === 'checkin') {
        io.emit('checkin:update', result.checkIn)
      } else {
        io.emit('checkout:update', result.checkIn)
      }

      // Update locations for all clients
      const locations = await checkInService.getLocationsWithUsers()
      io.emit('locations:update', locations)

      console.log(`User ${result.type}: ${data.userId} at location ${data.locationId}`)
    } catch (error) {
      console.error('Check-in error:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler beim Check-in'
      
      callback({ 
        success: false, 
        error: errorMessage 
      })

      socket.emit('error', { 
        message: errorMessage,
        code: 'CHECKIN_ERROR'
      })
    }
  })

  // Handle user check-out
  socket.on('user:checkout', async (data, callback) => {
    try {
      const result = await checkInService.checkOut(data)
      
      // Send success response to the requesting client
      callback({ 
        success: true, 
        data: result 
      })

      // Broadcast checkout update to all clients
      io.emit('checkout:update', result)

      // Update locations for all clients
      const locations = await checkInService.getLocationsWithUsers()
      io.emit('locations:update', locations)

      console.log(`User checkout: ${data.checkInId || data.userId}`)
    } catch (error) {
      console.error('Check-out error:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler beim Check-out'
      
      callback({ 
        success: false, 
        error: errorMessage 
      })

      socket.emit('error', { 
        message: errorMessage,
        code: 'CHECKOUT_ERROR'
      })
    }
  })

  // Handle client disconnect
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`)
  })

  // Handle connection errors
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error)
  })
})

// API endpoint to broadcast location events (called from Next.js API routes)
app.post('/broadcast/location-created', (req, res) => {
  try {
    const location = req.body
    io.emit('location:created', location)
    console.log(`📡 Broadcasting location created: ${location.name}`)
    res.json({ success: true })
  } catch (error) {
    console.error('Error broadcasting location created:', error)
    res.status(500).json({ error: 'Failed to broadcast event' })
  }
})

app.post('/broadcast/location-deleted', (req, res) => {
  try {
    const locationData = req.body
    io.emit('location:deleted', locationData)
    console.log(`📡 Broadcasting location deleted: ${locationData.name}`)
    res.json({ success: true })
  } catch (error) {
    console.error('Error broadcasting location deleted:', error)
    res.status(500).json({ error: 'Failed to broadcast event' })
  }
})

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Express error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`🚀 Websocket server running on port ${PORT}`)
  console.log(`📊 CORS enabled for: ${process.env.CORS_ORIGIN || "http://localhost:3000"}`)
  console.log(`🔌 Socket.io ready for connections`)
}) 