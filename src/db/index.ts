/**
 * اتصال پایگاه داده.
 *
 * در محیط توسعه، Next.js ماژول‌ها را در هر hot-reload دوباره ارزیابی می‌کند؛
 * نگهداری pool روی globalThis از ساخت ده‌ها اتصال اضافی جلوگیری می‌کند.
 */
import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __ariaPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "متغیر محیطی DATABASE_URL تعریف نشده است. فایل .env را از روی .env.example بسازید.",
    );
  }

  return new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
}

const pool = globalThis.__ariaPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalThis.__ariaPool = pool;

export const db = drizzle(pool, { schema, casing: "snake_case" });
export { schema };
export type Database = typeof db;
