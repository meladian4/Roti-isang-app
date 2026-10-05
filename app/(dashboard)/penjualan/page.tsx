"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils"
import { Plus, Pencil, Trash2, ShoppingBag, RotateCcw, DollarSign, AlertTriangle, CheckCircle } from "lucide-react"

interface Recipe { id: string; name: string; servingsPerBatch: number }
interface Sale {
  id: string
  recipeId: string | null
  recipeName: string
  quantity: number
  pricePerUnit: number
  totalAmount: number
  notes: string | null
  date: string
  user: { name: string | null } | null
}
interface SaleReturn {
  id: string
  recipeId: string | null
  recipeName: string
  quantity: number
  reason: string | null
  lossAmount: number
  notes: string | null
  date: string
  user: { name: string | null } | null
}

const REASONS = ["Kadaluarsa (Expired)", "Rusak / Bantet", "Ditolak Toko / Konsinyasi", "Kemasan Cacat", "Lainnya"]

export default function PenjualanPage() {
  const { data: session } = useSession()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [returns, setReturns] = useState<SaleReturn[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"penjualan" | "retur">("penjualan")

  // Sales Form State (Add / Edit)
  const [openSaleModal, setOpenSaleModal] = useState(false)
  const [editSaleItem, setEditSaleItem] = useState<Sale | null>(null)
  const [saleForm, setSaleForm] = useState({ recipeId: "", recipeName: "", quantity: "1", pricePerUnit: "", notes: "", date: "" })
  const [savingSale, setSavingSale] = useState(false)

  // Returns Form State (Add / Edit)
  const [openReturnModal, setOpenReturnModal] = useState(false)
  const [editReturnItem, setEditReturnItem] = useState<SaleReturn | null>(null)
  const [returnForm, setReturnForm] = useState({ recipeId: "", recipeName: "", quantity: "1", reason: "Kadaluarsa (Expired)", lossAmount: "", notes: "", date: "" })
  const [savingReturn, setSavingReturn] = useState(false)

  const [msg, setMsg] = useState("")

  const fetchData = () => {
    Promise.all([
      fetch("/api/resep").then(r => r.json()),
      fetch("/api/penjualan").then(r => r.json()),
      fetch("/api/retur").then(r => r.json()),
    ]).then(([r, s, ret]) => {
      setRecipes(r)
      setSales(s)
      setReturns(ret)
      setLoading(false)
    })
  }

  useEffect(() => { fetchData() }, [])

  // Open Add / Edit Sale
  const openAddSale = () => {
    setEditSaleItem(null)
    setSaleForm({ recipeId: "", recipeName: "", quantity: "1", pricePerUnit: "", notes: "", date: "" })
    setOpenSaleModal(true)
  }

  const openEditSale = (item: Sale) => {
    setEditSaleItem(item)
    setSaleForm({
      recipeId: item.recipeId || "",
      recipeName: item.recipeName,
      quantity: item.quantity.toString(),
      pricePerUnit: item.pricePerUnit.toString(),
      notes: item.notes || "",
      date: item.date ? new Date(item.date).toISOString().split("T")[0] : "",
    })
    setOpenSaleModal(true)
  }

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSale(true)

    let res: Response
    if (editSaleItem) {
      res = await fetch(`/api/penjualan/${editSaleItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleForm),
      })
    } else {
      res = await fetch("/api/penjualan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...saleForm,
          userId: (session?.user as { id?: string })?.id,
        }),
      })
    }

    const data = await res.json()
    if (!res.ok) {
      alert(data.error || "Gagal menyimpan penjualan")
      setSavingSale(false)
      return
    }

    setMsg(editSaleItem ? "Data penjualan berhasil diupdate!" : `Penjualan berhasil dicatat! Omset: ${formatCurrency(data.totalAmount)}`)
    setOpenSaleModal(false)
    setEditSaleItem(null)
    setSaleForm({ recipeId: "", recipeName: "", quantity: "1", pricePerUnit: "", notes: "", date: "" })
    setSavingSale(false)
    fetchData()
    setTimeout(() => setMsg(""), 5000)
  }

  const handleDeleteSale = async (id: string) => {
    if (!confirm("Hapus data transaksi penjualan ini?")) return
    const res = await fetch(`/api/penjualan/${id}`, { method: "DELETE" })
    if (!res.ok) {
      alert("Gagal menghapus data penjualan")
      return
    }
    fetchData()
  }

  // Open Add / Edit Return
  const openAddReturn = () => {
    setEditReturnItem(null)
    setReturnForm({ recipeId: "", recipeName: "", quantity: "1", reason: "Kadaluarsa (Expired)", lossAmount: "", notes: "", date: "" })
    setOpenReturnModal(true)
  }

  const openEditReturn = (item: SaleReturn) => {
    setEditReturnItem(item)
    setReturnForm({
      recipeId: item.recipeId || "",
      recipeName: item.recipeName,
      quantity: item.quantity.toString(),
      reason: item.reason || "Kadaluarsa (Expired)",
      lossAmount: item.lossAmount.toString(),
      notes: item.notes || "",
      date: item.date ? new Date(item.date).toISOString().split("T")[0] : "",
    })
    setOpenReturnModal(true)
  }

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingReturn(true)

    let res: Response
    if (editReturnItem) {
      res = await fetch(`/api/retur/${editReturnItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(returnForm),
      })
    } else {
      res = await fetch("/api/retur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...returnForm,
          userId: (session?.user as { id?: string })?.id,
        }),
      })
    }

    const data = await res.json()
    if (!res.ok) {
      alert(data.error || "Gagal menyimpan retur")
      setSavingReturn(false)
      return
    }

    setMsg(editReturnItem ? "Data retur berhasil diupdate!" : `Retur berhasil dicatat! Kerugian HPP: ${formatCurrency(data.lossAmount)}`)
    setOpenReturnModal(false)
    setEditReturnItem(null)
    setReturnForm({ recipeId: "", recipeName: "", quantity: "1", reason: "Kadaluarsa (Expired)", lossAmount: "", notes: "", date: "" })
    setSavingReturn(false)
    fetchData()
    setTimeout(() => setMsg(""), 5000)
  }

  const handleDeleteReturn = async (id: string) => {
    if (!confirm("Hapus data retur ini?")) return
    const res = await fetch(`/api/retur/${id}`, { method: "DELETE" })
    if (!res.ok) {
      alert("Gagal menghapus data retur")
      return
    }
    fetchData()
  }

  const handleRecipeSaleSelect = (id: string) => {
    const selected = recipes.find(r => r.id === id)
    setSaleForm({
      ...saleForm,
      recipeId: id,
      recipeName: selected ? selected.name : saleForm.recipeName,
    })
  }

  const handleRecipeReturnSelect = (id: string) => {
    const selected = recipes.find(r => r.id === id)
    setReturnForm({
      ...returnForm,
      recipeId: id,
      recipeName: selected ? selected.name : returnForm.recipeName,
    })
  }

  const totalOmset = sales.reduce((sum, s) => sum + s.totalAmount, 0)
  const totalPcsSold = sales.reduce((sum, s) => sum + s.quantity, 0)
  const totalReturnLoss = returns.reduce((sum, r) => sum + r.lossAmount, 0)
  const totalPcsReturned = returns.reduce((sum, r) => sum + r.quantity, 0)

  return (
    <div className="min-h-screen">
      <Header title="Penjualan & Retur Roti" description="Catat, edit, dan hapus transaksi omset penjualan & retur roti" />
      <div className="p-8 max-w-7xl mx-auto space-y-6">

        {msg && (
          <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center gap-3 animate-float">
            <CheckCircle className="h-6 w-6 flex-shrink-0" />
            <p className="text-sm font-bold">{msg}</p>
          </div>
        )}

        {/* Financial Summary Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="glass-card rounded-2xl p-5 relative overflow-hidden group">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Total Omset</p>
                <p className="text-xl font-black text-emerald-600 tracking-tight mt-0.5">{formatCurrency(totalOmset)}</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 relative overflow-hidden group">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/25">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Roti Terjual</p>
                <p className="text-xl font-black text-slate-800 tracking-tight mt-0.5">{formatNumber(totalPcsSold)} pcs</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 relative overflow-hidden group">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/25">
                <RotateCcw className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Kerugian Retur</p>
                <p className="text-xl font-black text-rose-600 tracking-tight mt-0.5">{formatCurrency(totalReturnLoss)}</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 relative overflow-hidden group">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/25">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Roti Retur</p>
                <p className="text-xl font-black text-slate-800 tracking-tight mt-0.5">{formatNumber(totalPcsReturned)} pcs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher & Modal Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/60 backdrop-blur-md p-3 rounded-2xl border border-emerald-500/10 shadow-xs">
          <div className="flex bg-slate-100/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("penjualan")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "penjualan" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ShoppingBag className="h-4 w-4" /> Data Penjualan ({sales.length})
            </button>
            <button
              onClick={() => setActiveTab("retur")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "retur" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <RotateCcw className="h-4 w-4" /> Data Retur ({returns.length})
            </button>
          </div>

          {activeTab === "penjualan" ? (
            <Dialog open={openSaleModal} onOpenChange={(o) => { setOpenSaleModal(o); if (!o) setEditSaleItem(null); }}>
              <DialogTrigger asChild>
                <Button onClick={openAddSale} className="shadow-lg shadow-emerald-500/25">
                  <Plus className="h-4 w-4" /> Catat Penjualan Baru
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-3xl glass-panel">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                    <ShoppingBag className="h-5 w-5 text-emerald-600" />
                    {editSaleItem ? "Edit Transaksi Penjualan" : "Input Transaksi Penjualan Roti"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaleSubmit} className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Tanggal Transaksi</Label>
                    <Input type="date" value={saleForm.date} onChange={e => setSaleForm({ ...saleForm, date: e.target.value })} className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Pilih Resep / Nama Roti</Label>
                    <Select value={saleForm.recipeId} onValueChange={handleRecipeSaleSelect}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Pilih jenis roti..." /></SelectTrigger>
                      <SelectContent>
                        {recipes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Nama Roti (Teks Bebas)</Label>
                    <Input placeholder="Contoh: Roti Isang Cokelat" value={saleForm.recipeName} onChange={e => setSaleForm({ ...saleForm, recipeName: e.target.value })} required className="rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="font-bold text-slate-700">Jumlah Terjual (pcs)</Label>
                      <Input type="number" min="1" value={saleForm.quantity} onChange={e => setSaleForm({ ...saleForm, quantity: e.target.value })} required className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-bold text-slate-700">Harga / pcs (Rp)</Label>
                      <Input type="number" step="100" placeholder="10000" value={saleForm.pricePerUnit} onChange={e => setSaleForm({ ...saleForm, pricePerUnit: e.target.value })} required className="rounded-xl" />
                    </div>
                  </div>

                  {saleForm.quantity && saleForm.pricePerUnit && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-600">Total Omset Penjualan:</span>
                      <span className="font-black text-emerald-600 text-base">
                        {formatCurrency((parseInt(saleForm.quantity) || 0) * (parseFloat(saleForm.pricePerUnit) || 0))}
                      </span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Catatan Transaksi / Pembeli</Label>
                    <Textarea placeholder="Contoh: Penjualan Toko A, Kasir Siang..." value={saleForm.notes} onChange={e => setSaleForm({ ...saleForm, notes: e.target.value })} rows={2} className="rounded-xl" />
                  </div>

                  <Button type="submit" className="w-full rounded-xl" disabled={savingSale}>
                    {savingSale ? "Menyimpan Transaksi..." : editSaleItem ? "Update Penjualan" : "Simpan Penjualan"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={openReturnModal} onOpenChange={(o) => { setOpenReturnModal(o); if (!o) setEditReturnItem(null); }}>
              <DialogTrigger asChild>
                <Button variant="destructive" onClick={openAddReturn} className="shadow-lg shadow-rose-500/25">
                  <Plus className="h-4 w-4" /> Catat Retur Baru
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-3xl glass-panel">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl font-bold text-rose-700">
                    <RotateCcw className="h-5 w-5 text-rose-500" />
                    {editReturnItem ? "Edit Data Retur Roti" : "Input Retur / Kadaluarsa Roti"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleReturnSubmit} className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Tanggal Retur</Label>
                    <Input type="date" value={returnForm.date} onChange={e => setReturnForm({ ...returnForm, date: e.target.value })} className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Pilih Resep / Jenis Roti</Label>
                    <Select value={returnForm.recipeId} onValueChange={handleRecipeReturnSelect}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Pilih jenis roti..." /></SelectTrigger>
                      <SelectContent>
                        {recipes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Nama Roti (Teks Bebas)</Label>
                    <Input placeholder="Contoh: Roti Isang Original" value={returnForm.recipeName} onChange={e => setReturnForm({ ...returnForm, recipeName: e.target.value })} required className="rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="font-bold text-slate-700">Jumlah Retur (pcs)</Label>
                      <Input type="number" min="1" value={returnForm.quantity} onChange={e => setReturnForm({ ...returnForm, quantity: e.target.value })} required className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-bold text-slate-700">Alasan Retur</Label>
                      <Select value={returnForm.reason} onValueChange={v => setReturnForm({ ...returnForm, reason: v })}>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Estimasi Kerugian HPP (Rp, Opsional)</Label>
                    <Input type="number" placeholder="Otomatis dihitung jika kosong" value={returnForm.lossAmount} onChange={e => setReturnForm({ ...returnForm, lossAmount: e.target.value })} className="rounded-xl" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Catatan / Detail Toko</Label>
                    <Textarea placeholder="Contoh: Ditarik dari Minimarket B..." value={returnForm.notes} onChange={e => setReturnForm({ ...returnForm, notes: e.target.value })} rows={2} className="rounded-xl" />
                  </div>

                  <Button type="submit" variant="destructive" className="w-full rounded-xl" disabled={savingReturn}>
                    {savingReturn ? "Menyimpan Retur..." : editReturnItem ? "Update Data Retur" : "Simpan Data Retur"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Tab Content Tables */}
        {activeTab === "penjualan" ? (
          <Card className="overflow-hidden border-emerald-500/10">
            <CardHeader className="bg-gradient-to-r from-emerald-50/90 to-teal-50/60 border-b border-emerald-100 py-5">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                <ShoppingBag className="h-5 w-5 text-emerald-600" /> Riwayat Transaksi Penjualan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-12 text-slate-400">Memuat data penjualan...</div>
              ) : sales.length === 0 ? (
                <div className="text-center py-12 text-slate-400">Belum ada transaksi penjualan terdaftar</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                        <th className="text-left py-3.5 px-6">Tanggal</th>
                        <th className="text-left py-3.5 px-6">Nama Roti</th>
                        <th className="text-right py-3.5 px-6">Terjual</th>
                        <th className="text-right py-3.5 px-6">Harga / Pcs</th>
                        <th className="text-right py-3.5 px-6">Total Omset</th>
                        <th className="text-left py-3.5 px-6">Catatan</th>
                        <th className="text-center py-3.5 px-6">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sales.map(s => (
                        <tr key={s.id} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="py-4 px-6 text-slate-500 font-medium">{formatDate(s.date)}</td>
                          <td className="py-4 px-6 font-bold text-slate-800">{s.recipeName}</td>
                          <td className="py-4 px-6 text-right font-bold text-slate-700">{formatNumber(s.quantity)} pcs</td>
                          <td className="py-4 px-6 text-right font-semibold text-slate-600">{formatCurrency(s.pricePerUnit)}</td>
                          <td className="py-4 px-6 text-right font-extrabold text-emerald-600">{formatCurrency(s.totalAmount)}</td>
                          <td className="py-4 px-6 text-xs text-slate-400">{s.notes || "-"}</td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex justify-center gap-1">
                              <Button variant="outline" size="sm" onClick={() => openEditSale(s)} className="rounded-xl h-8 w-8 p-0">
                                <Pencil className="h-3.5 w-3.5 text-slate-600" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDeleteSale(s.id)} className="rounded-xl h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 border-rose-200">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden border-rose-500/10">
            <CardHeader className="bg-gradient-to-r from-rose-50/80 to-red-50/50 border-b border-rose-100 py-5">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-rose-800">
                <RotateCcw className="h-5 w-5 text-rose-500" /> Riwayat Retur / Kadaluarsa Roti
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-12 text-slate-400">Memuat data retur...</div>
              ) : returns.length === 0 ? (
                <div className="text-center py-12 text-slate-400">Belum ada catatan retur roti</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                        <th className="text-left py-3.5 px-6">Tanggal</th>
                        <th className="text-left py-3.5 px-6">Nama Roti</th>
                        <th className="text-right py-3.5 px-6">Jumlah Retur</th>
                        <th className="text-left py-3.5 px-6">Alasan</th>
                        <th className="text-right py-3.5 px-6">Estimasi Kerugian HPP</th>
                        <th className="text-left py-3.5 px-6">Catatan</th>
                        <th className="text-center py-3.5 px-6">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {returns.map(r => (
                        <tr key={r.id} className="hover:bg-rose-50/40 transition-colors">
                          <td className="py-4 px-6 text-slate-500 font-medium">{formatDate(r.date)}</td>
                          <td className="py-4 px-6 font-bold text-slate-800">{r.recipeName}</td>
                          <td className="py-4 px-6 text-right font-bold text-rose-700">{formatNumber(r.quantity)} pcs</td>
                          <td className="py-4 px-6">
                            <Badge variant="danger" className="text-[10px]">
                              {r.reason || "Kadaluarsa"}
                            </Badge>
                          </td>
                          <td className="py-4 px-6 text-right font-extrabold text-rose-600">{formatCurrency(r.lossAmount)}</td>
                          <td className="py-4 px-6 text-xs text-slate-400">{r.notes || "-"}</td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex justify-center gap-1">
                              <Button variant="outline" size="sm" onClick={() => openEditReturn(r)} className="rounded-xl h-8 w-8 p-0">
                                <Pencil className="h-3.5 w-3.5 text-slate-600" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDeleteReturn(r.id)} className="rounded-xl h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 border-rose-200">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}
