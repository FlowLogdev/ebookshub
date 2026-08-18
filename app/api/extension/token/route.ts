import { NextResponse } from "next/server"

import { mintCopilotToken } from "@/lib/copilot/token"
import { isProPlan, upgradeRequired } from "@/lib/plans/free-tier"
import { createClient } from "@/lib/supabase/server"

/**
 * Mints a short-lived token for the browser co-pilot extension. Called from
 * app/extension/connect/page.tsx, which runs in the user's normal
 * cookie-authenticated session — the extension itself never sees a password
 * or Supabase session, only this scoped, 12-hour token handed off via
 * chrome.runtime.sendMessage (see that page for the handoff).
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const { data: profile, error } = await supabase.from("profiles").select("plan_id").eq("id", user.id).single()
  if (error || !profile) return NextResponse.json({ error: error?.message ?? "Failed to load account." }, { status: 500 })
  if (!isProPlan(profile)) {
    return NextResponse.json(upgradeRequired("The browser co-pilot is a Pro plan feature. Upgrade to connect it."), { status: 403 })
  }

  const { token, expiresAt } = mintCopilotToken({ userId: user.id })
  return NextResponse.json({ token, expiresAt })
}
