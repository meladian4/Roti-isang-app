import type { NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize() {
        return null
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isAuthPage = nextUrl.pathname.startsWith("/login")
      const isApiRoute = nextUrl.pathname.startsWith("/api")

      if (isApiRoute) return true
      if (!isLoggedIn && !isAuthPage) return false
      if (isLoggedIn && isAuthPage) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }
      return true
    },
  },
}
