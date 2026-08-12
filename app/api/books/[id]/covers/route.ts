import { NextResponse } from "next/server"
import { z } from "zod"

import { generateImageWithFallback } from "@/lib/ai/image-provider"
import { createClient } from "@/lib/supabase/server"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const { data: covers, error } = await supabase
    .from("covers")
    .select("*")
    .eq("book_id", id)
    .order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ covers: covers ?? [] })
}

/**
 * Generates 4 cover concepts (spec section 12) via the image provider
 * fallback chain — Gemini first, then Higgsfield, then OpenAI gpt-image-1
 * (see lib/ai/image-provider.ts). All 4 come from whichever provider
 * actually succeeded, so the concepts stay stylistically consistent.
 * Images are stored inline as data: URIs (or hosted URLs, provider-
 * dependent) for now; moving them to object storage (Supabase Storage /
 * S3) is a follow-up (spec section 43) that only touches this route.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const { data: book, error: bookError } = await supabase.from("books").select("*").eq("id", id).single()
  if (bookError || !book) return NextResponse.json({ error: "Book not found." }, { status: 404 })

  const StyleOverride = z.object({ styleNote: z.string().optional() }).optional()
  const parsed = StyleOverride.safeParse(await req.json().catch(() => ({})))
  const styleNote = parsed.success ? parsed.data?.styleNote : undefined

  const prompt = [
    `Front book cover illustration for "${book.title}"${book.subtitle ? `: ${book.subtitle}` : ""}.`,
    book.genre ? `Genre: ${book.genre}.` : null,
    book.image_style ? `Art style: ${book.image_style}.` : "Art style: premium, warm, editorial storybook illustration.",
    book.tone ? `Tone: ${book.tone}.` : null,
    styleNote ?? null,
    "Composition: portrait orientation, title-safe negative space near the top third, no embedded text or typography — the title will be added separately. Professional, publishable quality.",
  ]
    .filter(Boolean)
    .join(" ")

  try {
    const { images, provider } = await generateImageWithFallback({ prompt, size: "1024x1536", count: 4 })

    const { data: covers, error } = await supabase
      .from("covers")
      .insert(images.map((img) => ({ book_id: id, image_url: img.url, prompt, style: book.image_style, provider })))
      .select()
    if (error) throw error

    return NextResponse.json({ covers, provider })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Cover generation failed." }, { status: 500 })
  }
}
