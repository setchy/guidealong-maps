let map;
let markers = [];
const markerIndexByKey = new Map();
let allTours = [];
let completedTours = [];
let completedToursData = []; // Store full completed tour objects

async function loadCompletedTours() {
  try {
    const response = await fetch("data/completed.json");
    if (!response.ok) throw new Error("Failed to fetch completed tours");
    const completed = await response.json();
    if (!Array.isArray(completed)) return [];
    completedToursData = completed;
    return completed.map((tour) => tour.title);
  } catch (error) {
    console.error("Error loading completed tours:", error);
    return [];
  }
}

// --- Pure helpers ---------------------------------------------------------
function computeFilteredTours(tours, completedTitles, filters) {
  const search = (filters.search || "").toLowerCase();
  const { countries = [], states = [], status = "all", type = "all" } =
    filters || {};

  return (tours || []).filter((t) => {
    const d = t?.details || {};
    const g = t?.geocode || {};
    const matchesSearch =
      t.title?.toLowerCase().includes(search) ||
      (d.description || "").toLowerCase().includes(search);
    const matchesCountry = countries.length === 0 || countries.includes(g.country);
    const matchesState = states.length === 0 || states.includes(g.state);

    const isCompleted = completedTitles.includes(t.title);
    let matchesStatus = true;
    if (status === "completed") matchesStatus = isCompleted;
    else if (status === "incomplete") matchesStatus = !isCompleted;

    let matchesTourType = true;
    if (type !== "all") matchesTourType = d.tourType === type;

    return (
      matchesSearch &&
      matchesCountry &&
      matchesState &&
      matchesStatus &&
      matchesTourType
    );
  });
}

function getFilters() {
  const searchEl = document.getElementById("searchInput");
  return {
    search: searchEl ? searchEl.value : "",
    countries: getSelectedCountries(),
    states: getSelectedStates(),
    status: getSelectedTourStatus(),
    type: getSelectedTourType(),
  };
}

function updateAutocomplete(tours) {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;
  let datalist = document.getElementById("tourSearchList");
  if (!datalist) {
    datalist = document.createElement("datalist");
    datalist.id = "tourSearchList";
    document.body.appendChild(datalist);
    searchInput.setAttribute("list", "tourSearchList");
  }
  datalist.innerHTML = (tours || [])
    .map((t) => `<option value="${t.title}">`)
    .join("");
}

function debounce(fn, wait = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
  t = setTimeout(() => fn(...args), wait);
  };
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
  // Remove old markers from map
  markers.forEach((m) => {
    if (m) m.setMap(null);
  });
  markers = [];
  markerIndexByKey.clear();

  let openInfoWindow = null;
  const guidealongIcon = {
    url: "icons/guidealong.png",
    scaledSize: new google.maps.Size(16, 16),
  };

  const completedIcon = {
    url: "icons/guidealong-completed.png",
    scaledSize: new google.maps.Size(16, 16),
  };

  tours.forEach((t) => {
    const lat = t?.geocode?.lat;
    const lng = t?.geocode?.lng;
    if (lat && lng) {
      const isCompleted = completedTours.includes(t.title);
      const key = t.url || t.title;
      const marker = new google.maps.Marker({
        map: map,
        position: { lat, lng },
        title: t.title,
        icon: isCompleted ? completedIcon : guidealongIcon,
      });
      markerIndexByKey.set(key, markers.length);
      marker.addListener("click", () => {
        if (openInfoWindow) openInfoWindow.close();

        // Get completion data for this tour
        const completedTourData = completedToursData.find(
          (ct) => ct.title === t.title,
        );
        const info = new google.maps.InfoWindow({
          content: buildInfoContent(t, isCompleted, completedTourData),
        });
        info.open(map, marker);
        openInfoWindow = info;
      });
      markers.push(marker);
    }
  });
}

