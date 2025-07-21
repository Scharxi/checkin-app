import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io, Socket } from 'socket.io-client'

interface CheckInData {
  userId: string
  locationId: string
}

interface CheckOutData {
  checkInId?: string
  userId?: string
}

interface CheckInResponse {
  id: string
  userId: string
  locationId: string
  checkedInAt: Date
  checkedOutAt: Date | null
  isActive: boolean
  user: {
    id: string
    name: string
    email: string | null
  }
  location: {
    id: string
    name: string
    description: string
    icon: string
    color: string
  }
}

interface LocationWithUsers {
  id: string
  name: string
  description: string
  icon: string
  color: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  users: number
  currentUsers: Array<{
    id: string
    name: string
    checkedInAt: Date
  }>
}

interface HelpRequest {
  id: string
  requesterId: string
  locationId: string
  message: string | null
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED'
  createdAt: string
  updatedAt: string
  requester: {
    id: string
    name: string
    email: string | null
  }
  location: {
    id: string
    name: string
    description: string
    icon: string
    color: string
  }
}

interface ServerToClientEvents {
  'checkin:update': (data: CheckInResponse) => void
  'checkout:update': (data: CheckInResponse) => void
  'locations:update': (data: LocationWithUsers[]) => void
  'location:created': (data: LocationWithUsers) => void
  'location:deleted': (data: { id: string; name: string }) => void
  'checkins:initial': (data: CheckInResponse[]) => void
  'locations:initial': (data: LocationWithUsers[]) => void
  'help:request': (data: HelpRequest) => void
  'help:update': (data: HelpRequest) => void
  'help:delete': (data: { id: string; helpRequest: HelpRequest }) => void
  'error': (error: { message: string; code?: string }) => void
}

interface ClientToServerEvents {
  'user:checkin': (data: CheckInData, callback: (response: { success: boolean; data?: CheckInResponse; error?: string }) => void) => void
  'user:checkout': (data: CheckOutData, callback: (response: { success: boolean; data?: CheckInResponse; error?: string }) => void) => void
  'get:initial-data': (callback: (response: { checkins: CheckInResponse[]; locations: LocationWithUsers[] }) => void) => void
}

// Enhanced WebSocket URL detection with better fallback logic
const getWebSocketUrl = () => {
  // If environment variable is set, use it (for custom configurations)
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_WS_URL) {
    console.log('🔌 Using environment WebSocket URL:', process.env.NEXT_PUBLIC_WS_URL)
    return process.env.NEXT_PUBLIC_WS_URL
  }

  if (typeof window === 'undefined') {
    // Server-side rendering fallback - use environment variable or default
    return process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'
  }

  // Client-side: Enhanced URL detection
  const currentHost = window.location.hostname
  const currentProtocol = window.location.protocol
  const currentPort = window.location.port
  
  console.log('🔌 WebSocket Frontend-Details:')
  console.log('  - Hostname:', currentHost)
  console.log('  - Protocol:', currentProtocol)
  console.log('  - Port:', currentPort)
  console.log('  - Full URL:', window.location.href)
  
  // Check if we're in a real development environment (not Docker)
  const isRealDevelopment = currentHost === 'localhost' && currentPort === '3000'
  
  if (isRealDevelopment) {
    console.log('🔌 Real development mode detected (localhost:3000)')
    return process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'
  }
  
  // For Docker or server deployment: Use current host with port 3001
  let targetHost = currentHost
  
  // If we're on localhost but not in real development, we might be in Docker
  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    console.log('🔌 Docker/Server mode detected - using server IP for backend')
    targetHost = '172.16.3.6' // Your server IP - should be set via env var
  }
  
  const websocketUrl = `${currentProtocol}//${targetHost}:3001`
  
  console.log('🔌 Final WebSocket URL:', websocketUrl)
  console.log('🔌 Target Host:', targetHost)
  
  return websocketUrl
}

