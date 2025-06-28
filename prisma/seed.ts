import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const initialLocations = [
  {
    id: "server-room",
    name: "Server-Raum",
    description: "IT-Server und Netzwerkinfrastruktur",
    icon: "Server",
    color: "bg-gray-500",
  },
  {
    id: "room",
    name: "Zimmer",
    description: "Allgemeiner Raum",
    icon: "Home",
    color: "bg-blue-500",
  },
  {
    id: "bathroom",
    name: "Toilette",
    description: "Sanitärbereich",
    icon: "Bath",
    color: "bg-cyan-500",
  },
  {
    id: "field-kitchen",
    name: "Feldküche",
    description: "Mobile Küche für Events",
    icon: "ChefHat",
    color: "bg-orange-500",
  },
  {
    id: "event-room",
    name: "Eventraum",
    description: "Raum für Veranstaltungen und Events",
    icon: "Calendar",
    color: "bg-purple-500",
  },
  {
    id: "moderation",
    name: "Moderation",
    description: "Moderations- und Besprechungsraum",
    icon: "Mic",
    color: "bg-green-500",
  },
]

const main = async () => {
  console.log('🌱 Seeding database...')

  // Clear existing data
  await prisma.checkIn.deleteMany()
  await prisma.location.deleteMany()
  await prisma.user.deleteMany()

  // Create locations
  for (const location of initialLocations) {
    await prisma.location.create({
      data: location,
    })
  }

  console.log('✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 