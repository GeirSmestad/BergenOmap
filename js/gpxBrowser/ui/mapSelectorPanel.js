import {
  calculateDistanceMeters,
  formatDistanceLabel,
  getMapCenterCoords
} from '../../mapBrowser/utils/geo.js';

export function createGpxMapSelectorPanel({
  store,
  map,
  elements,
  onMapSelected,
  onVisibilityChange
} = {}) {
  const {
    toggleButton,
    panel,
    list,
    modeNearViewportInput
  } = elements;

  const modeNearViewportLabel = modeNearViewportInput?.closest('.map-selector-mode');
  let isVisible = false;

  function getReferencePoint() {
    if (!map) {
      return null;
    }

    const boundsCenter = map.getBounds().getCenter();
    return { lat: boundsCenter.lat, lng: boundsCenter.lng };
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

    const nextVisibility = Boolean(shouldShow);
    if (isVisible === nextVisibility) {
      return;
    }

    if (nextVisibility) {
      renderList();
    }

    isVisible = nextVisibility;
    panel.classList.toggle('is-visible', nextVisibility);
    panel.setAttribute('aria-hidden', (!nextVisibility).toString());
    toggleButton.setAttribute('aria-expanded', nextVisibility ? 'true' : 'false');
    toggleButton.textContent = nextVisibility ? 'Lukk' : 'Velg kart';

    if (typeof onVisibilityChange === 'function') {
      onVisibilityChange(isVisible);
    }
  }

  function toggleVisibility() {
    setVisibility(!isVisible);
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

  function updateModeUI() {
    modeNearViewportInput.checked = true;
    modeNearViewportLabel?.classList.add('is-active');
  }

  toggleButton?.addEventListener('click', toggleVisibility);
  modeNearViewportInput?.addEventListener('change', () => {
    renderIfVisible();
  });

  const unsubscribe = store.subscribe((state, prevState, change) => {
    if (change?.type === 'mapDefinitions') {
      renderIfVisible();
    }

    if (change?.type === 'selectedMapName') {
      highlightSelectedListItem();
    }
  });

  updateModeUI();

  return {
    show: () => setVisibility(true),
    hide: () => setVisibility(false),
    toggleVisibility,
    renderIfVisible,
    scrollListToTop,
    destroy() {
      unsubscribe();
      toggleButton?.removeEventListener('click', toggleVisibility);
    }
  };
}

