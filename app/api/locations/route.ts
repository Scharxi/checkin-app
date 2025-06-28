import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autoDeleteEmptyTemporaryLocations } from '@/app/api/locations/temporary/route'
import { z } from 'zod'

const createLocationSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  description: z.string().min(1, 'Beschreibung ist erforderlich'),
  icon: z.string().min(1, 'Icon ist erforderlich'),
  color: z.string().min(1, 'Farbe ist erforderlich'),
})

export const GET = async () => {
  try {
    // Auto-delete empty temporary locations before fetching
    await autoDeleteEmptyTemporaryLocations()

    const locations = await prisma.location.findMany({
      where: { isActive: true },
      include: {
        checkIns: {
          where: { isActive: true },
          include: { user: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Transform to include user count and current users
    const locationsWithUsers = locations.map(location => ({
      id: location.id,
      name: location.name,
      description: location.description,
      icon: location.icon,
      color: location.color,
      isActive: location.isActive,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
      users: location.checkIns.length,
      currentUsers: location.checkIns.map(checkIn => ({
        id: checkIn.user.id,
        name: checkIn.user.name,
        checkedInAt: checkIn.checkedInAt,
      })),
    }))

    return NextResponse.json(locationsWithUsers)
  } catch (error) {
    console.error('Error fetching locations:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Standorte' },
      { status: 500 }
    )
  }
}

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const data = createLocationSchema.parse(body)

    const location = await prisma.location.create({
      data,
      include: {
        checkIns: {
          where: { isActive: true },
          include: { user: true },
        },
      },
    })

    const locationWithUsers = {
      ...location,
      users: location.checkIns.length,
      currentUsers: location.checkIns.map(checkIn => ({
        id: checkIn.user.id,
        name: checkIn.user.name,
        checkedInAt: checkIn.checkedInAt,
      })),
    }

    return NextResponse.json(locationWithUsers, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ungültige Eingabedaten', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating location:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Standorts' },
      { status: 500 }
    )
  }
} 