import "server-only"
import { createHmac, randomBytes, timingSafeEqual } from "crypto"

// Guests never sign in, so who they are and which events they've unlocked live in signed cookies.
function secret() {
  const base = process.env.BETTER_AUTH_SECRET
  if (!base) throw new Error("BETTER_AUTH_SECRET is not configured")
  return `${base}:vibez:v1`
}

const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url")

export function seal(data: string) {
  return `${data}.${sign(data)}`
}

export function unseal(value: string | undefined | null): string | null {
  if (!value) return null
  const i = value.lastIndexOf(".")
  if (i < 1) return null
  const data = value.slice(0, i)
  const a = Buffer.from(value.slice(i + 1))
  const b = Buffer.from(sign(data))
  return a.length === b.length && timingSafeEqual(a, b) ? data : null
}

export const GUEST_COOKIE = "vz_guest"
export const unlockCookie = (eventId: string) => `vz_u_${eventId.replace(/-/g, "").slice(0, 16)}`
export const UNLOCK_TTL_S = 60 * 60 * 36

export const newGuestId = () => randomBytes(12).toString("base64url")
export const newSpotToken = () => randomBytes(9).toString("base64url")

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
})

// "eventId|expiresAtMs" → sealed; valid only for that event and until expiry
export const unlockValue = (eventId: string) => seal(`${eventId}|${Date.now() + UNLOCK_TTL_S * 1000}`)

export function isUnlocked(eventId: string, value: string | undefined) {
  const data = unseal(value)
  if (!data) return false
  const [id, exp] = data.split("|")
  return id === eventId && Number(exp) > Date.now()
}
