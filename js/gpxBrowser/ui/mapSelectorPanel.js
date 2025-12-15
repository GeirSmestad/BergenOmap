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
    searchInput,
    searchClearBtn
  } = elements;

  let isVisible = false;
  let currentSearchTerm = '';

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

    // Since we are changing structure to li.selected, we can just re-render
    renderList();
  }

  function renderList() {
    if (!list) {
      return;
    }

    const referencePoint = getReferencePoint();
    const { mapDefinitions, selectedMapName } = store.getState();

    // Filter
    const filteredDefinitions = mapDefinitions.filter(def => {
      if (!currentSearchTerm) return true;
      return def.map_name.toLowerCase().includes(currentSearchTerm.toLowerCase());
    });

    const entries = filteredDefinitions.map((definition) => {
      const center = getMapCenterCoords(definition);
      const distance =
        referencePoint && center
          ? calculateDistanceMeters(referencePoint, center)
          : null;
      return { definition, distance };
    });

    // Sort by distance
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
      emptyItem.textContent = 'Ingen kart funnet';
      fragment.appendChild(emptyItem);
    } else {
      entries.forEach(({ definition, distance }) => {
        const listItem = document.createElement('li');
        
        if (definition.map_name === selectedMapName) {
          listItem.classList.add('selected');
        }

        const contentBtn = document.createElement('button');
        contentBtn.type = 'button';
        contentBtn.className = 'map-selector-item';
        contentBtn.dataset.mapName = definition.map_name;


        const nameEl = document.createElement('span');
        nameEl.className = 'map-selector-item__name';
        nameEl.textContent = definition.map_name;

        const distanceEl = document.createElement('span');
        distanceEl.className = 'map-selector-item__distance';
        distanceEl.textContent = formatDistanceLabel(distance);

        contentBtn.appendChild(nameEl);
        contentBtn.appendChild(distanceEl);

        contentBtn.addEventListener('click', () => {
          if (typeof onMapSelected === 'function') {
            onMapSelected(definition);
          }
        });

        listItem.appendChild(contentBtn);

        // Add center button if selected
        if (definition.map_name === selectedMapName) {
          const centerBtn = document.createElement('button');
          centerBtn.type = 'button';
          centerBtn.className = 'map-selector-item__center-btn';
          centerBtn.ariaLabel = 'Sentrer kart';
          centerBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
            </svg>
          `;

          centerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const center = getMapCenterCoords(definition);
            if (center && map) {
              map.panTo(center);
            }
          });

          listItem.appendChild(centerBtn);
        }

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
      // Focus search input on open
      setTimeout(() => {
        searchInput?.focus();
      }, 100);
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

  function handleSearchInput(e) {
    currentSearchTerm = e.target.value;
    
    if (searchClearBtn) {
      searchClearBtn.hidden = !currentSearchTerm;
    }
    
    renderList();
  }

  function handleSearchClear() {
    currentSearchTerm = '';
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    if (searchClearBtn) {
      searchClearBtn.hidden = true;
    }
    renderList();
  }

  function wireEvents() {
    toggleButton?.addEventListener('click', toggleVisibility);
    
    searchInput?.addEventListener('input', handleSearchInput);
    searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        searchInput.blur();
      }
    });
    searchClearBtn?.addEventListener('click', handleSearchClear);
  }

  wireEvents();

  const unsubscribe = store.subscribe((state, prevState, change) => {
    // Re-render on map definitions change or selection change
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
    destroy() {
      unsubscribe();
      toggleButton?.removeEventListener('click', toggleVisibility);
      searchInput?.removeEventListener('input', handleSearchInput);
      searchClearBtn?.removeEventListener('click', handleSearchClear);
    }
  };
}
