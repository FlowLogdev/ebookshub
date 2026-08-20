import Link from "next/link"

import { SiteFooter } from "@/components/marketing/site-footer"
import { SiteHeader } from "@/components/marketing/site-header"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { STEPS } from "@/lib/marketing-content"

export const metadata = {
  title: "How It Works | EbooksHub",
  description: "From a one-line idea to a finished, editable, exportable book.",
}

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 bg-paper py-16 sm:py-24">
        <section className="container">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-gold">The process</p>
            <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">From idea to finished book</h1>
            <p className="mt-4 text-lg text-muted-foreground">Four steps, with a real, editable draft at every stage.</p>
          </Reveal>

          <RevealGroup className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <RevealItem key={step.title}>
                <Card className="h-full p-6">
                  <span className="font-display text-3xl text-gold">{String(i + 1).padStart(2, "0")}</span>
                  <h2 className="mt-4 font-display text-lg font-medium">{step.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
                </Card>
              </RevealItem>
            ))}
          </RevealGroup>

          <Reveal className="mt-16 text-center">
            <Button size="lg" variant="gold" asChild>
              <Link href="/signup">Create Your Book</Link>
            </Button>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
