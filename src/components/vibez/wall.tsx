"use client"

import { useEffect, useRef, useState } from "react"

type Photo = { id: string; url: string; authorName: string | null; caption: string | null }

const POLL_MS = 5000
const SLIDE_MS = 6000

export function Wall({ slug, eventName, qrSvg }: { slug: string; eventName: string; qrSvg: string }) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [index, setIndex] = useState(0)
  const latest = useRef<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/e/${slug}/photos${latest.current ? `?after=${encodeURIComponent(latest.current)}` : ""}`, { cache: "no-store" }).catch(() => null)
      if (!res?.ok) return
      const data = await res.json()
      if (!data.photos.length) return
      latest.current = data.photos[0].createdAt
      setPhotos((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        const incoming = (data.photos as Photo[]).filter((p) => !seen.has(p.id))
        if (prev.length && incoming.length) setIndex(0) // jump to the newest arrival
        return [...incoming, ...prev].slice(0, 200)
      })
    }
    load()
    const t = setInterval(load, POLL_MS)
    return () => clearInterval(t)
  }, [slug])

  useEffect(() => {
    if (photos.length < 2) return
    const t = setInterval(() => setIndex((i) => (i + 1) % photos.length), SLIDE_MS)
    return () => clearInterval(t)
  }, [photos.length])

  const current = photos[index]

  return (
    <main className="relative h-dvh overflow-hidden bg-black text-white">
      {current ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={`bg-${current.id}`} src={current.url} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-3xl" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={current.id} src={current.url} alt={current.caption ?? "Guest photo"} className="absolute inset-0 m-auto max-h-[88%] max-w-[80%] animate-[vz-pop_700ms_ease-out] rounded-2xl object-contain shadow-2xl" />
          <div className="absolute bottom-8 left-10 max-w-[55%]">
            <p className="text-3xl font-semibold drop-shadow">{current.authorName ?? "Guest"}</p>
            {current.caption && <p className="mt-1 text-xl text-white/80 drop-shadow">{current.caption}</p>}
          </div>
        </>
      ) : (
        <div className="grid h-full place-items-center text-center">
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.3em] text-accent">Vibez</p>
            <p className="mt-4 text-6xl font-semibold">{eventName}</p>
            <p className="mt-4 text-2xl text-white/60">Scan the code and snap the first photo ✨</p>
          </div>
        </div>
      )}
      <div className="absolute bottom-8 right-10 flex items-end gap-4 rounded-2xl bg-black/50 p-4 backdrop-blur">
        <div className="text-right">
          <p className="text-lg font-semibold">Scan to add your photo</p>
          <p className="text-sm text-white/60">{photos.length} photos · {eventName}</p>
        </div>
        <div className="size-32 rounded-lg bg-white p-1.5" dangerouslySetInnerHTML={{ __html: qrSvg }} />
      </div>
    </main>
  )
}
