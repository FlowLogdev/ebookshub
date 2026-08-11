"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { BOOK_LANGUAGES } from "@/lib/book/constants"

export default function ProfilePage() {
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [authorName, setAuthorName] = useState("")
  const [bio, setBio] = useState("")
  const [website, setWebsite] = useState("")
  const [language, setLanguage] = useState("en")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setDisplayName(data.profile.display_name ?? "")
          setAuthorName(data.profile.author_name ?? "")
          setBio(data.profile.bio ?? "")
          setWebsite(data.profile.website ?? "")
          setLanguage(data.profile.language ?? "en")
        }
        setEmail(data.email ?? "")
        setLoading(false)
      })
  }, [])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, authorName, bio, website, language }),
      })
      if (!res.ok) throw new Error()
      toast.success("Profile updated.")
    } catch {
      toast.error("Failed to save profile.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
          </Button>
        </div>
      </header>

      <div className="container max-w-xl py-10">
        <h1 className="font-display text-2xl font-medium tracking-tight">Profile & settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Author details are used on the About the Author page of books you generate.</p>

        <div className="mt-8 space-y-5">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={email} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="authorName">Author / pen name</Label>
            <Input id="authorName" value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">Author bio</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-[100px]" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="language">Interface language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BOOK_LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="gold" onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
          </Button>
        </div>
      </div>
    </div>
  )
}
