/**
 * Read-only reconciliation of product image rows and the local media tree.
 *
 * Usage:
 *   npm run audit:media
 *   npm run audit:media -- --json
 *   npm run audit:media -- --strict
 *
 * This script never removes or moves a file. `--strict` only changes the exit
 * code when missing, orphaned, malformed, or symlinked assets are found.
 */
import "dotenv/config";

import { lstat, readdir } from "node:fs/promises";
import path from "node:path";

import { Client } from "pg";

const JSON_OUT = process.argv.includes("--json");
const STRICT = process.argv.includes("--strict");
const ORIGINAL_NAMES = new Set(["original.jpg", "original.png", "original.webp"]);
const ASSET_KEY = /^products\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/i;

type Asset = { key: string; bytes: number; hasDetail: boolean; originals: number };

async function scanMedia(root: string) {
  const productsRoot = path.join(root, "products");
  const assets: Asset[] = [];
  let emptyDirectories = 0;
  let unexpectedFiles = 0;
  let symlinks = 0;

  const productEntries = await readdir(productsRoot, { withFileTypes: true });
  for (const product of productEntries) {
    if (product.isSymbolicLink()) {
      symlinks += 1;
      continue;
    }
    if (!product.isDirectory()) {
      unexpectedFiles += 1;
      continue;
    }

    const productDir = path.join(productsRoot, product.name);
    const assetEntries = await readdir(productDir, { withFileTypes: true });
    if (assetEntries.length === 0) emptyDirectories += 1;

    for (const asset of assetEntries) {
      if (asset.isSymbolicLink()) {
        symlinks += 1;
        continue;
      }
      if (!asset.isDirectory()) {
        unexpectedFiles += 1;
        continue;
      }

      const assetDir = path.join(productDir, asset.name);
      const files = await readdir(assetDir, { withFileTypes: true });
      if (files.length === 0) {
        emptyDirectories += 1;
        continue;
      }

      let bytes = 0;
      let hasDetail = false;
      let originals = 0;
      for (const file of files) {
        const full = path.join(assetDir, file.name);
        const info = await lstat(full);
        if (info.isSymbolicLink()) {
          symlinks += 1;
          continue;
        }
        if (!info.isFile()) {
          unexpectedFiles += 1;
          continue;
        }
        bytes += info.size;
        if (file.name === "detail.webp") hasDetail = true;
        else if (ORIGINAL_NAMES.has(file.name)) originals += 1;
        else unexpectedFiles += 1;
      }

      const key = `products/${product.name}/${asset.name}`;
      assets.push({ key, bytes, hasDetail, originals });
    }
  }

  return { assets, emptyDirectories, unexpectedFiles, symlinks };
}

async function main() {
  const configuredRoot = process.env.MEDIA_STORAGE_ROOT?.trim();
  if (!configuredRoot || !path.isAbsolute(configuredRoot)) {
    throw new Error("MEDIA_STORAGE_ROOT must be an absolute path.");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

  const root = path.resolve(configuredRoot);
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query<{ storage_key: string }>(
      "select storage_key from product_images where storage_key is not null order by storage_key",
    );
    const referenced = new Set(rows.map((row) => row.storage_key.replaceAll("\\", "/").replace(/\/$/, "")));
    const malformedKeys = [...referenced].filter((key) => !ASSET_KEY.test(key)).length;

    const scan = await scanMedia(root);
    const byKey = new Map(scan.assets.map((asset) => [asset.key, asset]));
    const orphaned = scan.assets.filter((asset) => !referenced.has(asset.key));
    const missing = [...referenced].filter((key) => !byKey.has(key));
    const incompleteReferenced = [...referenced]
      .map((key) => byKey.get(key))
      .filter((asset): asset is Asset => Boolean(asset))
      .filter((asset) => !asset.hasDetail || asset.originals !== 1);
    const incompleteOrphans = orphaned.filter((asset) => !asset.hasDetail || asset.originals !== 1);

    const report = {
      databaseKeys: referenced.size,
      assetDirectories: scan.assets.length,
      healthyReferencedAssets: referenced.size - missing.length - incompleteReferenced.length,
      missingReferencedAssets: missing.length,
      incompleteReferencedAssets: incompleteReferenced.length,
      orphanedAssets: orphaned.length,
      orphanedBytes: orphaned.reduce((sum, asset) => sum + asset.bytes, 0),
      incompleteOrphans: incompleteOrphans.length,
      emptyDirectories: scan.emptyDirectories,
      malformedDatabaseKeys: malformedKeys,
      unexpectedFiles: scan.unexpectedFiles,
      symlinks: scan.symlinks,
    };

    if (JSON_OUT) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log("\n── Media integrity audit (read-only) ──\n");
      for (const [label, value] of Object.entries(report)) {
        console.log(`  ${label.padEnd(28, "·")} ${value}`);
      }
      console.log("\n  No files were changed.\n");
    }

    if (
      STRICT &&
      (report.missingReferencedAssets > 0 ||
        report.incompleteReferencedAssets > 0 ||
        report.orphanedAssets > 0 ||
        report.malformedDatabaseKeys > 0 ||
        report.unexpectedFiles > 0 ||
        report.symlinks > 0)
    ) {
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("\n✖ Media audit failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
