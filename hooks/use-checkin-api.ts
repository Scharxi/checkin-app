import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from './use-toast'

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

  // CheckIns
  getCheckIns: async (): Promise<CheckIn[]> => {
    const response = await fetch('/api/checkins')
    if (!response.ok) throw new Error('Failed to fetch check-ins')
    return response.json()
  },

  checkIn: async (data: { userId: string; locationId: string }) => {
    const response = await fetch('/api/checkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to check in')
    return response.json()
  },

  checkOut: async (checkInId: string) => {
    const response = await fetch('/api/checkins', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkInId }),
    })
    if (!response.ok) throw new Error('Failed to check out')
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
            title: 'Account nicht gefunden',
            description: 'Dein gespeicherter Account wurde nicht gefunden. Bitte melde dich erneut an.',
            variant: 'destructive',
          })
        }
        return null
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 Minuten
  })
}

export const useCreateUser = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: api.createUser,
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      userStorage.setUser(user) // Store user in localStorage
      toast({
        title: 'Anmeldung erfolgreich',
        description: `Willkommen, ${user.name}! Du wirst automatisch wieder angemeldet.`,
      })
    },
    onError: (error: Error) => {
      let title = 'Fehler'
      let description = error.message
      
      if (error.message === 'NAME_ALREADY_EXISTS') {
        title = 'Name bereits vergeben'
        description = 'Dieser Name ist bereits vergeben. Bitte wähle einen anderen Namen oder gib deinen Namen nochmal ein, falls du dich wieder anmelden möchtest.'
      }
      
      toast({
        title,
        description,
        variant: 'destructive',
      })
    },
  })
}

export const useLoginWithName = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: api.getUserByName,
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      userStorage.setUser(user) // Store user in localStorage
      toast({
        title: 'Willkommen zurück!',
        description: `Hallo ${user.name}, schön dass du wieder da bist!`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Anmeldung fehlgeschlagen',
        description: 'Benutzer mit diesem Namen nicht gefunden.',
        variant: 'destructive',
      })
    },
  })
}

export const useLogout = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async () => {
      userStorage.clearUser()
      return true
    },
    onSuccess: () => {
      queryClient.clear()
      toast({
        title: 'Abgemeldet',
        description: 'Du wurdest erfolgreich abgemeldet.',
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast({
        title: 'Standort erstellt',
        description: 'Der Standort wurde erfolgreich erstellt.',
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

export const useCheckIns = () => {
  return useQuery({
    queryKey: ['checkins'],
    queryFn: api.getCheckIns,
  })
}

export const useCheckIn = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: api.checkIn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['checkins'] })
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      
      const action = data.type === 'checkin' ? 'eingecheckt' : 'ausgecheckt'
      toast({
        title: `${action.charAt(0).toUpperCase() + action.slice(1)}`,
        description: `Du hast dich erfolgreich ${action}.`,
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

export const useCheckOut = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: api.checkOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkins'] })
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast({
        title: 'Ausgecheckt',
        description: 'Du hast dich erfolgreich ausgecheckt.',
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