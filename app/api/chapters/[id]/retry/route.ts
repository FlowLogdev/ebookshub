import { NextResponse } from "next/server"

import { enqueueChapterRetry } from "@/lib/jobs/create-jobs"
import { createClient } from "@/lib/supabase/server"

/** Regenerates a single chapter without touching the rest of the book (spec section 31). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: chapterId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const { data: chapter, error: chapterError } = await supabase
    .from("chapters")
    .select("book_id")
    .eq("id", chapterId)
    .single()
  if (chapterError || !chapter) return NextResponse.json({ error: "Chapter not found." }, { status: 404 })

  const { data: book, error: bookError } = await supabase.from("books").select("*").eq("id", chapter.book_id).single()
  if (bookError || !book) return NextResponse.json({ error: "Book not found." }, { status: 404 })

  const job = await enqueueChapterRetry(supabase, book, chapterId)
  return NextResponse.json({ jobId: job.id })
}
