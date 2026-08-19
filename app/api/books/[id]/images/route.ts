import { NextResponse } from "next/server"
import { z } from "zod"

import { generateImageWithFallback } from "@/lib/ai/image-provider"
import { createClient } from "@/lib/supabase/server"

const ImageRequestSchema = z
  .object({
    chapterId: z.string().uuid(),
    mode: z.enum(["upload", "generate"]),
    image: z.string().regex(/^data:image\/[a-zA-Z0-9.+-]+;base64,/).max(4_300_000).optional(),
    prompt: z.string().trim().min(5).max(1000).optional(),
  })
  .superRefine((value, context) => {
    if (value.mode === "upload" && !value.image) context.addIssue({ code: z.ZodIssueCode.custom, message: "Choose an image to upload.", path: ["image"] })
    if (value.mode === "generate" && !value.prompt) context.addIssue({ code: z.ZodIssueCode.custom, message: "Describe the image you want to create.", path: ["prompt"] })
  })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: bookId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const parsed = ImageRequestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid image request." }, { status: 400 })

  const [{ data: book, error: bookError }, { data: chapter, error: chapterError }] = await Promise.all([
    supabase.from("books").select("*").eq("id", bookId).single(),
    supabase.from("chapters").select("id, title, summary").eq("id", parsed.data.chapterId).eq("book_id", bookId).single(),
  ])
  if (bookError || !book) return NextResponse.json({ error: "Book not found." }, { status: 404 })
  if (chapterError || !chapter) return NextResponse.json({ error: "Chapter not found." }, { status: 404 })

  let url: string
  let prompt: string | null = null
  let provider: string | null = null
  if (parsed.data.mode === "upload") {
    url = parsed.data.image!
    provider = "user_upload"
  } else {
    prompt = [
      `Illustration for the chapter "${chapter.title}" in the book "${book.title}".`,
      book.genre ? `Genre: ${book.genre}.` : null,
      book.image_style ? `Art style: ${book.image_style}.` : "Art style: polished, evocative editorial illustration.",
      book.tone ? `Tone: ${book.tone}.` : null,
      chapter.summary ? `Chapter context: ${chapter.summary}.` : null,
      `Creator direction: ${parsed.data.prompt}.`,
      "No text, lettering, watermark, or logo in the image.",
    ].filter(Boolean).join(" ")
    try {
      const generated = await generateImageWithFallback({ prompt, size: "1024x1024", count: 1 })
      if (!generated.images[0]) throw new Error("No image was returned.")
      url = generated.images[0].url
      provider = generated.provider
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Image generation failed." }, { status: 500 })
    }
  }

  const { error: removeError } = await supabase.from("images").delete().eq("book_id", bookId).eq("chapter_id", chapter.id)
  if (removeError) return NextResponse.json({ error: removeError.message }, { status: 500 })

  const { data: image, error: insertError } = await supabase
    .from("images")
    .insert({
      book_id: bookId,
      chapter_id: chapter.id,
      url,
      prompt,
      style: parsed.data.mode === "upload" ? "User photo" : book.image_style,
      aspect_ratio: "1:1",
      provider,
      source: parsed.data.mode === "upload" ? "upload" : "ai",
      status: "complete",
    })
    .select()
    .single()
  if (insertError || !image) return NextResponse.json({ error: insertError?.message ?? "Unable to save image." }, { status: 500 })

  return NextResponse.json({ image })
}
