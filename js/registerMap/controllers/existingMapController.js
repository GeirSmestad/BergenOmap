import { listMaps } from '../services/apiClient.js';

const noop = () => {};

const formatMetaLine = (mapEntry) => {
  const metaParts = [
    mapEntry.map_area,
    mapEntry.map_event,
    mapEntry.map_date
  ].filter(Boolean);

  return metaParts.join(' • ');
};

export function createPreExistingMapController({
  listElement,
  filterElement,
  clearFilterButton,
  onMapRequested = noop
}) {
  let maps = [];
  let activeMapId = null;

  const clearList = () => {
    if (listElement) {
      listElement.innerHTML = '';
    }
  };

  const handleFilterInput = (event) => {
    const query = event.target.value.toLowerCase();
    const buttons = listElement.querySelectorAll('.pre-existing-map-card');
    
    buttons.forEach((button) => {
      const title = button.querySelector('.pre-existing-map-card__title');
      const shouldShow = !query || (title && title.textContent.toLowerCase().includes(query));
      button.style.display = shouldShow ? '' : 'none';
    });
  };

  const handleClearFilter = () => {
    if (filterElement) {
      filterElement.value = '';
      // Dispatch input event so the listener picks it up
      filterElement.dispatchEvent(new Event('input', { bubbles: true }));
      filterElement.focus();
    }
  };

  if (filterElement) {
    filterElement.addEventListener('input', handleFilterInput);
  }

  if (clearFilterButton) {
    clearFilterButton.addEventListener('click', handleClearFilter);
  }

  const setActiveState = () => {
    if (!listElement) {
      return;
    }

    listElement.querySelectorAll('[data-map-id]').forEach((button) => {
      const isActive = String(button.dataset.mapId) === String(activeMapId);
      button.classList.toggle('pre-existing-map-card--active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  };

  const handleMapSelection = (mapId) => {
    const mapEntry = maps.find((entry) => String(entry.map_id) === String(mapId));
    if (!mapEntry) {
      return;
    }

    if (String(activeMapId) === String(mapEntry.map_id)) {
      onMapRequested(mapEntry);
      return;
    }

    activeMapId = mapEntry.map_id;
    setActiveState();
    onMapRequested(mapEntry);
  };

  const loadPreExistingMapButton = (mapEntry) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pre-existing-map-card';
    button.dataset.mapId = mapEntry.map_id;
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', 'false');

    const title = document.createElement('p');
    title.className = 'pre-existing-map-card__title';
    title.textContent = mapEntry.map_name || 'Untitled map';

    const meta = document.createElement('p');
    meta.className = 'pre-existing-map-card__meta';
    const metaLine = formatMetaLine(mapEntry);
    meta.textContent = metaLine || mapEntry.map_filename || 'No metadata';

    button.appendChild(title);
    button.appendChild(meta);
    return button;
  };

  const renderMaps = () => {
    clearList();

    if (!listElement) {
      return;
    }

    if (!maps.length) {
      const emptyMessage = document.createElement('p');
      emptyMessage.className = 'pre-existing-map-card__meta';
      emptyMessage.textContent = 'No saved maps yet.';
      emptyMessage.style.margin = '0';
      listElement.appendChild(emptyMessage);
      return;
    }

    maps.forEach((mapEntry) => {
      listElement.appendChild(loadPreExistingMapButton(mapEntry));
    });

    setActiveState();

    if (filterElement && filterElement.value) {
      handleFilterInput({ target: filterElement });
    }
  };

  const handleListClick = (event) => {
    const button = event.target.closest('[data-map-id]');
    if (button) {
      handleMapSelection(button.dataset.mapId);
    }
  };

  if (listElement) {
    listElement.addEventListener('click', handleListClick);
  }

  const loadAvailableMaps = async () => {
    try {
      maps = await listMaps();
      maps.sort((a, b) => b.map_id - a.map_id);
      renderMaps();
    } catch (error) {
      console.error('Failed to load maps:', error);
      clearList();
    }
  };

  const getActiveMap = () => maps.find((mapEntry) => String(mapEntry.map_id) === String(activeMapId)) || null;

  const destroy = () => {
    if (listElement) {
      listElement.removeEventListener('click', handleListClick);
    }
    if (filterElement) {
      filterElement.removeEventListener('input', handleFilterInput);
    }
    if (clearFilterButton) {
      clearFilterButton.removeEventListener('click', handleClearFilter);
    }
  };

  return {
    loadAvailableMaps,
    handleMapSelection,
    getActiveMap,
    destroy
  };
}

