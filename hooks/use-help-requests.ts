import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from '@/hooks/use-toast'

export interface HelpRequest {
  id: string
  requesterId: string
  locationId: string
  targetUserId?: string | null
  message: string | null
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED'
  createdAt: string
  updatedAt: string
  requester: {
    id: string
    name: string
    email: string | null
  }
  targetUser?: {
    id: string
    name: string
    email: string | null
  } | null
  location: {
    id: string
    name: string
    description: string
    icon: string
    color: string
  }
}

// Hook für das Abrufen aller aktiven Hilfe-Anfragen
export const useHelpRequests = () => {
  return useQuery<HelpRequest[]>({
    queryKey: ['help-requests'],
    queryFn: async () => {
      const response = await fetch('/api/help-requests')
      if (!response.ok) {
        throw new Error('Failed to fetch help requests')
      }
      return response.json()
    },
    refetchInterval: 30000, // Alle 30 Sekunden aktualisieren
  })
}

// Hook für das Erstellen einer neuen Hilfe-Anfrage
export const useCreateHelpRequest = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { requesterId: string; locationId: string; targetUserId?: string; message?: string }) => {
      const response = await fetch('/api/help-requests', {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-requests'] })
      toast({
        title: 'Hilfe-Anfrage erstellt',
        description: 'Ihre Hilfe-Anfrage wurde erfolgreich versendet.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// Hook für das Aktualisieren einer Hilfe-Anfrage
export const useUpdateHelpRequest = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { id: string; status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED' }) => {
      const response = await fetch(`/api/help-requests/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: data.status }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update help request')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-requests'] })
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// Hook für das Löschen einer Hilfe-Anfrage
export const useDeleteHelpRequest = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/help-requests/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete help request')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-requests'] })
      toast({
        title: 'Hilfe-Anfrage gelöscht',
        description: 'Die Hilfe-Anfrage wurde erfolgreich gelöscht.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// Hook für WebSocket-Benachrichtigungen
export const useHelpRequestNotifications = (currentUserId?: string) => {
  const queryClient = useQueryClient()
  const [notifications, setNotifications] = useState<HelpRequest[]>([])
  
  useEffect(() => {
    const handleHelpRequest = (event: CustomEvent<HelpRequest>) => {
      const helpRequest = event.detail
      
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['help-requests'] })
      
      // Don't show notification for own requests
      if (currentUserId && helpRequest.requesterId === currentUserId) {
        return
      }
      
      // Add to notifications
      setNotifications(prev => [helpRequest, ...prev.slice(0, 4)]) // Keep last 5 notifications
      
      // Show toast notification
      toast({
        title: '🆘 Hilfe benötigt!',
        description: `${helpRequest.requester.name} braucht Hilfe in ${helpRequest.location.name}`,
        duration: 8000,
      })
    }
    
    const handleHelpRequestUpdate = (event: CustomEvent<HelpRequest>) => {
      const helpRequest = event.detail
      
      queryClient.invalidateQueries({ queryKey: ['help-requests'] })
      
      // Don't show update notifications for own requests
      if (currentUserId && helpRequest.requesterId === currentUserId) {
        return
      }
      
      if (helpRequest.status === 'RESOLVED') {
        toast({
          title: '✅ Hilfe-Anfrage gelöst',
          description: `Die Hilfe-Anfrage von ${helpRequest.requester.name} wurde gelöst.`,
        })
      }
    }
    
    const handleHelpRequestDelete = (event: CustomEvent<{ id: string; helpRequest: HelpRequest }>) => {
      const data = event.detail
      
      queryClient.invalidateQueries({ queryKey: ['help-requests'] })
      
      // Remove from notifications
      setNotifications(prev => prev.filter(n => n.id !== data.id))
    }
    
    // Listen for custom events dispatched by the WebSocket hook
    window.addEventListener('help:request', handleHelpRequest as EventListener)
    window.addEventListener('help:update', handleHelpRequestUpdate as EventListener)
    window.addEventListener('help:delete', handleHelpRequestDelete as EventListener)
    
    return () => {
      // Cleanup listeners
      window.removeEventListener('help:request', handleHelpRequest as EventListener)
      window.removeEventListener('help:update', handleHelpRequestUpdate as EventListener)
      window.removeEventListener('help:delete', handleHelpRequestDelete as EventListener)
    }
  }, [queryClient, currentUserId])
  
  const clearNotifications = () => {
    setNotifications([])
  }
  
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }
  
  return {
    notifications,
    clearNotifications,
    removeNotification,
  }
} 