function buildInfoContent(t, isCompleted, completedTourData) {
  const d = t?.details || {};
  const completedDateText = completedTourData?.completedDate
    ? `: ${completedTourData.completedDate}`
    : "";
  return `<h3>${t.title}${isCompleted ? " ✅" : ""}</h3>
    ${isCompleted ? `<div style="color: #28a745; font-weight: bold; margin-bottom: 8px;">Completed Tour${completedDateText}</div>` : ""}
    ${d.location ? `<div><b>Location:</b> ${d.location}</div>` : ""}
    ${d.duration ? `<div><b>Duration:</b> ${d.duration}</div>` : ""}
    ${d.audioPoints ? `<div><b>Audio Points:</b> ${d.audioPoints}</div>` : ""}
    ${d.tourType ? `<div><b>Tour Type:</b> ${d.tourType}</div>` : ""}
    ${d.start ? `<div><b>Start:</b> ${d.start}</div>` : ""}
    ${d.description ? `<p>${d.description}</p>` : "<p>No description available.</p>"}
    <a href='${t.url}' target='_blank'>Learn more</a>`;
}

function updateStats(tours) {
  const completedCount = tours.filter((tour) =>
    completedTours.includes(tour.title),
  ).length;
  const totalCount = tours.length;
  const completedText =
    completedCount > 0 ? ` (${completedCount} completed)` : "";
  document.getElementById("tourCount").textContent =
    `${totalCount} tours shown${completedText}`;
}

function populateFilters(tours) {
  // Build country and state sets
  const countrySet = new Set();
  const countryStates = {};
  tours.forEach((t) => {
    const country = t?.geocode?.country;
    const state = t?.geocode?.state;
    if (country) {
      countrySet.add(country);
      if (!countryStates[country]) countryStates[country] = new Set();
      if (state) countryStates[country].add(state);
    }
  });

  // Populate country filter
  const countryDropdownContent = document.getElementById(
    "countryDropdownContent",
  );
  if (countryDropdownContent) {
    let countryCheckboxes =
      '<div class="checkbox-item"><input type="checkbox" id="allCountries" value="" checked><label for="allCountries">All Countries</label></div>';

    Array.from(countrySet)
      .sort((a, b) => a.localeCompare(b))
      .forEach((country) => {
        if (country) {
          const countryId = `country_${country.replace(/\s+/g, "_").replace(/\W/g, "")}`;
          countryCheckboxes += `<div class="checkbox-item"><input type="checkbox" id="${countryId}" value="${country}"><label for="${countryId}">${country}</label></div>`;
        }
      });
    countryDropdownContent.innerHTML = countryCheckboxes;

    // Add event listeners for checkboxes
    setupCountryCheckboxListeners();
  }

  // Populate state filter grouped by country
  const stateDropdownContent = document.getElementById("stateDropdownContent");
  if (stateDropdownContent) {
    let stateCheckboxes =
      '<div class="checkbox-item"><input type="checkbox" id="allStates" value="" checked><label for="allStates">All States</label></div>';

    Object.keys(countryStates)
      .sort((a, b) => a.localeCompare(b))
      .forEach((country) => {
        const states = Array.from(countryStates[country]).sort((a, b) =>
          a.localeCompare(b),
        );
        if (states.length) {
          stateCheckboxes += `<div class="optgroup-label">${country}</div>`;
          states.forEach((state) => {
            if (state) {
              const stateId = `state_${state.replace(/\s+/g, "_").replace(/\W/g, "")}`;
              stateCheckboxes += `<div class="checkbox-item"><input type="checkbox" id="${stateId}" value="${state}"><label for="${stateId}">${state}</label></div>`;
            }
          });
        }
      });
    stateDropdownContent.innerHTML = stateCheckboxes;

    // Add event listeners for checkboxes
    setupStateCheckboxListeners();
  }

  // Setup tour status filter
  setupTourStatusFilter();

  // Setup tour type filter
  setupTourTypeFilter();
}

