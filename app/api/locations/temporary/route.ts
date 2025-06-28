import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastLocationCreated, broadcastLocationDeleted } from '@/lib/websocket-broadcast'
import { z } from 'zod'

const createTemporaryLocationSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(50, 'Name darf maximal 50 Zeichen lang sein'),
  description: z.string().max(200, 'Beschreibung darf maximal 200 Zeichen lang sein').optional(),
  createdBy: z.string().min(1, 'User ID ist erforderlich'),
})

// Create temporary location
export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const data = createTemporaryLocationSchema.parse(body)

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: data.createdBy }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User nicht gefunden' },
        { status: 404 }
      )
    }

    // Create temporary location with fixed icon and color
    const location = await prisma.location.create({
      data: {
        name: data.name,
        description: data.description || 'Temporäre Check-in-Karte',
        icon: 'MapPin', // Fixed icon for temporary locations
        color: 'bg-orange-500', // Fixed color for temporary locations
        isTemporary: true,
        createdBy: data.createdBy,
      }
    })

    // Get location with check-ins and users
    const locationWithData = await prisma.location.findUnique({
      where: { id: location.id },
      include: {
        checkIns: {
          where: { isActive: true },
          include: { user: true },
        },
      },
    })

    if (!locationWithData) {
      return NextResponse.json(
        { error: 'Location konnte nicht geladen werden' },
        { status: 500 }
      )
    }

    const locationWithUsers = {
      ...locationWithData,
      users: locationWithData.checkIns.length,
      currentUsers: locationWithData.checkIns.map(checkIn => ({
        id: checkIn.user.id,
        name: checkIn.user.name,
        checkedInAt: checkIn.checkedInAt,
      })),
    }

    // Broadcast location creation update via WebSocket
    await broadcastLocationCreated({
      ...locationWithUsers,
      createdAt: locationWithUsers.createdAt.toISOString(),
      updatedAt: locationWithUsers.updatedAt.toISOString(),
      currentUsers: locationWithUsers.currentUsers.map(user => ({
        ...user,
        checkedInAt: user.checkedInAt.toISOString(),
      })),
    })

    return NextResponse.json(locationWithUsers, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ungültige Eingabedaten', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating temporary location:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der temporären Karte' },
      { status: 500 }
    )
  }
}

// Auto-delete temporary locations with no active check-ins
export const autoDeleteEmptyTemporaryLocations = async () => {
  try {
    // Find temporary locations with no active check-ins that are either:
    // 1. Older than 5 minutes (to allow initial usage)
    // 2. Have had check-ins before (meaning they were used but are now empty)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    
    const candidatesForDeletion = await prisma.location.findMany({
      where: {
        isTemporary: true,
        isActive: true,
        checkIns: {
          none: {
            isActive: true
          }
        },
        OR: [
          // Location is older than 5 minutes
          {
            createdAt: {
              lt: fiveMinutesAgo
            }
          },
          // Location has had check-ins before (but none active now)
          {
            checkIns: {
              some: {}
            }
          }
        ]
      }
    })

    if (candidatesForDeletion.length > 0) {
      // Actually delete empty temporary locations from database
      // Double-check that these are temporary locations with no active check-ins
      await prisma.location.deleteMany({
        where: {
          id: {
            in: candidatesForDeletion.map(loc => loc.id)
          },
          isTemporary: true, // Extra safety: only delete temporary locations
          checkIns: {
            none: {
              isActive: true // Extra safety: ensure no active check-ins
            }
          }
        }
      })

      // Broadcast deletion events for each deleted location
      for (const location of candidatesForDeletion) {
        const locationData = {
          id: location.id,
          name: location.name
        }
        
        // Broadcast via WebSocket
        await broadcastLocationDeleted(locationData)
      }

      console.log(`Permanently deleted ${candidatesForDeletion.length} empty temporary locations from database`)
    }
  } catch (error) {
    console.error('Error auto-deleting empty temporary locations:', error)
  }
} 