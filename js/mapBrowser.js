
var errorOverlayUrl = 'https://cdn-icons-png.flaticon.com/512/110/110686.png';

const isLocal =
window.location.hostname === 'localhost' ||
window.location.hostname === '127.0.0.1' ||
window.location.hostname === '';

const backendBaseUrl = isLocal ? 'http://127.0.0.1:5000' : '';  // '' = same origin in prod


/// Adds a map overlay to the map. Returns the overlay ImageOverlay object that was just added.
function addOrienteeringMapOverlay(jsonDefinition, map) {
  const overlayCoords = [jsonDefinition.nw_coords, jsonDefinition.se_coords];
  const overlayFile = `${backendBaseUrl}/api/dal/mapfile/final/${encodeURIComponent(jsonDefinition.map_name)}`;

  return L.imageOverlay(overlayFile, overlayCoords, {
    opacity: 1,
    errorOverlayUrl: errorOverlayUrl,
    alt: '',
    interactive: true
  }).addTo(map);
}

document.addEventListener("DOMContentLoaded", async function() {

  var startLatLon = [60.4002, 5.3411]; // Bergen

  requestWakeLock();

  let mapDefinitions = [];
  let currentOverlay = null;
  let selectedMapName = null;
  let lastKnownLocation = null;

  const mapSelectorToggle = document.getElementById('mapSelectorToggle');
  const mapSelectorPanel = document.getElementById('mapSelectorPanel');
  const mapSelectorList = document.getElementById('mapSelectorList');

  var map = L.map('mapBrowser').setView(startLatLon, 15);
  L.tileLayer('https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="http://www.kartverket.no/">Kartverket</a>'
  }).addTo(map);

  // Fetch map definitions from backend API
  try {
    const response = await fetch(`${backendBaseUrl}/api/dal/list_maps`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch maps: ${response.statusText}`);
    }

    mapDefinitions = await response.json();
    console.log(`Loaded ${mapDefinitions.length} maps from backend`);

  } catch (error) {
    console.error('Error fetching map definitions:', error);
    // Continue with empty mapDefinitions array - map will still be initialized
  }

  function setSelectorVisibility(shouldShow) {
    if (shouldShow) {
      renderMapSelectionList();
    }

    mapSelectorPanel.classList.toggle('is-visible', shouldShow);
    mapSelectorPanel.setAttribute('aria-hidden', (!shouldShow).toString());
    mapSelectorToggle.setAttribute('aria-expanded', shouldShow ? 'true' : 'false');
    mapSelectorToggle.textContent = shouldShow ? 'Lukk' : 'Velg kart';
  }

  function renderMapSelectionList() {
    const locationSnapshot = lastKnownLocation
      ? { lat: lastKnownLocation.lat, lng: lastKnownLocation.lng }
      : null;

    const entries = mapDefinitions.map((definition) => {
      const center = getMapCenterCoords(definition);
      const distance = locationSnapshot ? calculateDistanceMeters(locationSnapshot, center) : null;
      return { definition, distance };
    });

    entries.sort((a, b) => {
      if (a.distance === null && b.distance === null) {
        return a.definition.map_name.localeCompare(b.definition.map_name);
      }
      if (a.distance === null) {
        return 1;
      }
      if (b.distance === null) {
        return -1;
      }
      return a.distance - b.distance;
    });

    const fragment = document.createDocumentFragment();

    if (entries.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'map-selector-empty';
      emptyItem.textContent = 'No map overlays available';
      fragment.appendChild(emptyItem);
    } else {
      entries.forEach(({ definition, distance }) => {
        const listItem = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'map-selector-item';
        button.dataset.mapName = definition.map_name;

        if (definition.map_name === selectedMapName) {
          button.classList.add('selected');
        }

        const nameEl = document.createElement('span');
        nameEl.className = 'map-selector-item__name';
        nameEl.textContent = definition.map_name;

        const distanceEl = document.createElement('span');
        distanceEl.className = 'map-selector-item__distance';
        distanceEl.textContent = formatDistanceLabel(distance);

        button.appendChild(nameEl);
        button.appendChild(distanceEl);

        button.addEventListener('click', () => {
          handleMapSelection(definition);
        });

        listItem.appendChild(button);
        fragment.appendChild(listItem);
      });
    }

    mapSelectorList.innerHTML = '';
    mapSelectorList.appendChild(fragment);
  }

  function handleMapSelection(definition) {
    if (currentOverlay) {
      currentOverlay.remove();
      currentOverlay = null;
    }

    currentOverlay = addOrienteeringMapOverlay(definition, map);
    selectedMapName = definition.map_name;
    highlightSelectedListItem();
  }

  function highlightSelectedListItem() {
    const buttons = mapSelectorList.querySelectorAll('.map-selector-item');
    buttons.forEach((button) => {
      const isSelected = button.dataset.mapName === selectedMapName;
      button.classList.toggle('selected', isSelected);
    });
  }

  mapSelectorToggle.addEventListener('click', () => {
    const willShow = !mapSelectorPanel.classList.contains('is-visible');
    setSelectorVisibility(willShow);
  });

  window.map = map;

  // **-- Location functionality --** //
  // Function to handle the location found event
  function onLocationFound(e) {
    var radius = e.accuracy / 2;

    if (typeof window.marker != "undefined") {
      window.marker.remove();
    }

    if (typeof window.locationCircle != "undefined") {
      window.locationCircle.remove();
    }

    // Add a marker at the user's location
    window.marker = L.marker(e.latlng).addTo(map);

    // Add a circle around the user's location
    window.locationCircle = L.circle(e.latlng, radius).addTo(map);

    lastKnownLocation = e.latlng;
  }

// Function to handle the location error event
  function onLocationError(e) {
    console.log("Error when receiving location: " + e.message);
  }

  function simulateLocation(lat, lon) {
    var simulatedLocation = {
      latlng: L.latLng(lat, lon),
      accuracy: 50 // Example accuracy in meters
    };
    map.fire('locationfound', simulatedLocation);
  }

  window.simulateLocation = simulateLocation;

  // Locate the user
  map.on('locationfound', onLocationFound);
  map.on('locationerror', onLocationError);

  // Request location
  map.locate({watch: true, enableHighAccuracy: true, setView: false, maxZoom: 16});

  // simulateLocation(startLatLon[0], startLatLon[1]) // Simulate GPS location, for dev environment with no GPS



  // **-- Functionality for preventing device sleep --** //
  let wakeLock = null;

  async function requestWakeLock() {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake Lock is active');
    } catch (err) {
      console.error(`${err.name}, ${err.message}`);
    }
  }

  async function releaseWakeLock() {
    if (wakeLock !== null) {
      await wakeLock.release();
      wakeLock = null;
      console.log('Wake Lock has been released');
    }
  }

  window.addEventListener('unload', (event) => {
    releaseWakeLock();
  });

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        console.log('Wake Lock is re-acquired');
      } catch (err) {
        console.error(`${err.name}, ${err.message}`);
      }
    }

    if (document.visibilityState === 'hidden') {
      try {
        releaseWakeLock();
        console.log('Releasing Wake lock due to visibility hidden');
      } catch (err) {
        console.error(`${err.name}, ${err.message}`);
      }
    }
  });



  // **-- Helper methods --** //
  function getMapCenterCoords(definition) {
    const lat = (definition.nw_coords[0] + definition.se_coords[0]) / 2;
    const lng = (definition.nw_coords[1] + definition.se_coords[1]) / 2;
    return { lat, lng };
  }

  function calculateDistanceMeters(pointA, pointB) {
    const toRad = (value) => value * Math.PI / 180;
    const earthRadius = 6371000; // meters
    const dLat = toRad(pointB.lat - pointA.lat);
    const dLon = toRad(pointB.lng - pointA.lng);
    const lat1 = toRad(pointA.lat);
    const lat2 = toRad(pointB.lat);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadius * c;
  }

  function formatDistanceLabel(distanceInMeters) {
    if (distanceInMeters === null || typeof distanceInMeters === 'undefined') {
      return 'Ukjent avstand';
    }

    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)} m`;
    }

    return `${(distanceInMeters / 1000).toFixed(1)} km`;
  }


});



