import { notFound } from "next/navigation"
import { asc, eq } from "drizzle-orm"
import QRCode from "qrcode"
import { db, schema } from "@/lib/db"
import { eventBySlug, guestAccess } from "@/lib/vibez/access"
import { Wall } from "@/components/vibez/wall"

export const dynamic = "force-dynamic"
export const metadata = { title: "Vibez wall", robots: { index: false } }

// Full-screen slideshow for a TV or projector at the venue
export default async function WallPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await eventBySlug(slug)
  if (!event) notFound()
  const access = await guestAccess(event)
  if (!access.canView) {
    return <main className="grid min-h-dvh place-items-center p-8 text-center text-muted">Open the wall from the Vibez dashboard, or scan an event code first.</main>
  }

  const [spot] = await db.select().from(schema.vibezSpots).where(eq(schema.vibezSpots.eventId, event.id)).orderBy(asc(schema.vibezSpots.createdAt)).limit(1)
  const base = process.env.BETTER_AUTH_URL || "https://vibez.axxes.club"
  const joinUrl = spot ? `${base}/s/${spot.token}` : `${base}/e/${slug}`
  const qr = await QRCode.toString(joinUrl, { type: "svg", margin: 1, color: { dark: "#0a0a0b", light: "#ffffff" } })
  return <Wall slug={slug} eventName={event.name} qrSvg={qr} />
}
