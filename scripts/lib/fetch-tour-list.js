const cheerio = require("cheerio");

function normalizeText(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchTourList() {
  const resp = await fetch("https://guidealong.com/tour-list/");
  if (!resp.ok) throw new Error(`Failed to fetch tour list: ${resp.status}`);
  const html = await resp.text();
  const $ = cheerio.load(html);
  const tours = [];
  $('h3 a[href*="/tour/"]').each((_, el) => {
    const link = $(el);
    const title = normalizeText(link.text());
    const url = link.attr("href") || "";
    const parent = link.closest("div");

    let description = "";
    const descDiv = parent.find("div.tourmaster-tour-content").first();
    if (descDiv?.length) {
      description = normalizeText(descDiv.text());
    } else {
      const pTags = parent.find("p").toArray();
      if (pTags.length) {
        const longest = pTags.reduce(
          (a, b) => ($(a).text().length > $(b).text().length ? a : b),
          pTags[0],
        );
        description = normalizeText($(longest).text());
      }
    }

    let duration = "";
    const durationDiv = parent
      .find("div.tourmaster-tour-info-duration-text")
      .first();
    if (durationDiv?.length) duration = normalizeText(durationDiv.text());

    let audioPoints = "";
    const audioDiv = parent
      .find("div.tourmaster-tour-info-minimum-age")
      .first();
    if (audioDiv?.length) {
      const raw = normalizeText(audioDiv.text());
      const cleaned = raw.replace(/^\s*audio\s*points\s*[:-]?\s*/i, "");
      const m = /\d[\d,]*\+?/.exec(cleaned);
      audioPoints = m ? m[0] : cleaned;
    }

    let tourType = "";
    const tourTypeDiv = parent
      .find("div.tourmaster-tour-info-maximum-people")
      .first();
    if (tourTypeDiv?.length) {
      tourType = normalizeText(tourTypeDiv.text())
        .replace(/tour type[:\s]*/i, "")
        .trim();
    }
    if (!tourType) {
      if (/\bwalk(ing)?\b/i.test(title) || /\bwalk(ing)?\b/i.test(description))
        tourType = "Walking";
      else tourType = "Driving";
    }

    // Thumbnail fetching is disabled for now
    const thumbnail = "";

    tours.push({
      title,
      url,
      details: {
        description,
        thumbnail,
        audioPoints,
        duration,
        tourType,
        start: "",
        location: "",
      },
      geocode: {
        lat: null,
        lng: null,
        country: "",
        state: "",
      },
    });
  });
  return tours;
}

module.exports = { fetchTourList };
