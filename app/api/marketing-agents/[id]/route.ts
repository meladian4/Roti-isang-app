import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const data = await req.json()

  try {
    const { name, code } = data
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama Agent Marketing wajib diisi" }, { status: 400 })
    }

    const agent = await prisma.marketingAgent.update({
      where: { id },
      data: {
        name: name.trim(),
        code: code ? code.trim() : null,
      },
    })
    return NextResponse.json(agent)
  } catch (error) {
    console.error("Error updating marketing agent:", error)
    return NextResponse.json({ error: "Gagal memperbarui Marketing Agent" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    // Unlink sales and returns associated with this agent before deleting
    await prisma.$transaction([
      prisma.sale.updateMany({ where: { agentId: id }, data: { agentId: null } }),
      prisma.saleReturn.updateMany({ where: { agentId: id }, data: { agentId: null } }),
      prisma.marketingAgent.delete({ where: { id } }),
    ])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting marketing agent:", error)
    return NextResponse.json({ error: "Gagal menghapus Marketing Agent" }, { status: 500 })
  }
}
