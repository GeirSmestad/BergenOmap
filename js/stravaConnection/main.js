import { AppMenu } from '../appMenu.js';
import {
  buildAuthorizeUrl,
  deleteImport,
  disconnectStrava,
  fetchStatus,
  gpxDownloadUrl,
  importActivities,
  listActivities,
  syncActivities
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
    importSelectedOverwriteBtn: document.getElementById('importSelectedOverwriteButton')
  };

  const selected = new Set();
  let currentStatus = null;

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
    const activities = await listActivities({ filter, text });

    els.activitiesList.innerHTML = '';
    els.availableCount.textContent = `${activities.length}`;

    activities.forEach((a) => {
      els.activitiesList.appendChild(buildActivityRow(a, { mode: 'available' }));
    });
  }

  async function refreshImported() {
    const imported = await listActivities({ filter: 'imported', text: '' });
    els.importedList.innerHTML = '';
    els.importedCount.textContent = `${imported.length}`;
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
      await syncActivities();
      await refreshLists();
    } catch (e) {
      showError(e.message);
    } finally {
      els.syncBtn.disabled = !(currentStatus && currentStatus.connected);
    }
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


