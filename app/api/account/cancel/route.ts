import { NextResponse } from "next/server"

import { sendEmail, SUPPORT_EMAIL } from "@/lib/email"
import { getStripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"

const REFUND_WINDOW_DAYS = 7

/**
 * Cancels a user's membership. Two things happen on every call, regardless
 * of billing timing:
 *  1. profiles.account_canceled_at is set immediately — this is what
 *     middleware checks to gate dashboard access, independent of Stripe's
 *     own subscription_status (which can stay "active" until the period
 *     actually ends for a cancel_at_period_end subscription). The product
 *     requirement is access lost right away, not at period end.
 *  2. Stripe is told to stop billing: canceled immediately if within the
 *     7-day refund window (a human then issues the actual refund — see
 *     lib/email.ts notification below), otherwise set to not renew
 *     (cancel_at_period_end) so the current paid period isn't clawed back.
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("stripe_subscription_id, subscription_started_at, display_name, plan_id")
    .eq("id", user.id)
    .single()
  if (profileError || !profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 })
  if (!profile.stripe_subscription_id) return NextResponse.json({ error: "No active subscription to cancel." }, { status: 400 })

  const startedAt = profile.subscription_started_at ? new Date(profile.subscription_started_at) : null
  const daysSinceStart = startedAt ? (Date.now() - startedAt.getTime()) / (1000 * 60 * 60 * 24) : Infinity
  const refundEligible = daysSinceStart <= REFUND_WINDOW_DAYS

  try {
    const stripe = getStripe()
    if (refundEligible) {
      await stripe.subscriptions.cancel(profile.stripe_subscription_id)
    } else {
      await stripe.subscriptions.update(profile.stripe_subscription_id, { cancel_at_period_end: true })
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to cancel with Stripe." }, { status: 500 })
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ account_canceled_at: new Date().toISOString() })
    .eq("id", user.id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `Membership canceled: ${user.email}`,
    html: `
      <p><strong>User:</strong> ${profile.display_name ?? "(no display name)"} — ${user.email}</p>
      <p><strong>User ID:</strong> ${user.id}</p>
      <p><strong>Plan:</strong> ${profile.plan_id}</p>
      <p><strong>Canceled at:</strong> ${new Date().toISOString()}</p>
      <p><strong>Refund eligible (within 7 days):</strong> ${refundEligible ? "YES — process refund manually" : "No"}</p>
      <p><strong>Stripe action taken:</strong> ${refundEligible ? "Subscription canceled immediately" : "Subscription set to cancel at period end"}</p>
    `,
  })

  return NextResponse.json({ ok: true, refundEligible })
}
