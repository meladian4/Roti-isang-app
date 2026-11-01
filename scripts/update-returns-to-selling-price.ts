import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("=== ANALISIS & UPDATE RETUR REGULER KE HARGA JUAL ===")

  const isDryRun = process.argv.includes("--dry-run")
  console.log(`Mode: ${isDryRun ? "DRY RUN (Hanya Preview)" : "LIVE UPDATE (Menulis ke DB)"}`)

  const returns = await prisma.saleReturn.findMany({
    include: {
      recipe: true,
      agent: true,
    },
    orderBy: { date: "asc" },
  })

  const sales = await prisma.sale.findMany({
    orderBy: { date: "desc" },
  })

  const isBonus = (r: any) => (r.reason || "").toLowerCase().includes("bonus")
  const isFree = (r: any) => {
    const reason = (r.reason || "").toLowerCase()
    return (reason.includes("free") || reason.includes("tester") || reason.includes("sampel")) && !reason.includes("bonus")
  }
  const isRegular = (r: any) => !isBonus(r) && !isFree(r)

  let regularCount = 0
  let bonusCount = 0
  let freeCount = 0

  let totalOldRegularLoss = 0
  let totalNewRegularLoss = 0

  const updates: Array<{
    id: string
    agentName: string
    recipeName: string
    qty: number
    oldLoss: number
    unitSellingPrice: number
    newLoss: number
  }> = []

  for (const r of returns) {
    if (isBonus(r)) {
      bonusCount++
      continue
    }
    if (isFree(r)) {
      freeCount++
      continue
    }

    regularCount++
    totalOldRegularLoss += r.lossAmount

    // Cari selling price untuk retur ini
    let unitSellingPrice = 0

    // 1. Cari sale dengan agentId & recipeId/name yang sama
    const matchSale = sales.find(s => 
      s.agentId === r.agentId && 
      (s.recipeId === r.recipeId || s.recipeName.toLowerCase() === (r.recipeName || "").toLowerCase())
    )
    if (matchSale) {
      unitSellingPrice = matchSale.pricePerUnit
    }

    // 2. Jika tidak ada, cari sale dengan agentId yang sama
    if (!unitSellingPrice && r.agentId) {
      const matchAgent = sales.find(s => s.agentId === r.agentId)
      if (matchAgent) {
        unitSellingPrice = matchAgent.pricePerUnit
      }
    }

    // 3. Jika tidak ada, cari sale dengan recipe yang sama
    if (!unitSellingPrice) {
      const matchRecipe = sales.find(s => 
        s.recipeId === r.recipeId || s.recipeName.toLowerCase() === (r.recipeName || "").toLowerCase()
      )
      if (matchRecipe) {
        unitSellingPrice = matchRecipe.pricePerUnit
      }
    }

    // Fallback berdasarkan agen nama jika agentId kosong
    if (!unitSellingPrice && r.agent?.name) {
      const name = r.agent.name.toUpperCase()
      if (name.includes("BAGUS")) unitSellingPrice = 3000
      else if (name.includes("AZKA") || name.includes("FADJRUL")) unitSellingPrice = 2700
    }

    if (!unitSellingPrice) {
      console.warn(`[WARN] Tidak menemukan selling price untuk retur id=${r.id}, agen=${r.agent?.name}, resep=${r.recipeName}`)
      unitSellingPrice = 2700 // default fallback
    }

    const newLoss = r.quantity * unitSellingPrice
    totalNewRegularLoss += newLoss

    updates.push({
      id: r.id,
      agentName: r.agent?.name || "(Tanpa Agen)",
      recipeName: r.recipeName || r.recipe?.name || "-",
      qty: r.quantity,
      oldLoss: r.lossAmount,
      unitSellingPrice,
      newLoss,
    })
  }

  console.log(`\nRingkasan Data:`)
  console.log(`- Total Retur: ${returns.length}`)
  console.log(`  * Retur Reguler: ${regularCount}`)
  console.log(`  * Free Tester  : ${freeCount}`)
  console.log(`  * Bonus Agent  : ${bonusCount}`)
  console.log(`- Total Potongan Reguler Lama (HPP)       : Rp ${totalOldRegularLoss.toLocaleString("id-ID")}`)
  console.log(`- Total Potongan Reguler Baru (Harga Jual): Rp ${totalNewRegularLoss.toLocaleString("id-ID")}`)
  console.log(`- Selisih Nilai                          : Rp ${(totalNewRegularLoss - totalOldRegularLoss).toLocaleString("id-ID")}`)

  // Rekap per Agen
  const agentSummary: Record<string, { qty: number; oldLoss: number; newLoss: number; unitPrice: number }> = {}
  for (const u of updates) {
    if (!agentSummary[u.agentName]) {
      agentSummary[u.agentName] = { qty: 0, oldLoss: 0, newLoss: 0, unitPrice: u.unitSellingPrice }
    }
    agentSummary[u.agentName].qty += u.qty
    agentSummary[u.agentName].oldLoss += u.oldLoss
    agentSummary[u.agentName].newLoss += u.newLoss
  }

  console.log(`\nRekap Potongan per Agen:`)
  for (const [name, data] of Object.entries(agentSummary)) {
    console.log(`- ${name}: ${data.qty} pcs @ Rp ${data.unitPrice.toLocaleString("id-ID")} = Rp ${data.newLoss.toLocaleString("id-ID")} (Lama HPP: Rp ${data.oldLoss.toLocaleString("id-ID")})`)
  }

  if (!isDryRun) {
    console.log(`\nMenjalankan update ke database Supabase...`)
    let updatedCount = 0
    for (const u of updates) {
      await prisma.saleReturn.update({
        where: { id: u.id },
        data: {
          lossAmount: u.newLoss,
        },
      })
      updatedCount++
    }
    console.log(`✅ Berhasil mengupdate ${updatedCount} data retur reguler ke harga jual riil!`)
  } else {
    console.log(`\nℹ️ Selesai dry run. Jalankan tanpa flag --dry-run untuk menyimpan perubahan ke database.`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
