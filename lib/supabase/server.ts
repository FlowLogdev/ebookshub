import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import type { Database } from "@/lib/supabase/types"

/**
 * Supabase client for use in Server Components, Route Handlers, and Server
 * Actions. Reads the caller's session from cookies and enforces RLS.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from a Server Component that can't set cookies — the
          // middleware refresh path handles session persistence instead.
        }
      },
    },
  })
}

/**
 * Privileged client that bypasses Row Level Security using the service role
 * key. Server-only — never import this from a Client Component. Used by
 * background job processing and admin operations that must act across users.
 */
export function createServiceRoleClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  }

  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  })
}
