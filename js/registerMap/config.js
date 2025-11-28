const isLocal = window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '';

export const API_BASE = isLocal ? 'http://127.0.0.1:5000' : '';

export const START_LAT_LON = [60.3368, 5.33669];

export const DEFAULT_MAP_ZOOM = 10;

export const COORDINATE_PAIRS = 3;

