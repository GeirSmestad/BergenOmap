import { backendBaseUrl } from '../config.js';

export async function fetchMapDefinitions(baseUrl = backendBaseUrl) {
  const requestUrl = `${baseUrl}/api/dal/list_maps`;

  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch maps: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

