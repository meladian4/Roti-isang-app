import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Read auth cookie
  const authCookie = request.cookies.get("auth_session")?.value
  let userRole = ""

  if (authCookie) {
    try {
      const parsed = JSON.parse(authCookie)
      userRole = parsed.role || ""
    } catch {
      // Ignore parse error
    }
  }

  // 2. Strict route protection for MARKETING role
  // Marketing is ONLY allowed to access /penjualan and /pesanan
  if (userRole === "MARKETING") {
    const adminOnlyPrefixes = [
      "/dashboard",
      "/bahan-baku",
      "/resep",
      "/produksi",
      "/operasional",
      "/laporan",
      "/ai-assistant",
    ]

    const isRestricted = adminOnlyPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
    )

    if (isRestricted || pathname === "/") {
      return NextResponse.redirect(new URL("/penjualan", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, logos
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg|ico)$).*)",
  ],
}
