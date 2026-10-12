"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Wheat, Loader2, AlertCircle, Eye, EyeOff, Lock, Mail, Sparkles } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const err = params.get("error")
      if (err === "AccessDenied") {
        setError("Akses Ditolak: Email Google ini tidak terdaftar sebagai pemilik sistem.")
      } else if (err === "Configuration") {
        setError("Kunci Google Client ID & Secret belum dikonfigurasi di server.")
      } else if (err) {
        setError("Gagal masuk dengan Google. Silakan coba lagi.")
      }
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const cleanEmail = email.trim().toLowerCase()
    const cleanPassword = password.trim()

    try {
      // 1. Call robust direct login route
      const apiRes = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
      })
      const apiData = await apiRes.json()

      if (!apiRes.ok || !apiData.success) {
        setError(apiData.error || "Email atau password salah. Silakan periksa kembali.")
        setLoading(false)
        return
      }

      // 2. Fire and forget NextAuth background sync
      signIn("credentials", {
        email: cleanEmail,
        password: cleanPassword,
        redirect: false,
      }).catch(() => {})

      // 3. Instant navigation to dashboard
      window.location.href = "/dashboard"
    } catch (err) {
      console.error("Login handle error:", err)
      setError("Email atau password salah. Silakan periksa kembali.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-950 flex flex-col items-center justify-between p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full flex-1 flex flex-col items-center justify-center max-w-md z-10 my-auto">
        {/* Main Card Container with embedded high-contrast Header */}
        <div className="w-full bg-white rounded-3xl p-8 shadow-2xl border border-emerald-100/50">
          
          {/* Logo & Brand Header */}
          <div className="text-center pb-6 border-b border-slate-100 mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl shadow-lg shadow-emerald-600/30 mb-3">
              <Wheat className="h-9 w-9 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight block">
              Roti Isang
            </h1>
            <p className="text-emerald-700 font-bold text-xs uppercase tracking-wider mt-1">
              Sistem Manajemen Produksi & Keuangan
            </p>
          </div>

          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-800">Masuk ke Akun 👋</h2>
            <p className="text-xs text-slate-400 font-medium">Silakan masukkan email & password Anda</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            {error && (
              <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold text-slate-700">Email</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@rotisang.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  className="pl-10 rounded-xl bg-slate-50 border-slate-200 text-slate-900 font-medium text-sm h-11 focus:bg-white focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-bold text-slate-700">Password</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="admin123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  className="pl-10 pr-10 rounded-xl bg-slate-50 border-slate-200 text-slate-900 font-medium text-sm h-11 focus:bg-white focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Quick Fill Demo / Admin Button */}
            <button
              type="button"
              onClick={() => {
                setEmail("admin@rotisang.com")
                setPassword("admin123")
              }}
              className="w-full py-2.5 px-3 bg-emerald-50/80 hover:bg-emerald-100/90 text-emerald-800 border border-emerald-300/60 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-98"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>Isi Otomatis Akun Admin (1-Klik)</span>
            </button>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all text-sm mt-1"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Memproses Masuk...</>
              ) : (
                "Masuk Sekarang"
              )}
            </Button>

            {/* Separator */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-white px-3 text-slate-400 font-bold">atau masuk instan</span>
              </div>
            </div>

            {/* Sign In with Google Button */}
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="w-full h-11 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-300/80 rounded-xl shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-3 text-sm active:scale-98"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Masuk dengan Google</span>
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">
              Belum memiliki akses? Hubungi Administrator.
            </p>
          </div>
        </div>
      </div>

      {/* Page Footer */}
      <footer className="z-10 text-center py-2 text-xs font-bold text-emerald-200/70 tracking-wider">
        credit: Zohandian
      </footer>
    </div>
  )
}
