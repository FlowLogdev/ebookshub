import { createServiceRoleClient } from "@/lib/supabase/server"
import { decryptToken, encryptToken } from "@/lib/canva/crypto"
import { refreshTokens, type CanvaTokenResponse } from "@/lib/canva/oauth"

// Refresh a bit before actual expiry so a request never races an expired token.
const REFRESH_SKEW_MS = 60_000

export async function saveConnection(userId: string, tokens: CanvaTokenResponse): Promise<void> {
  const supabase = createServiceRoleClient()
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  const { error } = await supabase.from("canva_connections").upsert({
    user_id: userId,
    access_token_encrypted: encryptToken(tokens.access_token),
    refresh_token_encrypted: encryptToken(tokens.refresh_token),
    scope: tokens.scope,
    expires_at: expiresAt,
  })
  if (error) throw new Error(`Failed to save Canva connection: ${error.message}`)
}

export async function deleteConnection(userId: string): Promise<void> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from("canva_connections").delete().eq("user_id", userId)
  if (error) throw new Error(`Failed to remove Canva connection: ${error.message}`)
}

export async function getConnectionStatus(userId: string): Promise<{ connected: boolean; scope?: string }> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase.from("canva_connections").select("scope").eq("user_id", userId).maybeSingle()
  return data ? { connected: true, scope: data.scope } : { connected: false }
}

/**
 * Returns a valid Canva access token for the user, transparently refreshing
 * (and persisting the new tokens) if the stored one is expired or about to
 * expire. Throws if the user has never connected Canva.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("canva_connections")
    .select("access_token_encrypted, refresh_token_encrypted, expires_at")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw new Error(`Failed to load Canva connection: ${error.message}`)
  if (!data) throw new Error("Canva is not connected for this user.")

  const expiresAt = new Date(data.expires_at).getTime()
  if (expiresAt - REFRESH_SKEW_MS > Date.now()) {
    return decryptToken(data.access_token_encrypted)
  }

  const refreshToken = decryptToken(data.refresh_token_encrypted)
  const tokens = await refreshTokens(refreshToken)
  await saveConnection(userId, tokens)
  return tokens.access_token
}

/** Fetches a Canva REST API endpoint on the user's behalf. Path is relative to https://api.canva.com/rest/v1. */
export async function canvaFetch(userId: string, path: string, init?: RequestInit): Promise<Response> {
  const accessToken = await getValidAccessToken(userId)
  return fetch(`https://api.canva.com/rest/v1${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  })
}
