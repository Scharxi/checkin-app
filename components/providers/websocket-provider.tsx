'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useWebsockets } from '@/hooks/use-websockets'
import { useSSE } from '@/hooks/use-sse'

interface WebSocketContextType {
  isConnected: boolean
  error: string | null
  checkIn: (data: { userId: string; locationId: string }) => Promise<{ success: boolean; data?: any; error?: string }>
  checkOut: (data: { checkInId?: string; userId?: string }) => Promise<{ success: boolean; data?: any; error?: string }>
  disconnect: () => void
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

interface WebSocketProviderProps {
  children: ReactNode
}

export const WebSocketProvider = ({ children }: WebSocketProviderProps) => {
  const websocketData = useWebsockets()
  // Add SSE hook for location updates
  useSSE()

  return (
    <WebSocketContext.Provider value={websocketData}>
      {children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider')
  }
  return context
} 