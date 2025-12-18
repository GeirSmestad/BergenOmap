export function createGpxListPanel({
  store,
  elements,
  onTrackSelected,
  onVisibilityChange
} = {}) {
  const { toggleButton, panel, list, modeAllInput, modeOnMapInput } = elements ?? {};

  let isVisible = false;
  let errorMessage = null;

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

  function filterTracksIntersectingSelectedMap(tracks, selectedMapName) {
    // TODO: Replace with real intersection logic (client-side geometry or server-side filtering).
    // Keep this as a single hook so we can swap the implementation later without UI changes.
    void selectedMapName;
    return tracks;
  }

  function getVisibleTracks({ gpxTracks, selectedMapName }) {
    if (listMode === LIST_MODE.ON_MAP) {
      if (!selectedMapName) {
        return [];
      }
      return filterTracksIntersectingSelectedMap(gpxTracks, selectedMapName);
    }

    return gpxTracks;
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

    const { gpxTracks, selectedTrackId, selectedMapName } = store.getState();
    const visibleTracks = getVisibleTracks({ gpxTracks, selectedMapName });

    const fragment = document.createDocumentFragment();

    if (errorMessage) {
      const errorItem = document.createElement('li');
      errorItem.className = 'gpx-selector-empty';
      errorItem.textContent = errorMessage;
      fragment.appendChild(errorItem);
    } else if (!visibleTracks.length) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'gpx-selector-empty';
      if (listMode === LIST_MODE.ON_MAP && !selectedMapName) {
        emptyItem.textContent = 'Velg et kart for å se spor i kartet';
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
    }
  };
}

