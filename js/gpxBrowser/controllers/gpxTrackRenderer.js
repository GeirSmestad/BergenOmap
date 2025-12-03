const DEFAULT_POLYLINE_OPTIONS = {
  color: '#ff2d2d',
  weight: 4,
  opacity: 0.95,
  lineCap: 'round',
  lineJoin: 'round'
};
const OUTLINE_COLOR = '#2b0000'; // very dark red for subtle contrast
const OUTLINE_EXTRA_WEIGHT = 1; // add 1px around the inner stroke

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

      const mergedOptions = {
        ...DEFAULT_POLYLINE_OPTIONS,
        ...polylineOptions
      };

      const baseWeight = typeof mergedOptions.weight === 'number'
        ? mergedOptions.weight
        : DEFAULT_POLYLINE_OPTIONS.weight;

      const outline = L.polyline(segment, {
        color: OUTLINE_COLOR,
        opacity: 1,
        weight: baseWeight + OUTLINE_EXTRA_WEIGHT,
        lineCap: mergedOptions.lineCap,
        lineJoin: mergedOptions.lineJoin,
        pane: paneName
      }).addTo(map);

      const polyline = L.polyline(segment, {
        ...mergedOptions,
        pane: paneName
      }).addTo(map);

      if (typeof polyline.bringToFront === 'function') {
        polyline.bringToFront();
      }

      layers.push(outline, polyline);
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

