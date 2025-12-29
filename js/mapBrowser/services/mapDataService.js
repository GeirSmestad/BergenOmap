import { API_BASE } from '../config.js';
import { redirectToLoginOnExpiredSession } from '../../utils/apiUtils.js';

export async function fetchMapDefinitions(baseUrl = API_BASE) {
  const requestUrl = `${baseUrl}/api/dal/list_maps`;

  const response = await fetch(requestUrl, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    redirectToLoginOnExpiredSession(response);
    throw new Error(`Failed to fetch maps: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
