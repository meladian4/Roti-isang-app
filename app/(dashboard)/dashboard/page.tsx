"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Package, Factory, TrendingUp, AlertTriangle, Wheat, Sparkles, ArrowRight, Activity, DollarSign, ShoppingBag, RotateCcw, Wallet } from "lucide-react"
import Link from "next/link"

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
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/laporan?period=month")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50/50">
        <div className="text-center p-8 glass-panel rounded-3xl glow-green">
          <div className="relative inline-block">
            <Wheat className="h-14 w-14 text-emerald-600 animate-bounce mx-auto mb-4" />
            <div className="absolute inset-0 rounded-full blur-xl bg-emerald-500/30 animate-pulse"></div>
          </div>
          <p className="text-slate-600 font-bold tracking-wide">Memuat Dashboard Antigravity...</p>
        </div>
      </div>
    )
  }

  const netProfit = data?.summary.netProfit || 0
  const isProfitPositive = netProfit >= 0

  return (
    <div className="min-h-screen">
      <Header title="Dashboard Produksi & Keuangan" description="Ringkasan real-time aktivitas produksi, omset penjualan, dan Laba Bersih" />
      <div className="p-8 space-y-8 max-w-7xl mx-auto">

        {/* Hero Banner Card - Fresh Emerald Green Theme */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-8 text-white shadow-xl shadow-emerald-950/20 border border-white/20">
          <div className="absolute -right-10 -bottom-10 opacity-15 pointer-events-none">
            <Wheat className="h-72 w-72 text-white" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md text-emerald-100 border border-white/20 mb-3 shadow-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Sistem Manajemen Roti Isang v3.0
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Selamat Datang Kembali! 👋
            </h1>
            <p className="text-emerald-100/95 text-sm font-medium mt-2 leading-relaxed">
              Pantau ketersediaan stok, kalkulasi otomatis kebutuhan bahan baku & adonan, omset penjualan, serta estimasi Laba Bersih secara real-time.
            </p>
          </div>
        </div>

        {/* Metric Cards Grid - 4 Main Financial Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Omset Penjualan */}
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden group">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Omset Penjualan</p>
                <p className="text-xl font-black text-emerald-600 tracking-tight mt-0.5">
                  {formatCurrency(data?.summary.totalRevenue || 0)}
                </p>
                <p className="text-[11px] font-semibold text-slate-400 mt-1">
                  {data?.summary.totalSalesQty || 0} pcs terjual
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: HPP Produksi */}
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden group">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 group-hover:scale-110 transition-transform duration-300">
                <Factory className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Biaya Produksi (HPP)</p>
                <p className="text-xl font-black text-slate-800 tracking-tight mt-0.5">
                  {formatCurrency(data?.summary.totalCost || 0)}
                </p>
                <p className="text-[11px] font-semibold text-slate-400 mt-1">
                  {data?.summary.totalBatches || 0} Loyang ({data?.summary.productionCount || 0} Adonan)
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Kerugian Retur */}
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden group">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/25 group-hover:scale-110 transition-transform duration-300">
                <RotateCcw className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Kerugian Retur</p>
                <p className="text-xl font-black text-rose-600 tracking-tight mt-0.5">
                  {formatCurrency(data?.summary.totalReturnLoss || 0)}
                </p>
                <p className="text-[11px] font-semibold text-slate-400 mt-1">
                  {data?.summary.totalReturnQty || 0} pcs retur/kadaluarsa
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Laba Bersih */}
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden group">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 ${
                isProfitPositive
                  ? "bg-gradient-to-br from-teal-600 to-emerald-700 shadow-teal-500/25"
                  : "bg-gradient-to-br from-red-600 to-rose-700 shadow-rose-500/25"
              }`}>
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Laba Bersih (Estimasi)</p>
                <p className={`text-xl font-black tracking-tight mt-0.5 ${
                  isProfitPositive ? "text-emerald-700" : "text-rose-600"
                }`}>
                  {formatCurrency(netProfit)}
                </p>
                <p className="text-[11px] font-semibold text-slate-400 mt-1">
                  Omset - HPP - Retur
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <p className="font-medium text-xs">Belum ada transaksi penjualan bulan ini</p>
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
              {!data?.productions.length ? (
                <div className="text-center text-slate-400 py-12">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="font-medium text-xs">Belum ada catatan produksi bulan ini</p>
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
