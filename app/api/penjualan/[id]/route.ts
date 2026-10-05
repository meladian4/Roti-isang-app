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
    const price = parseFloat(data.pricePerUnit) || 0
    const totalAmount = qty * price

    const sale = await prisma.sale.update({
      where: { id },
      data: {
        date: data.date ? new Date(data.date) : undefined,
        recipeId: data.recipeId || null,
        recipeName: data.recipeName || "Roti Isang",
        quantity: qty,
        pricePerUnit: price,
        totalAmount,
        notes: data.notes || null,
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
