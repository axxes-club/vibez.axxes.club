import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { guestAccess } from "@/lib/vibez/access";
import { eventPhotoCanRead } from "./permissions-core.mjs";
export async function authorizeAssetRead(
  _request: Request,
  { urls, record }: any,
) {
  const photos = await db
    .select()
    .from(schema.vibezPhotos)
    .where(inArray(schema.vibezPhotos.url, urls));
  for (const photo of photos) {
    const [event] = await db
      .select()
      .from(schema.vibezEvents)
      .where(eq(schema.vibezEvents.id, photo.eventId));
    if (
      event &&
      eventPhotoCanRead(await guestAccess(event), photo.status, photo.guestId)
    )
      return true;
  }
  // A pending upload is not a published feed asset. The owner gets readback only.
  if (!photos.length && record?.metadata.eventId) {
    const [event] = await db
      .select()
      .from(schema.vibezEvents)
      .where(eq(schema.vibezEvents.id, record.metadata.eventId));
    if (event) {
      const access = await guestAccess(event);
      return (
        access.canView &&
        !!access.guestId &&
        access.guestId === record.metadata.guestId
      );
    }
  }
  return false;
}
