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
  MoreVertical,
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

  return (
    <aside
      className={cn(
        "flex flex-col min-h-screen glass-sidebar text-white relative z-20 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header & 3-Dots Collapse Toggle */}
      <div className={cn("flex items-center justify-between py-6 border-b border-white/15 transition-all duration-300", isCollapsed ? "px-3" : "px-6")}>
        <div className="flex items-center gap-3.5 overflow-hidden">
          <div className="relative p-2.5 bg-gradient-to-br from-amber-300 via-emerald-400 to-teal-500 rounded-xl shadow-lg shadow-emerald-950/40 animate-float flex-shrink-0">
            <Wheat className="h-6 w-6 text-emerald-950" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-200"></span>
            </span>
          </div>
          {!isCollapsed && (
            <div className="transition-opacity duration-300">
              <h1 className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-emerald-100 via-teal-100 to-white bg-clip-text text-transparent whitespace-nowrap">
                Roti Isang
              </h1>
              <p className="text-emerald-200/80 text-xs font-medium tracking-wide whitespace-nowrap">Production & Finance</p>
            </div>
          )}
        </div>

        {/* 3-Dots Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Tampilkan Menu Sidebar" : "Sembunyikan Menu Sidebar"}
          className="p-2 rounded-xl text-emerald-100 hover:text-white hover:bg-white/15 transition-all duration-200 focus:outline-none flex-shrink-0"
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        {!isCollapsed && (
          <div className="px-3 pb-2 transition-opacity duration-300">
            <p className="text-[10px] font-bold tracking-widest text-emerald-200/60 uppercase">Menu Utama</p>
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
                "relative group flex items-center justify-between py-3 rounded-xl text-sm font-medium transition-all duration-300",
                isCollapsed ? "px-3 justify-center" : "px-3.5",
                isActive
                  ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-emerald-950 font-extrabold shadow-lg shadow-emerald-950/30 border border-emerald-300/40 backdrop-blur-md"
                  : "text-emerald-100/90 hover:bg-white/10 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={cn(
                    "p-2 rounded-lg transition-transform duration-300 group-hover:scale-110 flex-shrink-0",
                    isActive
                      ? "bg-emerald-950/20 text-emerald-950 shadow-xs"
                      : "bg-white/10 text-emerald-200 group-hover:bg-white/20 group-hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {!isCollapsed && <span className="whitespace-nowrap transition-opacity duration-300">{item.label}</span>}
              </div>

              {!isCollapsed && (
                <>
                  {item.badge ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-400 text-amber-950 rounded-full shadow-xs">
                      <Sparkles className="h-2.5 w-2.5" />
                      {item.badge}
                    </span>
                  ) : isActive ? (
                    <div className="h-2 w-2 rounded-full bg-emerald-900 shadow-sm shadow-emerald-900/80 animate-pulse" />
                  ) : null}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Logout & Credit Footer */}
      <div className={cn("p-4 border-t border-white/15 space-y-2 transition-all duration-300", isCollapsed ? "px-2" : "px-4")}>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={isCollapsed ? "Keluar Akun" : undefined}
          className={cn(
            "flex items-center gap-3 py-2.5 w-full rounded-xl text-sm font-medium text-emerald-100/80 hover:bg-rose-500/20 hover:text-rose-200 hover:border-rose-500/30 border border-transparent transition-all duration-300 group",
            isCollapsed ? "justify-center px-2" : "px-3.5"
          )}
        >
          <div className="p-2 rounded-lg bg-white/10 group-hover:bg-rose-500/30 transition-colors flex-shrink-0">
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
  )
}
