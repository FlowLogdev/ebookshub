import { SiteFooter } from "@/components/marketing/site-footer"
import { SiteHeader } from "@/components/marketing/site-header"
import { SupportTicketForm } from "@/components/support/support-ticket-form"

export const metadata = {
  title: "Support | EbooksHub",
  description: "Open a support ticket and we'll get back to you by email.",
}

export default function SupportPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 bg-paper py-16 sm:py-24">
        <section className="container max-w-xl">
          <div className="text-center">
            <p className="text-sm font-medium text-gold">We&apos;re here to help</p>
            <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">Contact support</h1>
            <p className="mt-4 text-muted-foreground">
              Open a ticket and we&apos;ll follow up by email. You&apos;ll get a ticket number to reference right away.
            </p>
          </div>
          <div className="mt-10">
            <SupportTicketForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
