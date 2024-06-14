
let munkebotnJson = {
  "nw_coords": [
    60.4413596226974,
    5.291421604355309
  ],
  "optimal_rotation_angle": 3.225405991892112,
  "se_coords": [
    60.416058601946006,
    5.330736657405209
  ]
}

document.addEventListener("DOMContentLoaded", function() {

  var startLatLon = [60.4002, 5.3411]; // Bergen


  // Registration of hi-res map
  var exampleBoundsFrom_sumOfLeastSquares = [ [60.40908318634827, 5.335459558239961], [60.385976819472006, 5.3720671422118995 ] ];
  var mapUrl_sumOfLeastSquares_degree = `floyen_latest.png`



  var map = L.map('mapBrowser').setView(startLatLon, 15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);


  var errorOverlayUrl = 'https://cdn-icons-png.flaticon.com/512/110/110686.png';
  var altText = 'Orienteringskart Fløyen';

  var imageOverlay = L.imageOverlay(mapUrl_sumOfLeastSquares_degree, exampleBoundsFrom_sumOfLeastSquares, { // This is the one I registered with sumOfLeastSquares
    opacity: 1,
    errorOverlayUrl: errorOverlayUrl,
    alt: altText,
    interactive: true
  }).addTo(map);


  // Munkebotn data, hard-coded
  // TODO: Extract all maps to data structure later
  let nw_coords = munkebotnJson.nw_coords;
  let optimal_rotation_angle = munkebotnJson.optimal_rotation_angle;
  let se_coords = munkebotnJson.se_coords;

  let overlay_coords = [nw_coords, se_coords]
  let munkebotn_overlay_file = 'munkebotn_rotated.png'

  var secondOverlay = L.imageOverlay(munkebotn_overlay_file, overlay_coords, {
    opacity: 1,
    errorOverlayUrl: errorOverlayUrl,
    alt: altText,
    interactive: true
  }).addTo(map);



  window.map = map;
  window.imageOverlay = imageOverlay;
  window.secondOverlay = secondOverlay;

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

});



