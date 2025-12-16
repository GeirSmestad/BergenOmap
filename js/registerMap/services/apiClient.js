import { API_BASE } from '../config.js';
import { redirectToLoginOnExpiredSession } from '../../utils/apiUtils.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json'
};

async function getJson(path) {
  const response = await fetch(`${API_BASE}${path}`);

  if (!response.ok) {
    redirectToLoginOnExpiredSession(response);
    throw new Error(`Request to ${path} failed with status ${response.status}`);
  }

  return response.json();
}

async function getBlob(path) {
  const response = await fetch(`${API_BASE}${path}`);

  if (!response.ok) {
    redirectToLoginOnExpiredSession(response);
    throw new Error(`Request to ${path} failed with status ${response.status}`);
  }

  return response.blob();
}

async function postJson(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    redirectToLoginOnExpiredSession(response);
    throw new Error(`Request to ${path} failed with status ${response.status}`);
  }

  return response.json();
}

async function postForm(path, formData) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    redirectToLoginOnExpiredSession(response);
    throw new Error(`Request to ${path} failed with status ${response.status}`);
  }

  return response.blob();
}

export function getOverlayCoordinates(payload) {
  return postJson('/api/getOverlayCoordinates', payload);
}

export function transformAndStoreMapData(formData) {
  return postForm('/api/transformAndStoreMapData', formData);
}

export function transformMap(formData) {
  return postForm('/api/transformMap', formData);
}

export function processDroppedImage(formData) {
  return postForm('/api/processDroppedImage', formData);
}

export function convertPdfToImage(formData) {
  return postForm('/api/convertPdfToImage', formData);
}

export function exportDatabase(payload) {
  return postJson('/api/dal/export_database', payload);
}

export function listMaps() {
  return getJson('/api/dal/list_maps');
}

const encodeMapName = (mapName) => encodeURIComponent(mapName ?? '');

export function fetchOriginalMapFile(mapName) {
  // backend/Backend.py::transform_and_store_map saves mapfile_original as PNG,
  // so reusing this blob avoids any additional image recompression artifacts.
  return getBlob(`/api/dal/mapfile/original/${encodeMapName(mapName)}`);
}

export function fetchFinalMapFile(mapName) {
  return getBlob(`/api/dal/mapfile/final/${encodeMapName(mapName)}`);
}
