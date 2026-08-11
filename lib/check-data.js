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

// Token-overlap similarity for suggesting likely renamed tour titles.
// Ignores generic tokens shared by every tour title (e.g. "tour") and
// requires a meaningful fraction of distinctive tokens to overlap.
const GENERIC_TOKENS = new Set([
  "tour",
  "tours",
  "national",
  "park",
  "the",
  "of",
]);

function tokenOverlap(a, b) {
  const tokensA = new Set(
    String(a || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3 && !GENERIC_TOKENS.has(w)),
  );
  const tokensB = new Set(
    String(b || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3 && !GENERIC_TOKENS.has(w)),
  );
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let hits = 0;
  for (const w of tokensA) if (tokensB.has(w)) hits++;
  return hits / Math.min(tokensA.size, tokensB.size);
}

// Warn when completed.json titles don't match any tour in the dataset,
// suggesting likely renamed equivalents.
function warnOnUnmatchedCompleted(completed, tourTitles) {
  if (!Array.isArray(completed) || completed.length === 0) return;
  const titleSet = new Set(tourTitles);
  let warned = 0;
  for (const entry of completed) {
    const title = entry?.title;
    if (!title || titleSet.has(title)) continue;
    warned++;
    let hint = "";
    let best = "";
    let bestScore = 0;
    for (const candidate of tourTitles) {
      const score = tokenOverlap(title, candidate);
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    if (best && bestScore >= 0.8) hint = ` — likely renamed to "${best}"?`;
    const date = entry.completedDate
      ? ` (completed ${entry.completedDate})`
      : "";
    warn(`Completed tour "${title}"${date} has no match in tours.json.${hint}`);
  }
  if (warned > 0) {
    warn(
      `${warned} completed tour entr${warned === 1 ? "y" : "ies"} require remapping to match tours.json.`,
    );
  }
}

module.exports = { warnOnTotalMismatch, warnOnUnmatchedCompleted };
