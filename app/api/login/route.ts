import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 })
    }

    const emailInput = email.toString().trim().toLowerCase()
    const passInput = password.toString().trim()

    // Direct check for default admin credentials
    if (emailInput === "admin@rotisang.com" && (passInput === "admin123" || passInput === "RotiIsang2026!" || passInput === "rotisang2026")) {
      const cookieStore = await cookies()
      cookieStore.set(
        "auth_session",
        JSON.stringify({
          id: "admin-id",
          email: "admin@rotisang.com",
          name: "Admin Roti Isang",
          role: "ADMIN",
        }),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 30, // 30 days
        }
      )
      return NextResponse.json({
        success: true,
        user: { id: "admin-id", email: "admin@rotisang.com", name: "Admin Roti Isang" },
      })
    }

    const user = await prisma.user.findUnique({
      where: { email: emailInput },
    })

    if (!user) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 400 })
    }

    let isValid = false
    try {
      isValid = await bcrypt.compare(passInput, user.password)
    } catch (e) {
      console.error(e)
    }

    if (!isValid) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 400 })
    }

    const cookieStore = await cookies()
    cookieStore.set(
      "auth_session",
      JSON.stringify({ id: user.id, email: user.email, name: user.name, role: user.role }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      }
    )

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    })
  } catch (err) {
    console.error("Login API error:", err)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
