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
import {
  Plus,
  Pencil,
  Trash2,
  ShoppingBag,
  RotateCcw,
  DollarSign,
  Users,
  CheckCircle,
  Settings,
  Check,
  X,
  Gift,
  Award,
  Package,
  AlertCircle,
  AlertTriangle,
} from "lucide-react"

interface RecipeStockInfo {
  recipeId: string
  recipeName: string
  servingsPerBatch: number
  totalProduced: number
  totalSold: number
  totalRegularReturned: number
  totalFree: number
  totalBonus: number
  totalCirculatingInStores?: number
  totalOutflow: number
  availableStock: number
}

interface StockSummary {
  totalProducedAll: number
  totalSoldAll: number
  totalRegularReturnedAll: number
  totalFreeAll: number
  totalBonusAll: number
  totalCirculatingInStoresAll?: number
  totalOutflowAll: number
  availableStockAll: number
  recipes: RecipeStockInfo[]
}

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

const REGULAR_REASONS = [
  "Kadaluarsa (Expired)",
  "Rusak / Bantet",
  "Ditolak Toko / Konsinyasi",
  "Kemasan Cacat",
  "Lainnya",
]

const FREE_REASONS = [
  "Free (Tester Toko)",
  "Free (Cicipan Pembeli)",
  "Free (Sampel Calon Mitra)",
  "Free (Promosi / Event)",
  "Lainnya",
]

const BONUS_REASONS = [
  "Bonus Target Penjualan",
  "Bonus Reward Prestasi",
  "Bonus Loyalitas Agen",
  "Bonus Tambahan Mitra",
  "Lainnya",
]

