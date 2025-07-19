import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import { useState, useEffect } from 'react'

// Dynamische API Base URL-Erkennung zur Laufzeit
const getApiBaseUrl = () => {
  // If environment variable is set, use it (for custom configurations)
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    console.log('🔍 Using environment API URL:', process.env.NEXT_PUBLIC_API_URL)
    return process.env.NEXT_PUBLIC_API_URL
  }

  if (typeof window === 'undefined') {
    // Server-side rendering fallback
    return 'http://localhost:3001'
  }

  // Client-side: Automatische URL-Erkennung
  const currentHost = window.location.hostname
  const currentProtocol = window.location.protocol
  const currentPort = window.location.port
  
  console.log('🔍 Frontend-Details:')
  console.log('  - Hostname:', currentHost)
  console.log('  - Protocol:', currentProtocol)
  console.log('  - Port:', currentPort)
  console.log('  - Full URL:', window.location.href)
  
  // Entwicklung: localhost erkennen
  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    console.log('🔍 Development mode detected (localhost)')
    return 'http://localhost:3001'
  }
  
  // Server-Deployment: IMMER Port 3001 verwenden
  // Egal welcher Port für Frontend verwendet wird, Backend ist auf 3001
  const apiUrl = `${currentProtocol}//${currentHost}:3001`
  
  console.log('🔍 Server mode detected')
  console.log('🔍 API Base URL erkannt:', apiUrl)
  
  return apiUrl
}

// Types
export interface CheckIn {
  id: string
  userId: string
  locationId: string
  checkedInAt: string
  checkedOutAt: string | null
  isActive: boolean
  location: Location
}

export interface User {
  id: string
  name: string
  email: string | null
  createdAt: Date
  updatedAt: Date
  checkIns?: CheckIn[]
}

export interface Location {
  id: string
  name: string
  description: string
  icon: string
  color: string
  isActive: boolean
  isTemporary?: boolean
  createdAt: Date
  updatedAt: Date
  users: number
  currentUsers: Array<{
    id: string
    name: string
    checkedInAt: Date
  }>
}

