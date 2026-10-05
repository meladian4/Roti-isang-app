import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sales = await prisma.sale.findMany({
    include: {
      recipe: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { date: "desc" },
  })
  return NextResponse.json(sales)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const data = await req.json()
    const { recipeId, recipeName, quantity, pricePerUnit, notes, userId, date } = data

    if (!recipeName && !recipeId) {
      return NextResponse.json({ error: "Nama roti atau resep harus dipilih" }, { status: 400 })
    }

    const qty = parseInt(quantity) || 1
    const price = parseFloat(pricePerUnit) || 0
    const totalAmount = qty * price

    const sale = await prisma.sale.create({
      data: {
        date: date ? new Date(date) : undefined,
        recipeId: recipeId || null,
        recipeName: recipeName || "Roti Isang",
        quantity: qty,
        pricePerUnit: price,
        totalAmount,
        notes: notes || null,
        userId: userId || null,
      },
      include: {
        recipe: true,
        user: { select: { name: true, email: true } },
      },
    })

    return NextResponse.json(sale)
  } catch (error) {
    console.error("Error creating sale:", error)
    return NextResponse.json({ error: "Terjadi kesalahan saat mencatat penjualan" }, { status: 500 })
  }
}
