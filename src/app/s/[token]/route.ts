import { NextResponse, type NextRequest } from "next/server"
import { eq, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { GUEST_COOKIE } from "@/lib/vibez/tokens"
import { grantAccess } from "@/lib/vibez/cookies"

// A guest scanned a Vibez QR code at the event
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const [row] = await db
    .select({ spotId: schema.vibezSpots.id, slug: schema.vibezEvents.slug, eventId: schema.vibezEvents.id, mode: schema.vibezEvents.accessMode })
    .from(schema.vibezSpots)
    .innerJoin(schema.vibezEvents, eq(schema.vibezEvents.id, schema.vibezSpots.eventId))
    .where(eq(schema.vibezSpots.token, token))
  if (!row) return NextResponse.redirect(new URL("/?code=unknown", req.url))

  await db.update(schema.vibezSpots).set({ scans: sql`${schema.vibezSpots.scans} + 1` }).where(eq(schema.vibezSpots.id, row.spotId))

  // Geofenced events confirm the guest's location before unlocking
  if (row.mode === "geofence") return NextResponse.redirect(new URL(`/e/${row.slug}?spot=${encodeURIComponent(token)}`, req.url))

  const res = NextResponse.redirect(new URL(`/e/${row.slug}/camera?spot=${encodeURIComponent(token)}`, req.url))
  return grantAccess(res, row.eventId, req.cookies.get(GUEST_COOKIE)?.value)
}
