export function createGpxListPanel({
  store,
  elements,
  onTrackSelected,
  onVisibilityChange
} = {}) {
  const { toggleButton, panel, list, modeAllInput, modeOnMapInput, searchInput, searchClearBtn } = elements ?? {};

  let isVisible = false;
  let errorMessage = null;
  let currentSearchTerm = '';

  const LIST_MODE = {
    ALL: 'all',
    ON_MAP: 'onMap'
  };

  let listMode = LIST_MODE.ALL;

  const modeAllLabel = modeAllInput?.closest('.gpx-selector-tab');
  const modeOnMapLabel = modeOnMapInput?.closest('.gpx-selector-tab');

  function updateModeUI() {
    const isAll = listMode === LIST_MODE.ALL;
    const isOnMap = listMode === LIST_MODE.ON_MAP;

    if (modeAllInput) {
      modeAllInput.checked = isAll;
    }
    if (modeOnMapInput) {
      modeOnMapInput.checked = isOnMap;
    }

    modeAllLabel?.classList.toggle('is-active', isAll);
    modeOnMapLabel?.classList.toggle('is-active', isOnMap);
  }

  function setListMode(nextMode) {
    if (listMode === nextMode) {
      renderIfVisible();
      return;
    }

    listMode = nextMode;
    updateModeUI();
    renderIfVisible();

    if (list) {
      list.scrollTop = 0;
    }
  }

  function filterTracksContainedWithinSelectedMap(state, tracks) {
    const { selectedMapName, mapDefinitions } = state;
    if (!selectedMapName) {
      return [];
    }

    const selectedMap = Array.isArray(mapDefinitions)
      ? mapDefinitions.find((definition) => definition?.map_name === selectedMapName)
      : null;

    const mapBounds = selectedMap ? getMapBounds(selectedMap) : null;
    if (!mapBounds) {
      return [];
    }

    return tracks.filter((track) => {
      const trackBounds = getTrackBounds(track);
      return trackBounds ? isBoundsContained(trackBounds, mapBounds) : false;
    });
  }

  function filterBySearchTerm(tracks) {
    if (!currentSearchTerm) {
      return tracks;
    }
    const term = currentSearchTerm.toLowerCase();
    return tracks.filter((track) => {
      const description = track.description || '';
      const username = track.username || '';
      return description.toLowerCase().includes(term) || username.toLowerCase().includes(term);
    });
  }

  function getVisibleTracks(state) {
    const { gpxTracks } = state;
    let tracks = gpxTracks;

    if (listMode === LIST_MODE.ON_MAP) {
      tracks = filterTracksContainedWithinSelectedMap(state, gpxTracks);
    }

    return filterBySearchTerm(tracks);
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
    toggleButton.textContent = nextVisibility ? 'Lukk' : 'Velg GPS-spor';

    if (typeof onVisibilityChange === 'function') {
      onVisibilityChange(isVisible);
    }
  }

  function toggleVisibility() {
    setVisibility(!isVisible);
  }

  function renderList() {
    if (!list) {
      return;
    }

    const state = store.getState();
    const { selectedTrackId, selectedMapName } = state;
    const visibleTracks = getVisibleTracks(state);

    const fragment = document.createDocumentFragment();

    if (errorMessage) {
      const errorItem = document.createElement('li');
      errorItem.className = 'gpx-selector-empty';
      errorItem.textContent = errorMessage;
      fragment.appendChild(errorItem);
    } else if (!visibleTracks.length) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'gpx-selector-empty';
      if (currentSearchTerm) {
        emptyItem.textContent = 'Ingen GPS-spor matcher søket';
      } else if (listMode === LIST_MODE.ON_MAP && !selectedMapName) {
        emptyItem.textContent = 'Velg et kart for å se spor i kartet';
      } else if (listMode === LIST_MODE.ON_MAP) {
        const hasAnyBounds = Array.isArray(state.gpxTracks) && state.gpxTracks.some((track) => Boolean(getTrackBounds(track)));
        emptyItem.textContent = hasAnyBounds
          ? 'Ingen GPX-spor i valgt kart'
          : 'GPX-spor mangler koordinatgrenser i databasen (kjør migrasjon/backfill)';
      } else {
        emptyItem.textContent = 'Ingen GPX-spor tilgjengelig';
      }
      fragment.appendChild(emptyItem);
    } else {
      visibleTracks.forEach((track) => {
        const listItem = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'gpx-selector-item';
        button.dataset.trackId = String(track.track_id);

        if (track.track_id === selectedTrackId) {
          button.classList.add('selected');
        }

        const descriptionEl = document.createElement('span');
        descriptionEl.className = 'gpx-selector-item__description';
        descriptionEl.textContent = track.description || `Spor ${track.track_id}`;

        const metaEl = document.createElement('span');
        metaEl.className = 'gpx-selector-item__meta';
        metaEl.textContent = track.username;

        button.appendChild(descriptionEl);
        button.appendChild(metaEl);

        button.addEventListener('click', () => {
          if (typeof onTrackSelected === 'function') {
            onTrackSelected(track);
          }
        });

        listItem.appendChild(button);
        fragment.appendChild(listItem);
      });
    }

    list.innerHTML = '';
    list.appendChild(fragment);
  }

  function renderIfVisible() {
    if (isVisible) {
      renderList();
    }
  }

  function showError(message) {
    errorMessage = message;
    renderIfVisible();
  }

  toggleButton?.addEventListener('click', toggleVisibility);

  function handleModeAllChange(event) {
    if (event.target.checked) {
      setListMode(LIST_MODE.ALL);
    }
  }

  function handleModeOnMapChange(event) {
    if (event.target.checked) {
      setListMode(LIST_MODE.ON_MAP);
    }
  }

  modeAllInput?.addEventListener('change', handleModeAllChange);
  modeOnMapInput?.addEventListener('change', handleModeOnMapChange);

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

  function handleSearchKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      searchInput.blur();
    }
  }

  searchInput?.addEventListener('input', handleSearchInput);
  searchInput?.addEventListener('keydown', handleSearchKeydown);
  searchClearBtn?.addEventListener('click', handleSearchClear);

  updateModeUI();

  const unsubscribe = store.subscribe((state, prevState, change) => {
    if (change?.type === 'gpxTracks') {
      renderIfVisible();
    }

    if (
      change?.type === 'selectedMapName' &&
      state.selectedMapName !== prevState.selectedMapName &&
      listMode === LIST_MODE.ON_MAP
    ) {
      renderIfVisible();
    }

    if (
      change?.type === 'selectedTrackId' &&
      state.selectedTrackId !== prevState.selectedTrackId
    ) {
      if (!list) {
        return;
      }

      list
        .querySelectorAll('.gpx-selector-item')
        .forEach((button) => {
          const trackId = Number(button.dataset.trackId);
          button.classList.toggle('selected', trackId === state.selectedTrackId);
        });
    }
  });

  return {
    show: () => setVisibility(true),
    hide: () => setVisibility(false),
    toggleVisibility,
    renderIfVisible,
    showError,
    destroy() {
      unsubscribe();
      toggleButton?.removeEventListener('click', toggleVisibility);
      modeAllInput?.removeEventListener('change', handleModeAllChange);
      modeOnMapInput?.removeEventListener('change', handleModeOnMapChange);
      searchInput?.removeEventListener('input', handleSearchInput);
      searchInput?.removeEventListener('keydown', handleSearchKeydown);
      searchClearBtn?.removeEventListener('click', handleSearchClear);
    }
  };
}

