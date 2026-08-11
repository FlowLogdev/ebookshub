import { NextResponse } from "next/server"

import { enqueueBlueprintJob } from "@/lib/jobs/create-jobs"
import { createClient } from "@/lib/supabase/server"

/** Throws away the current outline and plans a fresh one from the original prompt (spec section 3). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const { data: book, error } = await supabase.from("books").select("*").eq("id", id).single()
  if (error || !book) return NextResponse.json({ error: error?.message ?? "Book not found." }, { status: 404 })

  await supabase.from("chapters").delete().eq("book_id", id)
  await supabase.from("book_blueprints").delete().eq("book_id", id)
  await supabase.from("books").update({ status: "draft" }).eq("id", id)

  const job = await enqueueBlueprintJob(supabase, { ...book, status: "draft" })
  return NextResponse.json({ jobId: job.id })
}