function setupStateCheckboxListeners() {
  const dropdownButton = document.getElementById("stateDropdownButton");
  const dropdown = dropdownButton.parentElement;
  const allStatesCheckbox = document.getElementById("allStates");
  const content = document.getElementById("stateDropdownContent");

  // Toggle dropdown
  dropdownButton.addEventListener("click", (e) => {
    e.stopPropagation();
  const open = dropdown.classList.toggle("open");
  dropdownButton.setAttribute("aria-expanded", String(open));
  });

  // Delegate change events
  if (content) {
    content.addEventListener("change", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return;
      if (target.id === "allStates") {
        const stateCheckboxes = content.querySelectorAll(
          'input[type="checkbox"]:not(#allStates)'
        );
        stateCheckboxes.forEach((cb) => {
          cb.checked = target.checked;
        });
      } else {
        const stateCheckboxes = content.querySelectorAll(
          'input[type="checkbox"]:not(#allStates)'
        );
        const anyChecked = Array.from(stateCheckboxes).some((cb) => cb.checked);
        allStatesCheckbox.checked = !anyChecked;
      }
      updateStateDropdownButtonText();
      updateAll();
    });
  }

  updateStateDropdownButtonText();
}

function setupCountryCheckboxListeners() {
  const dropdownButton = document.getElementById("countryDropdownButton");
  const dropdown = dropdownButton.parentElement;
  const allCountriesCheckbox = document.getElementById("allCountries");
  const content = document.getElementById("countryDropdownContent");

  // Toggle dropdown
  dropdownButton.addEventListener("click", (e) => {
    e.stopPropagation();
  const open = dropdown.classList.toggle("open");
  dropdownButton.setAttribute("aria-expanded", String(open));
  });

  // Delegate change events
  if (content) {
    content.addEventListener("change", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return;
      if (target.id === "allCountries") {
        const countryCheckboxes = content.querySelectorAll(
          'input[type="checkbox"]:not(#allCountries)'
        );
        countryCheckboxes.forEach((cb) => {
          cb.checked = target.checked;
        });
      } else {
        const countryCheckboxes = content.querySelectorAll(
          'input[type="checkbox"]:not(#allCountries)'
        );
        const anyChecked = Array.from(countryCheckboxes).some((cb) => cb.checked);
        allCountriesCheckbox.checked = !anyChecked;
      }
      updateCountryDropdownButtonText();
      updateAll();
    });
  }

  updateCountryDropdownButtonText();
}

function updateCountryDropdownButtonText() {
  const dropdownButton = document.getElementById("countryDropdownButton");
  const allCb = document.getElementById("allCountries");
  const countryCheckboxes = document.querySelectorAll(
    '#countryDropdownContent input[type="checkbox"]:not(#allCountries)'
  );
  const checked = Array.from(countryCheckboxes).filter((cb) => cb.checked);
  updateMultiSelectButtonLabel(
    dropdownButton,
    !!allCb?.checked || checked.length === 0,
    checked.map((cb) => cb.value),
    "countries",
    "All Countries"
  );
}

function getSelectedCountries() {
  const allCountriesCheckbox = document.getElementById("allCountries");
  if (allCountriesCheckbox?.checked) {
    return [];
  }

  const countryCheckboxes = document.querySelectorAll(
    '#countryDropdownContent input[type="checkbox"]:not(#allCountries)',
  );
  return Array.from(countryCheckboxes)
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);
}

function setupTourStatusFilter() {
  const dropdownButton = document.getElementById("statusDropdownButton");
  const dropdown = dropdownButton.parentElement;
  const content = document.getElementById("statusDropdownContent");

  // Toggle dropdown
  dropdownButton.addEventListener("click", (e) => {
    e.stopPropagation();
  const open = dropdown.classList.toggle("open");
  dropdownButton.setAttribute("aria-expanded", String(open));
  });

  // Delegate radio changes
  if (content) {
    content.addEventListener("change", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "radio") return;
      updateStatusDropdownButtonText();
      updateAll();
      dropdown.classList.remove("open");
      dropdownButton.setAttribute("aria-expanded", "false");
    });
  }

  updateStatusDropdownButtonText();
}

