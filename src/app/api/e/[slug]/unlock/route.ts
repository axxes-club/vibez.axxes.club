import {admitRequest,consumeAdmissions} from "@/lib/security/admission"
import { NextResponse, type NextRequest } from "next/server"
import { and, eq } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { eventBySlug } from "@/lib/vibez/access"
import { GUEST_COOKIE } from "@/lib/vibez/tokens"
import { grantAccess } from "@/lib/vibez/cookies"
import { distanceM } from "@/lib/vibez/geo"

// POST { spot?, lat?, lng? } — unlock a scan/geofence event after the checks pass
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try { await admitRequest(req, "event") } catch(error) { return NextResponse.json({error:"Request limit exceeded"},{status:(error as {status?:number}).status===429?429:503}) }
  const event = await eventBySlug((await params).slug)
  if (!event) return NextResponse.json({ error: "No such event" }, { status: 404 })
  try { await consumeAdmissions([["tenant:event:"+event.tenantId,600],["event:"+event.id,120]]) } catch(error) { return NextResponse.json({error:"Request limit exceeded"},{status:(error as {status?:number}).status===429?429:503}) }
  const body = await req.json().catch(() => ({}))

  if (event.accessMode !== "link") {
    const token = typeof body.spot === "string" ? body.spot : ""
    const [spot] = token
      ? await db.select({ id: schema.vibezSpots.id }).from(schema.vibezSpots).where(and(eq(schema.vibezSpots.token, token), eq(schema.vibezSpots.eventId, event.id)))
      : []
    if (!spot) return NextResponse.json({ error: "Scan one of the Vibez codes at the event to join." }, { status: 403 })
  }

  if (event.accessMode === "geofence" && event.geoLat != null && event.geoLng != null) {
    const lat = Number(body.lat), lng = Number(body.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng))
      return NextResponse.json({ error: "Share your location so we can check you're at the event." }, { status: 400 })
    const d = distanceM({ lat, lng }, { lat: event.geoLat, lng: event.geoLng })
    if (d > event.geoRadiusM) return NextResponse.json({ error: "Looks like you're not at the event yet. Vibez unlocks on site." }, { status: 403 })
  }

  return grantAccess(NextResponse.json({ ok: true }), event.id, req.cookies.get(GUEST_COOKIE)?.value)
}
