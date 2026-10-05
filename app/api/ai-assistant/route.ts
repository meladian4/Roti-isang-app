import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { message } = await req.json()

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
    return NextResponse.json({ reply: "Gemini API key belum dikonfigurasi. Tambahkan GEMINI_API_KEY di file .env Anda." })
  }

  // Fetch current context data
  const [ingredients, recipes, recentProductions, recentSales, recentReturns] = await Promise.all([
    prisma.ingredient.findMany({ orderBy: { name: "asc" } }),
    prisma.recipe.findMany({
      include: { ingredients: { include: { ingredient: true } } },
    }),
    prisma.production.findMany({
      take: 10,
      orderBy: { date: "desc" },
      include: { recipe: true },
    }),
    prisma.sale.findMany({
      take: 10,
      orderBy: { date: "desc" },
    }),
    prisma.saleReturn.findMany({
      take: 10,
      orderBy: { date: "desc" },
    }),
  ])

  const totalHPP = recentProductions.reduce((s, p) => s + p.totalCost, 0)
  const totalOmset = recentSales.reduce((s, x) => s + x.totalAmount, 0)
  const totalKerugianRetur = recentReturns.reduce((s, r) => s + r.lossAmount, 0)
  const estimasiLabaBersih = totalOmset - totalHPP - totalKerugianRetur

  const contextData = {
    ringkasanKeuangan: {
      totalOmset: `Rp ${totalOmset.toLocaleString("id-ID")}`,
      totalHPPProduksi: `Rp ${totalHPP.toLocaleString("id-ID")}`,
      totalKerugianRetur: `Rp ${totalKerugianRetur.toLocaleString("id-ID")}`,
      estimasiLabaBersih: `Rp ${estimasiLabaBersih.toLocaleString("id-ID")}`,
    },
    stokBahanBaku: ingredients.map((i) => ({
      nama: i.name,
      stokSaat_ini: `${i.currentStock} ${i.unit}`,
      stokMinimum: `${i.minStock} ${i.unit}`,
      hargaPerSatuan: `Rp ${i.pricePerUnit.toLocaleString("id-ID")}`,
      statusStok: i.currentStock <= i.minStock ? "RENDAH" : "NORMAL",
    })),
    resepTersedia: recipes.map((r) => ({
      namaResep: r.name,
      hasilPerBatch: r.servingsPerBatch,
      bahanBaku: r.ingredients.map((ri) => `${ri.quantity} ${ri.ingredient.unit} ${ri.ingredient.name}`),
    })),
    penjualanTerakhir: recentSales.map((s) => ({
      tanggal: s.date.toLocaleDateString("id-ID"),
      resep: s.recipeName,
      jumlahTerjual: `${s.quantity} pcs`,
      omset: `Rp ${s.totalAmount.toLocaleString("id-ID")}`,
    })),
    returTerakhir: recentReturns.map((r) => ({
      tanggal: r.date.toLocaleDateString("id-ID"),
      resep: r.recipeName,
      jumlahRetur: `${r.quantity} pcs`,
      alasan: r.reason || "Kadaluarsa",
      kerugian: `Rp ${r.lossAmount.toLocaleString("id-ID")}`,
    })),
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

  const systemPrompt = `Kamu adalah AI assistant untuk sistem manajemen produksi dan keuangan roti isang. 
Kamu membantu pemilik usaha dengan perhitungan bahan baku, analisis keuangan (omset, HPP, retur, laba bersih), dan saran optimasi bisnis roti.
Selalu jawab dalam Bahasa Indonesia yang ramah, profesional, dan mudah dipahami.
Gunakan data konteks real-time berikut untuk menjawab pertanyaan dengan akurat:

${JSON.stringify(contextData, null, 2)}

Jika ditanya tentang keuangan, berikan angka omset, HPP, retur, dan laba bersih secara rinci.
Jika stok bahan rendah atau ada retur tinggi, berikan peringatan dan saran tindakan.
Bersikaplah seperti konsultan bisnis & keuangan yang berpengalaman di industri roti.`

  try {
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `Pertanyaan pengguna: ${message}` },
    ])
    const reply = result.response.text()
    return NextResponse.json({ reply })
  } catch (error) {
    console.error("Gemini error:", error)
    return NextResponse.json({ reply: "Maaf, terjadi kesalahan saat menghubungi AI. Coba lagi nanti." })
  }
}
