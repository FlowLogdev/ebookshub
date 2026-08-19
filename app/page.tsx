import Link from "next/link"
import {
  BookMarked,
  Check,
  Feather,
  Fingerprint,
  Globe2,
  Image as ImageIcon,
  Layers,
  Sparkles,
} from "lucide-react"

import { BookStack } from "@/components/marketing/book-stack"
import { SiteFooter } from "@/components/marketing/site-footer"
import { SiteHeader } from "@/components/marketing/site-header"
import { AnimatedStat } from "@/components/motion/counter"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { BOOK_TYPES, MAX_PAGE_COUNT, MIN_PAGE_COUNT } from "@/lib/book/constants"
import { PLAN_TIERS } from "@/lib/pricing"
import { PlanButton } from "@/components/billing/plan-button"

const STATS = [
  { value: "5-300", label: "pages per book" },
  { value: "12+", label: "languages" },
  { value: "21", label: "book types" },
]

const STEPS = [
  {
    title: "Describe your idea",
    body: "Type a sentence or a detailed brief. EbooksHub infers genre, audience, tone, and structure from plain language.",
  },
  {
    title: "Review the blueprint",
    body: "See exactly how your page count breaks down: front matter, every chapter, back matter, before anything is written.",
  },
  {
    title: "Watch it get written",
    body: "Chapters are planned, written, and checked for continuity one at a time, with progress you can step away from and return to.",
  },
  {
    title: "Edit, preview, export",
    body: "Fine-tune any page, regenerate a single chapter or cover, then export a print-ready PDF or ePub.",
  },
]

const CAPABILITIES = [
  {
    icon: Layers,
    title: "Page-accurate blueprints",
    body: "Pick anywhere from 5 to 300 pages. EbooksHub plans front matter, chapters, and back matter to fit, never padded with filler.",
    featured: true,
  },
  {
    icon: Fingerprint,
    title: "Long-form consistency",
    body: "A running Book Bible tracks characters, places, and established facts so chapter 40 still agrees with chapter 4.",
  },
  {
    icon: ImageIcon,
    title: "Illustration & covers",
    body: "Generate cover concepts and page art in a consistent style, grounded in your characters and setting.",
    tinted: true,
  },
  {
    icon: Feather,
    title: "In-editor rewriting",
    body: "Select any passage and continue, rewrite, expand, shorten, or adjust its tone without leaving the editor.",
  },
  {
    icon: Globe2,
    title: "Multilingual by design",
    body: "Write in 12+ languages, with structure-preserving translation for the whole book at once on the roadmap.",
  },
  {
    icon: BookMarked,
    title: "Publishing-ready exports",
    body: "PDF, ePub, and DOCX output that preserves your table of contents, chapter breaks, and page numbers.",
  },
]

const SHOWCASE = [
  { title: "The Moon That Forgot to Shine", type: "Children's Book", pages: 30 },
  { title: "The Lighthouse Beyond Time", type: "Novel", pages: 220 },
  { title: "Exploring Our Solar System", type: "Educational Book", pages: 60 },
  { title: "The Small Business AI Handbook", type: "Business Book", pages: 90 },
]

