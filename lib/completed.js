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
// Uses linear string slicing rather than `.*`-anchored regexes, which can
// trigger super-linear backtracking on adversarial input.
function normalizeUrl(url) {
  let value = String(url || "").trim();
  const hash = value.indexOf("#");
  if (hash !== -1) value = value.slice(0, hash);
  const query = value.indexOf("?");
  if (query !== -1) value = value.slice(0, query);
  while (value.endsWith("/")) value = value.slice(0, -1);
  return value.toLowerCase();
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

// An entry that is missing, has no string url, or whose url already exists in
// the catalog does not need to be probed.
function shouldSkipEntry(entry, byUrl) {
  return !entry || typeof entry.url !== "string" || byUrl.has(entry.url);
}

// The single catalog tour a moved URL maps onto: exact canonical match first,
// then the best slug match when it clears the similarity threshold with a
// non-zero margin over the runner-up.
function resolveSuccessor(finalUrl, byUrl, tourUrls) {
  const direct = byUrl.get(normalizeUrl(finalUrl));
  if (direct) return direct;
  const { best, bestScore, margin } = findBestSlugMatch(finalUrl, tourUrls);
  if (best && bestScore >= SHARE_MIN_SCORE && margin > 0) {
    return byUrl.get(best);
  }
  return undefined;
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

  // Probe and remap one completed entry, awaiting its probe and the
  // rate-limit delay. Awaits live here, not in the driving loop, so entry
  // order and pacing stay intact.
  const maybeRemap = async (entry) => {
    if (shouldSkipEntry(entry, byUrl)) {
      return;
    }
    const { status, finalUrl } = await probeSuccessor(entry.url, fetchImpl);
    const moved =
      status === 0 ? false : normalizeUrl(finalUrl) !== normalizeUrl(entry.url);
    if (!moved) return;

    const successor = resolveSuccessor(finalUrl, byUrl, tourUrls);
    if (!successor || isBundle(successor)) return;

    entry.url = successor.url;
    remapped++;
    if (delayMs > 0) await sleep(delayMs);
  };

  // Sequential promise chain: each entry waits for the previous one, so
  // probes stay rate-limited and in order without `await` inside the loop.
  let chain = Promise.resolve();
  for (const entry of completed) {
    chain = chain.then(() => maybeRemap(entry));
  }
  await chain;
  return { remapped };
}

module.exports = { resolveCompletedStaleness, normalizeUrl, isBundle };
