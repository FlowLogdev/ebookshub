import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import type { JobType } from "@/lib/supabase/types"

const JOB_TYPES: JobType[] = ["BLUEPRINT", "FULL_BOOK", "CHAPTER", "COVER", "GLOSSARY", "PROOFREAD"]

/** Returns the most recent generation job for a book — used to resume the progress screen without a ?job= param. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const typeParam = new URL(req.url).searchParams.get("type")
  const type = JOB_TYPES.find((t) => t === typeParam)

  let query = supabase.from("generation_jobs").select("*").eq("book_id", id).order("created_at", { ascending: false }).limit(1)
  if (type) query = query.eq("job_type", type)

  const { data: job, error } = await query.maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ job })
}
