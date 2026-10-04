const { sleep } = require("./log");
const { findBestSlugMatch } = require("./check-data");

const SHARE_MIN_SCORE = 0.8;

const PROBE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
};

// Canonical URL for identity comparison: drop fragment/query/trailing slash,
// lowercase. Does NOT attempt to normalize the redirect target's slug — that
// is the similarity step's job.
function normalizeUrl(url) {
  return String(url || "")
    .trim()
    .replace(/#.*$/, "")
    .replace(/\?.*$/, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

// A tour categorized as a Bundle (category field or bundle/combo title) must
// not silently absorb completed sub-tour entries.
function isBundle(tour) {
  return (
    tour?.category === "Bundle" || /\b(bundle|combo)\b/i.test(tour?.title || "")
  );
}

// Follow the site's redirect chain for a URL and report the final URL and
// status. HEAD is attempted first (no body); if the server rejects HEAD, a
// GET fallback aborts the body as soon as the headers arrive.
async function probeSuccessor(url, fetchImpl) {
  const controller = new AbortController();
  try {
    const resp = await fetchImpl(url, {
      method: "HEAD",
      redirect: "follow",
      headers: PROBE_HEADERS,
      signal: controller.signal,
    });
    try {
      await resp.body?.cancel?.();
    } catch {
      // body already drained / unavailable
    }
    if (resp.status === 405 || resp.status === 501) {
      controller.abort();
      throw new Error("HEAD not supported");
    }
    return { status: resp.status, finalUrl: resp.url || url };
  } catch {
    if (controller.signal.aborted) {
      // fall through to GET
    } else {
      return { status: 0, finalUrl: url };
    }
  }
  try {
    const resp = await fetchImpl(url, {
      redirect: "follow",
      headers: PROBE_HEADERS,
    });
    try {
      await resp.body?.cancel?.();
    } catch {
      // body already drained / unavailable
    }
    return { status: resp.status, finalUrl: resp.url || url };
  } catch {
    return { status: 0, finalUrl: url };
  }
}

/**
 * Resolve stale completed-tour entries against the current catalog.
 *
 * For each completed entry whose URL is absent from `tours`, probes the URL
 * and follows the site's redirects: a moved URL that lands on (or closely
 * matches) a single non-Bundle catalog tour is remapped in place, preserving
 * entry order and `completedDate`. Entries that cannot be confidently
 * resolved are left untouched so the caller can warn about them.
 *
 * Returns `{ remapped }`; the `completed` array is mutated when entries are
 * remapped.
 */
async function resolveCompletedStaleness(
  completed,
  tours,
  fetchImpl = fetch,
  delayMs = 1000,
) {
  if (!Array.isArray(completed) || !Array.isArray(tours)) {
    return { remapped: 0 };
  }
  const byUrl = new Map(tours.map((t) => [t.url, t]));
  const tourUrls = [...byUrl.keys()];
  let remapped = 0;

  for (const entry of completed) {
    if (!entry || typeof entry.url !== "string" || byUrl.has(entry.url)) {
      continue;
    }
    const { status, finalUrl } = await probeSuccessor(entry.url, fetchImpl);
    const moved =
      status === 0 ? false : normalizeUrl(finalUrl) !== normalizeUrl(entry.url);
    if (!moved) continue;

    let successor = byUrl.get(normalizeUrl(finalUrl));
    if (!successor) {
      const { best, bestScore, margin } = findBestSlugMatch(finalUrl, tourUrls);
      if (best && bestScore >= SHARE_MIN_SCORE && margin > 0) {
        successor = byUrl.get(best);
      }
    }
    if (!successor || isBundle(successor)) continue;

    entry.url = successor.url;
    remapped++;
    if (delayMs > 0) await sleep(delayMs);
  }
  return { remapped };
}

module.exports = { resolveCompletedStaleness, normalizeUrl, isBundle };
