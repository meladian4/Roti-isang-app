import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const { name, email, password, role } = await req.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: role || "OPERATOR" },
    })

    return NextResponse.json({ id: user.id, email: user.email, name: user.name })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 })
  }
}