function updateStatusDropdownButtonText() {
  const dropdownButton = document.getElementById("statusDropdownButton");
  const selectedStatus = document.querySelector(
    'input[name="tourStatus"]:checked',
  ).value;

  switch (selectedStatus) {
    case "completed":
      dropdownButton.innerHTML =
        'Completed Tours Only <span class="dropdown-arrow">▼</span>';
      break;
    case "incomplete":
      dropdownButton.innerHTML =
        'Not Completed Tours Only <span class="dropdown-arrow">▼</span>';
      break;
    default:
      dropdownButton.innerHTML =
        'All Tours <span class="dropdown-arrow">▼</span>';
  }
}

function getSelectedTourStatus() {
  const selectedStatus = document.querySelector(
    'input[name="tourStatus"]:checked',
  );
  return selectedStatus ? selectedStatus.value : "all";
}

function setupTourTypeFilter() {
  const dropdownButton = document.getElementById("tourTypeDropdownButton");
  const dropdown = dropdownButton.parentElement;
  const content = document.getElementById("tourTypeDropdownContent");

  // Toggle dropdown
  dropdownButton.addEventListener("click", (e) => {
    e.stopPropagation();
  const open = dropdown.classList.toggle("open");
  dropdownButton.setAttribute("aria-expanded", String(open));
  });

  // Delegate radio changes
  if (content) {
    content.addEventListener("change", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "radio") return;
      updateTourTypeDropdownButtonText();
      updateAll();
      dropdown.classList.remove("open");
      dropdownButton.setAttribute("aria-expanded", "false");
    });
  }

  updateTourTypeDropdownButtonText();
}

function updateTourTypeDropdownButtonText() {
  const dropdownButton = document.getElementById("tourTypeDropdownButton");
  const selectedTourType = document.querySelector(
    'input[name="tourType"]:checked',
  ).value;

  switch (selectedTourType) {
    case "Driving":
      dropdownButton.innerHTML =
        'Driving Tours Only <span class="dropdown-arrow">▼</span>';
      break;
    case "Walking":
      dropdownButton.innerHTML =
        'Walking Tours Only <span class="dropdown-arrow">▼</span>';
      break;
    default:
      dropdownButton.innerHTML =
        'All Tour Types <span class="dropdown-arrow">▼</span>';
  }
}

function getSelectedTourType() {
  const selectedTourType = document.querySelector(
    'input[name="tourType"]:checked',
  );
  return selectedTourType ? selectedTourType.value : "all";
}

function updateStateDropdownButtonText() {
  const dropdownButton = document.getElementById("stateDropdownButton");
  const allCb = document.getElementById("allStates");
  const stateCheckboxes = document.querySelectorAll(
    '#stateDropdownContent input[type="checkbox"]:not(#allStates)'
  );
  const checked = Array.from(stateCheckboxes).filter((cb) => cb.checked);
  updateMultiSelectButtonLabel(
    dropdownButton,
    !!allCb?.checked || checked.length === 0,
    checked.map((cb) => cb.value),
    "states",
    "All States"
  );
}

function updateMultiSelectButtonLabel(buttonEl, allChecked, checkedValues, unitPlural, allLabel) {
  if (!buttonEl) return;
  if (allChecked || (checkedValues && checkedValues.length === 0)) {
    buttonEl.innerHTML = `${allLabel} <span class="dropdown-arrow">▼</span>`;
  } else if (checkedValues.length === 1) {
    buttonEl.innerHTML = `${checkedValues[0]} <span class="dropdown-arrow">▼</span>`;
  } else {
    buttonEl.innerHTML = `${checkedValues.length} ${unitPlural} selected <span class="dropdown-arrow">▼</span>`;
  }
}

function getSelectedStates() {
  const allStatesCheckbox = document.getElementById("allStates");
  if (allStatesCheckbox?.checked) {
    return [];
  }

  const stateCheckboxes = document.querySelectorAll(
    '#stateDropdownContent input[type="checkbox"]:not(#allStates)',
  );
  return Array.from(stateCheckboxes)
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);
}

function updateAll() {
  const filters = getFilters();
  const filtered = computeFilteredTours(allTours, completedTours, filters);
  updateAutocomplete(filtered);
  plotToursOnMap(filtered);
  updateStats(filtered);
  renderTourList(filtered);
}

