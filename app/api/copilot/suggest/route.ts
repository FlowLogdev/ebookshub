import { NextResponse } from "next/server"
import { z } from "zod"

import { getCopilotSuggestion } from "@/lib/ai/copilot-vision"
import { verifyCopilotToken } from "@/lib/copilot/token"
import { isProPlan, upgradeRequired } from "@/lib/plans/free-tier"
import { createServiceRoleClient } from "@/lib/supabase/server"

// Called cross-origin from the extension's side panel (a chrome-extension://
// page, not this site) — CORS headers are required even though Chrome
// grants the extension host permission to reach this API, because the
// response still needs to explicitly allow the extension's origin.
const CORS_HEADERS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" }

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS })
}

const SuggestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1) }))
    .min(1)
    .max(30),
  page: z.object({
    url: z.string().url(),
    title: z.string(),
    screenshot: z.string().startsWith("data:image/").optional(),
    pageText: z.string().optional(),
  }),
  bookId: z.string().uuid().optional(),
})

/**
 * Serves the browser co-pilot extension (Pro plan). Unlike every other
 * route in this app, the caller here is the extension's service worker —
 * it has no cookies for this site, so auth comes from a bearer token
 * minted by app/api/extension/token/route.ts (see lib/copilot/token.ts)
 * instead of the usual cookie-based Supabase session.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null
  if (!token) return json({ error: "Missing bearer token." }, 401)

  let userId: string
  try {
    ;({ userId } = verifyCopilotToken(token))
  } catch {
    return json({ error: "Invalid or expired connection. Reconnect the extension." }, 401)
  }

  const parsed = SuggestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, 400)
  const input = parsed.data

  const supabase = createServiceRoleClient()
  const { data: profile, error: profileError } = await supabase.from("profiles").select("plan_id").eq("id", userId).single()
  if (profileError || !profile) return json({ error: profileError?.message ?? "Account not found." }, 404)
  if (!isProPlan(profile)) {
    return json(upgradeRequired("The browser co-pilot is a Pro plan feature. Upgrade to keep using it."), 403)
  }

  let book: { title: string; genre: string | null; targetAudience: string | null } | null = null
  if (input.bookId) {
    const { data } = await supabase
      .from("books")
      .select("title, genre, target_audience")
      .eq("id", input.bookId)
      .eq("owner_id", userId)
      .maybeSingle()
    if (data) book = { title: data.title, genre: data.genre, targetAudience: data.target_audience }
  }

  try {
    const reply = await getCopilotSuggestion(input.messages, input.page, book)
    return json({ reply })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "The co-pilot failed to respond." }, 500)
  }
}
