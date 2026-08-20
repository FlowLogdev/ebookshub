import { PricingCards } from "@/components/billing/pricing-cards"
import { SiteFooter } from "@/components/marketing/site-footer"
import { SiteHeader } from "@/components/marketing/site-header"

export const metadata = {
  title: "Pricing | EbooksHub",
  description: "Choose a plan for your AI book creation studio.",
}

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 bg-paper py-16 sm:py-24">
        <section className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-gold">Simple, flexible plans</p>
            <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">Make your next book</h1>
            <p className="mt-4 text-lg text-muted-foreground">Start free, then upgrade when you are ready for longer books, illustrations, and exports.</p>
          </div>
          <PricingCards />
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
