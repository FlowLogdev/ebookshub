import crypto from "crypto"

// AES-256-GCM at-rest encryption for Canva OAuth tokens. Canva issues no
// permanent API key — access/refresh tokens from the OAuth exchange are the
// closest thing to a credential we store, so they're encrypted before ever
// reaching canva_connections rather than relying on RLS alone.

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12

function getKey(): Buffer {
  const secret = process.env.CANVA_TOKEN_ENCRYPTION_KEY
  if (!secret) throw new Error("CANVA_TOKEN_ENCRYPTION_KEY is not set")
  const key = Buffer.from(secret, "base64")
  if (key.length !== 32) {
    throw new Error("CANVA_TOKEN_ENCRYPTION_KEY must decode to 32 bytes (base64 of a 256-bit key)")
  }
  return key
}

/** Encrypts a token to a single base64 string: iv | authTag | ciphertext. */
export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64")
}

export function decryptToken(encoded: string): string {
  const raw = Buffer.from(encoded, "base64")
  const iv = raw.subarray(0, IV_LENGTH)
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + 16)
  const ciphertext = raw.subarray(IV_LENGTH + 16)
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
}
