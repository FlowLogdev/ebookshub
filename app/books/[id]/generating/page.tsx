"use client"

import { Suspense, use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2, RotateCcw, Sparkles, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useJobRunner } from "@/lib/hooks/use-job-runner"
import type { Database } from "@/lib/supabase/types"
import { cn } from "@/lib/utils"

type Chapter = Database["public"]["Tables"]["chapters"]["Row"]
type Book = Database["public"]["Tables"]["books"]["Row"]

export default function GeneratingPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <GeneratingPageInner params={params} />
    </Suspense>
  )
}

function GeneratingPageInner({ params }: { params: Promise<{ id: string }> }) {
  const { id: bookId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()

  const [book, setBook] = useState<Book | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [jobId, setJobId] = useState<string | null>(searchParams.get("job"))
  const [resolving, setResolving] = useState(!searchParams.get("job"))

  const { job, tasks, error } = useJobRunner(jobId)

  const loadBook = useCallback(async () => {
    const res = await fetch(`/api/books/${bookId}`)
    const data = await res.json()
    if (res.ok) {
      setBook(data.book)
      setChapters(data.chapters)
    }
  }, [bookId])

  useEffect(() => {
    loadBook()
  }, [loadBook])

  useEffect(() => {
    if (jobId) return
    ;(async () => {
      const res = await fetch(`/api/books/${bookId}/jobs?type=FULL_BOOK`)
      const data = await res.json()
      setJobId(data.job?.id ?? null)
      setResolving(false)
    })()
  }, [bookId, jobId])

  // Refresh chapter statuses whenever the worker loop reports a task finished.
  // Depend on `tasks` itself (a new array every refresh), not `tasks.length`
  // — the task count never changes mid-run, only each task's status does, so
  // keying on length meant this only ever fired once and the chapter list
  // froze on its very first snapshot while the job kept progressing underneath.
  useEffect(() => {
    loadBook()
  }, [tasks, loadBook])

  // Once every chapter is done, take the user straight to the finished book
  // instead of leaving them stuck on a "your book is ready" screen with a
  // button they have to notice and click.
  useEffect(() => {
    if (job?.status !== "complete") return
    const timeout = setTimeout(() => router.push(`/books/${bookId}/preview`), 1200)
    return () => clearTimeout(timeout)
  }, [job?.status, bookId, router])

  async function retryChapter(chapterId: string) {
    try {
      const res = await fetch(`/api/chapters/${chapterId}/retry`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to retry chapter.")
      setJobId(data.jobId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to retry chapter.")
    }
  }

  const isComplete = job?.status === "complete"
  const progress = job?.progress_percent ?? 0

  return (
    <div className="min-h-screen bg-paper pb-24">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <Logo href="/dashboard" />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">Save & exit</Link>
          </Button>
        </div>
      </header>

      <div className="container max-w-2xl pt-12">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-gradient shadow-soft">
            {isComplete ? <CheckCircle2 className="h-6 w-6 text-primary-foreground" /> : <Sparkles className="h-6 w-6 animate-pulse text-primary-foreground" />}
          </div>
          <h1 className="mt-4 font-display text-2xl font-medium">
            {isComplete ? "Your book is ready" : "Creating your book…"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isComplete
              ? "Every chapter has been written. Taking you to the preview…"
              : "You can safely close this tab — generation picks up right where it left off when you come back."}
          </p>
        </div>

        <div className="mt-8 space-y-2">
          <Progress value={progress} />
          <p className="text-right text-xs text-muted-foreground">{progress}%</p>
        </div>

        {(resolving || (!jobId && !isComplete)) && (
          <p className="mt-6 text-center text-sm text-muted-foreground">Looking for this book&apos;s generation job…</p>
        )}
        {error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}

        <ol className="mt-8 space-y-2">
          {chapters.map((chapter) => (
            <li key={chapter.id} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
              <div className="flex items-center gap-3">
                <ChapterStatusIcon status={chapter.status} />
                <div>
                  <p className="text-sm font-medium">{chapter.title}</p>
                  <p className="text-xs capitalize text-muted-foreground">{chapter.status.replace("_", " ")}</p>
                </div>
              </div>
              {chapter.status === "failed" && (
                <Button size="sm" variant="outline" onClick={() => retryChapter(chapter.id)}>
                  <RotateCcw className="h-3.5 w-3.5" /> Retry
                </Button>
              )}
            </li>
          ))}
        </ol>

        {isComplete && (
          <div className="mt-10 flex justify-center gap-3">
            <Button size="lg" variant="gold" onClick={() => router.push(`/books/${bookId}/preview`)}>
              Open preview now
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push(`/books/${bookId}/edit`)}>
              Open in editor
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function ChapterStatusIcon({ status }: { status: Chapter["status"] }) {
  if (status === "complete") return <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
  if (status === "failed") return <XCircle className="h-5 w-5 shrink-0 text-destructive" />
  if (status === "writing" || status === "planning" || status === "illustrating" || status === "reviewing") {
    return <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
  }
  return <span className={cn("h-5 w-5 shrink-0 rounded-full border-2 border-muted-foreground/30")} />
}