export default function PenjualanPage() {
  const { data: session } = useSession()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [marketingAgents, setMarketingAgents] = useState<MarketingAgent[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [returns, setReturns] = useState<SaleReturn[]>([])
  const [loading, setLoading] = useState(true)

  // Top level active tab: "penjualan" | "retur" | "rekap-agent"
  const [activeTab, setActiveTab] = useState<"penjualan" | "retur" | "rekap-agent">("penjualan")

  // Sub-menu state for Retur tab: "semua" | "retur" | "free" | "bonus"
  const [returSubTab, setReturSubTab] = useState<"semua" | "retur" | "free" | "bonus">("semua")

  // Sales Form State
  const [openSaleModal, setOpenSaleModal] = useState(false)
  const [editSaleItem, setEditSaleItem] = useState<Sale | null>(null)
  const [saleForm, setSaleForm] = useState({
    recipeId: "",
    recipeName: "",
    agentId: "",
    quantity: "1",
    pricePerUnit: "",
    notes: "",
    date: "",
  })
  const [savingSale, setSavingSale] = useState(false)

  // Returns / Free / Bonus Form State
  const [openReturnModal, setOpenReturnModal] = useState(false)
  const [editReturnItem, setEditReturnItem] = useState<SaleReturn | null>(null)
  const [returnForm, setReturnForm] = useState({
    category: "RETUR" as "RETUR" | "FREE" | "BONUS",
    recipeId: "",
    recipeName: "",
    agentId: "",
    quantity: "1",
    reason: "Kadaluarsa (Expired)",
    manualLossAmount: "",
    notes: "",
    date: "",
  })
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
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null)

  const fetchData = () => {
    Promise.all([
      fetch("/api/resep").then(r => r.json()),
      fetch("/api/marketing-agents").then(r => r.json()),
      fetch("/api/penjualan").then(r => r.json()),
      fetch("/api/retur").then(r => r.json()),
      fetch("/api/stok-roti").then(r => r.json()),
    ]).then(([r, ag, s, ret, st]) => {
      setRecipes(Array.isArray(r) ? r : [])
      setMarketingAgents(Array.isArray(ag) ? ag : [])
      setSales(Array.isArray(s) ? s : [])
      setReturns(Array.isArray(ret) ? ret : [])
      setStockSummary(st && st.recipes ? st : null)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
  }, [])

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

  // Classification Helpers for Returns, Free, and Bonus
  const isBonus = (r: SaleReturn) => (r.reason || "").toLowerCase().includes("bonus")
  const isFree = (r: SaleReturn) => {
    const reason = (r.reason || "").toLowerCase()
    return (reason.includes("free") || reason.includes("tester") || reason.includes("sampel")) && !reason.includes("bonus")
  }
  const isRegularReturn = (r: SaleReturn) => !isBonus(r) && !isFree(r)

  // Segmented Return Datasets
  const regularReturns = returns.filter(isRegularReturn)
  const freeReturns = returns.filter(isFree)
  const bonusReturns = returns.filter(isBonus)

  // Financial Summary Totals
  const totalOmsetKotor = sales.reduce((sum, s) => sum + s.totalAmount, 0)
  const totalPcsSold = sales.reduce((sum, s) => sum + s.quantity, 0)
  const totalReturnLoss = regularReturns.reduce((sum, r) => sum + r.lossAmount, 0)
  const totalFreeLoss = freeReturns.reduce((sum, r) => sum + r.lossAmount, 0)
  const totalBonusLoss = bonusReturns.reduce((sum, r) => sum + r.lossAmount, 0)

  const totalPcsRegularReturn = regularReturns.reduce((sum, r) => sum + r.quantity, 0)
  const totalPcsFree = freeReturns.reduce((sum, r) => sum + r.quantity, 0)
  const totalPcsBonus = bonusReturns.reduce((sum, r) => sum + r.quantity, 0)

  // Penjualan Bersih (Net Omset) setelah dipotong Retur Reguler HPP
  const totalOmsetBersih = Math.max(0, totalOmsetKotor - totalReturnLoss)
  const totalPcsNetSold = Math.max(0, totalPcsSold - totalPcsRegularReturn)
  const totalOmset = totalOmsetBersih // backward compatibility variable

  // REKAP BONUS SENDIRI-SENDIRI TIAP MARKETING AGENT
  const agentBonusSummary = marketingAgents.map(agent => {
    const agentBonuses = bonusReturns.filter(r => r.agentId === agent.id)
    const totalBonusPcs = agentBonuses.reduce((sum, r) => sum + r.quantity, 0)
    const totalBonusHpp = agentBonuses.reduce((sum, r) => sum + r.lossAmount, 0)
    const lastBonus = agentBonuses.length > 0 ? agentBonuses[0].date : null

    return {
      agent,
      totalBonusPcs,
      totalBonusHpp,
      count: agentBonuses.length,
      lastBonus,
      history: agentBonuses,
    }
  })

  // Marketing Agent Financial Breakdown Calculation
  const agentFinancials = marketingAgents.map(agent => {
    const agentSales = sales.filter(s => s.agentId === agent.id)
    const agentAllReturns = returns.filter(r => r.agentId === agent.id)
    const agentRegularReturns = agentAllReturns.filter(isRegularReturn)
    const agentBonuses = agentAllReturns.filter(isBonus)

    const omsetKotor = agentSales.reduce((sum, s) => sum + s.totalAmount, 0)
    const pcsSold = agentSales.reduce((sum, s) => sum + s.quantity, 0)

    const totalHppSold = agentSales.reduce((sum, s) => {
      const hpp = calculateHppPerPcs(s.recipeId || s.recipeName)
      return sum + hpp * s.quantity
    }, 0)

    const potonganRetur = agentRegularReturns.reduce((sum, r) => sum + r.lossAmount, 0)
    const pcsReturned = agentRegularReturns.reduce((sum, r) => sum + r.quantity, 0)

    // Penjualan Bersih Agen = Omset Kotor - Potongan Retur Reguler (HPP)
    const penjualanBersih = Math.max(0, omsetKotor - potonganRetur)
    const pcsNetSold = Math.max(0, pcsSold - pcsReturned)

    const bonusPcs = agentBonuses.reduce((sum, r) => sum + r.quantity, 0)
    const bonusHpp = agentBonuses.reduce((sum, r) => sum + r.lossAmount, 0)

    // Laba Bersih Agent = Penjualan Bersih - HPP Bahan Terjual - Bonus HPP
    const labaBersih = penjualanBersih - totalHppSold - bonusHpp

    return {
      agent,
      omset: penjualanBersih, // Net Omset
      omsetKotor,
      potonganRetur,
      pcsSold: pcsNetSold,
      pcsGrossSold: pcsSold,
      totalHppSold,
      kerugianRetur: potonganRetur,
      pcsReturned,
      bonusPcs,
      bonusHpp,
      labaBersih,
      transactionCount: agentSales.length + agentAllReturns.length,
    }
  })

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
    setSaleForm({
      recipeId: "",
      recipeName: "",
      agentId: defaultAgent,
      quantity: "1",
      pricePerUnit: "",
      notes: "",
      date: new Date().toISOString().split("T")[0],
    })
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

  // Open Add Return / Free / Bonus with category presets
  const openAddReturn = (cat: "RETUR" | "FREE" | "BONUS" = "RETUR", specificAgentId?: string) => {
    setEditReturnItem(null)
    // Free TIDAK menggunakan agent (kesatuan perusahaan)
    const defaultAgent = cat === "FREE" ? "" : (specificAgentId || marketingAgents[0]?.id || "")
    const defaultReason = cat === "BONUS"
      ? "Bonus Target Penjualan"
      : cat === "FREE"
      ? "Free (Tester Toko)"
      : "Kadaluarsa (Expired)"

    setReturnForm({
      category: cat,
      recipeId: "",
      recipeName: "",
      agentId: defaultAgent,
      quantity: "1",
      reason: defaultReason,
      manualLossAmount: "",
      notes: "",
      date: new Date().toISOString().split("T")[0],
    })
    setEstimatedHppPerPcs(0)
    setOpenReturnModal(true)
  }

  const openEditReturn = (item: SaleReturn) => {
    setEditReturnItem(item)
    const hpp = calculateHppPerPcs(item.recipeId || item.recipeName)
    setEstimatedHppPerPcs(hpp)

    let cat: "RETUR" | "FREE" | "BONUS" = "RETUR"
    const rLower = (item.reason || "").toLowerCase()
    if (rLower.includes("bonus")) {
      cat = "BONUS"
    } else if (rLower.includes("free") || rLower.includes("tester") || rLower.includes("sampel")) {
      cat = "FREE"
    }

    setReturnForm({
      category: cat,
      recipeId: item.recipeId || "",
      recipeName: item.recipeName,
      agentId: cat === "FREE" ? "" : (item.agentId || ""),
      quantity: item.quantity.toString(),
      reason: item.reason || (cat === "BONUS" ? "Bonus Target Penjualan" : cat === "FREE" ? "Free (Tester Toko)" : "Kadaluarsa (Expired)"),
      manualLossAmount: item.lossAmount.toString(),
      notes: item.notes || "",
      date: item.date ? new Date(item.date).toISOString().split("T")[0] : "",
    })
    setOpenReturnModal(true)
  }

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingReturn(true)

    // Ensure reason reflects category for consistent tracking
    let finalReason = returnForm.reason
    if (returnForm.category === "BONUS" && !finalReason.toLowerCase().includes("bonus")) {
      finalReason = `Bonus: ${finalReason}`
    } else if (returnForm.category === "FREE" && !finalReason.toLowerCase().includes("free") && !finalReason.toLowerCase().includes("tester")) {
      finalReason = `Free: ${finalReason}`
    }

    // Untuk Free: tidak menggunakan agentId (null)
    const targetAgentId = returnForm.category === "FREE" ? null : (returnForm.agentId || null)

    const payload = {
      ...returnForm,
      agentId: targetAgentId,
      reason: finalReason,
      userId: (session?.user as { id?: string })?.id,
    }

    let res: Response
    if (editReturnItem) {
      res = await fetch(`/api/retur/${editReturnItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    } else {
      res = await fetch("/api/retur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    }

    const data = await res.json()
    if (!res.ok) {
      alert(data.error || "Gagal menyimpan")
      setSavingReturn(false)
      return
    }

    const labelAction = returnForm.category === "BONUS" ? "Bonus Marketing Agent" : returnForm.category === "FREE" ? "Roti Free (Tester)" : "Retur Roti"
    setMsg(editReturnItem ? `Data ${labelAction} berhasil diupdate!` : `${labelAction} berhasil dicatat! Otomatis Biaya/Kerugian HPP: ${formatCurrency(data.lossAmount)}`)
    setOpenReturnModal(false)
    setEditReturnItem(null)
    setSavingReturn(false)
    fetchData()
    setTimeout(() => setMsg(""), 5000)
  }

  const handleDeleteReturn = async (id: string) => {
    if (!confirm("Hapus data ini?")) return
    const res = await fetch(`/api/retur/${id}`, { method: "DELETE" })
    if (!res.ok) {
      alert("Gagal menghapus data")
      return
    }
    fetchData()
  }

  const getRecipeStockForSale = (recipeIdOrName: string) => {
    if (!stockSummary?.recipes) return null
    const trimmed = (recipeIdOrName || "").trim().toLowerCase()
    const found = stockSummary.recipes.find(
      r => r.recipeId === recipeIdOrName || r.recipeName.toLowerCase() === trimmed
    )
    if (!found) return null
    let avail = found.availableStock
    if (editSaleItem && (editSaleItem.recipeId === found.recipeId || editSaleItem.recipeName.toLowerCase() === found.recipeName.toLowerCase())) {
      avail += editSaleItem.quantity
    }
    return { ...found, availableStock: avail }
  }

  const getRecipeStockForReturn = (recipeIdOrName: string) => {
    if (!stockSummary?.recipes) return null
    const trimmed = (recipeIdOrName || "").trim().toLowerCase()
    const found = stockSummary.recipes.find(
      r => r.recipeId === recipeIdOrName || r.recipeName.toLowerCase() === trimmed
    )
    if (!found) return null
    let avail = found.availableStock
    let circ = found.totalCirculatingInStores ?? Math.max(0, found.totalSold - found.totalRegularReturned)
    if (editReturnItem && (editReturnItem.recipeId === found.recipeId || editReturnItem.recipeName.toLowerCase() === found.recipeName.toLowerCase())) {
      avail += editReturnItem.quantity
      if (!isBonus(editReturnItem) && !isFree(editReturnItem)) {
        circ += editReturnItem.quantity
      }
    }
    return { ...found, availableStock: avail, totalCirculatingInStores: circ }
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

  const currentSaleStock = getRecipeStockForSale(saleForm.recipeId || saleForm.recipeName)
  const saleQtyNum = parseInt(saleForm.quantity || "0", 10) || 0
  const isSaleOverStock = currentSaleStock !== null && (saleQtyNum > currentSaleStock.availableStock || currentSaleStock.availableStock <= 0)

  const currentReturnStock = getRecipeStockForReturn(returnForm.recipeId || returnForm.recipeName)
  const returnQtyNum = parseInt(returnForm.quantity || "0", 10) || 0
  const isFormRegularReturn = returnForm.category === "RETUR"
  const maxReturnable = currentReturnStock ? (currentReturnStock.totalCirculatingInStores ?? Math.max(0, currentReturnStock.totalSold - currentReturnStock.totalRegularReturned)) : 0
  const isReturnOverStock = currentReturnStock !== null && (
    isFormRegularReturn
      ? returnQtyNum > maxReturnable
      : (returnQtyNum > currentReturnStock.availableStock || currentReturnStock.availableStock <= 0)
  )

  return (
    <div className="min-h-screen">
      <Header
        title="Penjualan, Retur, & Bonus Agent"
        description="Kelola omset penjualan, retur kadaluarsa, roti free/tester, dan bonus per agent marketing"
      />
      <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">

        {msg && (
          <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 flex-shrink-0" />
            <p className="text-sm font-bold">{msg}</p>
          </div>
        )}

        {/* Banner Stok Roti Siap Jual (Mengacu Hasil Produksi) */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 rounded-3xl p-5 sm:p-6 text-white shadow-xl shadow-emerald-900/15 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-emerald-100">
                  Kumulatif Real-Time
                </span>
                <span className="text-xs text-emerald-200 font-bold">Stok Roti Jadi Siap Jual</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                <Package className="h-6 w-6 text-emerald-300 flex-shrink-0" />
                Stok Roti Siap Jual:{" "}
                <span className={`underline decoration-4 underline-offset-4 ${
                  (stockSummary?.availableStockAll ?? 0) > 0 ? "decoration-emerald-300 text-white" : "decoration-rose-400 text-rose-200"
                }`}>
                  {formatNumber(stockSummary?.availableStockAll ?? 0)} pcs
                </span>
              </h3>
              <p className="text-xs text-emerald-100/90 leading-relaxed">
                Penjualan, roti free, bonus marketing, & retur mengacu langsung pada stok produksi. Sisa stok hari sebelumnya otomatis terbawa dan dapat dijual kapan pun.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-black/20 p-3 rounded-2xl border border-white/10 backdrop-blur-xs text-xs w-full lg:w-auto">
              <div className="text-center p-2 rounded-xl bg-white/5">
                <p className="text-[10px] text-emerald-200 uppercase font-bold">Diproduksi</p>
                <p className="text-sm font-black text-white">{formatNumber(stockSummary?.totalProducedAll ?? 0)} pcs</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-white/5">
                <p className="text-[10px] text-emerald-200 uppercase font-bold">Terjual</p>
                <p className="text-sm font-black text-white">{formatNumber(stockSummary?.totalSoldAll ?? 0)} pcs</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-white/5">
                <p className="text-[10px] text-amber-200 uppercase font-bold">Free</p>
                <p className="text-sm font-black text-amber-300">{formatNumber(stockSummary?.totalFreeAll ?? 0)} pcs</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-white/5">
                <p className="text-[10px] text-purple-200 uppercase font-bold">Bonus</p>
                <p className="text-sm font-black text-purple-300">{formatNumber(stockSummary?.totalBonusAll ?? 0)} pcs</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-white/5 col-span-2 sm:col-span-1">
                <p className="text-[10px] text-rose-200 uppercase font-bold">Retur</p>
                <p className="text-sm font-black text-rose-300">{formatNumber(stockSummary?.totalRegularReturnedAll ?? 0)} pcs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">
          <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 relative overflow-hidden group">
            <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
              <div className="p-2 sm:p-3 md:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 flex-shrink-0">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-bold tracking-wider text-slate-400 uppercase truncate">Penjualan Bersih</p>
                <p className="text-sm sm:text-base md:text-xl font-black text-emerald-600 tracking-tight mt-0.5 truncate" title={formatCurrency(totalOmsetBersih)}>
                  {formatCurrency(totalOmsetBersih)}
                </p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium truncate">Kotor: {formatCurrency(totalOmsetKotor)}</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 relative overflow-hidden group">
            <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
              <div className="p-2 sm:p-3 md:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/25 flex-shrink-0">
                <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-bold tracking-wider text-slate-400 uppercase truncate">Potongan Retur</p>
                <p className="text-sm sm:text-base md:text-xl font-black text-rose-600 tracking-tight mt-0.5 truncate" title={`-${formatCurrency(totalReturnLoss)}`}>
                  -{formatCurrency(totalReturnLoss)}
                </p>
                <p className="text-[9px] sm:text-[10px] text-rose-500 font-semibold truncate">{formatNumber(totalPcsRegularReturn)} pcs (HPP)</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 relative overflow-hidden group">
            <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
              <div className="p-2 sm:p-3 md:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 flex-shrink-0">
                <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-bold tracking-wider text-slate-400 uppercase truncate">Roti Terjual Bersih</p>
                <p className="text-sm sm:text-base md:text-xl font-black text-slate-800 tracking-tight mt-0.5 truncate" title={`${formatNumber(totalPcsNetSold)} pcs`}>
                  {formatNumber(totalPcsNetSold)} pcs
                </p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium truncate">Kirim: {formatNumber(totalPcsSold)} pcs</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 relative overflow-hidden group">
            <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
              <div className="p-2 sm:p-3 md:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/25 flex-shrink-0">
                <Award className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-bold tracking-wider text-slate-400 uppercase truncate">Bonus Agent</p>
                <p className="text-sm sm:text-base md:text-xl font-black text-purple-700 tracking-tight mt-0.5 truncate" title={`${formatNumber(totalPcsBonus)} pcs`}>
                  {formatNumber(totalPcsBonus)} pcs
                </p>
                <p className="text-[9px] sm:text-[10px] text-purple-600 font-medium truncate">{formatCurrency(totalBonusLoss)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top-Level Tab Switcher */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white/70 backdrop-blur-md p-3 rounded-2xl border border-emerald-500/10 shadow-xs">
          <div className="flex flex-wrap bg-slate-100/80 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab("penjualan")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "penjualan" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ShoppingBag className="h-4 w-4" /> Penjualan ({sales.length})
            </button>
            <button
              onClick={() => setActiveTab("retur")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "retur" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <RotateCcw className="h-4 w-4" /> Menu Retur, Free & Bonus ({returns.length})
            </button>
            <button
              onClick={() => setActiveTab("rekap-agent")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "rekap-agent" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Users className="h-4 w-4" /> Rekap Laba Per Agent
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenAgentManager(true)}
              className="rounded-xl border-purple-300 text-purple-700 hover:bg-purple-50 text-xs font-bold"
            >
              <Settings className="h-4 w-4" /> Kelola Agent
            </Button>

            {activeTab === "penjualan" && (
              <Button onClick={openAddSale} className="shadow-lg shadow-emerald-500/25">
                <Plus className="h-4 w-4" /> Catat Penjualan
              </Button>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: DATA PENJUALAN */}
        {/* ============================================================ */}
        {activeTab === "penjualan" && (
          <Card className="overflow-hidden border-emerald-500/10">
            <CardHeader className="bg-gradient-to-r from-emerald-50/90 to-teal-50/60 border-b border-emerald-100 py-4 sm:py-5">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-slate-800">
                <ShoppingBag className="h-5 w-5 text-emerald-600" /> Riwayat Transaksi Penjualan Roti
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
                        <th className="text-left py-3.5 px-4 sm:px-6">Tanggal</th>
                        <th className="text-left py-3.5 px-4 sm:px-6">Account / Agent</th>
                        <th className="text-left py-3.5 px-4 sm:px-6">Nama Roti</th>
                        <th className="text-right py-3.5 px-4 sm:px-6">Terjual</th>
                        <th className="text-right py-3.5 px-4 sm:px-6">Harga / Pcs</th>
                        <th className="text-right py-3.5 px-4 sm:px-6">Total Omset</th>
                        <th className="text-left py-3.5 px-4 sm:px-6">Catatan</th>
                        <th className="text-center py-3.5 px-4 sm:px-6">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sales.map(s => (
                        <tr key={s.id} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="py-4 px-4 sm:px-6 text-slate-500 font-medium whitespace-nowrap">{formatDate(s.date)}</td>
                          <td className="py-4 px-4 sm:px-6">
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              {s.agent?.name || "Umum / Toko"}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 sm:px-6 font-bold text-slate-800">{s.recipeName}</td>
                          <td className="py-4 px-4 sm:px-6 text-right font-bold text-slate-700">{formatNumber(s.quantity)} pcs</td>
                          <td className="py-4 px-4 sm:px-6 text-right font-semibold text-slate-600">{formatCurrency(s.pricePerUnit)}</td>
                          <td className="py-4 px-4 sm:px-6 text-right font-extrabold text-emerald-600">{formatCurrency(s.totalAmount)}</td>
                          <td className="py-4 px-4 sm:px-6 text-xs text-slate-400">{s.notes || "-"}</td>
                          <td className="py-4 px-4 sm:px-6 text-center">
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
        )}

        {/* ============================================================ */}
        {/* TAB 2: MENU RETUR (1 SUB-MENU = 1 TOMBOL AKSI TUNGGAL)       */}
        {/* ============================================================ */}
        {activeTab === "retur" && (
          <div className="space-y-5">
            {/* SUB-MENU NAVIGATION PILLS & SINGLE CLEAN ACTION BUTTON */}
            <div className="bg-white/80 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setReturSubTab("semua")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    returSubTab === "semua"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Semua Data</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${returSubTab === "semua" ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-700"}`}>
                    {returns.length}
                  </span>
                </button>

                <button
                  onClick={() => setReturSubTab("retur")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    returSubTab === "retur"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "text-rose-700 hover:bg-rose-50"
                  }`}
                >
                  <span>🔴 Retur Reguler</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${returSubTab === "retur" ? "bg-rose-700 text-white" : "bg-rose-100 text-rose-800"}`}>
                    {regularReturns.length}
                  </span>
                </button>

                <button
                  onClick={() => setReturSubTab("free")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    returSubTab === "free"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-amber-800 hover:bg-amber-50"
                  }`}
                >
                  <Gift className="h-3.5 w-3.5" />
                  <span>🎁 Sub Menu: Free</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${returSubTab === "free" ? "bg-amber-700 text-white" : "bg-amber-100 text-amber-900"}`}>
                    {freeReturns.length}
                  </span>
                </button>

                <button
                  onClick={() => setReturSubTab("bonus")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    returSubTab === "bonus"
                      ? "bg-purple-700 text-white shadow-sm"
                      : "text-purple-700 hover:bg-purple-50"
                  }`}
                >
                  <Award className="h-3.5 w-3.5" />
                  <span>⭐ Sub Menu: Bonus Agent Marketing</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${returSubTab === "bonus" ? "bg-purple-900 text-white" : "bg-purple-100 text-purple-900"}`}>
                    {bonusReturns.length}
                  </span>
                </button>
              </div>

              {/* 1 TUNGGAL TOMBOL BERFUNGSI SESUAI SUB-MENU AKTIF */}
              <div>
                {returSubTab === "bonus" ? (
                  <Button
                    onClick={() => openAddReturn("BONUS")}
                    className="rounded-xl text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Catat Bonus Agent
                  </Button>
                ) : returSubTab === "free" ? (
                  <Button
                    onClick={() => openAddReturn("FREE")}
                    className="rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Catat Roti Free
                  </Button>
                ) : returSubTab === "retur" ? (
                  <Button
                    onClick={() => openAddReturn("RETUR")}
                    variant="destructive"
                    className="rounded-xl text-xs font-bold shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Catat Retur Baru
                  </Button>
                ) : (
                  <Button
                    onClick={() => openAddReturn("RETUR")}
                    className="rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Catat Data Baru
                  </Button>
                )}
              </div>
            </div>

            {/* SUB-MENU VIEW 1: ⭐ BONUS AGENT MARKETING (JUMLAH SENDIRI-SENDIRI) */}
            {returSubTab === "bonus" && (
              <div className="space-y-6">
                {/* Banner explanation tanpa tombol duplikat */}
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-start gap-3">
                  <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-md shadow-purple-600/30 flex-shrink-0">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-purple-900 text-sm">Sub Menu: Bonus Agent Marketing</h4>
                    <p className="text-xs text-purple-700 mt-0.5">
                      Pencatatan jumlah roti bonus yang diberikan kepada masing-masing Agent Marketing dihitung secara <strong>sendiri-sendiri</strong> per agent.
                    </p>
                  </div>
                </div>

                {/* Summary stat cards for Bonus */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="border-purple-200 bg-white">
                    <CardContent className="p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Total Roti Bonus Dibagikan</p>
                      <p className="text-2xl font-black text-purple-900 mt-1">{formatNumber(totalPcsBonus)} pcs</p>
                      <p className="text-xs text-slate-400 mt-0.5">Dari {bonusReturns.length} kali transaksi bonus</p>
                    </CardContent>
                  </Card>
                  <Card className="border-purple-200 bg-white">
                    <CardContent className="p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Total Nilai HPP Bonus</p>
                      <p className="text-2xl font-black text-purple-700 mt-1">{formatCurrency(totalBonusLoss)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Biaya produksi roti yang dijadikan reward</p>
                    </CardContent>
                  </Card>
                  <Card className="border-purple-200 bg-white">
                    <CardContent className="p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Jumlah Agent Terdaftar</p>
                      <p className="text-2xl font-black text-slate-800 mt-1">{marketingAgents.length} Agent</p>
                      <p className="text-xs text-slate-400 mt-0.5">Masing-masing memiliki saldo bonus sendiri-sendiri</p>
                    </CardContent>
                  </Card>
                </div>

                {/* GRID REKAP JUMLAH BONUS SENDIRI-SENDIRI TIAP AGENT */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-600" />
                      Rekap Jumlah Bonus Tiap Agent Marketing (Sendiri-Sendiri)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Klik tombol &quot;+ Beri Bonus&quot; di bawah untuk mencatat bonus langsung ke agent yang bersangkutan
                    </p>
                  </div>

                  {marketingAgents.length === 0 ? (
                    <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-400 space-y-3">
                      <p>Belum ada Marketing Agent yang terdaftar.</p>
                      <Button onClick={() => setOpenAgentManager(true)} className="bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold">
                        + Tambah Agent Marketing Sekarang
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {agentBonusSummary.map(ab => (
                        <Card key={ab.agent.id} className="overflow-hidden border-purple-200 hover:border-purple-400 transition-all shadow-sm">
                          <CardHeader className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-purple-200">
                                  {ab.agent.code || "AGENT"}
                                </span>
                                <CardTitle className="text-base font-black text-white mt-0.5">
                                  {ab.agent.name}
                                </CardTitle>
                              </div>
                              <span className="p-2 bg-white/10 rounded-xl">
                                <Award className="h-4 w-4 text-amber-300" />
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 space-y-3 bg-white">
                            {/* Prominent Individual Bonus Count */}
                            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 flex justify-between items-center">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Total Jumlah Bonus</p>
                                <p className="text-2xl font-black text-purple-900 mt-0.5">
                                  {formatNumber(ab.totalBonusPcs)} <span className="text-sm font-bold text-purple-600">pcs</span>
                                </p>
                              </div>
                              <Badge className="bg-purple-600 text-white font-extrabold text-xs px-2.5 py-1">
                                {ab.count}x Diberi
                              </Badge>
                            </div>

                            <div className="text-xs space-y-1.5 text-slate-600 border-t border-slate-100 pt-2">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Total Nilai HPP Bonus:</span>
                                <span className="font-bold text-slate-800">{formatCurrency(ab.totalBonusHpp)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Terakhir Diberi Bonus:</span>
                                <span className="font-medium text-slate-700">
                                  {ab.lastBonus ? formatDate(ab.lastBonus) : "Belum pernah"}
                                </span>
                              </div>
                            </div>

                            <Button
                              onClick={() => openAddReturn("BONUS", ab.agent.id)}
                              className="w-full bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold h-9 gap-1 shadow-sm"
                            >
                              <Plus className="h-3.5 w-3.5" /> Beri Bonus ke {ab.agent.name}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Table of all Bonus transactions */}
                <Card className="overflow-hidden border-purple-200">
                  <CardHeader className="bg-purple-50 border-b border-purple-100 py-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-purple-950">
                      <Award className="h-5 w-5 text-purple-700" /> Riwayat Transaksi Bonus Agent Marketing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {bonusReturns.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">Belum ada catatan bonus yang diberikan kepada agent</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                              <th className="text-left py-3.5 px-4 sm:px-6">Tanggal</th>
                              <th className="text-left py-3.5 px-4 sm:px-6">Penerima (Agent)</th>
                              <th className="text-left py-3.5 px-4 sm:px-6">Nama Roti</th>
                              <th className="text-right py-3.5 px-4 sm:px-6">Jumlah Bonus</th>
                              <th className="text-left py-3.5 px-4 sm:px-6">Alasan / Prestasi</th>
                              <th className="text-right py-3.5 px-4 sm:px-6">Nilai HPP</th>
                              <th className="text-left py-3.5 px-4 sm:px-6">Catatan</th>
                              <th className="text-center py-3.5 px-4 sm:px-6">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {bonusReturns.map(r => (
                              <tr key={r.id} className="hover:bg-purple-50/40 transition-colors">
                                <td className="py-4 px-4 sm:px-6 text-slate-500 font-medium whitespace-nowrap">{formatDate(r.date)}</td>
                                <td className="py-4 px-4 sm:px-6">
                                  <Badge className="bg-purple-100 text-purple-900 border border-purple-200 font-extrabold text-[10px]">
                                    {r.agent?.name || "Umum"}
                                  </Badge>
                                </td>
                                <td className="py-4 px-4 sm:px-6 font-bold text-slate-800">{r.recipeName}</td>
                                <td className="py-4 px-4 sm:px-6 text-right font-black text-purple-700">+{formatNumber(r.quantity)} pcs</td>
                                <td className="py-4 px-4 sm:px-6">
                                  <span className="text-xs font-semibold text-purple-800">{r.reason || "Bonus Agent"}</span>
                                </td>
                                <td className="py-4 px-4 sm:px-6 text-right font-bold text-slate-700">{formatCurrency(r.lossAmount)}</td>
                                <td className="py-4 px-4 sm:px-6 text-xs text-slate-400">{r.notes || "-"}</td>
                                <td className="py-4 px-4 sm:px-6 text-center">
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
              </div>
            )}

            {/* SUB-MENU VIEW 2: 🎁 ROTI FREE (TESTER / PROMOSI) - TANPA AGENT (KESATUAN PERUSAHAAN) */}
            {returSubTab === "free" && (
              <div className="space-y-6">
                {/* Banner explanation tanpa tombol duplikat */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                  <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-md shadow-amber-600/30 flex-shrink-0">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-amber-950 text-sm">Sub Menu: Roti Free (Tester & Promosi)</h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Pencatatan roti yang dibagikan secara gratis untuk tester toko, cicipan pelanggan baru, atau promosi sampel. Diperhitungkan sebagai kesatuan pengeluaran perusahaan non-sales (tanpa agent).
                    </p>
                  </div>
                </div>

                {/* Summary stat cards for Free */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="border-amber-200 bg-white">
                    <CardContent className="p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Total Roti Free Dikeluarkan</p>
                      <p className="text-2xl font-black text-amber-900 mt-1">{formatNumber(totalPcsFree)} pcs</p>
                      <p className="text-xs text-slate-400 mt-0.5">Dari {freeReturns.length} kali pembagian tester / sampel</p>
                    </CardContent>
                  </Card>
                  <Card className="border-amber-200 bg-white">
                    <CardContent className="p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Total Nilai HPP Roti Free</p>
                      <p className="text-2xl font-black text-amber-800 mt-1">{formatCurrency(totalFreeLoss)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Biaya produksi roti yang dijadikan tester</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Table of Free bread (Tanpa Kolom Agent) */}
                <Card className="overflow-hidden border-amber-200">
                  <CardHeader className="bg-amber-50 border-b border-amber-100 py-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-amber-950">
                      <Gift className="h-5 w-5 text-amber-600" /> Riwayat Roti Free / Tester / Sampel Promosi
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {freeReturns.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">Belum ada catatan roti free / tester</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                              <th className="text-left py-3.5 px-4 sm:px-6">Tanggal</th>
                              <th className="text-left py-3.5 px-4 sm:px-6">Nama Roti</th>
                              <th className="text-right py-3.5 px-4 sm:px-6">Jumlah Free</th>
                              <th className="text-left py-3.5 px-4 sm:px-6">Alasan / Keperluan</th>
                              <th className="text-right py-3.5 px-4 sm:px-6">Nilai HPP</th>
                              <th className="text-left py-3.5 px-4 sm:px-6">Catatan</th>
                              <th className="text-center py-3.5 px-4 sm:px-6">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {freeReturns.map(r => (
                              <tr key={r.id} className="hover:bg-amber-50/40 transition-colors">
                                <td className="py-4 px-4 sm:px-6 text-slate-500 font-medium whitespace-nowrap">{formatDate(r.date)}</td>
                                <td className="py-4 px-4 sm:px-6 font-bold text-slate-800">{r.recipeName}</td>
                                <td className="py-4 px-4 sm:px-6 text-right font-black text-amber-700">{formatNumber(r.quantity)} pcs</td>
                                <td className="py-4 px-4 sm:px-6">
                                  <span className="text-xs font-semibold text-amber-800">{r.reason || "Free Tester"}</span>
                                </td>
                                <td className="py-4 px-4 sm:px-6 text-right font-bold text-slate-700">{formatCurrency(r.lossAmount)}</td>
                                <td className="py-4 px-4 sm:px-6 text-xs text-slate-400">{r.notes || "-"}</td>
                                <td className="py-4 px-4 sm:px-6 text-center">
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
              </div>
            )}

            {/* SUB-MENU VIEW 3: 🔴 RETUR REGULER (RUSAK / EXPIRED) */}
            {returSubTab === "retur" && (
              <div className="space-y-6">
                {/* Banner explanation tanpa tombol duplikat */}
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                  <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-md shadow-rose-600/30 flex-shrink-0">
                    <RotateCcw className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-rose-950 text-sm">Retur Reguler (Rusak / Expired / Ditolak)</h4>
                    <p className="text-xs text-rose-800 mt-0.5">
                      Pencatatan roti yang dikembalikan oleh toko konsinyasi atau agen karena kadaluarsa, rusak, bantet, atau cacat kemasan dengan kerugian HPP otomatis.
                    </p>
                  </div>
                </div>

                {/* Summary stat cards for Retur */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="border-rose-200 bg-white">
                    <CardContent className="p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Total Roti Retur</p>
                      <p className="text-2xl font-black text-rose-900 mt-1">{formatNumber(totalPcsRegularReturn)} pcs</p>
                      <p className="text-xs text-slate-400 mt-0.5">Roti yang rusak atau kadaluarsa</p>
                    </CardContent>
                  </Card>
                  <Card className="border-rose-200 bg-white">
                    <CardContent className="p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Total Kerugian HPP Retur</p>
                      <p className="text-2xl font-black text-rose-600 mt-1">{formatCurrency(totalReturnLoss)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Dihitung otomatis dari komposisi bahan baku</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Table of Regular Returns */}
                <Card className="overflow-hidden border-rose-200">
                  <CardHeader className="bg-rose-50 border-b border-rose-100 py-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-950">
                      <RotateCcw className="h-5 w-5 text-rose-600" /> Riwayat Retur Roti Rusak / Expired
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {regularReturns.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">Belum ada catatan retur reguler</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                              <th className="text-left py-3.5 px-4 sm:px-6">Tanggal</th>
                              <th className="text-left py-3.5 px-4 sm:px-6">Account / Agent</th>
                              <th className="text-left py-3.5 px-4 sm:px-6">Nama Roti</th>
                              <th className="text-right py-3.5 px-4 sm:px-6">Jumlah Retur</th>
                              <th className="text-left py-3.5 px-4 sm:px-6">Alasan</th>
                              <th className="text-right py-3.5 px-4 sm:px-6">Potongan Penjualan (HPP)</th>
                              <th className="text-left py-3.5 px-4 sm:px-6">Catatan</th>
                              <th className="text-center py-3.5 px-4 sm:px-6">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {regularReturns.map(r => (
                              <tr key={r.id} className="hover:bg-rose-50/40 transition-colors">
                                <td className="py-4 px-4 sm:px-6 text-slate-500 font-medium whitespace-nowrap">{formatDate(r.date)}</td>
                                <td className="py-4 px-4 sm:px-6">
                                  <Badge className="bg-rose-100 text-rose-900 border border-rose-200 font-extrabold text-[10px]">
                                    {r.agent?.name || "Umum / Toko"}
                                  </Badge>
                                </td>
                                <td className="py-4 px-4 sm:px-6 font-bold text-slate-800">{r.recipeName}</td>
                                <td className="py-4 px-4 sm:px-6 text-right font-black text-rose-700">{formatNumber(r.quantity)} pcs</td>
                                <td className="py-4 px-4 sm:px-6">
                                  <Badge variant="danger" className="text-[10px]">
                                    {r.reason || "Kadaluarsa"}
                                  </Badge>
                                </td>
                                <td className="py-4 px-4 sm:px-6 text-right font-black text-rose-600">{formatCurrency(r.lossAmount)}</td>
                                <td className="py-4 px-4 sm:px-6 text-xs text-slate-400">{r.notes || "-"}</td>
                                <td className="py-4 px-4 sm:px-6 text-center">
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
              </div>
            )}

            {/* SUB-MENU VIEW 4: 📋 SEMUA DATA RETUR, FREE & BONUS */}
            {returSubTab === "semua" && (
              <div className="space-y-6">
                {/* 3 mini cards breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">🔴 Retur Reguler</p>
                    <p className="text-xl font-black text-rose-900 mt-1">{formatNumber(totalPcsRegularReturn)} pcs</p>
                    <p className="text-xs text-rose-700 font-semibold">{formatCurrency(totalReturnLoss)}</p>
                  </div>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">🎁 Roti Free (Tester)</p>
                    <p className="text-xl font-black text-amber-950 mt-1">{formatNumber(totalPcsFree)} pcs</p>
                    <p className="text-xs text-amber-800 font-semibold">{formatCurrency(totalFreeLoss)}</p>
                  </div>
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700">⭐ Bonus Marketing Agent</p>
                    <p className="text-xl font-black text-purple-950 mt-1">{formatNumber(totalPcsBonus)} pcs</p>
                    <p className="text-xs text-purple-700 font-semibold">{formatCurrency(totalBonusLoss)}</p>
                  </div>
                </div>

                {/* Master table showing all */}
                <Card className="overflow-hidden border-slate-200">
                  <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                      <RotateCcw className="h-5 w-5 text-slate-600" /> Riwayat Semua Retur, Free, & Bonus ({returns.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loading ? (
                      <div className="text-center py-12 text-slate-400">Memuat data...</div>
                    ) : returns.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">Belum ada catatan retur, free, atau bonus</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                              <th className="text-left py-3.5 px-4 sm:px-6">Tanggal</th>
                              <th className="text-left py-3.5 px-4 sm:px-6">Kategori</th>
                              <th className="text-left py-3.5 px-4 sm:px-6">Account / Agent</th>
                              <th className="text-left py-3.5 px-4 sm:px-6">Nama Roti</th>
                              <th className="text-right py-3.5 px-4 sm:px-6">Jumlah</th>
                              <th className="text-left py-3.5 px-4 sm:px-6">Alasan</th>
                              <th className="text-right py-3.5 px-4 sm:px-6">Biaya HPP</th>
                              <th className="text-left py-3.5 px-4 sm:px-6">Catatan</th>
                              <th className="text-center py-3.5 px-4 sm:px-6">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {returns.map(r => {
                              const b = isBonus(r)
                              const f = isFree(r)
                              return (
                                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-4 px-4 sm:px-6 text-slate-500 font-medium whitespace-nowrap">{formatDate(r.date)}</td>
                                  <td className="py-4 px-4 sm:px-6">
                                    {b ? (
                                      <Badge className="bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-black">
                                        ⭐ Bonus Agent
                                      </Badge>
                                    ) : f ? (
                                      <Badge className="bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-black">
                                        🎁 Roti Free
                                      </Badge>
                                    ) : (
                                      <Badge variant="danger" className="text-[10px] font-black">
                                        🔴 Retur Reguler
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="py-4 px-4 sm:px-6">
                                    {f ? (
                                      <span className="text-[11px] text-slate-400 font-medium italic">
                                        Umum / Perusahaan
                                      </span>
                                    ) : (
                                      <span className="font-bold text-slate-800 text-xs">
                                        {r.agent?.name || "Umum / Toko"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-4 px-4 sm:px-6 font-bold text-slate-800">{r.recipeName}</td>
                                  <td className={`py-4 px-4 sm:px-6 text-right font-black ${b ? "text-purple-700" : f ? "text-amber-700" : "text-rose-700"}`}>
                                    {formatNumber(r.quantity)} pcs
                                  </td>
                                  <td className="py-4 px-4 sm:px-6 text-xs text-slate-600">{r.reason || "-"}</td>
                                  <td className="py-4 px-4 sm:px-6 text-right font-bold text-slate-700">{formatCurrency(r.lossAmount)}</td>
                                  <td className="py-4 px-4 sm:px-6 text-xs text-slate-400">{r.notes || "-"}</td>
                                  <td className="py-4 px-4 sm:px-6 text-center">
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
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: REKAP LABA & BONUS PER MARKETING AGENT                */}
        {/* ============================================================ */}
        {activeTab === "rekap-agent" && (
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
                      <span className="text-slate-500 font-medium">Penjualan Bersih (Net):</span>
                      <span className="font-extrabold text-emerald-600 text-sm">{formatCurrency(af.omset)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100 text-slate-500">
                      <span>• Penjualan Kotor Toko:</span>
                      <span className="font-semibold text-slate-700">{formatCurrency(af.omsetKotor)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100 text-rose-600">
                      <span className="font-medium">• Potongan Retur Reguler:</span>
                      <span className="font-bold">-{formatCurrency(af.potonganRetur)} ({af.pcsReturned} pcs)</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Roti Terjual Bersih:</span>
                      <span className="font-bold text-slate-800">{formatNumber(af.pcsSold)} pcs</span>
                    </div>
                    {/* Bonus Count per Agent */}
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100 bg-purple-50 p-2 rounded-lg">
                      <span className="text-purple-800 font-bold flex items-center gap-1">
                        <Award className="h-3.5 w-3.5 text-purple-600" /> Bonus Diberikan:
                      </span>
                      <span className="font-black text-purple-900">{formatNumber(af.bonusPcs)} pcs ({formatCurrency(af.bonusHpp)})</span>
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
                  <Users className="h-5 w-5 text-emerald-600" /> Ringkasan Laba, Retur & Bonus Per Marketing Agent
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
                        <th className="text-right py-3.5 px-6">Kirim (Pcs)</th>
                        <th className="text-right py-3.5 px-6">Retur (Pcs)</th>
                        <th className="text-right py-3.5 px-6">Bersih (Pcs)</th>
                        <th className="text-right py-3.5 px-6">Penjualan Bersih</th>
                        <th className="text-right py-3.5 px-6">Potongan Retur</th>
                        <th className="text-right py-3.5 px-6">Bonus (Pcs)</th>
                        <th className="text-right py-3.5 px-6">Laba Bersih Agent</th>
                        <th className="text-center py-3.5 px-6">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {agentFinancials.map(af => (
                        <tr key={af.agent.id} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="py-4 px-6 font-bold text-slate-800">{af.agent.name}</td>
                          <td className="py-4 px-6 text-right font-medium text-slate-500">{formatNumber(af.pcsGrossSold)} pcs</td>
                          <td className="py-4 px-6 text-right font-bold text-rose-600">-{formatNumber(af.pcsReturned)} pcs</td>
                          <td className="py-4 px-6 text-right font-bold text-slate-700">{formatNumber(af.pcsSold)} pcs</td>
                          <td className="py-4 px-6 text-right font-extrabold text-emerald-600">{formatCurrency(af.omset)}</td>
                          <td className="py-4 px-6 text-right font-bold text-rose-600">-{formatCurrency(af.potonganRetur)}</td>
                          <td className="py-4 px-6 text-right font-black text-purple-700">+{formatNumber(af.bonusPcs)} pcs</td>
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

        {/* ============================================================ */}
        {/* MODAL 1: KELOLA NAMA & KODE MARKETING AGENT                  */}
        {/* ============================================================ */}
        <Dialog open={openAgentManager} onOpenChange={setOpenAgentManager}>
          <DialogContent className="max-w-lg rounded-3xl glass-panel">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-purple-900">
                <Users className="h-5 w-5 text-purple-600" />
                Kelola & Edit Nama Marketing Agent
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-2">
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

        {/* ============================================================ */}
        {/* MODAL 2: FORM PENJUALAN                                      */}
        {/* ============================================================ */}
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
                    {recipes.map(r => {
                      const st = stockSummary?.recipes.find(s => s.recipeId === r.id)
                      const avail = st ? st.availableStock : 0
                      return (
                        <SelectItem key={r.id} value={r.id}>
                          <span className="font-semibold">{r.name}</span>
                          <span className={`ml-2 text-xs font-bold ${avail > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                            (Stok: {formatNumber(avail)} pcs)
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* LIVE STOK ROTI SIAP JUAL DISPLAY */}
              <div className={`p-3 rounded-2xl border text-xs transition-all ${
                currentSaleStock
                  ? currentSaleStock.availableStock > 0
                    ? "bg-emerald-50/90 border-emerald-200 text-emerald-950"
                    : "bg-rose-50/90 border-rose-200 text-rose-950"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className={`h-4 w-4 ${currentSaleStock && currentSaleStock.availableStock > 0 ? "text-emerald-600" : "text-rose-500"}`} />
                    <span className="font-bold text-xs">
                      {currentSaleStock
                        ? `Sisa Stok Siap Jual: ${formatNumber(currentSaleStock.availableStock)} pcs`
                        : "Pilih resep untuk cek sisa stok"}
                    </span>
                  </div>
                  {currentSaleStock && (
                    <span className={`px-2 py-0.5 rounded-full font-black text-[10px] uppercase ${
                      currentSaleStock.availableStock > 0 ? "bg-emerald-200 text-emerald-800" : "bg-rose-200 text-rose-800"
                    }`}>
                      {currentSaleStock.availableStock > 0 ? "Tersedia" : "Stok Kosong"}
                    </span>
                  )}
                </div>
                {currentSaleStock && (
                  <p className="text-[11px] opacity-75 mt-1">
                    Produksi: {formatNumber(currentSaleStock.totalProduced)} pcs • Terjual: {formatNumber(currentSaleStock.totalSold)} pcs • Retur/Free/Bonus: {formatNumber(currentSaleStock.totalRegularReturned + currentSaleStock.totalFree + currentSaleStock.totalBonus)} pcs
                  </p>
                )}
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

              {/* OVERSTOCK WARNING BANNER */}
              {isSaleOverStock && currentSaleStock && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs font-bold animate-pulse">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p>
                      {currentSaleStock.availableStock <= 0
                        ? `Stok roti "${currentSaleStock.recipeName}" habis (${currentSaleStock.availableStock} pcs)!`
                        : `Jumlah penjualan (${saleQtyNum} pcs) melebihi stok yang tersedia (${currentSaleStock.availableStock} pcs)!`}
                    </p>
                    <p className="font-normal text-[11px] mt-0.5 text-rose-600">
                      Silakan kurangi jumlah penjualan atau catat produksi baru terlebih dahulu di menu Produksi.
                    </p>
                  </div>
                </div>
              )}

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

              <Button
                type="submit"
                className={`w-full rounded-xl font-bold ${
                  isSaleOverStock ? "bg-rose-600 hover:bg-rose-700 text-white" : ""
                }`}
                disabled={savingSale || isSaleOverStock}
              >
                {savingSale
                  ? "Menyimpan Transaksi..."
                  : isSaleOverStock
                  ? `⚠️ Stok Tidak Mencukupi (Sisa ${currentSaleStock?.availableStock ?? 0} pcs)`
                  : editSaleItem
                  ? "Update Penjualan"
                  : "Simpan Penjualan"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* ============================================================ */}
        {/* MODAL 3: FORM RETUR / FREE / BONUS DENGAN SELECTOR KATEGORI  */}
        {/* ============================================================ */}
        <Dialog open={openReturnModal} onOpenChange={(o) => { setOpenReturnModal(o); if (!o) setEditReturnItem(null); }}>
          <DialogContent className="max-w-md rounded-3xl glass-panel">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                {returnForm.category === "BONUS" ? (
                  <>
                    <Award className="h-5 w-5 text-purple-600" />
                    <span className="text-purple-900">{editReturnItem ? "Edit Bonus Agent" : "Catat Bonus Agent Marketing"}</span>
                  </>
                ) : returnForm.category === "FREE" ? (
                  <>
                    <Gift className="h-5 w-5 text-amber-600" />
                    <span className="text-amber-900">{editReturnItem ? "Edit Roti Free" : "Catat Roti Free (Tester / Promo)"}</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-5 w-5 text-rose-500" />
                    <span className="text-rose-700">{editReturnItem ? "Edit Retur Roti" : "Input Retur Roti (Auto HPP)"}</span>
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            {/* Category Segmented Switcher in Modal */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl mt-1">
              <button
                type="button"
                onClick={() => setReturnForm({
                  ...returnForm,
                  category: "RETUR",
                  reason: "Kadaluarsa (Expired)",
                })}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                  returnForm.category === "RETUR"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🔴 Retur
              </button>
              <button
                type="button"
                onClick={() => setReturnForm({
                  ...returnForm,
                  category: "FREE",
                  agentId: "", // Free tidak memakai agent
                  reason: "Free (Tester Toko)",
                })}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                  returnForm.category === "FREE"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🎁 Free
              </button>
              <button
                type="button"
                onClick={() => setReturnForm({
                  ...returnForm,
                  category: "BONUS",
                  reason: "Bonus Target Penjualan",
                })}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                  returnForm.category === "BONUS"
                    ? "bg-purple-700 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ⭐ Bonus Agent
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="space-y-4 mt-3">
              {/* Agent Selector: HANYA MUNCUL JIKA BUKAN FREE */}
              {returnForm.category === "FREE" ? (
                <div className="p-3 bg-amber-50 border border-amber-200/90 rounded-2xl text-xs text-amber-950 flex items-center gap-2.5">
                  <div className="p-1.5 bg-amber-500 text-white rounded-lg flex-shrink-0">
                    <Gift className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-extrabold text-amber-900">Roti Free Perusahaan (Tanpa Agent)</p>
                    <p className="text-[11px] text-amber-800/90 mt-0.5">Tester & sampel promosi dicatat langsung sebagai kesatuan produksi perusahaan.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">
                    {returnForm.category === "BONUS" ? (
                      <span className="text-purple-900 flex items-center gap-1">
                        <Award className="h-3.5 w-3.5 text-purple-600" /> Pilih Agent Penerima Bonus *
                      </span>
                    ) : (
                      "Pilih Account / Marketing Agent"
                    )}
                  </Label>
                  <Select value={returnForm.agentId} onValueChange={v => setReturnForm({ ...returnForm, agentId: v })}>
                    <SelectTrigger className={`rounded-xl font-bold ${
                      returnForm.category === "BONUS"
                        ? "border-purple-300 text-purple-900 bg-purple-50/50"
                        : "border-rose-300 text-rose-800"
                    }`}>
                      <SelectValue placeholder="Pilih Marketing Agent..." />
                    </SelectTrigger>
                    <SelectContent>
                      {marketingAgents.map(ag => (
                        <SelectItem key={ag.id} value={ag.id}>
                          <span className="font-bold">{ag.name} {ag.code ? `(${ag.code})` : ""}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {returnForm.category === "BONUS" && (
                    <p className="text-[10px] text-purple-600 font-medium">
                      ⭐ Bonus akan otomatis masuk dan dicatat khusus ke saldo agen yang dipilih.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Tanggal Transaksi</Label>
                <Input type="date" value={returnForm.date} onChange={e => setReturnForm({ ...returnForm, date: e.target.value })} className="rounded-xl" />
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Pilih Resep / Jenis Roti</Label>
                <Select value={returnForm.recipeId} onValueChange={handleRecipeReturnSelect}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Pilih jenis roti..." /></SelectTrigger>
                  <SelectContent>
                    {recipes.map(r => {
                      const st = stockSummary?.recipes.find(s => s.recipeId === r.id)
                      const avail = st ? st.availableStock : 0
                      return (
                        <SelectItem key={r.id} value={r.id}>
                          <span className="font-semibold">{r.name}</span>
                          <span className={`ml-2 text-xs font-bold ${avail > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                            (Stok: {formatNumber(avail)} pcs)
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* LIVE STOK ROTI DISPLAY (SESUAI KATEGORI RETUR ATAU FREE/BONUS) */}
              {isFormRegularReturn ? (
                <div className={`p-3 rounded-2xl border text-xs transition-all ${
                  currentReturnStock
                    ? maxReturnable > 0
                      ? "bg-blue-50/90 border-blue-200 text-blue-950"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      <span className="font-bold text-xs">
                        {currentReturnStock
                          ? `Roti Beredar di Toko (Bisa Diretur): ${formatNumber(maxReturnable)} pcs`
                          : "Pilih resep untuk cek sisa roti di toko"}
                      </span>
                    </div>
                    {currentReturnStock && (
                      <span className={`px-2 py-0.5 rounded-full font-black text-[10px] uppercase ${
                        maxReturnable > 0 ? "bg-blue-200 text-blue-800" : "bg-slate-200 text-slate-700"
                      }`}>
                        {maxReturnable > 0 ? "Bisa Diretur" : "Tidak Ada Kiriman"}
                      </span>
                    )}
                  </div>
                  {currentReturnStock && (
                    <>
                      <p className="text-[11px] opacity-75 mt-1">
                        Terkirim ke Toko: {formatNumber(currentReturnStock.totalSold)} pcs • Sudah Diretur Sebelumnya: {formatNumber(currentReturnStock.totalRegularReturned)} pcs
                      </p>
                      <p className="text-[11px] text-blue-700 font-medium mt-1">
                        💡 Retur reguler menarik roti dari penjualan konsinyasi toko (2-3 hari lalu), bukan mengambil stok fresh pabrik.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className={`p-3 rounded-2xl border text-xs transition-all ${
                  currentReturnStock
                    ? currentReturnStock.availableStock > 0
                      ? "bg-emerald-50/90 border-emerald-200 text-emerald-950"
                      : "bg-rose-50/90 border-rose-200 text-rose-950"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className={`h-4 w-4 ${currentReturnStock && currentReturnStock.availableStock > 0 ? "text-emerald-600" : "text-rose-500"}`} />
                      <span className="font-bold text-xs">
                        {currentReturnStock
                          ? `Sisa Stok Siap Jual di Pabrik: ${formatNumber(currentReturnStock.availableStock)} pcs`
                          : "Pilih resep untuk cek sisa stok pabrik"}
                      </span>
                    </div>
                    {currentReturnStock && (
                      <span className={`px-2 py-0.5 rounded-full font-black text-[10px] uppercase ${
                        currentReturnStock.availableStock > 0 ? "bg-emerald-200 text-emerald-800" : "bg-rose-200 text-rose-800"
                      }`}>
                        {currentReturnStock.availableStock > 0 ? "Tersedia" : "Stok Kosong"}
                      </span>
                    )}
                  </div>
                  {currentReturnStock && (
                    <p className="text-[11px] opacity-75 mt-1">
                      Produksi: {formatNumber(currentReturnStock.totalProduced)} pcs • Terjual: {formatNumber(currentReturnStock.totalSold)} pcs • Free/Bonus: {formatNumber(currentReturnStock.totalFree + currentReturnStock.totalBonus)} pcs
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Nama Roti (Teks Bebas)</Label>
                <Input
                  placeholder="Contoh: Roti Isang Original"
                  value={returnForm.recipeName}
                  onChange={e => setReturnForm({ ...returnForm, recipeName: e.target.value })}
                  required
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">
                    {returnForm.category === "BONUS"
                      ? "Jumlah Bonus (pcs) *"
                      : returnForm.category === "FREE"
                      ? "Jumlah Free (pcs) *"
                      : "Jumlah Retur (pcs) *"}
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={returnForm.quantity}
                    onChange={e => setReturnForm({ ...returnForm, quantity: e.target.value })}
                    required
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">
                    {returnForm.category === "BONUS"
                      ? "Alasan / Prestasi"
                      : returnForm.category === "FREE"
                      ? "Keperluan Free"
                      : "Alasan Retur"}
                  </Label>
                  <Select value={returnForm.reason} onValueChange={v => setReturnForm({ ...returnForm, reason: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {returnForm.category === "BONUS" ? (
                        BONUS_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)
                      ) : returnForm.category === "FREE" ? (
                        FREE_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)
                      ) : (
                        REGULAR_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* OVERSTOCK WARNING BANNER */}
              {isReturnOverStock && currentReturnStock && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs font-bold animate-pulse">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p>
                      {isFormRegularReturn
                        ? maxReturnable <= 0
                          ? `Belum ada kiriman roti "${currentReturnStock.recipeName}" ke toko yang bisa diretur!`
                          : `Jumlah retur (${returnQtyNum} pcs) melebihi sisa roti yang beredar di toko (${maxReturnable} pcs)!`
                        : currentReturnStock.availableStock <= 0
                          ? `Stok roti "${currentReturnStock.recipeName}" di pabrik habis (${currentReturnStock.availableStock} pcs)!`
                          : `Jumlah (${returnQtyNum} pcs) melebihi stok roti fresh tersedia di pabrik (${currentReturnStock.availableStock} pcs)!`}
                    </p>
                    <p className="font-normal text-[11px] mt-0.5 text-rose-600">
                      {isFormRegularReturn
                        ? "Retur tidak boleh melebihi jumlah roti yang pernah dikirim/dijual ke toko."
                        : `Roti ${returnForm.category === "BONUS" ? "bonus agent" : "free tester"} diambil dari stok fresh pabrik.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Automatic HPP Preview */}
              <div className={`p-3 rounded-xl space-y-1 text-xs border ${
                returnForm.category === "BONUS"
                  ? "bg-purple-50 border-purple-200"
                  : returnForm.category === "FREE"
                  ? "bg-amber-50 border-amber-200"
                  : "bg-rose-50 border-rose-200"
              }`}>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-600">Estimasi HPP / Pcs Roti:</span>
                  <span className={`font-bold ${
                    returnForm.category === "BONUS" ? "text-purple-700" : returnForm.category === "FREE" ? "text-amber-800" : "text-rose-700"
                  }`}>
                    {formatCurrency(estimatedHppPerPcs)} / pcs
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-600">
                    {returnForm.category === "BONUS"
                      ? "Total Biaya HPP Bonus (Otomatis):"
                      : returnForm.category === "FREE"
                      ? "Total Biaya HPP Roti Free (Otomatis):"
                      : "Total Potongan Penjualan (HPP):"}
                  </span>
                  <span className={`font-black text-sm ${
                    returnForm.category === "BONUS" ? "text-purple-800" : returnForm.category === "FREE" ? "text-amber-800" : "text-rose-600"
                  }`}>
                    {formatCurrency(estimatedHppPerPcs * (parseInt(returnForm.quantity, 10) || 1))}
                  </span>
                </div>
                {returnForm.category === "RETUR" && (
                  <p className="text-[11px] text-rose-700/90 pt-1.5 border-t border-rose-200/60 font-medium">
                    💡 Nominal potongan HPP ini otomatis memotong Pos Penjualan agen & mengurangi Penjualan Bersih Bulanan.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Catatan / Keterangan</Label>
                <Textarea
                  placeholder="Contoh: Bonus target penjualan 100 pcs tercapai, tester toko baru, dll..."
                  value={returnForm.notes}
                  onChange={e => setReturnForm({ ...returnForm, notes: e.target.value })}
                  rows={2}
                  className="rounded-xl"
                />
              </div>

              <Button
                type="submit"
                className={`w-full rounded-xl text-white font-bold ${
                  isReturnOverStock
                    ? "bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/25"
                    : returnForm.category === "BONUS"
                    ? "bg-purple-700 hover:bg-purple-800 shadow-md shadow-purple-600/25"
                    : returnForm.category === "FREE"
                    ? "bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/25"
                    : "bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/25"
                }`}
                disabled={savingReturn || isReturnOverStock}
              >
                {savingReturn
                  ? "Menyimpan Data..."
                  : isReturnOverStock
                  ? isFormRegularReturn
                    ? `⚠️ Melebihi Kiriman Toko (Maks ${formatNumber(maxReturnable)} pcs)`
                    : `⚠️ Stok Pabrik Tidak Cukup (Sisa ${currentReturnStock?.availableStock ?? 0} pcs)`
                  : editReturnItem
                  ? "Update Data"
                  : returnForm.category === "BONUS"
                  ? "Simpan Bonus Marketing Agent"
                  : returnForm.category === "FREE"
                  ? "Simpan Roti Free (Tester)"
                  : "Simpan Retur Roti (Auto HPP)"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}
