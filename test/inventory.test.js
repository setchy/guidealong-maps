const assert = require("node:assert/strict");
const test = require("node:test");

const { deriveCategory } = require("../lib/inventory");

const tourUrl = (slug) => `https://guidealong.com/tour/${slug}/`;

test("classifies known destination-only national park tours", () => {
  const parkSlugs = [
    "capitol-reef",
    "going-to-the-sun-road",
    "grand-canyon-south-rim",
    "grand-teton-national-park",
    "jasper-national-park",
    "yosemite-national-park",
  ];

  for (const slug of parkSlugs) {
    assert.equal(deriveCategory(slug, tourUrl(slug)), "National Park");
  }
});

test("classifies park sub-tours before walking and driving categories", () => {
  assert.equal(
    deriveCategory(
      "YELLOWSTONE OLD FAITHFUL GEYSER BASIN WALK TOUR",
      tourUrl("yellowstone-old-faithful-geyser-basin-walk"),
    ),
    "National Park",
  );
  assert.equal(
    deriveCategory(
      "JOSHUA'S HIDDEN VALLEY WALKING TRAIL TOUR",
      tourUrl("joshuas-hidden-valley-walking-trail"),
    ),
    "National Park",
  );
  assert.equal(
    deriveCategory(
      "ARCHES NATIONAL PARK TOUR",
      tourUrl("arches-national-park"),
    ),
    "National Park",
  );
});

test("does not classify incidental park references as national parks", () => {
  assert.equal(
    deriveCategory("BANFF TOWNSITE TOUR", tourUrl("unrelated-slug")),
    "Driving",
  );
  assert.equal(
    deriveCategory(
      "GRAND CANYON WEST RIM, HOOVER DAM, RED ROCK CANYON, LAS VEGAS TOURS",
      tourUrl("grand-canyon-hoover-dam"),
    ),
    "Driving",
  );
  assert.equal(
    deriveCategory("LAKE TAHOE TOUR", tourUrl("lake-tahoe")),
    "Driving",
  );
});
