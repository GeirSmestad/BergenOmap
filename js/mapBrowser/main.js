import { backendBaseUrl, MAP_LIST_SOURCE } from './config.js';
import { MapBrowserStore } from './state/mapBrowserStore.js';
import { fetchMapDefinitions } from './services/mapDataService.js';
import { createWakeLockService } from './services/wakeLockService.js';
import { createMapController } from './controllers/mapController.js';
import { createLocationController } from './controllers/locationController.js';
import { createMapSelectorPanel } from './ui/mapSelectorPanel.js';
import { createFollowPositionButton } from './ui/followPositionButton.js';
import { isAccuracyAcceptable } from './utils/geo.js';

document.addEventListener('DOMContentLoaded', async () => {
  const store = new MapBrowserStore();
  const wakeLockService = createWakeLockService();

  wakeLockService.bindLifecycleEvents();
  await wakeLockService.request();

  const mapSelectorElements = {
    toggleButton: document.getElementById('mapSelectorToggle'),
    panel: document.getElementById('mapSelectorPanel'),
    list: document.getElementById('mapSelectorList'),
    modeNearMeInput: document.getElementById('mapSelectorModeNearMe'),
    modeNearViewportInput: document.getElementById('mapSelectorModeNearViewport')
  };

  let mapSelectorPanel = null;

  const mapController = createMapController({
    elementId: 'mapBrowser',
    store,
    onViewportMoved: () => {
      if (store.getState().mapListSource === MAP_LIST_SOURCE.NEAR_VIEWPORT) {
        mapSelectorPanel?.renderIfVisible();
      }
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

  function handleMapSelection(definition) {
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

  function handleMapSelectorModeChange(nextMode) {
    const currentMode = store.getState().mapListSource;

    if (currentMode === nextMode) {
      mapSelectorPanel?.renderIfVisible();
      mapSelectorPanel?.scrollListToTop();
      return;
    }

    store.setMapListSource(nextMode);
    mapSelectorPanel?.renderIfVisible();
    mapSelectorPanel?.scrollListToTop();
  }

  mapSelectorPanel = createMapSelectorPanel({
    store,
    map: mapController.map,
    elements: mapSelectorElements,
    onMapSelected: handleMapSelection,
    onModeChange: handleMapSelectorModeChange
  });

  mapSelectorPanel.updateModeUI();

  const locationController = createLocationController({
    map: mapController.map,
    store,
    onLocationUpdate: () => {
      if (store.getState().mapListSource === MAP_LIST_SOURCE.NEAR_ME) {
        mapSelectorPanel?.renderIfVisible();
      }
    }
  });

  window.simulateLocation = locationController.simulateLocation;

  try {
    const mapDefinitions = await fetchMapDefinitions(backendBaseUrl);
    store.setMapDefinitions(mapDefinitions);
    console.log(`Loaded ${mapDefinitions.length} maps from backend`);
    mapSelectorPanel.renderIfVisible();
  } catch (error) {
    console.error('Error fetching map definitions:', error);
  }
});

