# Vibez — every room is a photobooth

Event photo feeds for AXXES workspaces (vibez.axxes.club), and the infrastructure behind VIBEZ on afters.am.

- Organizers (AXXES account via Handshake): create events, print QR spots, choose access (link / scan / scan + geofence), moderate, run a TV wall.
- Guests (no account): scan `/s/<token>` → unlock cookie → browser camera with a night-flash grade → UploadThing → live feed.
- Every photo is also written to the shared `assets` table under `Vibez · <event>` so it appears in Folders and the Suite's Assets tab.
- Tables: `vibez_events`, `vibez_spots`, `vibez_photos`, `vibez_reports`, `vibez_bans` (additive — `scripts/create-tables.sql`).

Env: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `AUTH_COOKIE_DOMAIN`, `HANDSHAKE_URL`, `UPLOADTHING_TOKEN`.
