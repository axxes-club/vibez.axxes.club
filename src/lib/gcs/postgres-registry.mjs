import { StorageError } from "./core.mjs";
export class PostgresRegistry {
  constructor(pool) {
    this.pool = pool;
  }
  async create(record) {
    if (record.app !== "vibez" || record.route !== "vibezPhoto") {
      await this.pool.query("INSERT INTO gcp_asset_uploads(id,owner,document,expires_at) VALUES($1,$2,$3,$4)", [record.id, record.owner, record, new Date(record.maxExpiresAt ?? record.expiresAt)]);
      return;
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await this.assertPhotoCapacity(client, record, true);
      // Receipt rows are expiring reservations as well as completion receipts.
      // Event-row locking serializes quota admission across instances.
      await client.query("INSERT INTO gcp_asset_uploads(id,owner,document,expires_at) VALUES($1,$2,$3,$4)", [record.id, record.owner, record, new Date(record.maxExpiresAt ?? record.expiresAt)]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  async assertPhotoCapacity(client, record, reserve) {
    if (record.app !== "vibez" || record.route !== "vibezPhoto") return;
    const metadata = record.metadata;
    const event = await client.query("SELECT max_photos,per_guest_per_hour,status FROM vibez_events WHERE id=$1 AND tenant_id=$2 FOR UPDATE", [metadata.eventId, metadata.tenantId]);
    if (!event.rows[0] || event.rows[0].status !== "live") throw new StorageError("Event is closed", 403);
    const counts = await client.query(`SELECT
      (SELECT count(*) FROM vibez_photos WHERE event_id=$1) AS total,
      (SELECT count(*) FROM vibez_photos WHERE event_id=$1 AND guest_id=$2 AND created_at>statement_timestamp()-interval '1 hour') AS recent,
      (SELECT count(*) FROM gcp_asset_uploads WHERE document->>'app'='vibez' AND document->>'route'='vibezPhoto' AND document->'metadata'->>'eventId'=$1::text AND result IS NULL AND expires_at>statement_timestamp()) AS pending,
      (SELECT count(*) FROM gcp_asset_uploads WHERE document->>'app'='vibez' AND document->>'route'='vibezPhoto' AND document->'metadata'->>'eventId'=$1::text AND document->'metadata'->>'guestId'=$2 AND result IS NULL AND expires_at>statement_timestamp()) AS guest_pending`, [metadata.eventId, metadata.guestId]);
    const count = counts.rows[0], limits = event.rows[0];
    const total = Number(count.total)+(reserve?Number(count.pending):0);
    const recent = Number(count.recent)+(reserve?Number(count.guest_pending):0);
    if (total >= limits.max_photos || (!metadata.userId && recent >= limits.per_guest_per_hour)) throw new StorageError("Photo quota limit exceeded", 429);
  }
  async releaseReservation(id, owner) {
    await this.pool.query("DELETE FROM gcp_asset_uploads WHERE id=$1 AND owner=$2 AND result IS NULL", [id, owner]);
  }
  async get(id) {
    const r = await this.pool.query(
      "SELECT document,result FROM gcp_asset_uploads WHERE id=$1",
      [id],
    );
    if (!r.rows[0]) return null;
    return { ...r.rows[0].document, result: r.rows[0].result };
  }
  async renewOnce(id, owner, renew) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const response = await client.query(
        "SELECT owner,document,result FROM gcp_asset_uploads WHERE id=$1 FOR UPDATE",
        [id],
      );
      const row = response.rows[0];
      if (!row || row.owner !== owner)
        throw new StorageError("Upload owner mismatch", 403);
      let result;
      if (row.result != null) result = { complete: row.result };
      else {
        result = await renew(row.document, client);
        const deadline = row.document.maxExpiresAt ?? row.document.expiresAt;
        await client.query(
          "UPDATE gcp_asset_uploads SET document=$2,expires_at=$3 WHERE id=$1",
          [id, row.document, new Date(deadline)],
        );
      }
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async completeOnce(id, owner, run) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const r = await client.query(
        "SELECT owner,document,result FROM gcp_asset_uploads WHERE id=$1 FOR UPDATE",
        [id],
      );
      if (!r.rows[0] || r.rows[0].owner !== owner)
        throw new StorageError("Upload owner mismatch", 403);
      let result = r.rows[0].result;
      if (result == null) {
        await this.assertPhotoCapacity(client, r.rows[0].document, false);
        result = await run(r.rows[0].document, client);
        await client.query(
          "UPDATE gcp_asset_uploads SET result=$2 WHERE id=$1",
          [id, result],
        );
      }
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
