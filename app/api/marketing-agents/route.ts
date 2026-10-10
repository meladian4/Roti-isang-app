import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const agents = await prisma.marketingAgent.findMany({
    orderBy: { name: "asc" },
  })
  return NextResponse.json(agents)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const data = await req.json()
    const { name, code } = data

    if (!name) {
      return NextResponse.json({ error: "Nama Marketing Agent wajib diisi" }, { status: 400 })
    }

    const agent = await prisma.marketingAgent.create({
      data: {
        name,
        code: code || null,
      },
    })

    return NextResponse.json(agent)
  } catch (error) {
    console.error("Error creating marketing agent:", error)
    return NextResponse.json({ error: "Terjadi kesalahan saat menambah Marketing Agent" }, { status: 500 })
  }
}
