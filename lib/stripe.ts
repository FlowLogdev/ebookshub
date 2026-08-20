import Stripe from "stripe"

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured")
  return new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia", typescript: true })
}

export const STRIPE_PRICE_IDS = {
  creator: {
    monthly: process.env.STRIPE_PRICE_CREATOR_MONTHLY,
    annual: process.env.STRIPE_PRICE_CREATOR_ANNUAL,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
  },
} as const

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.ebookhubs.com").replace(/\/$/, "")
}
