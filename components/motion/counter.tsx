"use client"

import { useEffect, useRef, useState } from "react"
import { animate, motion, useInView, useReducedMotion } from "motion/react"

/**
 * Animates a numeric prefix within an otherwise-static string once it
 * scrolls into view (e.g. "300" in "5-300"). Falls back to the plain
 * string immediately for reduced-motion users and non-numeric values.
 */
export function AnimatedStat({ value }: { value: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })
  const reduceMotion = useReducedMotion()
  // Animate the LAST number in the string (e.g. the 300 in "5-300"), keeping
  // everything before/after it static — a leading range like "5-" reads as
  // context, not something worth counting up from zero.
  const match = /^(.*?)(\d[\d,]*)([^\d]*)$/.exec(value)
  const [display, setDisplay] = useState(reduceMotion || !match ? value : `${match[1]}0${match[3]}`)
  const [landed, setLanded] = useState(false)

  useEffect(() => {
    if (!inView || reduceMotion || !match) return
    const target = Number(match[2].replace(/,/g, ""))
    const prefix = match[1]
    const suffix = match[3]
    const controls = animate(0, target, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(`${prefix}${Math.round(v).toLocaleString()}${suffix}`),
      // A quick scale "landing" once the count finishes turns this from a
      // number quietly settling into something that visibly registers.
      onComplete: () => setLanded(true),
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView])

  return (
    <motion.p
      ref={ref}
      animate={landed ? { scale: [1, 1.18, 1] } : undefined}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="font-display text-2xl font-medium text-gold sm:text-3xl"
    >
      {display}
    </motion.p>
  )
}
