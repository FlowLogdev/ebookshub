import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: "local" })
  revalidatePath("/", "layout")
  // A redirect from a form POST must switch back to GET. The default 307
  // preserves POST and makes the landing page return HTTP 405.
  return NextResponse.redirect(new URL("/", req.url), { status: 303 })
}
