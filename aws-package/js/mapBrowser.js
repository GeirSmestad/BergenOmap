const mapDefinitions = [
  {
    "nw_coords": [
      60.4413596226974,
      5.291421604355309
    ],
    "optimal_rotation_angle": 3.225405991892112,
    "se_coords": [
      60.416058601946006,
      5.330736657405209
    ],
    "map_filename": "munkebotn_rotated.png"
  },
  {
    "nw_coords": [
      60.40908318634827,
      5.335459558239961
    ],
    "optimal_rotation_angle": 3.22247,
    "se_coords": [
      60.385976819472006,
      5.3720671422118995
    ],
    "map_filename": "floyen_latest.png"
  },
  {
    "nw_coords": [
      60.45973869078658,
      5.296984088280552
    ],
    "optimal_rotation_angle": 3.2092814761001986,
    "se_coords": [
      60.442877100508994,
      5.323230560339303
    ],
    "map_filename": "2024-astveitskogen-tur-o-rotated.png"
  },
  {
    "nw_coords": [
      60.31601104308776,
      5.233903081840795
    ],
    "optimal_rotation_angle": -1.2694235223329742,
    "se_coords": [
      60.291277752554805,
      5.2719673393763
    ],
    "map_filename": "kokstad-2024-rotated.png"
  }
];

var errorOverlayUrl = 'https://cdn-icons-png.flaticon.com/512/110/110686.png';
const placeholderOverlayFile = 'placeholder.webp';

/// Adds a map overlay to the map. Returns the overlay ImageOverlay object that was just added.
function addOrienteeringMapOverlay(jsonDefinition, map, usePlaceholder=false) {
  let nw_coords = jsonDefinition.nw_coords;
  let se_coords = jsonDefinition.se_coords;

  let overlay_coords = [nw_coords, se_coords]
  let overlay_file = jsonDefinition.map_filename;

  if (usePlaceholder) {
    overlay_file = placeholderOverlayFile;
  }

  return L.imageOverlay(overlay_file, overlay_coords, {
    opacity: 1,
    errorOverlayUrl: errorOverlayUrl,
    alt: '',
    interactive: true
  }).addTo(map);
}

document.addEventListener("DOMContentLoaded", function() {


  var startLatLon = [60.4002, 5.3411]; // Bergen
  
  const urlParams = new URLSearchParams(window.location.search);
  const mamsPaps = urlParams.get('MamsPaps');

  if (mamsPaps !== "true") {
    mapDefinitions.splice(2, 1); // Remove offending map
  }

  requestWakeLock();

  const allMapOverlays = [];

  var map = L.map('mapBrowser').setView(startLatLon, 15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);


  // Add all overlays in mapDefinitions to main map, but only placeholders at first. 'click' event
  // handler replaces the placeholder map with the actual map, only using bandwidth for the maps
  // that are requested.
  for (let i = 0 ; i < mapDefinitions.length; i++) {
    let placeholderOverlay = addOrienteeringMapOverlay(mapDefinitions[i], map, true);
    allMapOverlays.push(placeholderOverlay);

    let replacePlaceholderOverlayWithActualMap = function() {
      placeholderOverlay.remove();

      let actualMapOverlay = addOrienteeringMapOverlay(mapDefinitions[i], map);
      replaceAtIndex(allMapOverlays, i, actualMapOverlay);
    }

    placeholderOverlay.addEventListener('click', replacePlaceholderOverlayWithActualMap);
  }

  window.map = map;
  window.allMapOverlays = allMapOverlays;

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

  // simulateLocation(startLatLon[0], startLatLon[1])





  // **-- Functionality for preventing device sleep --** //
  // Request that device does not go to sleep
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
  function replaceAtIndex(array, index, newValue) {
    if (index >= 0 && index < array.length) {
      array[index] = newValue;
    } else {
      console.error('Index out of bounds');
    }
  }

});



