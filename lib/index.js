#!/usr/bin/env node
// Orchestrates fetching tour list, enriching details, optional geocoding, and writing output

const { writeFile, mkdir } = require("node:fs/promises");
const { existsSync } = require("node:fs");
const { join, dirname } = require("node:path");
const { log, error } = require("./log");
const { fetchTourList } = require("./fetch-tour-list");
const { enrichTourDetails } = require("./enrich-tour-details");
const { geocodeTours } = require("./geocode-tours");

async function main() {
    const ROOT = process.cwd();

      require("dotenv").config({ path: join(ROOT, "src", "config", ".env") });
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || "";

  const OUT_FILE = join(ROOT, "src", "data", "tours.json");

  log("Fetching tours...");
  const tours = await fetchTourList();
  log(`Parsed ${tours.length} tours.`);

  await enrichTourDetails(tours, { delayMs: 120 });
  await geocodeTours(tours, apiKey, { delayMs: 120 });

  tours.sort((a, b) => (a.title || "").localeCompare(b.title || ""));

  const outDir = dirname(OUT_FILE);
  if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(tours, null, 2)}\n`, "utf8");
  log(`Saved ${tours.length} tours to ${OUT_FILE}`);
}

main().catch((err) => {
  error(err?.stack || String(err));
  process.exit(1);
});
