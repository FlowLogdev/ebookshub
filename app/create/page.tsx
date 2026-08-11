"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Logo } from "@/components/brand/logo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  BOOK_DIMENSIONS,
  BOOK_LANGUAGES,
  BOOK_TYPES,
  ILLUSTRATION_FREQUENCIES,
  IMAGE_STYLES,
  MAX_PAGE_COUNT,
  MIN_PAGE_COUNT,
  PAGE_LENGTH_PRESETS,
} from "@/lib/book/constants"
import { cn } from "@/lib/utils"

const STEP_LABELS = ["What would you like to create?", "Describe your idea", "Book details"]

export default function CreateBookPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const [bookType, setBookType] = useState<string | null>(null)
  const [prompt, setPrompt] = useState("")
  const [pageCount, setPageCount] = useState(30)
  const [customPageCount, setCustomPageCount] = useState("")
  const [language, setLanguage] = useState("en")
  const [targetAudience, setTargetAudience] = useState("")
  const [tone, setTone] = useState("")
  const [authorName, setAuthorName] = useState("")
  const [imageStyle, setImageStyle] = useState<string>(IMAGE_STYLES[3])
  const [illustrationFrequency, setIllustrationFrequency] = useState("ai_recommended")
  const [dimensions, setDimensions] = useState("6x9")

  const selectedType = useMemo(() => BOOK_TYPES.find((t) => t.id === bookType), [bookType])

  function goNext() {
    if (step === 1 && !bookType) {
      toast.error("Pick a book type to continue.")
      return
    }
    if (step === 2 && prompt.trim().length < 10) {
      toast.error("Tell us a bit more about your idea (at least a sentence or two).")
      return
    }
    setStep((s) => Math.min(3, s + 1))
  }

  async function handleCreate() {
    if (!bookType) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          bookType,
          language,
          pageCountTarget: pageCount,
          targetAudience: targetAudience || undefined,
          tone: tone || undefined,
          authorName: authorName || undefined,
          imageStyle,
          illustrationFrequency,
          dimensions,
        }),
      })
      const data = await res.json()
      if (!res.ok && res.status !== 207) throw new Error(data.error ?? "Something went wrong.")
      const jobQuery = data.jobId ? `?job=${data.jobId}` : ""
      router.push(`/books/${data.book.id}/outline${jobQuery}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start your book.")
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="container flex h-16 items-center justify-between">
        <Logo />
        <p className="text-sm text-muted-foreground">Step {step} of 3</p>
      </header>

      <div className="container max-w-3xl pb-24 pt-6">
        <div className="mb-10 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={cn("h-1.5 flex-1 rounded-full transition-colors", s <= step ? "bg-gold-gradient" : "bg-muted")} />
          ))}
        </div>

        <h1 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">{STEP_LABELS[step - 1]}</h1>

        {step === 1 && (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {BOOK_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setBookType(type.id)}
                className={cn(
                  "rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-soft",
                  bookType === type.id && "border-primary bg-primary/5 ring-1 ring-primary",
                )}
              >
                <p className="text-sm font-medium">{type.label}</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{type.description}</p>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="mt-8 space-y-4">
            <Textarea
              autoFocus
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Tell us about the book you would like to create..."
              className="min-h-[220px] text-base leading-relaxed"
            />
            <p className="text-sm text-muted-foreground">
              The more specific you are — characters, setting, tone, what should happen — the better the first draft
              will be. You&apos;ll be able to review and edit everything before it&apos;s written.
            </p>
            {selectedType && (
              <Badge variant="secondary" className="w-fit">
                Creating a {selectedType.label.toLowerCase()}
              </Badge>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="mt-8 space-y-8">
            <div>
              <Label className="mb-3 block">How long should the book be?</Label>
              <div className="flex flex-wrap gap-2">
                {PAGE_LENGTH_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setPageCount(n)
                      setCustomPageCount("")
                    }}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                      pageCount === n && customPageCount === "" ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/50",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Label htmlFor="custom-pages" className="text-sm text-muted-foreground">
                  Custom ({MIN_PAGE_COUNT}–{MAX_PAGE_COUNT}):
                </Label>
                <Input
                  id="custom-pages"
                  type="number"
                  min={MIN_PAGE_COUNT}
                  max={MAX_PAGE_COUNT}
                  className="w-28"
                  value={customPageCount}
                  onChange={(e) => {
                    const raw = e.target.value
                    setCustomPageCount(raw)
                    const n = Number(raw)
                    if (raw && !Number.isNaN(n)) setPageCount(Math.min(MAX_PAGE_COUNT, Math.max(MIN_PAGE_COUNT, n)))
                  }}
                  placeholder="e.g. 115"
                />
                <span className="text-sm text-muted-foreground">Selected: {pageCount} pages</span>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="language">Book language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="language"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BOOK_LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dimensions">Book dimensions</Label>
                <Select value={dimensions} onValueChange={setDimensions}>
                  <SelectTrigger id="dimensions"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BOOK_DIMENSIONS.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="audience">Target audience (optional)</Label>
                <Input id="audience" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="e.g. Ages 6-9, or Adult beginners" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tone">Tone (optional)</Label>
                <Input id="tone" value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g. Warm and encouraging" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="author">Author name (optional)</Label>
                <Input id="author" value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="How you'll be credited" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="illustration-freq">Illustration frequency</Label>
                <Select value={illustrationFrequency} onValueChange={setIllustrationFrequency}>
                  <SelectTrigger id="illustration-freq"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ILLUSTRATION_FREQUENCIES.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="image-style">Image style</Label>
                <Select value={imageStyle} onValueChange={setImageStyle}>
                  <SelectTrigger id="image-style"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IMAGE_STYLES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || submitting}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < 3 ? (
            <Button onClick={goNext}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="gold" onClick={handleCreate} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Create My Book
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
