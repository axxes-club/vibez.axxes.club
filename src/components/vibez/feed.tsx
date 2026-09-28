"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"

type Photo = { id: string; url: string; authorName: string | null; caption: string | null; reactions: number; mine: boolean; createdAt: string }
type Access = { canPost: boolean; organizer: boolean; reason: string | null }

const POLL_MS = 4000
const REACTED_KEY = "vz_reacted"

function timeAgo(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.round(s / 60)}m`
  return `${Math.round(s / 3600)}h`
}

export function Feed({ slug }: { slug: string }) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [access, setAccess] = useState<Access | null>(null)
  const [open, setOpen] = useState<Photo | null>(null)
  const [reacted, setReacted] = useState<Set<string>>(new Set())
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const latest = useRef<string | null>(null)

  const load = useCallback(async () => {
    const url = `/api/e/${slug}/photos${latest.current ? `?after=${encodeURIComponent(latest.current)}` : ""}`
    const res = await fetch(url, { cache: "no-store" }).catch(() => null)
    if (!res?.ok) return
    const data = (await res.json()) as { photos: Photo[]; access: Access }
    setAccess(data.access)
    if (!data.photos.length) return
    latest.current = data.photos[0].createdAt
    setPhotos((prev) => {
      const seen = new Set(prev.map((p) => p.id))
      const incoming = data.photos.filter((p) => !seen.has(p.id))
      if (prev.length) setFresh(new Set(incoming.map((p) => p.id)))
      return [...incoming, ...prev]
    })
  }, [slug])

  useEffect(() => {
    try {
      setReacted(new Set(JSON.parse(localStorage.getItem(REACTED_KEY) ?? "[]")))
    } catch {}
    load()
    const t = setInterval(load, POLL_MS)
    return () => clearInterval(t)
  }, [load])

  const react = async (photo: Photo) => {
    if (reacted.has(photo.id)) return
    const next = new Set(reacted).add(photo.id)
    setReacted(next)
    try {
      localStorage.setItem(REACTED_KEY, JSON.stringify([...next].slice(-500)))
    } catch {}
    const bump = (p: Photo) => (p.id === photo.id ? { ...p, reactions: p.reactions + 1 } : p)
    setPhotos((prev) => prev.map(bump))
    setOpen((o) => (o ? bump(o) : o))
    navigator.vibrate?.(15)
    await fetch(`/api/e/${slug}/photos/${photo.id}/react`, { method: "POST" }).catch(() => {})
  }

  const report = async (photo: Photo) => {
    await fetch(`/api/e/${slug}/photos/${photo.id}/report`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).catch(() => {})
    setOpen(null)
    alert("Thanks — the organizers will take a look.")
  }

  return (
    <>
      {photos.length === 0 ? (
        <div className="grid place-items-center px-6 py-24 text-center">
          <p className="text-5xl">📸</p>
          <p className="mt-4 text-lg font-semibold">No photos yet</p>
          <p className="mt-1 text-sm text-muted">Be the first — the whole room will see it.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 px-2 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpen(p)}
              className={`relative block aspect-[3/4] w-full overflow-hidden rounded-xl bg-panel text-left ${fresh.has(p.id) ? "animate-[vz-pop_600ms_ease-out]" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.caption ?? `Photo by ${p.authorName ?? "a guest"}`} loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-8 text-xs">
                <span className="truncate font-medium">{p.authorName ?? "Guest"} · {timeAgo(p.createdAt)}</span>
                {p.reactions > 0 && <span>🔥 {p.reactions}</span>}
              </span>
            </button>
          ))}
        </div>
      )}

      {access?.canPost && (
        <Link
          href={`/e/${slug}/camera`}
          className="fixed bottom-[max(env(safe-area-inset-bottom),20px)] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-accent px-6 py-4 font-semibold text-accent-ink shadow-2xl shadow-accent/40"
        >
          📸 Snap a photo
        </Link>
      )}

      {open && (
        <div className="fixed inset-0 z-40 flex flex-col bg-black/95" role="dialog" aria-label="Photo" onClick={() => setOpen(null)}>
          <div className="flex items-center justify-between p-4 text-sm">
            <span className="font-medium">{open.authorName ?? "Guest"} · {timeAgo(open.createdAt)} ago</span>
            <button type="button" className="rounded-full bg-white/10 px-3 py-1.5" onClick={() => setOpen(null)}>Close</button>
          </div>
          <div className="grid min-h-0 flex-1 place-items-center px-2" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={open.url} alt={open.caption ?? "Photo"} className="max-h-full max-w-full rounded-lg object-contain" />
          </div>
          <div className="space-y-3 p-4 pb-[max(env(safe-area-inset-bottom),16px)]" onClick={(e) => e.stopPropagation()}>
            {open.caption && <p className="text-center">{open.caption}</p>}
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => react(open)}
                className={`rounded-full px-5 py-2.5 font-semibold ${reacted.has(open.id) ? "bg-accent text-accent-ink" : "bg-white/10"}`}
              >
                🔥 {open.reactions}
              </button>
              <a href={open.url} download className="rounded-full bg-white/10 px-5 py-2.5">Save</a>
              {!open.mine && (
                <button type="button" onClick={() => report(open)} className="rounded-full bg-white/10 px-5 py-2.5 text-white/70">Report</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function UnlockGate({ slug, spot, geofenced }: { slug: string; spot: string | null; geofenced: boolean }) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const unlock = () => {
    setBusy(true)
    setError(null)
    const send = async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/e/${slug}/unlock`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ spot, ...body }) })
      if (res.ok) window.location.assign(`/e/${slug}/camera${spot ? `?spot=${encodeURIComponent(spot)}` : ""}`)
      else {
        setError((await res.json().catch(() => null))?.error ?? "Couldn't unlock")
        setBusy(false)
      }
    }
    if (!geofenced) return void send({})
    if (!("geolocation" in navigator)) {
      setError("This browser can't share location.")
      return setBusy(false)
    }
    navigator.geolocation.getCurrentPosition(
      (p) => send({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {
        setError("We need your location to confirm you're at the event.")
        setBusy(false)
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  if (!spot) {
    return (
      <div className="grid place-items-center px-6 py-20 text-center">
        <p className="text-5xl">🔒</p>
        <p className="mt-4 text-xl font-semibold">This feed unlocks at the event</p>
        <p className="mt-2 max-w-xs text-sm text-muted">Find a Vibez QR code at the venue and scan it with your phone&apos;s camera.</p>
      </div>
    )
  }
  return (
    <div className="grid place-items-center px-6 py-20 text-center">
      <p className="text-5xl">📍</p>
      <p className="mt-4 text-xl font-semibold">One quick check</p>
      <p className="mt-2 max-w-xs text-sm text-muted">This event&apos;s Vibez only opens on site. Share your location once to join.</p>
      {error && <p className="mt-4 text-sm text-danger" role="alert">{error}</p>}
      <button type="button" onClick={unlock} disabled={busy} className="btn-primary mt-6 px-6 py-3">{busy ? "Checking…" : "I'm here — let me in"}</button>
    </div>
  )
}
