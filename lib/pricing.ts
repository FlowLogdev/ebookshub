// Display copy for the plan tiers. Keep in sync with the seeded rows in
// supabase/migrations/0002_seed_plans.sql — that table is the source of
// truth once Stripe billing is wired up (spec section 39); this constant
// just lets marketing pages render pricing without a DB round trip.

export interface PlanDisplay {
  id: "free" | "creator" | "pro"
  name: string
  priceMonthly: number
  tagline: string
  features: string[]
  highlighted?: boolean
}

export const PLAN_TIERS: PlanDisplay[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    tagline: "Try the full pipeline on a short book.",
    features: ["1 active project", "Books up to 30 pages", "Standard AI writing", "Watermarked export"],
  },
  {
    id: "creator",
    name: "Creator",
    priceMonthly: 19,
    tagline: "For regular writers and illustrators.",
    features: ["Unlimited projects", "Books up to 150 pages", "Character creator & consistency", "PDF & ePub export, no watermark"],
    highlighted: true,
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 49,
    tagline: "Full-length, professional projects.",
    features: ["Books up to 300 pages", "Premium image models", "Priority generation", "Commercial export rights"],
  },
]
