"use server"

import { admitWrite } from "@/lib/security/admission"

import { assertWriteRole } from "@/lib/security/authorization"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"
import { randomBytes } from "crypto"
import { db, schema } from "@/lib/db"
import { requireContext } from "@/lib/context"
import { newSpotToken } from "@/lib/vibez/tokens"

async function ownedEvent(eventId: string) {
  const ctx = await requireContext()
  assertWriteRole(ctx, "manage")
  await admitWrite(ctx)
  const [event] = await db
    .select()
    .from(schema.vibezEvents)
    .where(and(eq(schema.vibezEvents.id, eventId), eq(schema.vibezEvents.tenantId, ctx.tenant.id)))
  if (!event) throw new Error("Event not found")
  return { ctx, event }
}

const text = (v: FormDataEntryValue | null, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")
const dateOrNull = (v: FormDataEntryValue | null) => (typeof v === "string" && v ? new Date(v) : null)

function slugify(name: string) {
  const base = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "event"
  return `${base}-${randomBytes(3).toString("hex")}`
}

export async function createEvent(form: FormData) {
  const ctx = await requireContext()
  assertWriteRole(ctx, "manage")
  await admitWrite(ctx)
  const name = text(form.get("name"), 120)
  if (!name) throw new Error("Give your event a name")
  const [event] = await db
    .insert(schema.vibezEvents)
    .values({
      tenantId: ctx.tenant.id,
      slug: slugify(name),
      name,
      venue: text(form.get("venue"), 160) || null,
      startsAt: dateOrNull(form.get("startsAt")),
      accessMode: ["link", "scan", "geofence"].includes(String(form.get("accessMode"))) ? String(form.get("accessMode")) : "scan",
      createdById: ctx.userId,
    })
    .returning()
  // Every event starts with one printable code
  await db.insert(schema.vibezSpots).values({ eventId: event.id, label: "Main entrance", token: newSpotToken() })
  redirect(`/dashboard/events/${event.id}`)
}

export async function updateEvent(eventId: string, form: FormData) {
  const { event } = await ownedEvent(eventId)
  const accessMode = String(form.get("accessMode"))
  const lat = Number(form.get("geoLat")), lng = Number(form.get("geoLng"))
  const hasGeo = form.get("geoLat") !== "" && form.get("geoLng") !== "" && Number.isFinite(lat) && Number.isFinite(lng)
  if (accessMode === "geofence" && !hasGeo) throw new Error("Set the venue location to use the geofence")

  await db
    .update(schema.vibezEvents)
    .set({
      name: text(form.get("name"), 120) || event.name,
      venue: text(form.get("venue"), 160) || null,
      startsAt: dateOrNull(form.get("startsAt")),
      endsAt: dateOrNull(form.get("endsAt")),
      accessMode: ["link", "scan", "geofence"].includes(accessMode) ? accessMode : event.accessMode,
      geoLat: hasGeo ? lat : null,
      geoLng: hasGeo ? lng : null,
      geoRadiusM: Math.min(5000, Math.max(50, Number(form.get("geoRadiusM")) || 300)),
      moderation: form.get("moderation") === "approve" ? "approve" : "auto",
      flashDefault: form.get("flashDefault") === "on",
      maxPhotos: Math.min(20000, Math.max(10, Number(form.get("maxPhotos")) || 500)),
      perGuestPerHour: Math.min(500, Math.max(1, Number(form.get("perGuestPerHour")) || 20)),
      updatedAt: new Date(),
    })
    .where(eq(schema.vibezEvents.id, event.id))
  revalidatePath(`/dashboard/events/${event.id}`)
}

export async function setEventStatus(eventId: string, status: "live" | "closed") {
  const { event } = await ownedEvent(eventId)
  await db.update(schema.vibezEvents).set({ status, updatedAt: new Date() }).where(eq(schema.vibezEvents.id, event.id))
  revalidatePath(`/dashboard/events/${event.id}`)
}

export async function addSpot(eventId: string, form: FormData) {
  const { event } = await ownedEvent(eventId)
  const label = text(form.get("label"), 60)
  if (!label) return
  await db.insert(schema.vibezSpots).values({ eventId: event.id, label, token: newSpotToken() })
  revalidatePath(`/dashboard/events/${event.id}`)
}

export async function removeSpot(eventId: string, spotId: string) {
  const { event } = await ownedEvent(eventId)
  await db.delete(schema.vibezSpots).where(and(eq(schema.vibezSpots.id, spotId), eq(schema.vibezSpots.eventId, event.id)))
  revalidatePath(`/dashboard/events/${event.id}`)
}

export async function moderatePhoto(eventId: string, photoId: string, action: "approve" | "remove" | "ban") {
  const { ctx, event } = await ownedEvent(eventId)
  const p = schema.vibezPhotos
  const [photo] = await db.select().from(p).where(and(eq(p.id, photoId), eq(p.eventId, event.id)))
  if (!photo) return

  if (action === "approve") {
    await db.update(p).set({ status: "live", reportCount: 0 }).where(eq(p.id, photo.id))
  } else {
    await db.update(p).set({ status: "removed", removedById: ctx.userId }).where(eq(p.id, photo.id))
    // Removed photos also leave the workspace's Folders library
    if (photo.assetId) await db.delete(schema.assets).where(and(eq(schema.assets.id, photo.assetId), eq(schema.assets.tenantId, event.tenantId)))
    if (action === "ban" && photo.guestId !== "organizer") {
      await db.insert(schema.vibezBans).values({ eventId: event.id, guestId: photo.guestId, bannedById: ctx.userId }).onConflictDoNothing()
    }
  }
  revalidatePath(`/dashboard/events/${event.id}`)
}
