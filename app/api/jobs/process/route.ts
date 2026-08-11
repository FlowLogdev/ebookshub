import { NextResponse } from "next/server"
import { z } from "zod"

import { processNextTask } from "@/lib/jobs/worker"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"

const BodySchema = z.object({ jobId: z.string().uuid() })

/**
 * Claims and executes one pending task for a generation job. No external
 * queue runs this automatically in Phase 1 — see README.md for the two
 * ways it gets called:
 *
 *  1. The book progress screen (app/books/[id]/generating) polls this
 *     while mounted, authenticated as the book's owner.
 *  2. An optional scheduled call (cron, uptime pinger, etc.) can hit this
 *     with `x-ebookshub-worker-secret: $JOB_WORKER_SECRET` to keep jobs
 *     moving even when nobody has the tab open.
 *
 * Swapping in a real queue (BullMQ/Redis) later means pointing a worker
 * process at processNextTask() instead of this route — the task/job state
 * machine in lib/jobs/worker.ts doesn't change.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "jobId is required." }, { status: 400 })

  const workerSecret = req.headers.get("x-ebookshub-worker-secret")
  const isWorker = Boolean(process.env.JOB_WORKER_SECRET) && workerSecret === process.env.JOB_WORKER_SECRET

  if (isWorker) {
    const supabase = createServiceRoleClient()
    const result = await processNextTask(supabase, parsed.data.jobId)
    return NextResponse.json(result)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  // RLS ("generation_jobs: via book ownership") makes this a no-op 404 if
  // the job doesn't belong to a book this user owns.
  const { data: job } = await supabase.from("generation_jobs").select("id").eq("id", parsed.data.jobId).maybeSingle()
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 })

  const result = await processNextTask(supabase, parsed.data.jobId)
  return NextResponse.json(result)
}
