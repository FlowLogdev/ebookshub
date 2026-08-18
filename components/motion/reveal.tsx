"use client"

import { motion, useReducedMotion, type Variants } from "motion/react"
import type { ReactNode } from "react"

const EASE = [0.16, 1, 0.3, 1] as const

/** Fades/slides a section into place once, when it enters the viewport. Motivation: draws the eye to each new section in scroll order, not decoration. */
export function Reveal({
  children,
  delay = 0,
  className,
  y = 20,
}: {
  children: ReactNode
  delay?: number
  className?: string
  y?: number
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

/** Staggers a grid of children into place as the group enters the viewport. Motivation: signals these items are one related set, revealed together. */
export function RevealGroup({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={containerVariants} className={className}>
      {children}
    </motion.div>
  )
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  )
}
