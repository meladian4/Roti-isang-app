import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold transition-all duration-300 shadow-xs",
  {
    variants: {
      variant: {
        default: "border-orange-500/20 bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/20",
        secondary: "border-slate-200/80 bg-slate-100/80 backdrop-blur-xs text-slate-700",
        destructive: "border-rose-500/20 bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-rose-500/20",
        outline: "border-orange-500/30 text-orange-700 bg-orange-50/50",
        success: "border-emerald-500/20 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/20",
        warning: "border-amber-500/20 bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-amber-500/20",
        danger: "border-rose-500/30 bg-rose-50 text-rose-700 font-extrabold animate-pulse",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
