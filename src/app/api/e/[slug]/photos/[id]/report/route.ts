import { NextResponse } from "next/server"
import { and, eq, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { eventBySlug, guestAccess } from "@/lib/vibez/access"

const HIDE_AFTER_REPORTS = 3

// One report per guest per photo; enough reports hide the photo until an organizer reviews it
export async function POST(req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params
  const event = await eventBySlug(slug)
  if (!event) return NextResponse.json({ error: "No such event" }, { status: 404 })
  const access = await guestAccess(event)
  if (!access.canView || !access.guestId) return NextResponse.json({ error: "locked" }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const inserted = await db
    .insert(schema.vibezReports)
    .values({ photoId: id, guestId: access.guestId, reason: String(body.reason ?? "other").slice(0, 40) })
    .onConflictDoNothing()
    .returning()
    .catch(() => [])
  if (inserted.length) {
    const p = schema.vibezPhotos
    await db
      .update(p)
      .set({
        reportCount: sql`${p.reportCount} + 1`,
        status: sql`case when ${p.reportCount} + 1 >= ${HIDE_AFTER_REPORTS} and ${p.status} = 'live' then 'pending' else ${p.status} end`,
      })
      .where(and(eq(p.id, id), eq(p.eventId, event.id)))
  }
  return NextResponse.json({ ok: true })
}
