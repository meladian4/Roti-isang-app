"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatNumber } from "@/lib/utils"
import { Plus, Pencil, Trash2, BookOpen, X, Sparkles, ChefHat } from "lucide-react"

interface Ingredient { id: string; name: string; unit: string; currentStock: number }
interface RecipeIngredient { ingredientId: string; quantity: number; ingredient: Ingredient }
interface Recipe {
  id: string; name: string; description: string | null; servingsPerBatch: number
  ingredients: RecipeIngredient[]
}

export default function ResepPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editItem, setEditItem] = useState<Recipe | null>(null)
  const [form, setForm] = useState({ name: "", description: "", servingsPerBatch: "1" })
  const [recipeIngredients, setRecipeIngredients] = useState<Array<{ ingredientId: string; quantity: string }>>([{ ingredientId: "", quantity: "" }])
  const [saving, setSaving] = useState(false)

  const fetchData = () => {
    Promise.all([fetch("/api/resep").then(r => r.json()), fetch("/api/bahan-baku").then(r => r.json())])
      .then(([r, i]) => { setRecipes(r); setIngredients(i); setLoading(false) })
  }
  useEffect(() => { fetchData() }, [])

  const addIngredientRow = () => setRecipeIngredients([...recipeIngredients, { ingredientId: "", quantity: "" }])
  const removeIngredientRow = (idx: number) => setRecipeIngredients(recipeIngredients.filter((_, i) => i !== idx))
  const updateIngredientRow = (idx: number, field: string, value: string) => {
    setRecipeIngredients(recipeIngredients.map((row, i) => i === idx ? { ...row, [field]: value } : row))
  }

  const openAdd = () => {
    setEditItem(null)
    setForm({ name: "", description: "", servingsPerBatch: "1" })
    setRecipeIngredients([{ ingredientId: "", quantity: "" }])
    setOpenDialog(true)
  }

  const openEdit = (recipe: Recipe) => {
    setEditItem(recipe)
    setForm({ name: recipe.name, description: recipe.description || "", servingsPerBatch: recipe.servingsPerBatch.toString() })
    setRecipeIngredients(recipe.ingredients.map(ri => ({ ingredientId: ri.ingredientId, quantity: ri.quantity.toString() })))
    setOpenDialog(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const valid = recipeIngredients.filter(ri => ri.ingredientId && ri.quantity)
    const payload = { ...form, ingredients: valid.map(ri => ({ ingredientId: ri.ingredientId, quantity: parseFloat(ri.quantity) })) }
    if (editItem) {
      await fetch(`/api/resep/${editItem.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    } else {
      await fetch("/api/resep", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    }
    setOpenDialog(false)
    setSaving(false)
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus resep ini?")) return
    await fetch(`/api/resep/${id}`, { method: "DELETE" })
    fetchData()
  }

  return (
    <div className="min-h-screen">
      <Header title="Resep Produksi" description="Kelola resep Roti Isang & komposisi takaran bahan baku per batch" />
      <div className="p-8 max-w-7xl mx-auto space-y-6">

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-orange-500/10 shadow-xs">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Koleksi Resep</span>
            <p className="text-base font-extrabold text-slate-800">{recipes.length} Resep Terdaftar</p>
          </div>

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button onClick={openAdd} className="shadow-lg shadow-orange-500/25">
                <Plus className="h-4 w-4" /> Buat Resep Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl glass-panel">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                  <ChefHat className="h-5 w-5 text-orange-500" />
                  {editItem ? "Edit Resep Roti" : "Tambah Resep Baru"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Nama Resep</Label>
                  <Input placeholder="Contoh: Roti Isang Original Premium" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Deskripsi Catatan (Opsional)</Label>
                  <Textarea placeholder="Keterangan singkat resep..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Hasil Porsi per 1 Batch (pcs)</Label>
                  <Input type="number" min="1" value={form.servingsPerBatch} onChange={e => setForm({ ...form, servingsPerBatch: e.target.value })} required className="rounded-xl" />
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <Label className="font-bold text-slate-800 text-sm">Komposisi Takaran Bahan (per batch)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addIngredientRow} className="rounded-xl text-xs">
                      <Plus className="h-3.5 w-3.5" /> Tambah Baris Bahan
                    </Button>
                  </div>
                  {recipeIngredients.map((row, idx) => (
                    <div key={idx} className="flex gap-2 items-end bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                      <div className="flex-1 space-y-1">
                        <Select value={row.ingredientId} onValueChange={v => updateIngredientRow(idx, "ingredientId", v)}>
                          <SelectTrigger className="rounded-xl bg-white"><SelectValue placeholder="Pilih bahan baku..." /></SelectTrigger>
                          <SelectContent>
                            {ingredients.map(ing => <SelectItem key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-32 space-y-1">
                        <Input type="number" step="0.001" placeholder="Jumlah" value={row.quantity} onChange={e => updateIngredientRow(idx, "quantity", e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      {recipeIngredients.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeIngredientRow(idx)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl">
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Button type="submit" className="w-full mt-4 rounded-xl" disabled={saving}>
                  {saving ? "Menyimpan Resep..." : "Simpan Resep"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Recipes Grid */}
        {loading ? (
          <div className="text-center py-16 text-slate-400 glass-card rounded-3xl">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30 animate-bounce" />
            <p className="font-medium">Memuat data resep...</p>
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-16 text-slate-400 glass-card rounded-3xl">
            <BookOpen className="h-14 w-14 mx-auto mb-3 opacity-20" />
            <p className="font-bold text-slate-700 text-lg">Belum Ada Resep Terdaftar</p>
            <p className="text-xs text-slate-400 mt-1">Buat resep roti pertama Anda untuk memulai kalkulasi produksi otomatis.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {recipes.map(recipe => (
              <div key={recipe.id} className="glass-card rounded-3xl p-6 relative group overflow-hidden">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl shadow-md shadow-orange-500/20 group-hover:scale-110 transition-transform">
                      <ChefHat className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-xl tracking-tight">{recipe.name}</h3>
                      {recipe.description && <p className="text-xs font-medium text-slate-400 mt-0.5">{recipe.description}</p>}
                    </div>
                  </div>
                  <Badge variant="default" className="shadow-xs font-extrabold">
                    ✨ {recipe.servingsPerBatch} pcs / batch
                  </Badge>
                </div>

                <div className="my-4">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2.5">
                    Takaran Bahan Baku (per 1 batch)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {recipe.ingredients.map((ri, i) => (
                      <div key={i} className="flex justify-between items-center text-xs p-2.5 bg-slate-50/90 backdrop-blur-xs rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-700">{ri.ingredient.name}</span>
                        <span className="font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/50">
                          {formatNumber(ri.quantity)} {ri.ingredient.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <Button variant="outline" size="sm" onClick={() => openEdit(recipe)} className="flex-1 rounded-xl">
                    <Pencil className="h-3.5 w-3.5" /> Edit Resep
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl text-rose-600 hover:bg-rose-50 hover:border-rose-200" onClick={() => handleDelete(recipe.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
