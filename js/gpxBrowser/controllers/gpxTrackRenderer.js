const DEFAULT_POLYLINE_OPTIONS = {
  color: '#ff2d2d',
  weight: 4,
  opacity: 0.95,
  lineCap: 'round',
  lineJoin: 'round'
};

export function createGpxTrackRenderer({
  map,
  polylineOptions = {},
  paneName = 'gpx-track-pane',
  paneZIndex = 650
} = {}) {
  if (!map || typeof L === 'undefined') {
    throw new Error('Leaflet map instance is required for GPX track renderer');
  }

  ensurePane(map, paneName, paneZIndex);

  const layers = [];

  function clearTrack() {
    layers.splice(0).forEach((layer) => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });
  }

  function renderTrack(segmentLatLngs) {
    clearTrack();

    if (!Array.isArray(segmentLatLngs) || segmentLatLngs.length === 0) {
      return;
    }

    segmentLatLngs.forEach((segment) => {
      if (!Array.isArray(segment) || segment.length < 2) {
        return;
      }

      const polyline = L.polyline(segment, {
        ...DEFAULT_POLYLINE_OPTIONS,
        ...polylineOptions,
        pane: paneName
      }).addTo(map);

      if (typeof polyline.bringToFront === 'function') {
        polyline.bringToFront();
      }

      layers.push(polyline);
    });
  }

  return {
    renderTrack,
    clearTrack
  };
}

function ensurePane(map, paneName, paneZIndex) {
  const existingPane = map.getPane(paneName);
  if (existingPane) {
    return existingPane;
  }

  map.createPane(paneName);
  const pane = map.getPane(paneName);
  pane.style.zIndex = String(paneZIndex);
  pane.style.pointerEvents = 'none';
  return pane;
}

