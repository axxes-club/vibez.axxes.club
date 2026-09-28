import { NextResponse, type NextRequest } from "next/server"
import { and, desc, eq, gt } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { eventBySlug, guestAccess } from "@/lib/vibez/access"

// GET ?after=<ISO> — the live feed (newest first); poll with `after` for new photos
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const event = await eventBySlug((await params).slug)
  if (!event) return NextResponse.json({ error: "No such event" }, { status: 404 })
  const access = await guestAccess(event)
  if (!access.canView) return NextResponse.json({ error: "locked", access }, { status: 403 })

  const p = schema.vibezPhotos
  const after = req.nextUrl.searchParams.get("after")
  const conditions = [eq(p.eventId, event.id), eq(p.status, "live")]
  if (after && !Number.isNaN(Date.parse(after))) conditions.push(gt(p.createdAt, new Date(after)))

  const rows = await db.select().from(p).where(and(...conditions)).orderBy(desc(p.createdAt)).limit(after ? 100 : 200)
  return NextResponse.json({
    access: { canPost: access.canPost, organizer: access.organizer, reason: access.reason ?? null },
    photos: rows.map((r) => ({
      id: r.id,
      url: r.url,
      authorName: r.authorName,
      caption: r.caption,
      reactions: r.reactions,
      mine: !!access.guestId && r.guestId === access.guestId,
      createdAt: r.createdAt.toISOString(),
    })),
  })
}
