import { API_BASE } from './config.js';
import { AppMenu } from '../appMenu.js';
import { MapBrowserStore } from './state/mapBrowserStore.js';
import { fetchMapDefinitions } from './services/mapDataService.js';
import { createWakeLockService } from './services/wakeLockService.js';
import { createMapController } from './controllers/mapController.js';
import { createLocationController } from './controllers/locationController.js';
import { createMapSelectorPanel } from './ui/mapSelectorPanel.js';
import { createShowPositionButton } from './ui/showPositionButton.js';
import { createCompassControl } from './ui/compassControl.js';
import { createFieldPointsController } from './controllers/fieldPointsController.js';

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
  createCompassControl({ map: mapController.map });

  createShowPositionButton({
    buttonElement: document.getElementById('showPositionToggle'),
    store
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
      // No need to re-render list on location update since we sort by viewport center.
    }
  });

  window.simulateLocation = locationController.simulateLocation;

  const fieldPointsController = createFieldPointsController({
    map: mapController.map,
    store,
    elements: {
      markButton: document.getElementById('markPositionButton'),
      modal: document.getElementById('pointModal'),
      modalTitle: document.getElementById('pointModalTitle'),
      modalDescription: document.getElementById('pointModalDescription'),
      modalError: document.getElementById('pointModalError'),
      modalCancelButton: document.getElementById('pointModalCancelButton'),
      modalOkButton: document.getElementById('pointModalOkButton'),
      modalBackdrop: document.querySelector('#pointModal .field-point-modal__backdrop'),
      contextMenu: document.getElementById('fieldPointContextMenu')
    }
  });

  try {
    const mapDefinitions = await fetchMapDefinitions(API_BASE);
    store.setMapDefinitions(mapDefinitions);
    console.log(`Loaded ${mapDefinitions.length} maps from backend`);
    mapSelectorPanel.renderIfVisible();
  } catch (error) {
    console.error('Error fetching map definitions:', error);
  }

  // Expose instances for debugging
  window.d_appMenu = appMenu;
  window.d_store = store;
  window.d_wakeLockService = wakeLockService;
  window.d_mapController = mapController;
  window.d_mapSelectorPanel = mapSelectorPanel;
  window.d_locationController = locationController;
  window.d_fieldPointsController = fieldPointsController;
});
