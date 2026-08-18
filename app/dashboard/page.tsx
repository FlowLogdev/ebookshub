"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { BookOpen, Plus } from "lucide-react"

import { BookCard, type DashboardBook } from "@/components/dashboard/book-card"
import { DashboardTopbar } from "@/components/dashboard/topbar"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"

const TABS = [
  { id: "all", label: "All books", statuses: null },
  { id: "drafts", label: "Drafts", statuses: ["draft", "blueprint_ready"] },
  { id: "generating", label: "Generating", statuses: ["generating"] },
  { id: "complete", label: "Complete", statuses: ["complete", "published"] },
] as const

export default function DashboardPage() {
  const [books, setBooks] = useState<DashboardBook[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all")
  const [firstName, setFirstName] = useState("")

  const load = useCallback(async () => {
    const res = await fetch("/api/books")
    const data = await res.json()
    if (res.ok) setBooks(data.books)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const name = (data.user?.user_metadata?.full_name as string | undefined) ?? ""
      setFirstName(name.split(" ")[0] || "")
    })
  }, [load])

  const activeTab = TABS.find((t) => t.id === tab)!
  const statuses = activeTab.statuses as readonly string[] | null
  const filtered = statuses ? books.filter((b) => statuses.includes(b.status)) : books

  return (
    <div className="min-h-screen bg-paper">
      <DashboardTopbar />

      <div className="container py-10">
        <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-medium tracking-tight">Welcome back{firstName ? `, ${firstName}` : ""}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Pick up a project or start something new.</p>
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              {TABS.map((t) => (
                <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </Reveal>

        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState hasAnyBooks={books.length > 0} />
          ) : (
            <RevealGroup className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((book) => (
                <RevealItem key={book.id}>
                  <BookCard book={book} onChanged={load} />
                </RevealItem>
              ))}
            </RevealGroup>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ hasAnyBooks }: { hasAnyBooks: boolean }) {
  return (
    <Reveal className="flex flex-col items-center gap-4 rounded-2xl border border-dashed py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <BookOpen className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-display text-lg font-medium">{hasAnyBooks ? "Nothing here yet" : "Your library is empty"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasAnyBooks ? "Try a different tab, or start a new book." : "Describe an idea and EbooksHub will plan the whole book for you."}
        </p>
      </div>
      <Button variant="gold" asChild>
        <Link href="/create"><Plus className="h-4 w-4" /> Create New Book</Link>
      </Button>
    </Reveal>
  )
}
