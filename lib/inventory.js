const cheerio = require("cheerio");
const { warn } = require("./log");

const TOUR_LIST_URL = "https://guidealong.com/tour-list/";
const AJAX_URL = "https://guidealong.com/wp-admin/admin-ajax.php";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Referer: TOUR_LIST_URL,
  Origin: "https://guidealong.com",
  "X-Requested-With": "XMLHttpRequest",
  Accept: "application/json, text/javascript, */*; q=0.01",
};

function normalizeText(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveCategory(title) {
  if (/\bnational park\b/i.test(title)) return "National Park";
  if (/\b(bundle|combo)\b/i.test(title)) return "Bundle";
  if (/\bwalk(ing)?\b/i.test(title)) return "Walking";
  return "Driving";
}

// Resolve a possibly-relative image URL against the GuideAlong site.
function absoluteUrl(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("/")) return `https://guidealong.com${s}`;
  return s;
}

// Strip a WordPress "-{width}x{height}" size suffix before the extension,
// e.g. ".../Classic-Southwest-800x900.jpg" -> ".../Classic-Southwest.jpg".
function stripSizeSuffix(u) {
  return String(u || "").replace(/-\d+x\d+(?=\.[a-z]+$)/i, "");
}

function parseTourItem($, link) {
  const title = normalizeText($(link).text());
  const url = $(link).attr("href") || "";
  const parent = $(link).closest("div");

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
  const audioDiv = parent.find("div.tourmaster-tour-info-minimum-age").first();
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

  // Hero image from the tour-list item. Most items lazy-load, so the real URL
  // lives in data-lazy-src (the src is an SVG placeholder); prefer full-size.
  let thumbnail = "";
  const item = $(link).closest(
    ".tourmaster-tour-medium-inner, .tourmaster-item-list, .tourmaster-tour-medium",
  );
  const listImg = item.find("img").first();
  if (listImg?.length) {
    const raw =
      listImg.attr("data-lazy-src") || listImg.attr("data-src") || "";
    const src = raw || listImg.attr("src") || "";
    if (src && !src.startsWith("data:")) {
      thumbnail = stripSizeSuffix(absoluteUrl(src.trim()));
    }
  }

  return {
    title,
    url,
    category: deriveCategory(title),
    details: {
      description,
      thumbnail,
      audioPoints,
      duration,
      tourType,
      start: "",
      location: "",
    },
    geocode: {
      lat: null,
      lng: null,
      country: "",
      state: "",
    },
  };
}

function parseToursFromHtml(html) {
  const $ = cheerio.load(html);
  const tours = [];
  $('h3 a[href*="/tour/"]').each((_, el) => {
    tours.push(parseTourItem($, el));
  });
  return tours;
}

// Extract reported total (e.g. "131 Results Found") and pagination settings
// from the static tour-list page.
function parsePageInfo(html) {
  const $ = cheerio.load(html);

  let reportedTotal = null;
  $("h3").each((_, el) => {
    const text = normalizeText($(el).text());
    const m = /^(\d[\d,]*)\s+Results? Found$/.exec(text);
    if (m) reportedTotal = Number(m[1].replace(/,/g, ""));
  });

  let settings = null;
  $("[data-tm-ajax]").each((_, el) => {
    const raw = $(el).attr("data-settings");
    if (!raw) return;
    try {
      settings = JSON.parse(raw);
    } catch {
      // ignore malformed settings; fall through to page-1-only fetch
    }
  });

  // Highest page number listed in pagination (data-ajax-name="paged")
  let pageCount = 1;
  $(".page-numbers[data-ajax-name='paged']").each((_, el) => {
    const v = Number($(el).attr("data-ajax-value"));
    if (Number.isFinite(v) && v > pageCount) pageCount = v;
  });

  return { reportedTotal, settings, pageCount };
}

function toFormParams(obj, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === null || v === undefined) out.set(key, "");
    else if (Array.isArray(v)) {
      for (const item of v) out.set(`${key}[]`, item);
    } else if (typeof v === "object") {
      toFormParams(v, key, out);
    } else {
      out.set(key, String(v));
    }
  }
  return out;
}

// Fetch a later page's raw HTML via the site's admin AJAX pagination.
async function fetchPageHtml(pageNumber, settings) {
  const body = toFormParams({
    action: "tourmaster_tour_ajax",
    settings: { ...settings, paged: pageNumber },
    option: { name: "paged", value: String(pageNumber) },
  });
  const resp = await fetch(AJAX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...BROWSER_HEADERS,
    },
    body,
  });
  if (resp.status === 403) {
    throw new Error("blocked by site firewall (HTTP 403)");
  }
  if (!resp.ok) {
    throw new Error(`AJAX page ${pageNumber} returned HTTP ${resp.status}`);
  }
  const text = await resp.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      `AJAX page ${pageNumber} returned non-JSON (possibly firewall-blocked)`,
    );
  }
  if (json?.status !== "success" || typeof json.content !== "string") {
    throw new Error(`AJAX page ${pageNumber} returned unexpected payload`);
  }
  return json.content.replace(/\\\//g, "/");
}

