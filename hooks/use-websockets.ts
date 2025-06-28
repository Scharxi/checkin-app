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

interface ServerToClientEvents {
  'checkin:update': (data: CheckInResponse) => void
  'checkout:update': (data: CheckInResponse) => void
  'locations:update': (data: LocationWithUsers[]) => void
  'location:created': (data: LocationWithUsers) => void
  'location:deleted': (data: { id: string; name: string }) => void
  'checkins:initial': (data: CheckInResponse[]) => void
  'locations:initial': (data: LocationWithUsers[]) => void
  'error': (error: { message: string; code?: string }) => void
}

interface ClientToServerEvents {
  'user:checkin': (data: CheckInData, callback: (response: { success: boolean; data?: CheckInResponse; error?: string }) => void) => void
  'user:checkout': (data: CheckOutData, callback: (response: { success: boolean; data?: CheckInResponse; error?: string }) => void) => void
  'get:initial-data': (callback: (response: { checkins: CheckInResponse[]; locations: LocationWithUsers[] }) => void) => void
}

export const useWebsockets = () => {
  const queryClient = useQueryClient()
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Create Socket.io connection
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
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