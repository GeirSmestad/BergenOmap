function calculateClickedImageCoordinates(event) {
  const img = event.target;

  // Get the actual dimensions of the image
  const naturalWidth = img.naturalWidth;
  const naturalHeight = img.naturalHeight;

  // Get the displayed dimensions of the image
  const rect = img.getBoundingClientRect();
  const displayedWidth = rect.width;
  const displayedHeight = rect.height;

  // Calculate the scale factors
  const scaleX = naturalWidth / displayedWidth;
  const scaleY = naturalHeight / displayedHeight;

  // Calculate the clicked coordinates in the displayed image
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // Calculate the clicked coordinates in the actual image
  const imageX = x * scaleX;
  const imageY = y * scaleY;

  return { imageX, imageY };
}

document.addEventListener("DOMContentLoaded", function() {

  var startLatLon = [60.4002, 5.3411]; // Bergen

  const overlayView = document.getElementById('overlayView');

  overlayView.addEventListener('click', function (event) {
    const { imageX, imageY } = calculateClickedImageCoordinates(event);

    console.log(`Clicked the following underlying image coordinates: (${imageX}, ${imageY})`);
  });


  // Registration of hi-res map
  var exampleBoundsFrom_sumOfLeastSquares = [ [60.40908318634827, 5.335459558239961], [60.385976819472006, 5.3720671422118995 ] ];
  var mapUrl_sumOfLeastSquares_degree = `http://127.0.0.1:5000/transform?angle=3.1975163&border=444`

  var map = L.map('registrationMapBrowser').setView(startLatLon, 15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);


  let isDragging = false;

  function onMouseDown() {
    isDragging = false;
  }

  function onMouseMove(event) {
    isDragging = true;
  }

  function onMouseUp(event) {
    if (!isDragging) {
      console.log("Coordinates lat, lng: " + event.latlng.lat + ", " + event.latlng.lng);
    }
  }

  map.on('mousedown', onMouseDown);
  map.on('mousemove', onMouseMove);
  map.on('mouseup', onMouseUp);


  window.map = map;
  window.overlayView = overlayView;


  // Example coordinate data
  const coordinates = {
    latLon: [
      { lat: 40.7128, lon: -74.0060 },
      { lat: 34.0522, lon: -118.2437 },
      { lat: 51.5074, lon: -0.1278 }
    ],
    xy: [
      { x: 100, y: 200 },
      { x: 150, y: 250 },
      { x: 200, y: 300 }
    ]
  };

  // Function to determine if a coordinate should be bold
  function isBoldCondition(index) {
    // Example condition: make the first coordinate bold
    return index === 0;
  }

  function roundToFiveDecimals(num) {
    return Math.round(num * 100000) / 100000;
  }

  // Function to update the display
  function updateDisplay() {
    for (let i = 0; i < 3; i++) {
      const latLonElement = document.getElementById(`latLon${i + 1}`);
      const xyElement = document.getElementById(`xy${i + 1}`);

      latLonElement.textContent = `Point ${i+1} - Lat: ${roundToFiveDecimals(coordinates.latLon[i].lat)}, Lon: ${roundToFiveDecimals(coordinates.latLon[i].lon)}`;
      xyElement.textContent = `Point ${i+1} - X: ${roundToFiveDecimals(coordinates.xy[i].x)}, Y: ${roundToFiveDecimals(coordinates.xy[i].y)}`;

      if (isBoldCondition(i)) {
        latLonElement.style.fontWeight = 'bold';
        xyElement.style.fontWeight = 'bold';
      } else {
        latLonElement.style.fontWeight = 'normal';
        xyElement.style.fontWeight = 'normal';
      }
    }
  }

  // Event listener for the button
  document.getElementById('processButton').addEventListener('click', () => {
    const output = document.getElementById('output');
    output.value = JSON.stringify(coordinates, null, 2);
  });

  // Initial display update
  updateDisplay();


});



