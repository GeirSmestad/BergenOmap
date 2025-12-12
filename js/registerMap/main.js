import { CoordinateStore } from './state/coordinateStore.js';
import { RegistrationStore } from './state/registrationStore.js';
import { createMapViewController } from './controllers/mapViewController.js';
import { createOverlayController } from './controllers/overlayController.js';
import { initMarkerPalettePanel } from './ui/markerPalettePanel.js';
import { createPreviewController } from './controllers/previewController.js';
import { createPreExistingMapController } from './controllers/existingMapController.js';
import { initRegisterActions } from './actions/registerActions.js';
import { initfileDropService } from './services/fileDropService.js';
import { initMobileTabs } from './ui/mobileTabController.js';
import { fetchOriginalMapFile, fetchFinalMapFile, processDroppedImage } from './services/apiClient.js';

const DESKTOP_MEDIA_QUERY = '(min-width: 769px)';
const PALETTE_STICKY_BUFFER = 0;

const initPaletteStickyOffset = () => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const headerElement = document.querySelector('.registration-map-header');
  const rootElement = document.documentElement;

  if (!headerElement || !rootElement) {
    return;
  }

  const desktopMediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);

  const updateOffset = () => {
    if (!desktopMediaQuery.matches) {
      rootElement.style.removeProperty('--palette-sticky-offset');
      return;
    }

    const headerHeight = headerElement.getBoundingClientRect().height || 0;
    const offset = Math.max(0, Math.round(headerHeight + PALETTE_STICKY_BUFFER));

    rootElement.style.setProperty('--palette-sticky-offset', `${offset}px`);
  };

  updateOffset();

  const handleMediaQueryChange = () => updateOffset();

  if (typeof desktopMediaQuery.addEventListener === 'function') {
    desktopMediaQuery.addEventListener('change', handleMediaQueryChange);
  } else if (typeof desktopMediaQuery.addListener === 'function') {
    desktopMediaQuery.addListener(handleMediaQueryChange);
  }

  window.addEventListener('resize', updateOffset);

  if (typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(() => updateOffset());
    resizeObserver.observe(headerElement);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const coordinateStore = new CoordinateStore();
  const registrationStore = new RegistrationStore();

  initPaletteStickyOffset();

  const mobileTabs = initMobileTabs();

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
  const statusBarElement = document.getElementById('registrationStatus');

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
    if (statusBarElement && typeof message === 'string') {
      statusBarElement.textContent = message;
    }
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

  const focusLeafletMap = (mapEntry) => {
    const { nw_coords: nwCoords, se_coords: seCoords } = mapEntry;
    if (!Array.isArray(nwCoords) || !Array.isArray(seCoords)) {
      return;
    }

    try {
      mapViewController.map.fitBounds([nwCoords, seCoords], { padding: [40, 40] });
    } catch (error) {
      console.warn('Failed to fit bounds for selected map.', error);
      mapViewController.map.setView(nwCoords);
    }
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
    focusLeafletMap(mapEntry);

    previewController.showPreview();
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

        if (mobileTabs) {
          mobileTabs.switchToTab('terrain');
        }

        setStatusBarMessage(`Loaded "${mapLabel}". Preview enabled.`);
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
    onMapRequested: handlePreExistingMapSelection
  });

  initRegisterActions({
    coordinateStore,
    registrationStore,
    overlayController,
    previewController,
    elements: {
      computeRegistrationButton: document.getElementById('computeRegistrationButton'),
      saveMapButton: document.getElementById('saveMapButton'),
      registrationPreviewButton: document.getElementById('registrationPreviewButton'),
      outputDatabaseButton: document.getElementById('outputDatabaseButton'),
      statusBar: statusBarElement
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
      if (mobileTabs) {
        mobileTabs.switchToTab('terrain');
      }
    },
    onStatusMessage: (message) => console.warn(message) // TODO: Rename to disambiguate from the statusbar, also add file dropping to statusbar
  });

  preExistingMapController.loadAvailableMaps();
});

