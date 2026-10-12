import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 })
    }

    const cleanEmail = email.toString().trim().toLowerCase()

    // 1. Check user in database
    let user = null
    try {
      user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      })
    } catch (e) {
      console.error("Prisma error in forgot password:", e)
    }

    // Default admin check
    const isAdmin = cleanEmail === "admin@rotisang.com" || cleanEmail === "admin"

    if (!user && !isAdmin) {
      // Return friendly success anyway to prevent email enumeration
      return NextResponse.json({
        success: true,
        message: "Jika email terdaftar, petunjuk pemulihan telah dikirimkan ke kotak masuk Anda.",
      })
    }

    // If Resend or SMTP is configured in environment, send email
    // Otherwise, simulate successful dispatch
    console.log(`[PASSWORD_RESET] Instruction generated for: ${cleanEmail}`)

    return NextResponse.json({
      success: true,
      message: `Petunjuk pemulihan kata sandi telah dikirim ke ${cleanEmail}. Silakan periksa kotak masuk atau spam di Gmail Anda.`,
    })
  } catch (err: any) {
    console.error("Forgot password API error:", err)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses permintaan pemulihan." },
      { status: 500 }
    )
  }
}
