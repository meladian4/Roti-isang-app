"use client"

import { useState, useRef, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Bot, User, Send, Loader2, Wheat, Sparkles } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

const QUICK_PROMPTS = [
  "Berapa kebutuhan bahan untuk produksi 10 batch?",
  "Bahan mana yang stoknya hampir habis?",
  "Analisis biaya produksi bulan ini",
  "Saran untuk mengoptimalkan penggunaan bahan baku",
  "Apa bahan yang bisa disubstitusi jika stok habis?",
]

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Halo! 👋 Saya AI Assistant berbasis Google Gemini untuk manajemen produksi Roti Isang Anda.\n\nSaya dapat membantu:\n• Menghitung kebutuhan bahan baku otomatis\n• Menganalisis ketersediaan stok & peringatan restok\n• Memberikan saran optimasi efisiensi resep\n• Estimasi HPP dan analisis biaya produksi\n\nSilakan pilih pertanyaan di bawah atau ketik langsung!",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || loading) return

    setMessages((prev) => [...prev, { role: "user", content: msg }])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }])
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Maaf, terjadi kesalahan koneksi. Coba lagi." }])
    }
    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header title="AI Production Assistant" description="Asisten cerdas real-time berbasis Google Gemini AI" />

      {/* Chat Area Container */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-5xl w-full mx-auto">

        {/* Quick Prompts Bar */}
        {messages.length === 1 && (
          <div className="glass-card rounded-3xl p-6 mb-6">
            <p className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="h-4 w-4 text-orange-500" /> Rekomendasi Pertanyaan Cepat:
            </p>
            <div className="flex flex-wrap gap-2.5">
              {QUICK_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(p)}
                  className="px-4 py-2 text-xs font-bold bg-white/90 border border-orange-200 text-orange-700 hover:bg-gradient-to-r hover:from-orange-500 hover:to-amber-500 hover:text-white rounded-2xl shadow-xs transition-all duration-300 hover:-translate-y-0.5"
                >
                  ✨ {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Messages List */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {/* Avatar Badge */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-md ${
              msg.role === "user"
                ? "bg-gradient-to-br from-orange-500 to-amber-600 shadow-orange-500/20 text-white"
                : "bg-slate-900 text-white shadow-slate-950/20"
            }`}>
              {msg.role === "user" ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
            </div>

            {/* Message Bubble */}
            <div className={`max-w-[80%] rounded-3xl px-6 py-4 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-950/10 rounded-tr-xs font-medium"
                : "glass-card text-slate-800 rounded-tl-xs shadow-md border-orange-500/10"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center flex-shrink-0 text-white shadow-md">
              <Bot className="h-5 w-5 animate-spin text-orange-400" />
            </div>
            <div className="glass-card rounded-3xl rounded-tl-xs px-6 py-4 flex items-center gap-3 text-slate-500 text-sm font-bold">
              <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
              Gemini AI sedang berpikir & menghitung...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Box Footer */}
      <div className="border-t border-orange-500/10 bg-white/75 backdrop-blur-md p-6">
        <div className="flex gap-3 max-w-4xl mx-auto items-center">
          <Textarea
            placeholder="Tanya perbandingan bahan baku, kalkulasi porsi, atau analisis biaya..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="resize-none rounded-2xl bg-white/90 border-slate-200 focus-visible:ring-orange-500 shadow-xs text-sm py-3"
            disabled={loading}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            size="lg"
            className="rounded-2xl shadow-lg shadow-orange-500/25 h-11 px-6"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
        <p className="text-center text-[10px] font-bold text-slate-400 mt-2">
          Tekan <kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Enter</kbd> untuk kirim • <kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Shift+Enter</kbd> baris baru
        </p>
      </div>
    </div>
  )
}
