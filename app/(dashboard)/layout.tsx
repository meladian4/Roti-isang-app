import { Sidebar } from "@/components/layout/sidebar"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const role = (session.user as any)?.role || "ADMIN"

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-900/5 antialiased">
      <Sidebar userRole={role} />
      <main className="flex-1 min-w-0 w-full overflow-x-hidden overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

