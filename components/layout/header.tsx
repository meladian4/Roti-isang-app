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
    <header className="sticky top-0 z-10 flex items-center justify-between px-8 py-5 bg-white/75 backdrop-blur-md border-b border-orange-500/10 shadow-sm shadow-orange-950/5">
      <div>
        <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-orange-950 to-slate-800 bg-clip-text text-transparent">
          {title}
        </h2>
        {description && (
          <p className="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500/80"></span>
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
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
          <div className="h-10 w-10 rounded-[14px] bg-white flex items-center justify-center">
            <User className="h-5 w-5 text-orange-600" />
          </div>
        </div>
      </div>
    </header>
  )
}