export const useWebsockets = () => {
  const queryClient = useQueryClient()
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 10

  useEffect(() => {
    const socketUrl = getWebSocketUrl()
    
    console.log(`🔌 Initializing WebSocket connection to: ${socketUrl}`)
    
    // Create Socket.io connection with enhanced configuration
    const socket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
      timeout: 20000,
      // Force polling transport initially to avoid WebSocket upgrade issues
      transports: ['polling', 'websocket'],
      // Additional options for better cross-origin support
      forceNew: false,
      upgrade: true,
      // Add explicit headers for CORS
      extraHeaders: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
      },
    })

    socketRef.current = socket

    // Handle connection events
    socket.on('connect', () => {
      console.log('🔌 Websocket connected:', socket.id)
      console.log('📡 Successful URL:', socketUrl)
      console.log('🚀 Transport:', socket.io.engine.transport.name)
      setIsConnected(true)
      setError(null)
      reconnectAttempts.current = 0

      // Request initial data
      socket.emit('get:initial-data', (response: { checkins: CheckInResponse[]; locations: LocationWithUsers[] }) => {
        queryClient.setQueryData(['locations'], response.locations)
        queryClient.setQueryData(['checkins'], response.checkins)
        console.log('📊 Initial data loaded via websocket')
      })
    })

    socket.on('disconnect', (reason) => {
      console.log('🔌 Websocket disconnected:', reason)
      setIsConnected(false)
      
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        socket.connect()
      }
    })

    socket.on('connect_error', (error) => {
      console.error('🔌 Websocket connection error:', error)
      console.error('🚫 Failed URL:', socketUrl)
      console.error('🔍 Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      })
      
      reconnectAttempts.current++
      
      let errorMessage = 'Backend nicht erreichbar'
      
      // Provide more specific error messages
      if (error.message.includes('CORS')) {
        errorMessage = 'CORS-Fehler: Server blockiert Verbindung'
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Zeitüberschreitung: Server antwortet nicht'
      } else if (error.message.includes('refused')) {
        errorMessage = 'Verbindung verweigert: Server läuft nicht'
      } else if (reconnectAttempts.current >= maxReconnectAttempts) {
        errorMessage = `Verbindung fehlgeschlagen nach ${maxReconnectAttempts} Versuchen`
      } else {
        errorMessage = `Verbindungsfehler (Versuch ${reconnectAttempts.current}/${maxReconnectAttempts}): ${error.message}`
      }
      
      setError(errorMessage)
      setIsConnected(false)
    })

    // Engine error handling
    socket.io.on('error', (error: any) => {
      console.error('🚨 Socket.IO engine error:', error)
    })

    // Handle check-in/check-out updates
    socket.on('checkin:update', (data) => {
      console.log('✅ Check-in update received:', data)
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      queryClient.invalidateQueries({ queryKey: ['checkins'] })
    })

    socket.on('checkout:update', (data) => {
      console.log('🚪 Check-out update received:', data)
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      queryClient.invalidateQueries({ queryKey: ['checkins'] })
    })

    socket.on('locations:update', (data) => {
      console.log('📍 Locations update received')
      queryClient.setQueryData(['locations'], data)
    })

    socket.on('location:created', (data) => {
      console.log('✨ Location created:', data.name)
      queryClient.invalidateQueries({ queryKey: ['locations'] })
    })

    socket.on('location:deleted', (data) => {
      console.log('🗑️ Location deleted:', data.name)
      queryClient.invalidateQueries({ queryKey: ['locations'] })
    })

    // Handle help request events
    socket.on('help:request', (data) => {
      console.log('🆘 Help request received:', data)
      queryClient.invalidateQueries({ queryKey: ['help-requests'] })
      
      // Dispatch custom event for notifications
      window.dispatchEvent(new CustomEvent('help:request', { detail: data }))
    })

    socket.on('help:update', (data) => {
      console.log('🔄 Help request updated:', data)
      queryClient.invalidateQueries({ queryKey: ['help-requests'] })
      
      // Dispatch custom event for notifications
      window.dispatchEvent(new CustomEvent('help:update', { detail: data }))
    })

    socket.on('help:delete', (data) => {
      console.log('🗑️ Help request deleted:', data.id)
      queryClient.invalidateQueries({ queryKey: ['help-requests'] })
      
      // Dispatch custom event for notifications
      window.dispatchEvent(new CustomEvent('help:delete', { detail: data }))
    })

    // Handle errors
    socket.on('error', (error) => {
      console.error('❌ Websocket error:', error)
      const errorMessage = error?.message || error?.toString() || 'Unbekannter Websocket-Fehler'
      setError(errorMessage)
    })

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        console.log('🔌 Cleaning up WebSocket connection')
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [queryClient])

  const checkIn = async (data: CheckInData): Promise<{ success: boolean; data?: CheckInResponse; error?: string }> => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) {
        resolve({ success: false, error: 'Websocket nicht verbunden' })
        return
      }

      socketRef.current.emit('user:checkin', data, (response) => {
        resolve(response)
      })
    })
  }

  const checkOut = async (data: CheckOutData): Promise<{ success: boolean; data?: CheckInResponse; error?: string }> => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) {
        resolve({ success: false, error: 'Websocket nicht verbunden' })
        return
      }

      socketRef.current.emit('user:checkout', data, (response) => {
        resolve(response)
      })
    })
  }

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }

  return {
    isConnected,
    error,
    checkIn,
    checkOut,
    disconnect,
  }
} 