import { NextResponse } from "next/server"
import { z } from "zod"

import { MAX_PAGE_COUNT, MIN_PAGE_COUNT } from "@/lib/book/constants"
import { enqueueBlueprintJob } from "@/lib/jobs/create-jobs"
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
})

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const { data: books, error } = await supabase
    .from("books")
    .select("*, covers(id, image_url, is_selected)")
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
      page_count_target: input.pageCountTarget,
      image_style: input.imageStyle ?? null,
      illustration_frequency: input.illustrationFrequency ?? null,
      dimensions: input.dimensions ?? "6x9",
      source_prompt: input.prompt,
      status: "draft",
    })
    .select()
    .single()

  if (error || !book) {
    return NextResponse.json({ error: error?.message ?? "Failed to create book." }, { status: 500 })
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
