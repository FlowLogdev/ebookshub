"use client"

import { useState } from "react"
import { Check, Copy, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function SupportTicketForm({
  defaultName,
  defaultEmail,
  onSubmitted,
}: {
  defaultName?: string
  defaultEmail?: string
  onSubmitted?: (ticketNumber: string) => void
}) {
  const [name, setName] = useState(defaultName ?? "")
  const [email, setEmail] = useState(defaultEmail ?? "")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [ticketNumber, setTicketNumber] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to open ticket.")
      setTicketNumber(data.ticketNumber)
      onSubmitted?.(data.ticketNumber)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open ticket.")
    } finally {
      setSubmitting(false)
    }
  }

  async function copyTicketNumber() {
    if (!ticketNumber) return
    await navigator.clipboard.writeText(ticketNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (ticketNumber) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Your ticket has been opened.</p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <p className="font-display text-2xl font-medium text-gold">{ticketNumber}</p>
          <Button size="icon" variant="ghost" onClick={copyTicketNumber} aria-label="Copy ticket number">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          A confirmation with this number was sent to {email}. We&apos;ll follow up there.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ticket-name">Name</Label>
          <Input id="ticket-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ticket-email">Email</Label>
          <Input id="ticket-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ticket-subject">Subject</Label>
        <Input id="ticket-subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ticket-message">How can we help?</Label>
        <Textarea id="ticket-message" value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-[140px]" required />
      </div>
      <Button type="submit" variant="gold" disabled={submitting} className="w-full sm:w-auto">
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Open ticket
      </Button>
    </form>
  )
}
