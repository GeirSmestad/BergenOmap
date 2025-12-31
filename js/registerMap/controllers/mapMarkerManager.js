import { buildMarkerSvgMarkup } from '../markers/markerDefinitions.js';

const MARKER_ICON_SIZE = [36, 52];
const MARKER_ICON_ANCHOR = [18, 52];

// Mobile drag UX: keep the finger away from the marker tip pixel while dragging.
// 0 means "grab at the very top of the marker". Negative values mean "grab above the marker".
const MARKER_GRAB_Y_RATIO_TOUCH = -0.3;

const createMarkerIcon = (index) => {
  const markerHtml = buildMarkerSvgMarkup(index);

  return L.divIcon({
    className: 'registration-marker registration-marker--map',
    html: markerHtml,
    iconSize: MARKER_ICON_SIZE,
    iconAnchor: MARKER_ICON_ANCHOR
  });
};

export function createMapMarkerManager({ map, coordinateStore }) {
  if (!map) {
    throw new Error('createMapMarkerManager requires a Leaflet map instance');
  }

  const markersByIndex = new Map();

  const isMobileRegisterUi = () => Boolean(document.getElementById('mobileTabNav'));

  const attachMobileDragGrabBehavior = (marker) => {
    if (!isMobileRegisterUi()) {
      return;
    }

    const element = marker.getElement();
    if (!element) {
      marker.once('add', () => attachMobileDragGrabBehavior(marker));
      return;
    }

    let lastTouchOffsetY = null;
    let lastMarkerHeight = null;

    const captureTouchOffset = (clientY) => {
      const rect = element.getBoundingClientRect();
      lastMarkerHeight = rect.height || MARKER_ICON_SIZE[1];
      lastTouchOffsetY = clientY - rect.top;
    };

    const handlePointerDown = (event) => {
      if (event.pointerType === 'touch' || event.pointerType === 'pen') {
        captureTouchOffset(event.clientY);
      }
    };

    const handleTouchStart = (event) => {
      const touch = event.touches?.[0];
      if (touch) {
        captureTouchOffset(touch.clientY);
      }
    };

    element.addEventListener('pointerdown', handlePointerDown, { capture: true });
    element.addEventListener('touchstart', handleTouchStart, { capture: true });

    const handleDragStart = () => {
      if (typeof lastTouchOffsetY !== 'number') {
        return;
      }

      const markerHeight = lastMarkerHeight || MARKER_ICON_SIZE[1];
      const desiredY = markerHeight * MARKER_GRAB_Y_RATIO_TOUCH;
      const dy = lastTouchOffsetY - desiredY;

      const draggable = marker.dragging?._draggable;
      const startPoint = draggable?._startPoint;
      if (startPoint && typeof startPoint.y === 'number') {
        // Shift drag start so the marker sits lower than the finger.
        startPoint.y -= dy;
      }
    };

    const resetTouchOffset = () => {
      lastTouchOffsetY = null;
      lastMarkerHeight = null;
    };

    marker.on('dragstart', handleDragStart);
    marker.on('dragend', resetTouchOffset);
    marker.on('remove', () => {
      element.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      element.removeEventListener('touchstart', handleTouchStart, { capture: true });
      marker.off('dragstart', handleDragStart);
      marker.off('dragend', resetTouchOffset);
    });
  };

  const handleMapClick = (event) => {
    const { currentLatLonIndex } = coordinateStore.getCurrentIndices();

    if (typeof currentLatLonIndex !== 'number') {
      return;
    }

    if (coordinateStore.isLatLonSet(currentLatLonIndex)) {
      return;
    }

    const { lat, lng } = event.latlng;
    coordinateStore.setLatLonAt(currentLatLonIndex, lat, lng);
  };

  const removeMarker = (index) => {
    const marker = markersByIndex.get(index);
    if (!marker) {
      return;
    }

    marker.remove();
    markersByIndex.delete(index);
  };

  const handleMarkerDragEnd = (index, marker) => {
    const { lat, lng } = marker.getLatLng();
    coordinateStore.setLatLonAt(index, lat, lng, { skipAdvance: true });
  };

  const handleMarkerContextMenu = (index, event) => {
    if (event?.originalEvent) {
      event.originalEvent.preventDefault();
      event.originalEvent.stopPropagation();
    }
    coordinateStore.clearLatLonAt(index);
    removeMarker(index);
  };

  const placeMarker = (index, lat, lon) => {
    const marker = L.marker([lat, lon], {
      draggable: true,
      icon: createMarkerIcon(index),
      autoPan: true
    });

    marker.on('dragend', () => handleMarkerDragEnd(index, marker));
    marker.on('contextmenu', (event) => handleMarkerContextMenu(index, event));
    marker.addTo(map);
    attachMobileDragGrabBehavior(marker);

    markersByIndex.set(index, marker);
    return marker;
  };

  const syncMarkerPositionsFromCoordinateStore = (snapshot = coordinateStore.getSnapshot()) => {
    snapshot.latLon.forEach((point, index) => {
      const isSet = snapshot.latLonOccupancy[index];
      const marker = markersByIndex.get(index);

      if (isSet) {
        if (marker) {
          marker.setLatLng([point.lat, point.lon]);
        } else {
          placeMarker(index, point.lat, point.lon);
        }
      } else if (marker) {
        removeMarker(index);
      }
    });
  };

  const handleStoreChange = (event) => syncMarkerPositionsFromCoordinateStore(event.detail);

  const destroy = () => {
    map.off('click', handleMapClick);
    coordinateStore.removeEventListener('change', handleStoreChange);
    markersByIndex.forEach((marker) => marker.remove());
    markersByIndex.clear();
  };

  map.on('click', handleMapClick);
  coordinateStore.addEventListener('change', handleStoreChange);
  syncMarkerPositionsFromCoordinateStore();

  return {
    sync: syncMarkerPositionsFromCoordinateStore,
    destroy
  };
}

