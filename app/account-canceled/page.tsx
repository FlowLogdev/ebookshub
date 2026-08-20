import Link from "next/link"

import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Membership canceled | EbooksHub",
}

export default function AccountCanceledPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 text-center">
      <Logo />
      <h1 className="mt-8 font-display text-2xl font-medium tracking-tight">Your membership has been canceled</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        Dashboard access is no longer available on this account. If this wasn&apos;t you, or you&apos;d like to
        resubscribe, choose a plan below.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button variant="gold" asChild>
          <Link href="/pricing">View plans</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/support">Contact support</Link>
        </Button>
      </div>
    </div>
  )
}
