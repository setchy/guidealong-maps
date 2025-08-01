let map;
let markers = [];
let allTours = [];
let completedTours = [];
let completedToursData = []; // Store full completed tour objects
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
  }
}

async function loadCompletedTours() {
  try {
    const response = await fetch("data/completed.json");
    if (!response.ok) throw new Error("Failed to fetch completed tours");
    const completed = await response.json();
    
    // Handle both old format (array of strings) and new format (array of objects)
    if (completed.length > 0) {
      if (typeof completed[0] === 'string') {
        // Old format: array of strings
        completedToursData = completed.map(title => ({ title, completedDate: null }));
        return completed;
      } else {
        // New format: array of objects
        completedToursData = completed;
        return completed.map(tour => tour.title);
      }
    }
    return [];
  } catch (error) {
    console.error("Error loading completed tours:", error);
    return [];
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
    // if (/bundle|tours|\+/i.test(title)) {
    //   console.warn(`Skipping bundled tour with title: "${title}"`);
    //   return; // Skip this tour
    // }

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
    let audioPoints = "";
    let duration = "";
    let tourType = "";
    let thumbnail = "";
    if (parent) {
      const durationDiv = parent.querySelector(
        "div.tourmaster-tour-info-duration-text",
      );
      if (durationDiv) duration = durationDiv.textContent.trim();
      const audioDiv = parent.querySelector(
        "div.tourmaster-tour-info-minimum-age",
      );
      if (audioDiv)
        audioPoints = audioDiv.textContent
          .trim()
          .replace(/audio points[:\s]*/i, "")
          .trim();
      const tourTypeDiv = parent.querySelector(
        "div.tourmaster-tour-info-maximum-people",
      );
      if (tourTypeDiv)
        tourType = tourTypeDiv.textContent
          .trim()
          .replace(/tour type[:\s]*/i, "")
          .trim();
      const thumbDiv = parent.querySelector("div.tourmaster-tour-thumbnail");
      if (thumbDiv) {
        const imgElement = thumbDiv.querySelector("img");
        if (imgElement?.src) thumbnail = imgElement.src;
      }
    }

    tours.push({
      title,
      url,
      description,
      thumbnail,
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
  geocodeResult?.address_components?.forEach((comp) => {
    if (comp.types.includes("country")) country = comp.long_name;
    if (comp.types.includes("administrative_area_level_1"))
      state = comp.long_name;
  });
  return { country, state };
}

async function geocodeTours(tours) {
  const geocodedTours = [];
  for (const tour of tours) {
    let cleanName = tour.title
      .replace(/\b(tour|audio|driving|walking|guide|app)\b/gi, " ")
      .replace(/australia,/gi, " ")
      .replace(/,.*$/, "")
      .replace(/\s*-\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim(); 

    let geocodeDetails = await new Promise((resolve) => {
      geocoder.geocode({ address: cleanName }, (results, status) => {
        resolve(status === "OK" && results[0] ? results[0] : null);
      });
    });
    console.log(`Geocode result for "${cleanName}":`, geocodeDetails);

    if (!geocodeDetails) {
      cleanName = `${cleanName} National Park`;
      geocodeDetails = await new Promise((resolve) => {
        geocoder.geocode({ address: cleanName }, (results, status) => {
          resolve(status === "OK" && results[0] ? results[0] : null);
        });
      });
      console.log(`Retry geocode result for "${cleanName}":`, geocodeDetails);
    }

    if (geocodeDetails) {
      const { country, state } =
        extractCountryAndStateFromGeocode(geocodeDetails);
      geocodedTours.push({
        ...tour,
        lat: geocodeDetails.geometry.location.lat(),
        lng: geocodeDetails.geometry.location.lng(),
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
    if (t.lat && t.lng) {
      const isCompleted = completedTours.includes(t.title);
      const marker = new google.maps.Marker({
        map: map,
        position: { lat: t.lat, lng: t.lng },
        title: t.title,
        icon: isCompleted ? completedIcon : guidealongIcon,
      });
      marker.addListener("click", () => {
        if (openInfoWindow) {
          openInfoWindow.close();
        }
        
        // Get completion data for this tour
        const completedTourData = completedToursData.find(ct => ct.title === t.title);
        const completedDateText = completedTourData?.completedDate 
          ? `: ${completedTourData.completedDate}`
          : '';
        
        const info = new google.maps.InfoWindow({
          content: `<h3>${t.title}${isCompleted ? ' ✅' : ''}</h3>
            ${isCompleted ? `<div style="color: #28a745; font-weight: bold; margin-bottom: 8px;">Completed Tour${completedDateText}</div>` : ''}
            ${t.thumbnail ? `<img src='${t.thumbnail}' alt='${t.title}' style='max-width:200px;max-height:120px;margin-bottom:8px;border-radius:6px;'>` : ""}
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
  const completedCount = tours.filter(tour => completedTours.includes(tour.title)).length;
  const totalCount = tours.length;
  const completedText = completedCount > 0 ? ` (${completedCount} completed)` : '';
  document.getElementById("stats").textContent = `${totalCount} tours shown${completedText}`;
}

function populateFilters(tours) {
  // Build country and state sets
  const countrySet = new Set();
  const countryStates = {};
  tours.forEach((t) => {
    if (t.country) {
      countrySet.add(t.country);
      if (!countryStates[t.country]) countryStates[t.country] = new Set();
      if (t.state) countryStates[t.country].add(t.state);
    }
  });

  // Populate country filter
  const countryDropdownContent = document.getElementById("countryDropdownContent");
  if (countryDropdownContent) {
    let countryCheckboxes = '<div class="checkbox-item"><input type="checkbox" id="allCountries" value="" checked><label for="allCountries">All Countries</label></div>';
    
    Array.from(countrySet)
      .sort()
      .forEach((country) => {
        if (country) {
          const countryId = `country_${country.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}`;
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
    let stateCheckboxes = '<div class="checkbox-item"><input type="checkbox" id="allStates" value="" checked><label for="allStates">All States</label></div>';
    
    Object.keys(countryStates)
      .sort()
      .forEach((country) => {
        const states = Array.from(countryStates[country]).sort();
        if (states.length) {
          stateCheckboxes += `<div class="optgroup-label">${country}</div>`;
          states.forEach((state) => {
            if (state) {
              const stateId = `state_${state.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}`;
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
    const stateCheckboxes = document.querySelectorAll('#stateDropdownContent input[type="checkbox"]:not(#allStates)');
    stateCheckboxes.forEach(checkbox => {
      checkbox.checked = allStatesCheckbox.checked;
    });
    updateDropdownButtonText();
    filterTours();
  });
  
  // Handle individual state checkboxes
  const stateCheckboxes = document.querySelectorAll('#stateDropdownContent input[type="checkbox"]:not(#allStates)');
  stateCheckboxes.forEach(checkbox => {
    checkbox.addEventListener("change", () => {
      const checkedStates = Array.from(stateCheckboxes).filter(cb => cb.checked);
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
    const countryCheckboxes = document.querySelectorAll('#countryDropdownContent input[type="checkbox"]:not(#allCountries)');
    countryCheckboxes.forEach(checkbox => {
      checkbox.checked = allCountriesCheckbox.checked;
    });
    updateCountryDropdownButtonText();
    filterTours();
  });
  
  // Handle individual country checkboxes
  const countryCheckboxes = document.querySelectorAll('#countryDropdownContent input[type="checkbox"]:not(#allCountries)');
  countryCheckboxes.forEach(checkbox => {
    checkbox.addEventListener("change", () => {
      const checkedCountries = Array.from(countryCheckboxes).filter(cb => cb.checked);
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
  const countryCheckboxes = document.querySelectorAll('#countryDropdownContent input[type="checkbox"]:not(#allCountries)');
  const checkedCountries = Array.from(countryCheckboxes).filter(cb => cb.checked);
  
  if (allCountriesCheckbox.checked || checkedCountries.length === 0) {
    dropdownButton.innerHTML = 'All Countries <span class="dropdown-arrow">▼</span>';
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
  
  const countryCheckboxes = document.querySelectorAll('#countryDropdownContent input[type="checkbox"]:not(#allCountries)');
  return Array.from(countryCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
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
  statusRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      updateStatusDropdownButtonText();
      filterTours();
    });
  });
  
  updateStatusDropdownButtonText();
}

function updateStatusDropdownButtonText() {
  const dropdownButton = document.getElementById("statusDropdownButton");
  const selectedStatus = document.querySelector('input[name="tourStatus"]:checked').value;
  
  switch(selectedStatus) {
    case 'completed':
      dropdownButton.innerHTML = 'Completed Tours Only <span class="dropdown-arrow">▼</span>';
      break;
    case 'incomplete':
      dropdownButton.innerHTML = 'Not Completed Tours Only <span class="dropdown-arrow">▼</span>';
      break;
    default:
      dropdownButton.innerHTML = 'All Tours <span class="dropdown-arrow">▼</span>';
  }
}

function getSelectedTourStatus() {
  const selectedStatus = document.querySelector('input[name="tourStatus"]:checked');
  return selectedStatus ? selectedStatus.value : 'all';
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
  tourTypeRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      updateTourTypeDropdownButtonText();
      filterTours();
    });
  });
  
  updateTourTypeDropdownButtonText();
}

function updateTourTypeDropdownButtonText() {
  const dropdownButton = document.getElementById("tourTypeDropdownButton");
  const selectedTourType = document.querySelector('input[name="tourType"]:checked').value;
  
  switch(selectedTourType) {
    case 'Driving':
      dropdownButton.innerHTML = 'Driving Tours Only <span class="dropdown-arrow">▼</span>';
      break;
    case 'Walking':
      dropdownButton.innerHTML = 'Walking Tours Only <span class="dropdown-arrow">▼</span>';
      break;
    default:
      dropdownButton.innerHTML = 'All Tour Types <span class="dropdown-arrow">▼</span>';
  }
}

function getSelectedTourType() {
  const selectedTourType = document.querySelector('input[name="tourType"]:checked');
  return selectedTourType ? selectedTourType.value : 'all';
}

function updateDropdownButtonText() {
  const dropdownButton = document.getElementById("stateDropdownButton");
  const allStatesCheckbox = document.getElementById("allStates");
  const stateCheckboxes = document.querySelectorAll('#stateDropdownContent input[type="checkbox"]:not(#allStates)');
  const checkedStates = Array.from(stateCheckboxes).filter(cb => cb.checked);
  
  if (allStatesCheckbox.checked || checkedStates.length === 0) {
    dropdownButton.innerHTML = 'All States <span class="dropdown-arrow">▼</span>';
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
  
  const stateCheckboxes = document.querySelectorAll('#stateDropdownContent input[type="checkbox"]:not(#allStates)');
  return Array.from(stateCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
}

function filterTours() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const selectedCountries = getSelectedCountries();
  const selectedStates = getSelectedStates();
  const selectedStatus = getSelectedTourStatus();
  const selectedTourType = getSelectedTourType();
  
  const filtered = allTours.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search) ||
      t.description.toLowerCase().includes(search);
    const matchesCountry = selectedCountries.length === 0 || selectedCountries.includes(t.country);
    const matchesState = selectedStates.length === 0 || selectedStates.includes(t.state);
    
    // Filter by completion status
    const isCompleted = completedTours.includes(t.title);
    let matchesStatus = true;
    if (selectedStatus === 'completed') {
      matchesStatus = isCompleted;
    } else if (selectedStatus === 'incomplete') {
      matchesStatus = !isCompleted;
    }
    
    // Filter by tour type
    let matchesTourType = true;
    if (selectedTourType !== 'all') {
      matchesTourType = t.tourType === selectedTourType;
    }
    
    return matchesSearch && matchesCountry && matchesState && matchesStatus && matchesTourType;
  });
  plotToursOnMap(filtered);
  updateStats(filtered);
}

document.getElementById("searchInput").addEventListener("input", filterTours);

// Fetch & Save Latest Tours button logic
document.getElementById("fetchToursBtn").addEventListener("click", async () => {
  showLoading("Fetching and saving latest tours...");
  try {
    const tours = await fetchTours();
    // Save tours to tours.json using File System Access API if available
    const toursJson = JSON.stringify(tours, null, 2);
    if (window.showSaveFilePicker) {
      // Modern browsers: File System Access API
      const handle = await window.showSaveFilePicker({
        suggestedName: "tours.json",
        types: [
          {
            description: "JSON file",
            accept: { "application/json": [".json"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(toursJson);
      await writable.close();
      showLoading("Tours saved to tours.json!");
      setTimeout(hideLoading, 1500);
    } else {
      // Fallback: download as file
      const blob = new Blob([toursJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tours.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showLoading("Tours file downloaded!");
      setTimeout(hideLoading, 1500);
    }
  } catch (err) {
    showError("Failed to fetch or save tours: " + err.message);
    hideLoading();
  }
});

async function loadToursFromFile() {
  try {
    showLoading("Loading saved tours...");
    const response = await fetch("./data/tours.json");
    if (!response.ok) throw new Error("No saved tours file found");
    const tours = await response.json();
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
  geocoder = new google.maps.Geocoder();

  hideLoading();
  document.getElementById("controls").style.display = "block";

  // Load completed tours
  completedTours = await loadCompletedTours();

  let tours = await loadToursFromFile();
  if (!tours || !Array.isArray(tours) || tours.length === 0) {
    // If no tours.json or it's empty, fetch and geocode
    try {
      tours = await fetchTours();
    } catch {
      showError("Could not load tours. Showing sample data.");
    }
  }
  allTours = tours;
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
    datalist.innerHTML = tours.map(t => `<option value="${t.title}">`).join("");
  }

  // Update autocomplete whenever filters change
  function updateAll() {
    const filtered = allTours.filter((t) => {
      const search = searchInput.value.toLowerCase();
      const selectedCountries = getSelectedCountries();
      const selectedStates = getSelectedStates();
      const selectedStatus = getSelectedTourStatus();
      const selectedTourType = getSelectedTourType();
      const matchesSearch = t.title.toLowerCase().includes(search) || t.description.toLowerCase().includes(search);
      const matchesCountry = selectedCountries.length === 0 || selectedCountries.includes(t.country);
      const matchesState = selectedStates.length === 0 || selectedStates.includes(t.state);
      
      // Filter by completion status
      const isCompleted = completedTours.includes(t.title);
      let matchesStatus = true;
      if (selectedStatus === 'completed') {
        matchesStatus = isCompleted;
      } else if (selectedStatus === 'incomplete') {
        matchesStatus = !isCompleted;
      }
      
      // Filter by tour type
      let matchesTourType = true;
      if (selectedTourType !== 'all') {
        matchesTourType = t.tourType === selectedTourType;
      }
      
      return matchesSearch && matchesCountry && matchesState && matchesStatus && matchesTourType;
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
