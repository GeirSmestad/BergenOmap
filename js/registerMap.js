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

  let currentLatLonIndex = 0;
  let currentXYIndex = 0;

// Example coordinate data
  const coordinates = {
    latLon: [
      { lat: 0, lon: 0 },
      { lat: 0, lon: 0 },
      { lat: 0, lon: 0 }
    ],
    xy: [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 }
    ]
  };

  const overlayView = document.getElementById('overlayView');

  overlayView.addEventListener('click', function (event) {
    const { imageX, imageY } = calculateClickedImageCoordinates(event);

    console.log(`Clicked the following underlying image coordinates: (${imageX}, ${imageY})`);

    setCurrentImageCoordinates(imageX, imageY);
    currentXYIndex = (currentXYIndex + 1) % 3;
    updateDisplay();
  });

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
      let lat = event.latlng.lat;
      let lng = event.latlng.lng;

      console.log("Coordinates lat, lng: " + lat + ", " + lng);

      setCurrentLatLng(lat, lng);

      currentLatLonIndex = (currentLatLonIndex + 1) % 3;
      updateDisplay();
    }
  }

  function setCurrentLatLng(lat, lng) {
    coordinates.latLon[currentLatLonIndex].lat = lat;
    coordinates.latLon[currentLatLonIndex].lon = lng;
  }

  function setCurrentImageCoordinates(x, y) {
    coordinates.xy[currentXYIndex].x = x;
    coordinates.xy[currentXYIndex].y = y;
  }

  map.on('mousedown', onMouseDown);
  map.on('mousemove', onMouseMove);
  map.on('mouseup', onMouseUp);


  window.map = map;
  window.overlayView = overlayView;


  // Function to determine if a coordinate should be bold
  function isBoldCondition(index, currentIndex) {
    return index === currentIndex;
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
      xyElement.textContent = `Point ${i+1} - X: ${Math.round(coordinates.xy[i].x)}, Y: ${Math.round(coordinates.xy[i].y)}`;


      if (isBoldCondition(i, currentLatLonIndex)) {
        latLonElement.style.fontWeight = 'bold';
      } else {
        latLonElement.style.fontWeight = 'normal';
      }

      if (isBoldCondition(i, currentXYIndex)) {
        xyElement.style.fontWeight = 'bold';
      } else {
        xyElement.style.fontWeight = 'normal';
      }
    }
  }

  // Event listener for the button
  document.getElementById('processButton').addEventListener('click', () => {

    let image = document.getElementById('overlayView');

    // Example input parameters
    // const imageCoords = [[238, 1337.7], [844, 319.7], [414, 403.7]];
    // const realCoords = [[60.39113388285876, 5.3435611724853525], [60.40450336375729, 5.357653498649598], [60.40313627352001, 5.346728861331941]];

    const imageCoords = coordinates.xy.map(coord => [coord.x, coord.y]);
    const realCoords = coordinates.latLon.map(coord => [coord.lat, coord.lon]);

    const overlayWidth = image.naturalWidth;
    const overlayHeight = image.naturalHeight;

    console.log(imageCoords)
    console.log(realCoords)
    console.log(overlayWidth)
    console.log(overlayHeight)

    // Construct the payload
    const payload = {
      image_coords: imageCoords,
      real_coords: realCoords,
      overlayWidth: overlayWidth,
      overlayHeight: overlayHeight
    };

    // Make the POST request
    fetch("http://127.0.0.1:5000/getOverlayCoordinates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then(response => response.json())
      .then(data => {
        // Print the output in the textarea
        document.getElementById("output").value = JSON.stringify(data, null, 2);
      })
      .catch(error => {
        console.error("Error:", error);
        document.getElementById("output").value = "An error occurred: " + error;
      });
  });

  // Initial display update
  updateDisplay();


});



