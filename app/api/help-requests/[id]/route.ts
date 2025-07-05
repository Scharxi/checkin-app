import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcast } from '@/lib/websocket-broadcast'

// PUT - Status einer Hilfe-Anfrage aktualisieren
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !['ACTIVE', 'RESOLVED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Valid status is required' }, { status: 400 })
    }

    const helpRequest = await prisma.helpRequest.update({
      where: { id },
      data: { status },
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

    // Broadcast die Aktualisierung über WebSocket
    broadcast('help:update', helpRequest)

    return NextResponse.json(helpRequest)
  } catch (error) {
    console.error('Error updating help request:', error)
    return NextResponse.json({ error: 'Failed to update help request' }, { status: 500 })
  }
}

// DELETE - Hilfe-Anfrage löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const helpRequest = await prisma.helpRequest.delete({
      where: { id },
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

    // Broadcast die Löschung über WebSocket
    broadcast('help:delete', { id, helpRequest })

    return NextResponse.json({ message: 'Help request deleted successfully' })
  } catch (error) {
    console.error('Error deleting help request:', error)
    return NextResponse.json({ error: 'Failed to delete help request' }, { status: 500 })
  }
} 