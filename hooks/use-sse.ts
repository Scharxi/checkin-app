import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

interface SSEMessage {
  type: string
  data?: any
  timestamp: number
}

export const useSSE = () => {
  const queryClient = useQueryClient()
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // Create SSE connection
    const eventSource = new EventSource('/api/sse')
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const message: SSEMessage = JSON.parse(event.data)
        
        switch (message.type) {
          case 'initial':
            // Update queries with initial data
            if (message.data) {
              queryClient.setQueryData(['locations'], message.data.locations)
              queryClient.setQueryData(['checkins'], message.data.checkIns)
            }
            break

          case 'checkin':
          case 'checkout':
            // Invalidate queries to refetch fresh data
            queryClient.invalidateQueries({ queryKey: ['locations'] })
            queryClient.invalidateQueries({ queryKey: ['checkins'] })
            break

          case 'location_created':
            queryClient.invalidateQueries({ queryKey: ['locations'] })
            break

          case 'user_created':
            queryClient.invalidateQueries({ queryKey: ['users'] })
            break

          case 'ping':
            // Keep-alive ping, no action needed
            break

          default:
            console.log('Unknown SSE message type:', message.type)
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('Attempting to reconnect SSE...')
          eventSource.close()
          // The useEffect will create a new connection when this one is closed
        }
      }, 5000)
    }

    eventSource.onopen = () => {
      console.log('SSE connection established')
    }

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [queryClient])

  return {
    disconnect: () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }
} 