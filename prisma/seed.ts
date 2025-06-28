import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const initialLocations = [
  {
    id: "office",
    name: "Büro",
    description: "Arbeitsplatz im Hauptgebäude",
    icon: "Briefcase",
    color: "bg-blue-500",
  },
  {
    id: "cafe",
    name: "Café Central", 
    description: "Gemütliches Café in der Innenstadt",
    icon: "Coffee",
    color: "bg-amber-500",
  },
  {
    id: "gym",
    name: "Fitnessstudio",
    description: "Modernes Fitnessstudio mit Geräten",
    icon: "Dumbbell",
    color: "bg-red-500",
  },
  {
    id: "library",
    name: "Stadtbibliothek",
    description: "Ruhiger Ort zum Lernen und Lesen",
    icon: "Book",
    color: "bg-green-500",
  },
  {
    id: "mall",
    name: "Einkaufszentrum",
    description: "Shopping und Freizeit",
    icon: "ShoppingBag",
    color: "bg-purple-500",
  },
  {
    id: "coworking",
    name: "Co-Working Space",
    description: "Flexibler Arbeitsplatz",
    icon: "Users",
    color: "bg-teal-500",
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