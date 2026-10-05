"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Wheat, Loader2, AlertCircle, Eye, EyeOff, Lock, Mail } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Email atau password salah. Silakan periksa kembali.")
      setLoading(false)
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900 via-teal-950 to-slate-950 flex flex-col items-center justify-between p-6 relative overflow-hidden">
      {/* Decorative Ambient Glowing Orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full flex-1 flex flex-col items-center justify-center max-w-md z-10 my-auto">
        {/* Logo & Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-xl shadow-emerald-900/50 mb-4 border border-emerald-400/30">
            <Wheat className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Roti Isang</h1>
          <p className="text-emerald-300 text-sm font-semibold mt-1">Sistem Manajemen Produksi & Keuangan</p>
        </div>

        {/* Glassmorphic Login Card */}
        <div className="w-full bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="mb-6">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Selamat Datang 👋</h2>
            <p className="text-xs font-semibold text-slate-400 mt-1">Masukkan kredensial akun Anda untuk masuk</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
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
                  placeholder="Masukkan email Anda"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  required
                  className="pl-10 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white text-slate-800 font-medium text-sm h-11"
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="pl-10 pr-10 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white text-slate-800 font-medium text-sm h-11"
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/30 transition-all text-sm mt-2"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Memproses Masuk...</>
              ) : (
                "Masuk ke Dashboard"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs font-medium text-slate-400">
              Belum memiliki akses? Hubungi Administrator.
            </p>
          </div>
        </div>
      </div>

      {/* Page Footer */}
      <footer className="z-10 text-center py-2 text-[11px] font-bold text-emerald-400/60 tracking-wider">
        credit: Zohandian
      </footer>
    </div>
  )
}
