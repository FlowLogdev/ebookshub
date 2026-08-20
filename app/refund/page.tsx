import Link from "next/link"

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
        <article className="container max-w-3xl">
          <p className="text-sm font-medium text-gold">Legal</p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">Refund Policy</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Last updated {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>

          <div className="mt-10 space-y-10">
            <section>
              <h2 className="font-display text-xl font-medium text-foreground">7-day refund window</h2>
              <p className="mt-3 leading-relaxed text-foreground/90">
                If you cancel your subscription within 7 days of your most recent charge, you&apos;re eligible for a
                full refund of that charge. Cancel from Settings, or contact{" "}
                <Link href="/support" className="text-gold underline underline-offset-2 hover:text-gold/80">support</Link>{" "}
                and reference your ticket number — we&apos;ll process the refund manually.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-medium text-foreground">After 7 days</h2>
              <p className="mt-3 leading-relaxed text-foreground/90">
                Cancelling after the 7-day window stops future billing, but the current billing period is not
                refunded. Your subscription is set not to renew, so you won&apos;t be charged again after the
                current cycle ends.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-medium text-foreground">Access after cancellation</h2>
              <p className="mt-3 leading-relaxed text-foreground/90">
                Cancelling your membership revokes dashboard access immediately, regardless of where you are in
                your billing cycle. This is separate from the billing/refund timing above — cancelling stops your
                access right away even if part of the current period was already paid for.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-medium text-foreground">Free plan</h2>
              <p className="mt-3 leading-relaxed text-foreground/90">The free plan has no charge and nothing to refund.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-medium text-foreground">How to request a refund</h2>
              <p className="mt-3 leading-relaxed text-foreground/90">
                Open a ticket on our{" "}
                <Link href="/support" className="text-gold underline underline-offset-2 hover:text-gold/80">support page</Link>{" "}
                with your account email and the date of the charge. If you&apos;re within the 7-day window,
                we&apos;ll issue the refund to your original payment method.
              </p>
            </section>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
