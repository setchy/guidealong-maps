#!/usr/bin/env node
// Fetch GuideAlong tours and save to src/data/tours.json, with optional geocoding via Google Maps SDK

const { writeFile, mkdir } = require("node:fs/promises");
const { existsSync } = require("node:fs");
const { join, dirname } = require("node:path");
const cheerio = require("cheerio");
const { Client } = require("@googlemaps/google-maps-services-js");

const ROOT = process.cwd();
// Load env vars from .env when present
if (existsSync(join(ROOT, ".env"))) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("dotenv").config();
}
const SRC_DIR = join(ROOT, "src");
const OUT_FILE = join(SRC_DIR, "data/tours.json");

function log(msg) {
  process.stdout.write(`${String(msg)}\n`);
}
function normalizeText(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseTours(html) {
  const $ = cheerio.load(html);
  const tours = [];
  $('h3 a[href*="/tour/"]').each((_, el) => {
    const link = $(el);
    const title = normalizeText(link.text());
    const url = link.attr("href") || "";
    const parent = link.closest("div");

    let description = "";
    const descDiv = parent.find("div.tourmaster-tour-content").first();
    if (descDiv?.length) {
      description = normalizeText(descDiv.text());
    } else {
      const pTags = parent.find("p").toArray();
      if (pTags.length) {
        const longest = pTags.reduce(
          (a, b) => ($(a).text().length > $(b).text().length ? a : b),
          pTags[0],
        );
        description = normalizeText($(longest).text());
      }
    }

    let duration = "";
    const durationDiv = parent
      .find("div.tourmaster-tour-info-duration-text")
      .first();
    if (durationDiv?.length) duration = normalizeText(durationDiv.text());

    let audioPoints = "";
    const audioDiv = parent
      .find("div.tourmaster-tour-info-minimum-age")
      .first();
    if (audioDiv?.length) {
      const raw = normalizeText(audioDiv.text());
      const cleaned = raw.replace(/^\s*audio\s*points\s*[:-]?\s*/i, "");
      const m = /\d[\d,]*\+?/.exec(cleaned);
      audioPoints = m ? m[0] : cleaned;
    }

    let tourType = "";
    const tourTypeDiv = parent
      .find("div.tourmaster-tour-info-maximum-people")
      .first();
    if (tourTypeDiv?.length) {
      tourType = normalizeText(tourTypeDiv.text())
        .replace(/tour type[:\s]*/i, "")
        .trim();
    }
    if (!tourType) {
      if (/\bwalk(ing)?\b/i.test(title) || /\bwalk(ing)?\b/i.test(description))
        tourType = "Walking";
      else tourType = "Driving";
    }

    let thumbnail = "";
    const img = parent.find("div.tourmaster-tour-thumbnail img").first();
    if (img?.length) {
      thumbnail =
        img.attr("src") ||
        img.attr("data-src") ||
        img.attr("data-lazy-src") ||
        "";
      if (!thumbnail) {
        const srcset = img.attr("srcset") || img.attr("data-srcset") || "";
        if (srcset) {
          const first = srcset.split(",")[0]?.trim().split(" ")[0];
          if (first) thumbnail = first;
        }
      }
    }

    tours.push({
      title,
      url,
      description,
      thumbnail,
      audioPoints,
      duration,
      tourType,
      lat: null,
      lng: null,
      country: "",
      state: "",
    });
  });
  return tours;
}

function parseTourDetail(html) {
  const $ = cheerio.load(html);
  let start = "";
  let location = "";

  $("span").each((_, el) => {
    const txt = normalizeText($(el).text());
    if (!location && txt.startsWith("Location: ")) {
      location = normalizeText(txt.slice("Location: ".length));
    }
    if (!start && txt.startsWith("Start: ")) {
      start = normalizeText(txt.slice("Start: ".length));
    }
  });

  return { start, location };
}

async function enrichToursFromPages(tours) {
  const withUrls = tours.filter((t) => t.url);
  log(`Visiting ${withUrls.length} tour pages to extract start/location…`);
  let foundStart = 0;
  let foundLocation = 0;
  for (let i = 0; i < withUrls.length; i++) {
    const t = withUrls[i];
    log(`[${i + 1}/${withUrls.length}] Fetching ${t.url}`);
    try {
      const resp = await fetch(t.url, { redirect: "follow" });
      if (!resp.ok) {
        log(`[${i + 1}/${withUrls.length}] HTTP ${resp.status} for ${t.url}`);
        await sleep(120);
        continue;
      }
      const html = await resp.text();
      const detail = parseTourDetail(html);
      if (detail.start) {
        t.start = detail.start;
        foundStart++;
      }
      if (detail.location) {
        t.location = detail.location;
        foundLocation++;
      }
    } catch (err) {
      log(`[${i + 1}/${withUrls.length}] ERROR ${t.url}: ${err.message}`);
    }
    await sleep(120);
  }
  log(`Detail extraction complete: start=${foundStart}, location=${foundLocation}`);
  return tours;
}

async function geocodeTours(tours) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    log("No GOOGLE_MAPS_API_KEY found. Skipping geocoding.");
    return tours;
  }

  const toGeocode = tours.filter((t) => !(t && t.lat != null && t.lng != null) && normalizeText(t.title || ""));
  const client = new Client({});
  const tail = apiKey.slice(-6);
  log(`Geocoding ${toGeocode.length}/${tours.length} tours using Google Maps SDK (key tail: …${tail}).`);

  let ok = 0;
  let zero = 0;
  let statusErr = 0;
  let caughtErr = 0;

  for (let i = 0; i < toGeocode.length; i++) {
    const t = toGeocode[i];
    const query = normalizeText(t.title || "");
    log(`[${i + 1}/${toGeocode.length}] Geocoding "${query}"…`);
    try {
      const { data } = await client.geocode({ params: { address: query, key: apiKey } });
      if (data.status === "OK" && Array.isArray(data.results) && data.results.length) {
        const best = data.results[0];
        if (best.geometry?.location) {
          t.lat = best.geometry.location.lat;
          t.lng = best.geometry.location.lng;
        }
        const comps = best.address_components || [];
        const findComp = (type) => comps.find((c) => Array.isArray(c.types) && c.types.includes(type));
        const country = findComp("country");
        const admin1 = findComp("administrative_area_level_1");
        t.country = country?.long_name || t.country || "";
        t.state = admin1?.short_name || admin1?.long_name || t.state || "";
        ok++;
        const loc = t.lat != null && t.lng != null ? `${t.lat},${t.lng}` : "(no geometry)";
        const place = [t.state, t.country].filter(Boolean).join(", ") || "";
        log(`[${i + 1}/${toGeocode.length}] OK ${loc}${place ? ` - ${place}` : ""}`);
      } else if (data.status === "ZERO_RESULTS") {
        zero++;
        log(`[${i + 1}/${toGeocode.length}] ZERO_RESULTS`);
      } else {
        statusErr++;
        const extra = data.error_message ? ` - ${data.error_message}` : "";
        log(`[${i + 1}/${toGeocode.length}] ${data.status}${extra}`);
      }
    } catch (err) {
      caughtErr++;
      const msg = err?.response?.data?.error_message || err.message;
      log(`[${i + 1}/${toGeocode.length}] ERROR: ${msg}`);
    }
    await sleep(120);
  }

  log(`Geocoding complete: ok=${ok}, zero=${zero}, status=${statusErr}, errors=${caughtErr}`);
  return tours;
}

async function main() {
  log("Fetching tours...");
  const resp = await fetch("https://guidealong.com/tour-list/");
  if (!resp.ok) throw new Error(`Failed to fetch tour list: ${resp.status}`);
  const html = await resp.text();
  const tours = parseTours(html);
  log(`Parsed ${tours.length} tours.`);

  // Visit each tour page to extract 'start' and 'location'
  await enrichToursFromPages(tours);

  // Geocode tours using Google Maps SDK when API key is configured
  await geocodeTours(tours);

  // Sort by title for stable diffs
  tours.sort((a, b) => (a.title || "").localeCompare(b.title || ""));

  const outDir = dirname(OUT_FILE);
  if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(tours, null, 2)}\n`, "utf8");
  log(`Saved ${tours.length} tours to ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
