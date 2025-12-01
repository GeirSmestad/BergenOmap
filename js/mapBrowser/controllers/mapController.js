import {
  backendBaseUrl,
  defaultMapCenter,
  defaultMapZoom,
  errorOverlayUrl,
  tileLayerConfig
} from '../config.js';

export function createMapController({
  elementId = 'mapBrowser',
  store,
  onViewportMoved
} = {}) {
  if (typeof L === 'undefined') {
    throw new Error('Leaflet is required for mapController');
  }

  const map = L.map(elementId).setView(defaultMapCenter, defaultMapZoom);

  L.tileLayer(tileLayerConfig.url, tileLayerConfig.options).addTo(map);

  if (store) {
    map.once('mousedown', () => store.setUserHasInteractedWithMap(true));
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
    const overlayFile = `${backendBaseUrl}/api/dal/mapfile/final/${encodeURIComponent(definition.map_name)}`;

    currentOverlay = L.imageOverlay(overlayFile, overlayCoords, {
      opacity: 1,
      errorOverlayUrl,
      alt: '',
      interactive: true
    }).addTo(map);

    return currentOverlay;
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
    getCurrentOverlay: () => currentOverlay
  };
}

