import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Format request tidak valid" }, { status: 400 })
    }

    const { email, password } = body
    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 })
    }

    const emailInput = email.toString().trim().toLowerCase()
    const passInput = password.toString().trim()

    // 1. Direct instant check for default admin credentials (never blocked by DB connection)
    if (
      emailInput === "admin@rotisang.com" &&
      (passInput === "admin123" || passInput === "RotiIsang2026!" || passInput === "rotisang2026")
    ) {
      const response = NextResponse.json({
        success: true,
        user: { id: "admin-id", email: "admin@rotisang.com", name: "Admin Roti Isang", role: "ADMIN" },
      })

      response.cookies.set(
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

      return response
    }

    // 2. Database check for other registered users with safe catch
    try {
      const user = await prisma.user.findUnique({
        where: { email: emailInput },
      })

      if (user) {
        let isValid = false
        try {
          isValid = await bcrypt.compare(passInput, user.password)
        } catch (e) {
          console.error("Bcrypt error:", e)
        }

        if (isValid) {
          const response = NextResponse.json({
            success: true,
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
          })

          response.cookies.set(
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

          return response
        }
      }
    } catch (dbErr) {
      console.error("Prisma lookup error:", dbErr)
    }

    return NextResponse.json({ error: "Email atau password salah" }, { status: 400 })
  } catch (err: any) {
    console.error("Login API error:", err)
    return NextResponse.json({ error: "Email atau password salah" }, { status: 400 })
  }
}
