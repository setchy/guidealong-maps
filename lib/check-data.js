const { warn } = require("./log");

// Emit a warning when the parsed tour count differs from the site-reported total.
function warnOnTotalMismatch(parsedCount, reportedTotal) {
  if (reportedTotal == null) {
    warn(
      "Could not determine the site's reported tour total; cannot verify count.",
    );
    return;
  }
  if (parsedCount !== reportedTotal) {
    warn(
      `Tour count mismatch: parsed ${parsedCount} tours but the site reports ${reportedTotal} (difference ${reportedTotal - parsedCount}).`,
    );
  }
}

// --- Slug similarity -------------------------------------------------------
// Completed tours are matched by URL. The similarity machinery is used two
// ways: to suggest a successor when a completed URL no longer matches the
// catalog (no redirect), and to canonicalize a redirect target that does not
// exactly equal a catalog slug (the site has shipped typo'd redirect targets
// such as "geyese" where the catalog uses "geyser").

const GENERIC_TOKENS = new Set([
  "tour",
  "tours",
  "national",
  "park",
  "the",
  "of",
]);

// Extract the tour slug (path after /tour/) from a URL, lowercased.
function urlSlug(url) {
  const match = /\/tour\/([^/?#]+)(?:[/?#]|$)/.exec(String(url || ""));
  if (match) return match[1].toLowerCase();
  return String(url || "").toLowerCase();
}

function tokenOverlap(a, b) {
  const tokensA = new Set(
    urlSlug(a)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3 && !GENERIC_TOKENS.has(w)),
  );
  const tokensB = new Set(
    urlSlug(b)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3 && !GENERIC_TOKENS.has(w)),
  );
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let hits = 0;
  for (const w of tokensA) if (tokensB.has(w)) hits++;
  return hits / Math.min(tokensA.size, tokensB.size);
}

// Classic Levenshtein distance between two strings.
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[n];
}

// Slug similarity in [0,1]: token overlap handles short stale slugs that are
// fully contained in a longer successor (old-faithful vs
// yellowstone-old-faithful-geyser-basin-walk), char-level similarity handles
// near-identical strings with typos (the redirect-target canonicalization
// case). The best of the two is returned.
function slugSimilarity(a, b) {
  const token = tokenOverlap(a, b);
  const sa = urlSlug(a);
  const sb = urlSlug(b);
  const chars =
    sa.length === 0 && sb.length === 0
      ? 0
      : 1 - levenshtein(sa, sb) / Math.max(sa.length, sb.length, 1);
  return Math.max(token, chars);
}

// Highest-scoring candidate for a slug, with the gap over the runner-up.
// An empty `best` means no candidate cleared the 0.8 threshold; a zero
// `margin` means the top candidates are tied.
function findBestSlugMatch(text, candidates) {
  let best = "";
  let bestScore = 0;
  let secondBest = 0;
  for (const candidate of candidates) {
    const score = slugSimilarity(text, candidate);
    if (score > bestScore) {
      secondBest = bestScore;
      bestScore = score;
      best = candidate;
    } else if (score > secondBest) {
      secondBest = score;
    }
  }
  return { best, bestScore, margin: bestScore - secondBest };
}

const SHARE_MIN_SCORE = 0.8;

// Build plain-text warnings for completed entries that do not match any tour
// in the catalog. Pure — tests assert on it without capturing stdout. Returns
// the list of warning lines.
function buildUnmatchedWarnings(completed, tours) {
  if (!Array.isArray(completed) || !Array.isArray(tours)) return [];
  const byUrl = new Map(tours.map((t) => [t.url, t]));
  const tourUrls = [...byUrl.keys()];
  const lines = [];
  for (const entry of completed) {
    const url = entry?.url;
    if (!url) {
      lines.push(
        "Completed tour entry has no url field; it cannot be matched to tours.json.",
      );
      continue;
    }
    if (byUrl.has(url)) continue;
    const date = entry.completedDate
      ? ` (completed ${entry.completedDate})`
      : "";
    const { best, bestScore, margin } = findBestSlugMatch(url, tourUrls);
    let hint = "";
    if (best && bestScore >= SHARE_MIN_SCORE && margin > 0) {
      const tour = byUrl.get(best);
      hint = ` — likely moved to "${tour?.title || best}" (${best})?`;
    }
    lines.push(
      `Completed tour ${url}${date} has no match in tours.json.${hint}`,
    );
  }
  return lines;
}

// Warn about completed entries whose URL doesn't match any tour, suggesting
// likely successors. Returns the number of unmatched entries.
function warnOnUnmatchedCompleted(completed, tours) {
  if (!Array.isArray(completed) || completed.length === 0) return 0;
  const lines = buildUnmatchedWarnings(completed, tours);
  for (const line of lines) warn(line);
  if (lines.length > 0) {
    warn(
      `${lines.length} completed tour entr${lines.length === 1 ? "y" : "ies"} require remapping to match tours.json.`,
    );
  }
  return lines.length;
}

module.exports = {
  warnOnTotalMismatch,
  warnOnUnmatchedCompleted,
  buildUnmatchedWarnings,
  findBestSlugMatch,
  urlSlug,
  slugSimilarity,
};
