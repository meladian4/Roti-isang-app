"use client"

import React, { useMemo } from "react"
import { Filter } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const INDO_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

export function formatMonthYear(yearMonth: string): string {
  if (!yearMonth || yearMonth === "all") return "Semua Riwayat"
  const [y, m] = yearMonth.split("-")
  const mIndex = parseInt(m, 10) - 1
  return `${INDO_MONTHS[mIndex] || m} ${y}`
}

export function isDateInMonth(dateStr: string | Date | null | undefined, targetMonth: string): boolean {
  if (targetMonth === "all") return true
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return false
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}` === targetMonth
}

interface MonthFilterProps {
  selectedMonth: string
  onChangeMonth: (m: string) => void
  totalCount?: number
  labelSuffix?: string
  className?: string
  existingDates?: string[]
}

export function MonthFilter({
  selectedMonth,
  onChangeMonth,
  totalCount,
  labelSuffix = "Transaksi",
  className = "",
  existingDates = [],
}: MonthFilterProps) {
  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  }, [])

  const lastMonth = useMemo(() => {
    const now = new Date()
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return `${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, "0")}`
  }, [])

  const monthOptions = useMemo(() => {
    const map = new Map<string, string>()
    const now = new Date()

    // Add next month (for forward planning) & current month
    const nm = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const nmKey = `${nm.getFullYear()}-${String(nm.getMonth() + 1).padStart(2, "0")}`
    map.set(nmKey, `${INDO_MONTHS[nm.getMonth()]} ${nm.getFullYear()}`)

    // Add last 12 months
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const label = `${INDO_MONTHS[d.getMonth()]} ${d.getFullYear()}`
      map.set(key, label)
    }

    // Add any months present in existingDates
    existingDates.forEach((d) => {
      if (!d) return
      const dateObj = new Date(d)
      if (isNaN(dateObj.getTime())) return
      const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`
      if (!map.has(key)) {
        map.set(key, `${INDO_MONTHS[dateObj.getMonth()]} ${dateObj.getFullYear()}`)
      }
    })

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0])) // latest month first
      .map(([val, label]) => ({
        val,
        label: val === currentMonth ? `${label} (Bulan Ini)` : label,
        isCurrent: val === currentMonth,
      }))
  }, [currentMonth, existingDates])

  const isCurrentActive = selectedMonth === currentMonth
  const isAllActive = selectedMonth === "all"
  const isArchive = !isCurrentActive && !isAllActive

  return (
    <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/80 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-emerald-500/10 shadow-xs ${className}`}>
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
        <span className="text-[11px] sm:text-xs font-extrabold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
          <Filter className="h-3.5 w-3.5 text-emerald-600" /> Periode:
        </span>

        {/* Tombol Cepat: Bulan Ini */}
        <Button
          type="button"
          variant={isCurrentActive ? "default" : "outline"}
          size="sm"
          onClick={() => onChangeMonth(currentMonth)}
          className={`rounded-xl font-bold text-[11px] sm:text-xs px-2.5 sm:px-3 h-8 ${
            isCurrentActive
              ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20"
              : "border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Bulan Ini
        </Button>

        {/* Tombol Cepat: Bulan Lalu */}
        <Button
          type="button"
          variant={selectedMonth === lastMonth ? "default" : "outline"}
          size="sm"
          onClick={() => onChangeMonth(lastMonth)}
          className={`rounded-xl font-bold text-[11px] sm:text-xs px-2.5 sm:px-3 h-8 ${
            selectedMonth === lastMonth
              ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20"
              : "border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Bulan Lalu
        </Button>

        {/* Dropdown Pilih Bulan Spesifik */}
        <div className="flex items-center gap-1.5">
          <Select value={selectedMonth} onValueChange={onChangeMonth}>
            <SelectTrigger className={`h-8 w-36 sm:w-44 text-xs font-bold rounded-xl bg-white ${
              isArchive
                ? "border-amber-400 text-amber-900 bg-amber-50/50"
                : "border-slate-200 text-slate-700"
            }`}>
              <SelectValue placeholder="Pilih Bulan..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-bold text-emerald-700">
                Semua Riwayat (All Time)
              </SelectItem>
              {monthOptions.map((m) => (
                <SelectItem key={m.val} value={m.val} className="text-xs font-medium">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tombol Semua Riwayat */}
        <Button
          type="button"
          variant={isAllActive ? "default" : "ghost"}
          size="sm"
          onClick={() => onChangeMonth("all")}
          className={`rounded-xl font-bold text-[11px] sm:text-xs px-2 h-8 ${
            isAllActive ? "bg-slate-800 text-white hover:bg-slate-900" : "text-slate-400 hover:text-slate-700"
          }`}
        >
          Semua
        </Button>
      </div>

      {/* Info Tag Status Aktif */}
      <div className="flex items-center gap-2 text-xs font-bold w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
        {isArchive ? (
          <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300 font-bold text-[10px] sm:text-xs px-2.5 py-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Arsip: {formatMonthYear(selectedMonth)} {totalCount !== undefined && `(${totalCount} ${labelSuffix})`}
          </Badge>
        ) : isAllActive ? (
          <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-300 font-bold text-[10px] sm:text-xs px-2.5 py-1">
            Menampilkan Semua Waktu {totalCount !== undefined && `(${totalCount} ${labelSuffix})`}
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-900 border-emerald-300 font-bold text-[10px] sm:text-xs px-2.5 py-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            {formatMonthYear(selectedMonth)} {totalCount !== undefined && `(${totalCount} ${labelSuffix})`}
          </Badge>
        )}
      </div>
    </div>
  )
}
