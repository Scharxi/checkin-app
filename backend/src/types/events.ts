export interface CheckInData {
  userId: string
  locationId: string
}

export interface CheckOutData {
  checkInId?: string
  userId?: string
}

export interface CheckInResponse {
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

export interface LocationWithUsers {
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

export interface ServerToClientEvents {
  'checkin:update': (data: CheckInResponse) => void
  'checkout:update': (data: CheckInResponse) => void
  'locations:update': (data: LocationWithUsers[]) => void
  'location:created': (data: LocationWithUsers) => void
  'location:deleted': (data: { id: string; name: string }) => void
  'checkins:initial': (data: CheckInResponse[]) => void
  'locations:initial': (data: LocationWithUsers[]) => void
  'error': (error: { message: string; code?: string }) => void
}

export interface ClientToServerEvents {
  'user:checkin': (data: CheckInData, callback: (response: { success: boolean; data?: CheckInResponse; error?: string }) => void) => void
  'user:checkout': (data: CheckOutData, callback: (response: { success: boolean; data?: CheckInResponse; error?: string }) => void) => void
  'get:initial-data': (callback: (response: { checkins: CheckInResponse[]; locations: LocationWithUsers[] }) => void) => void
} 