import { API_BASE, MAP_LIST_SOURCE } from '../mapBrowser/config.js';
import { createMapController } from '../mapBrowser/controllers/mapController.js';
import { createMapSelectorPanel } from '../mapBrowser/ui/mapSelectorPanel.js';
import { fetchMapDefinitions } from '../mapBrowser/services/mapDataService.js';
import { fetchUserTracks } from './services/gpxTrackService.js';
import { createGpxListPanel } from './ui/gpxListPanel.js';
import { GpxBrowserStore } from './state/gpxBrowserStore.js';

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
    store,
    onViewportMoved: () => {
      if (store.getState().mapListSource === MAP_LIST_SOURCE.NEAR_VIEWPORT) {
        mapSelectorPanel?.renderIfVisible();
      }
    }
  });

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

  const mapSelectorPanel = createMapSelectorPanel({
    store,
    map: mapController.map,
    elements: mapSelectorElements,
    onMapSelected: handleMapSelection,
    onModeChange: handleMapSelectorModeChange
  });

  mapSelectorPanel.updateModeUI();

  const gpxListPanel = createGpxListPanel({
    store,
    elements: {
      toggleButton: document.getElementById('gpxSelectorToggle'),
      panel: document.getElementById('gpxSelectorPanel'),
      list: document.getElementById('gpxSelectorList')
    },
    onTrackSelected: (track) => {
      const selectedId = store.getState().selectedTrackId;
      if (selectedId === track.track_id) {
        store.setSelectedTrackId(null);
        return;
      }

      store.setSelectedTrackId(track.track_id);
    }
  });

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
    gpxListPanel.showError('Kunne ikke laste GPX-spor');
  }
});

