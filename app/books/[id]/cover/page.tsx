"use client"

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Database } from "@/lib/supabase/types"
import { cn } from "@/lib/utils"

type Book = Database["public"]["Tables"]["books"]["Row"]
type Cover = Database["public"]["Tables"]["covers"]["Row"]

export default function CoverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: bookId } = use(params)
  const [book, setBook] = useState<Book | null>(null)
  const [covers, setCovers] = useState<Cover[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selecting, setSelecting] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/books/${bookId}`)
    const data = await res.json()
    if (res.ok) {
      setBook(data.book)
      setCovers(data.covers)
    }
    setLoading(false)
  }, [bookId])

  useEffect(() => {
    load()
  }, [load])

  async function generate() {
    setGenerating(true)
    try {
      const res = await fetch(`/api/books/${bookId}/covers`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Cover generation failed.")
      setCovers((prev) => [...(data.covers ?? []), ...prev])
      toast.success("4 cover concepts generated.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cover generation failed. Check that OPENAI_API_KEY is set.")
    } finally {
      setGenerating(false)
    }
  }

  async function select(coverId: string) {
    setSelecting(coverId)
    try {
      const res = await fetch(`/api/books/${bookId}/covers/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverId }),
      })
      if (!res.ok) throw new Error()
      setBook((b) => (b ? { ...b, selected_cover_id: coverId } : b))
      toast.success("Cover selected.")
    } catch {
      toast.error("Failed to select cover.")
    } finally {
      setSelecting(null)
    }
  }

  if (loading || !book) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper pb-24">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/books/${bookId}/edit`}><ArrowLeft className="h-4 w-4" /> Back to editor</Link>
          </Button>
        </div>
      </header>

      <div className="container max-w-4xl pt-8">
        <h1 className="font-display text-2xl font-medium tracking-tight">Cover for &ldquo;{book.title}&rdquo;</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate a few concepts, then pick the one that fits. You can regenerate as many times as you like.
        </p>

        <Button variant="gold" className="mt-5" onClick={generate} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate 4 Cover Ideas
        </Button>

        {covers.length === 0 ? (
          <p className="mt-12 text-center text-sm text-muted-foreground">No covers yet — generate a first set of concepts above.</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-4">
            {covers.map((cover) => {
              const isSelected = book.selected_cover_id === cover.id
              return (
                <Card key={cover.id} className={cn("overflow-hidden", isSelected && "ring-2 ring-primary")}>
                  <div className="aspect-[2/3] bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover.image_url} alt="Cover concept" className="h-full w-full object-cover" />
                  </div>
                  <div className="p-3">
                    <Button
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      className="w-full"
                      onClick={() => select(cover.id)}
                      disabled={selecting === cover.id}
                    >
                      {selecting === cover.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isSelected ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : null}
                      {isSelected ? "Selected" : "Use this cover"}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
