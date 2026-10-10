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
import { Plus, Pencil, Trash2, Wallet, CreditCard, Flame, CheckCircle, Package } from "lucide-react"

interface OperationalExpense {
  id: string
  name: string
  category: string
  quantity: number
  unit: string | null
  amount: number
  notes: string | null
  date: string
  user: { name: string | null } | null
}

const CATEGORIES = [
  "Kemasan & Plastik",
  "Bahan Bakar & Energi (Gas/Listrik)",
  "Bahan Penolong & Perlengkapan",
  "Operasional Toko & Kebersihan",
  "Gaji & Transportasi",
  "Lainnya",
]

const UNITS = ["pcs", "pack", "roll", "kg", "liter", "tabung", "bulan", "hari", "kali", "unit"]

export default function OperasionalPage() {
  const { data: session } = useSession()
  const [expenses, setExpenses] = useState<OperationalExpense[]>([])
  const [loading, setLoading] = useState(true)

  // Modal State
  const [openModal, setOpenModal] = useState(false)
  const [editItem, setEditItem] = useState<OperationalExpense | null>(null)
  const [form, setForm] = useState({
    name: "",
    category: "Kemasan & Plastik",
    quantity: "1",
    unit: "pcs",
    amount: "",
    notes: "",
    date: "",
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  const fetchExpenses = () => {
    fetch("/api/operasional")
      .then((r) => r.json())
      .then((d) => {
        setExpenses(d)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchExpenses()
  }, [])

  const openAdd = () => {
    setEditItem(null)
    setForm({
      name: "",
      category: "Kemasan & Plastik",
      quantity: "1",
      unit: "pcs",
      amount: "",
      notes: "",
      date: "",
    })
    setOpenModal(true)
  }

  const openEdit = (item: OperationalExpense) => {
    setEditItem(item)
    setForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity.toString(),
      unit: item.unit || "pcs",
      amount: item.amount.toString(),
      notes: item.notes || "",
      date: item.date ? new Date(item.date).toISOString().split("T")[0] : "",
    })
    setOpenModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    let res: Response
    if (editItem) {
      res = await fetch(`/api/operasional/${editItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
    } else {
      res = await fetch("/api/operasional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          userId: (session?.user as { id?: string })?.id,
        }),
      })
    }

    const data = await res.json()
    if (!res.ok) {
      alert(data.error || "Gagal menyimpan beban operasional")
      setSaving(false)
      return
    }

    setMsg(editItem ? "Beban operasional berhasil diupdate!" : `Catatan pengeluaran operasional berhasil disimpan: ${formatCurrency(data.amount)}`)
    setOpenModal(false)
    setEditItem(null)
    setForm({ name: "", category: "Kemasan & Plastik", quantity: "1", unit: "pcs", amount: "", notes: "", date: "" })
    setSaving(false)
    fetchExpenses()
    setTimeout(() => setMsg(""), 5000)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus catatan pengeluaran operasional ini?")) return
    const res = await fetch(`/api/operasional/${id}`, { method: "DELETE" })
    if (!res.ok) {
      alert("Gagal menghapus pengeluaran operasional")
      return
    }
    setMsg("Pengeluaran operasional berhasil dihapus!")
    fetchExpenses()
    setTimeout(() => setMsg(""), 5000)
  }

  // Calculations
  const totalBebanOperasional = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalKemasan = expenses.filter(e => e.category.includes("Kemasan")).reduce((sum, e) => sum + e.amount, 0)
  const totalEnergi = expenses.filter(e => e.category.includes("Bahan Bakar") || e.category.includes("Gas")).reduce((sum, e) => sum + e.amount, 0)
  const totalToko = expenses.filter(e => e.category.includes("Toko") || e.category.includes("Gaji") || e.category.includes("Operasional")).reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="min-h-screen">
      <Header title="Beban Operasional Toko & Pabrik" description="Pencatatan manual pembelanjaan operasional (plastik, gas, minyak, dll) & total akumulasi beban" />
      <div className="p-8 max-w-7xl mx-auto space-y-6">

        {msg && (
          <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center gap-3 animate-float">
            <CheckCircle className="h-6 w-6 flex-shrink-0" />
            <p className="text-sm font-bold">{msg}</p>
          </div>
        )}

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="glass-card rounded-2xl p-5 relative overflow-hidden group">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/25">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Total Beban Operasional</p>
                <p className="text-xl font-black text-amber-600 tracking-tight mt-0.5">{formatCurrency(totalBebanOperasional)}</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 relative overflow-hidden group">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/25">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Kemasan & Plastik</p>
                <p className="text-xl font-black text-slate-800 tracking-tight mt-0.5">{formatCurrency(totalKemasan)}</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 relative overflow-hidden group">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/25">
                <Flame className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Gas & Bahan Bakar</p>
                <p className="text-xl font-black text-rose-600 tracking-tight mt-0.5">{formatCurrency(totalEnergi)}</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 relative overflow-hidden group">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/25">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Operasional & Gaji</p>
                <p className="text-xl font-black text-slate-800 tracking-tight mt-0.5">{formatCurrency(totalToko)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Daftar Pengeluaran Operasional</h3>
            <p className="text-xs text-slate-400">{expenses.length} catatan pembelanjaan terdaftar</p>
          </div>

          <Dialog open={openModal} onOpenChange={(o) => { setOpenModal(o); if (!o) setEditItem(null); }}>
            <DialogTrigger asChild>
              <Button onClick={openAdd} className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/25">
                <Plus className="h-4 w-4" /> Catat Beban Operasional Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-3xl glass-panel">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl font-bold text-amber-900">
                  <Wallet className="h-5 w-5 text-amber-600" />
                  {editItem ? "Edit Catatan Beban Operasional" : "Input Pembelanjaan / Beban Operasional Baru"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Nama Barang / Pengeluaran</Label>
                  <Input
                    placeholder="Contoh: Plastik Roti 15x20, Gas LPG 12kg, Listrik Toko..."
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Kategori Pengeluaran</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Jumlah (Qty)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={form.quantity}
                      onChange={e => setForm({ ...form, quantity: e.target.value })}
                      required
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Satuan</Label>
                    <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v })}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Total Biaya Pengeluaran (Rp)</Label>
                  <Input
                    type="number"
                    step="100"
                    placeholder="Contoh: 150000"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    required
                    className="rounded-xl font-bold border-amber-300 text-amber-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Tanggal Pengeluaran</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Catatan / Detail Pembelian</Label>
                  <Textarea
                    placeholder="Contoh: Beli di Toko Plastik Jaya, Bon #102..."
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    className="rounded-xl"
                  />
                </div>

                <Button type="submit" className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold" disabled={saving}>
                  {saving ? "Menyimpan Pengeluaran..." : editItem ? "Update Beban Operasional" : "Simpan Beban Operasional"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Expenses List Table Card */}
        <Card className="overflow-hidden border-amber-500/10">
          <CardHeader className="bg-gradient-to-r from-amber-50/90 to-orange-50/60 border-b border-amber-100 py-5">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <Wallet className="h-5 w-5 text-amber-600" /> Riwayat Pembelanjaan & Beban Operasional
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12 text-slate-400">Memuat data pengeluaran operasional...</div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12 text-slate-400">Belum ada catatan pengeluaran operasional terdaftar</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="text-left py-3.5 px-6">Tanggal</th>
                      <th className="text-left py-3.5 px-6">Nama Pengeluaran / Barang</th>
                      <th className="text-left py-3.5 px-6">Kategori</th>
                      <th className="text-right py-3.5 px-6">Jumlah (Qty)</th>
                      <th className="text-right py-3.5 px-6">Total Biaya</th>
                      <th className="text-left py-3.5 px-6">Catatan</th>
                      <th className="text-center py-3.5 px-6">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenses.map(e => (
                      <tr key={e.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-4 px-6 text-slate-500 font-medium">{formatDate(e.date)}</td>
                        <td className="py-4 px-6 font-bold text-slate-800">{e.name}</td>
                        <td className="py-4 px-6">
                          <Badge variant="secondary" className="bg-amber-100 text-amber-950 font-bold text-[10px]">
                            {e.category}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-slate-700">
                          {formatNumber(e.quantity)} {e.unit || "pcs"}
                        </td>
                        <td className="py-4 px-6 text-right font-extrabold text-amber-700">{formatCurrency(e.amount)}</td>
                        <td className="py-4 px-6 text-xs text-slate-400">{e.notes || "-"}</td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex justify-center gap-1">
                            <Button variant="outline" size="sm" onClick={() => openEdit(e)} className="rounded-xl h-8 w-8 p-0">
                              <Pencil className="h-3.5 w-3.5 text-slate-600" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(e.id)} className="rounded-xl h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 border-rose-200">
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
