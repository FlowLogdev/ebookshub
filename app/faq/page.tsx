import { SiteFooter } from "@/components/marketing/site-footer"
import { SiteHeader } from "@/components/marketing/site-header"
import { Reveal } from "@/components/motion/reveal"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { FAQS } from "@/lib/marketing-content"

export const metadata = {
  title: "FAQ | EbooksHub",
  description: "Answers to common questions about EbooksHub.",
}

export default function FaqPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 bg-paper py-16 sm:py-24">
        <section className="container max-w-3xl">
          <Reveal>
            <p className="text-center text-sm font-medium text-gold">Questions</p>
            <h1 className="mt-3 text-center font-display text-4xl font-medium tracking-tight sm:text-5xl">Frequently asked questions</h1>
            <Accordion type="single" collapsible className="mt-10">
              {FAQS.map((item) => (
                <AccordionItem key={item.q} value={item.q}>
                  <AccordionTrigger className="text-left font-display text-base font-medium">{item.q}</AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
