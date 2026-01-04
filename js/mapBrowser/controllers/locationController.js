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
  let unsubscribe = null;

  function updateVisibility() {
    if (!store) return;
    const shouldShow = store.getState().toggleButtons.showPosition;

    if (marker) {
      if (shouldShow) {
        if (!map.hasLayer(marker)) marker.addTo(map);
      } else {
        if (map.hasLayer(marker)) marker.remove();
      }
    }

    if (accuracyCircle) {
      if (shouldShow) {
        if (!map.hasLayer(accuracyCircle)) accuracyCircle.addTo(map);
      } else {
        if (map.hasLayer(accuracyCircle)) accuracyCircle.remove();
      }
    }
  }

  function handleLocationFound(event) {
    const radius = event.accuracy / 2;

    if (marker) {
      marker.remove();
    }

    if (accuracyCircle) {
      accuracyCircle.remove();
    }

    const markerIcon = L.divIcon({
      className: 'user-location-marker-container',
      html: '<div class="user-location-dot"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    accuracyCircle = L.circle(event.latlng, {
      radius: radius,
      color: '#2196F3',
      fillColor: '#2196F3',
      fillOpacity: 0.2,
      weight: 1
    }).addTo(map);

    marker = L.marker(event.latlng, { icon: markerIcon }).addTo(map);

    updateVisibility();

    if (store) {
      store.setLastKnownLocation(event.latlng);
      store.setLastKnownAccuracy(event.accuracy);

      const state = store.getState();

      const isFirstLocationEvent = !state.hasReceivedInitialLocation;
      if (isFirstLocationEvent) {
        store.setHasReceivedInitialLocation(true);
      }

      const shouldCenterOnFirstLocation =
        isFirstLocationEvent && !state.userHasInteractedWithMap;
      const shouldFollowPosition =
        state.toggleButtons.followPosition && isAccuracyAcceptable(event.accuracy);

      if (shouldCenterOnFirstLocation || shouldFollowPosition) {
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

  if (store) {
    unsubscribe = store.subscribe((state, prevState, change) => {
      if (change?.type === 'showPosition') {
        updateVisibility();
      }
    });
  }

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
      if (unsubscribe) {
        unsubscribe();
      }
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
