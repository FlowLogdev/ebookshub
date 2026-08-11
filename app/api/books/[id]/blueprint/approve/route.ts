import { NextResponse } from "next/server"

import { enqueueFullBookJob } from "@/lib/jobs/create-jobs"
import { createClient } from "@/lib/supabase/server"

/** Approves the current blueprint and starts writing every chapter (spec sections 3 & 6). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const { data: book, error: bookError } = await supabase.from("books").select("*").eq("id", id).single()
  if (bookError || !book) return NextResponse.json({ error: bookError?.message ?? "Book not found." }, { status: 404 })

  const { data: blueprint } = await supabase
    .from("book_blueprints")
    .select("id")
    .eq("book_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!blueprint) return NextResponse.json({ error: "This book doesn't have a blueprint yet." }, { status: 400 })

  await supabase.from("book_blueprints").update({ approved: true }).eq("id", blueprint.id)
  await supabase.from("books").update({ status: "generating" }).eq("id", id)

  const job = await enqueueFullBookJob(supabase, { ...book, status: "generating" })
  return NextResponse.json({ jobId: job.id })
}
