import Link from "next/link"
import { BookOpen } from "lucide-react"

import { cn } from "@/lib/utils"

export function Logo({ className, iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 font-display", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-gradient text-primary-foreground shadow-soft">
        <BookOpen className="h-4 w-4" strokeWidth={2.25} />
      </span>
      {!iconOnly && <span className="text-lg font-medium tracking-tight">EbooksHub</span>}
    </Link>
  )
}
