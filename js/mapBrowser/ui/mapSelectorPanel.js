import {
  calculateDistanceMeters,
  formatDistanceLabel,
  getMapCenterCoords
} from '../utils/geo.js';

export function createMapSelectorPanel({
  store,
  map,
  elements,
  onMapSelected
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
    if (map) {
      const boundsCenter = map.getBounds().getCenter();
      return { lat: boundsCenter.lat, lng: boundsCenter.lng };
    }
    return null;
  }

  function highlightSelectedListItem() {
    if (!list) {
      return;
    }

    const { selectedMapName } = store.getState();
    const items = list.querySelectorAll('.map-selector-item');
    
    // Also handle the center button visibility/existence if we re-render on selection change
    // But since we re-render the whole list on selection change (via store subscription),
    // we might not need this specific function if renderList does it all.
    // However, store subscription only calls highlightSelectedListItem on 'selectedMapName' change?
    // Let's check the subscription at the bottom.
    // It calls highlightSelectedListItem. 
    // If I change the structure to include/exclude button based on selection, 
    // I should probably re-render the list or manually add/remove the button here.
    // Re-rendering is safer and easier.
    
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M2 12l20 0m-8-8l8 8-8 8" stroke="none" />
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
            </svg>
          `;
          // Better paper plane icon
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
              // Also close panel on mobile? Optional.
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
    searchClearBtn?.addEventListener('click', handleSearchClear);
  }

  wireEvents();

  const unsubscribe = store.subscribe((state, prevState, change) => {
    // Re-render on map definitions change or selection change
    if (change?.type === 'mapDefinitions') {
      renderIfVisible();
    }

    if (change?.type === 'selectedMapName') {
      // We re-render the whole list to show/hide the center button
      renderIfVisible();
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
