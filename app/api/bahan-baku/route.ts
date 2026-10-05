import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const ingredients = await prisma.ingredient.findMany({
    orderBy: { name: "asc" },
  })
  return NextResponse.json(ingredients)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const data = await req.json()
    const ingredient = await prisma.ingredient.create({
      data: {
        name: data.name,
        unit: data.unit,
        currentStock: parseFloat(data.currentStock) || 0,
        minStock: parseFloat(data.minStock) || 0,
        pricePerUnit: parseFloat(data.pricePerUnit) || 0,
      },
    })

    // Record initial stock movement if stock > 0
    if (ingredient.currentStock > 0) {
      await prisma.stockMovement.create({
        data: {
          ingredientId: ingredient.id,
          type: "IN",
          quantity: ingredient.currentStock,
          notes: "Stok awal",
        },
      })
    }

    return NextResponse.json(ingredient)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 })
  }
}
