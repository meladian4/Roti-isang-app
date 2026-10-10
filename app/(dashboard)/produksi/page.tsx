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
import { Plus, Pencil, Trash2, Factory, CheckCircle, XCircle, Calculator, ChefHat, Scale, PieChart, Layers } from "lucide-react"

interface Ingredient { id: string; name: string; unit: string; currentStock: number; pricePerUnit: number }
interface RecipeIngredient { ingredientId: string; quantity: number; ingredient: Ingredient }
interface Recipe { id: string; name: string; servingsPerBatch: number; ingredients: RecipeIngredient[] }
interface Production {
  id: string; date: string; batchCount: number; totalCost: number; notes: string | null
  recipe: { name: string; servingsPerBatch?: number }; user: { name: string | null } | null
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
  
  // Production Input: Target Pcs Roti (Replacing Tray/Loyang)
  const [targetPcs, setTargetPcs] = useState("20")
  
  const [notes, setNotes] = useState("")
  const [prodDate, setProdDate] = useState("")
  const [calcRows, setCalcRows] = useState<CalcRow[]>([])
  const [totalCost, setTotalCost] = useState(0)
  const [batchMultiplier, setBatchMultiplier] = useState(1)
  const [totalDoughGram, setTotalDoughGram] = useState(0)
  const [gramPerPcs, setGramPerPcs] = useState(0)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")

