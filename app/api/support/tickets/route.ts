import { NextResponse } from "next/server"
import { z } from "zod"

import { createSupportTicket } from "@/lib/support/tickets"
import { createClient } from "@/lib/supabase/server"

const TicketSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
})

/** Opens a support ticket. Works for both signed-in and anonymous visitors. */
export async function POST(req: Request) {
  const parsed = TicketSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  try {
    const { ticketNumber } = await createSupportTicket({ userId: user?.id ?? null, ...parsed.data })
    return NextResponse.json({ ticketNumber })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to open ticket." }, { status: 500 })
  }
}
