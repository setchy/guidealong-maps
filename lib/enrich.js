const { writeFile } = require("node:fs/promises");
const { log, warn, progress, sleep } = require("./log");
const { withPage, looksBlocked } = require("./browser-session");

function normalizeText(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTourDetail(html) {
  const cheerio = require("cheerio");
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

// Human-like random delay between page visits (2-5s).
function humanDelay() {
  return sleep(2000 + Math.floor(Math.random() * 3000));
}

// Longer pause when a page is firewall-blocked, as a user would wait and
// retry rather than hammering (15-30s).
function blockRecoveryDelay() {
  return sleep(15000 + Math.floor(Math.random() * 15000));
}

/**
 * Phase 2: enrich tour details (start/location) incrementally, driving a
 * persistent browser session like a normal user — one tour page at a time,
 * human-paced, cookies carried across visits. Only tours missing
 * start/location are visited; each is persisted as it completes so an
 * interrupted run resumes without data loss.
 */
async function enrichTours(tours, { outFile } = {}) {
  const pending = tours.filter(
    (t) => !t.details?.location && !t.details?.start && t.url,
  );
  log(
    `Enriching ${pending.length}/${tours.length} tours missing start/location…`,
  );
  if (pending.length === 0) {
    return { tours, stats: { enriched: 0, blocked: 0, visits: 0 } };
  }

  let enriched = 0;
  let blocked = 0;
  let totalVisits = 0;

  await withPage(async (page) => {
    // Establish a session like a user: load the tour list once first.
    await page.goto("https://guidealong.com/tour-list/", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(2000);
    if (await looksBlocked(page)) {
      warn("Tour list page is firewall-blocked; aborting enrichment.");
      return;
    }

    for (let i = 0; i < pending.length; i++) {
      const t = pending[i];
      const counter = `[${i + 1}/${pending.length}]`;
      const label = `${counter} ${t.title}`;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await page.goto(t.url, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
          });
          totalVisits++;
          await page.waitForTimeout(1500);

          if (await looksBlocked(page)) {
            if (attempt < 2) {
              warn(
                `${label} blocked (attempt ${attempt + 1}/3); waiting to retry…`,
              );
              await blockRecoveryDelay();
              continue;
            }
            warn(`${label} page remains firewall-blocked; skipping.`);
            blocked++;
            await humanDelay();
            break;
          }

          const detail = parseTourDetail(await page.content());
          t.details = t.details || {};
          if (detail.start) t.details.start = detail.start;
          if (detail.location) t.details.location = detail.location;
          enriched++;
          progress(
            counter,
            `${t.title} done (start=${!!detail.start}, location=${!!detail.location})`,
          );

          // Persist progress incrementally
          if (outFile) {
            await writeFile(
              outFile,
              `${JSON.stringify(tours, null, 2)}\n`,
              "utf8",
            );
          }

          // Human-like pause between pages
          await humanDelay();
          break;
        } catch (err) {
          warn(`${label} error: ${err.message}`);
          blocked++;
          await humanDelay();
          break;
        }
      }
    }
  });

  log(
    `Enrichment complete: enriched=${enriched}, blocked=${blocked}, visits=${totalVisits}`,
  );
  return { tours, stats: { enriched, blocked, visits: totalVisits } };
}

module.exports = { enrichTours };
