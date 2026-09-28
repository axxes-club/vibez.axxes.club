import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { eventBySlug, guestAccess } from "@/lib/vibez/access"
import { Feed, UnlockGate } from "@/components/vibez/feed"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const event = await eventBySlug((await params).slug)
  return { title: event ? `${event.name} · Vibez` : "Vibez", robots: { index: false } }
}

export default async function EventFeed({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ spot?: string }> }) {
  const [{ slug }, { spot }] = await Promise.all([params, searchParams])
  const event = await eventBySlug(slug)
  if (!event) notFound()
  const access = await guestAccess(event)

  return (
    <main className="min-h-dvh pb-28">
      <header className="sticky top-0 z-20 border-b border-line/60 bg-bg/85 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">Vibez · live</p>
            <h1 className="truncate text-lg font-semibold">{event.name}</h1>
          </div>
          {access.organizer && (
            <Link href={`/dashboard/events/${event.id}`} className="btn-ghost shrink-0 text-xs">Manage</Link>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl pt-2">
        {!access.canView ? (
          <UnlockGate slug={slug} spot={spot ?? null} geofenced={event.accessMode === "geofence"} />
        ) : (
          <>
            {access.reason === "closed" && <p className="px-4 py-3 text-center text-sm text-muted">This event&apos;s Vibez is closed — enjoy the memories.</p>}
            {access.reason === "banned" && <p className="px-4 py-3 text-center text-sm text-muted">You can view the feed, but posting is turned off for you at this event.</p>}
            <Feed slug={slug} />
          </>
        )}
      </div>
    </main>
  )
}
