let map;
let markers = [];
let allTours = [];
let geocoder;

async function fetchTours() {
  try {
    showLoading("Fetching tour data...");
    // Use corsproxy.io to bypass CORS
    const response = await fetch(
      "https://corsproxy.io/?https://guidealong.com/tour-list/",
    );
    if (!response.ok) throw new Error("Failed to fetch tour data");
    const html = await response.text();
    const tours = parseTourData(html);
    showLoading("Geocoding tour locations...");
    const geocodedTours = await geocodeTours(tours);
    hideLoading(); // Hide loading after geocoding is done
    return geocodedTours;
  } catch (error) {
    console.error("Error fetching tours:", error);
    showError("Unable to fetch live data. Using sample tours.");
    hideLoading(); // Hide loading on error
    return getSampleTours();
  }
}

function parseTourData(html) {
  const tours = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Find all tour elements
  const tourElements = doc.querySelectorAll('h3 a[href*="/tour/"]');

  tourElements.forEach((link) => {
    const title = link.textContent.trim();
    const url = link.href;
    // Skip if title contains 'bundle' or 'tours' (case-insensitive)
    if (/bundle|tours/i.test(title)) {
      console.warn(`Skipping bundled tour with title: "${title}"`);
      return; // Skip this tour
    }

    // Find the parent tour card (assume closest div)
    const parent = link.closest("div") || link.parentElement;

    // Extract description from div.tourmaster-tour-content
    let description = "";
    if (parent) {
      const descDiv = parent.querySelector("div.tourmaster-tour-content");
      if (descDiv) {
        description = descDiv.textContent.trim();
      } else {
        // Fallback: Find all <p> tags and pick the one with the longest text
        const pTags = Array.from(parent.querySelectorAll("p"));
        if (pTags.length) {
          description = pTags
            .reduce((a, b) =>
              a.textContent.length > b.textContent.length ? a : b,
            )
            .textContent.trim();
        }
      }
    }

    // Extract audio points, duration, tour type
    let audioPoints = "",
      duration = "",
      tourType = "";
    if (parent) {
      // Find all <li> or <span> with icons or text
      const textNodes = parent.querySelectorAll("li, span, div");
      textNodes.forEach((node) => {
        const txt = node.textContent.trim();
        if (/audio points/i.test(txt))
          audioPoints = txt.replace(/audio points[:\s]*/i, "").trim();
        if (/full day|hour|day|1\/2/i.test(txt)) duration = txt;
        if (/tour type/i.test(txt))
          tourType = txt.replace(/tour type[:\s]*/i, "").trim();
      });
    }

    // Get image from div.tourmaster-tour-thumbnail
    let image = "";
    if (parent) {
      const thumbDiv = parent.querySelector("div.tourmaster-tour-thumbnail");
      if (thumbDiv) {
        const imgElement = thumbDiv.querySelector("img");
        if (imgElement && imgElement.src) {
          image = imgElement.src;
        }
      } else {
        // Fallback: look for any img in parent
        const imgElement = parent.querySelector("img");
        if (imgElement && imgElement.src) {
          image = imgElement.src;
        }
      }
    }
    tours.push({
      title,
      url,
      description,
      image,
      audioPoints,
      duration,
      tourType,
      lat: null,
      lng: null,
    });
  });

  return tours;
}

function extractCountryAndStateFromGeocode(geocodeResult) {
  let country = "";
  let state = "";
  if (geocodeResult && geocodeResult.address_components) {
    geocodeResult.address_components.forEach((comp) => {
      if (comp.types.includes("country")) country = comp.long_name;
      if (comp.types.includes("administrative_area_level_1"))
        state = comp.long_name;
    });
  }
  return { country, state };
}

async function geocodeTours(tours) {
  const geocodedTours = [];
  for (const tour of tours) {
    let geocodeDetails = null;
    geocodeDetails = await new Promise((resolve) => {
      const cleanName = tour.title
        .replace(/,.*$/, "") // Remove any comma and following text
        .replace(/\b(tour|audio|driving|walking|guide|app)\b/gi, " ")
        .replace(/\s*-\s*/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      geocoder.geocode({ address: cleanName }, (results, status) => {
        if (status === "OK" && results[0]) {
          resolve(results[0]);
        } else {
          resolve(null);
        }
      });
    });
    if (geocodeDetails) {
      coordinates = {
        lat: geocodeDetails.geometry.location.lat(),
        lng: geocodeDetails.geometry.location.lng(),
      };
    }
    let country = "",
      state = "";
    if (geocodeDetails) {
      ({ country, state } = extractCountryAndStateFromGeocode(geocodeDetails));
    }
    if (coordinates) {
      geocodedTours.push({
        ...tour,
        lat: coordinates.lat,
        lng: coordinates.lng,
        country,
        state,
      });
    }
  }
  return geocodedTours;
}

function showLoading(msg) {
  document.getElementById("loading").style.display = "block";
  document.getElementById("loading").textContent = msg;
}

function hideLoading() {
  document.getElementById("loading").style.display = "none";
}

function showError(msg) {
  const errorDiv = document.getElementById("error");
  errorDiv.textContent = msg;
  errorDiv.style.display = "block";
}

function hideError() {
  document.getElementById("error").style.display = "none";
}

function plotToursOnMap(tours) {
  // Remove old markers
  markers.forEach((m) => {
    if (m && m.map) m.map = null;
    if (m && m.parentNode) m.parentNode.removeChild(m);
  });
  markers = [];

  let openInfoWindow = null;
  tours.forEach((t) => {
    if (t.lat && t.lng) {
      // Use AdvancedMarkerElement for marker
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: map,
        position: { lat: t.lat, lng: t.lng },
        title: t.title,
      });
      // InfoWindow for marker click
      marker.addListener("click", () => {
        // Close any open InfoWindow
        if (openInfoWindow) {
          openInfoWindow.close();
        }
        const info = new google.maps.InfoWindow({
          content: `<h3>${t.title}</h3>
            ${t.image ? `<img src='${t.image}' alt='${t.title}' style='max-width:200px;max-height:120px;margin-bottom:8px;border-radius:6px;'>` : ""}
            ${t.duration ? `<div><b>Duration:</b> ${t.duration}</div>` : ""}
            ${t.audioPoints ? `<div><b>Audio Points:</b> ${t.audioPoints}</div>` : ""}
            ${t.tourType ? `<div><b>Tour Type:</b> ${t.tourType}</div>` : ""}
            ${t.description ? `<p>${t.description}</p>` : "<p>No description available.</p>"}
            <a href='${t.url}' target='_blank'>Learn more</a>`,
        });
        info.open(map, marker);
        openInfoWindow = info;
      });
      markers.push(marker);
    }
  });
}

