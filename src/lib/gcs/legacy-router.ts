import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { and, count, eq, gte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { eventBySlug, guestAccess } from "@/lib/vibez/access";
import { distanceM } from "@/lib/vibez/geo";

const f = createUploadthing();

const header = (req: Request, name: string) => {
  const v = req.headers.get(name);
  return v ? decodeURIComponent(v) : null;
};

export const ourFileRouter = {
  // One photo per upload, taken in the Vibez camera
  vibezPhoto: f({ image: { maxFileSize: "16MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const event = await eventBySlug(header(req, "x-vibez-event") ?? "");
      if (!event) throw new UploadThingError("No such event");
      const access = await guestAccess(event);
      if (!access.canPost) {
        throw new UploadThingError(
          access.reason === "closed"
            ? "This event's Vibez is closed"
            : access.reason === "banned"
              ? "You can't post to this event"
              : "Scan a Vibez code at the event first",
        );
      }
      const guestId = access.guestId ?? `organizer`;

      if (
        event.accessMode === "geofence" &&
        !access.organizer &&
        event.geoLat != null &&
        event.geoLng != null
      ) {
        const [lat, lng] = (header(req, "x-vibez-geo") ?? "")
          .split(",")
          .map(Number);
        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          distanceM({ lat, lng }, { lat: event.geoLat, lng: event.geoLng }) >
            event.geoRadiusM
        )
          throw new UploadThingError("You need to be at the event to post");
      }

      const p = schema.vibezPhotos;
      const [[{ total }], [{ recent }]] = await Promise.all([
        db.select({ total: count() }).from(p).where(eq(p.eventId, event.id)),
        db
          .select({ recent: count() })
          .from(p)
          .where(
            and(
              eq(p.eventId, event.id),
              eq(p.guestId, guestId),
              gte(p.createdAt, new Date(Date.now() - 3_600_000)),
            ),
          ),
      ]);
      if (total >= event.maxPhotos)
        throw new UploadThingError("This event's feed is full");
      if (!access.organizer && recent >= event.perGuestPerHour)
        throw new UploadThingError(
          "Easy there — you've hit this hour's photo limit",
        );

      const spotToken = header(req, "x-vibez-spot");
      const [spot] = spotToken
        ? await db
            .select({ id: schema.vibezSpots.id })
            .from(schema.vibezSpots)
            .where(
              and(
                eq(schema.vibezSpots.token, spotToken),
                eq(schema.vibezSpots.eventId, event.id),
              ),
            )
        : [];

      return {
        eventId: event.id,
        tenantId: event.tenantId,
        eventName: event.name,
        moderation: event.moderation,
        guestId,
        spotId: spot?.id ?? null,
        authorName:
          (header(req, "x-vibez-name") ?? "").trim().slice(0, 40) || null,
        caption:
          (header(req, "x-vibez-caption") ?? "").trim().slice(0, 140) || null,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Every photo also lands in the organizer's Folders library
      const [asset] = await db
        .insert(schema.assets)
        .values({
          tenantId: metadata.tenantId,
          name: `${metadata.authorName ?? "Guest"} · ${new Date().toLocaleString("en-US", { hour: "numeric", minute: "2-digit" })}`,
          originalFilename: file.name,
          url: file.ufsUrl,
          mimeType: file.type || "image/jpeg",
          fileSize: file.size,
          folder: `Vibez · ${metadata.eventName}`.slice(0, 120),
          category: "image",
          source: "upload",
          tags: ["vibez"],
          description: metadata.caption,
        })
        .returning({ id: schema.assets.id });

      const [photo] = await db
        .insert(schema.vibezPhotos)
        .values({
          eventId: metadata.eventId,
          spotId: metadata.spotId,
          guestId: metadata.guestId,
          authorName: metadata.authorName,
          caption: metadata.caption,
          url: file.ufsUrl,
          assetId: asset.id,
          status: metadata.moderation === "approve" ? "pending" : "live",
        })
        .returning({
          id: schema.vibezPhotos.id,
          status: schema.vibezPhotos.status,
        });
      return { photoId: photo.id, status: photo.status };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