const FAQS = [
  {
    q: "How long can a book be?",
    a: `Anywhere from ${MIN_PAGE_COUNT} to ${MAX_PAGE_COUNT} pages, chosen from a preset list or a custom count. Longer books are planned and written in chapter-sized chunks, not one giant request, so quality holds up across the whole manuscript.`,
  },
  {
    q: "Do I have to accept the AI's first draft?",
    a: "No. Review and edit the blueprint before anything is written, then edit, regenerate, or rewrite any chapter, paragraph, or image afterward. Nothing is locked in.",
  },
  {
    q: "What can I export?",
    a: "Print-ready PDF, ePub, and DOCX, with your table of contents, chapter starts, and page numbers preserved. Cover-only and manuscript-only exports are also available.",
  },
  {
    q: "Who owns what I create?",
    a: "You do. EbooksHub is a tool for producing your book. The words, characters, and artwork you generate and edit are yours.",
  },
]

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-aurora" />
          <div className="container relative grid items-center gap-12 pb-20 pt-16 lg:grid-cols-2 lg:pb-28 lg:pt-24">
            <Reveal>
              <Badge variant="gold" className="mb-5">
                <Sparkles className="mr-1 h-3 w-3" /> AI book creation studio
              </Badge>
              <h1 className="font-display text-4xl font-medium leading-[1.1] tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Turn your idea into a{" "}
                <span
                  className="animate-shimmer bg-clip-text italic text-transparent [background-image:linear-gradient(110deg,hsl(var(--gold))30%,hsl(var(--gold-end))42%,#fff6dc_50%,hsl(var(--gold-end))58%,hsl(var(--gold))70%)] [background-size:220%_100%]"
                >
                  complete book
                </span>
              </h1>
              <p className="mt-6 max-w-lg text-lg text-muted-foreground text-balance">
                Describe what you want to write. EbooksHub plans the structure, writes every chapter, illustrates the
                pages, and hands you a book to edit, preview, and export.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" variant="gold" asChild className="animate-pulse-ring">
                  <Link href="/signup">Create Your Book</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#how-it-works">See How It Works</a>
                </Button>
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <BookStack />
            </Reveal>
          </div>
        </section>

        {/* Stats strip */}
        <section className="border-t border-border/60 py-10">
          <RevealGroup className="container grid grid-cols-3 gap-6 text-center">
            {STATS.map((stat) => (
              <RevealItem key={stat.label}>
                <AnimatedStat value={stat.value} />
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t border-border/60 bg-paper py-24">
          <div className="container">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">From idea to finished book</h2>
              <p className="mt-3 text-muted-foreground">Four steps, with a real, editable draft at every stage.</p>
            </Reveal>
            <RevealGroup className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <RevealItem key={step.title}>
                  <Card className="h-full p-6">
                    <span className="font-display text-3xl text-gold">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="mt-4 font-display text-lg font-medium">{step.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
                  </Card>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* Book categories */}
        <section className="border-t border-border/60 py-24">
          <div className="container">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Any kind of book</h2>
              <p className="mt-3 text-muted-foreground">
                Storybooks, novels, guides, memoirs, cookbooks. EbooksHub adapts structure and tone to what you&apos;re making.
              </p>
            </Reveal>
            <RevealGroup className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {BOOK_TYPES.slice(0, 12).map((type) => (
                <RevealItem key={type.id}>
                  <div className="group h-full rounded-xl border bg-card p-4 text-sm transition-colors hover:border-gold/50 hover:bg-muted/40">
                    <p className="font-medium">{type.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{type.description}</p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Plus fantasy, romance, mystery, poetry, comics, activity books, and more.
            </p>
          </div>
        </section>

        {/* Capabilities (bento) */}
        <section id="capabilities" className="border-t border-border/60 bg-paper py-24">
          <div className="container">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Built for whole books, not snippets</h2>
              <p className="mt-3 text-muted-foreground">The parts that make a 200-page project actually hold together.</p>
            </Reveal>
            <RevealGroup className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                      <h3 className="mt-4 font-display text-lg font-medium">{cap.title}</h3>
                      <p className={"mt-2 text-sm " + (cap.featured ? "text-white/70" : "text-muted-foreground")}>{cap.body}</p>
                    </div>
                  </Card>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* Continuity diagram (replaces a fake product screenshot with a real explanatory graphic) */}
        <section className="border-t border-border/60 py-24">
          <div className="container grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <Badge variant="secondary" className="mb-4">The editor</Badge>
              <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl text-balance">
                Every chapter remembers what came before it
              </h2>
              <p className="mt-4 text-muted-foreground">
                Chapters and pages on the left, your manuscript in the center, an assistant on the right that can
                rewrite, expand, or simplify any passage without leaving the page.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {["Drag to reorder chapters and pages", "Regenerate one illustration without touching the rest", "Select any text to rewrite, expand, or simplify it"].map(
                  (item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </Reveal>
            <Reveal delay={0.15}>
              <Card className="p-8">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Book Bible tracking</p>
                <div className="mt-6 flex items-center gap-1">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-2">
                      <div className={"h-2.5 w-2.5 rounded-full " + (i < 9 ? "bg-gold" : "bg-muted")} />
                      {i < 11 && <div className={"h-px w-full " + (i < 8 ? "bg-gold/60" : "bg-border")} />}
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-sm text-muted-foreground">
                  Every completed chapter feeds a running record of characters, places, and established facts, so
                  chapter 9 stays consistent with what chapter 1 already established.
                </p>
                <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs">
                  {[
                    { label: "Characters", value: "7" },
                    { label: "Locations", value: "4" },
                    { label: "Established facts", value: "23" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg border p-3">
                      <p className="font-display text-lg font-medium text-gold">{stat.value}</p>
                      <p className="mt-1 text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </Reveal>
          </div>
        </section>

        {/* Showcase */}
        <section className="border-t border-border/60 bg-paper py-24">
          <div className="container">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">What you can make</h2>
              <p className="mt-3 text-muted-foreground">Illustrative examples across a few of the 21 supported book types.</p>
            </Reveal>
            <RevealGroup className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {SHOWCASE.map((book, i) => (
                <RevealItem key={book.title} className="group">
                  <div
                    className={`flex aspect-[2/3] flex-col justify-between rounded-xl border p-4 shadow-soft transition-transform group-hover:-translate-y-1 ${
                      ["bg-gradient-to-br from-zinc-900 to-zinc-800 text-white", "bg-gradient-to-br from-secondary to-secondary/70", "bg-gradient-to-br from-accent to-accent/70 text-accent-foreground", "bg-gradient-to-br from-gold to-gold/70 text-gold-foreground"][i % 4]
                    }`}
                  >
                    <div className="h-1.5 w-8 rounded-full bg-white/40" />
                    <p className="font-display text-base italic leading-snug text-balance">{book.title}</p>
                  </div>
                  <p className="mt-3 text-sm font-medium">{book.title}</p>
                  <p className="text-xs text-muted-foreground">{book.type} · {book.pages} pages</p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-border/60 py-24">
          <div className="container">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Simple, usage-based pricing</h2>
              <p className="mt-3 text-muted-foreground">Start free. Upgrade when your books get longer or more frequent.</p>
            </Reveal>
            <RevealGroup className="mt-14 grid gap-6 lg:grid-cols-3">
              {PLAN_TIERS.map((plan) => (
                <RevealItem key={plan.id}>
                  <Card className={`flex h-full flex-col p-8 ${plan.highlighted ? "border-gold shadow-lift ring-1 ring-gold/30" : ""}`}>
                    {plan.highlighted && <Badge variant="gold" className="mb-4 w-fit">Most popular</Badge>}
                    <h3 className="font-display text-xl font-medium">{plan.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
                    <p className="mt-6">
                      <span className="font-display text-4xl font-medium">${plan.priceMonthly}</span>
                      <span className="text-muted-foreground"> /month</span>
                    </p>
                    <ul className="mt-6 flex-1 space-y-3 text-sm">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <PlanButton plan={plan.id} highlighted={plan.highlighted} />
                  </Card>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-border/60 bg-paper py-24">
          <div className="container max-w-3xl">
            <Reveal>
              <h2 className="text-center font-display text-3xl font-medium tracking-tight sm:text-4xl">Frequently asked questions</h2>
              <Accordion type="single" collapsible className="mt-10">
                {FAQS.map((item) => (
                  <AccordionItem key={item.q} value={item.q}>
                    <AccordionTrigger className="text-left font-display text-base font-medium">{item.q}</AccordionTrigger>
                    <AccordionContent>{item.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border/60 py-24">
          <div className="container">
            <Reveal>
              <Card className="relative overflow-hidden bg-zinc-900 p-12 text-center text-white sm:p-16">
                <div className="absolute inset-0 bg-aurora opacity-40" />
                <div className="relative">
                  <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl text-balance">
                    Your book is one idea away
                  </h2>
                  <p className="mx-auto mt-3 max-w-xl text-white/70">
                    Start free, no credit card required. Describe your idea and see your first blueprint in minutes.
                  </p>
                  <Button size="lg" variant="gold" className="mt-8" asChild>
                    <Link href="/signup">Create Your Book</Link>
                  </Button>
                </div>
              </Card>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
