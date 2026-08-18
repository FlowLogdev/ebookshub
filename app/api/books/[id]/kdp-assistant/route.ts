import { NextResponse } from "next/server"
import { z } from "zod"

import { chatWithKdpAssistant, type KdpChatMessage } from "@/lib/ai/kdp-assistant"
import type { BookConcept } from "@/lib/book/schemas"
import { isProPlan, upgradeRequired } from "@/lib/plans/free-tier"
import { createClient } from "@/lib/supabase/server"

const ChatSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1) }))
    .min(1)
    .max(40),
})

/**
 * Pro-tier "publish on Amazon Kindle" chat assistant — guided help only
 * (Amazon has no public KDP upload API), see lib/ai/kdp-assistant.ts.
 * Stateless: the client holds the conversation and resends it each turn,
 * same pattern as a typical chat UI — no message history is persisted server-side.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const { data: profile, error: profileError } = await supabase.from("profiles").select("plan_id").eq("id", user.id).single()
  if (profileError || !profile) return NextResponse.json({ error: profileError?.message ?? "Failed to load account." }, { status: 500 })
  if (!isProPlan(profile)) {
    return NextResponse.json(upgradeRequired("The Kindle publishing assistant is a Pro plan feature. Upgrade to use it."), { status: 403 })
  }

  const parsed = ChatSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 })

  const [{ data: book, error: bookError }, { data: blueprint }] = await Promise.all([
    supabase.from("books").select("*").eq("id", id).single(),
    supabase.from("book_blueprints").select("concept").eq("book_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ])
  if (bookError || !book) return NextResponse.json({ error: "Book not found." }, { status: 404 })

  const concept = (blueprint?.concept ?? {}) as Partial<BookConcept>

  try {
    const reply = await chatWithKdpAssistant(parsed.data.messages as KdpChatMessage[], {
      title: book.title,
      subtitle: book.subtitle,
      genre: book.genre,
      description: concept.description ?? null,
      targetAudience: book.target_audience,
      pageCountTarget: book.page_count_target,
      keywords: concept.keywords,
      categories: concept.categories,
    })
    return NextResponse.json({ reply })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "The assistant failed to respond." }, { status: 500 })
  }
}
