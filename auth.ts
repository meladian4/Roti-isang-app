import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const emailInput = (credentials.email as string).trim().toLowerCase()
          const passInput = (credentials.password as string).trim()

          const user = await prisma.user.findUnique({
            where: { email: emailInput },
          })

          if (!user) {
            console.log("User not found in DB:", emailInput)
            // Fallback admin creation if DB is empty or missing admin
            if (emailInput === "admin@rotisang.com" && passInput === "admin123") {
              const hash = await bcrypt.hash("admin123", 12)
              const createdAdmin = await prisma.user.upsert({
                where: { email: "admin@rotisang.com" },
                update: { password: hash },
                create: {
                  email: "admin@rotisang.com",
                  name: "Admin Roti Isang",
                  password: hash,
                  role: "ADMIN",
                },
              })
              return {
                id: createdAdmin.id,
                email: createdAdmin.email,
                name: createdAdmin.name,
                role: createdAdmin.role,
              }
            }
            return null
          }

          let isPasswordValid = false
          try {
            isPasswordValid = await bcrypt.compare(passInput, user.password)
          } catch (e) {
            console.error("Bcrypt compare error:", e)
          }

          // Fallback check for default admin
          if (!isPasswordValid && passInput === "admin123" && emailInput === "admin@rotisang.com") {
            isPasswordValid = true
          }

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (err) {
          console.error("Authorize error:", err)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string; id?: string }).role = token.role as string
        (session.user as { role?: string; id?: string }).id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "roti-isang-super-secret-key-2024-ganti-ini",
})
