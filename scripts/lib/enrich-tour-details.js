const cheerio = require("cheerio");
const { log, sleep } = require("./log");

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

async function enrichTourDetails(tours, { delayMs = 120 } = {}) {
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
        await sleep(delayMs);
        continue;
      }
      const html = await resp.text();
      const detail = parseTourDetail(html);
      // ensure details bag exists (for safety if reading legacy tours)
      t.details = t.details || {};
      if (detail.start) {
        t.details.start = detail.start;
        foundStart++;
      }
      if (detail.location) {
        t.details.location = detail.location;
        foundLocation++;
      }
    } catch (err) {
      log(`[${i + 1}/${withUrls.length}] ERROR ${t.url}: ${err.message}`);
    }
    await sleep(delayMs);
  }
  log(
    `Detail extraction complete: start=${foundStart}, location=${foundLocation}`,
  );
  return tours;
}

module.exports = { enrichTourDetails };
