"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

export function PlanButton({ plan, highlighted }: { plan: "free" | "creator" | "pro"; highlighted?: boolean }) {
  const [loading, setLoading] = useState(false)
  if (plan === "free") return <Button className="mt-8" variant="outline" asChild><Link href="/signup">Start free</Link></Button>
  async function checkout() {
    setLoading(true)
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) })
      const data = await res.json()
      if (res.status === 401) return window.location.assign("/signup")
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout.")
      window.location.assign(data.url)
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not start checkout.") } finally { setLoading(false) }
  }
  return <Button className="mt-8" variant={highlighted ? "gold" : "outline"} disabled={loading} onClick={checkout}>{loading && <Loader2 className="h-4 w-4 animate-spin" />}Choose {plan === "creator" ? "Creator" : "Pro"}</Button>
}
