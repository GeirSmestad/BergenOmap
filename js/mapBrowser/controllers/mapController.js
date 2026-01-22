import {
  API_BASE,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  ERROR_OVERLAY_URL,
  TILE_LAYER_CONFIG
} from '../config.js';

export function createMapController({
  elementId = 'mapBrowser',
  store,
  onViewportMoved,
  mapOptions = {}
} = {}) {
  if (typeof L === 'undefined') {
    throw new Error('Leaflet is required for mapController');
  }

  const defaultMapOptions = {
    // We need this to reliably set non-integer zoom levels for scale-accurate fixed zoom.
    zoomSnap: 0
  };

  const map = L.map(elementId, { ...defaultMapOptions, ...mapOptions })
    .setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);

  L.tileLayer(TILE_LAYER_CONFIG.url, TILE_LAYER_CONFIG.options).addTo(map);

  if (store) {
    map.once('mousedown', () => store.setUserHasInteractedWithMap(true));
    map.once('touchstart', () => store.setUserHasInteractedWithMap(true));
    map.once('movestart', () => store.setUserHasInteractedWithMap(true));
  }

  if (typeof onViewportMoved === 'function') {
    map.on('moveend', () => {
      onViewportMoved(map);
    });
  }

  let currentOverlay = null;

  function removeCurrentOverlay() {
    if (currentOverlay) {
      currentOverlay.remove();
      currentOverlay = null;
    }
  }

  function addOverlay(definition) {
    if (
      !definition?.map_name ||
      !Array.isArray(definition.nw_coords) ||
      !Array.isArray(definition.se_coords)
    ) {
      console.warn('Cannot add overlay without a map name.');
      return null;
    }

    removeCurrentOverlay();

    const overlayCoords = [definition.nw_coords, definition.se_coords];
    const overlayFile = `${API_BASE}/api/dal/mapfile/final/${encodeURIComponent(definition.map_name)}`;

    currentOverlay = L.imageOverlay(overlayFile, overlayCoords, {
      opacity: 1,
      errorOverlayUrl: ERROR_OVERLAY_URL,
      alt: '',
      interactive: false
    }).addTo(map);

    return currentOverlay;
  }

  function setFixedZoom(isEnabled, zoomLevel) {
    if (isEnabled) {
      if (typeof zoomLevel === 'number') {
        // With zoomSnap: 0, this supports fractional zoom levels.
        map.flyTo(map.getCenter(), zoomLevel, { animate: false, duration: 0 });
      }
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
    } else {
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
    }
  }

  return {
    map,
    setView: (latlng, zoom = map.getZoom()) => {
      if (latlng) {
        map.setView(latlng, zoom);
      }
    },
    addOverlay,
    clearOverlay: removeCurrentOverlay,
    getCurrentOverlay: () => currentOverlay,
    setFixedZoom
  };
}

