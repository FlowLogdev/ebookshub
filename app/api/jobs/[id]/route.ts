import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const [{ data: job, error }, { data: tasks }] = await Promise.all([
    supabase.from("generation_jobs").select("*").eq("id", id).single(),
    supabase.from("generation_tasks").select("*").eq("job_id", id).order("order_index", { ascending: true }),
  ])

  if (error || !job) return NextResponse.json({ error: error?.message ?? "Job not found." }, { status: 404 })
  return NextResponse.json({ job, tasks: tasks ?? [] })
}
