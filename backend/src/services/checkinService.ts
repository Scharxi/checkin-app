import { prisma } from '../lib/prisma'
import type { CheckInData, CheckOutData, CheckInResponse, LocationWithUsers } from '../types/events'
import { z } from 'zod'

const checkInSchema = z.object({
  userId: z.string().min(1, 'User ID ist erforderlich'),
  locationId: z.string().min(1, 'Location ID ist erforderlich'),
})

const checkOutSchema = z.object({
  checkInId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
}).refine(data => data.checkInId || data.userId, {
  message: 'Either checkInId or userId must be provided'
})

export class CheckInService {
  async checkIn(data: CheckInData): Promise<{ type: 'checkin' | 'checkout'; checkIn: CheckInResponse }> {
    const { userId, locationId } = checkInSchema.parse(data)

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

        return {
          type: 'checkout',
          checkIn: updatedCheckIn as CheckInResponse,
        }
      } else {
        // Check out from current location first
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

    return {
      type: 'checkin',
      checkIn: newCheckIn as CheckInResponse,
    }
  }

  async checkOut(data: CheckOutData): Promise<CheckInResponse> {
    const { checkInId, userId } = checkOutSchema.parse(data)

    let whereClause
    if (checkInId) {
      whereClause = { id: checkInId }
    } else if (userId) {
      whereClause = { userId, isActive: true }
    } else {
      throw new Error('Either checkInId or userId must be provided')
    }

    const updatedCheckIn = await prisma.checkIn.updateMany({
      where: whereClause,
      data: {
        isActive: false,
        checkedOutAt: new Date(),
      },
    })

    if (updatedCheckIn.count === 0) {
      throw new Error('No active check-in found')
    }

    // Get the updated check-in with relations
    const checkIn = await prisma.checkIn.findFirst({
      where: whereClause,
      include: {
        user: true,
        location: true,
      },
      orderBy: { checkedOutAt: 'desc' },
    })

    if (!checkIn) {
      throw new Error('Check-in not found after update')
    }

    return checkIn as CheckInResponse
  }

  async getActiveCheckIns(): Promise<CheckInResponse[]> {
    const checkIns = await prisma.checkIn.findMany({
      where: { isActive: true },
      include: {
        user: true,
        location: true,
      },
      orderBy: { checkedInAt: 'desc' },
    })

    return checkIns as CheckInResponse[]
  }

  async getLocationsWithUsers(): Promise<LocationWithUsers[]> {
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

    return locations.map((location: any) => ({
      id: location.id,
      name: location.name,
      description: location.description,
      icon: location.icon,
      color: location.color,
      isActive: location.isActive,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
      users: location.checkIns.length,
      currentUsers: location.checkIns.map((checkIn: any) => ({
        id: checkIn.user.id,
        name: checkIn.user.name,
        checkedInAt: checkIn.checkedInAt,
      })),
    }))
  }
} 