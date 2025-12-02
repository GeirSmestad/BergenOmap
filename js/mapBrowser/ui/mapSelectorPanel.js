import { MAP_LIST_SOURCE } from '../config.js';
import {
  calculateDistanceMeters,
  formatDistanceLabel,
  getMapCenterCoords
} from '../utils/geo.js';

export function createMapSelectorPanel({
  store,
  map,
  elements,
  onMapSelected,
  onModeChange
} = {}) {
  const {
    toggleButton,
    panel,
    list,
    modeNearMeInput,
    modeNearViewportInput
  } = elements;

  const modeNearMeLabel = modeNearMeInput?.closest('.map-selector-mode');
  const modeNearViewportLabel = modeNearViewportInput?.closest('.map-selector-mode');
  const supportsNearMe = Boolean(modeNearMeInput);

  if (!supportsNearMe && store?.getState().mapListSource === MAP_LIST_SOURCE.NEAR_ME) {
    store.setMapListSource(MAP_LIST_SOURCE.NEAR_VIEWPORT);
  }

  let isVisible = false;

  function getReferencePoint() {
    const state = store.getState();

    if (state.mapListSource === MAP_LIST_SOURCE.NEAR_VIEWPORT && map) {
      const boundsCenter = map.getBounds().getCenter();
      return { lat: boundsCenter.lat, lng: boundsCenter.lng };
    }

    if (state.lastKnownLocation) {
      return {
        lat: state.lastKnownLocation.lat,
        lng: state.lastKnownLocation.lng
      };
    }

    return null;
  }

  function highlightSelectedListItem() {
    if (!list) {
      return;
    }

    const { selectedMapName } = store.getState();
    const buttons = list.querySelectorAll('.map-selector-item');
    buttons.forEach((button) => {
      const isSelected = button.dataset.mapName === selectedMapName;
      button.classList.toggle('selected', isSelected);
    });
  }

  function renderList() {
    if (!list) {
      return;
    }

    const referencePoint = getReferencePoint();
    const { mapDefinitions, selectedMapName } = store.getState();

    const entries = mapDefinitions.map((definition) => {
      const center = getMapCenterCoords(definition);
      const distance =
        referencePoint && center
          ? calculateDistanceMeters(referencePoint, center)
          : null;
      return { definition, distance };
    });

    entries.sort((a, b) => {
      if (a.distance === null && b.distance === null) {
        return a.definition.map_name.localeCompare(b.definition.map_name);
      }
      if (a.distance === null) {
        return 1;
      }
      if (b.distance === null) {
        return -1;
      }
      return a.distance - b.distance;
    });

    const fragment = document.createDocumentFragment();

    if (entries.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'map-selector-empty';
      emptyItem.textContent = 'No map overlays available';
      fragment.appendChild(emptyItem);
    } else {
      entries.forEach(({ definition, distance }) => {
        const listItem = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'map-selector-item';
        button.dataset.mapName = definition.map_name;

        if (definition.map_name === selectedMapName) {
          button.classList.add('selected');
        }

        const nameEl = document.createElement('span');
        nameEl.className = 'map-selector-item__name';
        nameEl.textContent = definition.map_name;

        const distanceEl = document.createElement('span');
        distanceEl.className = 'map-selector-item__distance';
        distanceEl.textContent = formatDistanceLabel(distance);

        button.appendChild(nameEl);
        button.appendChild(distanceEl);

        button.addEventListener('click', () => {
          if (typeof onMapSelected === 'function') {
            onMapSelected(definition);
          }
        });

        listItem.appendChild(button);
        fragment.appendChild(listItem);
      });
    }

    list.innerHTML = '';
    list.appendChild(fragment);
  }

  function setVisibility(shouldShow) {
    if (!panel || !toggleButton) {
      return;
    }

    if (shouldShow) {
      updateModeUI();
      renderList();
    }

    isVisible = shouldShow;
    panel.classList.toggle('is-visible', shouldShow);
    panel.setAttribute('aria-hidden', (!shouldShow).toString());
    toggleButton.setAttribute('aria-expanded', shouldShow ? 'true' : 'false');
    toggleButton.textContent = shouldShow ? 'Lukk' : 'Velg kart';
  }

  function toggleVisibility() {
    setVisibility(!isVisible);
  }

  function updateModeUI() {
    const currentSource = store.getState().mapListSource;
    const isNearMe = currentSource === MAP_LIST_SOURCE.NEAR_ME;
    const isNearViewport = currentSource === MAP_LIST_SOURCE.NEAR_VIEWPORT;

    if (modeNearMeInput) {
      modeNearMeInput.checked = isNearMe;
    }

    if (modeNearViewportInput) {
      modeNearViewportInput.checked = isNearViewport || !supportsNearMe;
    }

    modeNearMeLabel?.classList.toggle('is-active', isNearMe);
    modeNearViewportLabel?.classList.toggle('is-active', isNearViewport || !supportsNearMe);
  }

  function scrollListToTop() {
    if (list) {
      list.scrollTop = 0;
    }
  }

  function renderIfVisible() {
    if (isVisible) {
      renderList();
    }
  }

  function wireEvents() {
    toggleButton?.addEventListener('click', toggleVisibility);

    modeNearMeInput?.addEventListener('change', (event) => {
      if (event.target.checked && typeof onModeChange === 'function') {
        onModeChange(MAP_LIST_SOURCE.NEAR_ME);
      }
    });

    modeNearViewportInput?.addEventListener('change', (event) => {
      if (event.target.checked && typeof onModeChange === 'function') {
        onModeChange(MAP_LIST_SOURCE.NEAR_VIEWPORT);
      }
    });
  }

  wireEvents();

  const unsubscribe = store.subscribe((state, prevState, change) => {
    if (change?.type === 'mapListSource') {
      updateModeUI();
      renderIfVisible();
    }

    if (change?.type === 'mapDefinitions') {
      renderIfVisible();
    }

    if (change?.type === 'selectedMapName') {
      highlightSelectedListItem();
    }
  });

  return {
    show: () => setVisibility(true),
    hide: () => setVisibility(false),
    toggleVisibility,
    renderIfVisible,
    scrollListToTop,
    updateModeUI,
    destroy() {
      unsubscribe();
      toggleButton?.removeEventListener('click', toggleVisibility);
    }
  };
}

