"use client"

import { Suspense, use, useCallback, useEffect, useState, type ChangeEvent } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Check, ExternalLink, ImagePlus, Loader2, PenSquare, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { TextOverlayEditor, type OverlayText } from "@/components/cover/text-overlay-editor"
import type { Database } from "@/lib/supabase/types"
import { cn } from "@/lib/utils"

type Book = Database["public"]["Tables"]["books"]["Row"]
type Cover = Database["public"]["Tables"]["covers"]["Row"]

export default function CoverPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <CoverPageInner params={params} />
    </Suspense>
  )
}

function CoverPageInner({ params }: { params: Promise<{ id: string }> }) {
  const { id: bookId } = use(params)
  const searchParams = useSearchParams()
  const [book, setBook] = useState<Book | null>(null)
  const [covers, setCovers] = useState<Cover[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [selecting, setSelecting] = useState<string | null>(null)
  const [side, setSide] = useState<"front" | "back">(searchParams.get("side") === "back" ? "back" : "front")
  const [canvaConnected, setCanvaConnected] = useState<boolean | null>(null)
  const [canvaBusyId, setCanvaBusyId] = useState<string | null>(null)
  const [pendingDesign, setPendingDesign] = useState<{ coverId: string; designId: string; variant: "with_background" | "no_background" } | null>(null)
  const [editingCover, setEditingCover] = useState<Cover | null>(null)
  const [savingOverlay, setSavingOverlay] = useState(false)
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [coverCopy, setCoverCopy] = useState("")

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

  useEffect(() => {
    fetch("/api/canva/status")
      .then((r) => r.json())
      .then((d) => setCanvaConnected(Boolean(d.connected)))
      .catch(() => setCanvaConnected(false))
  }, [])

  const isBackCover = side === "back"
  const visibleCovers = covers.filter((c) => c.is_back_cover === isBackCover)
  const selectedId = isBackCover ? book?.selected_back_cover_id : book?.selected_cover_id
  const copyWords = coverCopy.trim() ? coverCopy.trim().split(/\s+/).length : 0

  async function generate(variant: "with_background" | "no_background") {
    setGenerating(variant)
    try {
      const res = await fetch(`/api/books/${bookId}/covers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant, isBackCover }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Cover generation failed.")
      setCovers((prev) => [...(data.covers ?? []), ...prev])
      toast.success(`${data.covers?.length ?? 0} concepts generated.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cover generation failed.")
    } finally {
      setGenerating(null)
    }
  }

  async function select(coverId: string) {
    setSelecting(coverId)
    try {
      const res = await fetch(`/api/books/${bookId}/covers/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverId, isBackCover }),
      })
      if (!res.ok) throw new Error()
      setBook((b) => (b ? { ...b, [isBackCover ? "selected_back_cover_id" : "selected_cover_id"]: coverId } : b))
      toast.success("Cover selected.")
    } catch {
      toast.error("Failed to select cover.")
    } finally {
      setSelecting(null)
    }
  }

  async function designInCanva(cover: Cover) {
    if (!canvaConnected) {
      window.location.href = "/api/canva/connect"
      return
    }
    setCanvaBusyId(cover.id)
    try {
      const res = await fetch(`/api/books/${bookId}/covers/canva/design`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverId: cover.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.needsConnect) {
          window.location.href = "/api/canva/connect"
          return
        }
        throw new Error(data.error ?? "Failed to create Canva design.")
      }
      window.open(data.design.editUrl, "_blank", "noopener,noreferrer")
      setPendingDesign({ coverId: cover.id, designId: data.design.id, variant: cover.variant })
      toast.success("Opened in Canva. Come back and click \"Import from Canva\" when you're done editing.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create Canva design.")
    } finally {
      setCanvaBusyId(null)
    }
  }

  async function importFromCanva() {
    if (!pendingDesign) return
    setCanvaBusyId(pendingDesign.designId)
    try {
      const res = await fetch(`/api/books/${bookId}/covers/canva/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designId: pendingDesign.designId, variant: pendingDesign.variant, isBackCover }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to import from Canva.")
      setCovers((prev) => [data.cover, ...prev])
      setPendingDesign(null)
      toast.success("Imported your Canva design.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import from Canva.")
    } finally {
      setCanvaBusyId(null)
    }
  }

  async function saveOverlay(overlays: OverlayText[], renderedDataUrl: string) {
    if (!editingCover) return
    setSavingOverlay(true)
    try {
      const res = await fetch(`/api/books/${bookId}/covers/overlay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: renderedDataUrl, overlays, variant: editingCover.variant, isBackCover }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to save.")
      setCovers((prev) => [data.cover, ...prev])
      setEditingCover(null)
      toast.success("Saved as a new cover.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.")
    } finally {
      setSavingOverlay(false)
    }
  }

  async function saveCoverCopy() {
    if (copyWords > 100) return toast.error("Cover copy must be 100 words or fewer.")
    const key = isBackCover ? "backCoverCopy" : "frontCoverCopy"
    const res = await fetch(`/api/books/${bookId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: coverCopy }) })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error ?? "Failed to save cover copy.")
    setBook(data.book)
    setCopyDialogOpen(false)
    toast.success("Cover copy saved.")
  }

  function uploadManualCover(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/") || file.size > 3 * 1024 * 1024) return toast.error("Choose an image under 3MB.")
    const reader = new FileReader()
    reader.onload = () => saveOverlay([], reader.result as string)
    reader.onerror = () => toast.error("Couldn't read that image.")
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
    <div className="min-h-screen bg-paper pb-24">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/books/${bookId}/preview`}><ArrowLeft className="h-4 w-4" /> Back to preview</Link>
          </Button>
        </div>
      </header>

      <div className="container max-w-4xl pt-8">
        <h1 className="font-display text-2xl font-medium tracking-tight">Cover studio for &ldquo;{book.title}&rdquo;</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate concepts, edit text directly on the artwork, or open a design in Canva for full control.
        </p>

        <Tabs value={side} onValueChange={(v) => setSide(v as "front" | "back")} className="mt-6">
          <TabsList>
            <TabsTrigger value="front">Front cover</TabsTrigger>
            <TabsTrigger value="back">Back cover</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button variant="gold" onClick={() => generate("with_background")} disabled={generating !== null}>
            {generating === "with_background" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate with scene
          </Button>
          <Button variant="outline" onClick={() => generate("no_background")} disabled={generating !== null}>
            {generating === "no_background" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate without background
          </Button>
          <label htmlFor="manual-cover" className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
            <ImagePlus className="h-4 w-4" /> Upload your own {isBackCover ? "back " : ""}cover
          </label>
          <input id="manual-cover" type="file" accept="image/*" className="hidden" onChange={uploadManualCover} />
          <Button variant="outline" onClick={() => { setCoverCopy(isBackCover ? book.back_cover_copy ?? "" : book.front_cover_copy ?? ""); setCopyDialogOpen(true) }}>
            <PenSquare className="h-4 w-4" /> Add cover copy
          </Button>
          {pendingDesign && (
            <Button variant="secondary" onClick={importFromCanva} disabled={canvaBusyId === pendingDesign.designId}>
              {canvaBusyId === pendingDesign.designId ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Import from Canva
            </Button>
          )}
        </div>

        {visibleCovers.length === 0 ? (
          <p className="mt-12 text-center text-sm text-muted-foreground">
            No {isBackCover ? "back " : ""}covers yet — generate a first set of concepts above.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-4">
            {visibleCovers.map((cover) => {
              const isSelected = selectedId === cover.id
              return (
                <Card key={cover.id} className={cn("overflow-hidden", isSelected && "ring-2 ring-primary")}>
                  <div className="aspect-[2/3] bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover.image_url} alt="Cover concept" className="h-full w-full object-cover" />
                  </div>
                  <div className="space-y-1.5 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {cover.variant === "no_background" ? "No background" : "With scene"} · {cover.source}
                    </p>
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
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="ghost" className="flex-1" onClick={() => setEditingCover(cover)}>
                        <PenSquare className="h-3.5 w-3.5" /> Edit text
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1"
                        onClick={() => designInCanva(cover)}
                        disabled={canvaBusyId === cover.id}
                      >
                        {canvaBusyId === cover.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                        Canva
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={editingCover !== null} onOpenChange={(open) => !open && setEditingCover(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit text on cover</DialogTitle>
          </DialogHeader>
          {editingCover && (
            <TextOverlayEditor
              imageUrl={editingCover.image_url}
              initialOverlays={(editingCover.overlay_text as OverlayText[] | null) ?? []}
              onSave={saveOverlay}
              onCancel={() => setEditingCover(null)}
              saving={savingOverlay}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isBackCover ? "Back" : "Front"} cover copy</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Add a tagline, dedication, or book description. It will appear in the page-turn preview and supports up to 100 words.</p>
          <Textarea value={coverCopy} onChange={(e) => setCoverCopy(e.target.value)} className="min-h-40" placeholder={isBackCover ? "A short description for readers…" : "A short line for the front cover…"} />
          <p className="text-right text-xs text-muted-foreground">{copyWords}/100 words</p>
          <Button variant="gold" onClick={saveCoverCopy}>Save cover copy</Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
