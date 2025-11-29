import { buildMarkerSvgMarkup } from '../markers/markerDefinitions.js';

const MARKER_ICON_SIZE = [36, 52];
const MARKER_ICON_ANCHOR = [18, 52];

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

