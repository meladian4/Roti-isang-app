import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const orders = await prisma.order.findMany({
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { date: "desc" },
    })
    return NextResponse.json(orders)
  } catch (error) {
    console.error("Error fetching orders:", error)
    return NextResponse.json({ error: "Gagal memuat data pesanan" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const data = await req.json()
    const { date, customerName, details, quantity, status, notes } = data

    if (!customerName || !customerName.trim()) {
      return NextResponse.json({ error: "Nama pemesan wajib diisi" }, { status: 400 })
    }

    if (!details || !details.trim()) {
      return NextResponse.json({ error: "Detail roti pesanan wajib diisi" }, { status: 400 })
    }

    const qty = parseInt(quantity?.toString() || "0", 10) || 0
    const orderStatus = status === "SELESAI" ? "SELESAI" : "MASUK"

    // Find valid user ID
    let validUserId: string | null = null
    const userEmail = session?.user?.email
    if (userEmail) {
      const dbUser = await prisma.user.findUnique({ where: { email: userEmail } })
      if (dbUser) validUserId = dbUser.id
    }

    const order = await prisma.order.create({
      data: {
        date: date ? new Date(date) : new Date(),
        customerName: customerName.trim(),
        details: details.trim(),
        quantity: qty,
        status: orderStatus,
        notes: notes?.trim() || null,
        userId: validUserId,
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error("Error creating order:", error)
    return NextResponse.json({ error: "Gagal mencatat pesanan baru" }, { status: 500 })
  }
}
