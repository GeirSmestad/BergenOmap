const DEFAULT_POLYLINE_OPTIONS = {
  color: '#ff2d2d',
  weight: 6,
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
  paneZIndex = 650,
  onPointHover
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

  function renderTrack(segmentLatLngs, segmentMetadata) {
    clearTrack();

    if (!Array.isArray(segmentLatLngs) || segmentLatLngs.length === 0) {
      return;
    }

    segmentLatLngs.forEach((segment, index) => {
      if (!Array.isArray(segment) || segment.length < 2) {
        return;
      }

      const metadataPoints = segmentMetadata?.[index] ?? [];

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

      if (typeof onPointHover === 'function') {
        polyline.on('mousemove', (event) => {
          const time = findClosestPointTime(event.latlng, segment, metadataPoints);
          onPointHover(time, event.latlng);
        });

        polyline.on('mouseout', () => {
          onPointHover(null, null);
        });
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
  pane.style.pointerEvents = 'auto';
  return pane;
}

function findClosestPointTime(latlng, segment, metadataPoints) {
  /* TODO: If I read this right, it's very inefficient; O(n) of GPX length on the client
     every time the mouse cursor changes. Can be done in O(1) by attaching the time to each
     point on the polyline when creating it. Assuming I understand it right. */
  if (!Array.isArray(metadataPoints) || metadataPoints.length !== segment.length) {
    return null;
  }

  let closestIndex = -1;
  let shortestDistance = Infinity;

  segment.forEach((point, index) => {
    const distance = latLngDistance(latlng, point);
    if (distance < shortestDistance) {
      shortestDistance = distance;
      closestIndex = index;
    }
  });

  if (closestIndex === -1) {
    return null;
  }

  return metadataPoints[closestIndex]?.time ?? null;
}

function latLngDistance(latlng, pointArray) {
  const latDiff = latlng.lat - pointArray[0];
  const lngDiff = latlng.lng - pointArray[1];
  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
}

