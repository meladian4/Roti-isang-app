import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const data = await req.json()

  try {
    const { name, category, quantity, unit, amount, notes, date } = data

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama pengeluaran/barang operasional wajib diisi" }, { status: 400 })
    }

    const qty = parseFloat(quantity?.toString() || "1") || 1
    const cleanAmountStr = (amount?.toString() || "0").replace(/\./g, "").replace(",", ".")
    const totalAmount = parseFloat(cleanAmountStr) || 0

    const expense = await prisma.operationalExpense.update({
      where: { id },
      data: {
        name: name.trim(),
        category: category || "Kemasan",
        quantity: qty,
        unit: unit || "pcs",
        amount: totalAmount,
        notes: notes || null,
        date: date ? new Date(date) : undefined,
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    })
    return NextResponse.json(expense)
  } catch (error) {
    console.error("Error updating operational expense:", error)
    return NextResponse.json({ error: "Gagal memperbarui data pengeluaran operasional" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    await prisma.operationalExpense.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting operational expense:", error)
    return NextResponse.json({ error: "Gagal menghapus pengeluaran operasional" }, { status: 500 })
  }
}
