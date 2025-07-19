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

// Dynamische WebSocket-URL-Erkennung zur Laufzeit
const getWebSocketUrl = () => {
  // If environment variable is set, use it (for custom configurations)
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL
  }

  if (typeof window === 'undefined') {
    // Server-side rendering fallback
    return 'http://localhost:3001'
  }

  // Client-side: Automatische URL-Erkennung
  const currentHost = window.location.hostname
  const currentProtocol = window.location.protocol
  const currentPort = window.location.port
  
  // Entwicklung vs Produktion automatisch erkennen
  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    return 'http://localhost:3001'
  }
  
  // Server-Deployment: Verwende gleiche Domain/IP wie Frontend, Port 3001
  // Für Server-Deployment ist das Frontend normalerweise auf Port 3000 und Backend auf 3001
  let websocketUrl: string
  
  if (currentPort && currentPort !== '80' && currentPort !== '443') {
    // Port ist explizit gesetzt - verwende gleiche Domain mit Port 3001
    websocketUrl = `${currentProtocol}//${currentHost}:3001`
  } else {
    // Standard-Ports (80/443) oder kein Port - wahrscheinlich Reverse Proxy
    // Versuche erst Port 3001, dann ohne Port (für Reverse Proxy setups)
    websocketUrl = `${currentProtocol}//${currentHost}:3001`
  }
  
  console.log('🔍 Frontend läuft auf:', `${currentProtocol}//${currentHost}${currentPort ? ':' + currentPort : ''}`)
  console.log('🔌 WebSocket URL erkannt:', websocketUrl)
  
  return websocketUrl
}

export const useWebsockets = () => {
  const queryClient = useQueryClient()
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // NEUE DYNAMISCHE URL-ERKENNUNG statt hardcodierte Umgebungsvariable
    const socketUrl = getWebSocketUrl()
    
    // Create Socket.io connection
    const socket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    })

    socketRef.current = socket

    // Handle connection events
    socket.on('connect', () => {
      console.log('🔌 Websocket connected:', socket.id)
      console.log('📡 Successful URL:', socketUrl)
      setIsConnected(true)
      setError(null)

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
    })

    socket.on('connect_error', (error) => {
      console.error('🔌 Websocket connection error:', error)
      console.error('🚫 Failed URL:', socketUrl)
      const errorMessage = error?.message || 'Verbindung zum Server fehlgeschlagen'
      setError(`Backend nicht erreichbar: ${errorMessage}`)
      setIsConnected(false)
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