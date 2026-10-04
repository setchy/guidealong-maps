const { Client } = require("@googlemaps/google-maps-services-js");
const { log, progress, sleep } = require("./log");

function normalizeText(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Accumulate the query attempts for a tour, in priority order: full title,
 * then start+location, start, and location.
 */
function buildAttemptQueries(t) {
  const attempts = [];
  const titleQ = normalizeText(t.title || "");
  if (titleQ) attempts.push({ label: "title", q: titleQ });
  const start = normalizeText(t.details?.start || "");
  const location = normalizeText(t.details?.location || "");
  if (start && location)
    attempts.push({ label: "start+location", q: `${start}, ${location}` });
  if (start) attempts.push({ label: "start", q: start });
  if (location) attempts.push({ label: "location", q: location });
  return attempts;
}

function applyBestResult(t, best) {
  t.geocode = t.geocode || {
    lat: null,
    lng: null,
    country: "",
    state: "",
  };
  if (best.geometry?.location) {
    t.geocode.lat = best.geometry.location.lat;
    t.geocode.lng = best.geometry.location.lng;
  }
  const comps = best.address_components || [];
  const findComp = (type) =>
    comps.find((c) => Array.isArray(c.types) && c.types.includes(type));
  const country = findComp("country");
  const admin1 = findComp("administrative_area_level_1");
  t.geocode.country = country?.long_name || t.geocode.country || "";
  t.geocode.state =
    admin1?.short_name || admin1?.long_name || t.geocode.state || "";
}

function geocodeLocationLabel(t) {
  const loc =
    t.geocode.lat != null && t.geocode.lng != null
      ? `${t.geocode.lat},${t.geocode.lng}`
      : "(no geometry)";
  const place = [t.geocode.state, t.geocode.country].filter(Boolean).join(", ");
  return { loc, place };
}

// Single geocode attempt. Returns "done" once the tour is settled (geocoded,
// non-retryable status, or exception) and "zero" when a retry is worthwhile.
async function geocodeAttempt(client, t, attempt, j, counter, apiKey, stats) {
  const { label, q } = attempt;
  const attemptStr = j === 0 ? "Geocoding" : `Retry (${label})`;
  progress(counter, `${attemptStr} "${q}"…`);
  try {
    const { data } = await client.geocode({
      params: { address: q, key: apiKey },
    });
    if (
      data.status === "OK" &&
      Array.isArray(data.results) &&
      data.results.length
    ) {
      applyBestResult(t, data.results[0]);
      stats.ok++;
      const { loc, place } = geocodeLocationLabel(t);
      const suffix = place ? ` - ${place}` : "";
      progress(counter, `OK ${loc}${suffix}`);
      return "done";
    }
    if (data.status === "ZERO_RESULTS") return "zero";
    stats.statusErr++;
    const extra = data.error_message ? ` - ${data.error_message}` : "";
    progress(counter, `${data.status}${extra}`);
    return "done"; // Non-retryable
  } catch (err) {
    stats.caughtErr++;
    const msg = err?.response?.data?.error_message || err.message;
    progress(counter, `ERROR: ${msg}`);
    return "done"; // Stop attempts on exception
  }
}

async function geocodeTour(client, t, counter, apiKey, delayMs, stats) {
  const attempts = buildAttemptQueries(t);
  for (let j = 0; j < attempts.length; j++) {
    if (j > 0) await sleep(delayMs);
    const outcome = await geocodeAttempt(
      client,
      t,
      attempts[j],
      j,
      counter,
      apiKey,
      stats,
    );
    if (outcome === "done") break;
    if (j === attempts.length - 1) {
      stats.zero++;
      progress(counter, `ZERO_RESULTS (after ${attempts.length} attempts)`);
      break;
    }
    progress(counter, "ZERO_RESULTS, will try next");
  }
  await sleep(delayMs);
}

/**
 * Phase 3: geocode tours missing coordinates, incrementally (only tours
 * without lat/lng are processed). Requires a Google Maps API key.
 */
async function geocodeTours(tours, apiKey, { delayMs = 120 } = {}) {
  if (!apiKey) {
    log("No GOOGLE_MAPS_API_KEY found. Skipping geocoding.");
    return { tours, stats: { ok: 0, zero: 0, status: 0, errors: 0 } };
  }
  const client = new Client({});
  const toGeocode = tours.filter(
    (t) =>
      !(t?.geocode?.lat != null && t?.geocode?.lng != null) &&
      normalizeText(t.title || ""),
  );
  const tail = apiKey.slice(-6);
  log(
    `Geocoding ${toGeocode.length}/${tours.length} tours using Google Maps SDK (key tail: …${tail}).`,
  );

  const stats = { ok: 0, zero: 0, statusErr: 0, caughtErr: 0 };

  for (let i = 0; i < toGeocode.length; i++) {
    const counter = `[${i + 1}/${toGeocode.length}]`;
    await geocodeTour(client, toGeocode[i], counter, apiKey, delayMs, stats);
  }

  log(
    `Geocoding complete: ok=${stats.ok}, zero=${stats.zero}, status=${stats.statusErr}, errors=${stats.caughtErr}`,
  );
  return {
    tours,
    stats: {
      ok: stats.ok,
      zero: stats.zero,
      status: stats.statusErr,
      errors: stats.caughtErr,
    },
  };
}

module.exports = { geocodeTours };
