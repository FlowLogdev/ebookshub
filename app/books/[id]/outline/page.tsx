"use client"

import { Suspense, use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, GripVertical, Loader2, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Logo } from "@/components/brand/logo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useJobRunner } from "@/lib/hooks/use-job-runner"
import type { Database } from "@/lib/supabase/types"

type Book = Database["public"]["Tables"]["books"]["Row"]
type Blueprint = Database["public"]["Tables"]["book_blueprints"]["Row"]
type Chapter = Database["public"]["Tables"]["chapters"]["Row"]

interface DraftChapter {
  id?: string
  title: string
  subtitle: string
  summary: string
  targetPages: number
}

export default function OutlinePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <OutlinePageInner params={params} />
    </Suspense>
  )
}

function OutlinePageInner({ params }: { params: Promise<{ id: string }> }) {
  const { id: bookId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialJobId = searchParams.get("job")

  const [book, setBook] = useState<Book | null>(null)
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null)
  const [chapters, setChapters] = useState<DraftChapter[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [activeJobId, setActiveJobId] = useState<string | null>(initialJobId)

  const { job, error: jobError } = useJobRunner(activeJobId)

  const loadBook = useCallback(async () => {
    const res = await fetch(`/api/books/${bookId}`)
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? "Failed to load this book.")
      return
    }
    setBook(data.book)
    setBlueprint(data.blueprint)
    setChapters(
      (data.chapters as Chapter[]).map((c) => ({
        id: c.id,
        title: c.title,
        subtitle: c.subtitle ?? "",
        summary: c.summary ?? "",
        targetPages: c.target_pages,
      })),
    )
    setLoading(false)
  }, [bookId])

  useEffect(() => {
    loadBook()
  }, [loadBook])

  // Once the blueprint job finishes, stop polling and pull the finished blueprint.
  useEffect(() => {
    if (job?.status === "complete") {
      setActiveJobId(null)
      loadBook()
    }
  }, [job?.status, loadBook])

  const isPlanning = Boolean(activeJobId) && !blueprint
  const totalPages =
    (blueprint?.front_matter.reduce((s, m) => s + m.pages, 0) ?? 0) +
    chapters.reduce((s, c) => s + c.targetPages, 0) +
    (blueprint?.back_matter.reduce((s, m) => s + m.pages, 0) ?? 0)

  function updateChapter(index: number, patch: Partial<DraftChapter>) {
    setChapters((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  function moveChapter(index: number, dir: -1 | 1) {
    setChapters((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function removeChapter(index: number) {
    setChapters((prev) => prev.filter((_, i) => i !== index))
  }

  function addChapter() {
    setChapters((prev) => [...prev, { title: `Chapter ${prev.length + 1}`, subtitle: "", summary: "", targetPages: 5 }])
  }

  async function saveChanges() {
    setSaving(true)
    try {
      const res = await fetch(`/api/books/${bookId}/blueprint`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapters: chapters.map((c) => ({
            id: c.id,
            title: c.title,
            subtitle: c.subtitle || null,
            summary: c.summary || null,
            targetPages: c.targetPages,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to save changes.")
      if (data.warning) toast.warning(data.warning)
      else toast.success("Blueprint updated.")
      setBlueprint(data.blueprint)
      await loadBook()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save changes.")
    } finally {
      setSaving(false)
    }
  }

  async function regenerateOutline() {
    setLoading(true)
    try {
      const res = await fetch(`/api/books/${bookId}/blueprint/regenerate`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to regenerate outline.")
      setBlueprint(null)
      setChapters([])
      setActiveJobId(data.jobId)
      setLoading(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to regenerate outline.")
      setLoading(false)
    }
  }

  async function approveAndGenerate() {
    setApproving(true)
    try {
      await saveChanges()
      const res = await fetch(`/api/books/${bookId}/blueprint/approve`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to start generation.")
      router.push(`/books/${bookId}/generating?job=${data.jobId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start generation.")
      setApproving(false)
    }
  }

  if (loading && !isPlanning) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isPlanning || !blueprint) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-gradient shadow-soft">
          <Sparkles className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="font-display text-2xl font-medium">Planning your book…</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Analyzing your idea and working out how {book?.page_count_target ?? "your"} pages break down into front
          matter, chapters, and back matter. This usually takes under a minute.
        </p>
        {jobError && <p className="text-sm text-destructive">{jobError}</p>}
      </div>
    )
  }

  const concept = blueprint.concept as { title?: string; description?: string; genre?: string }

  return (
    <div className="min-h-screen bg-paper pb-24">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
          </Button>
        </div>
      </header>

      <div className="container max-w-3xl pt-8">
        <Badge variant="secondary" className="mb-3">Book blueprint</Badge>
        <h1 className="font-display text-3xl font-medium tracking-tight">{concept.title ?? book?.title}</h1>
        {concept.description && <p className="mt-2 text-muted-foreground">{concept.description}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <Badge variant="outline">{concept.genre}</Badge>
          <span className={totalPages > (book?.page_count_target ?? 0) * 1.15 || totalPages < (book?.page_count_target ?? 0) * 0.85 ? "text-destructive" : "text-muted-foreground"}>
            {totalPages} of {book?.page_count_target} pages planned
          </span>
          <Button variant="link" size="sm" className="h-auto p-0" onClick={regenerateOutline}>
            <RefreshCw className="h-3.5 w-3.5" /> Regenerate outline
          </Button>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <MatterList title="Front matter" sections={blueprint.front_matter} />
          <MatterList title="Back matter" sections={blueprint.back_matter} />
        </div>

        <h2 className="mb-3 mt-10 font-display text-lg font-medium">Chapters</h2>
        <div className="space-y-3">
          {chapters.map((chapter, i) => (
            <Card key={chapter.id ?? i}>
              <CardContent className="flex gap-3 p-4">
                <div className="flex flex-col items-center gap-1 pt-1.5 text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                  <span className="text-xs">{i + 1}</span>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={chapter.title}
                      onChange={(e) => updateChapter(i, { title: e.target.value })}
                      className="font-medium"
                      placeholder="Chapter title"
                    />
                    <Input
                      type="number"
                      min={1}
                      value={chapter.targetPages}
                      onChange={(e) => updateChapter(i, { targetPages: Math.max(1, Number(e.target.value) || 1) })}
                      className="w-24"
                    />
                  </div>
                  <Textarea
                    value={chapter.summary}
                    onChange={(e) => updateChapter(i, { summary: e.target.value })}
                    placeholder="What happens in this chapter…"
                    className="min-h-[60px] text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveChapter(i, -1)} disabled={i === 0}>↑</Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveChapter(i, 1)} disabled={i === chapters.length - 1}>↓</Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeChapter(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={addChapter} className="w-full border-dashed">
            <Plus className="h-4 w-4" /> Add chapter
          </Button>
        </div>

        <div className="sticky bottom-6 mt-10 flex justify-end gap-3 rounded-xl border bg-background/95 p-4 shadow-lift backdrop-blur">
          <Button variant="outline" onClick={saveChanges} disabled={saving || approving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
          </Button>
          <Button variant="gold" onClick={approveAndGenerate} disabled={saving || approving}>
            {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Approve & Start Writing
          </Button>
        </div>
      </div>
    </div>
  )
}

function MatterList({ title, sections }: { title: string; sections: { label: string; pages: number }[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 pt-0">
        {sections.length === 0 && <p className="text-sm text-muted-foreground">None</p>}
        {sections.map((s) => (
          <div key={s.label} className="flex items-center justify-between text-sm">
            <span>{s.label}</span>
            <span className="text-muted-foreground">{s.pages}p</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
