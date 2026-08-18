import crypto from "crypto"

// Canva OAuth 2.0 (Authorization Code + PKCE) — Canva has no permanent API
// key, every request runs as a connected user via CANVA_CLIENT_ID/SECRET.
// See https://www.canva.dev/docs/connect/authentication/ for the flow this
// mirrors.

export const CANVA_SCOPES = ["design:meta:read", "design:content:read", "design:content:write", "asset:read", "asset:write"] as const

const AUTHORIZE_URL = "https://www.canva.com/api/oauth/authorize"
const TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token"

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

export interface PkcePair {
  codeVerifier: string
  codeChallenge: string
}

export function generatePkcePair(): PkcePair {
  const codeVerifier = crypto.randomBytes(64).toString("base64url")
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url")
  return { codeVerifier, codeChallenge }
}

export function generateState(): string {
  return crypto.randomBytes(32).toString("hex")
}

export function buildAuthorizationUrl(params: { codeChallenge: string; state: string }): string {
  const query = new URLSearchParams({
    response_type: "code",
    client_id: requireEnv("CANVA_CLIENT_ID"),
    redirect_uri: requireEnv("CANVA_REDIRECT_URI"),
    scope: CANVA_SCOPES.join(" "),
    code_challenge: params.codeChallenge,
    code_challenge_method: "S256",
    state: params.state,
  })
  return `${AUTHORIZE_URL}?${query.toString()}`
}

function basicAuthHeader(): string {
  const credentials = Buffer.from(`${requireEnv("CANVA_CLIENT_ID")}:${requireEnv("CANVA_CLIENT_SECRET")}`).toString("base64")
  return `Basic ${credentials}`
}

export interface CanvaTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  scope: string
}

async function requestToken(body: URLSearchParams): Promise<CanvaTokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(`Canva token request failed (${response.status}): ${detail}`)
  }

  return response.json()
}

export function exchangeCodeForTokens(params: { code: string; codeVerifier: string }): Promise<CanvaTokenResponse> {
  return requestToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      code_verifier: params.codeVerifier,
      redirect_uri: requireEnv("CANVA_REDIRECT_URI"),
    })
  )
}

export function refreshTokens(refreshToken: string): Promise<CanvaTokenResponse> {
  return requestToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    })
  )
}