function updateStats(tours) {
  document.getElementById("stats").textContent = `${tours.length} tours shown`;
}

function populateFilters(tours) {
  const countrySet = new Set();
  const stateSet = new Set();
  tours.forEach((t) => {
    // Add all countries found in geocoded address_components
    if (t.country) countrySet.add(t.country);
    // Add all states found in geocoded address_components
    if (t.state) stateSet.add(t.state);
  });
  const countryFilter = document.getElementById("countryFilter");
  countryFilter.innerHTML = '<option value="">All Countries</option>';
  Array.from(countrySet)
    .sort()
    .forEach((c) => {
      if (c) countryFilter.innerHTML += `<option value="${c}">${c}</option>`;
    });
  let stateFilter = document.getElementById("stateFilter");
  if (!stateFilter) {
    // Add state filter to controls if not present
    const stateDiv = document.createElement("div");
    stateDiv.className = "filter-section";
    stateDiv.innerHTML = `<label for="stateFilter">Filter by state:</label><select id="stateFilter"><option value="">All States</option></select>`;
    document
      .getElementById("controls")
      .insertBefore(stateDiv, document.getElementById("stats"));
    stateFilter = document.getElementById("stateFilter");
  }
  stateFilter.innerHTML = '<option value="">All States</option>';
  Array.from(stateSet)
    .sort()
    .forEach((s) => {
      if (s) stateFilter.innerHTML += `<option value="${s}">${s}</option>`;
    });
}

function filterTours() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const country = document.getElementById("countryFilter").value;
  const state = document.getElementById("stateFilter")
    ? document.getElementById("stateFilter").value
    : "";
  const filtered = allTours.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search) ||
      t.description.toLowerCase().includes(search);
    const matchesCountry = !country || t.country === country;
    const matchesState = !state || t.state === state;
    return matchesSearch && matchesCountry && matchesState;
  });
  plotToursOnMap(filtered);
  updateStats(filtered);
}

document.getElementById("searchInput").addEventListener("input", filterTours);
document
  .getElementById("countryFilter")
  .addEventListener("change", filterTours);
// State filter will be added dynamically, so add listener after population

function initMap() {
  showLoading("Initializing map...");
  hideError();
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 4,
    center: { lat: 39, lng: -98 }, // centered over U.S.
    mapId: "DEMO_MAP_ID", // <-- Replace with your own Map ID for production
  });
  geocoder = new google.maps.Geocoder();

  // Always hide loading after map is initialized
  hideLoading();
  document.getElementById("controls").style.display = "block";

  fetchTours()
    .then((tours) => {
      allTours = tours;
      populateFilters(allTours);
      if (document.getElementById("stateFilter")) {
        document
          .getElementById("stateFilter")
          .addEventListener("change", filterTours);
      }
      plotToursOnMap(allTours);
      updateStats(allTours);
    })
    .catch((err) => {
      // Fallback in case fetchTours throws
      console.error("Map init error:", err);
      showError("Could not load tours. Showing sample data.");
      allTours = getSampleTours();
      plotToursOnMap(allTours);
      updateStats(allTours);
    });
}

// .env loader for browser
async function loadEnv() {
  try {
    const response = await fetch(".env");
    if (!response.ok) throw new Error("Could not load .env");
    const text = await response.text();
    const lines = text.split("\n");
    const env = {};
    lines.forEach((line) => {
      line = line.trim();
      if (line && !line.startsWith("#") && line.includes("=")) {
        const [key, ...rest] = line.split("=");
        env[key.trim()] = rest.join("=").trim();
      }
    });
    return env;
  } catch (e) {
    console.warn("Failed to load .env:", e);
    return {};
  }
}

// Use .env loader for Google Maps API key
(async () => {
  const env = await loadEnv();
  if (env.GOOGLE_MAPS_API_KEY) {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${env.GOOGLE_MAPS_API_KEY}&libraries=places,marker&callback=initMap`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  } else {
    showError("Google Maps API key not found in .env");
  }
})();

window.initMap = initMap;
