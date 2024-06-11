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
});