// Removed Fetch & Save button and logic

async function loadToursFromFile() {
  try {
    showLoading("Loading saved tours...");
    const response = await fetch("./data/tours.json");
    if (!response.ok) throw new Error("No saved tours file found");
    const toursRaw = await response.json();
    const tours = Array.isArray(toursRaw) ? toursRaw : [];
    hideLoading();
    return tours;
  } catch {
    hideLoading();
    return null;
  }
}

async function initMap() {
  showLoading("Initializing map...");
  hideError();
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 4,
    center: { lat: 39, lng: -98 }, // centered over U.S.
    mapId: "GuideAlong Global Map", // <-- Replace with your own Map ID for production
  streetViewControl: false, 
  });

  hideLoading();
  document.getElementById("controls").style.display = "block";

  // Load completed tours
  completedTours = await loadCompletedTours();

  const tours = await loadToursFromFile();
  if (!tours || !Array.isArray(tours) || tours.length === 0) {
    showError(
      "No tours found. Please generate src/data/tours.json via the backend script.",
    );
  }
  allTours = Array.isArray(tours) ? tours : [];
  populateFilters(allTours);

  // Wire search with debounce and initialize UI
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    const debounced = debounce(updateAll, 150);
    searchInput.addEventListener("input", debounced);
    searchInput.addEventListener("change", updateAll);
  }
  updateAutocomplete(allTours);
  updateAll();

  // Collapsible tour list toggle
  const tourListSection = document.getElementById("tourListSection");
  const tourListToggle = document.getElementById("tourListToggle");
  if (tourListSection && tourListToggle) {
    tourListToggle.addEventListener("click", () => {
      const collapsed = tourListSection.classList.toggle("collapsed");
      tourListToggle.setAttribute("aria-expanded", String(!collapsed));
    });
  }

  // Collapsible filters toggle
  const filtersSection = document.getElementById("filtersSection");
  const filtersToggle = document.getElementById("filtersToggle");
  if (filtersSection && filtersToggle) {
    filtersToggle.addEventListener("click", () => {
      const collapsed = filtersSection.classList.toggle("collapsed");
      filtersToggle.setAttribute("aria-expanded", String(!collapsed));
    });
  }

  // Global outside-click to close any open dropdowns
  initGlobalDropdownCloser();
}

function initGlobalDropdownCloser() {
  document.addEventListener("click", (e) => {
    document.querySelectorAll(".dropdown.open").forEach((dd) => {
      if (!dd.contains(e.target)) {
        dd.classList.remove("open");
        const button = dd.querySelector(".dropdown-button");
        if (button) button.setAttribute("aria-expanded", "false");
      }
    });
  });
}

// .env loader for browser
async function loadEnv() {
  try {
    const response = await fetch("config/.env");
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

function renderTourList(tours) {
  const list = document.getElementById("tourList");
  if (!list) return;
  if (!tours || tours.length === 0) {
    list.innerHTML = '<div class="meta">No tours to display.</div>';
    return;
  }
  list.innerHTML = tours
    .map((t) => {
      const g = t.geocode || {};
      const d = t.details || {};
      const place = [g.state, g.country].filter(Boolean).join(", ");
      const status = completedTours.includes(t.title) ? "✅" : "";
      const type = d.tourType ? ` • ${d.tourType}` : "";
  const key = (t.url || t.title).replace(/"/g, '&quot;');
  return `<div class="tour-item" data-key="${key}">
        <div class="title">${t.title} ${status}</div>
        <div class="meta">${place || ""}${type}</div>
      </div>`;
    })
    .join("");

  // click handlers
  list.querySelectorAll(".tour-item").forEach((el) => {
    el.addEventListener("click", () => {
  const key = el.getAttribute("data-key");
  if (!key) return;
  const idx = markerIndexByKey.get(key);
      if (idx == null) return;
      const marker = markers[idx];
      if (!marker) return;
      const pos = marker.getPosition();
      if (pos) {
        map.panTo(pos);
        map.setZoom(6);
      }
      google.maps.event.trigger(marker, "click");
    });
  });
}
