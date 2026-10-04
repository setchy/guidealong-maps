const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildUnmatchedWarnings,
  findBestSlugMatch,
  slugSimilarity,
  urlSlug,
} = require("../lib/check-data");

const tourUrl = (slug) => `https://guidealong.com/tour/${slug}/`;

test("extracts the slug path from a tour URL", () => {
  assert.equal(
    urlSlug("https://guidealong.com/tour/old-faithful/"),
    "old-faithful",
  );
  assert.equal(
    urlSlug(
      "https://guidealong.com/tour/yellowstone-old-faithful-geyser-basin-walk",
    ),
    "yellowstone-old-faithful-geyser-basin-walk",
  );
});

test("slug similarity matches a stale short slug to its longer successor", () => {
  const score = slugSimilarity(
    tourUrl("old-faithful"),
    tourUrl("yellowstone-old-faithful-geyser-basin-walk"),
  );
  assert.ok(score >= 0.8, `expected high similarity, got ${score}`);
});

test("slug similarity tolerates a typo'd redirect target", () => {
  const score = slugSimilarity(
    tourUrl("yellowstones-old-faithful-geyese-basin-walk"),
    tourUrl("yellowstone-old-faithful-geyser-basin-walk"),
  );
  assert.ok(score >= 0.8, `expected high similarity with typo, got ${score}`);
});

test("finds the single best slug match with a margin over the runner-up", () => {
  const candidates = [
    tourUrl("yellowstone-old-faithful-geyser-basin-walk"),
    tourUrl("acadia-national-park"),
  ];
  const { best, bestScore, margin } = findBestSlugMatch(
    tourUrl("old-faithful"),
    candidates,
  );
  assert.equal(best, candidates[0]);
  assert.ok(bestScore >= 0.8);
  assert.ok(margin > 0);
});

test("builds a warning with a suggested successor for a stale URL", () => {
  const tours = [
    {
      url: tourUrl("yellowstone-old-faithful-geyser-basin-walk"),
      title: "YELLOWSTONE'S OLD FAITHFUL GEYSER BASIN WALK TOUR",
    },
  ];
  const completed = [
    { url: tourUrl("old-faithful"), completedDate: "2021-05-01" },
  ];
  const lines = buildUnmatchedWarnings(completed, tours);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /old-faithful/);
  assert.match(lines[0], /\(completed 2021-05-01\)/);
  assert.match(lines[0], /YELLOWSTONE'S OLD FAITHFUL GEYSER BASIN WALK TOUR/);
});

test("builds a warning without a suggestion when no candidate exists", () => {
  const tours = [
    {
      url: tourUrl("acadia-national-park"),
      title: "ACADIA NATIONAL PARK TOUR",
    },
  ];
  const completed = [
    { url: tourUrl("monasterio-de-piedra"), completedDate: null },
  ];
  const lines = buildUnmatchedWarnings(completed, tours);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /monasterio-de-piedra/);
  assert.doesNotMatch(lines[0], /likely moved/);
});

test("warns when a completed entry carries no url field", () => {
  const tours = [{ url: tourUrl("maui"), title: "MAUI BUNDLE" }];
  const completed = [{ title: "MAUI BUNDLE", completedDate: null }];
  const lines = buildUnmatchedWarnings(completed, tours);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /no url field/);
});

test("emits nothing when every completed URL matches the catalog", () => {
  const tours = [
    { url: tourUrl("maui"), title: "MAUI BUNDLE" },
    {
      url: tourUrl("acadia-national-park"),
      title: "ACADIA NATIONAL PARK TOUR",
    },
  ];
  const completed = [
    { url: tourUrl("maui"), completedDate: "2024-01-01" },
    { url: tourUrl("acadia-national-park"), completedDate: null },
  ];
  assert.deepEqual(buildUnmatchedWarnings(completed, tours), []);
});
