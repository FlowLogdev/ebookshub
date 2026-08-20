import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PROTECTED_ROUTES = ["/dashboard", "/create", "/books", "/settings", "/profile"]
const AUTH_ROUTES = ["/signin", "/signup"]

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({ request: { headers: req.headers } })

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Auth isn't configured yet — let requests through so the rest of the
    // app (marketing pages, etc.) still renders during local setup.
    return response
  }

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
        response = NextResponse.next({ request: { headers: req.headers } })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, searchParams } = req.nextUrl
  const isProtected = PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route)

  if (isProtected && !user) {
    const redirectUrl = new URL("/signin", req.url)
    redirectUrl.searchParams.set("redirect", `${pathname}${req.nextUrl.search}`)
    return NextResponse.redirect(redirectUrl)
  }

  // account_canceled_at is set the instant a user cancels their membership
  // (see /api/account/cancel) — separate from Stripe's own subscription
  // status, which can stay "active" until the paid period actually ends.
  // Dashboard access is revoked right away regardless of billing timing.
  // Free-tier users never have this set, so they're unaffected.
  if (isProtected && user) {
    const { data: profile } = await supabase.from("profiles").select("account_canceled_at").eq("id", user.id).maybeSingle()
    if (profile?.account_canceled_at) return NextResponse.redirect(new URL("/account-canceled", req.url))
  }

  if (isAuthRoute && user) {
    const redirectParam = searchParams.get("redirect")
    const destination = redirectParam?.startsWith("/") ? redirectParam : "/dashboard"
    return NextResponse.redirect(new URL(destination, req.url))
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
