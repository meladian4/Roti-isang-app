"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { Plus, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, Package, Sparkles, DollarSign, Wallet, CheckCircle } from "lucide-react"

interface Ingredient {
  id: string
  name: string
  unit: string
  currentStock: number
  minStock: number
  pricePerUnit: number
}

const UNITS = ["gram", "kg", "ml", "liter", "pcs", "butir", "sdm", "sdt", "bungkus"]

export default function BahanBakuPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [openAdd, setOpenAdd] = useState(false)
  const [openStok, setOpenStok] = useState<string | null>(null)
  const [editItem, setEditItem] = useState<Ingredient | null>(null)
  const [form, setForm] = useState({ name: "", unit: "gram", currentStock: "", minStock: "", pricePerUnit: "" })
  const [totalBelanjaInput, setTotalBelanjaInput] = useState("")

  // Mutasi Stok State
  const [stokForm, setStokForm] = useState({ type: "IN", quantity: "", notes: "", nominalBelanja: "", updatePrice: false })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  const fetchIngredients = () => {
    fetch("/api/bahan-baku")
      .then((r) => r.json())
      .then((d) => { setIngredients(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchIngredients() }, [])

  // Financial Inventory Metrics
  const totalInventoryValue = ingredients.reduce((sum, i) => sum + i.currentStock * i.pricePerUnit, 0)
  const lowStockCount = ingredients.filter(i => i.currentStock <= i.minStock).length
  const topValueIngredient = [...ingredients].sort((a, b) => (b.currentStock * b.pricePerUnit) - (a.currentStock * a.pricePerUnit))[0]

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const cleanForm = {
      ...form,
      currentStock: form.currentStock ? form.currentStock.toString().replace(/,/g, ".") : "0",
      minStock: form.minStock ? form.minStock.toString().replace(/,/g, ".") : "0",
      pricePerUnit: form.pricePerUnit ? form.pricePerUnit.toString().replace(/,/g, ".") : "0",
    }

    let res: Response
    if (editItem) {
      res = await fetch(`/api/bahan-baku/${editItem.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cleanForm),
      })
    } else {
      res = await fetch("/api/bahan-baku", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cleanForm),
      })
    }

    if (!res.ok) {
      const err = await res.json()
      alert(err.error || "Gagal menyimpan bahan baku")
      setSaving(false)
      return
    }

    setMsg(editItem ? `Bahan ${form.name} berhasil diperbarui!` : `Bahan ${form.name} berhasil ditambahkan!`)
    setOpenAdd(false)
    setEditItem(null)
    setForm({ name: "", unit: "gram", currentStock: "", minStock: "", pricePerUnit: "" })
    setTotalBelanjaInput("")
    setSaving(false)
    fetchIngredients()
    setTimeout(() => setMsg(""), 5000)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus bahan baku ini?")) return
    const res = await fetch(`/api/bahan-baku/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json()
      alert(err.error || "Gagal menghapus bahan baku")
      return
    }
    setMsg("Bahan baku berhasil dihapus!")
    fetchIngredients()
    setTimeout(() => setMsg(""), 5000)
  }

  const handleStokUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const qtyClean = stokForm.quantity ? stokForm.quantity.toString().replace(/,/g, ".") : "0"
    const qtyNum = parseFloat(qtyClean) || 0

    let calculatedNewPrice: number | undefined = undefined
    let finalNotes = stokForm.notes

    if (stokForm.type === "IN" && stokForm.nominalBelanja) {
      const nominalClean = stokForm.nominalBelanja.replace(/\./g, "").replace(",", ".")
      const nominalNum = parseFloat(nominalClean) || 0
      if (nominalNum > 0) {
        finalNotes = `[Belanja: ${formatCurrency(nominalNum)}] ${finalNotes}`.trim()
        if (stokForm.updatePrice && qtyNum > 0) {
          calculatedNewPrice = nominalNum / qtyNum
        }
      }
    }

    const payload = {
      type: stokForm.type,
      quantity: qtyClean,
      notes: finalNotes || null,
      newPricePerUnit: calculatedNewPrice,
    }

    const res = await fetch(`/api/bahan-baku/${openStok}/stok`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) {
      alert(data.error || "Gagal memperbarui stok")
      setSaving(false)
      return
    }

    setMsg(`Mutasi stok berhasil dicatat!`)
    setOpenStok(null)
    setStokForm({ type: "IN", quantity: "", notes: "", nominalBelanja: "", updatePrice: false })
    setSaving(false)
    fetchIngredients()
    setTimeout(() => setMsg(""), 5000)
  }

  const openEdit = (item: Ingredient) => {
    setEditItem(item)
    setForm({
      name: item.name,
      unit: item.unit,
      currentStock: item.currentStock.toString().replace(/\./g, ","),
      minStock: item.minStock.toString().replace(/\./g, ","),
      pricePerUnit: item.pricePerUnit.toString().replace(/\./g, ","),
    })
    const totalVal = Math.round(item.currentStock * item.pricePerUnit)
    setTotalBelanjaInput(totalVal > 0 ? totalVal.toString() : "")
    setOpenAdd(true)
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Stok Bahan Baku & Harga Belanja"
        description="Kelola inventaris, harga belanja barang satuan maupun nominal manual, serta nilai total aset persediaan"
      />
      <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">

        {msg && (
          <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 flex-shrink-0" />
            <p className="text-sm font-bold">{msg}</p>
          </div>
        )}

        {/* Financial Summary Metric Cards for Bahan Baku */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          <div className="glass-card rounded-3xl p-5 relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-white to-teal-500/10 border-emerald-500/30 shadow-md">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Total Nilai Belanja Bahan (Dijumlahkan)
                </p>
                <p className="text-2xl font-black text-emerald-600 tracking-tight mt-0.5">
                  {formatCurrency(totalInventoryValue)}
                </p>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  Total nilai uang persediaan {ingredients.length} jenis bahan baku
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5 relative overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/25">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Status & Kategori Bahan</p>
                <p className="text-2xl font-black text-slate-800 tracking-tight mt-0.5">
                  {ingredients.length} Jenis
                </p>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  {lowStockCount > 0 ? `⚠️ ${lowStockCount} bahan perlu belanja restok` : "✓ Semua persediaan bahan aman"}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5 relative overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Nilai Belanja Terbesar</p>
                <p className="text-base font-black text-purple-900 tracking-tight mt-0.5 truncate max-w-[200px]">
                  {topValueIngredient ? topValueIngredient.name : "-"}
                </p>
                <p className="text-sm font-extrabold text-purple-700">
                  {topValueIngredient ? formatCurrency(topValueIngredient.currentStock * topValueIngredient.pricePerUnit) : "Rp 0"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-orange-500/10 shadow-xs">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Katalog Inventaris Bahan</span>
            <p className="text-base font-extrabold text-slate-800">
              {ingredients.length} Jenis Bahan • Nilai Total: <span className="text-emerald-700">{formatCurrency(totalInventoryValue)}</span>
            </p>
          </div>
          
          <Dialog open={openAdd} onOpenChange={(o) => {
            setOpenAdd(o)
            if (!o) {
              setEditItem(null)
              setForm({ name: "", unit: "gram", currentStock: "", minStock: "", pricePerUnit: "" })
              setTotalBelanjaInput("")
            }
          }}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-orange-500/25 font-bold">
                <Plus className="h-4 w-4" /> Tambah Bahan Baku
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl glass-panel max-h-[90dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                  <Sparkles className="h-5 w-5 text-orange-500" />
                  {editItem ? "Edit Data & Harga Bahan Baku" : "Tambah Bahan Baku & Harga Belanja"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Nama Bahan Baku</Label>
                  <Input
                    placeholder="Contoh: Tepung Terigu Cakra"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Satuan</Label>
                    <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">{editItem ? "Stok Saat Ini" : "Stok Awal"}</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={form.currentStock}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.,]/g, "")
                        setForm({ ...form, currentStock: val })
                        // Auto update total belanja nominal if pricePerUnit exists
                        const stockNum = parseFloat(val.replace(/,/g, ".")) || 0
                        const priceNum = parseFloat(form.pricePerUnit.replace(/,/g, ".")) || 0
                        if (stockNum > 0 && priceNum > 0) {
                          setTotalBelanjaInput(Math.round(stockNum * priceNum).toString())
                        }
                      }}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                {/* Kalkulator Nominal Belanja Manual & Harga Satuan */}
                <div className="p-3.5 bg-orange-50/80 border border-orange-200/90 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-black uppercase text-orange-900 tracking-wider flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-orange-600" />
                      Kalkulator Harga Belanja Barang
                    </Label>
                    <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                      Bisa Manual / Per Satuan
                    </span>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">
                      Total Nominal Belanja (Rp) — Opsional
                    </Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Contoh: 875000 (jika beli 1 sak)"
                      value={totalBelanjaInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "")
                        setTotalBelanjaInput(val)
                        const stockNum = parseFloat(form.currentStock.replace(/,/g, ".")) || 0
                        if (stockNum > 0 && val) {
                          const unitPrice = parseFloat(val) / stockNum
                          setForm(f => ({ ...f, pricePerUnit: unitPrice.toFixed(2).replace(/\.00$/, "").replace(".", ",") }))
                        }
                      }}
                      className="rounded-xl bg-white font-extrabold text-emerald-800"
                    />
                    <p className="text-[10px] text-slate-400">
                      Ketik total nominal uang yang dikeluarkan saat belanja untuk otomatis mengisi harga satuan di bawah.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700">Harga / Satuan ({form.unit}) (Rp)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="Contoh: 17,5 atau 15000"
                        value={form.pricePerUnit}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.,]/g, "")
                          setForm({ ...form, pricePerUnit: val })
                          const stockNum = parseFloat(form.currentStock.replace(/,/g, ".")) || 0
                          const priceNum = parseFloat(val.replace(/,/g, ".")) || 0
                          if (stockNum > 0 && priceNum > 0) {
                            setTotalBelanjaInput(Math.round(stockNum * priceNum).toString())
                          }
                        }}
                        required
                        className="rounded-xl bg-white font-extrabold text-orange-600"
                      />
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-orange-100 flex flex-col justify-center text-xs">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Total Nilai Persediaan</span>
                      <span className="font-black text-emerald-700 text-sm">
                        {formatCurrency(
                          (parseFloat(form.currentStock.replace(/,/g, ".")) || 0) *
                          (parseFloat(form.pricePerUnit.replace(/,/g, ".")) || 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Stok Minimum Warning</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Contoh: 100"
                    value={form.minStock}
                    onChange={(e) => setForm({ ...form, minStock: e.target.value.replace(/[^0-9.,]/g, "") })}
                    className="rounded-xl"
                  />
                  <p className="text-[10px] text-slate-400">Peringatan restok belanja akan menyala jika stok kurang dari batas ini.</p>
                </div>

                <Button type="submit" className="w-full mt-2 rounded-xl font-bold" disabled={saving}>
                  {saving ? "Menyimpan Data..." : "Simpan Data Bahan & Harga Belanja"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Ingredients Grid */}
        {loading ? (
          <div className="text-center py-16 text-slate-400 glass-card rounded-3xl">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30 animate-bounce" />
            <p className="font-medium">Memuat data bahan baku...</p>
          </div>
        ) : ingredients.length === 0 ? (
          <div className="text-center py-16 text-slate-400 glass-card rounded-3xl">
            <Package className="h-14 w-14 mx-auto mb-3 opacity-20" />
            <p className="font-bold text-slate-700 text-lg">Belum ada bahan baku terdaftar</p>
            <p className="text-xs text-slate-400 mt-1">Klik "Tambah Bahan Baku" di atas untuk menambahkan bahan pertama Anda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ingredients.map((ing) => {
              const isLow = ing.currentStock <= ing.minStock
              const percent = Math.min(100, Math.round((ing.currentStock / (ing.minStock * 2 || 1)) * 100))
              const totalNilaiBarang = ing.currentStock * ing.pricePerUnit

              return (
                <div key={ing.id} className={`glass-card rounded-3xl p-5 relative overflow-hidden group transition-all duration-300 ${
                  isLow ? "border-rose-400/40 bg-gradient-to-br from-white to-rose-50/40" : ""
                }`}>
                  {/* Status Banner */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-black text-slate-800 text-lg tracking-tight group-hover:text-orange-600 transition-colors uppercase">
                        {ing.name}
                      </h3>
                      <span className="text-xs font-semibold text-slate-400">Satuan: <strong className="text-slate-600">{ing.unit}</strong></span>
                    </div>
                    {isLow ? (
                      <Badge variant="danger" className="shadow-xs animate-pulse">
                        ⚠️ Stok Rendah
                      </Badge>
                    ) : (
                      <Badge variant="success" className="shadow-xs">
                        ✓ Stok Aman
                      </Badge>
                    )}
                  </div>

                  {/* Stock Gauge Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-400 uppercase tracking-wider text-[10px]">Stok Tersedia</span>
                      <span className={isLow ? "text-rose-600 font-extrabold" : "text-emerald-600 font-extrabold"}>
                        {formatNumber(ing.currentStock)} {ing.unit}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200/50">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isLow ? "bg-gradient-to-r from-rose-500 to-red-600" : "bg-gradient-to-r from-emerald-400 to-teal-500"
                        }`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Details Summary & Total Belanja / Stok Per Barang */}
                  <div className="bg-slate-50/90 backdrop-blur-xs rounded-2xl p-3.5 space-y-2 mb-5 border border-slate-100">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium">Stok Minimum:</span>
                      <span className="font-bold text-slate-700">{formatNumber(ing.minStock)} {ing.unit}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium">Harga / Satuan:</span>
                      <span className="font-extrabold text-orange-600">{formatCurrency(ing.pricePerUnit)} / {ing.unit}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200/70">
                      <span className="text-slate-700 font-bold">Total Nilai Stok / Belanja:</span>
                      <span className="font-black text-emerald-700 text-sm">
                        {formatCurrency(totalNilaiBarang)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Dialog open={openStok === ing.id} onOpenChange={(o) => {
                      setOpenStok(o ? ing.id : null)
                      if (!o) setStokForm({ type: "IN", quantity: "", notes: "", nominalBelanja: "", updatePrice: false })
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="default" size="sm" className="flex-1 shadow-sm font-bold">
                          <ArrowUpCircle className="h-4 w-4" /> Mutasi Stok
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-3xl glass-panel max-w-md max-h-[90dvh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <ArrowUpCircle className="h-5 w-5 text-emerald-600" />
                            Update Mutasi Stok: {ing.name}
                          </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleStokUpdate} className="space-y-4 mt-2">
                          <div className="space-y-1.5">
                            <Label className="font-bold text-slate-700">Tipe Pergerakan</Label>
                            <Select value={stokForm.type} onValueChange={(v) => setStokForm({ ...stokForm, type: v })}>
                              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="IN"><span className="flex items-center gap-2 text-emerald-600 font-bold"><ArrowUpCircle className="h-4 w-4" /> Stok Masuk (+) / Belanja Bahan</span></SelectItem>
                                <SelectItem value="OUT"><span className="flex items-center gap-2 text-rose-600 font-bold"><ArrowDownCircle className="h-4 w-4" /> Stok Keluar (-) / Pemakaian Manual</span></SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="font-bold text-slate-700">Jumlah ({ing.unit}) *</Label>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="Contoh: 500 atau 2,5"
                              value={stokForm.quantity}
                              onChange={(e) => setStokForm({ ...stokForm, quantity: e.target.value.replace(/[^0-9.,]/g, "") })}
                              required
                              className="rounded-xl font-bold"
                            />
                          </div>

                          {/* Jika Stok Masuk: Input Nominal Belanja Opsional */}
                          {stokForm.type === "IN" && (
                            <div className="p-3 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl space-y-2.5 text-xs">
                              <div className="flex items-center justify-between">
                                <Label className="font-bold text-emerald-900 flex items-center gap-1">
                                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Total Uang Belanja Masuk (Rp) — Opsional
                                </Label>
                              </div>
                              <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="Contoh: 175000"
                                value={stokForm.nominalBelanja}
                                onChange={(e) => setStokForm({ ...stokForm, nominalBelanja: e.target.value.replace(/[^0-9]/g, "") })}
                                className="rounded-xl bg-white font-extrabold text-emerald-800"
                              />
                              {stokForm.nominalBelanja && parseFloat(stokForm.quantity) > 0 && (
                                <div className="space-y-2 pt-1">
                                  <div className="flex justify-between items-center text-emerald-900 font-bold">
                                    <span>Estimasi Harga Satuan Belanja Baru:</span>
                                    <span className="text-emerald-700 font-black">
                                      {formatCurrency(parseFloat(stokForm.nominalBelanja) / parseFloat(stokForm.quantity.replace(/,/g, ".")))} / {ing.unit}
                                    </span>
                                  </div>
                                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                                    <input
                                      type="checkbox"
                                      checked={stokForm.updatePrice}
                                      onChange={(e) => setStokForm({ ...stokForm, updatePrice: e.target.checked })}
                                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                                    />
                                    <span>Perbarui Harga / Satuan bahan ini dengan harga belanja baru tersebut?</span>
                                  </label>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <Label className="font-bold text-slate-700">Keterangan Catatan</Label>
                            <Input
                              placeholder="Contoh: Belanja di Toko Bahan Kue Maju, dll"
                              value={stokForm.notes}
                              onChange={(e) => setStokForm({ ...stokForm, notes: e.target.value })}
                              className="rounded-xl"
                            />
                          </div>
                          <Button type="submit" className="w-full mt-2 rounded-xl font-bold" disabled={saving}>
                            {saving ? "Menyimpan Mutasi..." : "Simpan Mutasi Stok"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>

                    <Button variant="outline" size="sm" onClick={() => openEdit(ing)} className="rounded-xl">
                      <Pencil className="h-4 w-4 text-slate-600" />
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl text-rose-600 hover:bg-rose-50 hover:border-rose-200" onClick={() => handleDelete(ing.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
