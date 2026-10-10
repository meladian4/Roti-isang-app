"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  BookOpen,
  Package,
  Factory,
  ShoppingBag,
  BarChart3,
  Wallet,
  LogOut,
  Wheat,
  Sparkles,
  Menu,
  X,
} from "lucide-react"
import { signOut } from "next-auth/react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, badge: null },
  { href: "/bahan-baku", label: "Bahan Baku", icon: Package, badge: null },
  { href: "/resep", label: "Resep", icon: BookOpen, badge: null },
  { href: "/produksi", label: "Produksi", icon: Factory, badge: null },
  { href: "/penjualan", label: "Penjualan & Retur", icon: ShoppingBag, badge: null },
  { href: "/operasional", label: "Beban Operasional", icon: Wallet, badge: "BARU" },
  { href: "/laporan", label: "Laporan & Buku Besar", icon: BarChart3, badge: null },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* ========================================== */}
      {/* MOBILE TOP NAVIGATION BAR (ONLY ON MOBILE < md) */}
      {/* ========================================== */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 glass-sidebar text-white shadow-md border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            title="Menu utama"
            className="p-2 rounded-xl text-emerald-100 hover:text-white bg-white/10 hover:bg-white/20 transition-all active:scale-95"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-amber-300 to-teal-500 rounded-lg shadow-xs">
              <Wheat className="h-4 w-4 text-emerald-950" />
            </div>
            <span className="font-black text-base tracking-tight bg-gradient-to-r from-emerald-100 to-white bg-clip-text text-transparent">
              Roti Isang
            </span>
          </div>
        </div>
        <span className="text-[10px] font-extrabold px-2.5 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full">
          MOBILE
        </span>
      </div>

      {/* MOBILE SLIDE-OVER DRAWER OVERLAY */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-emerald-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer Sidebar Content */}
          <aside className="relative flex flex-col w-72 max-w-[85vw] h-full glass-sidebar text-white shadow-2xl z-10 animate-in slide-in-from-left duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/15">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-amber-300 via-emerald-400 to-teal-500 rounded-xl shadow-md">
                  <Wheat className="h-5 w-5 text-emerald-950" />
                </div>
                <div>
                  <h1 className="font-extrabold text-base tracking-tight text-emerald-100">Roti Isang</h1>
                  <p className="text-emerald-200/80 text-[10px] font-medium">Production & Finance</p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-full text-emerald-200 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
              <div className="px-3 py-1">
                <p className="text-[10px] font-extrabold tracking-widest text-emerald-200/60 uppercase">Menu Utama</p>
              </div>
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 rounded-full text-sm font-bold transition-all duration-200",
                      isActive
                        ? "bg-emerald-300/25 text-white border border-emerald-300/30 backdrop-blur-md shadow-md"
                        : "text-emerald-100/90 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={cn(
                          "p-2 rounded-xl transition-all",
                          isActive
                            ? "bg-emerald-400 text-emerald-950 shadow-xs"
                            : "bg-white/10 text-emerald-200"
                        )}
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <span className="text-sm">{item.label}</span>
                    </div>
                    {item.badge ? (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-400 text-amber-950 rounded-full">
                        {item.badge}
                      </span>
                    ) : isActive ? (
                      <div className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                    ) : null}
                  </Link>
                )
              })}
            </nav>

            {/* Footer Logout */}
            <div className="p-4 border-t border-white/15 space-y-2">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-3 px-4 py-2.5 w-full rounded-2xl text-sm font-bold text-emerald-100 hover:bg-rose-500/20 hover:text-rose-200 border border-transparent transition-all"
              >
                <div className="p-2 rounded-xl bg-white/10">
                  <LogOut className="h-4 w-4 text-emerald-200" />
                </div>
                <span>Keluar Akun</span>
              </button>
              <div className="text-center pt-1">
                <p className="text-[10px] font-semibold text-emerald-200/50">credit: Zohandian</p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ========================================== */}
      {/* DESKTOP SIDEBAR (UNCHANGED FOR SCREEN >= md) */}
      {/* ========================================== */}
      <aside
        className={cn(
          "hidden md:flex flex-col min-h-screen glass-sidebar text-white relative z-20 transition-all duration-300 ease-in-out flex-shrink-0",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Gmail-Style Header: Hamburger Menu Icon (≡) + Brand Logo */}
        <div
          className={cn(
            "flex items-center py-5 border-b border-white/15 transition-all duration-300",
            isCollapsed ? "px-3.5 justify-center" : "px-5 gap-3"
          )}
        >
          {/* Hamburger Menu Toggle Button (Menu Utama) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title="Menu utama"
            className="p-2.5 rounded-full text-emerald-100 hover:text-white hover:bg-white/15 transition-all duration-200 focus:outline-none flex-shrink-0 active:scale-95"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Brand Logo & Name */}
          {!isCollapsed && (
            <div className="flex items-center gap-3 overflow-hidden transition-all duration-300">
              <div className="relative p-2 bg-gradient-to-br from-amber-300 via-emerald-400 to-teal-500 rounded-xl shadow-md shadow-emerald-950/40 animate-float flex-shrink-0">
                <Wheat className="h-5 w-5 text-emerald-950" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-200"></span>
                </span>
              </div>
              <div className="whitespace-nowrap">
                <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-100 via-teal-100 to-white bg-clip-text text-transparent">
                  Roti Isang
                </h1>
                <p className="text-emerald-200/80 text-[11px] font-medium tracking-wide">Production & Finance</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Items - Gmail Material You Pill Design */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {!isCollapsed && (
            <div className="px-4 py-1.5 transition-opacity duration-300">
              <p className="text-[10px] font-extrabold tracking-widest text-emerald-200/60 uppercase">Menu Utama</p>
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "relative group flex items-center justify-between py-3 text-sm font-bold transition-all duration-300",
                  isCollapsed ? "px-3 rounded-full justify-center" : "px-4 rounded-full",
                  isActive
                    ? "bg-emerald-300/25 text-white border border-emerald-300/30 backdrop-blur-md shadow-md shadow-emerald-950/20"
                    : "text-emerald-100/90 hover:bg-white/10 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={cn(
                      "p-2 rounded-xl transition-all duration-300 group-hover:scale-110 flex-shrink-0",
                      isActive
                        ? "bg-emerald-400 text-emerald-950 shadow-xs"
                        : "bg-white/10 text-emerald-200 group-hover:bg-white/20 group-hover:text-white"
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  {!isCollapsed && (
                    <span className="whitespace-nowrap transition-opacity duration-300 text-sm">{item.label}</span>
                  )}
                </div>

                {!isCollapsed && (
                  <>
                    {item.badge ? (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold bg-amber-400 text-amber-950 rounded-full shadow-xs">
                        <Sparkles className="h-2.5 w-2.5" />
                        {item.badge}
                      </span>
                    ) : isActive ? (
                      <div className="h-2 w-2 rounded-full bg-emerald-300 shadow-sm shadow-emerald-300 animate-pulse" />
                    ) : null}
                  </>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Logout & Credit Footer */}
        <div
          className={cn(
            "p-4 border-t border-white/15 space-y-2 transition-all duration-300",
            isCollapsed ? "px-2" : "px-4"
          )}
        >
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title={isCollapsed ? "Keluar Akun" : undefined}
            className={cn(
              "flex items-center gap-3 py-2.5 w-full rounded-2xl text-sm font-bold text-emerald-100/80 hover:bg-rose-500/20 hover:text-rose-200 hover:border-rose-500/30 border border-transparent transition-all duration-300 group",
              isCollapsed ? "justify-center px-2" : "px-4"
            )}
          >
            <div className="p-2 rounded-xl bg-white/10 group-hover:bg-rose-500/30 transition-colors flex-shrink-0">
              <LogOut className="h-4 w-4 text-emerald-200 group-hover:text-rose-200" />
            </div>
            {!isCollapsed && <span className="whitespace-nowrap">Keluar Akun</span>}
          </button>

          {!isCollapsed && (
            <div className="text-center pt-1 transition-opacity duration-300">
              <p className="text-[10px] font-semibold text-emerald-200/50 tracking-wider">credit: Zohandian</p>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
