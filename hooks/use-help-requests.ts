import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import { useEffect, useState } from 'react'

// Dynamische API Base URL-Erkennung zur Laufzeit
const getApiBaseUrl = () => {
  // If environment variable is set, use it (for custom configurations)
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    console.log('🔍 Help Requests: Using environment API URL:', process.env.NEXT_PUBLIC_API_URL)
    return process.env.NEXT_PUBLIC_API_URL
  }

  if (typeof window === 'undefined') {
    // Server-side rendering fallback - use environment variable or default
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  }

  // Client-side: Automatische URL-Erkennung
  const currentHost = window.location.hostname
  const currentProtocol = window.location.protocol
  const currentPort = window.location.port
  
  // Check if we're in a real development environment (not Docker)
  const isRealDevelopment = currentHost === 'localhost' && currentPort === '3000'
  
  if (isRealDevelopment) {
    console.log('🔍 Help Requests: Real development mode detected (localhost:3000)')
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  }
  
  // For Docker or server deployment: Use server's IP with port 3001
  let targetHost = currentHost
  
  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    console.log('🔍 Help Requests: Docker/Server mode detected - using server IP for backend')
    targetHost = '172.16.3.6' // Your server IP - should be set via env var
  }
  
  const apiUrl = `${currentProtocol}//${targetHost}:3001`
  
  console.log('🔍 Help Requests API Base URL:', apiUrl)
  
  return apiUrl
}

// Types
export interface HelpRequest {
  id: string
  requesterId: string
  locationId: string
  targetUserId?: string
  message?: string
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED'
  createdAt: string
  updatedAt: string
  requester: {
    id: string
    name: string
    email?: string
  }
  targetUser?: {
    id: string
    name: string
    email?: string
  }
  location: {
    id: string
    name: string
    description: string
    icon: string
    color: string
  }
}

// API functions that call backend endpoints
const api = {
  getHelpRequests: async (): Promise<HelpRequest[]> => {
    const response = await fetch(`${getApiBaseUrl()}/api/help-requests`)
    if (!response.ok) {
      throw new Error('Failed to fetch help requests')
    }
    return response.json()
  },

  createHelpRequest: async (data: {
    requesterId: string
    locationId: string
    targetUserId?: string
    message?: string
  }): Promise<HelpRequest> => {
    const response = await fetch(`${getApiBaseUrl()}/api/help-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create help request')
    }
    return response.json()
  },

  updateHelpRequest: async (id: string, status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED'): Promise<HelpRequest> => {
    const response = await fetch(`${getApiBaseUrl()}/api/help-requests/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update help request')
    }
    return response.json()
  },

  deleteHelpRequest: async (id: string): Promise<void> => {
    const response = await fetch(`${getApiBaseUrl()}/api/help-requests/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete help request')
    }
  },
}

// React Query hooks
export const useHelpRequests = () => {
  return useQuery({
    queryKey: ['help-requests'],
    queryFn: api.getHelpRequests,
    staleTime: 30000,
  })
}

export const useCreateHelpRequest = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.createHelpRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-requests'] })
      toast({
        title: 'Hilfe angefordert',
        description: 'Ihre Hilfe-Anfrage wurde erfolgreich erstellt.',
      })
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      })
    },
  })
}

export const useUpdateHelpRequest = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED' }) =>
      api.updateHelpRequest(id, status),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['help-requests'] })
      
      let message = 'Die Hilfe-Anfrage wurde aktualisiert.'
      if (status === 'RESOLVED') {
        message = 'Die Hilfe-Anfrage wurde als gelöst markiert.'
      } else if (status === 'CANCELLED') {
        message = 'Die Hilfe-Anfrage wurde storniert.'
      }
      
      toast({
        title: 'Status aktualisiert',
        description: message,
      })
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      })
    },
  })
}

export const useDeleteHelpRequest = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.deleteHelpRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-requests'] })
      toast({
        title: 'Hilfe-Anfrage gelöscht',
        description: 'Die Hilfe-Anfrage wurde erfolgreich gelöscht.',
      })
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      })
    },
  })
}

// WebSocket notification handler hook
export const useHelpRequestNotifications = () => {
  const queryClient = useQueryClient()
  const [notificationCount, setNotificationCount] = useState(0)

  useEffect(() => {
    const handleHelpRequest = () => {
      queryClient.invalidateQueries({ queryKey: ['help-requests'] })
      setNotificationCount(prev => prev + 1)
      
      // Custom event for components to listen to
      window.dispatchEvent(new CustomEvent('help:request'))
    }

    const handleHelpUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['help-requests'] })
      
      // Custom event for components to listen to
      window.dispatchEvent(new CustomEvent('help:update'))
    }

    const handleHelpDelete = () => {
      queryClient.invalidateQueries({ queryKey: ['help-requests'] })
      
      // Custom event for components to listen to
      window.dispatchEvent(new CustomEvent('help:delete'))
    }

    // Listen for custom events (these will be dispatched by the WebSocket hook)
    window.addEventListener('help:request', handleHelpRequest)
    window.addEventListener('help:update', handleHelpUpdate)
    window.addEventListener('help:delete', handleHelpDelete)

    return () => {
      window.removeEventListener('help:request', handleHelpRequest)
      window.removeEventListener('help:update', handleHelpUpdate)
      window.removeEventListener('help:delete', handleHelpDelete)
    }
  }, [queryClient])

  const clearNotifications = () => {
    setNotificationCount(0)
  }

  return {
    notificationCount,
    clearNotifications,
  }
} 