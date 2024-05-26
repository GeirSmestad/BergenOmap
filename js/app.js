document.addEventListener("DOMContentLoaded", function() {

  var modifySwCheckbox = document.getElementById('modifySwCheckbox');

  var startLatLon = [60.4002, 5.3411]; // Bergen
  //var startLatLon = [40.799311, -74.118464]; // New Jersey

  // var overlayTopleft = [40.799311, -74.118464];
  // var overlayBottomRight =[40.68202047785919, -74.33];

  var overlaySouthWest = [60.4002, 5.3411];
  var overlayNorthEast =[60.3002, 5.2411];

  var map = L.map('map').setView(startLatLon, 15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);



  var imageUrl = 'https://maps.lib.utexas.edu/maps/historical/newark_nj_1922.jpg';
  var oMapUrl= 'maps/floyen-1.JPG';
      oMapUrl= 'maps/transform.png';

  var errorOverlayUrl = 'https://cdn-icons-png.flaticon.com/512/110/110686.png';
  var altText = 'Image of Newark, N.J. in 1922. Source: The University of Texas at Austin, UT Libraries Map Collection.';
  var latLngBounds = L.latLngBounds([[40.799311, -74.118464], [40.68202047785919, -74.33]]);

  // var imageOverlay = L.imageOverlay(imageUrl, latLngBounds, {
  var imageOverlay = L.imageOverlay(oMapUrl, [overlaySouthWest, overlayNorthEast], {
    opacity: 0.6,
    errorOverlayUrl: errorOverlayUrl,
    alt: altText,
    interactive: true
  }).addTo(map);



  var isDragging = false;
  var startCoords = null;
  var xDelta = 0;
  var yDelta = 0;

  function onMouseDown(event) {
    isDragging = true;
    startCoords = event.latlng;
    console.log("Coordinates lat, lng: " + event.latlng.lat + ", " + event.latlng.lng);
  }

  function onMouseMove(event) {
    if (!isDragging) return;
    var currentCoords = event.latlng;

    var altPressed = event.altKey;

    xDelta = currentCoords.lng - startCoords.lng;
    yDelta = currentCoords.lat - startCoords.lat;
    console.log('xDelta:', xDelta, 'yDelta:', yDelta, modifySwCheckbox.checked);

    var currentBounds = imageOverlay.getBounds();

    var northWestLat = currentBounds.getNorthWest().lat;
    var northWestLng = currentBounds.getNorthWest().lng;

    var southEastLat = currentBounds.getSouthEast().lat;
    var southEastLng = currentBounds.getSouthEast().lng;

    if (modifySwCheckbox.checked) {
      imageOverlay.setBounds([[northWestLat, northWestLng], [southEastLat + yDelta, southEastLng + xDelta]]);

      startCoords.lng = currentCoords.lng;
      startCoords.lat = currentCoords.lat;

    } else {
      imageOverlay.setBounds([[northWestLat - yDelta, northWestLng - xDelta], [southEastLat - yDelta, southEastLng - xDelta]]);
    }

  }

  function onMouseUp() {
    isDragging = false;
  }

  map.on('mousedown', onMouseDown);
  map.on('mousemove', onMouseMove);
  map.on('mouseup', onMouseUp);


  function toggleMapCanBePanned() {
    if (map.dragging.enabled()) {
      map.dragging.disable();
      console.log("Dragging disabled");
    } else {
      map.dragging.enable();
      console.log("Dragging enabled");
    }
  }

  modifySwCheckbox.addEventListener('change', toggleMapCanBePanned)


  window.map = map;
  window.imageOverlay = imageOverlay;
});

// [[60.4002, 5.3411],
// [60.3002, 5.2411]]


// _northEast: Object { lat: 60.406493144255755, lng: 5.363201402282686 }
// _southWest: Object { lat: 60.38985347479142, lng: 5.345684693908729  }
