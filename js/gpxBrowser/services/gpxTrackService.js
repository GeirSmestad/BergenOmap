import { API_BASE } from '../../mapBrowser/config.js';
import { redirectToLoginOnExpiredSession } from '../../utils/apiUtils.js';

const trackDetailCache = new Map();

export async function fetchUserTracks(baseUrl = API_BASE, username) {
  if (!username) {
    throw new Error('username is required to fetch GPX tracks');
  }

  const requestUrl = `${baseUrl}/api/gps-tracks/${encodeURIComponent(username)}`;

  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    redirectToLoginOnExpiredSession(response);
    throw new Error(`Failed to fetch GPX tracks: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function fetchTrackDetail(baseUrl = API_BASE, username, trackId) {
  if (!username) {
    throw new Error('username is required to fetch GPX track detail');
  }

  if (typeof trackId !== 'number') {
    throw new Error('trackId must be a number');
  }

  const cacheKey = `${baseUrl}::${username}::${trackId}`;
  if (trackDetailCache.has(cacheKey)) {
    return trackDetailCache.get(cacheKey);
  }

  const requestUrl = `${baseUrl}/api/gps-tracks/${encodeURIComponent(username)}/${trackId}`;

  const requestPromise = (async () => {
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      redirectToLoginOnExpiredSession(response);
      throw new Error(`Failed to fetch GPX track ${trackId}: ${response.status} ${response.statusText}`);
    }

    return response.json();
  })();

  trackDetailCache.set(cacheKey, requestPromise);

  try {
    return await requestPromise;
  } catch (error) {
    trackDetailCache.delete(cacheKey);
    throw error;
  }
}

export async function uploadTrack(baseUrl = API_BASE, username, description, file) {
  if (!username) {
    throw new Error('username is required to upload a GPX track');
  }

  if (!(file instanceof File)) {
    throw new Error('A GPX file must be selected before uploading.');
  }

  const formData = new FormData();
  formData.append('username', username);
  formData.append('description', description);
  formData.append('file', file, file.name);

  const response = await fetch(`${baseUrl}/api/gps-tracks`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    redirectToLoginOnExpiredSession(response);
    const message = await safeReadError(response);
    throw new Error(message || `Opplasting feilet: ${response.status}`);
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
