import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { getRecipeStock } from "@/lib/stock"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const returns = await prisma.saleReturn.findMany({
    include: {
      recipe: true,
      agent: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { date: "desc" },
  })
  return NextResponse.json(returns)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const data = await req.json()
    const { recipeId, recipeName, quantity, reason, notes, userId, agentId, date, manualLossAmount } = data

    const qty = parseInt(quantity?.toString() || "1", 10) || 1
    let lossAmount = 0
    let validRecipeId: string | null = null

    // 1. Find Recipe by ID or Name to calculate automatic HPP per Pcs
    let recipe = null
    if (recipeId && recipeId.trim() !== "") {
      recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        include: { ingredients: { include: { ingredient: true } } },
      })
    }
    
    if (!recipe && recipeName) {
      recipe = await prisma.recipe.findFirst({
        where: { name: recipeName },
        include: { ingredients: { include: { ingredient: true } } },
      })
    }

    if (recipe) {
      validRecipeId = recipe.id
      const batchCost = recipe.ingredients.reduce(
        (sum, ri) => sum + ri.quantity * ri.ingredient.pricePerUnit,
        0
      )
      const costPerUnit = recipe.servingsPerBatch > 0 ? batchCost / recipe.servingsPerBatch : 0
      lossAmount = qty * costPerUnit
    } else if (manualLossAmount) {
      const cleanLossStr = manualLossAmount.toString().replace(/\./g, "").replace(",", ".")
      lossAmount = parseFloat(cleanLossStr) || 0
    }

    // STRICT CHECK: Available bread stock validation
    if (validRecipeId) {
      const stockInfo = await getRecipeStock(validRecipeId)
      if (stockInfo) {
        const isBonus = (reason || "").toLowerCase().includes("bonus")
        const isFree =
          (reason || "").toLowerCase().includes("free") ||
          (reason || "").toLowerCase().includes("tester") ||
          (reason || "").toLowerCase().includes("sampel")

        if (isBonus || isFree) {
          // Free & Bonus mengambil roti fresh dari pabrik
          if (qty > stockInfo.availableStock) {
            const typeLabel = isBonus ? "Bonus Agent" : "Roti Free (Tester)"
            return NextResponse.json(
              {
                error: `Stok roti "${stockInfo.recipeName}" di pabrik tidak mencukupi untuk ${typeLabel}! Sisa stok pabrik tersedia: ${stockInfo.availableStock} pcs. Tidak bisa mencatat ${qty} pcs fresh.`,
                availableStock: stockInfo.availableStock,
              },
              { status: 400 }
            )
          }
        } else {
          // Retur Reguler: Roti ditarik dari peredaran toko konsinyasi (penjualan 2-3 hari lalu)
          const maxReturnable = stockInfo.totalCirculatingInStores ?? Math.max(0, stockInfo.totalSold - stockInfo.totalRegularReturned)
          if (qty > maxReturnable) {
            return NextResponse.json(
              {
                error: `Jumlah retur (${qty} pcs) melebihi total roti "${stockInfo.recipeName}" yang sedang beredar di toko (${maxReturnable} pcs)! Terkirim ke toko: ${stockInfo.totalSold} pcs, sudah diretur sebelumnya: ${stockInfo.totalRegularReturned} pcs.`,
                availableStock: maxReturnable,
              },
              { status: 400 }
            )
          }
        }
      }
    }

    // 2. Validate valid user ID in database
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

    // 3. Validate Marketing Agent ID if provided
    let validAgentId: string | null = null
    if (agentId && agentId.trim() !== "") {
      const agentExists = await prisma.marketingAgent.findUnique({ where: { id: agentId } })
      if (agentExists) validAgentId = agentExists.id
    }

    const saleReturn = await prisma.saleReturn.create({
      data: {
        date: date ? new Date(date) : undefined,
        recipeId: validRecipeId,
        recipeName: recipeName || recipe?.name || "Roti Isang",
        quantity: qty,
        reason: reason || "Kadaluarsa (Expired)",
        lossAmount,
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

    return NextResponse.json(saleReturn)
  } catch (error) {
    console.error("Error creating return:", error)
    return NextResponse.json({ error: "Terjadi kesalahan saat mencatat retur" }, { status: 500 })
  }
}
