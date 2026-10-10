"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { BarChart3, TrendingUp, Package, Factory, DollarSign, RotateCcw, Wallet, Download, Printer, PieChart as PieChartIcon, Filter, BookOpen, Lock, Unlock, CheckCircle, Boxes } from "lucide-react"
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
    totalOperationalExpense: number
    totalInventoryValue: number
    netProfit: number
    isLocked?: boolean
  }
  ingredientUsage: Array<{ name: string; unit: string; totalUsed: number; totalCost: number }>
  dailyData: Array<{ date: string; revenue: number; cost: number; returnLoss: number; operational: number; profit: number }>
  sales: Array<{ date: string; recipeName: string; quantity: number; totalAmount: number }>
  returns: Array<{ date: string; recipeName: string; quantity: number; reason: string; lossAmount: number }>
  operationalExpenses: Array<{ date: string; name: string; category: string; amount: number }>
}

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
const COLORS = ["#10b981", "#f97316", "#ef4444", "#d97706", "#3b82f6"]

export default function LaporanPage() {
  const [data, setData] = useState<LaporanData | null>(null)
  const [period, setPeriod] = useState("month")
  
  // Specific Month/Year Picker State
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState((now.getMonth() + 1).toString())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear().toString())
  
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [loading, setLoading] = useState(true)
  const [isLocked, setIsLocked] = useState(false)
  const [msg, setMsg] = useState("")

  const fetchLaporan = (paramsQuery: string) => {
    setLoading(true)
    fetch(`/api/laporan?${paramsQuery}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setIsLocked(!!d.summary?.isLocked)
        setLoading(false)
      })
  }

  useEffect(() => {
    if (period === "specific-month") {
      fetchLaporan(`month=${selectedMonth}&year=${selectedYear}`)
    } else {
      fetchLaporan(`period=${period}`)
    }
  }, [period, selectedMonth, selectedYear])

  const handleMonthSelect = (m: string) => {
    setSelectedMonth(m)
    setPeriod("specific-month")
  }

  const handleYearSelect = (y: string) => {
    setSelectedYear(y)
    setPeriod("specific-month")
  }

  const handleCustomDateFilter = (e: React.FormEvent) => {
    e.preventDefault()
    if (!startDate || !endDate) {
      alert("Pilih tanggal mulai dan tanggal akhir terlebih dahulu!")
      return
    }
    setPeriod("custom")
    fetchLaporan(`startDate=${startDate}&endDate=${endDate}`)
  }

  const handleTutupBuku = async () => {
    const currentM = parseInt(selectedMonth, 10)
    const currentY = parseInt(selectedYear, 10)
    const monthName = MONTHS.find(m => m.val === selectedMonth)?.label || "Bulan Ini"

    if (isLocked) {
      // Unlock in Database
      await fetch("/api/laporan/tutup-buku", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: currentM, year: currentY, isLocked: false }),
      })
      setIsLocked(false)
      setMsg(`Kunci Tutup Buku Periode ${monthName} ${selectedYear} dibuka kembali di database. Anda dapat merevisi transaksi.`)
      setTimeout(() => setMsg(""), 6000)
    } else {
      if (confirm(`Apakah Anda yakin ingin melakukan Tutup Buku untuk periode ${monthName} ${selectedYear}?\n\nLaporan keuangan ${monthName} ${selectedYear} akan dibekukan di database sebagai arsip resmi.\n\nKlik OK untuk mengunci dan beralih ke bulan berikutnya.`)) {
        // Lock in Database
        await fetch("/api/laporan/tutup-buku", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ month: currentM, year: currentY, isLocked: true }),
        })
        setIsLocked(true)

        // Calculate next month & year
        let nextM = currentM + 1
        let nextY = currentY
        if (nextM > 12) {
          nextM = 1
          nextY = currentY + 1
        }

        const nextMonthName = MONTHS.find(m => m.val === nextM.toString())?.label || "Bulan Baru"
        setMsg(`Tutup Buku Periode ${monthName} ${selectedYear} Berhasil Terdaftar di Database! Beralih ke pembukuan ${nextMonthName} ${nextY}. Angka transaksi otomatis direset ke Rp 0 & sisa persediaan terbawa.`)

        // Switch filter to next month automatically
        setSelectedMonth(nextM.toString())
        setSelectedYear(nextY.toString())
        setPeriod("specific-month")
        setTimeout(() => setMsg(""), 8000)
      }
    }
  }

  const handleExportCSV = () => {
    if (!data) return

    let csvContent = "data:text/csv;charset=utf-8,"
    csvContent += "=== LAPORAN BUKU BESAR & LABA BERSIH ROTI ISANG ===\n"
    csvContent += `Periode: ${period === "specific-month" ? `${MONTHS.find(m=>m.val===selectedMonth)?.label} ${selectedYear}` : period}\n\n`

    csvContent += "RINGKASAN BUKU BESAR LABA RUGI\n"
    csvContent += `Total Omset Penjualan (+),${data.summary.totalRevenue}\n`
    csvContent += `Total HPP Produksi Roti (-),${data.summary.totalCost}\n`
    csvContent += `Total Kerugian Retur (-),${data.summary.totalReturnLoss}\n`
    csvContent += `Total Beban Operasional (-),${data.summary.totalOperationalExpense}\n`
    csvContent += `LABA BERSIH AKHIR USAHA,${data.summary.netProfit}\n`
    csvContent += `Nilai Persediaan Sisa Bahan (Aset Periode Berikutnya),${data.summary.totalInventoryValue}\n\n`

    csvContent += "PENGGUNAAN BAHAN BAKU\n"
    csvContent += "Nama Bahan,Total Terpakai,Satuan,Total Biaya (Rp)\n"
    data.ingredientUsage.forEach((ing) => {
      csvContent += `"${ing.name}",${ing.totalUsed},"${ing.unit}",${ing.totalCost}\n`
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Laporan_BukuBesar_Roti_Isang_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    window.print()
  }

  const netProfit = data?.summary.netProfit || 0
  const omset = data?.summary.totalRevenue || 0
  const hpp = data?.summary.totalCost || 0
  const retur = data?.summary.totalReturnLoss || 0
  const operasional = data?.summary.totalOperationalExpense || 0
  const totalInventoryValue = data?.summary.totalInventoryValue || 0

  // Pie Chart Data Breakdown
  const pieData = data
    ? [
        { name: "Omset Penjualan (+)", value: omset },
        { name: "HPP Produksi (-)", value: hpp },
        { name: "Kerugian Retur (-)", value: retur },
        { name: "Beban Operasional (-)", value: operasional },
        { name: "Laba Bersih Akhir", value: Math.max(0, netProfit) },
      ]
    : []

  return (
    <div className="min-h-screen pb-12">
      <Header title="Laporan Buku Besar & Laba Bersih Usaha" description="Rekapitulasi Omset, HPP, Retur, Beban Operasional, & Sisa Aset Persediaan" />
      
      <div className="p-8 max-w-7xl mx-auto space-y-8">

        {msg && (
          <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center gap-3 animate-float">
            <CheckCircle className="h-6 w-6 flex-shrink-0" />
            <p className="text-sm font-bold">{msg}</p>
          </div>
        )}

        {/* Locked Month Notification Banner */}
        {isLocked && (
          <div className="p-4 bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl flex items-center justify-between gap-4 text-amber-900 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-black text-sm uppercase tracking-wide">
                  Periode {MONTHS.find(m => m.val === selectedMonth)?.label} {selectedYear} Telah Ditutup & Dibekukan
                </h4>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  Laporan keuangan periode ini tersimpan sebagai arsip resmi. Seluruh penginputan transaksi baru dialihkan ke bulan berikutnya.
                </p>
              </div>
            </div>
            <Button onClick={handleTutupBuku} variant="outline" size="sm" className="rounded-xl border-amber-400 text-amber-900 hover:bg-amber-100 text-xs font-extrabold flex-shrink-0">
              <Unlock className="h-3.5 w-3.5" /> Buka Kunci Revisi
            </Button>
          </div>
        )}

        {/* Filter Bar & Monthly Period Picker */}
        <div className="no-print space-y-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/80 backdrop-blur-md p-5 rounded-3xl border border-emerald-500/10 shadow-xs">
            
            {/* Quick Period Buttons & Month Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-emerald-600" /> Filter Periode:
              </span>
              {[
                { val: "month", label: "Bulan Ini" },
                { val: "week", label: "7 Hari" },
                { val: "year", label: "Tahun Ini" },
                { val: "all", label: "Semua Data" },
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

              {/* Specific Month & Year Select Dropdowns */}
              <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200">
                <Select value={selectedMonth} onValueChange={handleMonthSelect}>
                  <SelectTrigger className="h-8 w-32 text-xs font-bold rounded-xl bg-white border-emerald-300 text-emerald-900">
                    <SelectValue placeholder="Pilih Bulan" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => (
                      <SelectItem key={m.val} value={m.val} className="text-xs font-medium">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedYear} onValueChange={handleYearSelect}>
                  <SelectTrigger className="h-8 w-20 text-xs font-bold rounded-xl bg-white border-emerald-300 text-emerald-900">
                    <SelectValue placeholder="Tahun" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => (
                      <SelectItem key={y} value={y} className="text-xs font-medium">{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actions: Tutup Buku & Export */}
            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              {!isLocked ? (
                <Button onClick={handleTutupBuku} variant="secondary" size="sm" className="rounded-xl text-xs font-bold text-white shadow-md bg-amber-500 hover:bg-amber-600 shadow-amber-500/20">
                  <Lock className="h-4 w-4" /> Tutup Buku Bulanan
                </Button>
              ) : (
                <Button onClick={handleTutupBuku} variant="outline" size="sm" className="rounded-xl text-xs font-bold border-amber-300 text-amber-800 hover:bg-amber-50">
                  <Unlock className="h-4 w-4" /> Buka Kunci Buku
                </Button>
              )}
              <Button onClick={handleExportCSV} variant="outline" size="sm" className="rounded-xl text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold">
                <Download className="h-4 w-4" /> Excel / CSV
              </Button>
              <Button onClick={handlePrint} variant="default" size="sm" className="rounded-xl text-xs shadow-md shadow-emerald-500/20 font-bold">
                <Printer className="h-4 w-4" /> Cetak PDF
              </Button>
            </div>

          </div>
        </div>

        {/* Print-Only Header Banner */}
        <div className="hidden print-only mb-6 p-4 border-b">
          <h1 className="text-2xl font-black">LAPORAN BUKU BESAR & LABA BERSIH ROTI ISANG</h1>
          <p className="text-sm">Periode: {period === "specific-month" ? `${MONTHS.find(m=>m.val===selectedMonth)?.label} ${selectedYear}` : period} | Cetak: {new Date().toLocaleDateString("id-ID")}</p>
        </div>

        {/* Financial Summary Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="glass-card rounded-3xl p-4 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-md shadow-emerald-500/20">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Omset Penjualan (+)</p>
                <p className="text-lg font-black text-emerald-600 tracking-tight mt-0.5">{loading ? "..." : formatCurrency(omset)}</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-4 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500 text-white rounded-2xl shadow-md shadow-orange-500/20">
                <Factory className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">HPP Produksi (-)</p>
                <p className="text-lg font-black text-slate-800 tracking-tight mt-0.5">{loading ? "..." : formatCurrency(hpp)}</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-4 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500 text-white rounded-2xl shadow-md shadow-rose-500/20">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kerugian Retur (-)</p>
                <p className="text-lg font-black text-rose-600 tracking-tight mt-0.5">{loading ? "..." : formatCurrency(retur)}</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-4 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md shadow-amber-500/20">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Beban Operasional (-)</p>
                <p className="text-lg font-black text-amber-600 tracking-tight mt-0.5">{loading ? "..." : formatCurrency(operasional)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl p-4 relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xl shadow-emerald-700/25 border border-emerald-400/30">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 text-white rounded-2xl backdrop-blur-md shadow-inner">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-emerald-100 uppercase tracking-wider">Laba Bersih Akhir</p>
                <p className="text-lg font-black text-white tracking-tight mt-0.5">{loading ? "..." : formatCurrency(netProfit)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Asset Carryover Banner Card */}
        <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-blue-500/30 rounded-2xl backdrop-blur-md border border-blue-400/30">
              <Boxes className="h-7 w-7 text-blue-300" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider block">Modal Persediaan Dibawa ke Bulan Depan</span>
              <h4 className="text-xl font-black tracking-tight mt-0.5">Aset Sisa Stok Bahan Baku: {loading ? "..." : formatCurrency(totalInventoryValue)}</h4>
              <p className="text-xs text-blue-200/80 mt-1">
                Sisa fisik tepung, gula, margarin, & kemasan tetap utuh di pabrik dan otomatis menjadi stok awal bulan berikutnya tanpa memotong laba lagi.
              </p>
            </div>
          </div>
        </div>

        {/* Buku Besar Laba Rugi Table Card */}
        <Card className="overflow-hidden border-emerald-500/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white py-5 flex flex-row justify-between items-center">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-300" />
              Buku Besar Laba Rugi Komprehensif (General Ledger)
            </CardTitle>
            {isLocked && (
              <span className="px-3 py-1 bg-amber-400 text-amber-950 font-black text-xs rounded-full flex items-center gap-1">
                <Lock className="h-3 w-3" /> TUTUP BUKU TERKUNCI
              </span>
            )}
          </CardHeader>
          <CardContent className="p-6 bg-white space-y-4">
            <div className="divide-y divide-slate-100 text-sm">
              <div className="py-3 flex justify-between items-center">
                <span className="font-bold text-slate-700 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block"></span>
                  1. Total Omset Penjualan Roti
                </span>
                <span className="font-black text-emerald-600 text-base">+{formatCurrency(omset)}</span>
              </div>
              <div className="py-3 flex justify-between items-center">
                <span className="font-bold text-slate-700 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-orange-500 inline-block"></span>
                  2. Total HPP Bahan Baku Terpakai untuk Produksi
                </span>
                <span className="font-extrabold text-slate-800">-{formatCurrency(hpp)}</span>
              </div>
              <div className="py-3 flex justify-between items-center">
                <span className="font-bold text-slate-700 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-500 inline-block"></span>
                  3. Total Kerugian Retur & Kadaluarsa
                </span>
                <span className="font-bold text-rose-600">-{formatCurrency(retur)}</span>
              </div>
              <div className="py-3 flex justify-between items-center">
                <span className="font-bold text-slate-700 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-amber-500 inline-block"></span>
                  4. Total Beban & Pembelanjaan Operasional (Plastik, Gas, Listrik, Gaji, dll)
                </span>
                <span className="font-bold text-amber-600">-{formatCurrency(operasional)}</span>
              </div>
              <div className="pt-4 pb-1 flex justify-between items-center bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200">
                <div>
                  <p className="font-black text-slate-800 text-base">LABA BERSIH AKHIR USAHA (NET PROFIT)</p>
                  <p className="text-xs text-slate-400 font-medium">Omset Penjualan - (HPP + Retur + Beban Operasional)</p>
                </div>
                <span className={`text-2xl font-black ${netProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                  {formatCurrency(netProfit)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interactive Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Bar Chart */}
          <Card className="lg:col-span-2 overflow-hidden border-emerald-500/10">
            <CardHeader className="bg-gradient-to-r from-emerald-50/90 to-teal-50/60 border-b border-emerald-100 py-5">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                Grafik Tren Keuangan Buku Besar Harian
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
                    <Bar dataKey="operational" name="Beban Operasional" fill="#d97706" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="profit" name="Laba Bersih" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Pie Chart / Breakdown */}
          <Card className="overflow-hidden border-emerald-500/10">
            <CardHeader className="bg-gradient-to-r from-emerald-50/90 to-teal-50/60 border-b border-emerald-100 py-5">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                <PieChartIcon className="h-5 w-5 text-emerald-600" />
                Proporsi Komposisi Buku Besar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {loading || !omset ? (
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
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={4}
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

      </div>
    </div>
  )
}
