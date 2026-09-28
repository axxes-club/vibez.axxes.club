"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useUploadThing } from "@/lib/uploadthing/client"
import { drawSource, nightFlash, toJpeg } from "@/lib/vibez/flash"

type Props = { slug: string; eventName: string; flashDefault: boolean; geofenced: boolean; spot: string | null }
type Stage = "live" | "review" | "posting" | "posted"

const NAME_KEY = "vz_name"

export function Camera({ slug, eventName, flashDefault, geofenced, spot }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [facing, setFacing] = useState<"environment" | "user">("environment")
  const [flash, setFlash] = useState(flashDefault)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [stage, setStage] = useState<Stage>("live")
  const [shot, setShot] = useState<{ url: string; blob: Blob } | null>(null)
  const [flashFx, setFlashFx] = useState(false)
  const [name, setName] = useState("")
  const [caption, setCaption] = useState("")
  const [error, setError] = useState<string | null>(null)
  const coords = useRef<string | null>(null)

  useEffect(() => {
    try {
      setName(localStorage.getItem(NAME_KEY) ?? "")
    } catch {}
    if (geofenced && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => (coords.current = `${p.coords.latitude},${p.coords.longitude}`),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }, [geofenced])

  // Start (or switch) the live camera
  useEffect(() => {
    if (stage !== "live") return
    let cancelled = false
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop())
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setCameraError(null)
      })
      .catch(() => setCameraError("Camera access is blocked. You can still use your phone's camera below."))
    if (!navigator.mediaDevices) setCameraError("This browser can't open the camera here. Use your phone's camera below.")
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [facing, stage])

  const process = useCallback(
    async (source: CanvasImageSource, w: number, h: number, mirror: boolean) => {
      const canvas = drawSource(source, w, h, mirror)
      if (flash) nightFlash(canvas)
      const blob = await toJpeg(canvas)
      setShot({ url: URL.createObjectURL(blob), blob })
      setStage("review")
    },
    [flash]
  )

  const snap = async () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    if (flash) {
      setFlashFx(true)
      setTimeout(() => setFlashFx(false), 260)
    }
    navigator.vibrate?.(40)
    await process(video, video.videoWidth, video.videoHeight, facing === "user")
  }

  const fromFile = async (file: File | undefined) => {
    if (!file) return
    const bitmap = await createImageBitmap(file)
    await process(bitmap, bitmap.width, bitmap.height, false)
  }

  const { startUpload } = useUploadThing("vibezPhoto", {
    headers: () => {
      const h: Record<string, string> = { "x-vibez-event": encodeURIComponent(slug) }
      if (name.trim()) h["x-vibez-name"] = encodeURIComponent(name.trim())
      if (caption.trim()) h["x-vibez-caption"] = encodeURIComponent(caption.trim())
      if (spot) h["x-vibez-spot"] = encodeURIComponent(spot)
      if (coords.current) h["x-vibez-geo"] = coords.current
      return h
    },
    onClientUploadComplete: (res) => {
      setStage("posted")
      navigator.vibrate?.([30, 60, 30])
      setError(res[0]?.serverData?.status === "pending" ? "Posted! It'll show up once the organizer approves it." : null)
    },
    onUploadError: (e) => {
      setError(e.message || "Couldn't post that one. Try again?")
      setStage("review")
    },
  })

  const post = async () => {
    if (!shot) return
    try {
      localStorage.setItem(NAME_KEY, name.trim())
    } catch {}
    setError(null)
    setStage("posting")
    await startUpload([new File([shot.blob], `vibez-${Date.now()}.jpg`, { type: "image/jpeg" })])
  }

  const retake = () => {
    if (shot) URL.revokeObjectURL(shot.url)
    setShot(null)
    setCaption("")
    setError(null)
    setStage("live")
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-black text-white">
      <header className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <Link href={`/e/${slug}`} className="rounded-full bg-white/10 px-3 py-1.5 text-sm backdrop-blur">← Feed</Link>
        <p className="max-w-[55%] truncate text-sm font-medium">{eventName}</p>
        <button
          type="button"
          onClick={() => setFlash(!flash)}
          className={`rounded-full px-3 py-1.5 text-sm backdrop-blur ${flash ? "bg-[#ff4d8d] text-black" : "bg-white/10"}`}
          aria-pressed={flash}
          aria-label="Night flash"
        >
          ⚡ {flash ? "Flash" : "Off"}
        </button>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {stage === "live" ? (
          cameraError ? (
            <div className="grid h-full place-items-center p-8 text-center text-sm text-white/70">{cameraError}</div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`}
            />
          )
        ) : (
          shot && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shot.url} alt="Your photo" className="h-full w-full object-contain" />
          )
        )}
        <div className={`pointer-events-none absolute inset-0 bg-white transition-opacity duration-200 ${flashFx ? "opacity-100" : "opacity-0"}`} />
        {stage === "posted" && (
          <div className="absolute inset-0 grid place-items-center bg-black/60 p-8 text-center backdrop-blur-sm">
            <div>
              <p className="text-5xl">🎉</p>
              <p className="mt-3 text-xl font-semibold">{error ?? "It's on the feed!"}</p>
              <div className="mt-6 flex justify-center gap-3">
                <Link href={`/e/${slug}`} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black">See the feed</Link>
                <button type="button" onClick={retake} className="rounded-full bg-white/15 px-5 py-2.5 text-sm font-semibold">Take another</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-4">
        {stage === "live" && (
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => fileRef.current?.click()} className="size-12 rounded-full bg-white/10 text-lg backdrop-blur" aria-label="Use phone camera or pick a photo">🖼</button>
            <button
              type="button"
              onClick={snap}
              disabled={!!cameraError}
              className="size-20 rounded-full border-4 border-white bg-white/20 transition active:scale-90 disabled:opacity-30"
              aria-label="Take photo"
            />
            <button type="button" onClick={() => setFacing(facing === "user" ? "environment" : "user")} className="size-12 rounded-full bg-white/10 text-lg backdrop-blur" aria-label="Switch camera">⟲</button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => fromFile(e.target.files?.[0])} />
          </div>
        )}
        {(stage === "review" || stage === "posting") && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={40} className="w-1/3 rounded-full bg-white/10 px-4 py-2.5 text-sm outline-none placeholder:text-white/40" aria-label="Your name" />
              <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Say something…" maxLength={140} className="flex-1 rounded-full bg-white/10 px-4 py-2.5 text-sm outline-none placeholder:text-white/40" aria-label="Caption" />
            </div>
            {error && <p className="text-center text-sm text-[#ff8fb5]" role="alert">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={retake} disabled={stage === "posting"} className="flex-1 rounded-full bg-white/15 py-3.5 font-semibold">Retake</button>
              <button type="button" onClick={post} disabled={stage === "posting"} className="flex-[2] rounded-full bg-[#ff4d8d] py-3.5 font-semibold text-black">
                {stage === "posting" ? "Posting…" : "Post to Vibez"}
              </button>
            </div>
          </div>
        )}
      </footer>
    </div>
  )
}
