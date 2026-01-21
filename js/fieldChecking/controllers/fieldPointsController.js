import { POINT_LABEL_MIN_ZOOM } from '../config.js';
import {
  createStoredPoint,
  deleteStoredPoint,
  listStoredPoints,
  updateStoredPoint
} from '../services/storedPointsService.js';

function buildMarkerHtml({ description, showLabel }) {
  const safeDescription = (description || '').trim();
  const labelStyle = showLabel ? '' : 'style="display:none"';
  return `
    <div class="field-point-marker">
      <div class="field-point-marker__pin"></div>
      <div class="field-point-marker__label" ${labelStyle}>${escapeHtml(safeDescription)}</div>
    </div>
  `;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function createFieldPointsController({
  map,
  store,
  elements
} = {}) {
  if (!map) {
    throw new Error('createFieldPointsController requires a Leaflet map instance');
  }

  const els = elements || {};
  const markButton = els.markButton;
  const modal = els.modal;
  const modalTitle = els.modalTitle;
  const modalDescription = els.modalDescription;
  const modalError = els.modalError;
  const modalCancelButton = els.modalCancelButton;
  const modalOkButton = els.modalOkButton;
  const modalBackdrop = els.modalBackdrop;
  const contextMenu = els.contextMenu;

  const pointsById = new Map();
  const markersById = new Map();

  let confirmDeleteForId = null;
  let openMenuForId = null;

  let activeModal = null; // { mode, pointId, onSubmit }

  const labelShouldBeVisible = () => map.getZoom() >= POINT_LABEL_MIN_ZOOM;

  const updateMarkButtonEnabled = () => {
    if (!markButton || !store) {
      return;
    }
    const state = store.getState();
    markButton.disabled = !(state?.lastKnownLocation);
  };

  const buildLeafletIcon = (point) => {
    const icon = L.divIcon({
      className: 'field-point-icon',
      html: buildMarkerHtml({
        description: point.description,
        showLabel: labelShouldBeVisible()
      }),
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    return icon;
  };

  const addOrUpdateMarker = (point) => {
    const latlng = L.latLng(point.lat, point.lon);
    const existing = markersById.get(point.id);
    if (existing) {
      existing.setLatLng(latlng);
      existing.setIcon(buildLeafletIcon(point));
      return existing;
    }

    const marker = L.marker(latlng, {
      icon: buildLeafletIcon(point),
      interactive: true,
      keyboard: false,
      zIndexOffset: 1000
    });

    marker.on('click', (event) => {
      if (event?.originalEvent) {
        event.originalEvent.preventDefault();
        event.originalEvent.stopPropagation();
      }
      openContextMenu(point.id);
    });

    marker.addTo(map);
    markersById.set(point.id, marker);
    return marker;
  };

  const removeMarker = (pointId) => {
    const marker = markersById.get(pointId);
    if (marker) {
      marker.remove();
    }
    markersById.delete(pointId);
  };

  const syncLabelVisibility = () => {
    // Update icons so labels show/hide according to current zoom.
    for (const point of pointsById.values()) {
      const marker = markersById.get(point.id);
      if (!marker) continue;
      marker.setIcon(buildLeafletIcon(point));
    }
  };

  const closeContextMenu = () => {
    if (!contextMenu) return;
    contextMenu.classList.remove('is-visible');
    contextMenu.setAttribute('aria-hidden', 'true');
    contextMenu.innerHTML = '';
    confirmDeleteForId = null;
    openMenuForId = null;
  };

  const isClickInsideContextMenu = (target) => {
    if (!contextMenu) return false;
    return contextMenu.contains(target);
  };

  const handleDocumentClick = (event) => {
    if (!openMenuForId) return;
    if (isClickInsideContextMenu(event.target)) return;
    closeContextMenu();
  };

  const positionContextMenuForPoint = (pointId) => {
    if (!contextMenu) return;
    const point = pointsById.get(pointId);
    const marker = markersById.get(pointId);
    if (!point || !marker) return;

    const container = map.getContainer();
    const rect = container.getBoundingClientRect();
    const p = map.latLngToContainerPoint(marker.getLatLng());
    const x = rect.left + p.x + 12;
    const y = rect.top + p.y - 12;

    contextMenu.style.left = `${Math.round(x)}px`;
    contextMenu.style.top = `${Math.round(y)}px`;
  };

  const renderContextMenu = (pointId) => {
    if (!contextMenu) return;
    const point = pointsById.get(pointId);
    if (!point) return;

    contextMenu.innerHTML = '';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'field-point-context-menu__item';
    editBtn.textContent = 'Rediger';
    editBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeContextMenu();
      openEditModal(pointId);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    const isConfirm = confirmDeleteForId === pointId;
    deleteBtn.className = `field-point-context-menu__item ${isConfirm ? 'field-point-context-menu__item--danger' : ''}`;
    deleteBtn.textContent = isConfirm
      ? 'Er du sikker på at du vil slette merket?'
      : 'Slett';

    deleteBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (confirmDeleteForId !== pointId) {
        confirmDeleteForId = pointId;
        renderContextMenu(pointId);
        positionContextMenuForPoint(pointId);
        return;
      }

      try {
        await deleteStoredPoint(pointId);
        pointsById.delete(pointId);
        removeMarker(pointId);
        closeContextMenu();
      } catch (err) {
        console.error('Failed to delete stored point', err);
        // Keep menu open; reset confirmation so user can try again.
        confirmDeleteForId = null;
        renderContextMenu(pointId);
      }
    });

    contextMenu.appendChild(editBtn);
    contextMenu.appendChild(deleteBtn);
  };

  const openContextMenu = (pointId) => {
    if (!contextMenu) return;

    openMenuForId = pointId;
    confirmDeleteForId = null;
    renderContextMenu(pointId);
    positionContextMenuForPoint(pointId);

    contextMenu.classList.add('is-visible');
    contextMenu.setAttribute('aria-hidden', 'false');
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
    if (modalError) modalError.textContent = '';
    activeModal = null;
  };

  const openModal = ({ title, initialDescription, onSubmit }) => {
    if (!modal || !modalDescription || !modalTitle) return;
    modalTitle.textContent = title;
    modalDescription.value = initialDescription || '';
    if (modalError) modalError.textContent = '';
    modal.classList.add('is-visible');
    modal.setAttribute('aria-hidden', 'false');
    modalDescription.focus();
    activeModal = { onSubmit };
  };

  const handleModalOk = async () => {
    if (!activeModal?.onSubmit) {
      closeModal();
      return;
    }
    if (modalOkButton) {
      modalOkButton.disabled = true;
    }

    const desc = (modalDescription?.value || '').trim();
    try {
      await activeModal.onSubmit(desc);
      closeModal();
    } catch (err) {
      if (modalError) {
        modalError.textContent = err?.message || 'Noe gikk galt';
      }
    } finally {
      if (modalOkButton) {
        modalOkButton.disabled = false;
      }
    }
  };

  const openCreateModal = () => {
    if (!store) return;
    const state = store.getState();
    const loc = state?.lastKnownLocation;
    const accuracy = state?.lastKnownAccuracy;
    if (!loc) {
      return;
    }

    openModal({
      title: 'Ny markør',
      initialDescription: '',
      onSubmit: async (description) => {
        const point = await createStoredPoint({
          lat: loc.lat,
          lon: loc.lng,
          precision_meters: typeof accuracy === 'number' ? Math.round(accuracy) : null,
          description
        });

        pointsById.set(point.id, point);
        addOrUpdateMarker(point);
        syncLabelVisibility();
      }
    });
  };

  const openEditModal = (pointId) => {
    const point = pointsById.get(pointId);
    if (!point) return;

    openModal({
      title: 'Rediger markør',
      initialDescription: point.description || '',
      onSubmit: async (description) => {
        const updated = await updateStoredPoint(pointId, { description });
        pointsById.set(pointId, updated);
        addOrUpdateMarker(updated);
        syncLabelVisibility();
      }
    });
  };

  const bindUi = () => {
    if (markButton) {
      markButton.addEventListener('click', (e) => {
        e.preventDefault();
        openCreateModal();
      });
    }

    if (modalCancelButton) {
      modalCancelButton.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
      });
    }

    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
      });
    }

    if (modalOkButton) {
      modalOkButton.addEventListener('click', (e) => {
        e.preventDefault();
        handleModalOk();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeContextMenu();
        closeModal();
      }
    });

    document.addEventListener('click', handleDocumentClick);
    map.on('zoomend', syncLabelVisibility);
    map.on('move', () => {
      if (openMenuForId) {
        positionContextMenuForPoint(openMenuForId);
      }
    });
  };

  const unbindUi = () => {
    document.removeEventListener('click', handleDocumentClick);
    map.off('zoomend', syncLabelVisibility);
  };

  const loadInitialPoints = async () => {
    const points = await listStoredPoints();
    (Array.isArray(points) ? points : []).forEach((p) => {
      if (!p || p.id == null) return;
      pointsById.set(p.id, p);
      addOrUpdateMarker(p);
    });
    syncLabelVisibility();
  };

  let unsubscribe = null;
  if (store) {
    updateMarkButtonEnabled();
    unsubscribe = store.subscribe((state, prev, change) => {
      if (change?.type === 'location') {
        updateMarkButtonEnabled();
      }
    });
  }

  bindUi();
  loadInitialPoints().catch((err) => console.error('Failed to load stored points', err));

  return {
    reload: loadInitialPoints,
    destroy() {
      if (unsubscribe) unsubscribe();
      unbindUi();
      closeContextMenu();
      closeModal();
      for (const marker of markersById.values()) {
        marker.remove();
      }
      markersById.clear();
      pointsById.clear();
    }
  };
}

