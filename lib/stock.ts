import { prisma } from "@/lib/prisma"

export interface RecipeStockInfo {
  recipeId: string
  recipeName: string
  servingsPerBatch: number
  totalProduced: number
  totalSold: number
  totalRegularReturned: number
  totalFree: number
  totalBonus: number
  totalCirculatingInStores: number
  totalOutflow: number
  availableStock: number
}

export interface StockSummary {
  totalProducedAll: number
  totalSoldAll: number
  totalRegularReturnedAll: number
  totalFreeAll: number
  totalBonusAll: number
  totalCirculatingInStoresAll: number
  totalOutflowAll: number
  availableStockAll: number
  recipes: RecipeStockInfo[]
}

export function getProductionPcs(
  production: { batchCount: number; notes: string | null },
  servingsPerBatch: number = 1
): number {
  if (production.notes) {
    const match = production.notes.match(/\[Target:\s*(\d+)\s*pcs/i)
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10)
      if (!isNaN(parsed) && parsed > 0) return parsed
    }
  }
  const servings = servingsPerBatch > 0 ? servingsPerBatch : 1
  return production.batchCount * servings
}

export async function getRecipeStock(
  recipeIdOrName: string,
  exclude?: { saleId?: string; returnId?: string }
): Promise<RecipeStockInfo | null> {
  // Find recipe by id first, then fallback to name
  let recipe = await prisma.recipe.findUnique({
    where: { id: recipeIdOrName },
    include: {
      productions: true,
      sales: {
        where: exclude?.saleId ? { id: { not: exclude.saleId } } : undefined,
      },
      returns: {
        where: exclude?.returnId ? { id: { not: exclude.returnId } } : undefined,
      },
    },
  })

  if (!recipe) {
    recipe = await prisma.recipe.findFirst({
      where: { name: recipeIdOrName },
      include: {
        productions: true,
        sales: {
          where: exclude?.saleId ? { id: { not: exclude.saleId } } : undefined,
        },
        returns: {
          where: exclude?.returnId ? { id: { not: exclude.returnId } } : undefined,
        },
      },
    })
  }

  if (!recipe) return null

  const servings = recipe.servingsPerBatch > 0 ? recipe.servingsPerBatch : 1
  const totalProduced = recipe.productions.reduce(
    (sum, p) => sum + getProductionPcs(p, servings),
    0
  )

  // Also include sales that match by recipeName if recipeId was null
  const unlinkedSales = await prisma.sale.findMany({
    where: {
      recipeId: null,
      recipeName: recipe.name,
      ...(exclude?.saleId ? { id: { not: exclude.saleId } } : {}),
    },
  })
  const allSales = [...recipe.sales, ...unlinkedSales]
  const totalSold = allSales.reduce((sum, s) => sum + s.quantity, 0)

  // Also include returns that match by recipeName if recipeId was null
  const unlinkedReturns = await prisma.saleReturn.findMany({
    where: {
      recipeId: null,
      recipeName: recipe.name,
      ...(exclude?.returnId ? { id: { not: exclude.returnId } } : {}),
    },
  })
  const allReturns = [...recipe.returns, ...unlinkedReturns]

  let totalRegularReturned = 0
  let totalFree = 0
  let totalBonus = 0

  for (const r of allReturns) {
    const reason = (r.reason || "").toLowerCase()
    if (reason.includes("bonus")) {
      totalBonus += r.quantity
    } else if (
      reason.includes("free") ||
      reason.includes("tester") ||
      reason.includes("sampel")
    ) {
      totalFree += r.quantity
    } else {
      totalRegularReturned += r.quantity
    }
  }

  // Outflow dari rak pabrik hanya mencakup roti yang keluar dari pabrik:
  // 1. Roti yang dikirim/dijual ke toko (totalSold)
  // 2. Roti tester (totalFree)
  // 3. Roti bonus agen (totalBonus)
  // Retur reguler tidak menambah outflow pabrik karena fisiknya sudah keluar saat transaksi penjualan.
  const totalOutflow = totalSold + totalFree + totalBonus
  const availableStock = Math.max(0, totalProduced - totalOutflow)
  // Roti yang sedang beredar di toko dan belum diretur:
  const totalCirculatingInStores = Math.max(0, totalSold - totalRegularReturned)

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    servingsPerBatch: servings,
    totalProduced,
    totalSold,
    totalRegularReturned,
    totalFree,
    totalBonus,
    totalCirculatingInStores,
    totalOutflow,
    availableStock,
  }
}

export async function getAllRecipesStock(): Promise<StockSummary> {
  const [recipes, sales, returns] = await Promise.all([
    prisma.recipe.findMany({
      include: {
        productions: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.sale.findMany(),
    prisma.saleReturn.findMany(),
  ])

  let totalProducedAll = 0
  let totalSoldAll = 0
  let totalRegularReturnedAll = 0
  let totalFreeAll = 0
  let totalBonusAll = 0

  const recipeStockList: RecipeStockInfo[] = recipes.map((recipe) => {
    const servings = recipe.servingsPerBatch > 0 ? recipe.servingsPerBatch : 1
    const totalProduced = recipe.productions.reduce(
      (sum, p) => sum + getProductionPcs(p, servings),
      0
    )

    // Match sales by recipeId OR by recipeName
    const recipeSales = sales.filter(
      (s) => s.recipeId === recipe.id || (!s.recipeId && s.recipeName === recipe.name)
    )
    const totalSold = recipeSales.reduce((sum, s) => sum + s.quantity, 0)

    // Match returns by recipeId OR by recipeName
    const recipeReturns = returns.filter(
      (r) => r.recipeId === recipe.id || (!r.recipeId && r.recipeName === recipe.name)
    )

    let totalRegularReturned = 0
    let totalFree = 0
    let totalBonus = 0

    for (const r of recipeReturns) {
      const reason = (r.reason || "").toLowerCase()
      if (reason.includes("bonus")) {
        totalBonus += r.quantity
      } else if (
        reason.includes("free") ||
        reason.includes("tester") ||
        reason.includes("sampel")
      ) {
        totalFree += r.quantity
      } else {
        totalRegularReturned += r.quantity
      }
    }

    // Outflow pabrik = penjualan/kirim toko + free tester + bonus agen
    const totalOutflow = totalSold + totalFree + totalBonus
    const availableStock = Math.max(0, totalProduced - totalOutflow)
    const totalCirculatingInStores = Math.max(0, totalSold - totalRegularReturned)

    totalProducedAll += totalProduced
    totalSoldAll += totalSold
    totalRegularReturnedAll += totalRegularReturned
    totalFreeAll += totalFree
    totalBonusAll += totalBonus

    return {
      recipeId: recipe.id,
      recipeName: recipe.name,
      servingsPerBatch: servings,
      totalProduced,
      totalSold,
      totalRegularReturned,
      totalFree,
      totalBonus,
      totalCirculatingInStores,
      totalOutflow,
      availableStock,
    }
  })

  const totalOutflowAll = totalSoldAll + totalFreeAll + totalBonusAll
  const availableStockAll = Math.max(0, totalProducedAll - totalOutflowAll)
  const totalCirculatingInStoresAll = Math.max(0, totalSoldAll - totalRegularReturnedAll)

  return {
    totalProducedAll,
    totalSoldAll,
    totalRegularReturnedAll,
    totalFreeAll,
    totalBonusAll,
    totalCirculatingInStoresAll,
    totalOutflowAll,
    availableStockAll,
    recipes: recipeStockList,
  }
}
