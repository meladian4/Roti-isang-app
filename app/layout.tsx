import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "next-auth/react"
import { auth } from "@/auth"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Roti Isang - Manajemen Produksi",
  description: "Sistem manajemen bahan baku dan produksi roti isang",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return (
    <html lang="id">
      <body className={inter.className}>
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  )
}
