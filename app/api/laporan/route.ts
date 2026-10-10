import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get("period") || "month"
  const paramStartDate = searchParams.get("startDate")
  const paramEndDate = searchParams.get("endDate")

  let dateFilter: { gte?: Date; lte?: Date } = {}

  const monthParam = searchParams.get("month")
  const yearParam = searchParams.get("year")

  if (monthParam && yearParam) {
    const m = parseInt(monthParam, 10)
    const y = parseInt(yearParam, 10)
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 0, 23, 59, 59, 999)
    dateFilter = { gte: start, lte: end }
  } else if (paramStartDate && paramEndDate) {
    dateFilter = {
      gte: new Date(paramStartDate),
      lte: new Date(`${paramEndDate}T23:59:59.999Z`),
    }
  } else {
    const now = new Date()
    let start: Date
    if (period === "week") {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (period === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (period === "year") {
      start = new Date(now.getFullYear(), 0, 1)
    } else {
      // "all"
      start = new Date(2020, 0, 1)
    }
    dateFilter = { gte: start }
  }

  let checkM: number | null = null
  let checkY: number | null = null
  if (monthParam && yearParam) {
    checkM = parseInt(monthParam, 10)
    checkY = parseInt(yearParam, 10)
  } else if (period === "month") {
    const now = new Date()
    checkM = now.getMonth() + 1
    checkY = now.getFullYear()
  }

  const [productions, stockMovements, ingredients, sales, returns, operationalExpenses, closedMonth] = await Promise.all([
    prisma.production.findMany({
      where: { date: dateFilter },
      include: { recipe: true, ingredients: { include: { ingredient: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.stockMovement.findMany({
      where: { date: dateFilter },
      include: { ingredient: true },
      orderBy: { date: "desc" },
    }),
    prisma.ingredient.findMany({ orderBy: { name: "asc" } }),
    prisma.sale.findMany({
      where: { date: dateFilter },
      include: { recipe: true, agent: true, user: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.saleReturn.findMany({
      where: { date: dateFilter },
      include: { recipe: true, agent: true, user: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.operationalExpense.findMany({
      where: { date: dateFilter },
      include: { user: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
    checkM && checkY
      ? prisma.closedMonth.findUnique({
          where: { month_year: { month: checkM, year: checkY } },
        })
      : Promise.resolve(null),
  ])

  const totalCost = productions.reduce((sum, p) => sum + p.totalCost, 0)
  const totalBatches = productions.reduce((sum, p) => sum + p.batchCount, 0)
  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0)
  const totalSalesQty = sales.reduce((sum, s) => sum + s.quantity, 0)
  const totalReturnLoss = returns.reduce((sum, r) => sum + r.lossAmount, 0)
  const totalReturnQty = returns.reduce((sum, r) => sum + r.quantity, 0)
  const totalOperationalExpense = operationalExpenses.reduce((sum, e) => sum + e.amount, 0)
  const totalInventoryValue = ingredients.reduce((sum, i) => sum + i.currentStock * i.pricePerUnit, 0)

  // Buku Besar Net Profit Akhir = Omset - HPP Produksi - Kerugian Retur - Beban Operasional
  const netProfit = totalRevenue - totalCost - totalReturnLoss - totalOperationalExpense

  // Ingredient usage summary
  const ingredientUsage: Record<string, { name: string; unit: string; totalUsed: number; totalCost: number }> = {}
  for (const p of productions) {
    for (const pi of p.ingredients) {
      if (!ingredientUsage[pi.ingredientId]) {
        ingredientUsage[pi.ingredientId] = {
          name: pi.ingredient.name,
          unit: pi.ingredient.unit,
          totalUsed: 0,
          totalCost: 0,
        }
      }
      ingredientUsage[pi.ingredientId].totalUsed += pi.quantity
      ingredientUsage[pi.ingredientId].totalCost += pi.quantity * pi.priceAtTime
    }
  }

  // Daily financial chart data (omset, hpp, retur, operasional, laba)
  const dailyFinancials: Record<string, { date: string; revenue: number; cost: number; returnLoss: number; operational: number; profit: number }> = {}

  for (const p of productions) {
    const dateKey = p.date.toISOString().split("T")[0]
    if (!dailyFinancials[dateKey]) {
      dailyFinancials[dateKey] = { date: dateKey, revenue: 0, cost: 0, returnLoss: 0, operational: 0, profit: 0 }
    }
    dailyFinancials[dateKey].cost += p.totalCost
  }

  for (const s of sales) {
    const dateKey = s.date.toISOString().split("T")[0]
    if (!dailyFinancials[dateKey]) {
      dailyFinancials[dateKey] = { date: dateKey, revenue: 0, cost: 0, returnLoss: 0, operational: 0, profit: 0 }
    }
    dailyFinancials[dateKey].revenue += s.totalAmount
  }

  for (const r of returns) {
    const dateKey = r.date.toISOString().split("T")[0]
    if (!dailyFinancials[dateKey]) {
      dailyFinancials[dateKey] = { date: dateKey, revenue: 0, cost: 0, returnLoss: 0, operational: 0, profit: 0 }
    }
    dailyFinancials[dateKey].returnLoss += r.lossAmount
  }

  for (const e of operationalExpenses) {
    const dateKey = e.date.toISOString().split("T")[0]
    if (!dailyFinancials[dateKey]) {
      dailyFinancials[dateKey] = { date: dateKey, revenue: 0, cost: 0, returnLoss: 0, operational: 0, profit: 0 }
    }
    dailyFinancials[dateKey].operational += e.amount
  }

  // Compute profit per day for General Ledger
  const dailyData = Object.values(dailyFinancials)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      ...d,
      profit: d.revenue - d.cost - d.returnLoss - d.operational,
    }))

  return NextResponse.json({
    summary: {
      totalCost,
      totalBatches,
      productionCount: productions.length,
      totalRevenue,
      totalSalesQty,
      totalReturnLoss,
      totalReturnQty,
      totalOperationalExpense,
      totalInventoryValue,
      netProfit,
      isLocked: !!closedMonth,
    },
    productions,
    sales,
    returns,
    operationalExpenses,
    ingredientUsage: Object.values(ingredientUsage),
    dailyData,
    lowStockIngredients: ingredients.filter((i) => i.currentStock <= i.minStock),
    recentMovements: stockMovements.slice(0, 20),
  })
}
