const WEBSOCKET_SERVER_URL = process.env.WEBSOCKET_SERVER_URL || 'http://localhost:3001'

export interface LocationBroadcastData {
  id: string
  name: string
  description: string
  icon: string
  color: string
  isActive: boolean
  isTemporary?: boolean
  createdBy?: string | null
  createdAt: string
  updatedAt: string
  users: number
  currentUsers: Array<{
    id: string
    name: string
    checkedInAt: string
  }>
}

export interface LocationDeletedData {
  id: string
  name: string
}

export interface HelpRequestData {
  id: string
  requesterId: string
  locationId: string
  message: string | null
  status: string
  createdAt: string
  updatedAt: string
  requester: {
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

const broadcastToWebSocket = async (endpoint: string, data: any): Promise<void> => {
  try {
    const response = await fetch(`${WEBSOCKET_SERVER_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      console.warn(`Failed to broadcast to WebSocket: ${response.status}`)
    }
  } catch (error) {
    // Don't throw errors, just log them - WebSocket broadcasting is not critical
    console.warn('WebSocket broadcast failed:', error)
  }
}

export const broadcastLocationCreated = async (location: LocationBroadcastData): Promise<void> => {
  await broadcastToWebSocket('/broadcast/location-created', location)
}

export const broadcastLocationDeleted = async (locationData: LocationDeletedData): Promise<void> => {
  await broadcastToWebSocket('/broadcast/location-deleted', locationData)
}

export const broadcastHelpRequest = async (helpRequest: HelpRequestData): Promise<void> => {
  await broadcastToWebSocket('/broadcast/help-request', helpRequest)
}

export const broadcastHelpRequestUpdate = async (helpRequest: HelpRequestData): Promise<void> => {
  await broadcastToWebSocket('/broadcast/help-request-update', helpRequest)
}

// General broadcast function for any event
export const broadcast = async (eventType: string, data: any): Promise<void> => {
  await broadcastToWebSocket(`/broadcast/${eventType}`, data)
} 