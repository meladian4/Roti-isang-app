"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Wheat,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  HelpCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Forgot password modal state
  const [openForgotModal, setOpenForgotModal] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState("")
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [recoverySuccess, setRecoverySuccess] = useState("")
  const [recoveryError, setRecoveryError] = useState("")

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recoveryEmail.trim()) return

    setRecoveryLoading(true)
    setRecoveryError("")
    setRecoverySuccess("")

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recoveryEmail.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setRecoveryError(data.error || "Gagal memproses pemulihan akun.")
      } else {
        setRecoverySuccess(
          data.message ||
            `Instruksi pemulihan kata sandi telah dikirim ke ${recoveryEmail}. Silakan periksa kotak masuk atau spam di Gmail Anda.`
        )
      }
    } catch {
      setRecoveryError("Terjadi kesalahan jaringan. Silakan coba lagi.")
    } finally {
      setRecoveryLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-950 flex flex-col items-center justify-between p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full flex-1 flex flex-col items-center justify-center max-w-md z-10 my-auto">
        {/* Main Card Container with embedded Header */}
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
            <p className="text-xs text-slate-400 font-medium">Silakan masukkan email & kata sandi Anda</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            {error && (
              <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Field */}
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
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  className="pl-10 rounded-xl bg-slate-50 border-slate-200 text-slate-900 font-medium text-sm h-11 focus:bg-white focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-bold text-slate-700">Kata Sandi</Label>
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryEmail(email || "")
                    setRecoverySuccess("")
                    setRecoveryError("")
                    setOpenForgotModal(true)
                  }}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                >
                  Lupa Email / Sandi?
                </button>
              </div>
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

            {/* Login Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all text-sm mt-3"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Memproses Masuk...</>
              ) : (
                "Masuk Sekarang"
              )}
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">
              Sistem Manajemen Roti Isang • Hak Cipta Dilindungi
            </p>
          </div>
        </div>
      </div>

      {/* MODAL: LUPA EMAIL / SANDI */}
      <Dialog open={openForgotModal} onOpenChange={setOpenForgotModal}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100">
          <DialogHeader className="text-left space-y-2">
            <div className="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1">
              <HelpCircle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-black text-slate-900">
              Pemulihan Akun & Sandi
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium leading-relaxed">
              Masukkan alamat email Anda yang terdaftar pada sistem. Kami akan mengirimkan petunjuk pemulihan kata sandi ke kotak masuk Gmail Anda.
            </DialogDescription>
          </DialogHeader>

          {recoverySuccess ? (
            <div className="space-y-4 my-2">
              <div className="p-4 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-emerald-800 leading-relaxed">
                  {recoverySuccess}
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setOpenForgotModal(false)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl h-10 text-xs"
              >
                Kembali ke Halaman Masuk
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4 mt-2">
              {recoveryError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{recoveryError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="recoveryEmail" className="text-xs font-bold text-slate-700">
                  Email Terdaftar
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <Input
                    id="recoveryEmail"
                    type="email"
                    placeholder="nama@gmail.com"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    className="pl-10 rounded-xl bg-slate-50 border-slate-200 text-slate-900 font-medium text-sm h-11 focus:bg-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenForgotModal(false)}
                  className="flex-1 rounded-xl h-11 text-xs font-bold border-slate-200 text-slate-600"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={recoveryLoading || !recoveryEmail.trim()}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl h-11 text-xs shadow-md shadow-emerald-600/20"
                >
                  {recoveryLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Mengirim...</>
                  ) : (
                    <span className="flex items-center gap-1">Kirim ke Gmail <ArrowRight className="h-3.5 w-3.5" /></span>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Page Footer */}
      <footer className="z-10 text-center py-2 text-xs font-bold text-emerald-200/70 tracking-wider">
        credit: Zohandian
      </footer>
    </div>
  )
}