  // Edit Production Modal State
  const [openEditDialog, setOpenEditDialog] = useState(false)
  const [editProdItem, setEditProdItem] = useState<Production | null>(null)
  const [editNotes, setEditNotes] = useState("")
  const [editPcs, setEditPcs] = useState("20")
  const [editDate, setEditDate] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)

  const fetchData = () => {
    Promise.all([fetch("/api/resep").then(r => r.json()), fetch("/api/produksi").then(r => r.json())])
      .then(([r, p]) => { setRecipes(r); setProductions(p); setLoading(false) })
  }
  useEffect(() => { fetchData() }, [])

  const calculateDough = (recipe: Recipe | null, pcsInput: string) => {
    if (!recipe || !pcsInput) {
      setCalcRows([])
      setTotalCost(0)
      setBatchMultiplier(0)
      setTotalDoughGram(0)
      setGramPerPcs(0)
      return
    }

    const pcsTarget = parseInt(pcsInput, 10) || 1
    const baseServings = recipe.servingsPerBatch > 0 ? recipe.servingsPerBatch : 1
    
    // Multiplier ratio based on Target Pcs divided by Recipe Base Servings
    const ratio = pcsTarget / baseServings
    setBatchMultiplier(ratio)

    let cost = 0
    let doughWeightSumGram = 0

    const rows: CalcRow[] = recipe.ingredients.map(ri => {
      const needed = ri.quantity * ratio
      const available = ri.ingredient.currentStock
      const itemCost = needed * ri.ingredient.pricePerUnit
      cost += itemCost

      // Calculate dough weight in grams for ingredients measured in gram/kg
      if (ri.ingredient.unit.toLowerCase() === "gram") {
        doughWeightSumGram += needed
      } else if (ri.ingredient.unit.toLowerCase() === "kg") {
        doughWeightSumGram += needed * 1000
      }

      return {
        name: ri.ingredient.name,
        unit: ri.ingredient.unit,
        needed,
        available,
        ok: available >= needed,
        cost: itemCost,
      }
    })

    setCalcRows(rows)
    setTotalCost(cost)
    setTotalDoughGram(doughWeightSumGram)
    setGramPerPcs(pcsTarget > 0 ? doughWeightSumGram / pcsTarget : 0)
  }

  const handleRecipeChange = (id: string) => {
    const r = recipes.find(r => r.id === id) || null
    setSelectedRecipe(r)
    if (r) {
      const defaultPcs = r.servingsPerBatch.toString()
      setTargetPcs(defaultPcs)
      calculateDough(r, defaultPcs)
    } else {
      calculateDough(null, targetPcs)
    }
  }

  const handlePcsChange = (pcsVal: string) => {
    setTargetPcs(pcsVal)
    calculateDough(selectedRecipe, pcsVal)
  }

  const canProduce = calcRows.length > 0 && calcRows.every(r => r.ok)

  const handleProduce = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRecipe) return
    setSaving(true)

    const pcsNum = parseInt(targetPcs, 10) || 1
    const baseServings = selectedRecipe.servingsPerBatch > 0 ? selectedRecipe.servingsPerBatch : 1
    // batchCount is calculated ratio for backend recipe ingredient deduction
    const batchCountCalc = Math.max(1, Math.round(pcsNum / baseServings))

    const fullNotes = `[Target: ${pcsNum} pcs roti | ${totalDoughGram.toFixed(0)}g adonan] ${notes}`.trim()

    const res = await fetch("/api/produksi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipeId: selectedRecipe.id,
        batchCount: batchCountCalc,
        notes: fullNotes,
        date: prodDate || undefined,
        userId: (session?.user as { id?: string })?.id,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      alert(data.error || "Gagal mencatat produksi")
      setSaving(false)
      return
    }
    setSuccessMsg(`Produksi berhasil dicatat! Target ${pcsNum} Pcs ${selectedRecipe.name} (${totalDoughGram.toFixed(0)}g adonan) = ${formatCurrency(data.totalCost)}`)
    setOpenDialog(false)
    setSelectedRecipe(null)
    setTargetPcs("20")
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
    const servings = item.recipe?.servingsPerBatch || 20
    setEditPcs((item.batchCount * servings).toString())
    setEditDate(item.date ? new Date(item.date).toISOString().split("T")[0] : "")
    setOpenEditDialog(true)
  }

  const handleEditProductionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editProdItem) return
    setSavingEdit(true)

    const pcsNum = parseInt(editPcs, 10) || 1
    const servings = editProdItem.recipe?.servingsPerBatch || 20
    const batchCalc = Math.max(1, Math.round(pcsNum / servings))

    const res = await fetch(`/api/produksi/${editProdItem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: editDate || undefined,
        batchCount: batchCalc,
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
      <Header title="Kalkulasi Adonan & Produksi Roti (Pcs)" description="Kalkulasi otomatis gramasi adonan per-pcs roti, kebutuhan bahan baku, HPP, & restok" />
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
            <ChefHat className="h-4 w-4" /> Hitung & Catat Produksi (Pcs Roti)
          </Button>
        </div>

        {/* Production Modal Form (Per Pcs Roti) */}
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent className="max-w-2xl rounded-3xl glass-panel">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <ChefHat className="h-5 w-5 text-emerald-600" />
                Kalkulator Produksi Adonan (Per Pcs Roti)
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleProduce} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Pilih Resep Roti Acuan</Label>
                <Select onValueChange={handleRecipeChange}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Pilih resep roti..." /></SelectTrigger>
                  <SelectContent>{recipes.map(r => <SelectItem key={r.id} value={r.id}>{r.name} (Acuan: {r.servingsPerBatch} pcs/batch)</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {/* Target Input: Pcs Roti */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-emerald-700" />
                    <h4 className="text-xs font-black uppercase text-emerald-800 tracking-wider">Target Produksi Roti</h4>
                  </div>
                  {selectedRecipe && (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      1 Batch Standard = {selectedRecipe.servingsPerBatch} Pcs
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Berapa Pcs Roti Yang Ingin Dibuat?</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Contoh: 100"
                      value={targetPcs}
                      onChange={e => handlePcsChange(e.target.value)}
                      className="rounded-xl bg-white font-extrabold text-emerald-800 text-lg h-11 border-emerald-300"
                      required
                    />
                  </div>

                  {selectedRecipe && (
                    <div className="p-3 bg-white/80 rounded-xl border border-emerald-100 flex flex-col justify-center space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Estimasi Berat Adonan:</span>
                        <span className="font-black text-emerald-700">
                          {totalDoughGram >= 1000 ? `${(totalDoughGram / 1000).toFixed(2)} kg` : `${totalDoughGram.toFixed(0)} gram`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Gramasi Adonan / Pcs:</span>
                        <span className="font-bold text-slate-800">{gramPerPcs.toFixed(1)} gram / pcs</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Faktor Skala Batch:</span>
                        <span className="font-bold text-slate-800">{batchMultiplier.toFixed(2)}x lipat resep</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Calculation Preview */}
              {calcRows.length > 0 && (
                <div className="border border-emerald-200/80 rounded-2xl overflow-hidden bg-white/90 shadow-sm">
                  <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-white flex justify-between items-center">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider">Kebutuhan Gramasi Bahan Baku ({targetPcs} Pcs Roti)</h4>
                    <span className="text-xs font-bold bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full">
                      HPP / Pcs: {formatCurrency(totalCost / (parseInt(targetPcs, 10) || 1))}
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
                    <span className="text-xs font-bold text-slate-700">Total HPP Produksi ({targetPcs} Pcs):</span>
                    <span className="text-lg font-black text-emerald-700">{formatCurrency(totalCost)}</span>
                  </div>
                </div>
              )}

              {calcRows.length > 0 && !canProduce && (
                <div className="p-3 bg-rose-500 text-white rounded-xl text-xs font-bold shadow-sm">
                  ⚠️ Stok bahan baku tidak mencukupi untuk membuat {targetPcs} pcs roti ini. Silakan kurangi jumlah atau tambahkan stok terlebih dahulu!
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Tanggal Produksi</Label>
                <Input type="date" value={prodDate} onChange={e => setProdDate(e.target.value)} className="rounded-xl" />
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Catatan Produksi (Opsional)</Label>
                <Textarea placeholder="Catatan adonan, shift, pembuat..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="rounded-xl" />
              </div>

              <Button type="submit" className="w-full rounded-xl" disabled={saving || !canProduce || !selectedRecipe}>
                {saving ? "Memproses Adonan..." : canProduce ? `Konfirmasi & Produksi ${targetPcs} Pcs Roti` : "Stok Tidak Mencukupi"}
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
                <Label className="font-bold text-slate-700">Total Pcs Roti Dibuat</Label>
                <Input type="number" min="1" value={editPcs} onChange={e => setEditPcs(e.target.value)} required className="rounded-xl" />
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
                <Factory className="h-4 w-4" />
              </div>
              Riwayat Sesi Produksi Roti Harian
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
                      <th className="text-left py-3.5 px-6">Nama Resep Roti</th>
                      <th className="text-left py-3.5 px-6">Pcs Dihasilkan</th>
                      <th className="text-left py-3.5 px-6">Total HPP Produksi</th>
                      <th className="text-left py-3.5 px-6">Catatan Sesi</th>
                      <th className="text-center py-3.5 px-6">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {productions.map(p => {
                      const servings = p.recipe?.servingsPerBatch || 20
                      const pcsProduced = p.batchCount * servings
                      return (
                        <tr key={p.id} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="py-4 px-6 text-slate-500 font-medium">{formatDate(p.date)}</td>
                          <td className="py-4 px-6 font-bold text-slate-800">{p.recipe.name}</td>
                          <td className="py-4 px-6">
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 font-bold">
                              {pcsProduced} Pcs Roti
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
                      )
                    })}
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
