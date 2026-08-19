import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-07-29.dahlia",
  typescript: true,
})

export const STRIPE_PRICE_IDS = {
  creator: process.env.STRIPE_PRICE_CREATOR_MONTHLY,
  pro: process.env.STRIPE_PRICE_PRO_MONTHLY,
} as const

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.ebookhubs.com").replace(/\/$/, "")
}
