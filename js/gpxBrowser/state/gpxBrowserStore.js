import { MAP_LIST_SOURCE } from '../../mapBrowser/config.js';

const defaultState = {
  mapDefinitions: [],
  selectedMapName: null,
  selectedTrackId: null,
  gpxTracks: [],
  mapListSource: MAP_LIST_SOURCE.NEAR_VIEWPORT
};

export class GpxBrowserStore {
  constructor(initialState = {}) {
    this.state = {
      ...defaultState,
      ...initialState
    };
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }

    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  update(partialState, change = null) {
    const previousState = this.state;
    this.state = {
      ...previousState,
      ...partialState
    };

    this.listeners.forEach((listener) => {
      listener(this.state, previousState, change);
    });
  }

  setMapDefinitions(definitions) {
    this.update(
      { mapDefinitions: Array.isArray(definitions) ? definitions : [] },
      { type: 'mapDefinitions' }
    );
  }

  setGpxTracks(tracks) {
    this.update(
      { gpxTracks: Array.isArray(tracks) ? tracks : [] },
      { type: 'gpxTracks' }
    );
  }

  setSelectedMapName(mapName) {
    this.update(
      { selectedMapName: mapName ?? null },
      { type: 'selectedMapName' }
    );
  }

  setSelectedTrackId(trackId) {
    this.update(
      { selectedTrackId: typeof trackId === 'number' ? trackId : null },
      { type: 'selectedTrackId' }
    );
  }

  setMapListSource(source) {
    if (!Object.values(MAP_LIST_SOURCE).includes(source)) {
      return;
    }

    this.update({ mapListSource: source }, { type: 'mapListSource' });
  }
}

