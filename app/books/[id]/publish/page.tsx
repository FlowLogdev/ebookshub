"use client"

import { use, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Chrome, Download, FileText, Loader2, Send, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { UPGRADE_URL } from "@/lib/plans/free-tier"
import type { Database } from "@/lib/supabase/types"
import { cn } from "@/lib/utils"

type Book = Database["public"]["Tables"]["books"]["Row"]
type Profile = Database["public"]["Tables"]["profiles"]["Row"]

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

const EXPORT_FORMATS = [
  { format: "pdf", label: "PDF", description: "Print-ready, works everywhere." },
  { format: "docx", label: "Word (.docx)", description: "Editable in Word or Google Docs." },
  { format: "epub", label: "EPUB", description: "Kindle-ready — upload straight to KDP." },
] as const

export default function PublishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: bookId } = use(params)
  const router = useRouter()
  const [book, setBook] = useState<Book | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatBusy, setChatBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/books/${bookId}`).then((r) => r.json()),
      fetch("/api/profile").then((r) => r.json()),
    ])
      .then(([bookData, profileData]) => {
        setBook(bookData.book)
        setProfile(profileData.profile)
      })
      .finally(() => setLoading(false))
  }, [bookId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  if (loading || !book) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isPro = profile?.plan_id === "pro"

  async function handleDownload(format: (typeof EXPORT_FORMATS)[number]["format"]) {
    setDownloading(format)
    try {
      const res = await fetch(`/api/books/${bookId}/export?format=${format}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Export failed.")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const disposition = res.headers.get("Content-Disposition") ?? ""
      const match = /filename="(.+)"/.exec(disposition)
      a.download = match?.[1] ?? `${book?.title ?? "book"}.${format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed.")
    } finally {
      setDownloading(null)
    }
  }

  async function sendChatMessage() {
    const content = chatInput.trim()
    if (!content || chatBusy) return
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }]
    setMessages(nextMessages)
    setChatInput("")
    setChatBusy(true)
    try {
      const res = await fetch(`/api/books/${bookId}/kdp-assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "The assistant failed to respond.")
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The assistant failed to respond.")
      setMessages(messages) // roll back the optimistic user message's follow-up state
    } finally {
      setChatBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="container flex h-16 items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/books/${bookId}/preview`}><ArrowLeft className="h-4 w-4" /> Back to preview</Link>
        </Button>
        <p className="text-sm text-muted-foreground">Publish — {book.title}</p>
      </header>

      <div className="container max-w-3xl pb-24 pt-6">
        <h1 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">Export &amp; publish</h1>

        {!isPro ? (
          <Card className="mt-6 flex flex-col items-center gap-3 p-8 text-center">
            <Sparkles className="h-6 w-6 text-primary" />
            <p className="font-medium">Exports and the Kindle publishing assistant are Pro features.</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Upgrade to Pro to download this book as PDF, Word, or Kindle-ready EPUB, and to get step-by-step AI
              guidance for publishing it on Amazon KDP.
            </p>
            <Button variant="gold" onClick={() => router.push(UPGRADE_URL)}>
              See upgrade options
            </Button>
          </Card>
        ) : (
          <>
            <section className="mt-6">
              <h2 className="text-sm font-medium text-muted-foreground">Download</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {EXPORT_FORMATS.map((f) => (
                  <Card key={f.format} className="flex flex-col gap-2 p-4">
                    <FileText className="h-5 w-5 text-primary" />
                    <p className="font-medium">{f.label}</p>
                    <p className="text-xs text-muted-foreground">{f.description}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      disabled={downloading === f.format}
                      onClick={() => handleDownload(f.format)}
                    >
                      {downloading === f.format ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Download
                    </Button>
                  </Card>
                ))}
              </div>
            </section>

            <section className="mt-10">
              <h2 className="text-sm font-medium text-muted-foreground">Kindle publishing assistant</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask about anything in the Amazon KDP publishing flow — account setup, metadata, cover requirements,
                pricing and royalties, or the review process. This assistant guides you step by step; you do the
                uploading on kdp.amazon.com.
              </p>

              <Card className="mt-3 flex h-[420px] flex-col overflow-hidden">
                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Try: &quot;What royalty plan should I pick?&quot; or &quot;Walk me through uploading my EPUB.&quot;
                    </p>
                  )}
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={cn(
                        "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                        m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted",
                      )}
                    >
                      {m.content}
                    </div>
                  ))}
                  {chatBusy && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
                    </div>
                  )}
                </div>
                <div className="flex items-end gap-2 border-t p-3">
                  <Textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        sendChatMessage()
                      }
                    }}
                    placeholder="Ask about publishing on Amazon Kindle..."
                    className="min-h-[44px] flex-1 resize-none"
                  />
                  <Button size="icon" onClick={sendChatMessage} disabled={chatBusy || !chatInput.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </section>

            <section className="mt-10">
              <h2 className="text-sm font-medium text-muted-foreground">Browser co-pilot</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Install the EbooksHub Assistant browser extension and it&apos;ll watch whatever KDP (or other publishing
                site) page you&apos;re on and tell you exactly what to click or type next — right in a side panel. It
                only tells you what to do; it never clicks or types anything itself.
              </p>
              <Card className="mt-3 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Chrome className="h-5 w-5 text-primary" />
                  <p className="text-sm">
                    1. Install the extension (see setup instructions) &nbsp;→&nbsp; 2. Connect your account
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/extension/connect">Connect account</Link>
                </Button>
              </Card>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
