import { API_BASE } from './config.js';
import { AppMenu } from '../appMenu.js';
import { MapBrowserStore } from './state/mapBrowserStore.js';
import { fetchMapDefinitions } from './services/mapDataService.js';
import { createWakeLockService } from './services/wakeLockService.js';
import { createMapController } from './controllers/mapController.js';
import { createLocationController } from './controllers/locationController.js';
import { createMapSelectorPanel } from './ui/mapSelectorPanel.js';
import { createFollowPositionButton } from './ui/followPositionButton.js';
import { createFixedZoomButton } from './ui/fixedZoomButton.js';
import { isAccuracyAcceptable, calculateZoomLevelForScale } from './utils/geo.js';

document.addEventListener('DOMContentLoaded', async () => {
  const appMenu = new AppMenu();
  const store = new MapBrowserStore();
  const wakeLockService = createWakeLockService();

  wakeLockService.bindLifecycleEvents();
  await wakeLockService.request();

  const mapSelectorElements = {
    toggleButton: document.getElementById('mapSelectorToggle'),
    panel: document.getElementById('mapSelectorPanel'),
    list: document.getElementById('mapSelectorList'),
    searchInput: document.getElementById('mapSelectorSearch'),
    searchClearBtn: document.getElementById('mapSelectorSearchClear')
  };

  let mapSelectorPanel = null;

  const mapController = createMapController({
    elementId: 'mapBrowser',
    store,
    onViewportMoved: () => {
      // Re-sort the list by distance from new center
      mapSelectorPanel?.renderIfVisible();
    }
  });

  window.map = mapController.map;

  function handleFollowToggle(isEnabled) {
    if (!isEnabled) {
      return;
    }

    const state = store.getState();
    if (
      state.lastKnownLocation &&
      isAccuracyAcceptable(state.lastKnownAccuracy)
    ) {
      mapController.setView(state.lastKnownLocation, mapController.map.getZoom());
    }
  }

  createFollowPositionButton({
    buttonElement: document.getElementById('followPositionToggle'),
    store,
    onToggle: handleFollowToggle
  });

  createFixedZoomButton({
    buttonElement: document.getElementById('fixedZoomToggle'),
    store,
    onToggle: (isEnabled) => {
      if (isEnabled) {
        const center = mapController.map.getCenter();
        const zoom = calculateZoomLevelForScale(center.lat, 7500);
        mapController.setFixedZoom(true, zoom);
      } else {
        mapController.setFixedZoom(false);
      }
    }
  });

  function handleMapSelection(definition) {
    // Untoggle fixed zoom when selecting a new map
    store.setFixedZoomEnabled(false);
    mapController.setFixedZoom(false);

    const selectedMapName = store.getState().selectedMapName;
    const userClickedSelectedMap = selectedMapName === definition.map_name;

    if (userClickedSelectedMap) {
      mapController.clearOverlay();
      store.setSelectedMapName(null);
      return;
    }

    mapController.addOverlay(definition);
    store.setSelectedMapName(definition.map_name);
  }

  mapSelectorPanel = createMapSelectorPanel({
    store,
    map: mapController.map,
    elements: mapSelectorElements,
    onMapSelected: handleMapSelection
  });

  const locationController = createLocationController({
    map: mapController.map,
    store,
    onLocationUpdate: () => {
      // No need to re-render list on location update since we sort by viewport center
    }
  });

  window.simulateLocation = locationController.simulateLocation;

  try {
    const mapDefinitions = await fetchMapDefinitions(API_BASE);
    store.setMapDefinitions(mapDefinitions);
    console.log(`Loaded ${mapDefinitions.length} maps from backend`);
    mapSelectorPanel.renderIfVisible();
  } catch (error) {
    console.error('Error fetching map definitions:', error);
  }
});
