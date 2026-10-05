"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { BarChart3, TrendingUp, Package, Factory, Calendar, DollarSign, RotateCcw, Wallet, Download, Printer, PieChart as PieChartIcon, Filter, Sparkles } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

interface LaporanData {
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
  ingredientUsage: Array<{ name: string; unit: string; totalUsed: number; totalCost: number }>
  dailyData: Array<{ date: string; revenue: number; cost: number; returnLoss: number; profit: number }>
  sales: Array<{ date: string; recipeName: string; quantity: number; totalAmount: number }>
  returns: Array<{ date: string; recipeName: string; quantity: number; reason: string; lossAmount: number }>
}

const COLORS = ["#10b981", "#f97316", "#ef4444", "#3b82f6"]

export default function LaporanPage() {
  const [data, setData] = useState<LaporanData | null>(null)
  const [period, setPeriod] = useState("month")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchLaporan = (paramsQuery: string) => {
    setLoading(true)
    fetch(`/api/laporan?${paramsQuery}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchLaporan(`period=${period}`)
  }, [period])

  const handleCustomDateFilter = (e: React.FormEvent) => {
    e.preventDefault()
    if (!startDate || !endDate) {
      alert("Pilih tanggal mulai dan tanggal akhir terlebih dahulu!")
      return
    }
    setPeriod("custom")
    fetchLaporan(`startDate=${startDate}&endDate=${endDate}`)
  }

  const handleExportCSV = () => {
    if (!data) return

    let csvContent = "data:text/csv;charset=utf-8,"
    csvContent += "=== LAPORAN KEUANGAN ROTI ISANG ===\n"
    csvContent += `Periode: ${period === "custom" ? `${startDate} s/d ${endDate}` : period}\n\n`

    csvContent += "RINGKASAN KEUANGAN\n"
    csvContent += `Total Omset Penjualan,${data.summary.totalRevenue}\n`
    csvContent += `Total HPP Produksi,${data.summary.totalCost}\n`
    csvContent += `Total Kerugian Retur,${data.summary.totalReturnLoss}\n`
    csvContent += `Laba Bersih,${data.summary.netProfit}\n\n`

    csvContent += "PENGGUNAAN BAHAN BAKU\n"
    csvContent += "Nama Bahan,Total Terpakai,Satuan,Total Biaya (Rp)\n"
    data.ingredientUsage.forEach((ing) => {
      csvContent += `"${ing.name}",${ing.totalUsed},"${ing.unit}",${ing.totalCost}\n`
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Laporan_Keuangan_Roti_Isang_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    window.print()
  }

  const netProfit = data?.summary.netProfit || 0

  // Pie Chart Data Breakdown
  const pieData = data
    ? [
        { name: "Omset Penjualan", value: data.summary.totalRevenue },
        { name: "HPP Produksi", value: data.summary.totalCost },
        { name: "Kerugian Retur", value: data.summary.totalReturnLoss },
        { name: "Laba Bersih", value: Math.max(0, data.summary.netProfit) },
      ]
    : []

  return (
    <div className="min-h-screen pb-12">
      <Header title="Laporan & Rekapitulasi Keuangan" description="Filter tanggal kustom, diagram Laba Rugi, & export laporan Excel/PDF" />
      
      <div className="p-8 max-w-7xl mx-auto space-y-8">

        {/* Filter Bar & Export Actions (Hidden when printing) */}
        <div className="no-print space-y-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/70 backdrop-blur-md p-5 rounded-3xl border border-emerald-500/10 shadow-xs">
            
            {/* Quick Period Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-emerald-600" /> Filter Cepat:
              </span>
              {[
                { val: "week", label: "7 Hari" },
                { val: "month", label: "Bulan Ini" },
                { val: "year", label: "Tahun Ini" },
                { val: "all", label: "Semua" },
              ].map((p) => (
                <Button
                  key={p.val}
                  variant={period === p.val ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setStartDate(""); setEndDate(""); setPeriod(p.val) }}
                  className="rounded-xl font-bold text-xs"
                >
                  {p.label}
                </Button>
              ))}
            </div>

            {/* Custom Date Range Picker */}
            <form onSubmit={handleCustomDateFilter} className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold text-slate-600">Dari:</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-xl text-xs h-9 bg-white" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold text-slate-600">S/D:</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-xl text-xs h-9 bg-white" />
              </div>
              <Button type="submit" size="sm" variant="secondary" className="rounded-xl font-bold text-xs">
                Terapkan Tanggal
              </Button>
            </form>

            {/* Export Buttons */}
            <div className="flex gap-2 pt-2 lg:pt-0 w-full lg:w-auto">
              <Button onClick={handleExportCSV} variant="outline" size="sm" className="flex-1 lg:flex-none rounded-xl text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold">
                <Download className="h-4 w-4" /> Simpan Excel / CSV
              </Button>
              <Button onClick={handlePrint} variant="default" size="sm" className="flex-1 lg:flex-none rounded-xl text-xs shadow-md shadow-emerald-500/20 font-bold">
                <Printer className="h-4 w-4" /> Cetak PDF
              </Button>
            </div>

          </div>
        </div>

        {/* Print-Only Header Banner */}
        <div className="hidden print-only mb-6 p-4 border-b">
          <h1 className="text-2xl font-black">REKAPITULASI KEUANGAN ROTI ISANG</h1>
          <p className="text-sm">Tanggal Cetak: {new Date().toLocaleDateString("id-ID")}</p>
        </div>

        {/* Summary Financial Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="glass-card rounded-3xl p-5 relative overflow-hidden group">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Omset Penjualan</p>
                <p className="text-xl font-black text-emerald-600 tracking-tight mt-0.5">{loading ? "..." : formatCurrency(data?.summary.totalRevenue || 0)}</p>
                <p className="text-[10px] font-semibold text-slate-400">{data?.summary.totalSalesQty || 0} pcs terjual</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5 relative overflow-hidden group">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl shadow-lg shadow-orange-500/20">
                <Factory className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total HPP Produksi</p>
                <p className="text-xl font-black text-slate-800 tracking-tight mt-0.5">{loading ? "..." : formatCurrency(data?.summary.totalCost || 0)}</p>
                <p className="text-[10px] font-semibold text-slate-400">{data?.summary.totalBatches || 0} Loyang</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5 relative overflow-hidden group">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-gradient-to-br from-rose-500 to-red-600 text-white rounded-2xl shadow-lg shadow-rose-500/20">
                <RotateCcw className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kerugian Retur</p>
                <p className="text-xl font-black text-rose-600 tracking-tight mt-0.5">{loading ? "..." : formatCurrency(data?.summary.totalReturnLoss || 0)}</p>
                <p className="text-[10px] font-semibold text-slate-400">{data?.summary.totalReturnQty || 0} pcs retur</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5 relative overflow-hidden group">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-gradient-to-br from-teal-600 to-emerald-700 text-white rounded-2xl shadow-lg shadow-teal-500/20">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Laba Bersih (Net Profit)</p>
                <p className={`text-xl font-black tracking-tight mt-0.5 ${netProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                  {loading ? "..." : formatCurrency(netProfit)}
                </p>
                <p className="text-[10px] font-semibold text-slate-400">Omset - HPP - Retur</p>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Charts Grid (Multi-Bar Chart + Pie Chart) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Bar Chart (2 Cols) */}
          <Card className="lg:col-span-2 overflow-hidden border-emerald-500/10">
            <CardHeader className="bg-gradient-to-r from-emerald-50/90 to-teal-50/60 border-b border-emerald-100 py-5">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                  <BarChart3 className="h-4 w-4" />
                </div>
                Grafik Perbandingan Keuangan Harian (Omset vs HPP vs Laba)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {loading || !data?.dailyData.length ? (
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-medium">
                  Belum ada data keuangan untuk ditampilkan pada periode ini
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data.dailyData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `Rp${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v) || 0)} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="revenue" name="Omset Penjualan" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="cost" name="HPP Produksi" fill="#f97316" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="returnLoss" name="Kerugian Retur" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="profit" name="Laba Bersih" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Pie Chart / Breakdown (1 Col) */}
          <Card className="overflow-hidden border-emerald-500/10">
            <CardHeader className="bg-gradient-to-r from-emerald-50/90 to-teal-50/60 border-b border-emerald-100 py-5">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                  <PieChartIcon className="h-4 w-4" />
                </div>
                Proporsi Laba & Biaya
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {loading || !data?.summary.totalRevenue ? (
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-medium">
                  Belum ada transaksi penjualan
                </div>
              ) : (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(Number(v) || 0)} />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="space-y-2 text-xs">
                    {pieData.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 rounded-xl bg-slate-50">
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[idx] }}></span>
                          <span className="font-bold text-slate-700">{item.name}</span>
                        </div>
                        <span className="font-extrabold text-slate-800">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ingredient Usage Table */}
        <Card className="overflow-hidden border-emerald-500/10">
          <CardHeader className="bg-gradient-to-r from-emerald-50/90 to-teal-50/60 border-b border-emerald-100 py-5">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                <Package className="h-4 w-4" />
              </div>
              Rincian Penggunaan & Biaya Bahan Baku
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading || !data?.ingredientUsage.length ? (
              <div className="text-center py-12 text-slate-400 font-medium text-sm">Belum ada data bahan terpakai</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="text-left py-3.5 px-6">Nama Bahan Baku</th>
                      <th className="text-right py-3.5 px-6">Total Takaran Terpakai</th>
                      <th className="text-right py-3.5 px-6">Total Biaya Bahan (HPP)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.ingredientUsage.sort((a, b) => b.totalCost - a.totalCost).map((item, i) => (
                      <tr key={i} className="hover:bg-emerald-50/40 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-800">{item.name}</td>
                        <td className="py-4 px-6 text-right font-medium text-slate-600">
                          {formatNumber(item.totalUsed)} {item.unit}
                        </td>
                        <td className="py-4 px-6 text-right font-extrabold text-emerald-600">
                          {formatCurrency(item.totalCost)}
                        </td>
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
  )
}
