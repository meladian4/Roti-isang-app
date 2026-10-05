import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const data = await req.json()

  try {
    const { notes, batchCount, totalCost, date } = data

    const production = await prisma.production.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        batchCount: batchCount ? parseInt(batchCount) : undefined,
        totalCost: totalCost !== undefined ? parseFloat(totalCost) : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    })
    return NextResponse.json(production)
  } catch (error) {
    console.error("Error updating production:", error)
    return NextResponse.json({ error: "Gagal memperbarui data produksi" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    const production = await prisma.production.findUnique({
      where: { id },
      include: { ingredients: true },
    })

    if (!production) {
      return NextResponse.json({ error: "Data produksi tidak ditemukan" }, { status: 404 })
    }

    // Restore ingredient stocks from deleted production
    const stockRestores = production.ingredients.map((pi) =>
      prisma.ingredient.update({
        where: { id: pi.ingredientId },
        data: { currentStock: { increment: pi.quantity } },
      })
    )

    await prisma.$transaction([
      prisma.productionIngredient.deleteMany({ where: { productionId: id } }),
      ...stockRestores,
      prisma.production.delete({ where: { id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting production:", error)
    return NextResponse.json({ error: "Gagal menghapus data produksi" }, { status: 500 })
  }
}
