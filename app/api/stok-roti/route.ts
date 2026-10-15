import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAllRecipesStock } from "@/lib/stock"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const stockData = await getAllRecipesStock()
    return NextResponse.json(stockData)
  } catch (error) {
    console.error("Error fetching bread stocks:", error)
    return NextResponse.json({ error: "Gagal mengambil data stok roti" }, { status: 500 })
  }
}
