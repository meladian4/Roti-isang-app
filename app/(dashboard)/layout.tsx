import { Sidebar } from "@/components/layout/sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-900/5 antialiased">
      <Sidebar />
      <main className="flex-1 min-w-0 w-full overflow-x-hidden overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
