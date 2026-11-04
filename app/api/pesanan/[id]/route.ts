import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const data = await req.json()

  try {
    const { date, customerName, details, quantity, status, notes } = data

    // Allow partial updates (e.g. quick toggle status) or full edit
    const updateData: {
      date?: Date
      customerName?: string
      details?: string
      quantity?: number
      status?: string
      notes?: string | null
    } = {}

    if (date !== undefined) updateData.date = new Date(date)
    if (customerName !== undefined) updateData.customerName = customerName.trim()
    if (details !== undefined) updateData.details = details.trim()
    if (quantity !== undefined) updateData.quantity = parseInt(quantity?.toString() || "0", 10) || 0
    if (status !== undefined) updateData.status = status === "SELESAI" ? "SELESAI" : "MASUK"
    if (notes !== undefined) updateData.notes = notes?.trim() || null

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { name: true, email: true } },
      },
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error updating order:", error)
    return NextResponse.json({ error: "Gagal memperbarui data pesanan" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    await prisma.order.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting order:", error)
    return NextResponse.json({ error: "Gagal menghapus data pesanan" }, { status: 500 })
  }
}
