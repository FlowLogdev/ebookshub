import Link from "next/link"

import { Logo } from "@/components/brand/logo"

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-paper">
      <div className="container grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            An AI book creation studio — describe an idea, get a complete, editable, exportable book.
          </p>
        </div>

        <div className="space-y-3 text-sm">
          <p className="font-medium">Product</p>
          <ul className="space-y-2 text-muted-foreground">
            <li><a href="#how-it-works" className="hover:text-foreground">How it works</a></li>
            <li><a href="#capabilities" className="hover:text-foreground">Capabilities</a></li>
            <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
            <li><Link href="/create" className="hover:text-foreground">Start creating</Link></li>
          </ul>
        </div>

        <div className="space-y-3 text-sm">
          <p className="font-medium">Account</p>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link href="/signup" className="hover:text-foreground">Create an account</Link></li>
            <li><Link href="/signin" className="hover:text-foreground">Sign in</Link></li>
            <li><Link href="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
          </ul>
        </div>

        <div className="space-y-3 text-sm">
          <p className="font-medium">Company</p>
          <ul className="space-y-2 text-muted-foreground">
            <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
            <li><a href="mailto:hello@ebookhubs.com" className="hover:text-foreground">Contact</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60 py-6">
        <p className="container text-xs text-muted-foreground">
          © {new Date().getFullYear()} EbooksHub. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
