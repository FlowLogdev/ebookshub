import { NextResponse } from "next/server"
import { z } from "zod"

import { appUrl, getStripe, STRIPE_PRICE_IDS } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"

const Schema = z.object({ plan: z.enum(["creator", "pro"]) })

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Please sign in before choosing a plan." }, { status: 401 })

  const parsed = Schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Choose Creator or Pro." }, { status: 400 })
  const price = STRIPE_PRICE_IDS[parsed.data.plan]
  if (!price || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Billing is not configured yet." }, { status: 503 })
  const stripe = getStripe()

  const { data: profile, error: profileError } = await supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).single()
  if (profileError || !profile) return NextResponse.json({ error: "Could not load your account." }, { status: 500 })

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: profile.stripe_customer_id ?? undefined,
    customer_email: profile.stripe_customer_id ? undefined : user.email ?? undefined,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${appUrl()}/dashboard?billing=success`,
    cancel_url: `${appUrl()}/#pricing`,
    subscription_data: { metadata: { user_id: user.id, plan_id: parsed.data.plan } },
    metadata: { user_id: user.id, plan_id: parsed.data.plan },
  })
  if (!session.url) return NextResponse.json({ error: "Could not open checkout." }, { status: 500 })
  return NextResponse.json({ url: session.url })
}