function getMapBounds(mapDefinition) {
  const nw = mapDefinition?.nw_coords;
  const se = mapDefinition?.se_coords;
  if (!Array.isArray(nw) || !Array.isArray(se) || nw.length < 2 || se.length < 2) {
    return null;
  }

  const latA = Number(nw[0]);
  const lonA = Number(nw[1]);
  const latB = Number(se[0]);
  const lonB = Number(se[1]);

  if (![latA, lonA, latB, lonB].every(Number.isFinite)) {
    return null;
  }

  return {
    minLat: Math.min(latA, latB),
    maxLat: Math.max(latA, latB),
    minLon: Math.min(lonA, lonB),
    maxLon: Math.max(lonA, lonB)
  };
}

function getTrackBounds(track) {
  if (!track) {
    return null;
  }

  const minLat = Number(track.min_lat);
  const minLon = Number(track.min_lon);
  const maxLat = Number(track.max_lat);
  const maxLon = Number(track.max_lon);

  if (![minLat, minLon, maxLat, maxLon].every(Number.isFinite)) {
    return null;
  }

  return { minLat, minLon, maxLat, maxLon };
}

function isBoundsContained(inner, outer) {
  return (
    inner.minLat >= outer.minLat &&
    inner.maxLat <= outer.maxLat &&
    inner.minLon >= outer.minLon &&
    inner.maxLon <= outer.maxLon
  );
}

