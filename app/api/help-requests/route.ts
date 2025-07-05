import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcast } from '@/lib/websocket-broadcast'

// GET - Alle aktiven Hilfe-Anfragen abrufen
export async function GET() {
  try {
    const helpRequests = await prisma.helpRequest.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        location: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            color: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(helpRequests)
  } catch (error) {
    console.error('Error fetching help requests:', error)
    return NextResponse.json({ error: 'Failed to fetch help requests' }, { status: 500 })
  }
}

// POST - Neue Hilfe-Anfrage erstellen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requesterId, locationId, targetUserId, message } = body

    if (!requesterId || !locationId) {
      return NextResponse.json({ error: 'RequesterId and locationId are required' }, { status: 400 })
    }

    // Prüfen ob bereits eine aktive Anfrage existiert
    const existingRequest = await prisma.helpRequest.findFirst({
      where: {
        requesterId,
        locationId,
        status: 'ACTIVE'
      }
    })

    if (existingRequest) {
      return NextResponse.json({ error: 'You already have an active help request for this location' }, { status: 409 })
    }

    const helpRequest = await prisma.helpRequest.create({
      data: {
        requesterId,
        locationId,
        targetUserId: targetUserId || null,
        message: message || null
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        location: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            color: true
          }
        }
      }
    })

    // Broadcast die neue Hilfe-Anfrage über WebSocket
    broadcast('help:request', helpRequest)

    return NextResponse.json(helpRequest, { status: 201 })
  } catch (error) {
    console.error('Error creating help request:', error)
    return NextResponse.json({ error: 'Failed to create help request' }, { status: 500 })
  }
} 