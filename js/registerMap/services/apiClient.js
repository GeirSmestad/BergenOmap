import { API_BASE } from '../config.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json'
};

async function postJson(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
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

