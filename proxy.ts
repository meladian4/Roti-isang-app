import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

export const { auth: middleware, handlers, signIn, signOut } = NextAuth(authConfig)

export default middleware
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
