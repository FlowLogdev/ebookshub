import { SiteFooter } from "@/components/marketing/site-footer"
import { SiteHeader } from "@/components/marketing/site-header"

export const metadata = {
  title: "Refund Policy | EbooksHub",
  description: "EbooksHub's refund and cancellation policy.",
}

export default function RefundPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 bg-paper py-16 sm:py-24">
        <article className="container prose prose-neutral max-w-3xl dark:prose-invert">
          <p className="text-sm font-medium text-gold">Legal</p>
          <h1 className="font-display">Refund Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

          <h2>7-day refund window</h2>
          <p>
            If you cancel your subscription within 7 days of your most recent charge, you&apos;re eligible for a
            full refund of that charge. Cancel from Settings, or contact <a href="/support">support</a> and
            reference your ticket number — we&apos;ll process the refund manually.
          </p>

          <h2>After 7 days</h2>
          <p>
            Cancelling after the 7-day window stops future billing, but the current billing period is not
            refunded. Your subscription is set not to renew, so you won&apos;t be charged again after the current
            cycle ends.
          </p>

          <h2>Access after cancellation</h2>
          <p>
            Cancelling your membership revokes dashboard access immediately, regardless of where you are in your
            billing cycle. This is separate from the billing/refund timing above — cancelling stops your access
            right away even if part of the current period was already paid for.
          </p>

          <h2>Free plan</h2>
          <p>The free plan has no charge and nothing to refund.</p>

          <h2>How to request a refund</h2>
          <p>
            Open a ticket on our <a href="/support">support page</a> with your account email and the date of the
            charge. If you&apos;re within the 7-day window, we&apos;ll issue the refund to your original payment
            method.
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
