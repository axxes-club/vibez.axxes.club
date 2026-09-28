import Link from "next/link"
import { desc, eq, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { requireContext } from "@/lib/context"
import { PageHeader, StatusBadge } from "@/components/ui"
import { createEvent } from "./actions"

export default async function EventsPage() {
  const ctx = await requireContext()
  const e = schema.vibezEvents
  const events = await db
    .select({
      id: e.id,
      name: e.name,
      venue: e.venue,
      status: e.status,
      startsAt: e.startsAt,
      photos: sql<number>`(select count(*) from vibez_photos p where p.event_id = ${e.id} and p.status = 'live')`.mapWith(Number),
      pending: sql<number>`(select count(*) from vibez_photos p where p.event_id = ${e.id} and p.status = 'pending')`.mapWith(Number),
    })
    .from(e)
    .where(eq(e.tenantId, ctx.tenant.id))
    .orderBy(desc(e.createdAt))

  return (
    <>
      <PageHeader title="Events" description={`Photo feeds for ${ctx.tenant.name}. Guests scan a code and their shots appear live.`} />

      <form action={createEvent} className="card mb-8 grid gap-3 p-5 sm:grid-cols-[2fr_1.5fr_1fr_auto] sm:items-end">
        <label className="grid gap-1.5 text-sm">
          <span className="text-muted">Event name</span>
          <input name="name" required maxLength={120} placeholder="Friday Afters — Rooftop" className="input" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-muted">Venue</span>
          <input name="venue" maxLength={160} placeholder="Optional" className="input" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-muted">Guests get in by</span>
          <select name="accessMode" defaultValue="scan" className="input">
            <option value="scan">Scanning a code</option>
            <option value="geofence">Scan + being there</option>
            <option value="link">Anyone with the link</option>
          </select>
        </label>
        <button className="btn-primary">Create event</button>
      </form>

      {events.length === 0 ? (
        <div className="card grid place-items-center px-6 py-16 text-center">
          <p className="text-4xl">📸</p>
          <p className="mt-3 font-medium">No events yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted">Create one above, print its QR codes, and every room becomes a photobooth.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => (
            <Link key={ev.id} href={`/dashboard/events/${ev.id}`} className="card p-5 transition hover:border-accent/50">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{ev.name}</p>
                <StatusBadge value={ev.status === "live" ? "active" : "archived"} />
              </div>
              <p className="mt-1 text-sm text-muted">{ev.venue ?? "No venue"}{ev.startsAt ? ` · ${ev.startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</p>
              <p className="mt-4 text-sm">
                <span className="font-semibold tabular-nums">{ev.photos}</span> <span className="text-muted">photos</span>
                {ev.pending > 0 && <span className="ml-3 text-accent">{ev.pending} waiting for review</span>}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
