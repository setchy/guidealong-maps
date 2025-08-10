let map;
let markers = [];
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
      const marker = new google.maps.Marker({
        map: map,
        position: { lat, lng },
        title: t.title,
        icon: isCompleted ? completedIcon : guidealongIcon,
      });
      marker.addListener("click", () => {
        if (openInfoWindow) {
          openInfoWindow.close();
        }

        // Get completion data for this tour
        const completedTourData = completedToursData.find(
          (ct) => ct.title === t.title,
        );
        const completedDateText = completedTourData?.completedDate
          ? `: ${completedTourData.completedDate}`
          : "";

        const d = t.details || {};
        const info = new google.maps.InfoWindow({
          content: `<h3>${t.title}${isCompleted ? " ✅" : ""}</h3>
            ${isCompleted ? `<div style="color: #28a745; font-weight: bold; margin-bottom: 8px;">Completed Tour${completedDateText}</div>` : ""}
            ${d.thumbnail ? `<img src='${d.thumbnail}' alt='${t.title}' style='max-width:200px;max-height:120px;margin-bottom:8px;border-radius:6px;'>` : ""}
            ${d.duration ? `<div><b>Duration:</b> ${d.duration}</div>` : ""}
            ${d.audioPoints ? `<div><b>Audio Points:</b> ${d.audioPoints}</div>` : ""}
            ${d.tourType ? `<div><b>Tour Type:</b> ${d.tourType}</div>` : ""}
            ${d.description ? `<p>${d.description}</p>` : "<p>No description available.</p>"}
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
  const completedCount = tours.filter((tour) =>
    completedTours.includes(tour.title),
  ).length;
  const totalCount = tours.length;
  const completedText =
    completedCount > 0 ? ` (${completedCount} completed)` : "";
  document.getElementById("stats").textContent =
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

  // Toggle dropdown
  dropdownButton.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("open");
    }
  });

  // Handle "All States" checkbox
  allStatesCheckbox.addEventListener("change", () => {
    const stateCheckboxes = document.querySelectorAll(
      '#stateDropdownContent input[type="checkbox"]:not(#allStates)',
    );
    stateCheckboxes.forEach((checkbox) => {
      checkbox.checked = allStatesCheckbox.checked;
    });
    updateDropdownButtonText();
    filterTours();
  });

  // Handle individual state checkboxes
  const stateCheckboxes = document.querySelectorAll(
    '#stateDropdownContent input[type="checkbox"]:not(#allStates)',
  );
  stateCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const checkedStates = Array.from(stateCheckboxes).filter(
        (cb) => cb.checked,
      );
      allStatesCheckbox.checked = checkedStates.length === 0;
      updateDropdownButtonText();
      filterTours();
    });
  });

  updateDropdownButtonText();
}

function setupCountryCheckboxListeners() {
  const dropdownButton = document.getElementById("countryDropdownButton");
  const dropdown = dropdownButton.parentElement;
  const allCountriesCheckbox = document.getElementById("allCountries");

  // Toggle dropdown
  dropdownButton.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("open");
    }
  });

  // Handle "All Countries" checkbox
  allCountriesCheckbox.addEventListener("change", () => {
    const countryCheckboxes = document.querySelectorAll(
      '#countryDropdownContent input[type="checkbox"]:not(#allCountries)',
    );
    countryCheckboxes.forEach((checkbox) => {
      checkbox.checked = allCountriesCheckbox.checked;
    });
    updateCountryDropdownButtonText();
    filterTours();
  });

  // Handle individual country checkboxes
  const countryCheckboxes = document.querySelectorAll(
    '#countryDropdownContent input[type="checkbox"]:not(#allCountries)',
  );
  countryCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const checkedCountries = Array.from(countryCheckboxes).filter(
        (cb) => cb.checked,
      );
      allCountriesCheckbox.checked = checkedCountries.length === 0;
      updateCountryDropdownButtonText();
      filterTours();
    });
  });

  updateCountryDropdownButtonText();
}

function updateCountryDropdownButtonText() {
  const dropdownButton = document.getElementById("countryDropdownButton");
  const allCountriesCheckbox = document.getElementById("allCountries");
  const countryCheckboxes = document.querySelectorAll(
    '#countryDropdownContent input[type="checkbox"]:not(#allCountries)',
  );
  const checkedCountries = Array.from(countryCheckboxes).filter(
    (cb) => cb.checked,
  );

  if (allCountriesCheckbox.checked || checkedCountries.length === 0) {
    dropdownButton.innerHTML =
      'All Countries <span class="dropdown-arrow">▼</span>';
  } else if (checkedCountries.length === 1) {
    dropdownButton.innerHTML = `${checkedCountries[0].value} <span class="dropdown-arrow">▼</span>`;
  } else {
    dropdownButton.innerHTML = `${checkedCountries.length} countries selected <span class="dropdown-arrow">▼</span>`;
  }
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

  // Toggle dropdown
  dropdownButton.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("open");
    }
  });

  // Handle status radio button changes
  const statusRadios = document.querySelectorAll('input[name="tourStatus"]');
  statusRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      updateStatusDropdownButtonText();
      filterTours();
    });
  });

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

  // Toggle dropdown
  dropdownButton.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("open");
    }
  });

  // Handle tour type radio button changes
  const tourTypeRadios = document.querySelectorAll('input[name="tourType"]');
  tourTypeRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      updateTourTypeDropdownButtonText();
      filterTours();
    });
  });

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

function updateDropdownButtonText() {
  const dropdownButton = document.getElementById("stateDropdownButton");
  const allStatesCheckbox = document.getElementById("allStates");
  const stateCheckboxes = document.querySelectorAll(
    '#stateDropdownContent input[type="checkbox"]:not(#allStates)',
  );
  const checkedStates = Array.from(stateCheckboxes).filter((cb) => cb.checked);

  if (allStatesCheckbox.checked || checkedStates.length === 0) {
    dropdownButton.innerHTML =
      'All States <span class="dropdown-arrow">▼</span>';
  } else if (checkedStates.length === 1) {
    dropdownButton.innerHTML = `${checkedStates[0].value} <span class="dropdown-arrow">▼</span>`;
  } else {
    dropdownButton.innerHTML = `${checkedStates.length} states selected <span class="dropdown-arrow">▼</span>`;
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

function filterTours() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const selectedCountries = getSelectedCountries();
  const selectedStates = getSelectedStates();
  const selectedStatus = getSelectedTourStatus();
  const selectedTourType = getSelectedTourType();

  const filtered = allTours.filter((t) => {
    const d = t.details || {};
    const g = t.geocode || {};
    const matchesSearch =
      t.title.toLowerCase().includes(search) ||
      (d.description || "").toLowerCase().includes(search);
    const matchesCountry =
      selectedCountries.length === 0 || selectedCountries.includes(g.country);
    const matchesState =
      selectedStates.length === 0 || selectedStates.includes(g.state);

    // Filter by completion status
    const isCompleted = completedTours.includes(t.title);
    let matchesStatus = true;
    if (selectedStatus === "completed") {
      matchesStatus = isCompleted;
    } else if (selectedStatus === "incomplete") {
      matchesStatus = !isCompleted;
    }

    // Filter by tour type
    let matchesTourType = true;
    if (selectedTourType !== "all") {
      matchesTourType = d.tourType === selectedTourType;
    }

    return (
      matchesSearch &&
      matchesCountry &&
      matchesState &&
      matchesStatus &&
      matchesTourType
    );
  });
  plotToursOnMap(filtered);
  updateStats(filtered);
}

document.getElementById("searchInput").addEventListener("input", filterTours);

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

  // Autocomplete for search input
  const searchInput = document.getElementById("searchInput");
  let datalist = document.getElementById("tourSearchList");
  if (!datalist) {
    datalist = document.createElement("datalist");
    datalist.id = "tourSearchList";
    document.body.appendChild(datalist);
    searchInput.setAttribute("list", "tourSearchList");
  }
  function updateAutocomplete(tours) {
    datalist.innerHTML = tours
      .map((t) => `<option value="${t.title}">`)
      .join("");
  }

  // Update autocomplete whenever filters change
  function updateAll() {
    const filtered = allTours.filter((t) => {
      const search = searchInput.value.toLowerCase();
      const selectedCountries = getSelectedCountries();
      const selectedStates = getSelectedStates();
      const selectedStatus = getSelectedTourStatus();
      const selectedTourType = getSelectedTourType();
      const d = t.details || {};
      const g = t.geocode || {};
      const matchesSearch =
        t.title.toLowerCase().includes(search) ||
        (d.description || "").toLowerCase().includes(search);
      const matchesCountry =
        selectedCountries.length === 0 || selectedCountries.includes(g.country);
      const matchesState =
        selectedStates.length === 0 || selectedStates.includes(g.state);

      // Filter by completion status
      const isCompleted = completedTours.includes(t.title);
      let matchesStatus = true;
      if (selectedStatus === "completed") {
        matchesStatus = isCompleted;
      } else if (selectedStatus === "incomplete") {
        matchesStatus = !isCompleted;
      }

      // Filter by tour type
      let matchesTourType = true;
      if (selectedTourType !== "all") {
        matchesTourType = d.tourType === selectedTourType;
      }

      return (
        matchesSearch &&
        matchesCountry &&
        matchesState &&
        matchesStatus &&
        matchesTourType
      );
    });
    updateAutocomplete(filtered);
    plotToursOnMap(filtered);
    updateStats(filtered);
  }

  searchInput.addEventListener("input", updateAll);
  searchInput.addEventListener("change", updateAll);
  updateAutocomplete(allTours);
  plotToursOnMap(allTours);
  updateStats(allTours);
}

// .env loader for browser
async function loadEnv() {
  try {
    const response = await fetch("./config/.env");
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
