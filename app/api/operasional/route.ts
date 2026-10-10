import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const expenses = await prisma.operationalExpense.findMany({
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: { date: "desc" },
  })
  return NextResponse.json(expenses)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const data = await req.json()
    const { name, category, quantity, unit, amount, notes, date, userId } = data

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama pengeluaran/barang operasional wajib diisi" }, { status: 400 })
    }

    const qty = parseFloat(quantity?.toString() || "1") || 1
    const cleanAmountStr = (amount?.toString() || "0").replace(/\./g, "").replace(",", ".")
    const totalAmount = parseFloat(cleanAmountStr) || 0

    // Validate valid user ID in database
    let validUserId: string | null = null
    const userEmail = session?.user?.email || "admin@rotisang.com"
    
    if (userId && userId !== "admin-id") {
      const userExists = await prisma.user.findUnique({ where: { id: userId } })
      if (userExists) validUserId = userExists.id
    }
    
    if (!validUserId && userEmail) {
      const dbUser = await prisma.user.findUnique({ where: { email: userEmail } })
      if (dbUser) validUserId = dbUser.id
    }

    const expense = await prisma.operationalExpense.create({
      data: {
        name: name.trim(),
        category: category || "Kemasan",
        quantity: qty,
        unit: unit || "pcs",
        amount: totalAmount,
        notes: notes || null,
        date: date ? new Date(date) : undefined,
        userId: validUserId,
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error("Error creating operational expense:", error)
    return NextResponse.json({ error: "Terjadi kesalahan saat mencatat pengeluaran operasional" }, { status: 500 })
  }
}
