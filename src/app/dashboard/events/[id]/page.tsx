import Link from "next/link"
import { notFound } from "next/navigation"
import { and, asc, desc, eq, inArray } from "drizzle-orm"
import QRCode from "qrcode"
import { db, schema } from "@/lib/db"
import { requireContext } from "@/lib/context"
import { PageHeader, Stat, StatusBadge } from "@/components/ui"
import { addSpot, moderatePhoto, removeSpot, setEventStatus, updateEvent } from "../../actions"
import { LocationButton } from "./location-button"

const base = () => process.env.BETTER_AUTH_URL || "https://vibez.axxes.club"
const toLocal = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "")

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContext()
  const { id } = await params
  const [event] = await db
    .select()
    .from(schema.vibezEvents)
    .where(and(eq(schema.vibezEvents.id, id), eq(schema.vibezEvents.tenantId, ctx.tenant.id)))
    .catch(() => [])
  if (!event) notFound()

  const p = schema.vibezPhotos
  const [spots, queue, recent] = await Promise.all([
    db.select().from(schema.vibezSpots).where(eq(schema.vibezSpots.eventId, event.id)).orderBy(asc(schema.vibezSpots.createdAt)),
    db.select().from(p).where(and(eq(p.eventId, event.id), eq(p.status, "pending"))).orderBy(desc(p.createdAt)).limit(60),
    db.select().from(p).where(and(eq(p.eventId, event.id), inArray(p.status, ["live"]))).orderBy(desc(p.createdAt)).limit(24),
  ])
  const qrs = await Promise.all(spots.map((s) => QRCode.toString(`${base()}/s/${s.token}`, { type: "svg", margin: 0 })))
  const liveCount = recent.length
  const scans = spots.reduce((n, s) => n + s.scans, 0)
  const folder = encodeURIComponent(`Vibez · ${event.name}`.slice(0, 120))

  return (
    <>
      <PageHeader
        title={event.name}
        description={[event.venue, event.startsAt?.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })].filter(Boolean).join(" · ") || "Vibez event"}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={`/e/${event.slug}`} className="btn-ghost" target="_blank">Open feed</Link>
            <Link href={`/e/${event.slug}/wall`} className="btn-ghost" target="_blank">TV wall</Link>
            <Link href={`/print/${event.id}`} className="btn-primary" target="_blank">Print QR codes</Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Status" value={<StatusBadge value={event.status === "live" ? "active" : "archived"} />} hint={event.status === "live" ? "Guests can post" : "Closed to new posts"} />
        <Stat label="Photos (latest)" value={liveCount} hint="Also saved to Folders" />
        <Stat label="Waiting for review" value={queue.length} />
        <Stat label="Code scans" value={scans} hint={`${spots.length} QR spots`} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <form action={setEventStatus.bind(null, event.id, event.status === "live" ? "closed" : "live")}>
          <button className="btn-ghost">{event.status === "live" ? "Close event to new photos" : "Reopen event"}</button>
        </form>
        <a className="btn-ghost" href={`https://members.axxes.club/assets?folder=${folder}`} target="_blank" rel="noreferrer">Open in Folders ↗</a>
      </div>

      {/* Review queue */}
      {queue.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium text-muted">Waiting for review</h2>
          <PhotoGrid eventId={event.id} photos={queue} pending />
        </section>
      )}

      {/* QR spots */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-muted">QR spots — place one wherever you want photos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {spots.map((s, i) => (
            <div key={s.id} className="card flex items-center gap-4 p-4">
              <div className="size-20 shrink-0 rounded-md bg-white p-1.5" dangerouslySetInnerHTML={{ __html: qrs[i] }} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.label}</p>
                <p className="text-xs text-muted">{s.scans} scans</p>
                <p className="mt-1 truncate font-mono text-[11px] text-muted">/s/{s.token}</p>
              </div>
              {spots.length > 1 && (
                <form action={removeSpot.bind(null, event.id, s.id)}>
                  <button className="text-xs text-muted hover:text-danger" aria-label={`Remove ${s.label}`}>Remove</button>
                </form>
              )}
            </div>
          ))}
          <form action={addSpot.bind(null, event.id)} className="card flex items-center gap-2 p-4">
            <input name="label" required maxLength={60} placeholder="New spot, e.g. Dance floor" className="input" />
            <button className="btn-ghost shrink-0">Add</button>
          </form>
        </div>
      </section>

      {/* Settings */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-muted">Settings</h2>
        <form action={updateEvent.bind(null, event.id)} className="card grid gap-5 p-6 sm:grid-cols-2">
          <Field label="Event name"><input name="name" defaultValue={event.name} maxLength={120} className="input" /></Field>
          <Field label="Venue"><input name="venue" defaultValue={event.venue ?? ""} maxLength={160} className="input" /></Field>
          <Field label="Starts"><input type="datetime-local" name="startsAt" defaultValue={toLocal(event.startsAt)} className="input" /></Field>
          <Field label="Ends"><input type="datetime-local" name="endsAt" defaultValue={toLocal(event.endsAt)} className="input" /></Field>
          <Field label="Who can join the feed">
            <select name="accessMode" defaultValue={event.accessMode} className="input">
              <option value="scan">Anyone who scans a code at the event</option>
              <option value="geofence">Scan + must be within the venue radius</option>
              <option value="link">Anyone with the event link</option>
            </select>
          </Field>
          <Field label="New photos">
            <select name="moderation" defaultValue={event.moderation} className="input">
              <option value="auto">Go live instantly</option>
              <option value="approve">Wait for my approval</option>
            </select>
          </Field>
          <Field label="Venue location (for the geofence)">
            <div className="flex gap-2">
              <input name="geoLat" defaultValue={event.geoLat ?? ""} placeholder="Latitude" inputMode="decimal" className="input" />
              <input name="geoLng" defaultValue={event.geoLng ?? ""} placeholder="Longitude" inputMode="decimal" className="input" />
              <LocationButton />
            </div>
          </Field>
          <Field label="Geofence radius (metres)"><input type="number" name="geoRadiusM" min={50} max={5000} defaultValue={event.geoRadiusM} className="input" /></Field>
          <Field label="Max photos for the event"><input type="number" name="maxPhotos" min={10} max={20000} defaultValue={event.maxPhotos} className="input" /></Field>
          <Field label="Max photos per guest per hour"><input type="number" name="perGuestPerHour" min={1} max={500} defaultValue={event.perGuestPerHour} className="input" /></Field>
          <label className="flex items-center gap-3 text-sm sm:col-span-2">
            <input type="checkbox" name="flashDefault" defaultChecked={event.flashDefault} className="size-4 accent-[var(--accent)]" />
            Night-flash effect on by default in the camera
          </label>
          <div className="sm:col-span-2"><button className="btn-primary">Save settings</button></div>
        </form>
      </section>

      {/* Recent */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-muted">Latest on the feed</h2>
        {recent.length ? <PhotoGrid eventId={event.id} photos={recent} /> : <p className="text-sm text-muted">Nothing yet. Scan one of the codes above to post a test photo.</p>}
      </section>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-muted">{label}</span>
      {children}
    </label>
  )
}

function PhotoGrid({ eventId, photos, pending }: { eventId: string; photos: (typeof schema.vibezPhotos.$inferSelect)[]; pending?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {photos.map((ph) => (
        <div key={ph.id} className="card overflow-hidden" data-photo={ph.id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ph.url} alt={ph.caption ?? "Guest photo"} className="aspect-square w-full object-cover" loading="lazy" />
          <div className="space-y-2 p-2.5 text-xs">
            <p className="truncate">{ph.authorName ?? "Guest"}{ph.reportCount > 0 && <span className="ml-1 text-danger">· {ph.reportCount} reports</span>}</p>
            <div className="flex flex-wrap gap-1.5">
              {pending && (
                <form action={moderatePhoto.bind(null, eventId, ph.id, "approve")}><button className="rounded-md bg-accent px-2 py-1 font-medium text-accent-ink">Approve</button></form>
              )}
              <form action={moderatePhoto.bind(null, eventId, ph.id, "remove")}><button className="rounded-md border border-line px-2 py-1">Remove</button></form>
              <form action={moderatePhoto.bind(null, eventId, ph.id, "ban")}><button className="rounded-md border border-line px-2 py-1 text-danger">Ban</button></form>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
