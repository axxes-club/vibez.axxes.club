import "server-only"
import type { NextResponse } from "next/server"
import { GUEST_COOKIE, cookieOptions, newGuestId, seal, unlockCookie, unlockValue, UNLOCK_TTL_S, unseal } from "./tokens"

// Ensures the visitor has a guest id and marks the event unlocked for them
export function grantAccess(res: NextResponse, eventId: string, existingGuest: string | undefined) {
  if (!unseal(existingGuest)) res.cookies.set(GUEST_COOKIE, seal(newGuestId()), cookieOptions(60 * 60 * 24 * 365))
  res.cookies.set(unlockCookie(eventId), unlockValue(eventId), cookieOptions(UNLOCK_TTL_S))
  return res
}

// Parse a Cookie header (for handlers that only get a raw Request)
export function readCookie(header: string | null, name: string) {
  for (const part of (header ?? "").split(/;\s*/)) {
    const i = part.indexOf("=")
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1))
  }
  return undefined
}
