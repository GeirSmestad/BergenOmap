import { API_BASE } from '../config.js';
import { redirectToLoginOnExpiredSession } from '../../utils/apiUtils.js';

async function _fetchJson(url, options) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!response.ok) {
    redirectToLoginOnExpiredSession(response);
    let message = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const data = await response.json();
      if (data?.error) {
        message = data.error;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  // DELETE returns JSON too, but handle empty responses defensively.
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function listStoredPoints(baseUrl = API_BASE) {
  return _fetchJson(`${baseUrl}/api/stored-points`, { method: 'GET' });
}

export async function createStoredPoint(
  { lat, lon, precision_meters, description },
  baseUrl = API_BASE
) {
  return _fetchJson(`${baseUrl}/api/stored-points`, {
    method: 'POST',
    body: JSON.stringify({ lat, lon, precision_meters, description })
  });
}

export async function updateStoredPoint(pointId, { description }, baseUrl = API_BASE) {
  return _fetchJson(`${baseUrl}/api/stored-points/${encodeURIComponent(pointId)}`, {
    method: 'PUT',
    body: JSON.stringify({ description })
  });
}

export async function deleteStoredPoint(pointId, baseUrl = API_BASE) {
  return _fetchJson(`${baseUrl}/api/stored-points/${encodeURIComponent(pointId)}`, {
    method: 'DELETE'
  });
}

