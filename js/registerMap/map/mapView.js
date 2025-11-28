import { DEFAULT_MAP_ZOOM, START_LAT_LON } from '../config.js';

export function createMapView({
  coordinateStore,
  basemapToggleButton
}) {
  const map = L.map('registrationMapBrowser').setView(START_LAT_LON, DEFAULT_MAP_ZOOM);

  const rasterTileLayer = L.tileLayer(
    'https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png',
    {
      maxZoom: 18,
      attribution: '&copy; <a href="http://www.kartverket.no/">Kartverket</a>'
    }
  );

  const aerialTileLayer = L.tileLayer(
    'https://opencache{s}.statkart.no/gatekeeper/gk/gk.open_nib_web_mercator_wmts_v2' +
    '?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
    '&LAYER=Nibcache_web_mercator_v2' +
    '&STYLE=default' +
    '&FORMAT=image/jpgpng' +
    '&tileMatrixSet=default028mm' +
    '&tileMatrix={z}&tileRow={y}&tileCol={x}',
    {
      subdomains: ['', '2', '3'],
      attribution: '© Norge i bilder / Kartverket, Geovekst m.fl.',
      maxZoom: 19
    }
  );

  let isAerialBasemapActive = false;

  const updateBasemapToggleLabel = () => {
    if (!basemapToggleButton) {
      return;
    }

    basemapToggleButton.textContent = isAerialBasemapActive ? 'Raster map' : 'Aerial map';
  };

  const toggleBasemap = () => {
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
  };

  rasterTileLayer.addTo(map);
  updateBasemapToggleLabel();

  if (basemapToggleButton) {
    basemapToggleButton.addEventListener('click', toggleBasemap);
  }

  window.addEventListener('resize', () => map.invalidateSize());

  let isDragging = false;

  map.on('mousedown', () => {
    isDragging = false;
  });

  map.on('mousemove', () => {
    isDragging = true;
  });

  map.on('mouseup', (event) => {
    if (isDragging) {
      return;
    }

    const { lat, lng } = event.latlng;
    coordinateStore.recordLatLng(lat, lng);
  });

  return {
    map,
    toggleBasemap
  };
}

