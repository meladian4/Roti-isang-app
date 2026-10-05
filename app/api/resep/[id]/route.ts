import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: { ingredients: { include: { ingredient: true } } },
  })
  if (!recipe) return NextResponse.json({ error: "Resep tidak ditemukan" }, { status: 404 })
  return NextResponse.json(recipe)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const data = await req.json()

  // Delete existing ingredients and recreate
  await prisma.recipeIngredient.deleteMany({ where: { recipeId: id } })

  const recipe = await prisma.recipe.update({
    where: { id },
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
    include: { ingredients: { include: { ingredient: true } } },
  })
  return NextResponse.json(recipe)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await prisma.recipe.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
