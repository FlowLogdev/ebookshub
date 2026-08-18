"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { UPGRADE_URL } from "@/lib/plans/free-tier"

// Minimal shape of the `chrome` global Chrome injects into pages matched by
// the extension's `externally_connectable.matches` — see extension/manifest.json.
// Not present unless the "EbooksHub Assistant" extension is installed.
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage: (extensionId: string, message: unknown, callback: (response?: { ok?: boolean }) => void) => void
        lastError?: { message?: string }
      }
    }
  }
}

type Status = "checking" | "not_signed_in" | "not_pro" | "extension_missing" | "connecting" | "connected" | "error"

export default function ExtensionConnectPage() {
  const [status, setStatus] = useState<Status>("checking")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function connect() {
    setStatus("connecting")
    setErrorMessage(null)

    const profileRes = await fetch("/api/profile")
    const profileData = await profileRes.json()
    if (!profileRes.ok) {
      setStatus("not_signed_in")
      return
    }
    if (profileData.profile?.plan_id !== "pro") {
      setStatus("not_pro")
      return
    }

    const extensionId = process.env.NEXT_PUBLIC_EXTENSION_ID
    const runtime = window.chrome?.runtime
    if (!extensionId || !runtime) {
      setStatus("extension_missing")
      return
    }

    const tokenRes = await fetch("/api/extension/token", { method: "POST" })
    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) {
      setStatus("error")
      setErrorMessage(tokenData.error ?? "Failed to create a connection token.")
      return
    }

    runtime.sendMessage(
      extensionId,
      { type: "EBOOKSHUB_COPILOT_AUTH", token: tokenData.token, expiresAt: tokenData.expiresAt },
      (response) => {
        if (runtime.lastError || !response?.ok) {
          setStatus("error")
          setErrorMessage(runtime.lastError?.message ?? "The extension didn't accept the connection. Make sure it's up to date.")
          return
        }
        setStatus("connected")
      },
    )
  }

  useEffect(() => {
    connect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6">
      <Card className="w-full max-w-md p-8 text-center">
        {status === "checking" || status === "connecting" ? (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Connecting the browser co-pilot to your account…</p>
          </>
        ) : status === "connected" ? (
          <>
            <CheckCircle2 className="mx-auto h-8 w-8 text-green-600" />
            <h1 className="mt-4 font-display text-xl font-medium">Connected</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Open the EbooksHub Assistant panel from your browser toolbar on any page — it&apos;ll pick up where you
              left off.
            </p>
          </>
        ) : status === "not_signed_in" ? (
          <>
            <XCircle className="mx-auto h-8 w-8 text-destructive" />
            <h1 className="mt-4 font-display text-xl font-medium">Sign in first</h1>
            <p className="mt-2 text-sm text-muted-foreground">You need to be signed in to EbooksHub to connect the extension.</p>
            <Button asChild className="mt-6"><Link href="/signin">Sign in</Link></Button>
          </>
        ) : status === "not_pro" ? (
          <>
            <XCircle className="mx-auto h-8 w-8 text-destructive" />
            <h1 className="mt-4 font-display text-xl font-medium">Pro plan required</h1>
            <p className="mt-2 text-sm text-muted-foreground">The browser co-pilot is available on the Pro plan.</p>
            <Button variant="gold" asChild className="mt-6"><Link href={UPGRADE_URL}>See upgrade options</Link></Button>
          </>
        ) : status === "extension_missing" ? (
          <>
            <XCircle className="mx-auto h-8 w-8 text-destructive" />
            <h1 className="mt-4 font-display text-xl font-medium">Extension not detected</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Install the EbooksHub Assistant browser extension, then reload this page to connect it.
            </p>
            <Button className="mt-6" onClick={connect}>Try again</Button>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-8 w-8 text-destructive" />
            <h1 className="mt-4 font-display text-xl font-medium">Couldn&apos;t connect</h1>
            <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
            <Button className="mt-6" onClick={connect}>Try again</Button>
          </>
        )}
      </Card>
    </div>
  )
}
