const { Client } = require("@googlemaps/google-maps-services-js");
const { log, sleep } = require("./log");

function normalizeText(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

async function geocodeTours(tours, apiKey, { delayMs = 120 } = {}) {
  if (!apiKey) {
    log("No GOOGLE_MAPS_API_KEY found. Skipping geocoding.");
    return tours;
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

  let ok = 0,
    zero = 0,
    statusErr = 0,
    caughtErr = 0;

  for (let i = 0; i < toGeocode.length; i++) {
    const t = toGeocode[i];
    const attempts = [];
    const titleQ = normalizeText(t.title || "");
    if (titleQ) attempts.push({ label: "title", q: titleQ });
    const start = normalizeText(t.details?.start || "");
    const location = normalizeText(t.details?.location || "");
    if (start && location)
      attempts.push({ label: "start+location", q: `${start}, ${location}` });
    if (start) attempts.push({ label: "start", q: start });
    if (location) attempts.push({ label: "location", q: location });

    for (let j = 0; j < attempts.length; j++) {
      const { label, q } = attempts[j];
      const prefix = `[${i + 1}/${toGeocode.length}]`;
      const attemptStr = j === 0 ? "Geocoding" : `Retry (${label})`;
      log(`${prefix} ${attemptStr} "${q}"…`);
      try {
        const { data } = await client.geocode({
          params: { address: q, key: apiKey },
        });
        if (
          data.status === "OK" &&
          Array.isArray(data.results) &&
          data.results.length
        ) {
          const best = data.results[0];
          // ensure geocode bag exists (for safety if reading legacy tours)
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
          ok++;
          const loc =
            t.geocode.lat != null && t.geocode.lng != null
              ? `${t.geocode.lat},${t.geocode.lng}`
              : "(no geometry)";
          const place = [t.geocode.state, t.geocode.country]
            .filter(Boolean)
            .join(", ");
          log(`${prefix} OK ${loc}${place ? ` - ${place}` : ""}`);
          break;
        } else if (data.status === "ZERO_RESULTS") {
          // Try next attempt if available
          if (j === attempts.length - 1) {
            zero++;
            log(`${prefix} ZERO_RESULTS (after ${attempts.length} attempts)`);
          } else {
            log(`${prefix} ZERO_RESULTS, will try next`);
          }
        } else {
          statusErr++;
          const extra = data.error_message ? ` - ${data.error_message}` : "";
          log(`${prefix} ${data.status}${extra}`);
          break; // Non-retryable
        }
      } catch (err) {
        caughtErr++;
        const msg = err?.response?.data?.error_message || err.message;
        log(`${prefix} ERROR: ${msg}`);
        break; // Stop attempts on exception
      }
      await sleep(delayMs);
    }

    await sleep(delayMs);
  }

  log(
    `Geocoding complete: ok=${ok}, zero=${zero}, status=${statusErr}, errors=${caughtErr}`,
  );
  return tours;
}

module.exports = { geocodeTours };
