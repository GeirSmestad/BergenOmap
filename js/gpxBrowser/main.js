import { API_BASE, MAP_LIST_SOURCE } from '../mapBrowser/config.js';
import { createMapController } from '../mapBrowser/controllers/mapController.js';
import { createMapSelectorPanel } from '../mapBrowser/ui/mapSelectorPanel.js';
import { fetchMapDefinitions } from '../mapBrowser/services/mapDataService.js';
import { fetchTrackDetail, fetchUserTracks } from './services/gpxTrackService.js';
import { createGpxListPanel } from './ui/gpxListPanel.js';
import { GpxBrowserStore } from './state/gpxBrowserStore.js';
import { createGpxTrackRenderer } from './controllers/gpxTrackRenderer.js';
import { getSegmentLatLngs } from './utils/gpxTrackUtils.js';

const DEFAULT_USERNAME = 'geir.smestad';

document.addEventListener('DOMContentLoaded', async () => {
  const store = new GpxBrowserStore();

  const mapSelectorElements = {
    toggleButton: document.getElementById('mapSelectorToggle'),
    panel: document.getElementById('mapSelectorPanel'),
    list: document.getElementById('mapSelectorList'),
    modeNearMeInput: document.getElementById('mapSelectorModeNearMe'),
    modeNearViewportInput: document.getElementById('mapSelectorModeNearViewport')
  };

  const mapController = createMapController({
    elementId: 'mapBrowser',
    onViewportMoved: () => {
      if (store.getState().mapListSource === MAP_LIST_SOURCE.NEAR_VIEWPORT) {
        mapSelectorPanel?.renderIfVisible();
      }
    }
  });

  const trackRenderer = createGpxTrackRenderer({
    map: mapController.map,
    polylineOptions: {
      weight: 5
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

  function handleMapSelectorModeChange(nextMode) {
    if (nextMode !== MAP_LIST_SOURCE.NEAR_VIEWPORT) {
      return;
    }

    store.setMapListSource(nextMode);
    mapSelectorPanel?.renderIfVisible();
    mapSelectorPanel?.scrollListToTop();
  }

  let gpxListPanel = null;

  const mapSelectorPanel = createMapSelectorPanel({
    store,
    map: mapController.map,
    elements: mapSelectorElements,
    onMapSelected: handleMapSelection,
    onModeChange: handleMapSelectorModeChange,
    onVisibilityChange: (isVisible) => {
      if (isVisible) {
        gpxListPanel?.hide();
      }
    }
  });

  mapSelectorPanel.updateModeUI();

  gpxListPanel = createGpxListPanel({
    store,
    elements: {
      toggleButton: document.getElementById('gpxSelectorToggle'),
      panel: document.getElementById('gpxSelectorPanel'),
      list: document.getElementById('gpxSelectorList')
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
      const trackDetail = await fetchTrackDetail(API_BASE, DEFAULT_USERNAME, trackId);

      if (requestId !== activeTrackRequest) {
        return;
      }

      store.setActiveTrack(trackDetail);
      store.setTrackLoading(false, null);

      const segments = getSegmentLatLngs(trackDetail);

      if (segments.length === 0) {
        trackRenderer.clearTrack();
        console.warn(`Track ${trackId} did not contain drawable coordinates.`);
        return;
      }

      trackRenderer.renderTrack(segments);
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

  try {
    const tracks = await fetchUserTracks(API_BASE, DEFAULT_USERNAME);
    store.setGpxTracks(tracks);
    gpxListPanel.renderIfVisible();
  } catch (error) {
    console.error('Failed to load GPX tracks', error);
    gpxListPanel.showError('Kunne ikke laste GPS-spor');
  }
});

