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
    const cleanPriceStr = (data.pricePerUnit?.toString() || "0").replace(/\./g, "").replace(",", ".")
    const price = parseFloat(cleanPriceStr) || 0
    const totalAmount = qty * price

    let validRecipeId: string | null = null
    if (data.recipeId && data.recipeId.trim() !== "") {
      const recipeExists = await prisma.recipe.findUnique({ where: { id: data.recipeId } })
      if (recipeExists) validRecipeId = recipeExists.id
    }

    let validAgentId: string | null = null
    if (data.agentId && data.agentId.trim() !== "") {
      const agentExists = await prisma.marketingAgent.findUnique({ where: { id: data.agentId } })
      if (agentExists) validAgentId = agentExists.id
    }

    const sale = await prisma.sale.update({
      where: { id },
      data: {
        date: data.date ? new Date(data.date) : undefined,
        recipeId: validRecipeId,
        recipeName: data.recipeName || "Roti Isang",
        quantity: qty,
        pricePerUnit: price,
        totalAmount,
        notes: data.notes || null,
        agentId: validAgentId,
      },
      include: {
        recipe: true,
        agent: true,
        user: { select: { name: true, email: true } },
      },
    })
    return NextResponse.json(sale)
  } catch (error) {
    console.error("Error updating sale:", error)
    return NextResponse.json({ error: "Gagal memperbarui data penjualan" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    await prisma.sale.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting sale:", error)
    return NextResponse.json({ error: "Gagal menghapus data penjualan" }, { status: 500 })
  }
}
