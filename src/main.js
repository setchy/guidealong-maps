import {
  AttributionControl,
  GeolocateControl,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
} from "https://cdn.jsdelivr.net/npm/maplibre-gl@6.3.0/+esm";

let map;
let markers = [];
const markerIndexByKey = new Map();
let allTours = [];
let completedTours = [];
let completedToursData = []; // Store full completed tour objects
let userLocation = null;
let geolocateControl = null;
let locationRequested = false;

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
  const {
    countries = [],
    states = [],
    status = "all",
    type = "all",
  } = filters || {};

  return (tours || []).filter((t) => {
    const d = t?.details || {};
    const g = t?.geocode || {};
    const matchesSearch =
      t.title?.toLowerCase().includes(search) ||
      (d.description || "").toLowerCase().includes(search);
    const matchesCountry =
      countries.length === 0 || countries.includes(g.country);
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
    if (m) m.remove();
  });
  markers = [];
  markerIndexByKey.clear();

  tours.forEach((t) => {
    const lat = t?.geocode?.lat;
    const lng = t?.geocode?.lng;
    if (lat && lng) {
      const isCompleted = completedTours.includes(t.title);
      const key = t.url || t.title;
      const el = document.createElement("img");
      el.src = isCompleted
        ? "icons/guidealong-completed.png"
        : "icons/guidealong.png";
      el.style.width = "16px";
      el.style.height = "16px";

      const marker = new Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);

      const completedTourData = completedToursData.find(
        (ct) => ct.title === t.title,
      );
      const popup = new Popup({ offset: 25 }).setHTML(
        buildInfoContent(t, isCompleted, completedTourData),
      );
      marker.setPopup(popup);

      markerIndexByKey.set(key, markers.length);
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
      if (!(target instanceof HTMLInputElement) || target.type !== "checkbox")
        return;
      if (target.id === "allStates") {
        const stateCheckboxes = content.querySelectorAll(
          'input[type="checkbox"]:not(#allStates)',
        );
        stateCheckboxes.forEach((cb) => {
          cb.checked = target.checked;
        });
      } else {
        const stateCheckboxes = content.querySelectorAll(
          'input[type="checkbox"]:not(#allStates)',
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
      if (!(target instanceof HTMLInputElement) || target.type !== "checkbox")
        return;
      if (target.id === "allCountries") {
        const countryCheckboxes = content.querySelectorAll(
          'input[type="checkbox"]:not(#allCountries)',
        );
        countryCheckboxes.forEach((cb) => {
          cb.checked = target.checked;
        });
      } else {
        const countryCheckboxes = content.querySelectorAll(
          'input[type="checkbox"]:not(#allCountries)',
        );
        const anyChecked = Array.from(countryCheckboxes).some(
          (cb) => cb.checked,
        );
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
    '#countryDropdownContent input[type="checkbox"]:not(#allCountries)',
  );
  const checked = Array.from(countryCheckboxes).filter((cb) => cb.checked);
  updateMultiSelectButtonLabel(
    dropdownButton,
    !!allCb?.checked || checked.length === 0,
    checked.map((cb) => cb.value),
    "countries",
    "All Countries",
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
      if (!(target instanceof HTMLInputElement) || target.type !== "radio")
        return;
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
      if (!(target instanceof HTMLInputElement) || target.type !== "radio")
        return;
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
    '#stateDropdownContent input[type="checkbox"]:not(#allStates)',
  );
  const checked = Array.from(stateCheckboxes).filter((cb) => cb.checked);
  updateMultiSelectButtonLabel(
    dropdownButton,
    !!allCb?.checked || checked.length === 0,
    checked.map((cb) => cb.value),
    "states",
    "All States",
  );
}

function updateMultiSelectButtonLabel(
  buttonEl,
  allChecked,
  checkedValues,
  unitPlural,
  allLabel,
) {
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

// --- Group & Sort helpers -------------------------------------------------
function getCompletedInfo(title) {
  const data = completedToursData.find((ct) => ct.title === title);
  return {
    completed: completedTours.includes(title),
    date: data?.completedDate || null,
  };
}

function haversineDistanceMiles(a, b) {
  const R = 3958.8; // Earth radius in miles
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function tourDistanceMiles(t, userLocation) {
  const g = t?.geocode;
  if (!g || g.lat == null || g.lng == null || !userLocation) return null;
  return haversineDistanceMiles(userLocation, { lat: g.lat, lng: g.lng });
}

function sortTours(tours, sortKey, userLocation) {
  const sorted = [...tours];
  const byTitle = (a, b) =>
    (a.title || "").localeCompare(b.title || "", undefined, { numeric: true });

  switch (sortKey) {
    case "completedDate": {
      sorted.sort((a, b) => {
        const ca = getCompletedInfo(a.title);
        const cb = getCompletedInfo(b.title);
        // Not completed first? No - completed tours go first.
        if (ca.completed !== cb.completed) return ca.completed ? -1 : 1;
        if (!ca.completed) return byTitle(a, b);
        // Both completed: dated before undated
        if (!!ca.date !== !!cb.date) return ca.date ? -1 : 1;
        if (ca.date && cb.date) return cb.date.localeCompare(ca.date); // newest first
        return byTitle(a, b);
      });
      break;
    }
    case "distance": {
      sorted.sort((a, b) => {
        const da = tourDistanceMiles(a, userLocation);
        const db = tourDistanceMiles(b, userLocation);
        if (da == null && db == null) return byTitle(a, b);
        if (da == null) return 1; // ungeocoded last
        if (db == null) return -1;
        return da - db;
      });
      break;
    }
    default:
      sorted.sort(byTitle);
  }
  return sorted;
}

function groupTours(sortedTours, groupKey) {
  if (groupKey === "none" || !groupKey) {
    return [
      {
        key: "all",
        label: null,
        count: sortedTours.length,
        tours: sortedTours,
      },
    ];
  }

  const groups = new Map();
  for (const t of sortedTours) {
    let key;
    let label;
    if (groupKey === "status") {
      const { completed } = getCompletedInfo(t.title);
      key = completed ? "completed" : "incomplete";
      label = completed ? "Completed" : "Not Completed";
    } else {
      key = t.category || "Driving";
      label = key;
    }
    if (!groups.has(key)) groups.set(key, { key, label, count: 0, tours: [] });
    groups.get(key).tours.push(t);
    groups.get(key).count += 1;
  }

  const list = Array.from(groups.values());
  if (groupKey === "category") {
    // Most tours first; tie-break alphabetically
    list.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  } else {
    // Status: Completed first, then Not Completed
    list.sort((a, b) => {
      const order = { completed: 0, incomplete: 1 };
      return (order[a.key] ?? 2) - (order[b.key] ?? 2);
    });
  }
  return list;
}

function getGroupBy() {
  const selected = document.querySelector('input[name="groupBy"]:checked');
  return selected ? selected.value : "none";
}

function getSortBy() {
  const selected = document.querySelector('input[name="sortBy"]:checked');
  return selected ? selected.value : "title";
}

function setupGroupByFilter() {
  const dropdownButton = document.getElementById("groupByDropdownButton");
  const dropdown = dropdownButton.parentElement;
  const content = document.getElementById("groupByDropdownContent");

  dropdownButton.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = dropdown.classList.toggle("open");
    dropdownButton.setAttribute("aria-expanded", String(open));
  });

  if (content) {
    content.addEventListener("change", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "radio")
        return;
      updateGroupByDropdownButtonText();
      updateAll();
      dropdown.classList.remove("open");
      dropdownButton.setAttribute("aria-expanded", "false");
    });
  }

  updateGroupByDropdownButtonText();
}

function updateGroupByDropdownButtonText() {
  const dropdownButton = document.getElementById("groupByDropdownButton");
  if (!dropdownButton) return;
  const selected = document.querySelector('input[name="groupBy"]:checked');
  const labels = { none: "None", status: "Status", category: "Category" };
  dropdownButton.innerHTML = `${labels[selected?.value] || "None"} <span class="dropdown-arrow">▼</span>`;
}

function setupSortByFilter() {
  const dropdownButton = document.getElementById("sortByDropdownButton");
  const dropdown = dropdownButton.parentElement;
  const content = document.getElementById("sortByDropdownContent");

  dropdownButton.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = dropdown.classList.toggle("open");
    dropdownButton.setAttribute("aria-expanded", String(open));
  });

  if (content) {
    content.addEventListener("change", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "radio")
        return;
      updateSortByDropdownButtonText();
      updateAll();
      dropdown.classList.remove("open");
      dropdownButton.setAttribute("aria-expanded", "false");
    });
  }

  updateSortByDropdownButtonText();
}

