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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils"
import { Plus, Pencil, Trash2, Factory, CheckCircle, XCircle, Calculator, Sparkles, Activity, ChefHat, Scale } from "lucide-react"

interface Ingredient { id: string; name: string; unit: string; currentStock: number; pricePerUnit: number }
interface RecipeIngredient { ingredientId: string; quantity: number; ingredient: Ingredient }
interface Recipe { id: string; name: string; servingsPerBatch: number; ingredients: RecipeIngredient[] }
interface Production {
  id: string; date: string; batchCount: number; totalCost: number; notes: string | null
  recipe: { name: string }; user: { name: string | null } | null
  ingredients: Array<{ quantity: number; priceAtTime: number; ingredient: { name: string; unit: string } }>
}

interface CalcRow { name: string; unit: string; needed: number; available: number; ok: boolean; cost: number }

export default function ProduksiPage() {
  const { data: session } = useSession()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [productions, setProductions] = useState<Production[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  
  // Production Inputs: Adonan & Loyang
  const [adonanCount, setAdonanCount] = useState("1")
  const [loyangPerAdonan, setLoyangPerAdonan] = useState("1")
  const [batchCount, setBatchCount] = useState("1")
  
  const [notes, setNotes] = useState("")
  const [prodDate, setProdDate] = useState("")
  const [calcRows, setCalcRows] = useState<CalcRow[]>([])
  const [totalCost, setTotalCost] = useState(0)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")

  // Edit Production Modal State
  const [openEditDialog, setOpenEditDialog] = useState(false)
  const [editProdItem, setEditProdItem] = useState<Production | null>(null)
  const [editNotes, setEditNotes] = useState("")
  const [editLoyang, setEditLoyang] = useState("1")
  const [editDate, setEditDate] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)

  const fetchData = () => {
    Promise.all([fetch("/api/resep").then(r => r.json()), fetch("/api/produksi").then(r => r.json())])
      .then(([r, p]) => { setRecipes(r); setProductions(p); setLoading(false) })
  }
  useEffect(() => { fetchData() }, [])

  const calculate = (recipe: Recipe | null, totalLoyang: string) => {
    if (!recipe || !totalLoyang) { setCalcRows([]); setTotalCost(0); return }
    const b = parseInt(totalLoyang) || 1
    let cost = 0
    const rows: CalcRow[] = recipe.ingredients.map(ri => {
      const needed = ri.quantity * b
      const available = ri.ingredient.currentStock
      const itemCost = needed * ri.ingredient.pricePerUnit
      cost += itemCost
      return { name: ri.ingredient.name, unit: ri.ingredient.unit, needed, available, ok: available >= needed, cost: itemCost }
    })
    setCalcRows(rows)
    setTotalCost(cost)
  }

  const handleRecipeChange = (id: string) => {
    const r = recipes.find(r => r.id === id) || null
    setSelectedRecipe(r)
    calculate(r, batchCount)
  }

  const handleAdonanChange = (adonanVal: string, loyangVal: string) => {
    const a = parseInt(adonanVal) || 1
    const l = parseInt(loyangVal) || 1
    const totalLoyang = (a * l).toString()
    setAdonanCount(adonanVal)
    setLoyangPerAdonan(loyangVal)
    setBatchCount(totalLoyang)
    calculate(selectedRecipe, totalLoyang)
  }

  const handleLoyangDirectChange = (val: string) => {
    setBatchCount(val)
    calculate(selectedRecipe, val)
  }

  const canProduce = calcRows.length > 0 && calcRows.every(r => r.ok)

  const handleProduce = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRecipe) return
    setSaving(true)

    const fullNotes = `[${adonanCount}x Adonan] ${notes}`.trim()

    const res = await fetch("/api/produksi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipeId: selectedRecipe.id,
        batchCount: parseInt(batchCount),
        notes: fullNotes,
        date: prodDate || undefined,
        userId: (session?.user as { id?: string })?.id,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      alert(data.error)
      setSaving(false)
      return
    }
    setSuccessMsg(`Produksi berhasil dicatat! ${adonanCount}x Adonan (${batchCount} Loyang ${selectedRecipe.name}) = ${formatCurrency(data.totalCost)}`)
    setOpenDialog(false)
    setSelectedRecipe(null)
    setAdonanCount("1")
    setLoyangPerAdonan("1")
    setBatchCount("1")
    setNotes("")
    setProdDate("")
    setCalcRows([])
    setSaving(false)
    fetchData()
    setTimeout(() => setSuccessMsg(""), 6000)
  }

  const openEditProduction = (item: Production) => {
    setEditProdItem(item)
    setEditNotes(item.notes || "")
    setEditLoyang(item.batchCount.toString())
    setEditDate(item.date ? new Date(item.date).toISOString().split("T")[0] : "")
    setOpenEditDialog(true)
  }

  const handleEditProductionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editProdItem) return
    setSavingEdit(true)

    const res = await fetch(`/api/produksi/${editProdItem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: editDate || undefined,
        batchCount: editLoyang,
        notes: editNotes,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      alert(err.error || "Gagal mengupdate data produksi")
      setSavingEdit(false)
      return
    }

    setSuccessMsg("Catatan produksi berhasil diperbarui!")
    setOpenEditDialog(false)
    setEditProdItem(null)
    setSavingEdit(false)
    fetchData()
    setTimeout(() => setSuccessMsg(""), 5000)
  }

  const handleDeleteProduction = async (id: string) => {
    if (!confirm("Hapus catatan produksi ini? Stok bahan baku yang digunakan akan dikembalikan otomatis ke inventaris!")) return
    const res = await fetch(`/api/produksi/${id}`, { method: "DELETE" })
    if (!res.ok) {
      alert("Gagal menghapus data produksi")
      return
    }
    setSuccessMsg("Data produksi berhasil dihapus & stok bahan telah dikembalikan!")
    fetchData()
    setTimeout(() => setSuccessMsg(""), 5000)
  }

  return (
    <div className="min-h-screen">
      <Header title="Pencatatan Produksi (Adonan & Loyang)" description="Kalkulasi otomatis kebutuhan adonan, loyang (batch), edit & hapus produksi" />
      <div className="p-8 max-w-7xl mx-auto space-y-6">

        {successMsg && (
          <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center gap-3 animate-float">
            <CheckCircle className="h-6 w-6 flex-shrink-0" />
            <p className="text-sm font-bold">{successMsg}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/10 shadow-xs">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Sesi Produksi</span>
            <p className="text-base font-extrabold text-slate-800">{productions.length} Sesi Produksi Terdaftar</p>
          </div>
          <Button onClick={() => setOpenDialog(true)} className="shadow-lg shadow-emerald-500/25">
            <Calculator className="h-4 w-4" /> Hitung & Catat Produksi
          </Button>
        </div>

        {/* Production Modal Form */}
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent className="max-w-2xl rounded-3xl glass-panel">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <ChefHat className="h-5 w-5 text-emerald-600" />
                Kalkulasi Adonan & Batch Loyang Roti
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleProduce} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Pilih Resep Roti</Label>
                <Select onValueChange={handleRecipeChange}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Pilih resep roti..." /></SelectTrigger>
                  <SelectContent>{recipes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {/* Dual Input: 1x Adonan vs Jumlah Loyang (Batch) */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-emerald-700" />
                  <h4 className="text-xs font-black uppercase text-emerald-800 tracking-wider">Takaran Sesi Adonan & Loyang</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">1x Adonan (Kali Mix)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={adonanCount}
                      onChange={e => handleAdonanChange(e.target.value, loyangPerAdonan)}
                      className="rounded-xl bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Loyang per 1x Adonan</Label>
                    <Input
                      type="number"
                      min="1"
                      value={loyangPerAdonan}
                      onChange={e => handleAdonanChange(adonanCount, e.target.value)}
                      className="rounded-xl bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Total Loyang (Batch)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={batchCount}
                      onChange={e => handleLoyangDirectChange(e.target.value)}
                      className="rounded-xl bg-emerald-100/80 font-bold text-emerald-800"
                    />
                  </div>
                </div>
              </div>

              {/* Live Calculation Preview */}
              {calcRows.length > 0 && (
                <div className="border border-emerald-200/80 rounded-2xl overflow-hidden bg-white/90 shadow-sm">
                  <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-white flex justify-between items-center">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider">Kebutuhan Bahan Baku ({adonanCount}x Adonan)</h4>
                    <span className="text-xs font-bold bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full">
                      Total Output: {parseInt(batchCount) * (selectedRecipe?.servingsPerBatch || 1)} pcs ({batchCount} Loyang)
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                    {calcRows.map((row, i) => (
                      <div key={i} className={`flex items-center justify-between px-4 py-2.5 text-xs ${!row.ok ? "bg-rose-50/80" : ""}`}>
                        <div className="flex items-center gap-2">
                          {row.ok ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}
                          <span className="font-bold text-slate-800">{row.name}</span>
                        </div>
                        <div className="text-right">
                          <p className={`font-extrabold ${!row.ok ? "text-rose-600" : "text-slate-800"}`}>
                            Butuh: {formatNumber(row.needed)} {row.unit}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">Tersedia: {formatNumber(row.available)} {row.unit}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-emerald-50/80 px-4 py-3 border-t border-emerald-200/60 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">Estimasi Total Biaya HPP Produksi:</span>
                    <span className="text-lg font-black text-emerald-700">{formatCurrency(totalCost)}</span>
                  </div>
                </div>
              )}

              {calcRows.length > 0 && !canProduce && (
                <div className="p-3 bg-rose-500 text-white rounded-xl text-xs font-bold shadow-sm">
                  ⚠️ Stok bahan baku tidak mencukupi untuk jumlah adonan/loyang ini. Restok terlebih dahulu!
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Tanggal Produksi</Label>
                <Input type="date" value={prodDate} onChange={e => setProdDate(e.target.value)} className="rounded-xl" />
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Catatan Produksi (Opsional)</Label>
                <Textarea placeholder="Catatan shift adonan, pembuat, dll..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="rounded-xl" />
              </div>

              <Button type="submit" className="w-full rounded-xl" disabled={saving || !canProduce || !selectedRecipe}>
                {saving ? "Memproses Adonan..." : canProduce ? `Konfirmasi & Produksi ${adonanCount}x Adonan (${batchCount} Loyang)` : "Stok Tidak Mencukupi"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Production Modal */}
        <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
          <DialogContent className="max-w-md rounded-3xl glass-panel">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Pencil className="h-5 w-5 text-emerald-600" />
                Edit Catatan Sesi Produksi
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditProductionSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Tanggal Produksi</Label>
                <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} required className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Resep Roti</Label>
                <Input value={editProdItem?.recipe.name || ""} disabled className="rounded-xl bg-slate-100 font-bold" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Jumlah Loyang (Batch)</Label>
                <Input type="number" min="1" value={editLoyang} onChange={e => setEditLoyang(e.target.value)} required className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Catatan Sesi</Label>
                <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} className="rounded-xl" />
              </div>
              <Button type="submit" className="w-full rounded-xl" disabled={savingEdit}>
                {savingEdit ? "Menyimpan..." : "Update Catatan Produksi"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* History Table Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-50/90 to-teal-50/60 border-b border-emerald-100 py-5">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                <Activity className="h-4 w-4" />
              </div>
              Riwayat Produksi Harian (Adonan & Loyang)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12 text-slate-400">
                <Factory className="h-10 w-10 mx-auto mb-2 opacity-30 animate-bounce" />
                <p className="text-xs font-medium">Memuat data produksi...</p>
              </div>
            ) : productions.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Factory className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p className="font-bold text-sm text-slate-700">Belum Ada Sesi Produksi</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="text-left py-3.5 px-6">Tanggal</th>
                      <th className="text-left py-3.5 px-6">Nama Resep</th>
                      <th className="text-left py-3.5 px-6">Jumlah Loyang (Batch)</th>
                      <th className="text-left py-3.5 px-6">Total HPP Produksi</th>
                      <th className="text-left py-3.5 px-6">Catatan Sesi</th>
                      <th className="text-center py-3.5 px-6">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {productions.map(p => (
                      <tr key={p.id} className="hover:bg-emerald-50/40 transition-colors">
                        <td className="py-4 px-6 text-slate-500 font-medium">{formatDate(p.date)}</td>
                        <td className="py-4 px-6 font-bold text-slate-800">{p.recipe.name}</td>
                        <td className="py-4 px-6">
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 font-bold">
                            {p.batchCount} Loyang
                          </Badge>
                        </td>
                        <td className="py-4 px-6 font-extrabold text-emerald-600">{formatCurrency(p.totalCost)}</td>
                        <td className="py-4 px-6 text-xs font-semibold text-slate-500">{p.notes || "-"}</td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex justify-center gap-1">
                            <Button variant="outline" size="sm" onClick={() => openEditProduction(p)} className="rounded-xl h-8 w-8 p-0">
                              <Pencil className="h-3.5 w-3.5 text-slate-600" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteProduction(p.id)} className="rounded-xl h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 border-rose-200">
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

      </div>
    </div>
  )
}
