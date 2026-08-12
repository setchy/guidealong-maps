// Resolve a usable Chromium executable. The installed playwright-core expects
// a specific revision; allow an explicit override, else prefer an existing
// cached Chromium over the (possibly missing) default path.
function resolveExecutablePath() {
  if (process.env.PLAYWRIGHT_EXECUTABLE_PATH) {
    return process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  }
  const fs = require("node:fs");
  const discovered = findCachedChromium();
  if (discovered) return discovered;
  const { chromium } = require("playwright-core");
  const p = chromium.executablePath();
  return fs.existsSync(p) ? p : undefined;
}

// Search common Playwright cache locations for a usable Chromium binary.
function findCachedChromium() {
  const fs = require("node:fs");
  const os = require("node:os");
  const path = require("node:path");
  const home = os.homedir();
  const cacheRoot = path.join(home, "Library", "Caches", "ms-playwright");
  if (!fs.existsSync(cacheRoot)) return undefined;
  const candidates = [];
  for (const entry of fs.readdirSync(cacheRoot)) {
    const dir = path.join(cacheRoot, entry);
    const m = /^chromium-(\d+)/.exec(entry);
    if (!m) continue;
    const macArm = path.join(
      dir,
      "chrome-mac-arm64",
      "Google Chrome for Testing.app",
      "Contents",
      "MacOS",
      "Google Chrome for Testing",
    );
    const mac = path.join(
      dir,
      "chrome-mac",
      "Chromium.app",
      "Contents",
      "MacOS",
      "Chromium",
    );
    if (fs.existsSync(macArm))
      candidates.push({ rev: Number(m[1]), p: macArm });
    if (fs.existsSync(mac)) candidates.push({ rev: Number(m[1]), p: mac });
  }
  candidates.sort((a, b) => b.rev - a.rev);
  return candidates[0]?.p;
}

/**
 * Open a browser page configured like a normal user session (fresh user data
 * dir for a clean cookie state, desktop viewport, real UA). Pass the `page` to
 * the callback; the browser is closed when the callback finishes.
 */
async function withPage(fn, { url, waitMs = 2500 } = {}) {
  const { chromium } = require("playwright-core");
  const executablePath = resolveExecutablePath();
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: executablePath || findCachedChromium(),
      headless: true,
    });
  } catch (err) {
    throw new Error(
      `Could not launch Chromium (${err.message}). Set PLAYWRIGHT_EXECUTABLE_PATH or install the Playwright browser.`,
    );
  }
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      locale: "en-US",
      timezoneId: "America/New_York",
    });
    const page = await context.newPage();
    if (url)
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(waitMs);
    return await fn(page, context);
  } finally {
    await browser.close();
  }
}

// Detect whether the page is a firewall/block page (Inkline or generic block).
async function looksBlocked(page) {
  return page
    .evaluate(() =>
      /Inkline Site Manager Firewall|Blocked by firewall|403 Forbidden/i.test(
        document.body?.innerText || "",
      ),
    )
    .catch(() => true);
}

module.exports = { withPage, looksBlocked, findCachedChromium };
