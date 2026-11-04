"use client"

import { useEffect, useState, useMemo } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MonthFilter, isDateInMonth } from "@/components/ui/month-filter"
import { formatDate, formatNumber } from "@/lib/utils"
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  Package,
  Sparkles,
  Check,
  RotateCcw,
  User,
  Users,
  Wheat,
} from "lucide-react"

interface Order {
  id: string
  date: string
  customerName: string
  details: string
  quantity: number
  status: "MASUK" | "SELESAI"
  notes: string | null
  createdAt: string
  user?: { name: string | null; email: string | null } | null
}

interface MarketingAgent {
  id: string
  name: string
  code: string | null
}

interface Recipe {
  id: string
  name: string
}

export default function PesananPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [agents, setAgents] = useState<MarketingAgent[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  // Filter Bulan
  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr)

  // Search & Filter Status
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "MASUK" | "SELESAI">("ALL")

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [saving, setSaving] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    customerName: "",
    details: "Roti Isang Original",
    quantity: "",
    status: "MASUK" as "MASUK" | "SELESAI",
    notes: "",
  })

  // Fetch Data
  const fetchData = async () => {
    try {
      const [resOrders, resAgents, resRecipes] = await Promise.all([
        fetch("/api/pesanan").then(r => r.json()),
        fetch("/api/marketing-agents").then(r => r.json()),
        fetch("/api/resep").then(r => r.json()),
      ])
      setOrders(Array.isArray(resOrders) ? resOrders : [])
      setAgents(Array.isArray(resAgents) ? resAgents : [])
      setRecipes(Array.isArray(resRecipes) ? resRecipes : [])
    } catch (err) {
      console.error("Gagal memuat data pesanan:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Semua tanggal order untuk MonthFilter
  const allOrderDates = useMemo(() => orders.map(o => o.date), [orders])

  // Filter berdasarkan Bulan
  const monthFilteredOrders = useMemo(() => {
    return orders.filter(o => isDateInMonth(o.date, selectedMonth))
  }, [orders, selectedMonth])

  // Filter Search & Status
  const displayedOrders = useMemo(() => {
    return monthFilteredOrders.filter(o => {
      const matchStatus = statusFilter === "ALL" || o.status === statusFilter
      const query = searchQuery.toLowerCase().trim()
      const matchSearch =
        !query ||
        o.customerName.toLowerCase().includes(query) ||
        o.details.toLowerCase().includes(query) ||
        (o.notes && o.notes.toLowerCase().includes(query))
      return matchStatus && matchSearch
    })
  }, [monthFilteredOrders, statusFilter, searchQuery])

  // Rekapitulasi Akhir Bulan (Dijumlahkan)
  const totalOrders = monthFilteredOrders.length
  const totalPcs = monthFilteredOrders.reduce((sum, o) => sum + (o.quantity || 0), 0)
  const completedOrders = monthFilteredOrders.filter(o => o.status === "SELESAI").length
  const pendingOrders = monthFilteredOrders.filter(o => o.status === "MASUK").length

  // Quick One-Click Ceklis Toggle Status (MASUK <-> SELESAI)
  const toggleOrderStatus = async (order: Order) => {
    const newStatus = order.status === "MASUK" ? "SELESAI" : "MASUK"

    // Optimistic UI update
    setOrders(prev =>
      prev.map(o => (o.id === order.id ? { ...o, status: newStatus } : o))
    )

    try {
      const res = await fetch(`/api/pesanan/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        // Rollback if failed
        fetchData()
      }
    } catch {
      fetchData()
    }
  }

  // Open Modal Add
  const openAddModal = () => {
    setEditingOrder(null)
    setFormData({
      date: new Date().toISOString().split("T")[0],
      customerName: "",
      details: "Roti Isang Original",
      quantity: "",
      status: "MASUK",
      notes: "",
    })
    setIsModalOpen(true)
  }

  // Open Modal Edit
  const openEditModal = (order: Order) => {
    setEditingOrder(order)
    setFormData({
      date: order.date ? new Date(order.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      customerName: order.customerName,
      details: order.details,
      quantity: order.quantity ? order.quantity.toString() : "",
      status: order.status,
      notes: order.notes || "",
    })
    setIsModalOpen(true)
  }

  // Handle Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.customerName.trim() || !formData.details.trim()) {
      alert("Nama pemesan dan detail roti wajib diisi!")
      return
    }

    setSaving(true)
    try {
      const payload = {
        date: formData.date,
        customerName: formData.customerName.trim(),
        details: formData.details.trim(),
        quantity: parseInt(formData.quantity, 10) || 0,
        status: formData.status,
        notes: formData.notes.trim() || null,
      }

      const url = editingOrder ? `/api/pesanan/${editingOrder.id}` : "/api/pesanan"
      const method = editingOrder ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setIsModalOpen(false)
        fetchData()
      } else {
        const errData = await res.json()
        alert(errData.error || "Gagal menyimpan pesanan")
      }
    } catch {
      alert("Terjadi kesalahan saat menyimpan pesanan")
    } finally {
      setSaving(false)
    }
  }

  // Handle Delete
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus pesanan dari "${name}"?`)) return

    try {
      const res = await fetch(`/api/pesanan/${id}`, { method: "DELETE" })
      if (res.ok) {
        setOrders(prev => prev.filter(o => o.id !== id))
        if (isModalOpen) setIsModalOpen(false)
      } else {
        alert("Gagal menghapus pesanan")
      }
    } catch {
      alert("Terjadi kesalahan saat menghapus pesanan")
    }
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Buku Catatan Pesanan"
        description="Pencatatan orderan masuk, pre-order toko, dan pesanan catering (murni pencatatan tanpa memotong stok pabrik)"
      />

      <div className="p-4 sm:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto">
        {/* Month Filter Selector */}
        <MonthFilter
          selectedMonth={selectedMonth}
          onChangeMonth={setSelectedMonth}
          existingDates={allOrderDates}
          totalCount={totalOrders}
          labelSuffix="Pesanan"
        />

        {/* 4 Summary Cards (Rekap Dijumlahkan per Bulan) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">
          {/* Card 1: Total Pesanan Masuk */}
          <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 relative overflow-hidden group">
            <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
              <div className="p-2 sm:p-3 md:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 flex-shrink-0">
                <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-bold tracking-wider text-slate-400 uppercase truncate">Total Pesanan</p>
                <p className="text-base sm:text-xl font-black text-slate-800 tracking-tight mt-0.5 truncate">
                  {formatNumber(totalOrders)} <span className="text-xs font-bold text-slate-500">Order</span>
                </p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium truncate">Periode {selectedMonth === "all" ? "Semua" : selectedMonth}</p>
              </div>
            </div>
          </div>

          {/* Card 2: Total Roti Dipesan (pcs) */}
          <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 relative overflow-hidden group">
            <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
              <div className="p-2 sm:p-3 md:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 flex-shrink-0">
                <Package className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-bold tracking-wider text-slate-400 uppercase truncate">Total Roti Dipesan</p>
                <p className="text-base sm:text-xl font-black text-emerald-600 tracking-tight mt-0.5 truncate">
                  {formatNumber(totalPcs)} <span className="text-xs font-bold text-emerald-700">pcs</span>
                </p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium truncate">Jumlah seluruh pesanan</p>
              </div>
            </div>
          </div>

          {/* Card 3: Pesanan Selesai (🟢) */}
          <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 relative overflow-hidden group">
            <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
              <div className="p-2 sm:p-3 md:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 text-white shadow-lg shadow-green-600/25 flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-bold tracking-wider text-slate-400 uppercase truncate">Selesai (🟢)</p>
                <p className="text-base sm:text-xl font-black text-emerald-700 tracking-tight mt-0.5 truncate">
                  {formatNumber(completedOrders)} <span className="text-xs font-bold text-slate-500">Order</span>
                </p>
                <p className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold truncate">
                  {totalOrders > 0 ? `${Math.round((completedOrders / totalOrders) * 100)}% selesai` : "Belum ada"}
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Menunggu Diproses (🟡) */}
          <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 relative overflow-hidden group">
            <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
              <div className="p-2 sm:p-3 md:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 flex-shrink-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-bold tracking-wider text-slate-400 uppercase truncate">Masuk / Menunggu (🟡)</p>
                <p className="text-base sm:text-xl font-black text-amber-700 tracking-tight mt-0.5 truncate">
                  {formatNumber(pendingOrders)} <span className="text-xs font-bold text-slate-500">Order</span>
                </p>
                <p className="text-[9px] sm:text-[10px] text-amber-600 font-semibold truncate">Perlu disiapkan</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar: Search, Status Tabs, Add Button */}
        <div className="bg-white/80 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Segmented Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua ({monthFilteredOrders.length})
            </button>
            <button
              onClick={() => setStatusFilter("MASUK")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                statusFilter === "MASUK"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              🟡 Masuk ({pendingOrders})
            </button>
            <button
              onClick={() => setStatusFilter("SELESAI")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                statusFilter === "SELESAI"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              🟢 Selesai ({completedOrders})
            </button>
          </div>

          {/* Search Bar & Add Button */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari pemesan / roti..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 rounded-xl text-xs bg-white border-slate-200"
              />
            </div>
            <Button
              onClick={openAddModal}
              className="h-9 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex-shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" /> Catat Pesanan
            </Button>
          </div>
        </div>

        {/* Table & Cards List */}
        <Card className="overflow-hidden border-slate-200/90 shadow-sm">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-3.5 px-4 sm:px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-slate-800">
              <ClipboardList className="h-4 w-4 text-emerald-600" />
              Daftar Pesanan Masuk ({displayedOrders.length})
            </CardTitle>
            <span className="text-[11px] text-slate-500 font-medium">
              💡 Klik tombol centang untuk mengubah status Selesai
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-16 text-slate-400 text-xs">Memuat data pesanan...</div>
            ) : displayedOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <ClipboardList className="h-10 w-10 mx-auto text-slate-300" />
                <p className="font-bold text-slate-600 text-sm">Belum ada pesanan pada periode ini</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Klik tombol <strong>&quot;+ Catat Pesanan&quot;</strong> untuk menulis pesanan baru yang masuk lewat WhatsApp atau telepon.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop View Table (hidden on small mobile) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                        <th className="text-center py-3 px-3 w-12">Ceklis</th>
                        <th className="text-left py-3 px-4">Tanggal</th>
                        <th className="text-left py-3 px-4">Nama Pemesan</th>
                        <th className="text-left py-3 px-4">Detail Roti</th>
                        <th className="text-right py-3 px-4">Jumlah</th>
                        <th className="text-center py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Keterangan</th>
                        <th className="text-center py-3 px-4 w-24">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedOrders.map(o => {
                        const isDone = o.status === "SELESAI"
                        return (
                          <tr
                            key={o.id}
                            className={`transition-colors ${
                              isDone ? "bg-emerald-50/20 hover:bg-emerald-50/40" : "hover:bg-slate-50"
                            }`}
                          >
                            {/* Checkbox Quick Toggle Button */}
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => toggleOrderStatus(o)}
                                title={isDone ? "Klik untuk tandai Masuk" : "Klik untuk tandai Selesai"}
                                className={`h-6 w-6 rounded-lg flex items-center justify-center transition-all mx-auto ${
                                  isDone
                                    ? "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                                    : "border-2 border-slate-300 hover:border-amber-500 text-transparent hover:text-amber-500"
                                }`}
                              >
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                              </button>
                            </td>

                            {/* Tanggal Order */}
                            <td className="py-3 px-4 text-slate-500 font-medium whitespace-nowrap">
                              {formatDate(o.date)}
                            </td>

                            {/* Nama Pemesan */}
                            <td className="py-3 px-4">
                              <span className="font-extrabold text-slate-800 text-xs block">
                                {o.customerName}
                              </span>
                            </td>

                            {/* Detail Roti */}
                            <td className="py-3 px-4">
                              <p className="text-slate-700 font-medium leading-relaxed max-w-xs break-words">
                                {o.details}
                              </p>
                            </td>

                            {/* Jumlah (pcs) */}
                            <td className="py-3 px-4 text-right">
                              <span className="font-black text-slate-800 text-xs">
                                {o.quantity > 0 ? `${formatNumber(o.quantity)} pcs` : "-"}
                              </span>
                            </td>

                            {/* Status Pill Warna */}
                            <td className="py-3 px-4 text-center">
                              {isDone ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2 py-0.5">
                                  🟢 Selesai
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-0.5">
                                  🟡 Masuk
                                </Badge>
                              )}
                            </td>

                            {/* Keterangan */}
                            <td className="py-3 px-4 text-slate-500 max-w-xs break-words">
                              {o.notes ? (
                                <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                  {o.notes}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>

                            {/* Tombol Aksi */}
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditModal(o)}
                                  className="h-7 w-7 p-0 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border-slate-200"
                                  title="Edit pesanan"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(o.id, o.customerName)}
                                  className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-slate-200"
                                  title="Hapus pesanan"
                                >
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

                {/* Mobile View Cards (Optimized for Phone Screens) */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {displayedOrders.map(o => {
                    const isDone = o.status === "SELESAI"
                    return (
                      <div
                        key={o.id}
                        className={`p-3.5 space-y-2.5 transition-colors ${
                          isDone ? "bg-emerald-50/20" : "bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            {/* Mobile Quick Ceklis Toggle */}
                            <button
                              type="button"
                              onClick={() => toggleOrderStatus(o)}
                              className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                                isDone
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "border-2 border-slate-300 text-transparent"
                              }`}
                            >
                              <Check className="h-4 w-4 stroke-[3]" />
                            </button>
                            <div>
                              <h4 className="font-extrabold text-slate-800 text-sm">{o.customerName}</h4>
                              <p className="text-[11px] text-slate-400 font-medium">{formatDate(o.date)}</p>
                            </div>
                          </div>

                          {/* Status Pill */}
                          {isDone ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black">
                              🟢 Selesai
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black">
                              🟡 Masuk
                            </Badge>
                          )}
                        </div>

                        {/* Order Detail & Pcs */}
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                          <p className="text-slate-700 font-medium leading-relaxed">{o.details}</p>
                          {o.quantity > 0 && (
                            <div className="pt-1 border-t border-slate-200/60 flex justify-between items-center text-[11px]">
                              <span className="text-slate-500 font-semibold">Total Roti:</span>
                              <span className="font-black text-emerald-700">{formatNumber(o.quantity)} pcs</span>
                            </div>
                          )}
                        </div>

                        {/* Keterangan & Aksi */}
                        <div className="flex items-center justify-between pt-1 text-xs">
                          <div className="text-slate-500 text-[11px] truncate max-w-[180px]">
                            {o.notes ? `📝 ${o.notes}` : <span className="text-slate-300">Tanpa keterangan</span>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(o)}
                              className="h-7 px-2.5 rounded-lg text-xs font-bold text-slate-700 border-slate-200"
                            >
                              <Pencil className="h-3 w-3 mr-1" /> Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(o.id, o.customerName)}
                              className="h-7 px-2 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 border-rose-200"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Modal Dialog Form (Tambah & Edit Pesanan) */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-md rounded-3xl glass-panel">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                <ClipboardList className="h-5 w-5 text-emerald-600" />
                {editingOrder ? "Edit Data Pesanan" : "Catat Pesanan Masuk Baru"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              {/* Tanggal Order */}
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700 text-xs">Tanggal Order *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="rounded-xl"
                />
              </div>

              {/* Nama Pemesan */}
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700 text-xs">Nama Pemesan *</Label>
                <Input
                  placeholder="Contoh: Bu Siti (Hajatan), Toko Surya, Pak Budi"
                  value={formData.customerName}
                  onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                  required
                  className="rounded-xl"
                />
              </div>

              {/* Detail Roti & Jumlah (pcs) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="font-bold text-slate-700 text-xs">Detail Roti Pesanan *</Label>
                  <span className="text-[10px] text-slate-400">Pilihan cepat:</span>
                </div>
                <Textarea
                  placeholder="Contoh: Roti Isang Original (100 pcs)..."
                  value={formData.details}
                  onChange={e => setFormData({ ...formData, details: e.target.value })}
                  rows={2}
                  required
                  className="rounded-xl text-xs"
                />

                {/* Quick Recipe Chip: Langsung ke + Roti Isang Original */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        details: "Roti Isang Original",
                      }))
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors shadow-2xs active:scale-95"
                  >
                    <Wheat className="h-3.5 w-3.5 text-emerald-600" />
                    + Roti Isang Original
                  </button>
                  <span className="text-[10px] text-slate-400">
                    (Klik untuk isi otomatis)
                  </span>
                </div>
              </div>

              {/* Total Jumlah (pcs) */}
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700 text-xs">Total Roti (pcs)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Total jumlah roti (misal: 100)"
                  value={formData.quantity}
                  onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                  className="rounded-xl font-bold"
                />
                <p className="text-[10px] text-slate-400">
                  Total pcs ini akan otomatis dijumlahkan pada kartu rekap akhir bulan.
                </p>
              </div>

              {/* Status Pesanan (Pill Warna: 🟡 Masuk | 🟢 Selesai) */}
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700 text-xs">Status Pesanan</Label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: "MASUK" })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      formData.status === "MASUK"
                        ? "bg-amber-500 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    🟡 Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: "SELESAI" })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      formData.status === "SELESAI"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    🟢 Selesai
                  </button>
                </div>
              </div>

              {/* Keterangan (Kosong - nanti mau diisi agent atau manual) */}
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700 text-xs">
                  Keterangan (Manual / Nama Agent)
                </Label>
                <Input
                  placeholder="Contoh: Agent Azka, minta diambil jam 8 pagi, DP sudah masuk, dll..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="rounded-xl text-xs"
                />

                {/* Quick Agent Chips (opsional untuk bantu isi nama agent) */}
                {agents.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[10px] text-slate-400 font-medium mr-1">Agent:</span>
                    {agents.map(ag => (
                      <button
                        key={ag.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, notes: `Agent ${ag.name}` })}
                        className="px-2 py-0.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-[10px] font-bold border border-purple-200 transition-colors"
                      >
                        {ag.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tombol Simpan */}
              <div className="pt-2 space-y-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25"
                >
                  {saving
                    ? "Menyimpan Data..."
                    : editingOrder
                    ? "Update Data Pesanan"
                    : "Simpan Pesanan Masuk"}
                </Button>

                {editingOrder && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleDelete(editingOrder.id, editingOrder.customerName)}
                    className="w-full text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus Pesanan Ini
                  </Button>
                )}
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
