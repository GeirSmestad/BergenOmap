import { AppMenu } from '../appMenu.js';
import {
  buildAuthorizeUrl,
  deleteImport,
  disconnectStrava,
  fetchStatus,
  gpxDownloadUrl,
  importActivities,
  listActivities,
  syncActivities,
  listMaps
} from './services/stravaService.js';

document.addEventListener('DOMContentLoaded', async () => {
  const appMenu = new AppMenu();

  const els = {
    statusPill: document.getElementById('connectionStatusPill'),
    details: document.getElementById('connectionDetails'),
    error: document.getElementById('errorBanner'),
    connectBtn: document.getElementById('connectButton'),
    disconnectBtn: document.getElementById('disconnectButton'),
    syncBtn: document.getElementById('syncButton'),
    filterSelect: document.getElementById('filterSelect'),
    searchInput: document.getElementById('searchInput'),
    activitiesList: document.getElementById('activitiesList'),
    availableCount: document.getElementById('availableCount'),
    importedList: document.getElementById('importedList'),
    importedCount: document.getElementById('importedCount'),
    importSelectedBtn: document.getElementById('importSelectedButton'),
    importSelectedOverwriteBtn: document.getElementById('importSelectedOverwriteButton'),
    selectAllBtn: document.getElementById('selectAllButton'),
    // Pill filter buttons
    filterRunBtn: document.getElementById('filterRun'),
    filterRaceBtn: document.getElementById('filterRace'),
    filterOnMyMapsBtn: document.getElementById('filterOnMyMaps'),
    // Date filters
    dateFromInput: document.getElementById('dateFrom'),
    dateToInput: document.getElementById('dateTo'),
    clearDatesBtn: document.getElementById('clearDatesBtn')
  };

  const selected = new Set();
  let currentStatus = null;
  let lastVisibleAvailableActivities = [];

  // Pill filter state (løping on by default)
  const pillFilters = {
    run: true,
    race: false,
    onMyMaps: false
  };

  // Map bounds cache for "på mine kart" filter
  let mapBoundsCache = null;

  function showError(message) {
    if (!message) {
      els.error.hidden = true;
      els.error.textContent = '';
      return;
    }
    els.error.hidden = false;
    els.error.textContent = message;
  }

  function setPill(mode, text) {
    els.statusPill.classList.remove('pill--ok', 'pill--warn', 'pill--neutral');
    if (mode === 'ok') els.statusPill.classList.add('pill--ok');
    else if (mode === 'warn') els.statusPill.classList.add('pill--warn');
    else els.statusPill.classList.add('pill--neutral');
    els.statusPill.textContent = text;
  }

  function formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function formatKm(meters) {
    if (typeof meters !== 'number' || !Number.isFinite(meters)) return '';
    return `${(meters / 1000).toFixed(2)} km`;
  }

  function updateImportButtons() {
    const has = selected.size > 0;
    els.importSelectedBtn.disabled = !has;
    els.importSelectedOverwriteBtn.disabled = !has;
  }

  function updatePillButtonState(btn, active) {
    if (active) {
      btn.classList.add('pill-toggle--active');
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.classList.remove('pill-toggle--active');
      btn.setAttribute('aria-pressed', 'false');
    }
  }

  function syncPillButtonStates() {
    updatePillButtonState(els.filterRunBtn, pillFilters.run);
    updatePillButtonState(els.filterRaceBtn, pillFilters.race);
    updatePillButtonState(els.filterOnMyMapsBtn, pillFilters.onMyMaps);
  }

  async function loadMapBounds() {
    if (mapBoundsCache !== null) return mapBoundsCache;
    try {
      const maps = await listMaps();
      mapBoundsCache = maps.map((m) => {
        const nw = m.nw_coords;
        const se = m.se_coords;
        if (!Array.isArray(nw) || !Array.isArray(se) || nw.length !== 2 || se.length !== 2) {
          return null;
        }
        const nwLat = parseFloat(nw[0]);
        const nwLon = parseFloat(nw[1]);
        const seLat = parseFloat(se[0]);
        const seLon = parseFloat(se[1]);
        if ([nwLat, nwLon, seLat, seLon].some(Number.isNaN)) return null;
        return {
          minLat: Math.min(nwLat, seLat),
          maxLat: Math.max(nwLat, seLat),
          minLon: Math.min(nwLon, seLon),
          maxLon: Math.max(nwLon, seLon)
        };
      }).filter(Boolean);
    } catch (e) {
      console.error('Failed to load map bounds:', e);
      mapBoundsCache = [];
    }
    return mapBoundsCache;
  }

  function pointInAnyMapBounds(lat, lon, bounds) {
    if (lat == null || lon == null) return false;
    const latF = parseFloat(lat);
    const lonF = parseFloat(lon);
    if (Number.isNaN(latF) || Number.isNaN(lonF)) return false;
    return bounds.some((b) => latF >= b.minLat && latF <= b.maxLat && lonF >= b.minLon && lonF <= b.maxLon);
  }

  async function applyPillFilters(activities) {
    let result = activities;

    // Filter by type=Run (case-insensitive)
    if (pillFilters.run) {
      result = result.filter((a) => {
        const type = (a.type || '').toLowerCase();
        return type === 'run';
      });
    }

    // Filter by workout_type containing "race" (case-insensitive)
    if (pillFilters.race) {
      result = result.filter((a) => {
        const wt = (a.workout_type || '').toLowerCase();
        return wt.includes('race');
      });
    }

    // Filter by start point being on one of my maps
    if (pillFilters.onMyMaps) {
      const bounds = await loadMapBounds();
      result = result.filter((a) => pointInAnyMapBounds(a.start_lat, a.start_lon, bounds));
    }

    return result;
  }

  function _parseIsoDateOnlyToUtcMs(dateOnly) {
    // Expects "YYYY-MM-DD"
    if (!dateOnly || typeof dateOnly !== 'string') return null;
    const parts = dateOnly.split('-').map((x) => Number(x));
    if (parts.length !== 3) return null;
    const [y, m, d] = parts;
    if (![y, m, d].every(Number.isFinite)) return null;
    // UTC midnight
    return Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  }

  function getSelectedDateRange() {
    const fromStr = els.dateFromInput?.value || '';
    const toStr = els.dateToInput?.value || '';

    const fromUtcMs = _parseIsoDateOnlyToUtcMs(fromStr);
    const toUtcMs = _parseIsoDateOnlyToUtcMs(toStr);

    // Inclusive "to" in UI, implemented as < (to + 1 day at 00:00 UTC)
    const toExclusiveUtcMs = toUtcMs != null ? (toUtcMs + 24 * 60 * 60 * 1000) : null;

    return {
      fromUtcMs: fromUtcMs,
      toExclusiveUtcMs: toExclusiveUtcMs
    };
  }

  function applyDateFilters(activities) {
    const { fromUtcMs, toExclusiveUtcMs } = getSelectedDateRange();
    if (fromUtcMs == null && toExclusiveUtcMs == null) {
      return activities;
    }

    return activities.filter((a) => {
      const start = a?.start_date;
      if (!start) return true; // best-effort: keep unknowns
      const dt = new Date(start);
      const ms = dt.getTime();
      if (!Number.isFinite(ms)) return true;
      if (fromUtcMs != null && ms < fromUtcMs) return false;
      if (toExclusiveUtcMs != null && ms >= toExclusiveUtcMs) return false;
      return true;
    });
  }

  function buildActivityRow(activity, { mode }) {
    const li = document.createElement('li');
    li.className = 'list-item';

    const main = document.createElement('div');
    main.className = 'list-item__main';

    const title = document.createElement('p');
    title.className = 'list-item__title';

    if (mode === 'available') {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'checkbox';
      checkbox.checked = selected.has(activity.activity_id);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selected.add(activity.activity_id);
        else selected.delete(activity.activity_id);
        updateImportButtons();
      });
      title.appendChild(checkbox);
    }

    const titleText = document.createElement('span');
    titleText.textContent = activity.name || `Aktivitet ${activity.activity_id}`;
    title.appendChild(titleText);

    const meta = document.createElement('p');
    meta.className = 'list-item__meta';
    const parts = [
      activity.type ? activity.type : null,
      activity.start_date ? formatDate(activity.start_date) : null,
      activity.distance != null ? formatKm(activity.distance) : null,
      activity.has_gpx ? 'Importert' : null
    ].filter(Boolean);
    meta.textContent = parts.join(' · ');

    main.appendChild(title);
    main.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'list-item__actions';

    if (mode === 'available') {
      const importBtn = document.createElement('button');
      importBtn.className = 'button button--primary';
      importBtn.type = 'button';
      importBtn.textContent = activity.has_gpx ? 'Importer på nytt' : 'Importer';
      importBtn.addEventListener('click', async () => {
        try {
          showError(null);
          await importActivities([activity.activity_id], { overwrite: Boolean(activity.has_gpx) });
          await refreshLists();
        } catch (e) {
          showError(e.message);
        }
      });
      actions.appendChild(importBtn);
    } else if (mode === 'imported') {
      const downloadLink = document.createElement('a');
      downloadLink.className = 'link';
      downloadLink.href = gpxDownloadUrl(activity.activity_id);
      downloadLink.textContent = 'Last ned GPX';
      downloadLink.target = '_blank';
      downloadLink.rel = 'noreferrer';
      actions.appendChild(downloadLink);

      const reimportBtn = document.createElement('button');
      reimportBtn.className = 'button button--secondary';
      reimportBtn.type = 'button';
      reimportBtn.textContent = 'Importer på nytt';
      reimportBtn.addEventListener('click', async () => {
        try {
          showError(null);
          await importActivities([activity.activity_id], { overwrite: true });
          await refreshLists();
        } catch (e) {
          showError(e.message);
        }
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'button button--danger';
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Slett';
      deleteBtn.addEventListener('click', async () => {
        try {
          showError(null);
          await deleteImport(activity.activity_id);
          await refreshLists();
        } catch (e) {
          showError(e.message);
        }
      });

      actions.appendChild(reimportBtn);
      actions.appendChild(deleteBtn);
    }

    li.appendChild(main);
    li.appendChild(actions);
    return li;
  }

  async function refreshStatus() {
    setPill('neutral', 'Laster…');
    els.details.textContent = '';
    els.syncBtn.disabled = true;
    els.disconnectBtn.hidden = true;
    els.connectBtn.hidden = false;
    currentStatus = null;

    const status = await fetchStatus();
    currentStatus = status;

    if (status.connected) {
      setPill('ok', 'Tilkoblet');
      els.connectBtn.hidden = true;
      els.disconnectBtn.hidden = false;
      els.syncBtn.disabled = false;
      els.details.textContent = status.athlete_id ? `Athlete ID: ${status.athlete_id}` : 'Tilkoblet.';
    } else {
      setPill('warn', 'Ikke tilkoblet');
      els.connectBtn.hidden = false;
      els.disconnectBtn.hidden = true;
      els.syncBtn.disabled = true;
      els.details.textContent = 'Koble til Strava for å kunne synkronisere aktiviteter.';
    }
  }

  async function refreshAvailable() {
    const filter = els.filterSelect.value;
    const text = els.searchInput.value.trim();
    let activities = await listActivities({ filter, text });

    // Apply pill filters on the frontend
    activities = await applyPillFilters(activities);
    // Apply date filters on the frontend
    activities = applyDateFilters(activities);

    els.activitiesList.innerHTML = '';
    els.availableCount.textContent = `(${activities.length})`;
    lastVisibleAvailableActivities = activities;

    activities.forEach((a) => {
      els.activitiesList.appendChild(buildActivityRow(a, { mode: 'available' }));
    });
  }

  async function refreshImported() {
    let imported = await listActivities({ filter: 'imported', text: '' });

    // Apply pill filters on the frontend
    imported = await applyPillFilters(imported);
    // Apply date filters on the frontend
    imported = applyDateFilters(imported);

    els.importedList.innerHTML = '';
    els.importedCount.textContent = `(${imported.length})`;
    imported.forEach((a) => {
      els.importedList.appendChild(buildActivityRow(a, { mode: 'imported' }));
    });
  }

  async function refreshLists() {
    await refreshAvailable();
    await refreshImported();
  }

  els.connectBtn.addEventListener('click', () => {
    const returnTo = window.location.href;
    window.location.href = buildAuthorizeUrl(returnTo);
  });

  els.disconnectBtn.addEventListener('click', async () => {
    try {
      showError(null);
      await disconnectStrava();
      await refreshStatus();
      await refreshLists();
    } catch (e) {
      showError(e.message);
    }
  });

  els.syncBtn.addEventListener('click', async () => {
    try {
      showError(null);
      els.syncBtn.disabled = true;
      const { fromUtcMs, toExclusiveUtcMs } = getSelectedDateRange();
      const after = fromUtcMs != null ? Math.floor(fromUtcMs / 1000) : null;
      const before = toExclusiveUtcMs != null ? Math.floor(toExclusiveUtcMs / 1000) : null;
      await syncActivities({ after, before });
      await refreshLists();
    } catch (e) {
      showError(e.message);
    } finally {
      els.syncBtn.disabled = !(currentStatus && currentStatus.connected);
    }
  });

  function handleDateChange() {
    refreshLists().catch((e) => showError(e.message));
  }

  els.dateFromInput?.addEventListener('change', handleDateChange);
  els.dateToInput?.addEventListener('change', handleDateChange);

  els.clearDatesBtn?.addEventListener('click', () => {
    if (els.dateFromInput) els.dateFromInput.value = '';
    if (els.dateToInput) els.dateToInput.value = '';
    handleDateChange();
  });

  els.filterSelect.addEventListener('change', async () => {
    try {
      await refreshAvailable();
    } catch (e) {
      showError(e.message);
    }
  });

  let searchDebounce = null;
  els.searchInput.addEventListener('input', () => {
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(async () => {
      try {
        await refreshAvailable();
      } catch (e) {
        showError(e.message);
      }
    }, 200);
  });

  els.importSelectedBtn.addEventListener('click', async () => {
    try {
      showError(null);
      const ids = Array.from(selected);
      await importActivities(ids, { overwrite: false });
      selected.clear();
      updateImportButtons();
      await refreshLists();
    } catch (e) {
      showError(e.message);
    }
  });

  els.importSelectedOverwriteBtn.addEventListener('click', async () => {
    try {
      showError(null);
      const ids = Array.from(selected);
      await importActivities(ids, { overwrite: true });
      selected.clear();
      updateImportButtons();
      await refreshLists();
    } catch (e) {
      showError(e.message);
    }
  });

  els.selectAllBtn?.addEventListener('click', async () => {
    try {
      showError(null);
      lastVisibleAvailableActivities.forEach((a) => {
        if (a && a.activity_id != null) selected.add(a.activity_id);
      });
      updateImportButtons();
      await refreshAvailable(); // re-render checkboxes for visible list
    } catch (e) {
      showError(e.message);
    }
  });

  // Pill filter toggle handlers
  els.filterRunBtn.addEventListener('click', async () => {
    pillFilters.run = !pillFilters.run;
    syncPillButtonStates();
    try {
      await refreshLists();
    } catch (e) {
      showError(e.message);
    }
  });

  els.filterRaceBtn.addEventListener('click', async () => {
    pillFilters.race = !pillFilters.race;
    syncPillButtonStates();
    try {
      await refreshLists();
    } catch (e) {
      showError(e.message);
    }
  });

  els.filterOnMyMapsBtn.addEventListener('click', async () => {
    pillFilters.onMyMaps = !pillFilters.onMyMaps;
    syncPillButtonStates();
    try {
      await refreshLists();
    } catch (e) {
      showError(e.message);
    }
  });

  // Initialize pill button visual states
  syncPillButtonStates();

  updateImportButtons();

  try {
    await refreshStatus();
    await refreshLists();
  } catch (e) {
    showError(e.message);
  }

  // Debug handles
  window.d_appMenu = appMenu;
});


