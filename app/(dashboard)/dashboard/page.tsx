"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Package, Factory, TrendingUp, AlertTriangle, Wheat, Sparkles, ArrowRight, Activity, DollarSign, ShoppingBag, RotateCcw, Wallet, Calendar, RefreshCw } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

const MONTHS = [
  { val: "1", label: "Januari" },
  { val: "2", label: "Februari" },
  { val: "3", label: "Maret" },
  { val: "4", label: "April" },
  { val: "5", label: "Mei" },
  { val: "6", label: "Juni" },
  { val: "7", label: "Juli" },
  { val: "8", label: "Agustus" },
  { val: "9", label: "September" },
  { val: "10", label: "Oktober" },
  { val: "11", label: "November" },
  { val: "12", label: "Desember" },
]

const YEARS = ["2024", "2025", "2026", "2027", "2028"]

interface DashboardData {
  summary: {
    totalCost: number
    totalBatches: number
    productionCount: number
    totalRevenue: number
    totalSalesQty: number
    totalReturnLoss: number
    totalReturnQty: number
    netProfit: number
  }
  lowStockIngredients: Array<{ id: string; name: string; currentStock: number; minStock: number; unit: string }>
  productions: Array<{ id: string; date: string; recipe: { name: string }; batchCount: number; totalCost: number }>
  sales: Array<{ id: string; date: string; recipeName: string; quantity: number; totalAmount: number }>
  ingredientUsage: Array<{ name: string; unit: string; totalUsed: number; totalCost: number }>
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Redirect marketing away from admin dashboard
  useEffect(() => {
    if ((session?.user as any)?.role === "MARKETING") {
      router.replace("/penjualan")
    }
  }, [session, router])

  // Filter state (Compact Date & Month Customizer)
  const now = new Date()
  const currentMonth = (now.getMonth() + 1).toString()
  const currentYear = now.getFullYear().toString()

