const assert = require("node:assert/strict");
const test = require("node:test");

const { resolveCompletedStaleness } = require("../lib/completed");

const tourUrl = (slug) => `https://guidealong.com/tour/${slug}/`;

// Build a stub fetch: `routes` maps a URL to `{ status, url }` (the final URL
// after a redirect chain).
function stubFetch(routes) {
  return async (url) => {
    const route = routes[url];
    assert.ok(route, `unexpected fetch ${url}`);
    return { status: route.status ?? 200, url: route.url ?? url };
  };
}

test("leaves current completed entries untouched and probes nothing", async () => {
  const tours = [{ url: tourUrl("maui"), title: "MAUI BUNDLE" }];
  const completed = [{ url: tourUrl("maui"), completedDate: "2024-01-01" }];
  let probed = 0;
  const fetchImpl = async () => {
    probed++;
    throw new Error("should not probe current entries");
  };
  const { remapped } = await resolveCompletedStaleness(
    completed,
    tours,
    fetchImpl,
    0,
  );
  assert.equal(remapped, 0);
  assert.equal(probed, 0);
  assert.deepEqual(completed, [
    { url: tourUrl("maui"), completedDate: "2024-01-01" },
  ]);
});

test("remaps a stale URL whose redirect lands exactly on a catalog URL", async () => {
  const tours = [
    {
      url: tourUrl("bostons-freedom-trail-tour"),
      title: "BOSTON'S FREEDOM TRAIL TOUR",
    },
  ];
  const completed = [
    { url: tourUrl("freedom-trail-tour"), completedDate: "2023-06-01" },
  ];
  const fetchImpl = stubFetch({
    [tourUrl("freedom-trail-tour")]: {
      url: tourUrl("bostons-freedom-trail-tour"),
    },
  });
  const { remapped } = await resolveCompletedStaleness(
    completed,
    tours,
    fetchImpl,
    0,
  );
  assert.equal(remapped, 1);
  assert.deepEqual(completed, [
    { url: tourUrl("bostons-freedom-trail-tour"), completedDate: "2023-06-01" },
  ]);
});

test("canonicalizes a redirect target that differs from the catalog slug", async () => {
  const tours = [
    {
      url: tourUrl("yellowstone-old-faithful-geyser-basin-walk"),
      title: "YELLOWSTONE'S OLD FAITHFUL GEYSER BASIN WALK TOUR",
    },
  ];
  const completed = [{ url: tourUrl("old-faithful"), completedDate: null }];
  // The site's redirect target carries a typo ("geyese") the catalog does not.
  const fetchImpl = stubFetch({
    [tourUrl("old-faithful")]: {
      url: tourUrl("yellowstones-old-faithful-geyese-basin-walk"),
    },
  });
  const { remapped } = await resolveCompletedStaleness(
    completed,
    tours,
    fetchImpl,
    0,
  );
  assert.equal(remapped, 1);
  assert.deepEqual(completed, [
    {
      url: tourUrl("yellowstone-old-faithful-geyser-basin-walk"),
      completedDate: null,
    },
  ]);
});

test("does not remap into a Bundle successor (redirect gate)", async () => {
  const tours = [
    { url: tourUrl("maui"), title: "MAUI BUNDLE", category: "Bundle" },
  ];
  const completed = [
    { url: tourUrl("road-to-hana-maui"), completedDate: null },
  ];
  const fetchImpl = stubFetch({
    [tourUrl("road-to-hana-maui")]: { url: tourUrl("maui") },
  });
  const { remapped } = await resolveCompletedStaleness(
    completed,
    tours,
    fetchImpl,
    0,
  );
  assert.equal(remapped, 0);
  assert.deepEqual(completed, [
    { url: tourUrl("road-to-hana-maui"), completedDate: null },
  ]);
});

test("does not remap when the stale URL returns no redirect", async () => {
  const tours = [{ url: tourUrl("acadia-national-park"), title: "ACADIA" }];
  const completed = [
    { url: tourUrl("some-delisted-tour"), completedDate: "2022-01-01" },
  ];
  const fetchImpl = stubFetch({
    [tourUrl("some-delisted-tour")]: { status: 404 },
  });
  const { remapped } = await resolveCompletedStaleness(
    completed,
    tours,
    fetchImpl,
    0,
  );
  assert.equal(remapped, 0);
  assert.deepEqual(completed, [
    { url: tourUrl("some-delisted-tour"), completedDate: "2022-01-01" },
  ]);
});

test("does not remap when slug similarity ties between candidates", async () => {
  const tours = [
    {
      url: tourUrl("yellowstones-grand-prismatic-fairy-falls-trail"),
      title: "A",
    },
    { url: tourUrl("yellowstones-grand-prismatic-loop-trail"), title: "B" },
  ];
  const completed = [{ url: tourUrl("grand-prismatic"), completedDate: null }];
  const fetchImpl = stubFetch({
    [tourUrl("grand-prismatic")]: { url: tourUrl("some-unknown-target") },
  });
  const { remapped } = await resolveCompletedStaleness(
    completed,
    tours,
    fetchImpl,
    0,
  );
  assert.equal(remapped, 0);
  assert.equal(completed[0].url, tourUrl("grand-prismatic"));
});

test("treats an unverifiable probe (network failure) as no redirect", async () => {
  const tours = [{ url: tourUrl("acadia-national-park"), title: "ACADIA" }];
  const completed = [{ url: tourUrl("old-faithful"), completedDate: null }];
  const fetchImpl = async () => {
    throw new Error("blocked");
  };
  const { remapped } = await resolveCompletedStaleness(
    completed,
    tours,
    fetchImpl,
    0,
  );
  assert.equal(remapped, 0);
  assert.equal(completed[0].url, tourUrl("old-faithful"));
});
