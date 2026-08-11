const cheerio = require("cheerio");
const { writeFile } = require("node:fs/promises");
const { log, warn, sleep } = require("./log");

function normalizeText(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTourDetail(html) {
  const $ = cheerio.load(html);
  let start = "";
  let location = "";
  $("span").each((_, el) => {
    const txt = normalizeText($(el).text());
    if (!location && txt.startsWith("Location: "))
      location = normalizeText(txt.slice("Location: ".length));
    if (!start && txt.startsWith("Start: "))
      start = normalizeText(txt.slice("Start: ".length));
  });
  return { start, location };
}

/**
 * Phase 2: enrich tour details (start/location) incrementally.
 * Only fetches tours missing start/location, with pacing + exponential
 * backoff on firewall blocks, and persists each tour as it completes so an
 * interrupted run resumes without data loss.
 *
 * Mutates the tours array and persists to outFile after each processed tour.
 */
async function enrichTours(
  tours,
  { outFile, baseDelayMs = 1200, maxRetries = 4, maxBackoffMs = 30000 } = {},
) {
  const pending = tours.filter(
    (t) => !t.details?.location && !t.details?.start && t.url,
  );
  log(
    `Enriching ${pending.length}/${tours.length} tours missing start/location…`,
  );

  let enriched = 0;
  let blocked = 0;
  for (let i = 0; i < pending.length; i++) {
    const t = pending[i];
    const label = `[${i + 1}/${pending.length}] ${t.title}`;
    let backoffMs = baseDelayMs;
    let done = false;

    for (let attempt = 0; attempt <= maxRetries && !done; attempt++) {
      // Space each request (base delay on first attempt, growing backoff on retries)
      await sleep(attempt === 0 ? baseDelayMs : backoffMs);
      try {
        const resp = await fetch(t.url, { redirect: "follow" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const html = await resp.text();
        const detail = parseTourDetail(html);
        t.details = t.details || {};
        if (detail.start) t.details.start = detail.start;
        if (detail.location) t.details.location = detail.location;
        done = true;
        enriched++;
        log(
          `${label} done (start=${!!detail.start}, location=${!!detail.location})`,
        );
      } catch (err) {
        if (/403/.test(err.message)) {
          log(`${label} blocked (attempt ${attempt + 1}/${maxRetries + 1})`);
          backoffMs = Math.min(backoffMs * 2, maxBackoffMs);
          // Double the base delay too so retry spacing grows after a block
          baseDelayMs = Math.min(baseDelayMs * 2, maxBackoffMs);
        } else if (attempt === maxRetries) {
          warn(`${label} failed: ${err.message}`);
        }
      }
    }

    if (!done) blocked++;
    // Persist progress incrementally so a partial run never loses work.
    if (outFile) {
      await writeFile(outFile, `${JSON.stringify(tours, null, 2)}\n`, "utf8");
    }
  }

  log(`Enrichment complete: enriched=${enriched}, blocked=${blocked}`);
  return tours;
}

module.exports = { enrichTours };
