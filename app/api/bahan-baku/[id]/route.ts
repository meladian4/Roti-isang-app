import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const data = await req.json()

  const updateData: {
    name: string
    unit: string
    minStock: number
    pricePerUnit: number
    currentStock?: number
  } = {
    name: data.name,
    unit: data.unit,
    minStock: parseFloat(data.minStock) || 0,
    pricePerUnit: parseFloat(data.pricePerUnit) || 0,
  }

  if (data.currentStock !== undefined && data.currentStock !== "") {
    updateData.currentStock = parseFloat(data.currentStock) || 0
  }

  const ingredient = await prisma.ingredient.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json(ingredient)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    // Delete related records first to avoid foreign key constraints
    await prisma.$transaction([
      prisma.recipeIngredient.deleteMany({ where: { ingredientId: id } }),
      prisma.stockMovement.deleteMany({ where: { ingredientId: id } }),
      prisma.productionIngredient.deleteMany({ where: { ingredientId: id } }),
      prisma.ingredient.delete({ where: { id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting ingredient:", error)
    return NextResponse.json({ error: "Gagal menghapus bahan baku." }, { status: 500 })
  }
}
