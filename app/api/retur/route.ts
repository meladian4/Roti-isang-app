import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const returns = await prisma.saleReturn.findMany({
    include: {
      recipe: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { date: "desc" },
  })
  return NextResponse.json(returns)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const data = await req.json()
    const { recipeId, recipeName, quantity, reason, notes, userId, date } = data

    const qty = parseInt(quantity)
    let lossAmount = 0

    // Estimate loss amount based on recipe HPP per pcs
    if (recipeId) {
      const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        include: { ingredients: { include: { ingredient: true } } },
      })
      if (recipe) {
        const batchCost = recipe.ingredients.reduce(
          (sum, ri) => sum + ri.quantity * ri.ingredient.pricePerUnit,
          0
        )
        const costPerUnit = recipe.servingsPerBatch > 0 ? batchCost / recipe.servingsPerBatch : 0
        lossAmount = qty * costPerUnit
      }
    }

    const saleReturn = await prisma.saleReturn.create({
      data: {
        date: date ? new Date(date) : undefined,
        recipeId: recipeId || null,
        recipeName: recipeName || "Roti Isang",
        quantity: qty,
        reason: reason || "Kadaluarsa",
        lossAmount,
        notes,
        userId: userId || null,
      },
      include: {
        recipe: true,
        user: { select: { name: true, email: true } },
      },
    })

    return NextResponse.json(saleReturn)
  } catch (error) {
    console.error("Error creating return:", error)
    return NextResponse.json({ error: "Terjadi kesalahan saat mencatat retur" }, { status: 500 })
  }
}
