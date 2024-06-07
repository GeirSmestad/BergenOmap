

let mapBorder = 150;

document.addEventListener("DOMContentLoaded", function() {

  const sliderAngle = document.getElementById('slider');
  const sliderValue = document.getElementById('sliderValue');

  const mapOverlay = document.getElementById('mapOverlay');

  sliderAngle.addEventListener('input', function () {
    sliderValue.textContent = sliderAngle.value;
    redrawMapWithNewRotation();
  });

  mapOverlay.addEventListener('click', function (event) {
    const img = event.target;
    const rect = img.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    console.log(`Clicked the following image coordinates: (${x}, ${y})`);
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

  var exampleBoundsFrom_calculateOverlayCorners = [ [60.40839001779908, 5.336567010606788], [60.3867327256796, 5.37101780796403 ] ];
  var mapUrl_3point5_degrees = `http://127.0.0.1:5000/transform?angle=3.5&border=${mapBorder}`


  // Perfect registration from manual run of algorithm
  var exampleBoundsFrom_sumOfLeastSquares = [ [60.4084547606827, 5.336732978048699], [60.38669932288318, 5.3707923558515445 ] ];
  var mapUrl_sumOfLeastSquares_degree = `http://127.0.0.1:5000/transform?angle=3.2&border=${mapBorder}`

  // Registration from implemented algorithm with numpy optimization
  exampleBoundsFrom_sumOfLeastSquares = [ [60.408453197075374, 5.33672273548746], [60.386702210919736, 5.370807726626327 ] ];
  mapUrl_sumOfLeastSquares_degree = `http://127.0.0.1:5000/transform?angle=3.22247&border=${mapBorder}`

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
  //var imageOverlay = L.imageOverlay(oMapUrl, [overlayNorthWest, overlaySouthEast], {
  //var imageOverlay = L.imageOverlay(mapUrl_3point5_degrees, exampleBoundsFrom_calculateOverlayCorners, { // This is the one I registered manually!
  var imageOverlay = L.imageOverlay(mapUrl_sumOfLeastSquares_degree, exampleBoundsFrom_sumOfLeastSquares, { // This is the one I registered with sumOfLeastSquares
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


  /*

   Krysset i Ole Irgens vei, ned til venstre


Clicked the following image coordinates: (269, 1361.6999969482422) app.js:23:13
Coordinates lat, lng: 60.39113388285876, 5.3435611724853525
[269, 1361.6999969482422], [60.39113388285876, 5.3435611724853525]

Sør i Storediket:


Clicked the following image coordinates: (811, 306.70001220703125)
Coordinates lat, lng: 60.40450336375729, 5.357653498649598 app.js:92:13
[811, 306.70001220703125], [60.40450336375729, 5.357653498649598]

Vestlige hushjørne på Åsebu:


Clicked the following image coordinates: (387, 418.70001220703125)
Coordinates lat, lng: 60.40313627352001, 5.346728861331941 app.js:97:13
[387, 418.70001220703125], [60.40313627352001, 5.346728861331941]

width,height=( 1325 , 1709 )




Resulterer i:

calculateOverlayCorners(269, 1361.6999969482422, 60.39113388285876, 5.3435611724853525, 811, 306.70001220703125, 60.40450336375729, 5.357653498649598, 1325 , 1709)
Object { lat_nw: 60.40839001779908, lon_nw: 5.336567010606788, lat_se: 60.3867327256796, lon_se: 5.37101780796403 }
Dette tilsvarer bounds = [ [60.40839001779908, 5.336567010606788], [60.3867327256796, 5.37101780796403 ] ]


   */

});


// *** Helper functions below *** //

/* (x1, y1), (x2, y2) are pixel coordinates of two chosen points on an orienteering map image.
   (lat1, lon1), (lat2, lon2) are the map coordinates corresponding to these points.
   width and height are the dimensions of the orienteering map image.

   Returns the map coordinates of the northwest and southeast corners the overlay should be placed at.
 */
function calculateOverlayCorners(x1, y1, lat1, lon1, x2, y2, lat2, lon2, width, height) {
  // Calculate the scale factors
  let scaleLat = (lat2 - lat1) / (y2 - y1);
  let scaleLon = (lon2 - lon1) / (x2 - x1);

  // Calculate the north-west corner coordinates
  let lat_nw = lat1 - y1 * scaleLat;
  let lon_nw = lon1 - x1 * scaleLon;

  // Calculate the south-east corner coordinates
  let lat_se = lat1 + (height - y1) * scaleLat;
  let lon_se = lon1 + (width - x1) * scaleLon;

  return {
    lat_nw: lat_nw,
    lon_nw: lon_nw,
    lat_se: lat_se,
    lon_se: lon_se
  };
}

  function getBoundsForA4Sheet(northWestCornerLatLng, scale = 7500, portraitOrientation = true) {
    let mapRangeX, mapRangeY;

    if (portraitOrientation) {
      mapRangeX = scale * A4SheetShortSideInMeters;
      mapRangeY = scale * A4SheetLongSideInMeters;
    } else {
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

    return [northWestCornerLatLng, [nw_lat - degreesLat, nw_lon + degreesLon]];
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

    let latDelta = latDim * (percentToResize / 100.0);
    let lngDelta = lngDim * (percentToResize / 100.0);

    var newNorthWestBounds = [northWestLat + latDelta / 2.0, northWestLng - lngDelta / 2.0]
    var newSouthEastBounds = [southEastLat - latDelta / 2.0, southEastLng + lngDelta / 2.0]

    return [newNorthWestBounds, newSouthEastBounds]
  }

  for (var angle = -3; angle <= 3; angle += 0.5) {
    //fetchImage(`http://127.0.0.1:5000/transform?angle=${angle}&border=${mapBorder}`);
  }