function updateSortByDropdownButtonText() {
  const dropdownButton = document.getElementById("sortByDropdownButton");
  if (!dropdownButton) return;
  const selected = document.querySelector('input[name="sortBy"]:checked');
  const labels = {
    title: "Title",
    completedDate: "Completed date",
    distance: "Distance",
  };
  dropdownButton.innerHTML = `${labels[selected?.value] || "Title"} <span class="dropdown-arrow">▼</span>`;
}

function updateAll() {
  const filters = getFilters();
  const filtered = computeFilteredTours(allTours, completedTours, filters);
  updateAutocomplete(filtered);
  plotToursOnMap(filtered);
  updateStats(filtered);
  renderTourList(filtered);
}

function groupAndSort(tours) {
  const sortKey = getSortBy();
  const groupKey = getGroupBy();
  if (sortKey === "distance" && !userLocation && !locationRequested) {
    locationRequested = true;
    geolocateControl?.trigger();
  }
  const sorted = sortTours(tours, sortKey, userLocation);
  return groupTours(sorted, groupKey);
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
  map = new MapLibreMap({
    container: "map",
    style: "https://tiles.openfreemap.org/styles/liberty",
    center: [-98, 39], // centered over U.S.
    zoom: 4,
    attributionControl: false,
  });
  map.addControl(new NavigationControl(), "bottom-right");
  const attributionControl = new AttributionControl({ compact: true });
  map.addControl(attributionControl, "top-right");
  const collapseAttribution = () => {
    const el = map.getContainer().querySelector(".maplibregl-ctrl-attrib");
    if (el) el.classList.remove("maplibregl-compact-show");
  };
  collapseAttribution();
  map.on("load", collapseAttribution);
  geolocateControl = new GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: false,
    showUserLocation: true,
    fitBoundsOptions: { maxZoom: 10 },
  });
  map.addControl(geolocateControl, "bottom-right");
  geolocateControl.on("geolocate", (e) => {
    userLocation = { lat: e.coords.latitude, lng: e.coords.longitude };
  });
  map.on("popupopen", (e) => {
    markers.forEach((m) => {
      const p = m.getPopup();
      if (p && p !== e.popup && p.isOpen()) p.remove();
    });
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
    if (
      window.innerWidth <= 600 &&
      !filtersSection.classList.contains("collapsed")
    ) {
      filtersSection.classList.add("collapsed");
      filtersToggle.setAttribute("aria-expanded", "false");
    }
    filtersToggle.addEventListener("click", () => {
      const collapsed = filtersSection.classList.toggle("collapsed");
      filtersToggle.setAttribute("aria-expanded", String(!collapsed));
    });
  }

  // Collapsible group & sort toggle
  const groupSortSection = document.getElementById("groupSortSection");
  const groupSortToggle = document.getElementById("groupSortToggle");
  if (groupSortSection && groupSortToggle) {
    groupSortToggle.addEventListener("click", () => {
      const collapsed = groupSortSection.classList.toggle("collapsed");
      groupSortToggle.setAttribute("aria-expanded", String(!collapsed));
    });
  }

  setupGroupByFilter();
  setupSortByFilter();

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

// MapLibre GL JS is loaded via ES module import above
initMap();

function renderTourList(tours) {
  const list = document.getElementById("tourList");
  if (!list) return;

  const groups = groupAndSort(tours);
  const sortByDistance = getSortBy() === "distance";

  if (groups.length === 0 || groups.every((g) => g.tours.length === 0)) {
    list.innerHTML = '<div class="meta">No tours to display.</div>';
    return;
  }

  list.innerHTML = groups
    .map((group) => {
      const items = group.tours
        .map((t) => {
          const g = t.geocode || {};
          const d = t.details || {};
          const place = [g.state, g.country].filter(Boolean).join(", ");
          const status = completedTours.includes(t.title) ? "✅" : "";
          const type = d.tourType ? ` • ${d.tourType}` : "";
          const key = (t.url || t.title).replace(/"/g, "&quot;");
          let dist = "";
          if (sortByDistance) {
            const miles = tourDistanceMiles(t, userLocation);
            dist = miles != null ? `${miles.toFixed(1)} mi · ` : "— · ";
          }
          return `<div class="tour-item" data-key="${key}">
            <div class="title">${t.title} ${status}</div>
            <div class="meta">${dist}${place || ""}${type}</div>
          </div>`;
        })
        .join("");
      const header = group.label
        ? `<div class="group-header">${group.label} <span class="group-count">(${group.count})</span></div>`
        : "";
      return header + items;
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
      const pos = marker.getLngLat();
      if (pos) {
        map.flyTo({ center: [pos.lng, pos.lat], zoom: 6 });
      }
      marker.togglePopup();
    });
  });
}