// API functions that call backend endpoints
const api = {
  getLocations: async () => {
    const response = await fetch(`${getApiBaseUrl()}/api/locations`)
    if (!response.ok) {
      throw new Error('Failed to fetch locations')
    }
    return response.json()
  },

  getUsers: async () => {
    const response = await fetch(`${getApiBaseUrl()}/api/users`)
    if (!response.ok) {
      throw new Error('Failed to fetch users')
    }
    return response.json()
  },

  getUserByName: async (name: string) => {
    const response = await fetch(`${getApiBaseUrl()}/api/users?name=${encodeURIComponent(name)}`)
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error('Failed to fetch user')
    }
    return response.json()
  },

  createUser: async (userData: { name: string; email?: string }) => {
    const response = await fetch(`${getApiBaseUrl()}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create user')
    }
    return response.json()
  },

  checkIn: async (data: { userId: string; locationId: string }) => {
    const response = await fetch(`${getApiBaseUrl()}/api/checkins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to check in')
    }
    return response.json()
  },

  checkOut: async (data: { checkInId: string }) => {
    const response = await fetch(`${getApiBaseUrl()}/api/checkins`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to check out')
    }
    return response.json()
  },

  createTemporaryLocation: async (data: { name: string; description?: string; createdBy: string }) => {
    const response = await fetch(`${getApiBaseUrl()}/api/locations/temporary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create temporary location')
    }
    return response.json()
  },
}

// React Query hooks
export const useLocations = () => {
  return useQuery({
    queryKey: ['locations'],
    queryFn: api.getLocations,
    staleTime: 30000,
  })
}

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: api.getUsers,
    staleTime: 60000,
  })
}

export const useUserByName = (name: string) => {
  return useQuery({
    queryKey: ['user', name],
    queryFn: () => api.getUserByName(name),
    enabled: !!name,
    staleTime: 60000,
  })
}

export const useCreateUser = (options?: { silent?: boolean }) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      if (!options?.silent) {
        toast({
          title: 'Benutzer erstellt',
          description: 'Der neue Benutzer wurde erfolgreich erstellt.',
        })
      }
    },
    onError: (error: Error) => {
      if (!options?.silent) {
        toast({
          variant: 'destructive',
          title: 'Fehler',
          description: error.message,
        })
      }
    },
  })
}

export const useCheckIn = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.checkIn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      
      const isCheckout = data.type === 'checkout'
      toast({
        title: isCheckout ? 'Ausgecheckt' : 'Eingecheckt',
        description: isCheckout 
          ? `Du bist aus ${data.checkIn.location.name} ausgecheckt.`
          : `Du bist in ${data.checkIn.location.name} eingecheckt.`,
      })
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Fehler beim Check-in',
        description: error.message,
      })
    },
  })
}

export const useCheckOut = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.checkOut,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      
      toast({
        title: 'Ausgecheckt',
        description: `Du bist aus ${data.checkIn.location.name} ausgecheckt.`,
      })
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Fehler beim Check-out',
        description: error.message,
      })
    },
  })
}

export const useCreateTemporaryLocation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.createTemporaryLocation,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast({
        title: 'Temporäre Karte erstellt',
        description: `"${data.name}" wurde als temporäre Check-in-Karte erstellt.`,
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

// User Storage for login persistence
export const userStorage = {
  getUser: (): User | null => {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem('currentUser')
    return stored ? JSON.parse(stored) : null
  },
  setUser: (user: User | null) => {
    if (typeof window === 'undefined') return
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user))
    } else {
      localStorage.removeItem('currentUser')
    }
  }
}

// Authentication hooks
export function useLoginWithName(options?: { silent?: boolean }) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (name: string): Promise<User> => {
      const response = await fetch(`${getApiBaseUrl()}/api/users?name=${encodeURIComponent(name)}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Benutzer nicht gefunden')
        }
        throw new Error('Fehler beim Anmelden')
      }
      
      const user: User = await response.json()
      userStorage.setUser(user)
      return user
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      if (!options?.silent) {
        toast({
          title: 'Angemeldet',
          description: 'Erfolgreich angemeldet.',
        })
      }
    },
    onError: (error: Error) => {
      if (!options?.silent) {
        toast({
          variant: 'destructive',
          title: 'Anmeldung fehlgeschlagen',
          description: error.message,
        })
      }
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (): Promise<void> => {
      userStorage.setUser(null)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })
}

export function useAutoLogin() {
  return useQuery({
    queryKey: ['autoLogin'],
    queryFn: async (): Promise<User | null> => {
      const storedUser = userStorage.getUser()
      if (!storedUser) return null
      
      try {
        // Verify user still exists by name (more reliable than ID lookup)
        const response = await fetch(`${getApiBaseUrl()}/api/users?name=${encodeURIComponent(storedUser.name)}`)
        
        if (!response.ok) {
          // User doesn't exist anymore, clear storage
          userStorage.setUser(null)
          return null
        }
        
        const existingUser: User = await response.json()
        
        // Update stored user with latest data
        userStorage.setUser(existingUser)
        return existingUser
      } catch (error) {
        console.error('Auto-login failed:', error)
        userStorage.setUser(null)
        return null
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: false, // Don't retry on failure
  })
}

export function useWebsocketStatus() {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    // Simple websocket status check - could connect to actual websocket
    // For now, just assume connected if backend is reachable
    const checkConnection = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/users`, {
          method: 'HEAD',
        })
        setIsConnected(response.ok)
        setError(response.ok ? null : 'Backend not reachable')
      } catch (err) {
        setIsConnected(false)
        setError('Connection failed')
      }
    }
    
    checkConnection()
    const interval = setInterval(checkConnection, 30000) // Check every 30 seconds
    
    return () => clearInterval(interval)
  }, [])
  
  return { isConnected, error }
} 