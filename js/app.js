

let mapBorder = 150;

document.addEventListener("DOMContentLoaded", function() {

  const sliderAngle = document.getElementById('slider');
  const sliderValue = document.getElementById('sliderValue');

  sliderAngle.addEventListener('input', function() {
    sliderValue.textContent = sliderAngle.value;
    redrawMapWithNewRotation();
  });

  var modifySwCheckbox = document.getElementById('modifySwCheckbox');

  var startLatLon = [60.4002, 5.3411]; // Bergen


  var mapRatio = 1409.0 / 1025.0;

  /* Rimelige start-dimensjoner for floyen-1-JPG:
     Rotasjon 3,5 grader
     Nord-østlig hjørne: [60.40861257945189, 5.369401050315699 ]
     Sør-vestlig hjørne: [60.3878224489127, 5.335141760995066 ] */

  var overlayNorthWest = [60.41162, 5.31789];

  var A4PortraitMapBounds = getBoundsForA4Sheet(startLatLon, 7500, true);

  var overlaySouthEast = A4PortraitMapBounds[1];

  console.log(overlaySouthEast)

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
      let boundsAfterResizing = resizeBounds(currentBounds, xDelta * 200);
      imageOverlay.setBounds(boundsAfterResizing);

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
  window.mapRatio = mapRatio;

  // for (var angle = -3 ; angle >= 3 ; angle += 1) {
  //   fetchAndCacheImage(`http://127.0.0.1:5000/transform?angle=${angle}&border=${mapBorder}`);
  // }
});



// [[60.4002, 5.3411],
// [60.3002, 5.2411]]


// _northEast: Object { lat: 60.406493144255755, lng: 5.363201402282686 }
// _southWest: Object { lat: 60.38985347479142, lng: 5.345684693908729  }

// *** Helper functions below *** //

function getBoundsForA4Sheet(northWestCornerLatLng, scale=7500, portraitOrientation=true) {
  let mapRangeX, mapRangeY;

  if (portraitOrientation) {
    mapRangeX = scale * A4SheetShortSideInMeters;
    mapRangeY = scale * A4SheetLongSideInMeters;
  }
  else {
    mapRangeX = scale * A4SheetLongSideInMeters;
    mapRangeY = scale * A4SheetShortSideInMeters;
  }

  return getBoundsForAreaOfSpecifiedDimensions(northWestCornerLatLng, mapRangeX, mapRangeY);
}

function getBoundsForAreaOfSpecifiedDimensions(northWestCornerLatLng, x_in_meters, y_in_meters) {
  let nw_lat = northWestCornerLatLng[0]
  let nw_lon = northWestCornerLatLng[1]

  // metersPerDegreeOfLatitude = meter / latitude <=> latitude = meters / metersPerDegreeOfLatitude

  degreesLat = y_in_meters / metersPerDegreeOfLatitude();
  degreesLon = x_in_meters / metersPerDegreeOfLongitude(nw_lat);

  return [northWestCornerLatLng, [ nw_lat - degreesLat, nw_lon + degreesLon ]];
}

function metersPerDegreeOfLongitude(latitude) {
  // Earth's equatorial radius in kilometers
  const equatorialRadius = 6378.137;

  // Convert latitude to radians
  const latitudeInRadians = latitude * (Math.PI / 180);

  // Calculate the distance in kilometers
  const distanceKm = (Math.PI / 180) * equatorialRadius * Math.cos(latitudeInRadians);

  // Convert distance from kilometers to meters
  const distanceMeters = distanceKm * 1000;

  return distanceMeters;
}

function metersPerDegreeOfLatitude() {
  return 111111.0;
}

const A4SheetLongSideInMeters = 0.297;
const A4SheetShortSideInMeters = 0.210;

function getMapDimensionRatio(imageOverlay) {
  let image = imageOverlay.getElement();
  return image.height / image.width;
}

function resizeBounds(bounds, percentToResize) {
  var northWestLat = bounds.getNorthWest().lat;
  var northWestLng = bounds.getNorthWest().lng;

  var southEastLat = bounds.getSouthEast().lat;
  var southEastLng = bounds.getSouthEast().lng;

  let latDim = northWestLat - southEastLat;
  let lngDim = southEastLng - northWestLng;

  let latDelta = latDim * (percentToResize/100.0);
  let lngDelta = lngDim * (percentToResize/100.0);

  var newNorthWestBounds = [northWestLat + latDelta/2.0, northWestLng - lngDelta/2.0]
  var newSouthEastBounds = [southEastLat - latDelta/2.0, southEastLng + lngDelta/2.0]

  return [newNorthWestBounds, newSouthEastBounds]
}

for (var angle = -3 ; angle <= 3 ; angle += 0.5) {
 //fetchImage(`http://127.0.0.1:5000/transform?angle=${angle}&border=${mapBorder}`);
}

