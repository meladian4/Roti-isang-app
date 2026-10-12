import { NextResponse } from "next/server"

export async function POST() {
  const response = NextResponse.json({ success: true })

  // Delete custom auth_session cookie
  response.cookies.set("auth_session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  })

  // Delete next-auth session cookies
  response.cookies.set("next-auth.session-token", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  })

  response.cookies.set("__Secure-next-auth.session-token", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  })

  return response
}
