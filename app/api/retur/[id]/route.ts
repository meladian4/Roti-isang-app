import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const data = await req.json()

  try {
    const qty = parseInt(data.quantity) || 1
    let lossAmount = parseFloat(data.lossAmount) || 0

    // Re-estimate loss amount if recipe is linked and lossAmount is 0
    if (data.recipeId && !lossAmount) {
      const recipe = await prisma.recipe.findUnique({
        where: { id: data.recipeId },
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

    const saleReturn = await prisma.saleReturn.update({
      where: { id },
      data: {
        date: data.date ? new Date(data.date) : undefined,
        recipeId: data.recipeId || null,
        recipeName: data.recipeName || "Roti Isang",
        quantity: qty,
        reason: data.reason || "Kadaluarsa",
        lossAmount,
        notes: data.notes || null,
      },
    })
    return NextResponse.json(saleReturn)
  } catch (error) {
    console.error("Error updating return:", error)
    return NextResponse.json({ error: "Gagal memperbarui data retur" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    await prisma.saleReturn.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting return:", error)
    return NextResponse.json({ error: "Gagal menghapus data retur" }, { status: 500 })
  }
}
