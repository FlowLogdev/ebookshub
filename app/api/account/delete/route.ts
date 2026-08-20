import { NextResponse } from "next/server"

import { sendEmail, SUPPORT_EMAIL } from "@/lib/email"
import { getStripe } from "@/lib/stripe"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"

/**
 * Permanently deletes the signed-in user's account. Cancels any live Stripe
 * subscription first (so billing stops even if the delete itself fails
 * partway), then deletes the auth user via the admin API — `profiles`,
 * `books`, and everything else FK'd to auth.users(id) with ON DELETE CASCADE
 * goes with it. Irreversible; the client is responsible for a confirmation
 * step before calling this.
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id, display_name")
    .eq("id", user.id)
    .single()

  if (profile?.stripe_subscription_id) {
    try {
      await getStripe().subscriptions.cancel(profile.stripe_subscription_id)
    } catch (err) {
      console.error(`Failed to cancel Stripe subscription during account deletion for ${user.id}:`, err)
    }
  }

  const admin = createServiceRoleClient()
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `Account deleted: ${user.email}`,
    html: `
      <p><strong>User:</strong> ${profile?.display_name ?? "(no display name)"} — ${user.email}</p>
      <p><strong>User ID:</strong> ${user.id}</p>
      <p><strong>Deleted at:</strong> ${new Date().toISOString()}</p>
      <p><strong>Had active subscription:</strong> ${profile?.stripe_subscription_id ? "Yes — canceled" : "No"}</p>
    `,
  })

  return NextResponse.json({ ok: true })
}
