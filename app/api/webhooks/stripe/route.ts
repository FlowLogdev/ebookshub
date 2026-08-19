import { NextResponse } from "next/server"
import Stripe from "stripe"

import { getStripe } from "@/lib/stripe"
import { createServiceRoleClient } from "@/lib/supabase/server"

function planFromSubscription(subscription: Stripe.Subscription): "creator" | "pro" | "free" {
  const plan = subscription.metadata.plan_id
  return plan === "creator" || plan === "pro" ? plan : "free"
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature")
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "Missing webhook signature." }, { status: 400 })

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(await req.text(), signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { error: insertError } = await supabase.from("stripe_webhook_events").insert({ stripe_event_id: event.id, event_type: event.type })
  if (insertError?.code === "23505") return NextResponse.json({ received: true })
  if (insertError) return NextResponse.json({ error: "Could not record webhook event." }, { status: 500 })

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.client_reference_id ?? session.metadata?.user_id
    if (userId && typeof session.customer === "string") await supabase.from("profiles").update({ stripe_customer_id: session.customer }).eq("id", userId)
  }

  if (event.type.startsWith("customer.subscription.")) {
    const subscription = event.data.object as Stripe.Subscription
    const userId = subscription.metadata.user_id
    if (userId) {
      const active = subscription.status === "active" || subscription.status === "trialing"
      await supabase.from("profiles").update({
        plan_id: active ? planFromSubscription(subscription) : "free",
        stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        subscription_current_period_end: subscription.items.data[0]?.current_period_end
          ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
          : null,
      }).eq("id", userId)
    }
  }
  return NextResponse.json({ received: true })
}
