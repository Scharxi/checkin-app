import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const createUserSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(50, 'Name zu lang'),
  email: z.string().email().optional(),
})

const findUserSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
})

export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')

    // Wenn ein Name angegeben ist, suche nach diesem User
    if (name) {
      const user = await prisma.user.findFirst({
        where: { name },
        include: {
          checkIns: {
            where: { isActive: true },
            include: { location: true },
          },
        },
      })

      if (!user) {
        return NextResponse.json(
          { error: 'Benutzer nicht gefunden' },
          { status: 404 }
        )
      }

      return NextResponse.json(user)
    }

    // Ansonsten alle User zurückgeben
    const users = await prisma.user.findMany({
      include: {
        checkIns: {
          where: { isActive: true },
          include: { location: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Benutzer' },
      { status: 500 }
    )
  }
}

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { name, email } = createUserSchema.parse(body)

    const user = await prisma.user.create({
      data: { name, email },
      include: {
        checkIns: {
          where: { isActive: true },
          include: { location: true },
        },
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ungültige Eingabedaten', details: error.errors },
        { status: 400 }
      )
    }

    // Prisma unique constraint error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[]
        if (target?.includes('name')) {
          return NextResponse.json(
            { error: 'Dieser Name ist bereits vergeben. Bitte wähle einen anderen Namen.' },
            { status: 409 }
          )
        }
        if (target?.includes('email')) {
          return NextResponse.json(
            { error: 'Diese E-Mail-Adresse ist bereits vergeben.' },
            { status: 409 }
          )
        }
      }
    }

    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Benutzers' },
      { status: 500 }
    )
  }
} 