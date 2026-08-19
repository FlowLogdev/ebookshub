"use client"

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Cloud,
  CloudOff,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  RotateCcw,
  Sparkles,
  Wand2,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { Logo } from "@/components/brand/logo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { WRITING_ASSISTANT_ACTIONS, type WritingAssistantAction } from "@/lib/ai/writing-assistant"
import type { Database } from "@/lib/supabase/types"
import { cn } from "@/lib/utils"

type Book = Database["public"]["Tables"]["books"]["Row"]
type Chapter = Database["public"]["Tables"]["chapters"]["Row"]
type BookImage = Database["public"]["Tables"]["images"]["Row"]

type SaveState = "idle" | "saving" | "saved" | "error"

const ASSISTANT_GROUPS: { label: string; actions: WritingAssistantAction[] }[] = [
  { label: "Generate", actions: ["continue"] },
  { label: "Rewrite", actions: ["rewrite", "improve", "simplify", "grammar"] },
  { label: "Length", actions: ["expand", "shorten", "summarize"] },
  { label: "Style", actions: ["more_descriptive", "more_emotional", "more_professional"] },
]

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: bookId } = use(params)

  const [book, setBook] = useState<Book | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [images, setImages] = useState<BookImage[]>([])
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const [title, setTitle] = useState("")
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [assistLoading, setAssistLoading] = useState<WritingAssistantAction | null>(null)
  const [assistResult, setAssistResult] = useState<{ action: WritingAssistantAction; text: string; selStart: number; selEnd: number } | null>(null)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [imageMode, setImageMode] = useState<"upload" | "generate">("upload")
  const [imagePrompt, setImagePrompt] = useState("")
  const [imageBusy, setImageBusy] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedContent = useRef<string>("")

  const activeChapter = useMemo(() => chapters.find((c) => c.id === activeChapterId) ?? null, [chapters, activeChapterId])
  const activeChapterImage = useMemo(
    () => images.find((image) => image.chapter_id === activeChapterId) ?? null,
    [images, activeChapterId],
  )

  const loadBook = useCallback(async () => {
    const res = await fetch(`/api/books/${bookId}`)
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? "Failed to load book.")
      return
    }
    setBook(data.book)
    setChapters(data.chapters)
    setImages(data.images ?? [])
    if (!activeChapterId && data.chapters.length > 0) {
      setActiveChapterId(data.chapters[0].id)
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId])

  useEffect(() => {
    loadBook()
  }, [loadBook])

  useEffect(() => {
    if (!activeChapter) return
    setContent(activeChapter.content ?? "")
    setTitle(activeChapter.title)
    lastSavedContent.current = activeChapter.content ?? ""
    setAssistResult(null)
  }, [activeChapter?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback(
    async (patch: { content?: string; title?: string }, saveVersion = false) => {
      if (!activeChapterId) return
      setSaveState("saving")
      try {
        const res = await fetch(`/api/chapters/${activeChapterId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...patch, saveVersion }),
        })
        if (!res.ok) throw new Error()
        setSaveState("saved")
        setChapters((prev) => prev.map((c) => (c.id === activeChapterId ? { ...c, ...(patch.content !== undefined ? { content: patch.content } : {}), ...(patch.title !== undefined ? { title: patch.title } : {}) } : c)))
      } catch {
        setSaveState("error")
      }
    },
    [activeChapterId],
  )

  function handleContentChange(value: string) {
    setContent(value)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => persist({ content: value }), 900)
  }

  function handleTitleBlur() {
    if (title !== activeChapter?.title) persist({ title })
  }

  function getSelection(): { text: string; start: number; end: number } {
    const el = textareaRef.current
    if (!el) return { text: content, start: 0, end: content.length }
    const { selectionStart, selectionEnd } = el
    if (selectionStart === selectionEnd) return { text: content, start: 0, end: content.length }
    return { text: content.slice(selectionStart, selectionEnd), start: selectionStart, end: selectionEnd }
  }

  async function runAssist(action: WritingAssistantAction) {
    if (!activeChapterId) return
    const { text, start, end } = getSelection()
    if (!text.trim()) {
      toast.error("Write or select some text first.")
      return
    }
    setAssistLoading(action)
    setAssistResult(null)
    try {
      const res = await fetch(`/api/chapters/${activeChapterId}/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "AI assist failed.")
      setAssistResult({ action, text: data.result, selStart: start, selEnd: end })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI assist failed.")
    } finally {
      setAssistLoading(null)
    }
  }

  async function applyAssistResult() {
    if (!assistResult) return
    await persist({ content }, true) // snapshot current version before overwriting
    const isContinue = assistResult.action === "continue"
    const next = isContinue
      ? `${content.slice(0, assistResult.selEnd)}\n\n${assistResult.text}${content.slice(assistResult.selEnd)}`
      : content.slice(0, assistResult.selStart) + assistResult.text + content.slice(assistResult.selEnd)
    setContent(next)
    handleContentChange(next)
    setAssistResult(null)
    toast.success("Applied. Your previous version is saved in history.")
  }

  async function retryChapter(chapterId: string) {
    const res = await fetch(`/api/chapters/${chapterId}/retry`, { method: "POST" })
    if (!res.ok) {
      toast.error("Failed to queue retry.")
      return
    }
    toast.success("Chapter queued for regeneration.")
  }

  async function saveChapterImage(payload: { mode: "upload" | "generate"; image?: string; prompt?: string }) {
    if (!activeChapterId) return
    setImageBusy(true)
    try {
      const res = await fetch(`/api/books/${bookId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId: activeChapterId, ...payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Unable to save chapter image.")
      setImages((previous) => [...previous.filter((image) => image.chapter_id !== activeChapterId), data.image])
      setImageDialogOpen(false)
      setImagePrompt("")
      toast.success(payload.mode === "generate" ? "Chapter image generated." : "Chapter image added.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save chapter image.")
    } finally {
      setImageBusy(false)
    }
  }

  function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.")
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Choose an image smaller than 3 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => saveChapterImage({ mode: "upload", image: String(reader.result) })
    reader.onerror = () => toast.error("Unable to read that image.")
    reader.readAsDataURL(file)
  }

  if (loading || !book) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
          </Button>
          <Logo iconOnly href="/dashboard" />
          <span className="text-sm font-medium">{book.title}</span>
        </div>
        <SaveIndicator state={saveState} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/books/${bookId}/cover`}><ImageIcon className="h-3.5 w-3.5" /> Cover</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/books/${bookId}/preview`}><BookOpen className="h-3.5 w-3.5" /> Preview</Link>
          </Button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-[240px_1fr_300px] overflow-hidden">
        {/* Left: chapters */}
        <aside className="overflow-y-auto border-r bg-paper p-3">
          <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Chapters</p>
          <div className="space-y-1">
            {chapters.map((chapter) => (
              <button
                key={chapter.id}
                onClick={() => setActiveChapterId(chapter.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted",
                  chapter.id === activeChapterId && "bg-primary/10 text-primary",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <ChapterDot status={chapter.status} />
                  <span className="truncate">{chapter.title}</span>
                </span>
                {chapter.id === activeChapterId && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
              </button>
            ))}
          </div>
          {activeChapter?.status === "failed" && (
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => retryChapter(activeChapter.id)}>
              <RotateCcw className="h-3.5 w-3.5" /> Retry this chapter
            </Button>
          )}
        </aside>

        {/* Center: content */}
        <main className="overflow-y-auto bg-background px-10 py-8">
          {activeChapter ? (
            activeChapter.status !== "complete" && !activeChapter.content ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p className="text-sm capitalize">This chapter is still {activeChapter.status}…</p>
              </div>
            ) : (
              <div className="mx-auto max-w-2xl">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  className="border-none px-0 font-display text-2xl font-medium shadow-none focus-visible:ring-0"
                />
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Start writing…"
                  className="mt-4 min-h-[60vh] resize-none border-none px-0 text-base leading-relaxed shadow-none focus-visible:ring-0"
                />
              </div>
            )
          ) : (
            <p className="text-center text-muted-foreground">This book has no chapters yet.</p>
          )}
        </main>

        {/* Right: chapter image and AI assistant */}
        <aside className="overflow-y-auto border-l bg-paper p-4">
          <section className="border-b pb-5">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <ImagePlus className="h-4 w-4" /> Chapter image
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Add your own photo or create one with AI for this chapter.</p>
            {activeChapterImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeChapterImage.url} alt="Current chapter illustration" className="mt-3 aspect-square w-full rounded-lg object-cover" />
            ) : (
              <div className="mt-3 flex aspect-square w-full items-center justify-center rounded-lg border border-dashed bg-background text-center text-xs text-muted-foreground">
                No image for this chapter yet
              </div>
            )}
            <Button className="mt-3 w-full" variant="outline" size="sm" disabled={!activeChapter} onClick={() => setImageDialogOpen(true)}>
              <ImagePlus className="h-3.5 w-3.5" /> {activeChapterImage ? "Replace image" : "Add image"}
            </Button>
          </section>

          <section className="pt-5">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Wand2 className="h-4 w-4" /> AI Assistant
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Select text in the editor, or leave nothing selected to act on the whole chapter.</p>

          <div className="mt-4 space-y-4">
            {ASSISTANT_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.actions.map((action) => (
                    <Button
                      key={action}
                      variant="outline"
                      size="sm"
                      disabled={assistLoading !== null}
                      onClick={() => runAssist(action)}
                    >
                      {assistLoading === action ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      {actionLabel(action)}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {assistResult && (
            <div className="mt-5 rounded-xl border bg-card p-3">
              <p className="text-xs font-medium text-muted-foreground">Suggestion</p>
              <p className="mt-1.5 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm">{assistResult.text}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={applyAssistResult}>
                  <Check className="h-3.5 w-3.5" /> Apply
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAssistResult(null)}>
                  Discard
                </Button>
              </div>
            </div>
          )}
          </section>
        </aside>
      </div>

      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{activeChapterImage ? "Replace chapter image" : "Add a chapter image"}</DialogTitle>
            <DialogDescription>Choose a photo from your device or describe an image for AI to create.</DialogDescription>
          </DialogHeader>
          <div className="flex rounded-lg bg-muted p-1">
            <Button type="button" size="sm" variant={imageMode === "upload" ? "secondary" : "ghost"} className="flex-1" onClick={() => setImageMode("upload")}>Upload photo</Button>
            <Button type="button" size="sm" variant={imageMode === "generate" ? "secondary" : "ghost"} className="flex-1" onClick={() => setImageMode("generate")}>Generate with AI</Button>
          </div>
          {imageMode === "upload" ? (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center text-sm hover:bg-muted/50">
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
              <span>Choose a JPG, PNG, WebP, or GIF up to 3 MB</span>
              <Input className="sr-only" type="file" accept="image/*" disabled={imageBusy} onChange={handleImageUpload} />
            </label>
          ) : (
            <div className="space-y-3">
              <Textarea value={imagePrompt} onChange={(event) => setImagePrompt(event.target.value)} maxLength={1000} placeholder="Example: A curious child following a glowing golden light through a moonlit forest, warm storybook watercolor." />
              <Button className="w-full" disabled={imageBusy || imagePrompt.trim().length < 5} onClick={() => saveChapterImage({ mode: "generate", prompt: imagePrompt.trim() })}>
                {imageBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate image
              </Button>
            </div>
          )}
          {imageBusy && imageMode === "upload" && <p className="text-center text-xs text-muted-foreground">Adding your image…</p>}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function actionLabel(action: WritingAssistantAction): string {
  const labels: Record<WritingAssistantAction, string> = {
    continue: "Continue writing",
    rewrite: "Rewrite",
    improve: "Improve",
    simplify: "Simplify",
    expand: "Expand",
    shorten: "Shorten",
    grammar: "Fix grammar",
    more_descriptive: "More descriptive",
    more_emotional: "More emotional",
    more_professional: "More professional",
    summarize: "Summarize",
  }
  return labels[action]
}

function ChapterDot({ status }: { status: Chapter["status"] }) {
  if (status === "complete") return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
  if (status === "failed") return <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
  if (status === "writing" || status === "planning") return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
  return <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-muted-foreground/30" />
}

function SaveIndicator({ state }: { state: SaveState }) {
  const map: Record<SaveState, { icon: React.ReactNode; label: string }> = {
    idle: { icon: null, label: "" },
    saving: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, label: "Saving…" },
    saved: { icon: <Cloud className="h-3.5 w-3.5" />, label: "Saved" },
    error: { icon: <CloudOff className="h-3.5 w-3.5" />, label: "Save failed" },
  }
  const { icon, label } = map[state]
  if (!label) return <span />
  return (
    <Badge variant={state === "error" ? "destructive" : "outline"} className="gap-1.5">
      {icon}
      {label}
    </Badge>
  )
}
