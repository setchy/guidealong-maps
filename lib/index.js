#!/usr/bin/env node
// Orchestrates the three-phase tour sync: inventory → details → geocode.

const { writeFile, mkdir } = require("node:fs/promises");
const { existsSync, readFileSync } = require("node:fs");
const { join, dirname } = require("node:path");
const { log, warn, error, phase, success, summary } = require("./log");
const { discoverInventory } = require("./inventory");
const { enrichTours } = require("./enrich");
const { geocodeTours } = require("./geocode");
const {
  warnOnTotalMismatch,
  warnOnUnmatchedCompleted,
} = require("./check-data");

const TOUR_DETAIL_KEYS = [
  "start",
  "location",
  "duration",
  "audioPoints",
  "tourType",
  "description",
  "thumbnail",
];

function mergeTourDetails(tour, prev) {
  if (!prev.details) return;
  const target = tour.details;
  for (const key of TOUR_DETAIL_KEYS) {
    if (!target[key] && prev.details[key]) {
      target[key] = prev.details[key];
    }
  }
}

function mergeTourGeocode(tour, prev) {
  const prevHasCoords = prev.geocode?.lat != null || prev.geocode?.lng != null;
  const tourNeedsCoords =
    tour.geocode?.lat == null || tour.geocode?.lng == null;
  if (prev.geocode && tourNeedsCoords && prevHasCoords) {
    tour.geocode = { ...tour.geocode, ...prev.geocode };
  }
}

// Union with existing tours.json: merge missing detail/geocode fields from
// existing tours and keep tours not returned by this fetch (e.g. pagination
// blocked) so a partial run never drops catalog data or wipes details.
async function mergeWithExisting(tours, outFile) {
  if (!existsSync(outFile)) return;
  try {
    const existing = JSON.parse(readFileSync(outFile, "utf8"));
    if (!Array.isArray(existing)) return;
    const byUrl = new Map(existing.map((t) => [t.url, t]));
    for (const tour of tours) {
      const prev = byUrl.get(tour.url);
      if (!prev) continue;
      mergeTourDetails(tour, prev);
      mergeTourGeocode(tour, prev);
    }
    const freshUrls = new Set(tours.map((t) => t.url));
    const retained = existing.filter((t) => !freshUrls.has(t.url));
    for (const t of retained) tours.push(t);
    if (retained.length > 0) {
      warn(
        `Retained ${retained.length} tour(s) from previous tours.json not returned by this fetch.`,
      );
    }
  } catch {
    warn("Could not read existing tours.json; starting fresh.");
  }
}

async function writeTourData(tours, outFile, metaFile) {
  const outDir = dirname(outFile);
  if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });
  await writeFile(outFile, `${JSON.stringify(tours, null, 2)}\n`, "utf8");
  await writeFile(
    metaFile,
    `${JSON.stringify({ lastSynced: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
  success(`Saved ${tours.length} tours to ${outFile}`);
  success(`Saved meta to ${metaFile}`);
}

// Warn about completed tours that no longer match the dataset.
async function warnCompletedRemapping(tours, completedFile) {
  if (!existsSync(completedFile)) return;
  try {
    const completed = JSON.parse(readFileSync(completedFile, "utf8"));
    warnOnUnmatchedCompleted(
      completed,
      tours.map((t) => t.title),
    );
  } catch {
    warn("Could not read completed.json; skipping completed-tour remap check.");
  }
}

function buildCategoryRows(tours) {
  const categories = {};
  for (const t of tours) {
    const c = t.category || "Other";
    categories[c] = (categories[c] || 0) + 1;
  }
  return Object.entries(categories).sort((a, b) => a[0].localeCompare(b[0]));
}

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
  phase("inventory", "Phase 1: inventory");
  const { tours, reportedTotal } = await discoverInventory({ driver });
  log(`Inventory: ${tours.length} tours discovered.`);
  warnOnTotalMismatch(tours.length, reportedTotal);

  await mergeWithExisting(tours, OUT_FILE);

  // Sort by title up front so the incremental phase writes keep tours.json in
  // stable order — avoiding large git deltas on partial runs.
  tours.sort((a, b) => (a.title || "").localeCompare(b.title || ""));

  // Phase 2: details — enrich only tours missing start/location
  phase("details", "Phase 2: details");
  const { stats: enrichStats } = await enrichTours(tours, {
    outFile: OUT_FILE,
  });

  // Phase 3: geocode — only tours missing coordinates
  phase("geocode", "Phase 3: geocode");
  const { stats: geocodeStats } = await geocodeTours(tours, apiKey, {
    delayMs: 120,
  });

  tours.sort((a, b) => (a.title || "").localeCompare(b.title || ""));

  await writeTourData(tours, OUT_FILE, META_FILE);

  await warnCompletedRemapping(tours, COMPLETED_FILE);

  // Fresh counts for the summary (some may differ slightly from enrichStats
  // if the run was partially interrupted, so recompute from the final array).
  const categoryRows = buildCategoryRows(tours);
  summary("FETCH SUMMARY", [
    ["Total tours", tours.length],
    ...categoryRows,
    "",
    [
      "Details enriched",
      `${enrichStats.enriched} (${enrichStats.blocked} blocked)`,
    ],
    [
      "Geocoded",
      `${geocodeStats.ok} ok, ${geocodeStats.errors} errors, ${geocodeStats.zero} zero`,
    ],
  ]);
}

main().catch((err) => {
  error(err?.stack || String(err));
  process.exit(1);
});
