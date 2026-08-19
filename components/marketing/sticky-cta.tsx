"use client"

import Link from "next/link"
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react"
import { useState } from "react"

import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"

/** A slide-down CTA bar that appears once the visitor scrolls past the hero — keeps "Create Your Book" one click away without crowding the hero itself. */
export function StickyCta() {
  const { scrollY } = useScroll()
  const [visible, setVisible] = useState(false)

  useMotionValueEvent(scrollY, "change", (y) => {
    setVisible(y > 640)
  })

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -64, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -64, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur"
        >
          <div className="container flex h-14 items-center justify-between">
            <Logo />
            <Button size="sm" variant="gold" asChild className="shadow-[0_0_0_0_hsl(var(--gold)/0.45)] animate-pulse-ring">
              <Link href="/signup">Create Your Book</Link>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
