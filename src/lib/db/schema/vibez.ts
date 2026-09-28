import { boolean, doublePrecision, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"

// Vibez's own tables (prefixed; created by scripts/create-tables.sql)

export const vibezEvents = pgTable(
  "vibez_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    venue: text("venue"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    // link: anyone with the event link · scan: must scan a QR spot · geofence: scan + be within the radius
    accessMode: text("access_mode").notNull().default("scan"),
    geoLat: doublePrecision("geo_lat"),
    geoLng: doublePrecision("geo_lng"),
    geoRadiusM: integer("geo_radius_m").notNull().default(300),
    // auto: posts go live immediately · approve: an organizer approves each post
    moderation: text("moderation").notNull().default("auto"),
    flashDefault: boolean("flash_default").notNull().default(true),
    maxPhotos: integer("max_photos").notNull().default(500),
    perGuestPerHour: integer("per_guest_per_hour").notNull().default(20),
    status: text("status").notNull().default("live"), // live | closed
    externalRef: text("external_ref"), // e.g. an afters.am event id
    createdById: text("created_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("vibez_events_tenant_idx").on(t.tenantId)]
)

// A printed QR code placed somewhere at the event ("Bar", "Dance floor"…)
export const vibezSpots = pgTable(
  "vibez_spots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull(),
    label: text("label").notNull(),
    token: text("token").notNull().unique(),
    scans: integer("scans").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("vibez_spots_event_idx").on(t.eventId)]
)

export const vibezPhotos = pgTable(
  "vibez_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull(),
    spotId: uuid("spot_id"),
    guestId: text("guest_id").notNull(),
    authorName: text("author_name"),
    caption: text("caption"),
    url: text("url").notNull(),
    assetId: uuid("asset_id"),
    status: text("status").notNull().default("live"), // live | pending | removed
    reactions: integer("reactions").notNull().default(0),
    reportCount: integer("report_count").notNull().default(0),
    removedById: text("removed_by_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("vibez_photos_event_idx").on(t.eventId, t.createdAt), index("vibez_photos_guest_idx").on(t.eventId, t.guestId)]
)

export const vibezReports = pgTable(
  "vibez_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    photoId: uuid("photo_id").notNull(),
    guestId: text("guest_id").notNull(),
    reason: text("reason").notNull().default("other"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("vibez_reports_once_idx").on(t.photoId, t.guestId)]
)

// Per event: a ban never follows a guest to the next event
export const vibezBans = pgTable(
  "vibez_bans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull(),
    guestId: text("guest_id").notNull(),
    bannedById: text("banned_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("vibez_bans_once_idx").on(t.eventId, t.guestId)]
)
