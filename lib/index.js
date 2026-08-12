#!/usr/bin/env node
// Orchestrates the three-phase tour sync: inventory → details → geocode.

const { writeFile, mkdir } = require("node:fs/promises");
const { existsSync, readFileSync } = require("node:fs");
const { join, dirname } = require("node:path");
const { log, warn, error } = require("./log");
const { discoverInventory } = require("./inventory");
const { enrichTours } = require("./enrich");
const { geocodeTours } = require("./geocode");
const {
  warnOnTotalMismatch,
  warnOnUnmatchedCompleted,
} = require("./check-data");

async function main() {
  const ROOT = process.cwd();

  require("dotenv").config({ path: join(ROOT, ".env") });
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || "";

  const OUT_FILE = join(ROOT, "src", "data", "tours.json");
  const META_FILE = join(ROOT, "src", "data", "meta.json");
  const COMPLETED_FILE = join(ROOT, "src", "data", "completed.json");

  const driver = process.env.FETCH_DRIVER === "browser" ? "browser" : "http";
  if (driver === "browser") {
    log("Using browser fetch driver (headless Chromium).");
  }

  // Phase 1: inventory — discover the full URL set, union with existing data
  log("Phase 1: inventory");
  const { tours, reportedTotal } = await discoverInventory({ driver });
  log(`Inventory: ${tours.length} tours discovered.`);
  warnOnTotalMismatch(tours.length, reportedTotal);

  // Union with existing tours.json: merge missing detail/geocode fields from
  // existing tours and keep tours not returned by this fetch (e.g. pagination
  // blocked) so a partial run never drops catalog data or wipes details.
  if (existsSync(OUT_FILE)) {
    try {
      const existing = JSON.parse(readFileSync(OUT_FILE, "utf8"));
      if (Array.isArray(existing)) {
        const byUrl = new Map(existing.map((t) => [t.url, t]));
        for (const tour of tours) {
          const prev = byUrl.get(tour.url);
          if (!prev) continue;
          if (prev.details) {
            for (const key of [
              "start",
              "location",
              "duration",
              "audioPoints",
              "tourType",
              "description",
            ]) {
              if (!tour.details[key] && prev.details[key]) {
                tour.details[key] = prev.details[key];
              }
            }
          }
          if (
            prev.geocode &&
            (tour.geocode?.lat == null || tour.geocode?.lng == null)
          ) {
            if (prev.geocode.lat != null || prev.geocode.lng != null) {
              tour.geocode = { ...tour.geocode, ...prev.geocode };
            }
          }
        }
        const freshUrls = new Set(tours.map((t) => t.url));
        const retained = existing.filter((t) => !freshUrls.has(t.url));
        for (const t of retained) tours.push(t);
        if (retained.length > 0) {
          warn(
            `Retained ${retained.length} tour(s) from previous tours.json not returned by this fetch.`,
          );
        }
      }
    } catch {
      warn("Could not read existing tours.json; starting fresh.");
    }
  }

  // Sort by title up front so the incremental phase writes keep tours.json in
  // stable order — avoiding large git deltas on partial runs.
  tours.sort((a, b) => (a.title || "").localeCompare(b.title || ""));

  // Phase 2: details — enrich only tours missing start/location
  log("Phase 2: details");
  await enrichTours(tours, { outFile: OUT_FILE });

  // Phase 3: geocode — only tours missing coordinates
  log("Phase 3: geocode");
  await geocodeTours(tours, apiKey, { delayMs: 120 });

  tours.sort((a, b) => (a.title || "").localeCompare(b.title || ""));

  const outDir = dirname(OUT_FILE);
  if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(tours, null, 2)}\n`, "utf8");
  await writeFile(
    META_FILE,
    `${JSON.stringify({ lastSynced: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
  log(`Saved ${tours.length} tours to ${OUT_FILE}`);
  log(`Saved meta to ${META_FILE}`);

  // Warn about completed tours that no longer match the dataset
  if (existsSync(COMPLETED_FILE)) {
    try {
      const completed = JSON.parse(readFileSync(COMPLETED_FILE, "utf8"));
      warnOnUnmatchedCompleted(
        completed,
        tours.map((t) => t.title),
      );
    } catch {
      warn(
        "Could not read completed.json; skipping completed-tour remap check.",
      );
    }
  }
}

main().catch((err) => {
  error(err?.stack || String(err));
  process.exit(1);
});