  const [filterType, setFilterType] = useState<"current" | "month" | "range" | "all">("current")
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const fetchDashboardData = useCallback(async (query: string) => {
    setIsRefreshing(true)
    try {
      const res = await fetch(`/api/laporan?${query}`)
      if (res.ok) {
        const d = await res.json()
        setData(d)
      }
    } catch (err) {
      console.error("Gagal memuat data dashboard:", err)
    } finally {
      setIsRefreshing(false)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (filterType === "current") {
      fetchDashboardData("period=month")
    } else if (filterType === "month") {
      fetchDashboardData(`month=${selectedMonth}&year=${selectedYear}`)
    } else if (filterType === "all") {
      fetchDashboardData("period=all")
    }
  }, [filterType, selectedMonth, selectedYear, fetchDashboardData])

  const handleApplyRange = (e: React.FormEvent) => {
    e.preventDefault()
    if (!startDate || !endDate) {
      alert("Pilih tanggal mulai dan tanggal akhir terlebih dahulu!")
      return
    }
    fetchDashboardData(`startDate=${startDate}&endDate=${endDate}`)
  }

  const activePeriodLabel = useMemo(() => {
    if (filterType === "current") {
      const mLabel = MONTHS.find((m) => m.val === currentMonth)?.label || ""
      return `${mLabel} ${currentYear} (Bulan Ini)`
    }
    if (filterType === "month") {
      const mLabel = MONTHS.find((m) => m.val === selectedMonth)?.label || ""
      return `${mLabel} ${selectedYear}`
    }
    if (filterType === "range") {
      if (startDate && endDate) {
        return `${formatDate(startDate)} - ${formatDate(endDate)}`
      }
      return "Rentang Tanggal Khusus"
    }
    return "Semua Data Akumulatif"
  }, [filterType, selectedMonth, selectedYear, startDate, endDate, currentMonth, currentYear])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50/50">
        <div className="text-center p-8 glass-panel rounded-3xl glow-green border border-emerald-500/20 shadow-xl max-w-xs w-full">
          <div className="relative inline-block mb-3">
            <div className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-emerald-500/30 shadow-md mx-auto relative animate-pulse">
              <Image src="/logo-ropisku.jpg" alt="Logo Roti Isang" fill className="object-cover" sizes="64px" />
            </div>
            <div className="absolute inset-0 rounded-2xl blur-xl bg-emerald-500/20 -z-10"></div>
          </div>
          <p className="text-slate-800 font-black text-sm tracking-wide">Memuat Dashboard Roti Isang...</p>
          <p className="text-[11px] text-slate-400 font-medium mt-1">Sinkronisasi data produksi & keuangan...</p>
        </div>
      </div>
    )
  }

  const netProfit = data?.summary.netProfit || 0
  const isProfitPositive = netProfit >= 0

  return (
    <div className="min-h-screen">
      <Header title="Dashboard Produksi & Keuangan" description="Ringkasan real-time aktivitas produksi, omset penjualan, dan Laba Bersih" />
      <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">

        {/* Hero Banner Card - Fresh Emerald Green Theme */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/20 border border-white/20">
          <div className="absolute -right-10 -bottom-10 opacity-15 pointer-events-none">
            <Wheat className="h-72 w-72 text-white" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md text-emerald-100 border border-white/20 mb-3 shadow-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Sistem Manajemen Roti Isang v3.0
            </span>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Selamat Datang Kembali! 👋
            </h1>
            <p className="text-emerald-100/95 text-xs sm:text-sm font-medium mt-1.5 sm:mt-2 leading-relaxed">
              Pantau ketersediaan stok, kalkulasi otomatis kebutuhan bahan baku & adonan, omset penjualan, serta estimasi Laba Bersih secara real-time.
            </p>
          </div>
        </div>

        {/* Compact Date & Month Customizer Filter Bar ("Kecil Aja") */}
        <div className="bg-white/90 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-emerald-500/15 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-0.5">
              <Calendar className="h-3.5 w-3.5 text-emerald-600" /> Filter:
            </span>

            {/* Quick Segmented Mode Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setFilterType("current")}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                  filterType === "current"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => setFilterType("month")}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                  filterType === "month"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pilih Bulan
              </button>
              <button
                type="button"
                onClick={() => setFilterType("range")}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                  filterType === "range"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Rentang Tanggal
              </button>
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                  filterType === "all"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua
              </button>
            </div>

            {/* If Pilih Bulan is selected */}
            {filterType === "month" && (
              <div className="flex items-center gap-1.5 pl-1.5 sm:border-l sm:border-slate-200">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-7 w-28 text-[11px] font-bold rounded-lg bg-white border-emerald-300 text-emerald-900">
                    <SelectValue placeholder="Bulan" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.val} value={m.val} className="text-xs font-medium">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-7 w-20 text-[11px] font-bold rounded-lg bg-white border-emerald-300 text-emerald-900">
                    <SelectValue placeholder="Tahun" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={y} className="text-xs font-medium">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* If Rentang Tanggal is selected */}
            {filterType === "range" && (
              <form onSubmit={handleApplyRange} className="flex flex-wrap items-center gap-1.5 pl-1.5 sm:border-l sm:border-slate-200">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-7 w-32 text-[11px] font-medium rounded-lg bg-white border-emerald-300"
                  required
                />
                <span className="text-slate-400 text-xs font-semibold">s/d</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-7 w-32 text-[11px] font-medium rounded-lg bg-white border-emerald-300"
                  required
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-7 px-2.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  Terapkan
                </Button>
              </form>
            )}
          </div>

          {/* Active Period Badge & Refreshing Spinner */}
          <div className="flex items-center gap-2">
            {isRefreshing && (
              <RefreshCw className="h-3.5 w-3.5 text-emerald-600 animate-spin" />
            )}
            <Badge variant="outline" className="text-[11px] font-bold border-emerald-300 bg-emerald-50 text-emerald-800 rounded-lg px-2.5 py-0.5 shadow-2xs">
              📅 {activePeriodLabel}
            </Badge>
          </div>
        </div>

        {/* Metric Cards Grid - 4 Main Financial Metrics */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5 transition-opacity duration-200 ${isRefreshing ? "opacity-60" : "opacity-100"}`}>
          {/* Card 1: Omset Penjualan */}
          <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-5 md:p-6 relative overflow-hidden group">
            <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
              <div className="p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-bold tracking-wider text-slate-400 uppercase truncate">Omset Penjualan</p>
                <p className="text-sm sm:text-base md:text-xl font-black text-emerald-600 tracking-tight mt-0.5 truncate" title={formatCurrency(data?.summary.totalRevenue || 0)}>
                  {formatCurrency(data?.summary.totalRevenue || 0)}
                </p>
                <p className="text-[9px] sm:text-[11px] font-semibold text-slate-400 mt-0.5 truncate">
                  {data?.summary.totalSalesQty || 0} pcs terjual
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: HPP Produksi */}
          <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-5 md:p-6 relative overflow-hidden group">
            <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
              <div className="p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <Factory className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-bold tracking-wider text-slate-400 uppercase truncate">Biaya HPP</p>
                <p className="text-sm sm:text-base md:text-xl font-black text-slate-800 tracking-tight mt-0.5 truncate" title={formatCurrency(data?.summary.totalCost || 0)}>
                  {formatCurrency(data?.summary.totalCost || 0)}
                </p>
                <p className="text-[9px] sm:text-[11px] font-semibold text-slate-400 mt-0.5 truncate">
                  {data?.summary.totalBatches || 0} Loyang ({data?.summary.productionCount || 0} Adonan)
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Kerugian Retur */}
          <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-5 md:p-6 relative overflow-hidden group">
            <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
              <div className="p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/25 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-bold tracking-wider text-slate-400 uppercase truncate">Kerugian Retur</p>
                <p className="text-sm sm:text-base md:text-xl font-black text-rose-600 tracking-tight mt-0.5 truncate" title={formatCurrency(data?.summary.totalReturnLoss || 0)}>
                  {formatCurrency(data?.summary.totalReturnLoss || 0)}
                </p>
                <p className="text-[9px] sm:text-[11px] font-semibold text-slate-400 mt-0.5 truncate">
                  {data?.summary.totalReturnQty || 0} pcs retur
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Laba Bersih */}
          <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-5 md:p-6 relative overflow-hidden group">
            <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
              <div className={`p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 flex-shrink-0 ${
                isProfitPositive
                  ? "bg-gradient-to-br from-teal-600 to-emerald-700 shadow-teal-500/25"
                  : "bg-gradient-to-br from-red-600 to-rose-700 shadow-rose-500/25"
              }`}>
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-bold tracking-wider text-slate-400 uppercase truncate">Laba Bersih</p>
                <p className={`text-sm sm:text-base md:text-xl font-black tracking-tight mt-0.5 truncate ${
                  isProfitPositive ? "text-emerald-700" : "text-rose-600"
                }`} title={formatCurrency(netProfit)}>
                  {formatCurrency(netProfit)}
                </p>
                <p className="text-[9px] sm:text-[11px] font-semibold text-slate-400 mt-0.5 truncate">
                  Estimasi Bersih
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Highlight Section */}
        {(data?.lowStockIngredients.length || 0) > 0 && (
          <div className="glass-card rounded-2xl border-l-4 border-l-rose-500 bg-rose-50/60 p-6 shadow-md shadow-rose-500/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-rose-800 flex items-center gap-2 text-base">
                <span className="p-1.5 bg-rose-500 text-white rounded-lg shadow-xs animate-pulse">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                Perhatian: Bahan Baku Di Bawah Stok Minimum!
              </h3>
              <Link href="/bahan-baku" className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 hover:underline">
                Restok Bahan <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data?.lowStockIngredients.map((ing) => (
                <div key={ing.id} className="flex items-center justify-between p-3.5 bg-white/90 rounded-xl border border-rose-200/80 shadow-xs hover:shadow-md transition-shadow">
                  <div>
                    <span className="font-bold text-slate-800 text-sm block">{ing.name}</span>
                    <span className="text-xs text-slate-400">Min: {ing.minStock} {ing.unit}</span>
                  </div>
                  <Badge variant="danger" className="text-xs">
                    Sisa: {ing.currentStock} {ing.unit}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Productions & Sales Grid */}
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-opacity duration-200 ${isRefreshing ? "opacity-60" : "opacity-100"}`}>
          {/* Recent Sales Card */}
          <Card className="overflow-hidden border-emerald-500/10">
            <CardHeader className="bg-gradient-to-r from-emerald-50/90 to-teal-50/60 border-b border-emerald-100 flex flex-row items-center justify-between py-5">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                Penjualan Terbaru
              </CardTitle>
              <Link href="/penjualan" className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline">
                Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {!data?.sales?.length ? (
                <div className="text-center text-slate-400 py-12">
                  <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="font-medium text-xs">Belum ada transaksi penjualan pada periode ini</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                        <th className="text-left py-3 px-4">Tanggal</th>
                        <th className="text-left py-3 px-4">Roti</th>
                        <th className="text-right py-3 px-4">Terjual</th>
                        <th className="text-right py-3 px-4">Omset</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data?.sales.slice(0, 5).map((s) => (
                        <tr key={s.id} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="py-3 px-4 text-slate-500 font-medium">{formatDate(s.date)}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">{s.recipeName}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-700">{s.quantity} pcs</td>
                          <td className="py-3 px-4 text-right font-extrabold text-emerald-600">{formatCurrency(s.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Production Card */}
          <Card className="overflow-hidden border-emerald-500/10">
            <CardHeader className="bg-gradient-to-r from-emerald-50/90 to-teal-50/60 border-b border-emerald-100 flex flex-row items-center justify-between py-5">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                  <Activity className="h-4 w-4" />
                </div>
                Riwayat Produksi Terbaru
              </CardTitle>
              <Link href="/produksi" className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline">
                Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {!data?.productions?.length ? (
                <div className="text-center text-slate-400 py-12">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="font-medium text-xs">Belum ada catatan produksi pada periode ini</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                        <th className="text-left py-3 px-4">Tanggal</th>
                        <th className="text-left py-3 px-4">Nama Resep</th>
                        <th className="text-left py-3 px-4">Loyang (Batch)</th>
                        <th className="text-right py-3 px-4">Total HPP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data?.productions.slice(0, 5).map((p) => (
                        <tr key={p.id} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="py-3 px-4 text-slate-500 font-medium">{formatDate(p.date)}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">{p.recipe.name}</td>
                          <td className="py-3 px-4 font-bold text-emerald-800">{p.batchCount} Loyang</td>
                          <td className="py-3 px-4 text-right font-extrabold text-emerald-600">{formatCurrency(p.totalCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
