import { NextResponse } from "next/server"
import { and, eq, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { eventBySlug, guestAccess } from "@/lib/vibez/access"

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params
  const event = await eventBySlug(slug)
  if (!event) return NextResponse.json({ error: "No such event" }, { status: 404 })
  if (!(await guestAccess(event)).canView) return NextResponse.json({ error: "locked" }, { status: 403 })

  const [row] = await db
    .update(schema.vibezPhotos)
    .set({ reactions: sql`${schema.vibezPhotos.reactions} + 1` })
    .where(and(eq(schema.vibezPhotos.id, id), eq(schema.vibezPhotos.eventId, event.id)))
    .returning({ reactions: schema.vibezPhotos.reactions })
    .catch(() => [])
  return row ? NextResponse.json(row) : NextResponse.json({ error: "No such photo" }, { status: 404 })
}
