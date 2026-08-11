import { NextResponse } from "next/server"
import { z } from "zod"

import { runWritingAssistant, WRITING_ASSISTANT_ACTIONS } from "@/lib/ai/writing-assistant"
import { createClient } from "@/lib/supabase/server"

const AssistSchema = z.object({
  action: z.enum(Object.keys(WRITING_ASSISTANT_ACTIONS) as [keyof typeof WRITING_ASSISTANT_ACTIONS]),
  text: z.string().min(1, "Select some text or write a draft first."),
  instructions: z.string().optional(),
})

/** Runs an AI writing-assistant action against a passage. Read-only — the client decides whether to apply the result. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = AssistSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const { data: chapter } = await supabase.from("chapters").select("content").eq("id", id).maybeSingle()
  if (!chapter) return NextResponse.json({ error: "Chapter not found." }, { status: 404 })

  try {
    const result = await runWritingAssistant({
      action: parsed.data.action,
      text: parsed.data.text,
      instructions: parsed.data.instructions,
      surroundingContext: chapter.content?.slice(0, 4000),
    })
    return NextResponse.json({ result })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI assist failed." }, { status: 500 })
  }
}
