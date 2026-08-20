import Link from "next/link"

import { SiteFooter } from "@/components/marketing/site-footer"
import { SiteHeader } from "@/components/marketing/site-header"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CAPABILITIES } from "@/lib/marketing-content"

export const metadata = {
  title: "Capabilities | EbooksHub",
  description: "What EbooksHub actually does for whole books, not just snippets.",
}

export default function CapabilitiesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 bg-paper py-16 sm:py-24">
        <section className="container">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-gold">Under the hood</p>
            <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">Built for whole books, not snippets</h1>
            <p className="mt-4 text-lg text-muted-foreground">The parts that make a 200-page project actually hold together.</p>
          </Reveal>

          <RevealGroup className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((cap) => (
              <RevealItem key={cap.title} className={cap.featured ? "sm:col-span-2" : undefined}>
                <Card
                  className={
                    "flex h-full flex-col p-6 " +
                    (cap.featured
                      ? "bg-gradient-to-br from-zinc-900 to-zinc-800 text-white sm:flex-row sm:items-center sm:gap-8"
                      : cap.tinted
                        ? "bg-gold/10"
                        : "")
                  }
                >
                  <div>
                    <div
                      className={
                        "flex h-10 w-10 items-center justify-center rounded-lg " +
                        (cap.featured ? "bg-white/10 text-gold" : "bg-gold/15 text-gold")
                      }
                    >
                      <cap.icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 font-display text-lg font-medium">{cap.title}</h2>
                    <p className={"mt-2 text-sm " + (cap.featured ? "text-white/70" : "text-muted-foreground")}>{cap.body}</p>
                  </div>
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