// Optional headless-browser driver: loads /tour-list/ and clicks through
// pagination. Behind the same interface as the http path.
async function inventoryWithBrowser() {
  let chromium;
  try {
    chromium = require("playwright-core").chromium;
  } catch {
    throw new Error(
      "playwright-core is not installed; run `pnpm add -D playwright-core` to use the browser driver.",
    );
  }

  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined;
  const browser = await chromium.launch(
    executablePath ? { executablePath } : {},
  );
  try {
    const page = await browser.newPage({
      userAgent: BROWSER_HEADERS["User-Agent"],
    });
    await page.goto(TOUR_LIST_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(3000);

    const looksBlocked = await page
      .evaluate(() =>
        /Inkline Site Manager Firewall|Blocked/i.test(
          document.body?.innerText || "",
        ),
      )
      .catch(() => true);
    if (looksBlocked) {
      warn("Browser driver: page appears to be blocked by the site firewall.");
      return { tours: [], reportedTotal: null };
    }

    const tours = [];
    const seenUrls = new Set();
    let reportedTotal = null;
    let maxPage = 1;

    const scrape = async () => {
      const items = await page.$$eval('h3 a[href*="/tour/"]', (links) =>
        links.map((a) => {
          const item = a.closest("div");
          const descEl =
            item?.querySelector("div.tourmaster-tour-content") ||
            [...(item?.querySelectorAll("p") || [])].sort(
              (x, y) => y.textContent.length - x.textContent.length,
            )[0];
          return {
            title: a.textContent.replace(/\s+/g, " ").trim(),
            url: a.href,
            description: descEl
              ? descEl.textContent.replace(/\s+/g, " ").trim()
              : "",
          };
        }),
      );
      for (const item of items) {
        if (item.url && !seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          tours.push({
            title: item.title,
            url: item.url,
            category: deriveCategory(item.title),
            details: {
              description: item.description,
              thumbnail: "",
              audioPoints: "",
              duration: "",
              tourType: /walk/i.test(item.title) ? "Walking" : "Driving",
              start: "",
              location: "",
            },
            geocode: { lat: null, lng: null, country: "", state: "" },
          });
        }
      }
    };

    const info = await page.evaluate(() => {
      let total = null;
      document.querySelectorAll("h3").forEach((el) => {
        const m = /^(\d[\d,]*)\s+Results? Found$/.exec(
          el.textContent.replace(/\s+/g, " ").trim(),
        );
        if (m) total = Number(m[1].replace(/,/g, ""));
      });
      let pages = 1;
      document
        .querySelectorAll('.page-numbers[data-ajax-name="paged"]')
        .forEach((el) => {
          const v = Number(el.getAttribute("data-ajax-value"));
          if (Number.isFinite(v) && v > pages) pages = v;
        });
      return { total, pages };
    });
    reportedTotal = info.total;
    maxPage = info.pages;

    await scrape();

    for (let p = 2; p <= maxPage; p++) {
      const clicked = await page
        .locator(
          `.page-numbers[data-ajax-name="paged"][data-ajax-value="${p}"]`,
        )
        .first()
        .click({ timeout: 10000 })
        .then(() => true)
        .catch(() => false);
      if (!clicked) {
        warn(`Browser driver: could not click page ${p}/${maxPage}. Stopping.`);
        break;
      }
      await page.waitForTimeout(3000);
      await scrape();
    }

    return { tours, reportedTotal };
  } finally {
    await browser.close();
  }
}

/**
 * Phase 1: discover the full tour inventory from /tour-list/.
 * Returns { tours, reportedTotal } where tours is the de-duplicated URL set
 * discovered from page 1 + pagination.
 */
async function discoverInventory({ driver = "http", pageDelayMs = 3000 } = {}) {
  if (driver === "browser") {
    return inventoryWithBrowser();
  }

  const resp = await fetch(TOUR_LIST_URL, {
    headers: { "User-Agent": BROWSER_HEADERS["User-Agent"] },
  });
  if (!resp.ok) throw new Error(`Failed to fetch tour list: ${resp.status}`);
  const html = await resp.text();

  const { reportedTotal, settings, pageCount } = parsePageInfo(html);
  const tours = parseToursFromHtml(html);
  const seenUrls = new Set(tours.map((t) => t.url));

  for (let page = 2; page <= pageCount; page++) {
    await new Promise((resolve) => setTimeout(resolve, pageDelayMs));
    try {
      const pageHtml = await fetchPageHtml(page, settings);
      for (const tour of parseToursFromHtml(pageHtml)) {
        if (!seenUrls.has(tour.url)) {
          seenUrls.add(tour.url);
          tours.push(tour);
        }
      }
    } catch (err) {
      warn(
        `Could not fetch page ${page}/${pageCount}: ${err.message}. Stopping further page fetches.`,
      );
      break;
    }
  }

  return { tours, reportedTotal };
}

module.exports = { discoverInventory };
