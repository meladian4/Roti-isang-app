"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { Plus, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, Package, Sparkles } from "lucide-react"

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
  const [stokForm, setStokForm] = useState({ type: "IN", quantity: "", notes: "" })
  const [saving, setSaving] = useState(false)

  const fetchIngredients = () => {
    fetch("/api/bahan-baku")
      .then((r) => r.json())
      .then((d) => { setIngredients(d); setLoading(false) })
  }

  useEffect(() => { fetchIngredients() }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    let res: Response
    if (editItem) {
      res = await fetch(`/api/bahan-baku/${editItem.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      })
    } else {
      res = await fetch("/api/bahan-baku", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      })
    }

    if (!res.ok) {
      const err = await res.json()
      alert(err.error || "Gagal menyimpan bahan baku")
      setSaving(false)
      return
    }

    setOpenAdd(false)
    setEditItem(null)
    setForm({ name: "", unit: "gram", currentStock: "", minStock: "", pricePerUnit: "" })
    setSaving(false)
    fetchIngredients()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus bahan baku ini?")) return
    const res = await fetch(`/api/bahan-baku/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json()
      alert(err.error || "Gagal menghapus bahan baku")
      return
    }
    fetchIngredients()
  }

  const handleStokUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch(`/api/bahan-baku/${openStok}/stok`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(stokForm),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error); setSaving(false); return }
    setOpenStok(null)
    setStokForm({ type: "IN", quantity: "", notes: "" })
    setSaving(false)
    fetchIngredients()
  }

  const openEdit = (item: Ingredient) => {
    setEditItem(item)
    setForm({
      name: item.name,
      unit: item.unit,
      currentStock: item.currentStock.toString(),
      minStock: item.minStock.toString(),
      pricePerUnit: item.pricePerUnit.toString(),
    })
    setOpenAdd(true)
  }

  return (
    <div className="min-h-screen">
      <Header title="Stok Bahan Baku" description="Manajemen inventaris, harga satuan, dan peringatan stok minimum" />
      <div className="p-8 max-w-7xl mx-auto space-y-6">

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-orange-500/10 shadow-xs">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Inventaris Bahan</span>
            <p className="text-base font-extrabold text-slate-800">{ingredients.length} Jenis Bahan Baku Terdaftar</p>
          </div>
          
          <Dialog open={openAdd} onOpenChange={(o) => { setOpenAdd(o); if (!o) { setEditItem(null); setForm({ name: "", unit: "gram", currentStock: "", minStock: "", pricePerUnit: "" }) } }}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-orange-500/25">
                <Plus className="h-4 w-4" /> Tambah Bahan Baku
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl glass-panel">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                  <Sparkles className="h-5 w-5 text-orange-500" />
                  {editItem ? "Edit Bahan Baku" : "Tambah Bahan Baku Baru"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Nama Bahan Baku</Label>
                  <Input placeholder="Contoh: Tepung Terigu Cakra" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Satuan Satuan</Label>
                    <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">{editItem ? "Stok Saat Ini" : "Stok Awal"}</Label>
                    <Input type="number" step="0.01" placeholder="0" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} className="rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Stok Minimum Warning</Label>
                    <Input type="number" step="0.01" placeholder="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Harga / Satuan (Rp)</Label>
                    <Input type="number" step="1" placeholder="0" value={form.pricePerUnit} onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })} className="rounded-xl" />
                  </div>
                </div>
                <Button type="submit" className="w-full mt-2 rounded-xl" disabled={saving}>
                  {saving ? "Menyimpan..." : "Simpan Data Bahan"}
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
              return (
                <div key={ing.id} className={`glass-card rounded-3xl p-5 relative overflow-hidden group transition-all duration-300 ${
                  isLow ? "border-rose-400/40 bg-gradient-to-br from-white to-rose-50/40" : ""
                }`}>
                  {/* Status Banner */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-black text-slate-800 text-lg tracking-tight group-hover:text-orange-600 transition-colors">
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

                  {/* Details Summary */}
                  <div className="bg-slate-50/80 backdrop-blur-xs rounded-2xl p-3.5 space-y-2 mb-5 border border-slate-100">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium">Stok Minimum:</span>
                      <span className="font-bold text-slate-700">{formatNumber(ing.minStock)} {ing.unit}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium">Harga / Satuan:</span>
                      <span className="font-extrabold text-orange-600">{formatCurrency(ing.pricePerUnit)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Dialog open={openStok === ing.id} onOpenChange={(o) => { setOpenStok(o ? ing.id : null); if (!o) setStokForm({ type: "IN", quantity: "", notes: "" }) }}>
                      <DialogTrigger asChild>
                        <Button variant="default" size="sm" className="flex-1 shadow-sm">
                          <ArrowUpCircle className="h-4 w-4" /> Mutasi Stok
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-2xl glass-panel">
                        <DialogHeader>
                          <DialogTitle className="text-lg font-bold">Update Stok: {ing.name}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleStokUpdate} className="space-y-4 mt-2">
                          <div className="space-y-1.5">
                            <Label className="font-bold text-slate-700">Tipe Pergerakan</Label>
                            <Select value={stokForm.type} onValueChange={(v) => setStokForm({ ...stokForm, type: v })}>
                              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="IN"><span className="flex items-center gap-2 text-emerald-600 font-bold"><ArrowUpCircle className="h-4 w-4" /> Stok Masuk (+)</span></SelectItem>
                                <SelectItem value="OUT"><span className="flex items-center gap-2 text-rose-600 font-bold"><ArrowDownCircle className="h-4 w-4" /> Stok Keluar (-)</span></SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="font-bold text-slate-700">Jumlah ({ing.unit})</Label>
                            <Input type="number" step="0.01" placeholder="0" value={stokForm.quantity} onChange={(e) => setStokForm({ ...stokForm, quantity: e.target.value })} required className="rounded-xl" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="font-bold text-slate-700">Keterangan Catatan</Label>
                            <Input placeholder="Contoh: Pembelian bahan baru dari suplier" value={stokForm.notes} onChange={(e) => setStokForm({ ...stokForm, notes: e.target.value })} className="rounded-xl" />
                          </div>
                          <Button type="submit" className="w-full mt-2 rounded-xl" disabled={saving}>
                            {saving ? "Menyimpan..." : "Simpan Mutasi Stok"}
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
