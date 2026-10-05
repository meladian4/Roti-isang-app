import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { type, quantity, notes } = await req.json()

  const ingredient = await prisma.ingredient.findUnique({ where: { id } })
  if (!ingredient) return NextResponse.json({ error: "Bahan tidak ditemukan" }, { status: 404 })

  const qty = parseFloat(quantity)
  const newStock =
    type === "IN" ? ingredient.currentStock + qty : ingredient.currentStock - qty

  if (newStock < 0) {
    return NextResponse.json({ error: "Stok tidak mencukupi" }, { status: 400 })
  }

  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: { ingredientId: id, type, quantity: qty, notes },
    }),
    prisma.ingredient.update({
      where: { id },
      data: { currentStock: newStock },
    }),
  ])

  return NextResponse.json(movement)
}
