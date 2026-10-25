"use client"

import { useSession } from "next-auth/react"
import { User, Sparkles } from "lucide-react"

interface HeaderProps {
  title: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-3.5 sm:px-8 py-3 sm:py-5 bg-white/80 backdrop-blur-md border-b border-emerald-500/10 shadow-xs gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="text-base sm:text-2xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-800 bg-clip-text text-transparent truncate">
          {title}
        </h2>
        {description && (
          <p className="text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-1.5 truncate">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500/80 flex-shrink-0"></span>
            <span className="truncate">{description}</span>
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-slate-800 leading-none">
            {session?.user?.name || "Admin Roti Isang"}
          </p>
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-md shadow-xs">
              <Sparkles className="h-2.5 w-2.5" />
              {(session?.user as { role?: string })?.role || "ADMIN"}
            </span>
          </div>
        </div>
        
        <div className="relative p-0.5 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-500 shadow-md shadow-orange-500/20">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-[14px] bg-white flex items-center justify-center">
            <User className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
          </div>
        </div>
      </div>
    </header>
  )
}
