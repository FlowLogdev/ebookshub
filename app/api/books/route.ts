import { NextResponse } from "next/server"
import { z } from "zod"

import { FREE_TIER_MAX_PAGES, MAX_PAGE_COUNT, MIN_PAGE_COUNT } from "@/lib/book/constants"
import { enqueueBlueprintJob } from "@/lib/jobs/create-jobs"
import { claimFreeTierSlot, isFreePlan, upgradeRequired } from "@/lib/plans/free-tier"
import { createClient } from "@/lib/supabase/server"

const CreateBookSchema = z.object({
  prompt: z.string().min(10, "Tell us a bit more about the book you'd like to create."),
  bookType: z.string().min(1),
  language: z.string().default("en"),
  pageCountTarget: z.number().int().min(MIN_PAGE_COUNT).max(MAX_PAGE_COUNT),
  targetAudience: z.string().optional(),
  tone: z.string().optional(),
  authorName: z.string().optional(),
  imageStyle: z.string().optional(),
  illustrationFrequency: z.string().optional(),
  dimensions: z.string().optional(),
  requestedImageCount: z.number().int().min(0).max(10).default(1),
  imageSource: z.enum(["ai", "upload", "mixed"]).default("ai"),
  uploadedImages: z.array(z.string().regex(/^data:image\/[a-z0-9.+-]+;base64,/i, "uploadedImages must contain image data URIs")).max(10).default([]),
  frontCoverCopy: z.string().max(800).optional(),
  backCoverCopy: z.string().max(800).optional(),
  /** Base64 data URI, e.g. "data:image/png;base64,...". Used to condition cover/illustration generation — see lib/ai/image-provider.ts. */
  referenceImage: z.string().regex(/^data:image\/[a-z0-9.+-]+;base64,/i, "referenceImage must be an image data URI").optional(),
})

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  // books<->covers has two FK paths (covers.book_id, and books.selected_cover_id
  // pointing back at covers.id) — PostgREST can't auto-disambiguate a bare
  // `covers(...)` embed once both exist, so the FK constraint name pins it to
  // the "this book's covers" relationship, not the "selected cover" one.
  const { data: books, error } = await supabase
    .from("books")
    .select("*, covers!covers_book_id_fkey(id, image_url, is_selected)")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ books })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = CreateBookSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 })
  }
  const input = parsed.data
  const wordCount = (value: string | undefined) => value?.trim() ? value.trim().split(/\s+/).length : 0
  if (wordCount(input.frontCoverCopy) > 100 || wordCount(input.backCoverCopy) > 100) {
    return NextResponse.json({ error: "Cover copy must be 100 words or fewer." }, { status: 400 })
  }
  if (input.uploadedImages.length > input.requestedImageCount) {
    return NextResponse.json({ error: "Upload no more photos than the number of picture slots you selected." }, { status: 400 })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan_id, free_ebook_used_at")
    .eq("id", user.id)
    .single()
  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message ?? "Failed to load account." }, { status: 500 })
  }

  const freeTier = isFreePlan(profile)
  if (freeTier) {
    if (input.requestedImageCount > 0 || input.uploadedImages.length > 0 || input.referenceImage) {
      return NextResponse.json(upgradeRequired("The Free plan is text-only. Upgrade to add cover or chapter images."), { status: 403 })
    }
    const claimed = await claimFreeTierSlot(supabase, user.id)
    if (!claimed) {
      return NextResponse.json(
        upgradeRequired("You've already used your free ebook. Upgrade to create another one."),
        { status: 403 },
      )
    }
  }

  const { data: book, error } = await supabase
    .from("books")
    .insert({
      owner_id: user.id,
      title: "Untitled Book",
      author_name: input.authorName ?? null,
      book_type: input.bookType,
      language: input.language,
      target_audience: input.targetAudience ?? null,
      tone: input.tone ?? null,
      page_count_target: freeTier ? Math.min(input.pageCountTarget, FREE_TIER_MAX_PAGES) : input.pageCountTarget,
      image_style: input.imageStyle ?? null,
      illustration_frequency: input.illustrationFrequency ?? null,
      dimensions: input.dimensions ?? "6x9",
      source_prompt: input.prompt,
      status: "draft",
      is_free_tier: freeTier,
      reference_image_url: input.referenceImage ?? null,
      requested_image_count: freeTier ? 0 : input.requestedImageCount,
      image_source: freeTier ? "ai" : input.imageSource,
      front_cover_copy: input.frontCoverCopy?.trim() || null,
      back_cover_copy: input.backCoverCopy?.trim() || null,
    })
    .select()
    .single()

  if (error || !book) {
    // Best-effort: don't strand the user's one-time free slot on a failed insert.
    if (freeTier) await supabase.from("profiles").update({ free_ebook_used_at: null }).eq("id", user.id)
    return NextResponse.json({ error: error?.message ?? "Failed to create book." }, { status: 500 })
  }

  if (input.uploadedImages.length) {
    const { error: imageError } = await supabase.from("images").insert(
      input.uploadedImages.map((url, slotIndex) => ({
        book_id: book.id,
        url,
        source: "upload" as const,
        slot_index: slotIndex,
        style: "User photo",
        status: "complete",
      })),
    )
    if (imageError) {
      await supabase.from("books").delete().eq("id", book.id)
      if (freeTier) await supabase.from("profiles").update({ free_ebook_used_at: null }).eq("id", user.id)
      return NextResponse.json({ error: imageError.message }, { status: 500 })
    }
  }

  try {
    const job = await enqueueBlueprintJob(supabase, book)
    return NextResponse.json({ book, jobId: job.id })
  } catch (err) {
    return NextResponse.json(
      { book, error: err instanceof Error ? err.message : "Failed to queue blueprint generation." },
      { status: 207 },
    )
  }
}
