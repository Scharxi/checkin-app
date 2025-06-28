import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from './use-toast'
import { useWebsockets } from './use-websockets'

// Re-export websocket connection status
export const useWebsocketStatus = () => {
  const { isConnected, error } = useWebsockets()
  return { isConnected, error }
}

// Types
export interface User {
  id: string
  name: string
  email?: string
  createdAt: string
  updatedAt: string
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
  createdBy?: string
  creator?: {
    id: string
    name: string
  }
  createdAt: string
  updatedAt: string
  users: number
  currentUsers: {
    id: string
    name: string
    checkedInAt: string
  }[]
}

export interface CheckIn {
  id: string
  userId: string
  locationId: string
  checkedInAt: string
  checkedOutAt?: string
  isActive: boolean
  user: User
  location: Location
}

// LocalStorage Helper
const USER_STORAGE_KEY = 'checkin-app-user'
const USER_NAME_STORAGE_KEY = 'checkin-app-user-name'

export const userStorage = {
  getUser: (): User | null => {
    if (typeof window === 'undefined') return null
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  },
  
  setUser: (user: User): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
      localStorage.setItem(USER_NAME_STORAGE_KEY, user.name)
    } catch (error) {
      console.warn('Could not save user to localStorage:', error)
    }
  },
  
  getUserName: (): string | null => {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem(USER_NAME_STORAGE_KEY)
    } catch {
      return null
    }
  },
  
  clearUser: (): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(USER_STORAGE_KEY)
      localStorage.removeItem(USER_NAME_STORAGE_KEY)
    } catch (error) {
      console.warn('Could not clear user from localStorage:', error)
    }
  }
}

// API Functions
const api = {
  // Users
  getUsers: async (): Promise<User[]> => {
    const response = await fetch('/api/users')
    if (!response.ok) throw new Error('Failed to fetch users')
    return response.json()
  },

  getUserByName: async (name: string): Promise<User> => {
    const response = await fetch(`/api/users?name=${encodeURIComponent(name)}`)
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('USER_NOT_FOUND')
      }
      throw new Error('Failed to fetch user')
    }
    return response.json()
  },

  createUser: async (data: { name: string; email?: string }): Promise<User> => {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      if (response.status === 409) {
        throw new Error('NAME_ALREADY_EXISTS')
      }
      throw new Error(errorData.error || 'Failed to create user')
    }
    return response.json()
  },

  // Locations
  getLocations: async (): Promise<Location[]> => {
    const response = await fetch('/api/locations')
    if (!response.ok) throw new Error('Failed to fetch locations')
    return response.json()
  },

  createLocation: async (data: {
    name: string
    description: string
    icon: string
    color: string
  }): Promise<Location> => {
    const response = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to create location')
    return response.json()
  },

  // Temporary Locations
  createTemporaryLocation: async (data: {
    name: string
    description?: string
    createdBy: string
  }): Promise<Location> => {
    const response = await fetch('/api/locations/temporary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create temporary location')
    }
    return response.json()
  },

  // CheckIns - These are now handled via Websockets
  getCheckIns: async (): Promise<CheckIn[]> => {
    const response = await fetch('/api/checkins')
    if (!response.ok) throw new Error('Failed to fetch check-ins')
    return response.json()
  },
}

// Hooks
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: api.getUsers,
  })
}

export const useAutoLogin = () => {
  const { toast } = useToast()
  
  return useQuery({
    queryKey: ['auto-login'],
    queryFn: async () => {
      const storedName = userStorage.getUserName()
      if (!storedName) {
        return null
      }
      
      try {
        const user = await api.getUserByName(storedName)
        userStorage.setUser(user) // Update stored user data
        return user
      } catch (error) {
        if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
          // User was deleted, clear storage
          userStorage.clearUser()
          toast({
            title: 'Benutzer nicht gefunden',
            description: 'Ihr Benutzerkonto wurde nicht gefunden. Bitte melden Sie sich erneut an.',
            variant: 'destructive',
          })
          return null
        }
        
        console.error('Auto-login error:', error)
        // Don't show error for network issues during auto-login
        return null
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useCreateUser = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: api.createUser,
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      userStorage.setUser(user)
      toast({
        title: 'Erfolgreich!',
        description: `Benutzer "${user.name}" wurde erstellt.`,
      })
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
      
      if (message === 'NAME_ALREADY_EXISTS') {
        toast({
          title: 'Name bereits vergeben',
          description: 'Dieser Name wird bereits verwendet. Bitte wählen Sie einen anderen.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Fehler beim Erstellen',
          description: 'Der Benutzer konnte nicht erstellt werden.',
          variant: 'destructive',
        })
      }
    },
  })
}

