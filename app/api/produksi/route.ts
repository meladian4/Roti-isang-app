import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const productions = await prisma.production.findMany({
    include: {
      recipe: true,
      user: { select: { name: true, email: true } },
      ingredients: { include: { ingredient: true } },
    },
    orderBy: { date: "desc" },
  })
  return NextResponse.json(productions)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const data = await req.json()
    const { recipeId, batchCount, notes, userId, date } = data

    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { ingredients: { include: { ingredient: true } } },
    })

    if (!recipe) return NextResponse.json({ error: "Resep tidak ditemukan" }, { status: 404 })

    const batches = parseInt(batchCount)
    let totalCost = 0
    const productionIngredients = []
    const stockUpdates = []
    const stockMovements = []

    for (const ri of recipe.ingredients) {
      const needed = ri.quantity * batches
      const currentStock = ri.ingredient.currentStock

      if (currentStock < needed) {
        return NextResponse.json(
          { error: `Stok ${ri.ingredient.name} tidak mencukupi. Dibutuhkan: ${needed} ${ri.ingredient.unit}, Tersedia: ${currentStock} ${ri.ingredient.unit}` },
          { status: 400 }
        )
      }

      const cost = needed * ri.ingredient.pricePerUnit
      totalCost += cost

      productionIngredients.push({
        ingredientId: ri.ingredientId,
        quantity: needed,
        priceAtTime: ri.ingredient.pricePerUnit,
      })

      stockUpdates.push(
        prisma.ingredient.update({
          where: { id: ri.ingredientId },
          data: { currentStock: currentStock - needed },
        })
      )

      stockMovements.push(
        prisma.stockMovement.create({
          data: {
            ingredientId: ri.ingredientId,
            type: "OUT",
            quantity: needed,
            notes: `Produksi: ${recipe.name} (${batches} batch)`,
          },
        })
      )
    }

    // Validate valid user ID in database
    let validUserId: string | null = null
    const userEmail = session?.user?.email || "admin@rotisang.com"
    
    if (userId && userId !== "admin-id") {
      const userExists = await prisma.user.findUnique({ where: { id: userId } })
      if (userExists) validUserId = userExists.id
    }
    
    if (!validUserId && userEmail) {
      const dbUser = await prisma.user.findUnique({ where: { email: userEmail } })
      if (dbUser) validUserId = dbUser.id
    }

    const production = await prisma.production.create({
      data: {
        date: date ? new Date(date) : undefined,
        recipeId,
        batchCount: batches,
        totalCost,
        notes,
        userId: validUserId,
        ingredients: { create: productionIngredients },
      },
      include: {
        recipe: true,
        ingredients: { include: { ingredient: true } },
      },
    })

    await prisma.$transaction([...stockUpdates, ...stockMovements])

    return NextResponse.json(production)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 })
  }
}
