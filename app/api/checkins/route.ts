import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/app/api/sse/route'
import { z } from 'zod'

const checkInSchema = z.object({
  userId: z.string().min(1, 'User ID ist erforderlich'),
  locationId: z.string().min(1, 'Location ID ist erforderlich'),
})

const checkOutSchema = z.object({
  checkInId: z.string().min(1, 'CheckIn ID ist erforderlich'),
})

// Get all active check-ins
export const GET = async () => {
  try {
    const checkIns = await prisma.checkIn.findMany({
      where: { isActive: true },
      include: {
        user: true,
        location: true,
      },
      orderBy: { checkedInAt: 'desc' },
    })

    return NextResponse.json(checkIns)
  } catch (error) {
    console.error('Error fetching check-ins:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Check-ins' },
      { status: 500 }
    )
  }
}

// Check-in user to location
export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { userId, locationId } = checkInSchema.parse(body)

    // Check if user is already checked in somewhere
    const existingCheckIn = await prisma.checkIn.findFirst({
      where: {
        userId,
        isActive: true,
      },
    })

    if (existingCheckIn) {
      // If checking into the same location, check out
      if (existingCheckIn.locationId === locationId) {
        const updatedCheckIn = await prisma.checkIn.update({
          where: { id: existingCheckIn.id },
          data: {
            isActive: false,
            checkedOutAt: new Date(),
          },
          include: {
            user: true,
            location: true,
          },
        })

        // Broadcast checkout update
        await broadcastUpdate('checkout', updatedCheckIn)

        return NextResponse.json({
          type: 'checkout',
          checkIn: updatedCheckIn,
        })
      } else {
        // Check out from current location and check into new one
        await prisma.checkIn.update({
          where: { id: existingCheckIn.id },
          data: {
            isActive: false,
            checkedOutAt: new Date(),
          },
        })
      }
    }

    // Create new check-in
    const newCheckIn = await prisma.checkIn.create({
      data: {
        userId,
        locationId,
      },
      include: {
        user: true,
        location: true,
      },
    })

    // Broadcast checkin update
    await broadcastUpdate('checkin', newCheckIn)

    return NextResponse.json({
      type: 'checkin',
      checkIn: newCheckIn,
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ungültige Eingabedaten', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error processing check-in:', error)
    return NextResponse.json(
      { error: 'Fehler beim Check-in' },
      { status: 500 }
    )
  }
}

// Manual check-out
export const DELETE = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { checkInId } = checkOutSchema.parse(body)

    const updatedCheckIn = await prisma.checkIn.update({
      where: { id: checkInId },
      data: {
        isActive: false,
        checkedOutAt: new Date(),
      },
      include: {
        user: true,
        location: true,
      },
    })

    // Broadcast checkout update
    await broadcastUpdate('checkout', updatedCheckIn)

    return NextResponse.json({
      type: 'checkout',
      checkIn: updatedCheckIn,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ungültige Eingabedaten', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error checking out:', error)
    return NextResponse.json(
      { error: 'Fehler beim Check-out' },
      { status: 500 }
    )
  }
} 