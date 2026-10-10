import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const monthParam = searchParams.get("month")
  const yearParam = searchParams.get("year")

  if (!monthParam || !yearParam) {
    return NextResponse.json({ isLocked: false })
  }

  const m = parseInt(monthParam, 10)
  const y = parseInt(yearParam, 10)

  const closed = await prisma.closedMonth.findUnique({
    where: { month_year: { month: m, year: y } },
  })

  return NextResponse.json({ isLocked: !!closed, closedAt: closed?.closedAt })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { month, year, isLocked } = await req.json()
    const m = parseInt(month, 10)
    const y = parseInt(year, 10)

    if (isLocked) {
      // Lock the month by saving to database
      const closed = await prisma.closedMonth.upsert({
        where: { month_year: { month: m, year: y } },
        update: {},
        create: {
          month: m,
          year: y,
          userId: (session.user as { id?: string })?.id,
        },
      })
      return NextResponse.json({ isLocked: true, closed })
    } else {
      // Unlock the month by removing from database
      await prisma.closedMonth.deleteMany({
        where: { month: m, year: y },
      })
      return NextResponse.json({ isLocked: false })
    }
  } catch (error) {
    console.error("Tutup buku error:", error)
    return NextResponse.json({ error: "Gagal memproses Tutup Buku" }, { status: 500 })
  }
}
