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
                  placeholder="Masukkan email Anda"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all text-sm mt-3"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Memproses...</>
              ) : (
                "Masuk"
              )}
            </Button>
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