export const useLoginWithName = () => {
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (name: string) => {
      const user = await api.getUserByName(name)
      userStorage.setUser(user)
      return user
    },
    onSuccess: (user) => {
      toast({
        title: 'Anmeldung erfolgreich!',
        description: `Willkommen zurück, ${user.name}!`,
      })
    },
    onError: (error) => {
      if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
        toast({
          title: 'Benutzer nicht gefunden',
          description: 'Dieser Benutzer existiert nicht. Möchten Sie einen neuen Account erstellen?',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Anmeldung fehlgeschlagen',
          description: 'Ein unerwarteter Fehler ist aufgetreten.',
          variant: 'destructive',
        })
      }
    },
  })
}

export const useLogout = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { disconnect } = useWebsockets()

  return useMutation({
    mutationFn: async () => {
      userStorage.clearUser()
      disconnect() // Disconnect websocket
      queryClient.clear() // Clear all cached data
    },
    onSuccess: () => {
      toast({
        title: 'Abgemeldet',
        description: 'Sie wurden erfolgreich abgemeldet.',
      })
    },
  })
}

export const useLocations = () => {
  return useQuery({
    queryKey: ['locations'],
    queryFn: api.getLocations,
  })
}

export const useCreateLocation = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: api.createLocation,
    onSuccess: (location) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast({
        title: 'Erfolgreich!',
        description: `Location "${location.name}" wurde erstellt.`,
      })
    },
    onError: () => {
      toast({
        title: 'Fehler beim Erstellen',
        description: 'Die Location konnte nicht erstellt werden.',
        variant: 'destructive',
      })
    },
  })
}

export const useCreateTemporaryLocation = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: api.createTemporaryLocation,
    onSuccess: (location) => {
      // Real-time events will handle the UI update automatically
      // Just show the success message
      toast({
        title: 'Temporäre Karte erstellt!',
        description: `"${location.name}" wurde als temporäre Karte erstellt.`,
      })
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Fehler beim Erstellen'
      toast({
        title: 'Fehler beim Erstellen',
        description: message,
        variant: 'destructive',
      })
    },
  })
}

export const useCheckIns = () => {
  return useQuery({
    queryKey: ['checkins'],
    queryFn: api.getCheckIns,
  })
}

// Updated hooks using Websockets instead of HTTP requests
export const useCheckIn = () => {
  const { toast } = useToast()
  const { checkIn } = useWebsockets()

  return useMutation({
    mutationFn: async ({ userId, locationId }: { userId: string; locationId: string }) => {
      const result = await checkIn({ userId, locationId })
      if (!result.success) {
        throw new Error(result.error || 'Check-in fehlgeschlagen')
      }
      return result.data
    },
    onSuccess: (data) => {
      if (data) {
        const action = data.isActive ? 'eingecheckt' : 'ausgecheckt'
        toast({
          title: `Erfolgreich ${action}!`,
          description: `Sie sind ${action} bei ${data.location.name}.`,
        })
      }
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Check-in fehlgeschlagen'
      toast({
        title: 'Check-in Fehler',
        description: message,
        variant: 'destructive',
      })
    },
  })
}

export const useCheckOut = () => {
  const { toast } = useToast()
  const { checkOut } = useWebsockets()

  return useMutation({
    mutationFn: async ({ checkInId, userId }: { checkInId?: string; userId?: string }) => {
      const result = await checkOut({ checkInId, userId })
      if (!result.success) {
        throw new Error(result.error || 'Check-out fehlgeschlagen')
      }
      return result.data
    },
    onSuccess: (data) => {
      if (data) {
        toast({
          title: 'Erfolgreich ausgecheckt!',
          description: `Sie sind ausgecheckt bei ${data.location.name}.`,
        })
      }
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Check-out fehlgeschlagen'
      toast({
        title: 'Check-out Fehler',
        description: message,
        variant: 'destructive',
      })
    },
  })
} 