export function createGpxListPanel({
  store,
  elements,
  onTrackSelected,
  onVisibilityChange
} = {}) {
  const { toggleButton, panel, list } = elements ?? {};

  let isVisible = false;
  let errorMessage = null;

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

    const { gpxTracks, selectedTrackId } = store.getState();

    const fragment = document.createDocumentFragment();

    if (errorMessage) {
      const errorItem = document.createElement('li');
      errorItem.className = 'gpx-selector-empty';
      errorItem.textContent = errorMessage;
      fragment.appendChild(errorItem);
    } else if (!gpxTracks.length) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'gpx-selector-empty';
      emptyItem.textContent = 'Ingen GPX-spor tilgjengelig';
      fragment.appendChild(emptyItem);
    } else {
      gpxTracks.forEach((track) => {
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

  const unsubscribe = store.subscribe((state, prevState, change) => {
    if (change?.type === 'gpxTracks') {
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
    }
  };
}

