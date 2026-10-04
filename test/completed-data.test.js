const assert = require("node:assert/strict");
const test = require("node:test");
const { join } = require("node:path");
const { readFileSync } = require("node:fs");

const COMPLETED_FILE = join(__dirname, "..", "src", "data", "completed.json");
const TOURS_FILE = join(__dirname, "..", "src", "data", "tours.json");

test("every completed tour URL exists in tours.json", () => {
  const tours = JSON.parse(readFileSync(TOURS_FILE, "utf8"));
  const tourUrls = new Set(tours.map((t) => t.url));
  const completed = JSON.parse(readFileSync(COMPLETED_FILE, "utf8"));

  assert.ok(Array.isArray(completed), "completed.json is an array");
  assert.ok(completed.length > 0, "completed.json is not empty");
  for (const entry of completed) {
    assert.equal(
      tourUrls.has(entry.url),
      true,
      `completed entry URL has no tour in tours.json: ${entry.url}`,
    );
  }
});

test("completed entries use URL identity, never a title field", () => {
  const completed = JSON.parse(readFileSync(COMPLETED_FILE, "utf8"));

  assert.ok(completed.length > 0, "completed.json is not empty");
  for (const entry of completed) {
    assert.match(entry.url, /^https:\/\/guidealong\.com\/tour\//);
    assert.equal(
      entry.completedDate !== undefined,
      true,
      "missing completedDate",
    );
    assert.equal(
      Object.hasOwn(entry, "title"),
      false,
      `entry must not carry a title field: ${entry.url}`,
    );
  }
});
