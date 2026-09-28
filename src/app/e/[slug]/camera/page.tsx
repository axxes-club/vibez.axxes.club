import { notFound, redirect } from "next/navigation"
import { eventBySlug, guestAccess } from "@/lib/vibez/access"
import { Camera } from "@/components/vibez/camera"

export const dynamic = "force-dynamic"
export const metadata = { title: "Vibez camera", robots: { index: false } }

export default async function CameraPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ spot?: string }> }) {
  const [{ slug }, { spot }] = await Promise.all([params, searchParams])
  const event = await eventBySlug(slug)
  if (!event) notFound()
  const access = await guestAccess(event)
  if (!access.canPost) redirect(`/e/${slug}${spot ? `?spot=${encodeURIComponent(spot)}` : ""}`)
  return <Camera slug={slug} eventName={event.name} flashDefault={event.flashDefault} geofenced={event.accessMode === "geofence" && !access.organizer} spot={spot ?? null} />
}
