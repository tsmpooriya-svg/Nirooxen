/**
 * اجرای یک فایل مهاجرت drizzle به‌صورت دستی.
 *
 * چرا لازم است؟ اسکیمای اولیه این پروژه با `db:push` ساخته شده بود، نه با
 * `db:migrate`. بنابراین جدول ردیابی `drizzle.__drizzle_migrations` خالی
 * ماند و `drizzle-kit migrate` تلاش می‌کرد `0000_init` را دوباره روی
 * جداول موجود اجرا کند و متوقف می‌شد.
 *
 * این اسکریپت:
 *   ۱. فایل مهاجرت خواسته‌شده را در یک تراکنش اجرا می‌کند
 *   ۲. هش آن را در جدول ردیابی ثبت می‌کند تا از این پس `db:migrate` درست کار کند
 *   ۳. مهاجرت‌های قبلیِ ازپیش‌اعمال‌شده را در صورت نیاز فقط ثبت می‌کند (بدون اجرا)
 *
 * اجرا:  node scripts/apply-migration.mjs 0001_plain_red_ghost
 */
import "dotenv/config";

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";

const tag = process.argv[2];
if (!tag) {
  console.error("usage: node scripts/apply-migration.mjs <migration-tag>");
  process.exit(1);
}

const journal = JSON.parse(readFileSync(resolve("drizzle/meta/_journal.json"), "utf8"));
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
await client.query(`
  CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
  )
`);

const applied = await client.query("select hash from drizzle.__drizzle_migrations");
const appliedHashes = new Set(applied.rows.map((r) => r.hash));

for (const entry of journal.entries) {
  const sql = readFileSync(resolve(`drizzle/${entry.tag}.sql`), "utf8");
  const hash = createHash("sha256").update(sql).digest("hex");

  if (appliedHashes.has(hash)) {
    console.log(`= ${entry.tag} — قبلاً ثبت شده`);
    continue;
  }

  if (entry.tag !== tag) {
    // مهاجرت‌های قدیمی‌تر با db:push اعمال شده‌اند؛ فقط ثبت می‌شوند
    await client.query("insert into drizzle.__drizzle_migrations (hash, created_at) values ($1,$2)", [
      hash,
      entry.when,
    ]);
    console.log(`~ ${entry.tag} — ازپیش‌اعمال‌شده، فقط ثبت شد`);
    continue;
  }

  console.log(`→ ${entry.tag} — در حال اجرا…`);
  const statements = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    await client.query("BEGIN");
    for (const statement of statements) await client.query(statement);
    await client.query("insert into drizzle.__drizzle_migrations (hash, created_at) values ($1,$2)", [
      hash,
      entry.when,
    ]);
    await client.query("COMMIT");
    console.log(`✓ ${entry.tag} — ${statements.length} دستور اجرا شد`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`✗ ${entry.tag} — ناموفق، تراکنش برگشت خورد`);
    throw error;
  }
}

await client.end();
