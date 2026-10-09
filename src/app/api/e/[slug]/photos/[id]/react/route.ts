import {admitRequest,consumeAdmissions} from "@/lib/security/admission"
import { NextResponse } from "next/server"
import { and, eq, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { eventBySlug, guestAccess } from "@/lib/vibez/access"

export async function POST(req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params
  try { await admitRequest(req, "event") } catch(error) { return NextResponse.json({error:"Request limit exceeded"},{status:(error as {status?:number}).status===429?429:503}) }
  const event = await eventBySlug(slug)
  if (!event) return NextResponse.json({ error: "No such event" }, { status: 404 })
  try { await consumeAdmissions([["tenant:event:"+event.tenantId,600],["event:"+event.id,120]]) } catch(error) { return NextResponse.json({error:"Request limit exceeded"},{status:(error as {status?:number}).status===429?429:503}) }
  if (!(await guestAccess(event)).canView) return NextResponse.json({ error: "locked" }, { status: 403 })

  const [row] = await db
    .update(schema.vibezPhotos)
    .set({ reactions: sql`${schema.vibezPhotos.reactions} + 1` })
    .where(and(eq(schema.vibezPhotos.id, id), eq(schema.vibezPhotos.eventId, event.id)))
    .returning({ reactions: schema.vibezPhotos.reactions })
    .catch(() => [])
  return row ? NextResponse.json(row) : NextResponse.json({ error: "No such photo" }, { status: 404 })
}
