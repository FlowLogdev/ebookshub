"use client"

import { useEffect, useMemo, useState, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Sparkles, X } from "lucide-react"
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
  FREE_TIER_MAX_IMAGES,
  FREE_TIER_MAX_PAGES,
  FREE_TIER_MAX_WORDS,
  ILLUSTRATION_FREQUENCIES,
  IMAGE_STYLES,
  MAX_PAGE_COUNT,
  MIN_PAGE_COUNT,
  PAGE_LENGTH_PRESETS,
} from "@/lib/book/constants"
import { UPGRADE_URL } from "@/lib/plans/free-tier"
import type { Database } from "@/lib/supabase/types"
import { cn } from "@/lib/utils"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

const STEP_LABELS = ["What would you like to create?", "Describe your idea", "Book details"]

export default function CreateBookPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

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
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const [referenceImageName, setReferenceImageName] = useState<string | null>(null)
  const [requestedImageCount, setRequestedImageCount] = useState("3")
  const [imageSource, setImageSource] = useState<"ai" | "upload" | "mixed">("ai")
  const [uploadedImages, setUploadedImages] = useState<{ name: string; data: string }[]>([])
  const [frontCoverCopy, setFrontCoverCopy] = useState("")
  const [backCoverCopy, setBackCoverCopy] = useState("")

  // Sent as a base64 data URI in a JSON body, which inflates size by ~33% —
  // kept well under Vercel's ~4.5MB serverless request body limit.
  const MAX_REFERENCE_IMAGE_BYTES = 3 * 1024 * 1024

  function handleReferenceImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.")
      return
    }
    if (file.size > MAX_REFERENCE_IMAGE_BYTES) {
      toast.error("That image is too large — please choose one under 3MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setReferenceImage(reader.result as string)
      setReferenceImageName(file.name)
    }
    reader.onerror = () => toast.error("Couldn't read that image — please try another file.")
    reader.readAsDataURL(file)
  }

  function handleBookPhotos(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    const remaining = Number(requestedImageCount) - uploadedImages.length
    if (files.length > remaining) {
      toast.error(`You selected ${files.length}, but only ${remaining} picture slot${remaining === 1 ? "" : "s"} remain.`)
      return
    }
    if (files.some((file) => !file.type.startsWith("image/") || file.size > MAX_REFERENCE_IMAGE_BYTES)) {
      toast.error("Each photo must be an image smaller than 3MB.")
      return
    }
    Promise.all(files.map((file) => new Promise<{ name: string; data: string }>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ name: file.name, data: reader.result as string })
      reader.onerror = () => reject(new Error("Couldn't read a selected photo."))
      reader.readAsDataURL(file)
    })))
      .then((next) => setUploadedImages((current) => [...current, ...next]))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Couldn't read the selected photos."))
  }

  const coverWords = (value: string) => value.trim() ? value.trim().split(/\s+/).length : 0

  const selectedType = useMemo(() => BOOK_TYPES.find((t) => t.id === bookType), [bookType])

  const isFreePlan = profile?.plan_id === "free"
  const freeSlotUsed = isFreePlan && profile?.free_ebook_used_at != null

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile)
          if (data.profile.plan_id === "free") {
            setPageCount(FREE_TIER_MAX_PAGES)
            setRequestedImageCount("0")
            setUploadedImages([])
            setReferenceImage(null)
          }
        }
      })
      .finally(() => setProfileLoading(false))
  }, [])

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
          referenceImage: referenceImage || undefined,
          requestedImageCount: isFreePlan ? 0 : Number(requestedImageCount),
          imageSource: isFreePlan ? "ai" : imageSource,
          uploadedImages: isFreePlan ? [] : uploadedImages.map((image) => image.data),
          frontCoverCopy: frontCoverCopy || undefined,
          backCoverCopy: backCoverCopy || undefined,
        }),
      })
      const data = await res.json()
      if (res.status === 403 && data.upgradeRequired) {
        toast.error(data.error, { action: { label: "Upgrade", onClick: () => router.push(data.upgradeUrl ?? UPGRADE_URL) } })
        setSubmitting(false)
        return
      }
      if (!res.ok && res.status !== 207) throw new Error(data.error ?? "Something went wrong.")
      const jobQuery = data.jobId ? `?job=${data.jobId}` : ""
      router.push(`/books/${data.book.id}/outline${jobQuery}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start your book.")
      setSubmitting(false)
    }
  }

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (freeSlotUsed) {
    return (
      <div className="min-h-screen bg-paper">
        <header className="container flex h-16 items-center justify-between">
          <Logo href="/dashboard" />
        </header>
        <div className="container flex max-w-lg flex-col items-center pb-24 pt-16 text-center">
          <h1 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">You&apos;ve used your free ebook</h1>
          <p className="mt-3 text-muted-foreground">
            The Free plan includes one text-only ebook per account (up to {FREE_TIER_MAX_PAGES} pages and {FREE_TIER_MAX_WORDS} words).
            Upgrade to create more books with longer lengths and images.
          </p>
          <Button variant="gold" className="mt-6" onClick={() => router.push(UPGRADE_URL)}>
            See upgrade options
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="container flex h-16 items-center justify-between">
        <Logo href="/dashboard" />
        <p className="text-sm text-muted-foreground">Step {step} of 3</p>
      </header>

      <div className="container max-w-3xl pb-24 pt-6">
        <div className="mb-10 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={cn("h-1.5 flex-1 rounded-full transition-colors", s <= step ? "bg-gold-gradient" : "bg-muted")} />
          ))}
        </div>

        <h1 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">{STEP_LABELS[step - 1]}</h1>

        {isFreePlan && (
          <p className="mt-2 text-sm text-muted-foreground">
            Free plan: one text-only ebook, up to {FREE_TIER_MAX_PAGES} pages and {FREE_TIER_MAX_WORDS} words. {" "}
            <button type="button" className="underline underline-offset-2" onClick={() => router.push(UPGRADE_URL)}>
              Upgrade for longer books
            </button>
            .
          </p>
        )}

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
              {isFreePlan ? (
                <p className="text-sm text-muted-foreground">
                  Your free ebook is fixed at {FREE_TIER_MAX_PAGES} pages (~{FREE_TIER_MAX_WORDS} words). Upgrade for books up to{" "}
                  {MAX_PAGE_COUNT} pages.
                </p>
              ) : (
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
              )}
              {!isFreePlan && (
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
              )}
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
              {!isFreePlan && <div className="space-y-1.5">
                <Label htmlFor="illustration-freq">Illustration frequency</Label>
                <Select value={illustrationFrequency} onValueChange={setIllustrationFrequency}>
                  <SelectTrigger id="illustration-freq"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ILLUSTRATION_FREQUENCIES.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>}
              {!isFreePlan && <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="image-style">Image style</Label>
                <Select value={imageStyle} onValueChange={setImageStyle}>
                  <SelectTrigger id="image-style"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IMAGE_STYLES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>}
              {!isFreePlan && <div className="space-y-3 sm:col-span-2 rounded-xl border bg-card p-4">
                <div>
                  <Label htmlFor="picture-count">Pictures inside your book</Label>
                  <p className="mt-1 text-xs text-muted-foreground">Choose 1–10 pictures. Use your own photos, AI illustrations, or a combination.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select value={requestedImageCount} onValueChange={(value) => {
                    setRequestedImageCount(value)
                    setUploadedImages((current) => current.slice(0, Number(value)))
                  }}>
                    <SelectTrigger id="picture-count"><SelectValue /></SelectTrigger>
                    <SelectContent>{Array.from({ length: 10 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1} picture{i === 0 ? "" : "s"}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={imageSource} onValueChange={(value) => setImageSource(value as "ai" | "upload" | "mixed")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ai">Generate all with AI</SelectItem>
                      <SelectItem value="upload">Use my uploaded photos</SelectItem>
                      <SelectItem value="mixed">Mix my photos and AI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {imageSource !== "ai" && (
                  <>
                    <label htmlFor="book-photos" className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground hover:border-primary/50">
                      <ImagePlus className="h-4 w-4" /> Add photos ({uploadedImages.length}/{requestedImageCount})
                    </label>
                    <input id="book-photos" type="file" accept="image/*" multiple className="hidden" onChange={handleBookPhotos} />
                    {uploadedImages.length > 0 && (
                      <div className="grid grid-cols-5 gap-2">
                        {uploadedImages.map((image, index) => (
                          <div key={image.name + index} className="relative aspect-square overflow-hidden rounded-md border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={image.data} alt="Selected book artwork" className="h-full w-full object-cover" />
                            <button type="button" aria-label={`Remove ${image.name}`} onClick={() => setUploadedImages((current) => current.filter((_, i) => i !== index))} className="absolute right-1 top-1 rounded-full bg-black/65 p-1 text-white"><X className="h-3 w-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    {imageSource === "upload" && uploadedImages.length !== Number(requestedImageCount) && <p className="text-xs text-amber-700">Add all {requestedImageCount} selected photos before creating your book.</p>}
                  </>
                )}
              </div>}
              <div className="space-y-4 sm:col-span-2 rounded-xl border bg-card p-4">
                <div><Label>Cover copy (optional)</Label><p className="mt-1 text-xs text-muted-foreground">Add up to 100 words to display on each cover. You can edit this later in Cover Studio.</p></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label htmlFor="front-copy">Front cover</Label><Textarea id="front-copy" value={frontCoverCopy} onChange={(e) => setFrontCoverCopy(e.target.value)} placeholder="A short line, dedication, or tagline" className="min-h-24" /><p className="text-right text-xs text-muted-foreground">{coverWords(frontCoverCopy)}/100 words</p></div>
                  <div className="space-y-1.5"><Label htmlFor="back-copy">Back cover</Label><Textarea id="back-copy" value={backCoverCopy} onChange={(e) => setBackCoverCopy(e.target.value)} placeholder="A short book description or author note" className="min-h-24" /><p className="text-right text-xs text-muted-foreground">{coverWords(backCoverCopy)}/100 words</p></div>
                </div>
              </div>
              {!isFreePlan && <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="reference-image">Reference image (optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Upload a character, photo, or style reference and the AI will use it when generating your cover and
                  illustrations.
                </p>
                {referenceImage ? (
                  <div className="mt-2 flex items-center gap-3 rounded-lg border p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={referenceImage} alt="Reference" className="h-16 w-16 rounded-md object-cover" />
                    <span className="flex-1 truncate text-sm text-muted-foreground">{referenceImageName}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setReferenceImage(null)
                        setReferenceImageName(null)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label
                    htmlFor="reference-image"
                    className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground hover:border-primary/50"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Upload an image
                  </label>
                )}
                <input
                  id="reference-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleReferenceImageChange}
                />
              </div>}
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
            <Button variant="gold" onClick={() => {
              if (imageSource === "upload" && uploadedImages.length !== Number(requestedImageCount)) return toast.error(`Please add ${requestedImageCount} photos or choose a mixed/AI option.`)
              if (coverWords(frontCoverCopy) > 100 || coverWords(backCoverCopy) > 100) return toast.error("Cover copy must be 100 words or fewer.")
              handleCreate()
            }} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Create My Book
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
