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

// API Functions
const api = {
  // Users
  getUsers: async (): Promise<User[]> => {
    const response = await fetch('/api/users')
    if (!response.ok) throw new Error('Failed to fetch users')
    return response.json()
  },

  createUser: async (data: { name: string; email?: string }): Promise<User> => {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to create user')
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

export const useCreateUser = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: api.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({
        title: 'Benutzer erstellt',
        description: 'Der Benutzer wurde erfolgreich erstellt.',
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