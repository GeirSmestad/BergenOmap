import { MAP_LIST_SOURCE } from '../config.js';

const defaultState = {
  mapDefinitions: [],
  selectedMapName: null,
  lastKnownLocation: null,
  lastKnownAccuracy: null,
  userHasInteractedWithMap: false,
  hasReceivedInitialLocation: false,
  mapListSource: MAP_LIST_SOURCE.NEAR_ME,
  toggleButtons: {
    followPosition: false
  }
};

export class MapBrowserStore {
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
    const prevState = this.state;
    this.state = {
      ...prevState,
      ...partialState
    };

    this.listeners.forEach((listener) => {
      listener(this.state, prevState, change);
    });
  }

  setMapDefinitions(definitions) {
    const normalized = Array.isArray(definitions) ? definitions : [];
    this.update({ mapDefinitions: normalized }, { type: 'mapDefinitions' });
  }

  setSelectedMapName(mapName) {
    this.update({ selectedMapName: mapName ?? null }, { type: 'selectedMapName' });
  }

  setLastKnownLocation(latlng) {
    this.update({ lastKnownLocation: latlng ?? null }, { type: 'location' });
  }

  setLastKnownAccuracy(accuracy) {
    const normalized = typeof accuracy === 'number' ? accuracy : null;
    this.update({ lastKnownAccuracy: normalized }, { type: 'location' });
  }

  setUserHasInteractedWithMap(hasInteracted = true) {
    this.update({ userHasInteractedWithMap: Boolean(hasInteracted) }, { type: 'interaction' });
  }

  setHasReceivedInitialLocation(hasReceived = true) {
    this.update({ hasReceivedInitialLocation: Boolean(hasReceived) }, { type: 'initialLocation' });
  }

  setMapListSource(source) {
    if (!Object.values(MAP_LIST_SOURCE).includes(source)) {
      return;
    }

    this.update({ mapListSource: source }, { type: 'mapListSource' });
  }

  setFollowPositionEnabled(isEnabled) {
    this.update({
      toggleButtons: {
        ...this.state.toggleButtons,
        followPosition: Boolean(isEnabled)
      }
    }, { type: 'followPosition' });
  }

  toggleFollowPosition() {
    const nextValue = !this.state.toggleButtons.followPosition;
    this.setFollowPositionEnabled(nextValue);
  }
}

