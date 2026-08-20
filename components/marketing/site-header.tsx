"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { useMotionValueEvent, useScroll } from "motion/react"

import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/capabilities", label: "Capabilities" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [pastHero, setPastHero] = useState(false)
  const { scrollY } = useScroll()
  // Once the visitor has scrolled past the hero (where the primary CTA
  // already pulses), give this always-visible header CTA the same nudge so
  // the invitation to sign up doesn't disappear once they're reading.
  useMotionValueEvent(scrollY, "change", (y) => setPastHero(y > 560))

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            link.href.startsWith("/") ? (
              <Link key={link.href} href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{link.label}</Link>
            ) : (
              <a key={link.href} href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{link.label}</a>
            )
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" asChild>
            <Link href="/signin">Sign in</Link>
          </Button>
          <Button variant="gold" asChild className={cn(pastHero && "animate-pulse-ring")}>
            <Link href="/signup">Create a Book</Link>
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <nav className="container flex flex-col gap-1 py-4">
            {NAV_LINKS.map((link) => (
              link.href.startsWith("/") ? (
                <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setOpen(false)}>{link.label}</Link>
              ) : (
                <a key={link.href} href={link.href} className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setOpen(false)}>{link.label}</a>
              )
            ))}
            <div className="mt-2 flex flex-col gap-2 px-3">
              <Button variant="outline" asChild>
                <Link href="/signin">Sign in</Link>
              </Button>
              <Button variant="gold" asChild>
                <Link href="/signup">Create a Book</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
