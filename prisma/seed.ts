import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rotisang.com' },
    update: {},
    create: {
      email: 'admin@rotisang.com',
      name: 'Admin Roti Isang',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })
  console.log('✓ Admin user:', admin.email)

  // Create ingredients
  const ingredientsData = [
    { name: 'Tepung Terigu',  unit: 'gram',  currentStock: 10000, minStock: 2000, pricePerUnit: 0.013 },
    { name: 'Gula Pasir',    unit: 'gram',  currentStock: 5000,  minStock: 1000, pricePerUnit: 0.014 },
    { name: 'Garam',         unit: 'gram',  currentStock: 2000,  minStock: 500,  pricePerUnit: 0.005 },
    { name: 'Ragi Instan',   unit: 'gram',  currentStock: 500,   minStock: 100,  pricePerUnit: 0.15  },
    { name: 'Margarin',      unit: 'gram',  currentStock: 3000,  minStock: 500,  pricePerUnit: 0.02  },
    { name: 'Telur',         unit: 'butir', currentStock: 60,    minStock: 12,   pricePerUnit: 2500  },
    { name: 'Susu UHT',      unit: 'ml',    currentStock: 5000,  minStock: 1000, pricePerUnit: 0.018 },
    { name: 'Vanili',        unit: 'gram',  currentStock: 100,   minStock: 20,   pricePerUnit: 0.5   },
  ]

  const ingMap: Record<string, string> = {}

  for (const ing of ingredientsData) {
    // Check if ingredient already exists
    const existing = await prisma.ingredient.findFirst({ where: { name: ing.name } })
    if (existing) {
      ingMap[ing.name] = existing.id
      console.log(`✓ Ingredient (sudah ada): ${ing.name}`)
      continue
    }

    const created = await prisma.ingredient.create({
      data: {
        name: ing.name,
        unit: ing.unit,
        currentStock: ing.currentStock,
        minStock: ing.minStock,
        pricePerUnit: ing.pricePerUnit,
        stockMovements: {
          create: {
            type: 'IN',
            quantity: ing.currentStock,
            notes: 'Stok awal',
          },
        },
      },
    })
    ingMap[ing.name] = created.id
    console.log(`✓ Ingredient: ${ing.name}`)
  }

  // Create sample recipe
  const existingRecipe = await prisma.recipe.findFirst({ where: { name: 'Roti Isang Original' } })
  if (!existingRecipe) {
    const recipe = await prisma.recipe.create({
      data: {
        name: 'Roti Isang Original',
        description: 'Resep roti isang klasik dengan tekstur lembut dan rasa manis',
        servingsPerBatch: 20,
        ingredients: {
          create: [
            { ingredientId: ingMap['Tepung Terigu'], quantity: 500 },
            { ingredientId: ingMap['Gula Pasir'],    quantity: 80  },
            { ingredientId: ingMap['Garam'],         quantity: 5   },
            { ingredientId: ingMap['Ragi Instan'],   quantity: 7   },
            { ingredientId: ingMap['Margarin'],      quantity: 60  },
            { ingredientId: ingMap['Telur'],         quantity: 2   },
            { ingredientId: ingMap['Susu UHT'],      quantity: 200 },
            { ingredientId: ingMap['Vanili'],        quantity: 2   },
          ],
        },
      },
    })
    console.log('✓ Resep:', recipe.name)
  } else {
    console.log('✓ Resep (sudah ada): Roti Isang Original')
  }

  console.log('\n✅ Seeding selesai!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Login dengan:')
  console.log('  Email   : admin@rotisang.com')
  console.log('  Password: admin123')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
