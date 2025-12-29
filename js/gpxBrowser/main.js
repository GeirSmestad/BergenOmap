import { API_BASE } from '../mapBrowser/config.js';
import { AppMenu } from '../appMenu.js';
import { createMapController } from '../mapBrowser/controllers/mapController.js';
import { fetchMapDefinitions } from '../mapBrowser/services/mapDataService.js';
import { fetchTrackDetail, fetchUserTracks, uploadTrack } from './services/gpxTrackService.js';
import { createGpxListPanel } from './ui/gpxListPanel.js';
import { GpxBrowserStore } from './state/gpxBrowserStore.js';
import { createGpxTrackRenderer } from './controllers/gpxTrackRenderer.js';
import { getSegmentLatLngs } from './utils/gpxTrackUtils.js';
import { createGpxUploadDialog } from './ui/gpxUploadDialog.js';
import { createGpxMapSelectorPanel } from './ui/mapSelectorPanel.js';
import { redirectToLoginOnExpiredSession } from '../utils/apiUtils.js';

async function fetchCurrentUsername() {
  const response = await fetch(`${API_BASE}/api/auth/me`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    redirectToLoginOnExpiredSession(response);
    throw new Error(`Failed to resolve current user: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!data?.username) {
    throw new Error('Missing username from /api/auth/me');
  }
  return data.username;
}

document.addEventListener('DOMContentLoaded', async () => {
  const appMenu = new AppMenu();
  const store = new GpxBrowserStore();

  const currentUsername = await fetchCurrentUsername();

  const mapSelectorElements = {
    toggleButton: document.getElementById('mapSelectorToggle'),
    panel: document.getElementById('mapSelectorPanel'),
    list: document.getElementById('mapSelectorList'),
    searchInput: document.getElementById('mapSelectorSearch'),
    searchClearBtn: document.getElementById('mapSelectorSearchClear')
  };

  const mapController = createMapController({
    elementId: 'mapBrowser',
    onViewportMoved: () => {
      mapSelectorPanel?.renderIfVisible();
    },
    mapOptions: {
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 45
    }
  });

  const timePanel = createTrackTimePanel();

  const trackRenderer = createGpxTrackRenderer({
    map: mapController.map,
    polylineOptions: {
      weight: 7
    },
    onPointHover: (timeIso) => {
      if (timeIso) {
        timePanel.show(timeIso);
      } else {
        timePanel.hideWithDelay(4000);
      }
    }
  });

  let activeTrackRequest = 0;

  function handleMapSelection(mapDefinition) {
    const selectedMapName = store.getState().selectedMapName;
    const clickedSelected = selectedMapName === mapDefinition.map_name;

    if (clickedSelected) {
      mapController.clearOverlay();
      store.setSelectedMapName(null);
      return;
    }

    mapController.addOverlay(mapDefinition);
    store.setSelectedMapName(mapDefinition.map_name);
  }

  let gpxListPanel = null;

  const mapSelectorPanel = createGpxMapSelectorPanel({
    store,
    map: mapController.map,
    elements: mapSelectorElements,
    onMapSelected: handleMapSelection,
    onVisibilityChange: (isVisible) => {
      if (isVisible) {
        gpxListPanel?.hide();
      }
    }
  });

  gpxListPanel = createGpxListPanel({
    store,
    elements: {
      toggleButton: document.getElementById('gpxSelectorToggle'),
      panel: document.getElementById('gpxSelectorPanel'),
      list: document.getElementById('gpxSelectorList'),
      modeAllInput: document.getElementById('gpxSelectorModeAll'),
      modeOnMapInput: document.getElementById('gpxSelectorModeOnMap'),
      searchInput: document.getElementById('gpxSelectorSearch'),
      searchClearBtn: document.getElementById('gpxSelectorSearchClear')
    },
    onTrackSelected: (track) => handleTrackSelection(track),
    onVisibilityChange: (isVisible) => {
      if (isVisible) {
        mapSelectorPanel?.hide();
      }
    }
  });

  async function handleTrackSelection(track) {
    const selectedId = store.getState().selectedTrackId;
    const isAlreadySelected = selectedId === track.track_id;

    if (isAlreadySelected) {
      store.setSelectedTrackId(null);
      store.setActiveTrack(null);
      trackRenderer.clearTrack();
      return;
    }

    store.setSelectedTrackId(track.track_id);
    await loadAndRenderTrack(track.track_id);
  }

  async function loadAndRenderTrack(trackId) {
    const requestId = ++activeTrackRequest;
    store.setTrackLoading(true, null);

    try {
      const trackDetail = await fetchTrackDetail(API_BASE, currentUsername, trackId);

      if (requestId !== activeTrackRequest) {
        return;
      }

      store.setActiveTrack(trackDetail);
      store.setTrackLoading(false, null);

      const { segments, metadata } = getSegmentLatLngs(trackDetail);

      if (segments.length === 0) {
        trackRenderer.clearTrack();
        console.warn(`Track ${trackId} did not contain drawable coordinates.`);
        return;
      }

      trackRenderer.renderTrack(segments, metadata);
    } catch (error) {
      if (requestId !== activeTrackRequest) {
        return;
      }

      console.error('Failed to load GPX track', error);
      store.setActiveTrack(null);
      store.setTrackLoading(false, error.message);
      trackRenderer.clearTrack();
    }
  }

  try {
    const mapDefinitions = await fetchMapDefinitions(API_BASE);
    store.setMapDefinitions(mapDefinitions);
    mapSelectorPanel.renderIfVisible();
  } catch (error) {
    console.error('Failed to load map definitions', error);
  }

  const uploadDialog = createGpxUploadDialog({
    elements: {
      triggerButton: document.getElementById('uploadGpxButton'),
      fileInput: document.getElementById('gpxFileInput'),
      modal: document.getElementById('gpxUploadModal'),
      descriptionInput: document.getElementById('gpxUploadDescription'),
      errorText: document.getElementById('gpxUploadError'),
      cancelButton: document.getElementById('gpxUploadCancelButton'),
      submitButton: document.getElementById('gpxUploadSubmitButton')
    },
    onSubmit: async ({ file, description }) => {
      const response = await uploadTrack(API_BASE, currentUsername, description, file);
      await refreshTrackList();
      if (response?.track_id) {
        await handleNewTrackSelection(response.track_id);
      }
    }
  });

  async function handleNewTrackSelection(trackId) {
    const numericId = Number(trackId);
    if (!Number.isFinite(numericId)) {
      return;
    }
    const tracks = store.getState().gpxTracks;
    const exists = tracks.some((track) => track.track_id === numericId);
    if (!exists) {
      return;
    }
    store.setSelectedTrackId(numericId);
    await loadAndRenderTrack(numericId);
  }

  async function refreshTrackList() {
    const tracks = await fetchUserTracks(API_BASE, currentUsername);
    store.setGpxTracks(tracks);
    gpxListPanel.renderIfVisible();
    return tracks;
  }

  try {
    await refreshTrackList();
  } catch (error) {
    console.error('Failed to load GPX tracks', error);
    gpxListPanel.showError('Kunne ikke laste GPS-spor');
  }

  // Expose instances for debugging
  window.d_appMenu = appMenu;
  window.d_gpxBrowserStore = store;
  window.d_mapController = mapController;
  window.d_trackRenderer = trackRenderer;
  window.d_mapSelectorPanel = mapSelectorPanel;
  window.d_gpxListPanel = gpxListPanel;
  window.d_uploadDialog = uploadDialog;
  window.d_timePanel = timePanel;

});

function createTrackTimePanel() {
  const panel = document.getElementById('gpxTrackTimePanel');
  const label = document.getElementById('gpxTrackTimeLabel');
  let hideTimeoutId = null;

  function formatTime(isoString) {
    if (!isoString) {
      return '--:--:--';
    }
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
      return '--:--:--';
    }
    return date.toLocaleTimeString([], { hour12: false });
  }

  function clearHideTimer() {
    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
      hideTimeoutId = null;
    }
  }

  return {
    show(timeIso) {
      if (!panel || !label) {
        return;
      }
      clearHideTimer();
      label.textContent = `Tid: ${formatTime(timeIso)}`;
      panel.classList.add('is-visible');
      panel.setAttribute('aria-hidden', 'false');
    },
    hideWithDelay(delayMs = 4000) {
      if (!panel || !label) {
        return;
      }
      clearHideTimer();
      hideTimeoutId = setTimeout(() => {
        panel.classList.remove('is-visible');
        panel.setAttribute('aria-hidden', 'true');
        hideTimeoutId = null;
      }, delayMs);
    }
  };
}

