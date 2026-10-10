import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sales = await prisma.sale.findMany({
    include: {
      recipe: true,
      agent: true,
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
    const { recipeId, recipeName, quantity, pricePerUnit, notes, userId, agentId, date } = data

    if (!recipeName && !recipeId) {
      return NextResponse.json({ error: "Nama roti atau resep harus dipilih" }, { status: 400 })
    }

    const qty = parseInt(quantity?.toString() || "1", 10) || 1
    const cleanPriceStr = (pricePerUnit?.toString() || "0").replace(/\./g, "").replace(",", ".")
    const price = parseFloat(cleanPriceStr) || 0
    const totalAmount = qty * price

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

    // Validate valid recipe ID if provided
    let validRecipeId: string | null = null
    if (recipeId && recipeId.trim() !== "") {
      const recipeExists = await prisma.recipe.findUnique({ where: { id: recipeId } })
      if (recipeExists) validRecipeId = recipeExists.id
    }

    // Validate Marketing Agent ID if provided
    let validAgentId: string | null = null
    if (agentId && agentId.trim() !== "") {
      const agentExists = await prisma.marketingAgent.findUnique({ where: { id: agentId } })
      if (agentExists) validAgentId = agentExists.id
    }

    const sale = await prisma.sale.create({
      data: {
        date: date ? new Date(date) : undefined,
        recipeId: validRecipeId,
        recipeName: recipeName || "Roti Isang",
        quantity: qty,
        pricePerUnit: price,
        totalAmount,
        notes: notes || null,
        userId: validUserId,
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
    console.error("Error creating sale:", error)
    return NextResponse.json({ error: "Terjadi kesalahan saat mencatat penjualan" }, { status: 500 })
  }
}
