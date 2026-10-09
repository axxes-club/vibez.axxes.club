import "server-only"
import { cookies, headers } from "next/headers"
import { and, eq, isNull } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { auth } from "@/lib/auth"
import { GUEST_COOKIE, isUnlocked, unlockCookie, unseal } from "./tokens"

export type VibezEvent = typeof schema.vibezEvents.$inferSelect

export async function eventBySlug(slug: string) {
  const [event] = await db.select().from(schema.vibezEvents).where(eq(schema.vibezEvents.slug, slug))
  return event ?? null
}

// Is the signed-in AXXES user an organizer of this event's workspace?
export async function isOrganizer(event: VibezEvent) {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)
  if (!session) return false
  const [m] = await db
    .select({ role: schema.tenantMemberships.role })
    .from(schema.tenantMemberships)
    .where(
      and(
        eq(schema.tenantMemberships.userId, session.user.id),
        eq(schema.tenantMemberships.tenantId, event.tenantId),
        isNull(schema.tenantMemberships.deletedAt)
      )
    )
  return !!m && ["owner", "admin", "manager"].includes(m.role)
}

export type GuestAccess = {
  guestId: string | null
  canView: boolean
  canPost: boolean
  organizer: boolean
  banned: boolean
  reason?: "locked" | "closed" | "banned"
}

// The one place that decides what a visitor may do with an event's feed
export async function guestAccess(event: VibezEvent): Promise<GuestAccess> {
  const jar = await cookies()
  const guestId = unseal(jar.get(GUEST_COOKIE)?.value)
  const organizer = await isOrganizer(event)
  const unlocked = event.accessMode === "link" || isUnlocked(event.id, jar.get(unlockCookie(event.id))?.value)

  let banned = false
  if (guestId) {
    const [ban] = await db
      .select({ id: schema.vibezBans.id })
      .from(schema.vibezBans)
      .where(and(eq(schema.vibezBans.eventId, event.id), eq(schema.vibezBans.guestId, guestId)))
    banned = !!ban
  }

  const canView = organizer || unlocked
  const open = event.status === "live"
  const canPost = open && !banned && (organizer || unlocked)
  const reason = !canView ? "locked" : !open ? "closed" : banned ? "banned" : undefined
  return { guestId, canView, canPost, organizer, banned, reason }
}
