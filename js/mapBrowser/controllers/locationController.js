import { isAccuracyAcceptable } from '../utils/geo.js';

const defaultLocateOptions = {
  watch: true,
  enableHighAccuracy: true,
  setView: false,
  maxZoom: 16
};

export function createLocationController({
  map,
  store,
  onLocationUpdate,
  locateOptions = {}
} = {}) {
  if (!map) {
    throw new Error('Map instance is required for locationController');
  }

  let marker = null;
  let accuracyCircle = null;

  function handleLocationFound(event) {
    const radius = event.accuracy / 2;

    if (marker) {
      marker.remove();
    }

    if (accuracyCircle) {
      accuracyCircle.remove();
    }

    marker = L.marker(event.latlng).addTo(map);
    accuracyCircle = L.circle(event.latlng, radius).addTo(map);

    if (store) {
      store.setLastKnownLocation(event.latlng);
      store.setLastKnownAccuracy(event.accuracy);

      const state = store.getState();

      if (!state.hasReceivedInitialLocation) {
        if (!state.userHasInteractedWithMap) {
          map.setView(event.latlng, map.getZoom());
        }
        store.setHasReceivedInitialLocation(true);
      }

      if (
        state.toggleButtons.followPosition &&
        isAccuracyAcceptable(event.accuracy)
      ) {
        map.setView(event.latlng, map.getZoom());
      }
    }

    if (typeof onLocationUpdate === 'function') {
      onLocationUpdate(event);
    }
  }

  function handleLocationError(event) {
    console.log(`Error when receiving location: ${event.message}`);
  }

  map.on('locationfound', handleLocationFound);
  map.on('locationerror', handleLocationError);

  map.locate({
    ...defaultLocateOptions,
    ...locateOptions
  });

  function simulateLocation(lat, lon) {
    const simulatedLocation = {
      latlng: L.latLng(lat, lon),
      accuracy: 50
    };
    map.fire('locationfound', simulatedLocation);
  }

  return {
    simulateLocation,
    destroy() {
      map.off('locationfound', handleLocationFound);
      map.off('locationerror', handleLocationError);

      if (marker) {
        marker.remove();
        marker = null;
      }

      if (accuracyCircle) {
        accuracyCircle.remove();
        accuracyCircle = null;
      }
    }
  };
}

