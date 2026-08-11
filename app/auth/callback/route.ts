import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

/** Handles both OAuth redirects and email confirmation links (Supabase PKCE code exchange). */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const redirect = url.searchParams.get("redirect")
  const destination = redirect?.startsWith("/") ? redirect : "/dashboard"

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL(destination, url.origin))
}
