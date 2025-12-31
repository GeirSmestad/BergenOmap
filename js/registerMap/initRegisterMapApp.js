import { CoordinateStore } from './state/coordinateStore.js';
import { RegistrationStore } from './state/registrationStore.js';
import { createMapViewController } from './controllers/mapViewController.js';
import { createOverlayController } from './controllers/overlayController.js';
import { initMarkerPalettePanel } from './ui/markerPalettePanel.js';
import { createPreviewController } from './controllers/previewController.js';
import { createPreExistingMapController } from './controllers/existingMapController.js';
import { initRegisterActions } from './actions/registerActions.js';
import { initfileDropService } from './services/fileDropService.js';
import { fetchOriginalMapFile, fetchFinalMapFile, processDroppedImage } from './services/apiClient.js';

/**
 * Shared register-map app initialization.
 *
 * Platform entrypoints should call this inside DOMContentLoaded.
 * Keep this file platform-neutral: no tab UI and no desktop-only layout logic.
 */
export function initRegisterMapApp({
  onAdvanceToTerrainView,
  // Backwards-compatible alias (older entrypoints)
  onAdvanceToTerrain
} = {}) {
  const coordinateStore = new CoordinateStore();
  const registrationStore = new RegistrationStore();

  const basemapToggleButton = document.getElementById('basemapToggleButton');
  const mapViewController = createMapViewController({ coordinateStore, basemapToggleButton });

  const overlayController = createOverlayController({
    coordinateStore,
    onOverlayLoaded: () => mapViewController.map.invalidateSize()
  });

  window.map = mapViewController.map;

  initMarkerPalettePanel({
    element: document.getElementById('mapMarkerPalette'),
    coordinateStore,
    type: 'map'
  });

  initMarkerPalettePanel({
    element: document.getElementById('overlayMarkerPalette'),
    coordinateStore,
    type: 'overlay'
  });

  const previewController = createPreviewController({
    map: mapViewController.map,
    registrationStore
  });

  const preExistingMapListElement = document.getElementById('preExistingMapList');
  const preExistingMapFilterElement = document.getElementById('preExistingMapFilter');
  const clearMapFilterButton = document.getElementById('clearMapFilterButton');
  const statusBarElements = Array.from(document.querySelectorAll('.registrationStatus'));

  const metadataFieldMappings = [
    ['mapName', 'map_name'],
    ['filename', 'map_filename'],
    ['attribution', 'attribution'],
    ['mapArea', 'map_area'],
    ['mapEvent', 'map_event'],
    ['mapDate', 'map_date'],
    ['mapCourse', 'map_course'],
    ['mapClub', 'map_club'],
    ['mapCoursePlanner', 'map_course_planner'],
    ['mapAttribution', 'map_attribution']
  ];

  let preExistingMapController;
  let processedOverlayObjectUrl = null;
  let registeredOverlayObjectUrl = null;
  let activeMapLoadToken = 0;

  const setStatusBarMessage = (message) => {
    if (typeof message !== 'string') return;
    statusBarElements.forEach((element) => {
      if (element) {
        element.textContent = message;
      }
    });
  };

  const updateMetadataInputs = (mapEntry) => {
    metadataFieldMappings.forEach(([inputId, key]) => {
      const element = document.getElementById(inputId);
      if (element) {
        element.value = mapEntry?.[key] ?? '';
      }
    });
  };

  const buildRegistrationDataFromDatabaseEntry = (mapEntry) => ({
    map_id: mapEntry.map_id,
    map_name: mapEntry.map_name,
    map_filename: mapEntry.map_filename,
    attribution: mapEntry.attribution,
    map_area: mapEntry.map_area,
    map_event: mapEntry.map_event,
    map_date: mapEntry.map_date,
    map_course: mapEntry.map_course,
    map_club: mapEntry.map_club,
    map_course_planner: mapEntry.map_course_planner,
    map_attribution: mapEntry.map_attribution,
    nw_coords: mapEntry.nw_coords,
    se_coords: mapEntry.se_coords,
    optimal_rotation_angle: mapEntry.optimal_rotation_angle,
    overlay_width: mapEntry.overlay_width,
    overlay_height: mapEntry.overlay_height,
    selected_pixel_coords: mapEntry.selected_pixel_coords,
    selected_realworld_coords: mapEntry.selected_realworld_coords
  });

  const hydrateStoresFromEntryFromDatabaseEntry = (mapEntry) => {
    registrationStore.setRegistrationData(buildRegistrationDataFromDatabaseEntry(mapEntry));
    coordinateStore.hydrateCoordinates({
      latLonPairs: mapEntry.selected_realworld_coords || [],
      imagePairs: mapEntry.selected_pixel_coords || []
    });
  };

  const focusTerrainViewMap = (mapEntry) => {
    const { nw_coords: nwCoords, se_coords: seCoords } = mapEntry;
    if (!Array.isArray(nwCoords) || !Array.isArray(seCoords)) {
      return;
    }

    // Calculate center
    const lat1 = parseFloat(nwCoords[0]);
    const lon1 = parseFloat(nwCoords[1]);
    const lat2 = parseFloat(seCoords[0]);
    const lon2 = parseFloat(seCoords[1]);

    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      console.warn('Invalid coordinates for map centering', nwCoords, seCoords);
      return;
    }

    const centerLat = (lat1 + lat2) / 2;
    const centerLon = (lon1 + lon2) / 2;

    // Use a fixed zoom level (13) to ensure the map is contained/visible.
    // We use setView instead of fitBounds because the map element might be hidden (display: none)
    // when this is called (during tab switch), causing fitBounds to fail or misbehave.
    mapViewController.map.setView([centerLat, centerLon], 13);
  };

  const releaseStoredMapUrls = () => {
    if (processedOverlayObjectUrl) {
      URL.revokeObjectURL(processedOverlayObjectUrl);
      processedOverlayObjectUrl = null;
    }

    if (registeredOverlayObjectUrl) {
      URL.revokeObjectURL(registeredOverlayObjectUrl);
      registeredOverlayObjectUrl = null;
    }
  };

  const updateOverlaySources = (processedOverlayBlob, finalBlob) => {
    releaseStoredMapUrls();
    processedOverlayObjectUrl = URL.createObjectURL(processedOverlayBlob);
    overlayController.setSource(processedOverlayObjectUrl);

    if (finalBlob) {
      registeredOverlayObjectUrl = URL.createObjectURL(finalBlob);
      registrationStore.setOverlayImageUrl(registeredOverlayObjectUrl);
    } else {
      registrationStore.setOverlayImageUrl(null);
    }
  };

  const buildOriginalFilename = (mapEntry) => {
    if (mapEntry?.map_filename) {
      return mapEntry.map_filename;
    }

    if (mapEntry?.map_name) {
      return `${mapEntry.map_name.replace(/[^a-z0-9-_]+/gi, '_')}.png`;
    }

    return 'map.png';
  };

  const requestProcessedOverlayBlob = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return processDroppedImage(formData);
  };

  const loadExistingMapAssets = async (mapEntry, requestId) => {
    if (!mapEntry?.map_name) {
      throw new Error('Selected map is missing a name and cannot be loaded.');
    }

    const originalBlob = await fetchOriginalMapFile(mapEntry.map_name);
    const originalFile = new File([originalBlob], buildOriginalFilename(mapEntry), { type: originalBlob.type || 'image/png' });

    const [processedOverlayBlob, finalBlob] = await Promise.all([
      requestProcessedOverlayBlob(originalFile),
      fetchFinalMapFile(mapEntry.map_name)
    ]);

    if (requestId !== activeMapLoadToken) {
      return;
    }

    updateOverlaySources(processedOverlayBlob, finalBlob);
    updateMetadataInputs(mapEntry);
    hydrateStoresFromEntryFromDatabaseEntry(mapEntry);
    registrationStore.setDroppedImage(originalFile);
    focusTerrainViewMap(mapEntry);

    previewController.showPreview();
  };

  const advanceToTerrainView = () => {
    const callback = onAdvanceToTerrainView ?? onAdvanceToTerrain;
    if (typeof callback === 'function') {
      callback();
    }
  };

  const handlePreExistingMapSelection = (mapEntry) => {
    if (!mapEntry) {
      return;
    }

    const requestId = ++activeMapLoadToken;
    const mapLabel = mapEntry.map_name || 'selected map';

    setStatusBarMessage(`Loading "${mapLabel}" from database…`);

    loadExistingMapAssets(mapEntry, requestId)
      .then(() => {
        if (requestId !== activeMapLoadToken) {
          return;
        }

        advanceToTerrainView();
        setStatusBarMessage(`Loaded "${mapLabel}". You can adjust the terrain fit by dragging the markers and clicking 'Fit map to terrain', or edit the map details if you want.`);
      })
      .catch((error) => {
        if (requestId !== activeMapLoadToken) {
          return;
        }

        console.error('Failed to load map from database:', error);
        setStatusBarMessage('Failed to load selected map. Check console for details.');
      });
  };

  preExistingMapController = createPreExistingMapController({
    listElement: preExistingMapListElement,
    filterElement: preExistingMapFilterElement,
    clearFilterButton: clearMapFilterButton,
    onMapRequested: handlePreExistingMapSelection
  });

  initRegisterActions({
    coordinateStore,
    registrationStore,
    overlayController,
    previewController,
    onRegistrationComplete: () => {
      advanceToTerrainView();
    },
    elements: {
      computeRegistrationButton: document.getElementById('computeRegistrationButton'),
      saveMapButton: document.getElementById('saveMapButton'),
      registrationPreviewButton: document.getElementById('registrationPreviewButton'),
      outputDatabaseButton: document.getElementById('outputDatabaseButton'),
      statusBar: statusBarElements
    }
  });

  initfileDropService({
    dropArea: document.getElementById('drop-area'),
    fileInput: document.getElementById('fileUploadInput'),
    registrationStore,
    onOverlayReady: (url) => {
      releaseStoredMapUrls();
      overlayController.setSource(url);
      registrationStore.setOverlayImageUrl(null);
      previewController.clearPreview();
      advanceToTerrainView();
    },
    onStatusMessage: (message) => setStatusBarMessage(message)
  });

  preExistingMapController.loadAvailableMaps();

  return {
    coordinateStore,
    registrationStore,
    mapViewController,
    overlayController,
    previewController,
    destroy: () => {
      releaseStoredMapUrls();
      preExistingMapController?.destroy?.();
      overlayController?.destroy?.();
      mapViewController?.markerManager?.destroy?.();
    }
  };
}
