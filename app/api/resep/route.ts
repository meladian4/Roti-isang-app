import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const recipes = await prisma.recipe.findMany({
    include: {
      ingredients: {
        include: { ingredient: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(recipes)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const data = await req.json()
    const recipe = await prisma.recipe.create({
      data: {
        name: data.name,
        description: data.description,
        servingsPerBatch: parseInt(data.servingsPerBatch) || 1,
        ingredients: {
          create: data.ingredients.map((ing: { ingredientId: string; quantity: number }) => ({
            ingredientId: ing.ingredientId,
            quantity: parseFloat(ing.quantity.toString()),
          })),
        },
      },
      include: {
        ingredients: { include: { ingredient: true } },
      },
    })
    return NextResponse.json(recipe)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 })
  }
}
