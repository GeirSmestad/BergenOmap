const isLocal =
window.location.hostname === 'localhost' ||
window.location.hostname === '127.0.0.1' ||
window.location.hostname === '';

const API_BASE = isLocal ? 'http://127.0.0.1:5000' : '';  // '' = same origin in prod

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



document.addEventListener("DOMContentLoaded", function () {

  //var startLatLon = [60.4002, 5.3411]; // Bergen
  var startLatLon =[60.3368, 5.33669] // Sør i Bergensdalen 

  window.droppedImage = null

  let currentLatLonIndex = 0;
  let currentXYIndex = 0;

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

  let registrationPreviewData = {
    preview : null,
    showOverlayPreview : false,
    currentRegistrationData : {},
    currentOverlayImageUrl : null
  };

  const overlayView = document.getElementById('overlayView');

  overlayView.addEventListener('click', function (event) {
    const { imageX, imageY } = calculateClickedImageCoordinates(event);

    setCurrentImageCoordinates(imageX, imageY);
    currentXYIndex = (currentXYIndex + 1) % 3;
    updateDisplay();
  });

  const map = L.map('registrationMapBrowser').setView(startLatLon, 10);

  const rasterTileLayer = L.tileLayer('https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="http://www.kartverket.no/">Kartverket</a>'
  });

  const aerialTileLayer = L.tileLayer(
    'https://opencache{s}.statkart.no/gatekeeper/gk/gk.open_nib_web_mercator_wmts_v2' +
    '?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
    '&LAYER=Nibcache_web_mercator_v2' +
    '&STYLE=default' +
    '&FORMAT=image/jpgpng' +
    '&tileMatrixSet=default028mm' +
    '&tileMatrix={z}&tileRow={y}&tileCol={x}', {
      subdomains: ['', '2', '3'],
      attribution: '© Norge i bilder / Kartverket, Geovekst m.fl.',
      maxZoom: 19
    });

  let isAerialBasemapActive = false;
  const basemapToggleButton = document.getElementById('basemapToggleButton');

  const updateBasemapToggleLabel = () => {
    if (!basemapToggleButton) {
      return;
    }

    basemapToggleButton.textContent = isAerialBasemapActive ? 'Raster map' : 'Aerial map';
  };

  rasterTileLayer.addTo(map);
  updateBasemapToggleLabel();

  function toggleBasemap() {
    const layerToRemove = isAerialBasemapActive ? aerialTileLayer : rasterTileLayer;
    const layerToAdd = isAerialBasemapActive ? rasterTileLayer : aerialTileLayer;

    if (map.hasLayer(layerToRemove)) {
      map.removeLayer(layerToRemove);
    }

    if (!map.hasLayer(layerToAdd)) {
      layerToAdd.addTo(map);
    }

    isAerialBasemapActive = !isAerialBasemapActive;
    updateBasemapToggleLabel();
  }

  if (basemapToggleButton) {
    basemapToggleButton.addEventListener('click', toggleBasemap);
  }


  window.addEventListener('resize', () => {
    // Leaflet must be notified to redraw when the window is resized
    map.invalidateSize();
  });

  if (overlayView) {
    overlayView.addEventListener('load', () => {
      // An implicit resize of the map happens when a new overlay is loaded, of which Leaflet must be notified
      map.invalidateSize();
    });
  }
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


  function getRegistrationMetadata() {
    return {
      map_name: document.getElementById("mapName").value,
      map_filename: document.getElementById("filename").value,
      attribution: document.getElementById("attribution").value,
      map_area: document.getElementById("mapArea").value,
      map_event: document.getElementById("mapEvent").value,
      map_date: document.getElementById("mapDate").value,
      map_course: document.getElementById("mapCourse").value,
      map_club: document.getElementById("mapClub").value,
      map_course_planner: document.getElementById("mapCoursePlanner").value,
      map_attribution: document.getElementById("mapAttribution").value
    };
  }

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

      latLonElement.textContent = `Point ${i + 1} - Lat: ${roundToFiveDecimals(coordinates.latLon[i].lat)}, Lon: ${roundToFiveDecimals(coordinates.latLon[i].lon)}`;
      xyElement.textContent = `Point ${i + 1} - X: ${Math.round(coordinates.xy[i].x)}, Y: ${Math.round(coordinates.xy[i].y)}`;


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

  /* When the process button is presesd, do the following:
     1. Send the user's registration data to the server
     2. Receive a JSON of the correct map registration in response
     3. Output this JSON in a textarea so the user can copy it
     4. Send the original input image to the server to be bordered and rotated in accordance with the calculated declination
     5. The server may do additional things at this point; store the image and registration data in a database, for instance
     6. The bordered and rotated result image is placed in an output <img> tag, for easy access.
  */
  document.getElementById('processButton').addEventListener('click', () => {

    let image = document.getElementById('overlayView');

    // Example input parameters
    // const imageCoords = [[238, 1337.7], [844, 319.7], [414, 403.7]];
    // const realCoords = [[60.39113388285876, 5.3435611724853525], [60.40450336375729, 5.357653498649598], [60.40313627352001, 5.346728861331941]];

    // Pixel coordinates are whole numbers, 6 decimal spaces yields <0.1 meter accuracy.
    const imageCoords = coordinates.xy.map(coord => [Math.round(coord.x), Math.round(coord.y)]);
    const realCoords = coordinates.latLon.map(coord => [parseFloat(coord.lat.toFixed(6)), parseFloat(coord.lon.toFixed(6))]);

    const overlayWidth = image.naturalWidth;
    const overlayHeight = image.naturalHeight;

    const payload = {
      image_coords: imageCoords,
      real_coords: realCoords,
      overlayWidth: overlayWidth,
      overlayHeight: overlayHeight
    };


    fetch(`${API_BASE}/api/getOverlayCoordinates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then(response => response.json())
      .then(data => {
        
        const metadata = getRegistrationMetadata();
        Object.assign(data, metadata);
        registrationPreviewData.currentRegistrationData = data;
//
    
        // Print image registration data in text area
        document.getElementById("output").value = JSON.stringify(data, null, 2);
    
        const imageFile = window.droppedImage;
            
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("imageRegistrationData", JSON.stringify(data));
    
        // Send original dropped image and data about its calculated placement to the server for transformation and storage
        fetch(`${API_BASE}/api/transformAndStoreMapData`, {
          method: "POST",
          body: formData
        })
          .then(response => response.blob())
          .then(blob => {
            const url = URL.createObjectURL(blob);
            document.getElementById("outputImage").src = url;

            registrationPreviewData.currentOverlayImageUrl = url;
          })
      })
      .catch(error => {
        console.error("Error:", error);
        document.getElementById("output").value = "An error occurred: " + error;
      });
  });

  // Initial display update
  updateDisplay();



  // **-- Functionality to allow dragging-and-dropping input images --** //
  const dropArea = document.getElementById('drop-area');
  const preview = document.getElementById('preview');
  const dimensions = document.getElementById('dimensions');

  // Prevent default drag behaviors
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false)
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Highlight drop area when item is dragged over it
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false)
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false)
  });

  // Handle dropped files
  dropArea.addEventListener('drop', handleDrop, false);

  async function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    await handleFiles(files);
  }

  async function handleFiles(files) {
    const file = files[0];
    if (!file) {
      return;
    }

    if (file.type === 'application/pdf') {
      try {
        const convertedFile = await convertPdfFileToImage(file);
        processImageFile(convertedFile);
      } catch (error) {
        console.error('Error converting PDF to image:', error);
        alert('Unable to convert PDF to image. Please try another file.');
      }
      return;
    }

    if (file.type.startsWith('image/')) {
      processImageFile(file);
    } else {
      alert('Please drop an image or PDF file.');
    }
  }

  async function convertPdfFileToImage(pdfFile) {
    const formData = new FormData();
    formData.append('file', pdfFile);

    const response = await fetch(`${API_BASE}/api/convertPdfToImage`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`PDF conversion failed with status ${response.status}`);
    }

    const blob = await response.blob();
    const pngName = pdfFile.name.replace(/\.pdf$/i, '.png');
    return new File([blob], pngName, { type: 'image/png' });
  }

  function processImageFile(imageFile) {
    window.droppedImage = imageFile; // Store image for later use

    // Pre-populate fields with filename on drop, unless the user already typed something
    const filename = imageFile.name || '';
    const mapNameInput = document.getElementById('mapName');
    const filenameInput = document.getElementById('filename');

    if (mapNameInput && mapNameInput.value.trim() === '') {
      mapNameInput.value = filename;
    }

    if (filenameInput && filenameInput.value.trim() === '') {
      filenameInput.value = filename;
    }

    uploadAndPreviewImage(imageFile);
  }

  function uploadAndPreviewImage(imageFile) {
    const formData = new FormData();
    formData.append('file', imageFile);

    fetch(`${API_BASE}/api/processDroppedImage`, {
      method: 'POST',
      body: formData
    })
      .then(response => response.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        overlayView.src = url;
      })
      .catch(error => console.error('Error:', error));
  }





  // **-- Functionality for handling additional feature buttons  --**

// To be used to display registration preview; identical to function in the main map view.
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
    alt: '',
    interactive: true
  }).addTo(map);
}

  let toggleDisplayRegistrationPreview = function() {
    let previewRegistrationJson = {
      nw_coords : registrationPreviewData.currentRegistrationData.nw_coords,
      se_coords : registrationPreviewData.currentRegistrationData.se_coords,
      map_filename : registrationPreviewData.currentOverlayImageUrl
    };


    if (registrationPreviewData.showOverlayPreview) {
      if (registrationPreviewData.preview != null) {
        registrationPreviewData.preview.remove()
      }
      registrationPreviewData.showOverlayPreview = false;
    }
    else {
      if (registrationPreviewData.preview != null) {
        registrationPreviewData.preview.remove()
      }
      registrationPreviewData.preview = addOrienteeringMapOverlay(previewRegistrationJson, map);
      registrationPreviewData.preview.setOpacity(0.35)
      
      registrationPreviewData.showOverlayPreview = true;

      window.registrationPreviewData = registrationPreviewData;

      console.log("Showing preview with NW=" + registrationPreviewData.currentRegistrationData.nw_coords + " and SE=" + registrationPreviewData.currentRegistrationData.se_coords)
    }

  }

  document.getElementById('registrationPreviewButton').addEventListener('click', toggleDisplayRegistrationPreview);
  


  document.getElementById('outputDatabaseButton').addEventListener('click', async () => {
    const url = `${API_BASE}/api/dal/export_database`;
    const payload = {
        include_original: true,
        overwrite: true
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Success:', data);
    } catch (error) {
        console.error('Error:', error);
    }
  });


  /// Helper function to register an image from the posted JSON and not clicked coordinates
  document.getElementById('registerFromJsonButton').addEventListener('click', () => {
    pastedJson = JSON.parse(document.getElementById("output").value);

    const imageCoords = pastedJson["selected_pixel_coords"]
    const realCoords = pastedJson["selected_realworld_coords"]
    const overlayWidth = pastedJson["overlay_width"]
    const overlayHeight = pastedJson["overlay_height"]

    const payload = {
      image_coords: imageCoords,
      real_coords: realCoords,
      overlayWidth: overlayWidth,
      overlayHeight: overlayHeight,
    };

    fetch(`${API_BASE}/api/getOverlayCoordinates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then(response => response.json())
      .then(data => {
        
        payload.optimal_rotation_angle = data["optimal_rotation_angle"]
        registrationPreviewData.currentRegistrationData = data;
        console.log("getOverlayCoordinates returned with response: ", data, " and payload is now ", payload)
        
        // Print image registration data in text area
        document.getElementById("output").value = JSON.stringify(data, null, 2);
      }).then(() => {

        const imageFile = window.droppedImage;
    
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("imageRegistrationData", JSON.stringify(payload));

        // Send original dropped image and data about its calculated placement to the server for transformation
        fetch(`${API_BASE}/api/transformMap`, {
          method: "POST",
          body: formData
        })
          .then(response => response.blob())
          .then(blob => {
            const url = URL.createObjectURL(blob);
            document.getElementById("outputImage").src = url;

            registrationPreviewData.currentOverlayImageUrl = url;
          })


  });
  });
  




});