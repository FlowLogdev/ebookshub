import { NextResponse } from "next/server"

import { buildAuthorizationUrl, generatePkcePair, generateState } from "@/lib/canva/oauth"
import { createClient } from "@/lib/supabase/server"

const PKCE_COOKIE = "canva_oauth_pkce"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const { codeVerifier, codeChallenge } = generatePkcePair()
  const state = generateState()
  const authorizationUrl = buildAuthorizationUrl({ codeChallenge, state })

  const response = NextResponse.redirect(authorizationUrl)
  response.cookies.set(PKCE_COOKIE, JSON.stringify({ codeVerifier, state }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // the flow must complete within 10 minutes
    path: "/api/canva",
  })
  return response
}
