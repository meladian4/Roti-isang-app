import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const data = await req.json()

  try {
    const qty = parseInt(data.quantity?.toString() || "1", 10) || 1
    let lossAmount = 0
    let validRecipeId: string | null = null

    let recipe = null
    if (data.recipeId && data.recipeId.trim() !== "") {
      recipe = await prisma.recipe.findUnique({
        where: { id: data.recipeId },
        include: { ingredients: { include: { ingredient: true } } },
      })
    }
    
    if (!recipe && data.recipeName) {
      recipe = await prisma.recipe.findFirst({
        where: { name: data.recipeName },
        include: { ingredients: { include: { ingredient: true } } },
      })
    }

    if (recipe) {
      validRecipeId = recipe.id
      const batchCost = recipe.ingredients.reduce(
        (sum, ri) => sum + ri.quantity * ri.ingredient.pricePerUnit,
        0
      )
      const costPerUnit = recipe.servingsPerBatch > 0 ? batchCost / recipe.servingsPerBatch : 0
      lossAmount = qty * costPerUnit
    } else if (data.lossAmount) {
      const cleanLossStr = data.lossAmount.toString().replace(/\./g, "").replace(",", ".")
      lossAmount = parseFloat(cleanLossStr) || 0
    }

    let validAgentId: string | null = null
    if (data.agentId && data.agentId.trim() !== "") {
      const agentExists = await prisma.marketingAgent.findUnique({ where: { id: data.agentId } })
      if (agentExists) validAgentId = agentExists.id
    }

    const saleReturn = await prisma.saleReturn.update({
      where: { id },
      data: {
        date: data.date ? new Date(data.date) : undefined,
        recipeId: validRecipeId,
        recipeName: data.recipeName || recipe?.name || "Roti Isang",
        quantity: qty,
        reason: data.reason || "Kadaluarsa (Expired)",
        lossAmount,
        notes: data.notes || null,
        agentId: validAgentId,
      },
      include: {
        recipe: true,
        agent: true,
        user: { select: { name: true, email: true } },
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
