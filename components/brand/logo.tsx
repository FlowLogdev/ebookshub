import Image from "next/image"
import Link from "next/link"

import { cn } from "@/lib/utils"

export function Logo({ className, iconOnly = false, href = "/" }: { className?: string; iconOnly?: boolean; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2", className)}>
      <Image src="/logo-mark.png" alt="" width={32} height={32} className="h-8 w-8 shrink-0" priority />
      {!iconOnly && (
        <span className="font-display text-lg font-medium tracking-tight">
          EbooksHub
        </span>
      )}
    </Link>
  )
}
