"use client"

import { useState } from "react"
import Link from "next/link"

import { PlanButton } from "@/components/billing/plan-button"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PLAN_TIERS } from "@/lib/pricing"

type BillingInterval = "monthly" | "annual"

export function PricingCards({ context = "marketing", initialBillingInterval = "monthly" }: { context?: "marketing" | "dashboard"; initialBillingInterval?: BillingInterval }) {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(initialBillingInterval)

  return (
    <>
      <div className="mt-8 flex justify-center">
        <div className="inline-flex rounded-full border bg-muted p-1 text-sm font-medium" aria-label="Billing interval">
          {(["monthly", "annual"] as const).map((interval) => (
            <button key={interval} type="button" onClick={() => setBillingInterval(interval)} className={`rounded-full px-4 py-2 transition ${billingInterval === interval ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {interval === "monthly" ? "Monthly" : "Annual"}
              {interval === "annual" && <span className="ml-1.5 text-xs text-primary">Save 2 months</span>}
            </button>
          ))}
        </div>
      </div>

      <div className={`grid gap-6 mt-6 lg:grid-cols-3`}>
        {PLAN_TIERS.map((plan) => {
          const annual = billingInterval === "annual" && plan.priceAnnual != null
          const saving = plan.priceAnnual == null ? 0 : plan.priceMonthly * 12 - plan.priceAnnual
          const price = annual ? plan.priceAnnual ?? plan.priceMonthly : plan.priceMonthly
          const contents = <PlanContents plan={plan} annual={annual} saving={saving} price={price} billingInterval={billingInterval} context={context} />
          return <div key={plan.id} className={context === "marketing" ? "" : `rounded-xl border p-5 ${plan.highlighted ? "border-gold bg-gold/5" : ""}`}>{context === "marketing" ? <Card className={`flex h-full flex-col p-8 ${plan.highlighted ? "border-gold shadow-lift ring-1 ring-gold/30" : ""}`}>{contents}</Card> : contents}</div>
        })}
      </div>
    </>
  )
}

function PlanContents({ plan, annual, saving, price, billingInterval, context }: { plan: (typeof PLAN_TIERS)[number]; annual: boolean; saving: number; price: number; billingInterval: BillingInterval; context: "marketing" | "dashboard" }) {
  return <>
    {plan.highlighted && context === "marketing" && <p className="mb-4 w-fit rounded-full bg-gold px-2.5 py-1 text-xs font-medium text-gold-foreground">Most popular</p>}
    <h3 className="font-display text-xl font-medium">{plan.name}</h3>
    <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
    <p className="mt-4"><span className={`font-display font-medium ${context === "marketing" ? "text-4xl" : "text-3xl"}`}>{plan.id === "free" ? "Free" : `$${price}`}</span>{plan.id !== "free" && <span className="text-muted-foreground"> {annual ? "/year" : "/month"}</span>}</p>
    {annual && saving > 0 && <p className="mt-1 text-sm font-medium text-primary">Save ${saving}/year — 2 months free</p>}
    <ul className={`flex-1 space-y-3 text-sm ${context === "marketing" ? "mt-6" : "mt-4"}`}>{plan.features.map((feature) => <li key={feature} className={context === "marketing" ? "flex items-start gap-2" : "text-muted-foreground"}>{context === "marketing" && <span className="mt-0.5 text-gold">✓</span>}{context === "dashboard" && "• "}{feature}</li>)}</ul>
    {plan.id === "free" && context === "dashboard" ? <Button asChild variant="outline" className="mt-8 w-full"><Link href="/create">Continue with Free</Link></Button> : <PlanButton plan={plan.id} highlighted={plan.highlighted} billingInterval={billingInterval} />}
  </>
}
