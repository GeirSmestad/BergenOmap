

//let mapBorder = 150;
let mapBorder = 444;

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


  window.map = map;
  window.imageOverlay = imageOverlay;



});



