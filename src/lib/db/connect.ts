// Connection logic shared by the app and CLI scripts (no "server-only" import here).
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import fs from "node:fs/promises";
import path from "node:path";
import * as schema from "./schema";
import { MIGRATION_SQL } from "./migrate";
import { importClinicsCsv } from "../clinic-import";

// Both drivers expose the same query API; type everything as node-postgres for simplicity.
export type DB = NodePgDatabase<typeof schema>;

export async function connect(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  let db: DB;
  if (url) {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: url,
      max: 5,
      ssl: process.env.PGSSL === "require" ? { rejectUnauthorized: false } : undefined,
    });
    await pool.query(MIGRATION_SQL);
    db = drizzlePg(pool, { schema });
  } else {
    // Local development: embedded Postgres (PGlite) persisted to ./.data
    const { PGlite } = await import("@electric-sql/pglite");
    const dir = process.env.PGLITE_DIR ?? "./.data/pglite";
    await fs.mkdir(path.dirname(dir), { recursive: true });
    const client = new PGlite(dir);
    await client.exec(MIGRATION_SQL);
    db = drizzlePglite(client, { schema }) as unknown as DB;
  }
  await seedClinicsIfEmpty(db);
  return db;
}

/** First boot convenience: load data/clinics.csv when the clinics table is empty. */
async function seedClinicsIfEmpty(db: DB) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.clinics);
  if (n > 0) return;
  const file = path.join(process.cwd(), "data", "clinics.csv");
  try {
    const csv = await fs.readFile(file, "utf8");
    const r = await importClinicsCsv(db, csv);
    console.log(`[settled] seeded ${r.inserted} clinics from data/clinics.csv`);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") console.error("[settled] clinic seed failed", e);
  }
}

export { schema };
