import Link from "next/link"
import {
  BookMarked,
  Feather,
  Fingerprint,
  Globe2,
  Image as ImageIcon,
  Layers,
  Sparkles,
  Wand2,
} from "lucide-react"

import { BookStack } from "@/components/marketing/book-stack"
import { SiteFooter } from "@/components/marketing/site-footer"
import { SiteHeader } from "@/components/marketing/site-header"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { BOOK_TYPES, MAX_PAGE_COUNT, MIN_PAGE_COUNT } from "@/lib/book/constants"
import { PLAN_TIERS } from "@/lib/pricing"

const STEPS = [
  {
    title: "Describe your idea",
    body: "Type a sentence or a detailed brief. EbooksHub infers genre, audience, tone, and structure from plain language.",
  },
  {
    title: "Review the blueprint",
    body: "See exactly how your page count breaks down — front matter, every chapter, back matter — before anything is written.",
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
    body: "Pick anywhere from 5 to 300 pages. EbooksHub plans front matter, chapters, and back matter to fit — never padded with filler.",
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
  },
  {
    icon: Wand2,
    title: "AI writing assistant",
    body: "Select any passage and continue, rewrite, expand, shorten, or adjust its tone — without leaving the editor.",
  },
  {
    icon: Globe2,
    title: "Multilingual by design",
    body: "Write in 12+ languages, with structure-preserving translation on the roadmap for the whole book at once.",
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
    a: "No. Review and edit the blueprint before anything is written, then edit, regenerate, or rewrite any chapter, paragraph, or image afterward — nothing is locked in.",
  },
  {
    q: "What can I export?",
    a: "Print-ready PDF, ePub, and DOCX, with your table of contents, chapter starts, and page numbers preserved. Cover-only and manuscript-only exports are also available.",
  },
  {
    q: "Who owns what I create?",
    a: "You do. EbooksHub is a tool for producing your book — the words, characters, and artwork you generate and edit are yours.",
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
          <div className="container relative grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28">
            <div className="animate-fade-up">
              <Badge variant="gold" className="mb-5">
                <Sparkles className="mr-1 h-3 w-3" /> AI book creation studio
              </Badge>
              <h1 className="font-display text-4xl font-medium leading-[1.1] tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Turn your idea into a <span className="italic text-primary">complete book</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg text-muted-foreground text-balance">
                Describe what you want to write. EbooksHub plans the structure, writes every chapter, illustrates the
                pages, and hands you a book you can edit, preview, and export — from a 5-page storybook to a
                300-page novel.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" variant="gold" asChild>
                  <Link href="/signup">Create Your Book</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#how-it-works">See How It Works</a>
                </Button>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
                <span><strong className="text-foreground">5–300</strong> pages per book</span>
                <span><strong className="text-foreground">12+</strong> languages</span>
                <span><strong className="text-foreground">21</strong> book types</span>
              </div>
            </div>
            <BookStack />
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t border-border/60 bg-paper py-24">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">From idea to finished book</h2>
              <p className="mt-3 text-muted-foreground">Four steps, with a real, editable draft at every stage.</p>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <Card key={step.title} className="p-6">
                  <span className="font-display text-3xl text-gold">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-4 font-display text-lg font-medium">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Book categories */}
        <section className="border-t border-border/60 py-24">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Any kind of book</h2>
              <p className="mt-3 text-muted-foreground">
                Storybooks, novels, guides, memoirs, cookbooks — EbooksHub adapts structure and tone to what you&apos;re making.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {BOOK_TYPES.slice(0, 12).map((type) => (
                <div
                  key={type.id}
                  className="group rounded-xl border bg-card p-4 text-sm transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <p className="font-medium">{type.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{type.description}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              …plus fantasy, romance, mystery, poetry, comics, activity books, and more.
            </p>
          </div>
        </section>

        {/* Capabilities */}
        <section id="capabilities" className="border-t border-border/60 bg-paper py-24">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Built for whole books, not snippets</h2>
              <p className="mt-3 text-muted-foreground">The parts that make a 200-page project actually hold together.</p>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {CAPABILITIES.map((cap) => (
                <Card key={cap.title} className="p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <cap.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-medium">{cap.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{cap.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Editor demo (illustrative, not a live product screenshot) */}
        <section className="border-t border-border/60 py-24">
          <div className="container grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge variant="secondary" className="mb-4">The editor</Badge>
              <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl text-balance">
                A page-by-page editor built for books, not slides
              </h2>
              <p className="mt-4 text-muted-foreground">
                Chapters and pages on the left, your manuscript in the center, formatting and the AI assistant on the
                right. Autosave runs continuously, with full version history behind every change.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {["Drag to reorder chapters and pages", "Regenerate one illustration without touching the rest", "Select any text to rewrite, expand, or simplify it"].map(
                  (item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Feather className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>
            <Card className="overflow-hidden p-0 shadow-lift">
              <div className="flex items-center gap-1.5 border-b bg-muted/40 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-gold/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
                <span className="ml-3 text-xs text-muted-foreground">The Lighthouse Beyond Time — Chapter 4</span>
              </div>
              <div className="grid grid-cols-[80px_1fr_90px] gap-px bg-border/60 sm:grid-cols-[100px_1fr_120px]">
                <div className="space-y-2 bg-card p-3">
                  {["Cover", "Contents", "Ch. 1", "Ch. 2", "Ch. 3", "Ch. 4"].map((p, i) => (
                    <div key={p} className={`rounded-md px-2 py-1.5 text-[11px] ${i === 5 ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                      {p}
                    </div>
                  ))}
                </div>
                <div className="space-y-2 bg-card p-4">
                  <div className="h-2.5 w-2/3 rounded bg-muted" />
                  <div className="h-2 w-full rounded bg-muted/70" />
                  <div className="h-2 w-full rounded bg-muted/70" />
                  <div className="h-2 w-5/6 rounded bg-muted/70" />
                  <div className="h-2 w-full rounded bg-muted/70" />
                  <div className="h-2 w-2/3 rounded bg-muted/70" />
                </div>
                <div className="space-y-2 bg-card p-3 text-[11px] text-muted-foreground">
                  <p className="font-medium text-foreground">AI Assist</p>
                  <div className="rounded-md border px-2 py-1.5">Continue writing</div>
                  <div className="rounded-md border px-2 py-1.5">Expand</div>
                  <div className="rounded-md border px-2 py-1.5">Change tone</div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Showcase */}
        <section className="border-t border-border/60 bg-paper py-24">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">What you can make</h2>
              <p className="mt-3 text-muted-foreground">Illustrative examples across a few of the 21 supported book types.</p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {SHOWCASE.map((book, i) => (
                <div key={book.title} className="group">
                  <div
                    className={`flex aspect-[2/3] flex-col justify-between rounded-xl border p-4 shadow-soft transition-transform group-hover:-translate-y-1 ${
                      ["bg-gradient-to-br from-primary to-primary/70 text-primary-foreground", "bg-gradient-to-br from-secondary to-secondary/70", "bg-gradient-to-br from-accent to-accent/70 text-accent-foreground", "bg-gradient-to-br from-gold to-gold/70 text-gold-foreground"][i % 4]
                    }`}
                  >
                    <div className="h-1.5 w-8 rounded-full bg-white/40" />
                    <p className="font-display text-base italic leading-snug text-balance">{book.title}</p>
                  </div>
                  <p className="mt-3 text-sm font-medium">{book.title}</p>
                  <p className="text-xs text-muted-foreground">{book.type} · {book.pages} pages</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-border/60 py-24">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Simple, usage-based pricing</h2>
              <p className="mt-3 text-muted-foreground">Start free. Upgrade when your books get longer or more frequent.</p>
            </div>
            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {PLAN_TIERS.map((plan) => (
                <Card key={plan.id} className={`flex flex-col p-8 ${plan.highlighted ? "border-primary shadow-lift ring-1 ring-primary/30" : ""}`}>
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
                        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-8" variant={plan.highlighted ? "gold" : "outline"} asChild>
                    <Link href="/signup">{plan.id === "free" ? "Start free" : "Choose plan"}</Link>
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-border/60 bg-paper py-24">
          <div className="container max-w-3xl">
            <h2 className="text-center font-display text-3xl font-medium tracking-tight sm:text-4xl">Frequently asked questions</h2>
            <Accordion type="single" collapsible className="mt-10">
              {FAQS.map((item) => (
                <AccordionItem key={item.q} value={item.q}>
                  <AccordionTrigger className="text-left font-display text-base font-medium">{item.q}</AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border/60 py-24">
          <div className="container">
            <Card className="relative overflow-hidden bg-primary p-12 text-center text-primary-foreground sm:p-16">
              <div className="absolute inset-0 bg-aurora opacity-40" />
              <div className="relative">
                <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl text-balance">
                  Your book is one idea away
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
                  Start free — no credit card required. Describe your idea and see your first blueprint in minutes.
                </p>
                <Button size="lg" variant="gold" className="mt-8" asChild>
                  <Link href="/signup">Create Your Book</Link>
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
