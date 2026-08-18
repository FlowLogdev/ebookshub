import jwt from "jsonwebtoken"

// Short-lived tokens that let the browser extension (which has no cookies
// for ebookhubs.com — it calls the backend from its own service worker)
// prove which signed-in Pro user it's acting for. Minted only by
// app/api/extension/token/route.ts, which runs behind the normal
// cookie-authenticated Supabase session; the extension never sees a
// password or a Supabase session token, only this scoped, expiring token.

const ISSUER = "ebookshub-copilot"
const EXPIRES_IN = "12h"

export interface CopilotTokenPayload {
  userId: string
}

function getSecret(): string {
  const secret = process.env.EXTENSION_TOKEN_SECRET
  if (!secret) throw new Error("EXTENSION_TOKEN_SECRET is not set")
  return secret
}

export function mintCopilotToken(payload: CopilotTokenPayload): { token: string; expiresAt: string } {
  const token = jwt.sign(payload, getSecret(), { issuer: ISSUER, expiresIn: EXPIRES_IN })
  const { exp } = jwt.decode(token) as { exp: number }
  return { token, expiresAt: new Date(exp * 1000).toISOString() }
}

export function verifyCopilotToken(token: string): CopilotTokenPayload {
  const decoded = jwt.verify(token, getSecret(), { issuer: ISSUER }) as jwt.JwtPayload
  if (typeof decoded.userId !== "string") throw new Error("Malformed copilot token")
  return { userId: decoded.userId }
}
