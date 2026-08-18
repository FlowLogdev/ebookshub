import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { saveConnection } from "@/lib/canva/client"
import { exchangeCodeForTokens } from "@/lib/canva/oauth"
import { createClient } from "@/lib/supabase/server"

const PKCE_COOKIE = "canva_oauth_pkce"

function redirectWithStatus(req: Request, status: "connected" | "error", detail?: string) {
  const url = new URL("/dashboard", req.url)
  url.searchParams.set("canva", status)
  if (detail) url.searchParams.set("canva_detail", detail)
  const response = NextResponse.redirect(url)
  response.cookies.delete(PKCE_COOKIE)
  return response
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const oauthError = searchParams.get("error")
  if (oauthError) return redirectWithStatus(req, "error", oauthError)
  if (!code || !state) return redirectWithStatus(req, "error", "missing_code_or_state")

  const cookieStore = await cookies()
  const pkceCookie = cookieStore.get(PKCE_COOKIE)?.value
  if (!pkceCookie) return redirectWithStatus(req, "error", "expired_or_missing_session")

  let saved: { codeVerifier: string; state: string }
  try {
    saved = JSON.parse(pkceCookie)
  } catch {
    return redirectWithStatus(req, "error", "invalid_session")
  }

  if (saved.state !== state) return redirectWithStatus(req, "error", "state_mismatch")

  try {
    const tokens = await exchangeCodeForTokens({ code, codeVerifier: saved.codeVerifier })
    await saveConnection(user.id, tokens)
  } catch (err) {
    console.error("Canva token exchange failed", err)
    return redirectWithStatus(req, "error", "token_exchange_failed")
  }

  return redirectWithStatus(req, "connected")
}
