let mapBorder = 300;

document.addEventListener("DOMContentLoaded", function() {

  const sliderAngle = document.getElementById('slider');
  const sliderValue = document.getElementById('sliderValue');

  sliderAngle.addEventListener('input', function() {
    sliderValue.textContent = sliderAngle.value;
    redrawMapWithNewRotation();
  });

  var modifySwCheckbox = document.getElementById('modifySwCheckbox');


  var startLatLon = [60.4002, 5.3411]; // Bergen

  // var overlaySouthWest = [60.4002, 5.3411];
  // var overlayNorthEast =[60.3002, 5.2411];

  var overlayNorthWest = [60.4002, 5.2411];
  var overlaySouthEast =[60.3002, 5.3411];

  var map = L.map('map').setView(startLatLon, 15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  // var oMapUrl= 'maps/floyen-1.JPG';
  let oMapUrl = `http://127.0.0.1:5000/transform?angle=0&border=${mapBorder}`

  var errorOverlayUrl = 'https://cdn-icons-png.flaticon.com/512/110/110686.png';
  var altText = 'Image of Newark, N.J. in 1922. Source: The University of Texas at Austin, UT Libraries Map Collection.';
  var latLngBounds = L.latLngBounds([[40.799311, -74.118464], [40.68202047785919, -74.33]]);

  console.log(`Redrawing at ${overlayNorthWest} / ${overlaySouthEast}`)

  // var imageOverlay = L.imageOverlay(imageUrl, latLngBounds, {
  var imageOverlay = L.imageOverlay(oMapUrl, [overlayNorthWest, overlaySouthEast], {
    opacity: 0.6,
    errorOverlayUrl: errorOverlayUrl,
    alt: altText,
    interactive: true
  }).addTo(map);


  function redrawMapWithNewRotation() {
    imageOverlay.remove();

    let rotatedMapUrl = `http://127.0.0.1:5000/transform?angle=${sliderAngle.value}&border=${mapBorder}`;

    console.log(`Redrawing at ${overlayNorthWest} / ${overlaySouthEast}`)

    imageOverlay = L.imageOverlay(rotatedMapUrl, [overlayNorthWest, overlaySouthEast], {
      opacity: 0.6,
      errorOverlayUrl: errorOverlayUrl,
      alt: altText,
      interactive: true
    }).addTo(map);
  }


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

      overlayNorthWest = [northWestLat, northWestLng];
      overlaySouthEast = [southEastLat, southEastLng];
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


  for (var angle = -3 ; angle >= 3 ; angle += 1) {
    fetchAndCacheImage(`http://127.0.0.1:5000/transform?angle=${angle}&border=${mapBorder}`);
  }
});



// [[60.4002, 5.3411],
// [60.3002, 5.2411]]


// _northEast: Object { lat: 60.406493144255755, lng: 5.363201402282686 }
// _southWest: Object { lat: 60.38985347479142, lng: 5.345684693908729  }



// TODO Geir: This doesn't seem to work; might as well remove it.
async function fetchAndCacheImage(url) {
  try {
    console.log("Fetching " + url);
    const response = await fetch(url, { mode: 'no-cors' }); // 'no-cors' mode can be used if dealing with CORS issues
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const blob = await response.blob();

    // Create an object URL but don't use it
    const objectURL = URL.createObjectURL(blob);
    // You can revoke the object URL immediately if you don't need to use it
    URL.revokeObjectURL(objectURL);
  } catch (error) {
    console.error('Failed to fetch image:', error);
  }
}

for (var angle = -3 ; angle <= 3 ; angle += 0.5) {
 //fetchAndCacheImage(`http://127.0.0.1:5000/transform?angle=${angle}&border=${mapBorder}`);
}

