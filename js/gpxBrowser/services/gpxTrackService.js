import { API_BASE } from '../../mapBrowser/config.js';

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
    throw new Error(`Failed to fetch GPX tracks: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

