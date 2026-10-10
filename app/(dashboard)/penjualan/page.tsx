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
import { Plus, Pencil, Trash2, ShoppingBag, RotateCcw, DollarSign, Users, CheckCircle, Settings, Check, X } from "lucide-react"

interface RecipeIngredient { ingredientId: string; quantity: number; ingredient: { pricePerUnit: number } }
interface Recipe { id: string; name: string; servingsPerBatch: number; ingredients?: RecipeIngredient[] }
interface MarketingAgent { id: string; name: string; code: string | null }

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
  agentId: string | null
  agent: MarketingAgent | null
  recipe?: Recipe | null
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
  agentId: string | null
  agent: MarketingAgent | null
  recipe?: Recipe | null
}

const REASONS = ["Kadaluarsa (Expired)", "Rusak / Bantet", "Ditolak Toko / Konsinyasi", "Kemasan Cacat", "Lainnya"]

export default function PenjualanPage() {
  const { data: session } = useSession()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [marketingAgents, setMarketingAgents] = useState<MarketingAgent[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [returns, setReturns] = useState<SaleReturn[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"penjualan" | "retur" | "rekap-agent">("penjualan")

  // Sales Form State
  const [openSaleModal, setOpenSaleModal] = useState(false)
  const [editSaleItem, setEditSaleItem] = useState<Sale | null>(null)
  const [saleForm, setSaleForm] = useState({ recipeId: "", recipeName: "", agentId: "", quantity: "1", pricePerUnit: "", notes: "", date: "" })
  const [savingSale, setSavingSale] = useState(false)

  // Returns Form State
  const [openReturnModal, setOpenReturnModal] = useState(false)
  const [editReturnItem, setEditReturnItem] = useState<SaleReturn | null>(null)
  const [returnForm, setReturnForm] = useState({ recipeId: "", recipeName: "", agentId: "", quantity: "1", reason: "Kadaluarsa (Expired)", manualLossAmount: "", notes: "", date: "" })
  const [estimatedHppPerPcs, setEstimatedHppPerPcs] = useState(0)
  const [savingReturn, setSavingReturn] = useState(false)

  // Marketing Agent Management Dialog State
  const [openAgentManager, setOpenAgentManager] = useState(false)
  const [newAgentName, setNewAgentName] = useState("")
  const [newAgentCode, setNewAgentCode] = useState("")
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null)
  const [editAgentName, setEditAgentName] = useState("")
  const [editAgentCode, setEditAgentCode] = useState("")
  const [savingAgent, setSavingAgent] = useState(false)

  const [msg, setMsg] = useState("")

  const fetchData = () => {
    Promise.all([
      fetch("/api/resep").then(r => r.json()),
      fetch("/api/marketing-agents").then(r => r.json()),
      fetch("/api/penjualan").then(r => r.json()),
      fetch("/api/retur").then(r => r.json()),
    ]).then(([r, ag, s, ret]) => {
      setRecipes(r)
      setMarketingAgents(ag)
      setSales(s)
      setReturns(ret)
      setLoading(false)
    })
  }

  useEffect(() => { fetchData() }, [])

  // Helper function to calculate HPP per pcs for a given recipe
  const calculateHppPerPcs = (recipeIdOrName: string) => {
    const selected = recipes.find(r => r.id === recipeIdOrName || r.name === recipeIdOrName)
    if (!selected || !selected.ingredients || selected.ingredients.length === 0) return 0
    const batchCost = selected.ingredients.reduce(
      (sum, ri) => sum + ri.quantity * (ri.ingredient?.pricePerUnit || 0),
      0
    )
    const servings = selected.servingsPerBatch > 0 ? selected.servingsPerBatch : 1
    return batchCost / servings
  }

  // Agent Management Functions
  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAgentName.trim()) return
    setSavingAgent(true)
    const res = await fetch("/api/marketing-agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newAgentName.trim(), code: newAgentCode.trim() }),
    })
    if (!res.ok) {
      alert("Gagal menambah Marketing Agent")
      setSavingAgent(false)
      return
    }
    setNewAgentName("")
    setNewAgentCode("")
    setSavingAgent(false)
    fetchData()
  }

  const startEditAgent = (ag: MarketingAgent) => {
    setEditingAgentId(ag.id)
    setEditAgentName(ag.name)
    setEditAgentCode(ag.code || "")
  }

  const handleUpdateAgent = async (id: string) => {
    if (!editAgentName.trim()) return
    setSavingAgent(true)
    const res = await fetch(`/api/marketing-agents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editAgentName.trim(), code: editAgentCode.trim() }),
    })
    if (!res.ok) {
      alert("Gagal mengupdate Marketing Agent")
      setSavingAgent(false)
      return
    }
    setEditingAgentId(null)
    setSavingAgent(false)
    fetchData()
  }

  const handleDeleteAgent = async (id: string) => {
    if (!confirm("Hapus Marketing Agent ini dari daftar? Transaksi lama akan tetap tersimpan.")) return
    const res = await fetch(`/api/marketing-agents/${id}`, { method: "DELETE" })
    if (!res.ok) {
      alert("Gagal menghapus Marketing Agent")
      return
    }
    fetchData()
  }

  // Open Add / Edit Sale
  const openAddSale = () => {
    setEditSaleItem(null)
    const defaultAgent = marketingAgents[0]?.id || ""
    setSaleForm({ recipeId: "", recipeName: "", agentId: defaultAgent, quantity: "1", pricePerUnit: "", notes: "", date: "" })
    setOpenSaleModal(true)
  }

  const openEditSale = (item: Sale) => {
    setEditSaleItem(item)
    setSaleForm({
      recipeId: item.recipeId || "",
      recipeName: item.recipeName,
      agentId: item.agentId || "",
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
    setSaleForm({ recipeId: "", recipeName: "", agentId: "", quantity: "1", pricePerUnit: "", notes: "", date: "" })
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
    const defaultAgent = marketingAgents[0]?.id || ""
    setReturnForm({ recipeId: "", recipeName: "", agentId: defaultAgent, quantity: "1", reason: "Kadaluarsa (Expired)", manualLossAmount: "", notes: "", date: "" })
    setEstimatedHppPerPcs(0)
    setOpenReturnModal(true)
  }

  const openEditReturn = (item: SaleReturn) => {
    setEditReturnItem(item)
    const hpp = calculateHppPerPcs(item.recipeId || item.recipeName)
    setEstimatedHppPerPcs(hpp)
    setReturnForm({
      recipeId: item.recipeId || "",
      recipeName: item.recipeName,
      agentId: item.agentId || "",
      quantity: item.quantity.toString(),
      reason: item.reason || "Kadaluarsa (Expired)",
      manualLossAmount: item.lossAmount.toString(),
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

    setMsg(editReturnItem ? "Data retur berhasil diupdate!" : `Retur berhasil dicatat! Otomatis Kerugian HPP: ${formatCurrency(data.lossAmount)}`)
    setOpenReturnModal(false)
    setEditReturnItem(null)
    setReturnForm({ recipeId: "", recipeName: "", agentId: "", quantity: "1", reason: "Kadaluarsa (Expired)", manualLossAmount: "", notes: "", date: "" })
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
    const hpp = calculateHppPerPcs(id)
    setEstimatedHppPerPcs(hpp)
    setReturnForm({
      ...returnForm,
      recipeId: id,
      recipeName: selected ? selected.name : returnForm.recipeName,
    })
  }

  // Financial Summary Totals
  const totalOmset = sales.reduce((sum, s) => sum + s.totalAmount, 0)
  const totalPcsSold = sales.reduce((sum, s) => sum + s.quantity, 0)
  const totalReturnLoss = returns.reduce((sum, r) => sum + r.lossAmount, 0)

  // Marketing Agent Financial Breakdown Calculation
  const agentFinancials = marketingAgents.map(agent => {
    const agentSales = sales.filter(s => s.agentId === agent.id)
    const agentReturns = returns.filter(r => r.agentId === agent.id)

    const omset = agentSales.reduce((sum, s) => sum + s.totalAmount, 0)
    const pcsSold = agentSales.reduce((sum, s) => sum + s.quantity, 0)

    const totalHppSold = agentSales.reduce((sum, s) => {
      const hpp = calculateHppPerPcs(s.recipeId || s.recipeName)
      return sum + hpp * s.quantity
    }, 0)

    const kerugianRetur = agentReturns.reduce((sum, r) => sum + r.lossAmount, 0)
    const pcsReturned = agentReturns.reduce((sum, r) => sum + r.quantity, 0)

    const labaBersih = omset - totalHppSold - kerugianRetur

    return {
      agent,
      omset,
      pcsSold,
      totalHppSold,
      kerugianRetur,
      pcsReturned,
      labaBersih,
      transactionCount: agentSales.length + agentReturns.length,
    }
  })

  return (
    <div className="min-h-screen">
      <Header title="Penjualan & Retur (Kelola Agent Marketing)" description="Pencatatan omset, retur HPP otomatis, & rekap/edit nama Agent Marketing" />
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
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Kerugian Retur (Otomatis)</p>
                <p className="text-xl font-black text-rose-600 tracking-tight mt-0.5">{formatCurrency(totalReturnLoss)}</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 relative overflow-hidden group">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/25">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Marketing Agents</p>
                <p className="text-xl font-black text-slate-800 tracking-tight mt-0.5">{marketingAgents.length} Agent</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher & Modal Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/60 backdrop-blur-md p-3 rounded-2xl border border-emerald-500/10 shadow-xs">
          <div className="flex bg-slate-100/80 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab("penjualan")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "penjualan" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ShoppingBag className="h-4 w-4" /> Data Penjualan ({sales.length})
            </button>
            <button
              onClick={() => setActiveTab("retur")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "retur" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <RotateCcw className="h-4 w-4" /> Data Retur ({returns.length})
            </button>
            <button
              onClick={() => setActiveTab("rekap-agent")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "rekap-agent" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Users className="h-4 w-4" /> Rekap Laba Per Marketing Agent
            </button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpenAgentManager(true)} className="rounded-xl border-purple-300 text-purple-700 hover:bg-purple-50 text-xs font-bold">
              <Settings className="h-4 w-4" /> Kelola Agent
            </Button>
            {activeTab === "penjualan" ? (
              <Button onClick={openAddSale} className="shadow-lg shadow-emerald-500/25">
                <Plus className="h-4 w-4" /> Catat Penjualan Baru
              </Button>
            ) : activeTab === "retur" ? (
              <Button variant="destructive" onClick={openAddReturn} className="shadow-lg shadow-rose-500/25">
                <Plus className="h-4 w-4" /> Catat Retur Baru (Auto HPP)
              </Button>
            ) : null}
          </div>
        </div>

        {/* Marketing Agent Manager Dialog (Add / Edit Agent Names Directly) */}
        <Dialog open={openAgentManager} onOpenChange={setOpenAgentManager}>
          <DialogContent className="max-w-lg rounded-3xl glass-panel">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-purple-900">
                <Users className="h-5 w-5 text-purple-600" />
                Kelola & Edit Nama Marketing Agent
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {/* Add New Agent Form */}
              <form onSubmit={handleAddAgent} className="p-4 bg-purple-50/70 border border-purple-200/80 rounded-2xl space-y-3">
                <h4 className="text-xs font-black uppercase text-purple-900 tracking-wider">+ Tambah Agent Marketing Baru</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="Nama Agent (e.g. Toko Pak Budi)"
                    value={newAgentName}
                    onChange={e => setNewAgentName(e.target.value)}
                    required
                    className="sm:col-span-2 rounded-xl bg-white"
                  />
                  <Input
                    placeholder="Kode (e.g. MKT-D)"
                    value={newAgentCode}
                    onChange={e => setNewAgentCode(e.target.value)}
                    className="rounded-xl bg-white"
                  />
                </div>
                <Button type="submit" disabled={savingAgent || !newAgentName.trim()} className="w-full bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold">
                  {savingAgent ? "Menyimpan..." : "Tambah Agent"}
                </Button>
              </form>

              {/* Agents List & Edit Inline */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Daftar Marketing Agent Terdaftar ({marketingAgents.length})</Label>
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto border border-slate-200/80 rounded-2xl bg-white">
                  {marketingAgents.map(ag => (
                    <div key={ag.id} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors">
                      {editingAgentId === ag.id ? (
                        <div className="flex-1 flex gap-2 items-center">
                          <Input
                            value={editAgentName}
                            onChange={e => setEditAgentName(e.target.value)}
                            className="h-8 text-xs rounded-lg flex-1"
                            autoFocus
                          />
                          <Input
                            value={editAgentCode}
                            onChange={e => setEditAgentCode(e.target.value)}
                            className="h-8 text-xs rounded-lg w-24"
                            placeholder="Kode"
                          />
                          <Button size="sm" onClick={() => handleUpdateAgent(ag.id)} className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingAgentId(null)} className="h-8 px-2 text-slate-500 rounded-lg">
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{ag.name}</p>
                            <p className="text-[10px] text-purple-600 font-bold">{ag.code || "Tanpa Kode"}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" onClick={() => startEditAgent(ag)} className="h-8 w-8 p-0 rounded-lg">
                              <Pencil className="h-3.5 w-3.5 text-slate-600" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteAgent(ag.id)} className="h-8 w-8 p-0 rounded-lg text-rose-600 border-rose-200 hover:bg-rose-50">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sales Dialog Form */}
        <Dialog open={openSaleModal} onOpenChange={(o) => { setOpenSaleModal(o); if (!o) setEditSaleItem(null); }}>
          <DialogContent className="max-w-md rounded-3xl glass-panel">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <ShoppingBag className="h-5 w-5 text-emerald-600" />
                {editSaleItem ? "Edit Transaksi Penjualan" : "Input Transaksi Penjualan Roti"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Pilih Account / Marketing Agent</Label>
                <Select value={saleForm.agentId} onValueChange={v => setSaleForm({ ...saleForm, agentId: v })}>
                  <SelectTrigger className="rounded-xl border-emerald-300 font-bold text-emerald-800"><SelectValue placeholder="Pilih Marketing Agent..." /></SelectTrigger>
                  <SelectContent>
                    {marketingAgents.map(ag => (
                      <SelectItem key={ag.id} value={ag.id}>
                        <span className="font-bold">{ag.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Tanggal Transaksi</Label>
                <Input type="date" value={saleForm.date} onChange={e => setSaleForm({ ...saleForm, date: e.target.value })} className="rounded-xl" />
              </div>
              
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Pilih Resep / Jenis Roti</Label>
                <Select value={saleForm.recipeId} onValueChange={handleRecipeSaleSelect}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Pilih jenis roti..." /></SelectTrigger>
                  <SelectContent>
                    {recipes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Nama Roti (Teks Bebas)</Label>
                <Input placeholder="Contoh: Roti Isang Original" value={saleForm.recipeName} onChange={e => setSaleForm({ ...saleForm, recipeName: e.target.value })} required className="rounded-xl" />
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
                <Textarea placeholder="Contoh: Toko Konsinyasi A, Kasir Siang..." value={saleForm.notes} onChange={e => setSaleForm({ ...saleForm, notes: e.target.value })} rows={2} className="rounded-xl" />
              </div>

              <Button type="submit" className="w-full rounded-xl" disabled={savingSale}>
                {savingSale ? "Menyimpan Transaksi..." : editSaleItem ? "Update Penjualan" : "Simpan Penjualan"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Return Dialog Form */}
        <Dialog open={openReturnModal} onOpenChange={(o) => { setOpenReturnModal(o); if (!o) setEditReturnItem(null); }}>
          <DialogContent className="max-w-md rounded-3xl glass-panel">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-rose-700">
                <RotateCcw className="h-5 w-5 text-rose-500" />
                {editReturnItem ? "Edit Data Retur Roti" : "Input Retur (Kalkulasi HPP Otomatis)"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleReturnSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Pilih Account / Marketing Agent</Label>
                <Select value={returnForm.agentId} onValueChange={v => setReturnForm({ ...returnForm, agentId: v })}>
                  <SelectTrigger className="rounded-xl border-rose-300 font-bold text-rose-800"><SelectValue placeholder="Pilih Marketing Agent..." /></SelectTrigger>
                  <SelectContent>
                    {marketingAgents.map(ag => (
                      <SelectItem key={ag.id} value={ag.id}>
                        <span className="font-bold">{ag.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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

              {/* Automatic HPP Preview */}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-600">Estimasi HPP / Pcs Roti:</span>
                  <span className="font-bold text-rose-700">{formatCurrency(estimatedHppPerPcs)} / pcs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-600">Total Kerugian Retur (Otomatis):</span>
                  <span className="font-black text-rose-600 text-sm">
                    {formatCurrency(estimatedHppPerPcs * (parseInt(returnForm.quantity, 10) || 1))}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Catatan / Detail Toko</Label>
                <Textarea placeholder="Contoh: Retur Toko Konsinyasi A..." value={returnForm.notes} onChange={e => setReturnForm({ ...returnForm, notes: e.target.value })} rows={2} className="rounded-xl" />
              </div>

              <Button type="submit" variant="destructive" className="w-full rounded-xl" disabled={savingReturn}>
                {savingReturn ? "Menyimpan Retur..." : editReturnItem ? "Update Data Retur" : "Simpan Data Retur (Auto HPP)"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

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
                        <th className="text-left py-3.5 px-6">Account / Agent</th>
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
                          <td className="py-4 px-6">
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              {s.agent?.name || "Umum / Toko"}
                            </Badge>
                          </td>
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
        ) : activeTab === "retur" ? (
          <Card className="overflow-hidden border-rose-500/10">
            <CardHeader className="bg-gradient-to-r from-rose-50/80 to-red-50/50 border-b border-rose-100 py-5">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-rose-800">
                <RotateCcw className="h-5 w-5 text-rose-500" /> Riwayat Retur / Kadaluarsa Roti (Kalkulasi HPP Otomatis)
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
                        <th className="text-left py-3.5 px-6">Account / Agent</th>
                        <th className="text-left py-3.5 px-6">Nama Roti</th>
                        <th className="text-right py-3.5 px-6">Jumlah Retur</th>
                        <th className="text-left py-3.5 px-6">Alasan</th>
                        <th className="text-right py-3.5 px-6">Kerugian HPP (Otomatis)</th>
                        <th className="text-left py-3.5 px-6">Catatan</th>
                        <th className="text-center py-3.5 px-6">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {returns.map(r => (
                        <tr key={r.id} className="hover:bg-rose-50/40 transition-colors">
                          <td className="py-4 px-6 text-slate-500 font-medium">{formatDate(r.date)}</td>
                          <td className="py-4 px-6">
                            <Badge variant="secondary" className="bg-rose-100 text-rose-800 font-bold text-[10px]">
                              {r.agent?.name || "Umum / Toko"}
                            </Badge>
                          </td>
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
        ) : (
          /* Rekap Financial & Laba Bersih Per Marketing Agent */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {agentFinancials.map(af => (
                <Card key={af.agent.id} className="overflow-hidden border-emerald-500/20 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">{af.agent.code || "AGENT"}</span>
                      <CardTitle className="text-base font-black tracking-tight mt-0.5">{af.agent.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3 bg-white">
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Total Omset Penjualan:</span>
                      <span className="font-extrabold text-emerald-600">{formatCurrency(af.omset)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Roti Terjual:</span>
                      <span className="font-bold text-slate-800">{formatNumber(af.pcsSold)} pcs</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Estimasi HPP Roti Terjual:</span>
                      <span className="font-semibold text-slate-700">{formatCurrency(af.totalHppSold)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Total Kerugian Retur:</span>
                      <span className="font-bold text-rose-600">-{formatCurrency(af.kerugianRetur)} ({af.pcsReturned} pcs)</span>
                    </div>
                    <div className="pt-2 flex justify-between items-center text-sm bg-emerald-50 p-3 rounded-xl border border-emerald-200/60">
                      <span className="font-extrabold text-slate-700">Laba Bersih Agent:</span>
                      <span className={`font-black text-base ${af.labaBersih >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                        {formatCurrency(af.labaBersih)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Detailed Table for Marketing Agents Breakdown */}
            <Card className="overflow-hidden border-emerald-500/10">
              <CardHeader className="bg-gradient-to-r from-emerald-50/90 to-teal-50/60 border-b border-emerald-100 py-4 flex flex-row justify-between items-center">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                  <Users className="h-5 w-5 text-emerald-600" /> Ringkasan Laba & Retur Per Account / Marketing Agent
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setOpenAgentManager(true)} className="rounded-xl text-xs font-bold gap-1 border-purple-300 text-purple-700 hover:bg-purple-50">
                  <Settings className="h-3.5 w-3.5" /> Kelola & Edit Nama Agent
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                        <th className="text-left py-3.5 px-6">Kode & Nama Agent</th>
                        <th className="text-right py-3.5 px-6">Terjual (Pcs)</th>
                        <th className="text-right py-3.5 px-6">Total Omset</th>
                        <th className="text-right py-3.5 px-6">HPP Terjual</th>
                        <th className="text-right py-3.5 px-6">Retur (Pcs)</th>
                        <th className="text-right py-3.5 px-6">Kerugian Retur</th>
                        <th className="text-right py-3.5 px-6">Laba Bersih Agent</th>
                        <th className="text-center py-3.5 px-6">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {agentFinancials.map(af => (
                        <tr key={af.agent.id} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="py-4 px-6 font-bold text-slate-800">{af.agent.name}</td>
                          <td className="py-4 px-6 text-right font-bold text-slate-700">{formatNumber(af.pcsSold)} pcs</td>
                          <td className="py-4 px-6 text-right font-extrabold text-emerald-600">{formatCurrency(af.omset)}</td>
                          <td className="py-4 px-6 text-right font-semibold text-slate-600">{formatCurrency(af.totalHppSold)}</td>
                          <td className="py-4 px-6 text-right font-bold text-rose-700">{formatNumber(af.pcsReturned)} pcs</td>
                          <td className="py-4 px-6 text-right font-bold text-rose-600">-{formatCurrency(af.kerugianRetur)}</td>
                          <td className={`py-4 px-6 text-right font-black text-base ${af.labaBersih >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                            {formatCurrency(af.labaBersih)}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <Button variant="outline" size="sm" onClick={() => { setOpenAgentManager(true); startEditAgent(af.agent) }} className="rounded-xl h-8 text-xs font-bold gap-1">
                              <Pencil className="h-3 w-3" /> Edit Nama
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  )
}
