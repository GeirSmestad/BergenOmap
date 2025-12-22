import { API_BASE } from '../../mapBrowser/config.js';
import { redirectToLoginOnExpiredSession } from '../../utils/apiUtils.js';

async function requestJson(path, { method = 'GET', body = null, headers = {} } = {}) {
  const url = `${API_BASE}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    redirectToLoginOnExpiredSession(response);
    const message = await safeReadError(response);
    throw new Error(message || `Request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function safeReadError(response) {
  try {
    const data = await response.json();
    return data?.error;
  } catch (_) {
    return null;
  }
}

export function buildAuthorizeUrl(returnToUrl) {
  const qs = new URLSearchParams();
  if (returnToUrl) {
    qs.set('return_to', returnToUrl);
  }
  return `${API_BASE}/api/strava/authorize?${qs.toString()}`;
}

export async function fetchStatus() {
  return requestJson('/api/strava/status');
}

export async function disconnectStrava() {
  return requestJson('/api/strava/disconnect', { method: 'POST', body: {} });
}

export async function syncActivities({ after = null, before = null } = {}) {
  const body = {};
  if (typeof after === 'number' && Number.isFinite(after)) {
    body.after = after;
  }
  if (typeof before === 'number' && Number.isFinite(before)) {
    body.before = before;
  }
  return requestJson('/api/strava/sync_activities', { method: 'POST', body });
}

export async function syncActivitiesPage({ after = null, before = null, page = 1, perPage = 200 } = {}) {
  const body = { page, per_page: perPage };
  if (typeof after === 'number' && Number.isFinite(after)) {
    body.after = after;
  }
  if (typeof before === 'number' && Number.isFinite(before)) {
    body.before = before;
  }
  return requestJson('/api/strava/sync_activities_page', { method: 'POST', body });
}

export async function listActivities({ filter = 'all', text = '' } = {}) {
  const qs = new URLSearchParams();
  if (filter) qs.set('filter', filter);
  if (text) qs.set('text', text);
  return requestJson(`/api/strava/activities?${qs.toString()}`);
}

export async function importActivities(activityIds, { overwrite = false } = {}) {
  return requestJson('/api/strava/import', {
    method: 'POST',
    body: { activity_ids: activityIds, overwrite }
  });
}

export async function deleteImport(activityId) {
  return requestJson(`/api/strava/import/${activityId}`, { method: 'DELETE', body: {} });
}

export function gpxDownloadUrl(activityId) {
  return `${API_BASE}/api/strava/gpx/${activityId}`;
}

export async function listMaps() {
  return requestJson('/api/dal/list_maps');
}


